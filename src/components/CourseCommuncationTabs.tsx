import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, MessageSquare, Video, MessageCircle } from "lucide-react";
import { AnnouncementsPanel } from "./communication/AnnouncementsPanel";
import { DiscussionForums } from "./communication/DiscussionForums";
import { LiveSessionsPanel } from "./communication/LiveSessionsPanel";
import { MessagesPanel } from "./communication/MessagesPanel";
import { supabase } from "@/integrations/supabase/client";

interface CourseCommuncationTabsProps {
  userId: string;
  courseId: string;
  courseTitle: string;
}

export const CourseCommuncationTabs = ({ 
  userId, 
  courseId,
  courseTitle 
}: CourseCommuncationTabsProps) => {
  const [userRole, setUserRole] = useState<"admin" | "instructor" | "student">("student");
  const courses = [{ id: courseId, title: courseTitle }];
  const enrolledCourseIds = [courseId];

  useEffect(() => {
    const checkUserRole = async () => {
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      
      if (adminRole) {
        setUserRole("admin");
        return;
      }

      // Check if user is the instructor of this course
      const { data: course } = await supabase
        .from("courses")
        .select("instructor_id")
        .eq("id", courseId)
        .maybeSingle();
      
      if (course?.instructor_id === userId) {
        setUserRole("instructor");
        return;
      }

      // Default to student
      setUserRole("student");
    };

    checkUserRole();
  }, [userId, courseId]);

  const isAdmin = userRole === "admin";

  return (
    <div className="space-y-4">
      <Tabs defaultValue="announcements" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="announcements" className="gap-2 text-xs sm:text-sm">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="discussions" className="gap-2 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Discussions</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2 text-xs sm:text-sm">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2 text-xs sm:text-sm">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Live Sessions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="mt-4">
          <AnnouncementsPanel 
            userId={userId} 
            userRole={userRole} 
            courses={courses}
            enrolledCourseIds={enrolledCourseIds}
          />
        </TabsContent>

        <TabsContent value="discussions" className="mt-4">
          <DiscussionForums 
            userId={userId} 
            userRole={userRole} 
            courses={courses}
            enrolledCourseIds={enrolledCourseIds}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessagesPanel userId={userId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="live" className="mt-4">
          <LiveSessionsPanel 
            userId={userId} 
            userRole={userRole} 
            courses={courses} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
