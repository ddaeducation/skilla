import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Play, Eye } from "lucide-react";

interface InstructorLMSViewProps {
  instructorId: string;
}

const InstructorLMSView = ({ instructorId }: InstructorLMSViewProps) => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructorCourses();
  }, [instructorId]);

  const fetchInstructorCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", instructorId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCourses(data);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading courses...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">LMS View</h2>
        <p className="text-muted-foreground">
          Preview and access your courses as a student would — no enrollment required
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses yet</h3>
            <p className="text-muted-foreground">Create courses first to preview them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              {course.image_url && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={course.image_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    {course.category && (
                      <Badge variant="outline" className="text-xs">
                        {course.category}
                      </Badge>
                    )}
                    <Badge
                      className={
                        course.publish_status === "live"
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {course.publish_status === "live" ? "Live" : "Draft"}
                    </Badge>
                  </div>
                </div>
                <CardDescription>{course.school}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {course.description?.replace(/<[^>]*>/g, '') || ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => navigate(`/course/${course.id}`)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Open Course
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/course/${course.id}`)}
                    title="Preview course detail"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorLMSView;
