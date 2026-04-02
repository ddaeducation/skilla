import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, HardDrive, BookOpen } from "lucide-react";
import { getAllOfflineCourses, deleteOfflineCourse, getOfflineStorageUsage } from "@/lib/offlineDb";
import { useToast } from "@/hooks/use-toast";

const OfflineContentManager = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [storage, setStorage] = useState({ used: 0, quota: 0, percentage: 0 });

  const refresh = async () => {
    const [c, s] = await Promise.all([getAllOfflineCourses(), getOfflineStorageUsage()]);
    setCourses(c);
    setStorage(s);
  };

  useEffect(() => { refresh(); }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleRemove = async (courseId: string) => {
    await deleteOfflineCourse(courseId);
    toast({ title: "Removed", description: "Offline content deleted." });
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Offline Content
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Storage used</span>
          <Badge variant="secondary">
            {formatBytes(storage.used)} / {formatBytes(storage.quota)} ({storage.percentage}%)
          </Badge>
        </div>

        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No courses downloaded yet. Download a course to access it offline.
          </p>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Downloaded {new Date(course.downloadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(course.id)}
                  className="text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OfflineContentManager;
