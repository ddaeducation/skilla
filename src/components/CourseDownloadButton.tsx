import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useContentDownloader } from "@/hooks/useContentDownloader";
import { getOfflineCourse } from "@/lib/offlineDb";
import { Progress } from "@/components/ui/progress";

interface CourseDownloadButtonProps {
  courseId: string;
  courseTitle: string;
  variant?: "default" | "compact";
}

const CourseDownloadButton = ({
  courseId,
  courseTitle,
  variant = "default",
}: CourseDownloadButtonProps) => {
  const { downloadCourse, removeCourse, downloading, progress } = useContentDownloader();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const course = await getOfflineCourse(courseId);
      setIsDownloaded(!!course);
      setChecking(false);
    };
    check();
  }, [courseId, progress?.phase]);

  if (checking) return null;

  const progressPercent = progress
    ? Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
    : 0;

  if (downloading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="truncate">{progress?.current || "Downloading..."}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-muted-foreground">{progressPercent}% complete</p>
      </div>
    );
  }

  if (isDownloaded) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          {variant === "default" && "Available offline"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeCourse(courseId).then(() => setIsDownloaded(false))}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {variant === "default" && <span className="ml-1">Remove</span>}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={variant === "compact" ? "sm" : "default"}
      onClick={() => downloadCourse(courseId)}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {variant === "default" ? "Download for Offline" : "Download"}
    </Button>
  );
};

export default CourseDownloadButton;
