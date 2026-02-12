import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Video, Youtube, Image, FileQuestion, ClipboardList, BookOpen } from "lucide-react";

interface CoursePreviewDialogProps {
  courseId: string;
  courseTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LessonContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  order_index: number;
  duration_minutes: number | null;
  is_free_preview: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  order_index: number;
  questions_count?: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  due_date: string | null;
  order_index: number;
  instructions: string | null;
}

const getContentIcon = (type: string) => {
  switch (type) {
    case "video":
      return <Video className="h-4 w-4" />;
    case "youtube":
    case "vimeo":
      return <Youtube className="h-4 w-4" />;
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "image":
      return <Image className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

export function CoursePreviewDialog({ courseId, courseTitle, open, onOpenChange }: CoursePreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (open && courseId) {
      fetchCourseContent();
    }
  }, [open, courseId]);

  const fetchCourseContent = async () => {
    setLoading(true);
    try {
      const [lessonsRes, quizzesRes, assignmentsRes] = await Promise.all([
        supabase.from("lesson_content").select("*").eq("course_id", courseId).order("order_index"),
        supabase.from("quizzes").select("*").eq("course_id", courseId).order("order_index"),
        supabase.from("assignments").select("*").eq("course_id", courseId).order("order_index"),
      ]);

      if (lessonsRes.data) setLessons(lessonsRes.data);
      if (quizzesRes.data) {
        // Fetch question counts for each quiz
        const quizzesWithCounts = await Promise.all(
          quizzesRes.data.map(async (quiz) => {
            const { count } = await supabase
              .from("quiz_questions")
              .select("*", { count: "exact", head: true })
              .eq("quiz_id", quiz.id);
            return { ...quiz, questions_count: count || 0 };
          })
        );
        setQuizzes(quizzesWithCounts);
      }
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    } catch (error) {
      console.error("Error fetching course content:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalContentItems = lessons.length + quizzes.length + assignments.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Preview: {courseTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="lessons">Lessons ({lessons.length})</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes ({quizzes.length})</TabsTrigger>
              <TabsTrigger value="assignments">Assignments ({assignments.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[60vh] mt-4">
              <TabsContent value="overview" className="space-y-4 m-0">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{lessons.length}</div>
                      <p className="text-xs text-muted-foreground">Lessons</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{quizzes.length}</div>
                      <p className="text-xs text-muted-foreground">Quizzes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{assignments.length}</div>
                      <p className="text-xs text-muted-foreground">Assignments</p>
                    </CardContent>
                  </Card>
                </div>

                {totalContentItems === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        This course has no content yet. Consider requesting the instructor to add content before approving.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Content Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lessons.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-sm text-muted-foreground mr-2">Lesson types:</span>
                          {Array.from(new Set(lessons.map(l => l.content_type))).map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {quizzes.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Total quiz questions: {quizzes.reduce((acc, q) => acc + (q.questions_count || 0), 0)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="lessons" className="space-y-3 m-0">
                {lessons.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No lessons added to this course
                    </CardContent>
                  </Card>
                ) : (
                  lessons.map((lesson, index) => (
                    <Card key={lesson.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getContentIcon(lesson.content_type)}
                              <h4 className="font-medium">{lesson.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {lesson.content_type}
                              </Badge>
                              {lesson.is_free_preview && (
                                <Badge variant="secondary" className="text-xs">
                                  Free Preview
                                </Badge>
                              )}
                            </div>
                            {lesson.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {lesson.description}
                              </p>
                            )}
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {lesson.duration_minutes && (
                                <span>{lesson.duration_minutes} min</span>
                              )}
                              {lesson.content_url && (
                                <span className="truncate max-w-[200px]">
                                  URL: {lesson.content_url}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="quizzes" className="space-y-3 m-0">
                {quizzes.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No quizzes added to this course
                    </CardContent>
                  </Card>
                ) : (
                  quizzes.map((quiz, index) => (
                    <Card key={quiz.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                            <FileQuestion className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{quiz.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                {quiz.questions_count} questions
                              </Badge>
                            </div>
                            {quiz.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {quiz.description}
                              </p>
                            )}
                            <div className="mt-2 text-xs text-muted-foreground">
                              Passing score: {quiz.passing_score}%
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="assignments" className="space-y-3 m-0">
                {assignments.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No assignments added to this course
                    </CardContent>
                  </Card>
                ) : (
                  assignments.map((assignment, index) => (
                    <Card key={assignment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground">
                            <ClipboardList className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{assignment.title}</h4>
                              <Badge variant="outline" className="text-xs">
                                Max: {assignment.max_score} pts
                              </Badge>
                            </div>
                            {assignment.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {assignment.description}
                              </p>
                            )}
                            {assignment.instructions && (
                              <div className="mt-2 p-2 bg-muted rounded-md">
                                <p className="text-xs font-medium mb-1">Instructions:</p>
                                <p className="text-xs text-muted-foreground line-clamp-3">
                                  {assignment.instructions}
                                </p>
                              </div>
                            )}
                            {assignment.due_date && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Due: {new Date(assignment.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
