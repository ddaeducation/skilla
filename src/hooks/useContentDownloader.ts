import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  saveLessonOffline,
  saveQuizOffline,
  saveVideoOffline,
  saveCourseOffline,
  deleteOfflineCourse,
  getOfflineCourse,
  isLessonOffline,
  isVideoOffline,
} from "@/lib/offlineDb";
import { useToast } from "@/hooks/use-toast";

interface DownloadProgress {
  total: number;
  completed: number;
  current: string;
  phase: "lessons" | "quizzes" | "videos" | "done";
}

export function useContentDownloader() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  const downloadCourse = useCallback(
    async (courseId: string) => {
      if (downloading) return;
      setDownloading(true);

      try {
        // Fetch course data
        const { data: course } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (!course) throw new Error("Course not found");

        // Fetch sections
        const { data: sections } = await supabase
          .from("course_sections")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");

        // Save course metadata
        await saveCourseOffline({
          id: course.id,
          title: course.title,
          description: course.description,
          imageUrl: course.image_url,
          sections: sections || [],
          downloadedAt: Date.now(),
        });

        // Fetch and save lessons
        const { data: lessons } = await supabase
          .from("lesson_content")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");

        const allLessons = lessons || [];
        const videoLessons = allLessons.filter(
          (l) =>
            l.content_type === "video" &&
            l.content_url &&
            !l.content_url.includes("youtube") &&
            !l.content_url.includes("vimeo")
        );

        const totalItems = allLessons.length;
        let completed = 0;

        setProgress({ total: totalItems + videoLessons.length, completed: 0, current: "Preparing...", phase: "lessons" });

        for (const lesson of allLessons) {
          setProgress((p) => ({
            ...p!,
            current: lesson.title,
            completed,
            phase: "lessons",
          }));

          await saveLessonOffline({
            id: lesson.id,
            courseId: lesson.course_id,
            sectionId: lesson.section_id,
            title: lesson.title,
            contentType: lesson.content_type,
            contentText: lesson.content_text,
            contentUrl: lesson.content_url,
            orderIndex: lesson.order_index,
            durationMinutes: lesson.duration_minutes,
            downloadedAt: Date.now(),
          });
          completed++;
        }

        // Fetch and save quizzes
        setProgress((p) => ({ ...p!, phase: "quizzes", current: "Downloading quizzes..." }));

        const { data: quizzes } = await supabase
          .from("quizzes")
          .select("*")
          .eq("course_id", courseId);

        for (const quiz of quizzes || []) {
          const { data: questions } = await supabase
            .from("quiz_questions")
            .select("*, quiz_options(*)")
            .eq("quiz_id", quiz.id)
            .order("order_index");

          await saveQuizOffline({
            id: quiz.id,
            courseId: quiz.course_id,
            sectionId: quiz.section_id,
            title: quiz.title,
            description: quiz.description,
            passingScore: quiz.passing_score,
            timeLimitMinutes: quiz.time_limit_minutes,
            maxAttempts: quiz.max_attempts,
            questions: questions || [],
            downloadedAt: Date.now(),
          });
        }

        // Download videos
        if (videoLessons.length > 0) {
          setProgress((p) => ({ ...p!, phase: "videos", current: "Downloading videos..." }));

          for (const lesson of videoLessons) {
            try {
              setProgress((p) => ({
                ...p!,
                current: `Video: ${lesson.title}`,
                completed,
              }));

              const response = await fetch(lesson.content_url!);
              const blob = await response.blob();

              await saveVideoOffline({
                id: `video-${lesson.id}`,
                lessonId: lesson.id,
                courseId: lesson.course_id,
                title: lesson.title,
                blob,
                mimeType: blob.type || "video/mp4",
                size: blob.size,
                downloadedAt: Date.now(),
              });

              completed++;
            } catch (err) {
              console.warn(`Failed to download video for ${lesson.title}:`, err);
              completed++;
            }
          }
        }

        setProgress({ total: totalItems, completed: totalItems, current: "Complete!", phase: "done" });

        toast({
          title: "Course downloaded",
          description: `"${course.title}" is now available offline.`,
        });
      } catch (err) {
        console.error("Download error:", err);
        toast({
          title: "Download failed",
          description: "Could not download course content. Please try again.",
          variant: "destructive",
        });
      } finally {
        setDownloading(false);
        setTimeout(() => setProgress(null), 2000);
      }
    },
    [downloading, toast]
  );

  const removeCourse = useCallback(
    async (courseId: string) => {
      await deleteOfflineCourse(courseId);
      toast({
        title: "Offline content removed",
        description: "Course content has been removed from your device.",
      });
    },
    [toast]
  );

  return {
    downloadCourse,
    removeCourse,
    downloading,
    progress,
    isLessonOffline,
    isVideoOffline,
    getOfflineCourse,
  };
}
