import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, MessageSquare, Video, MessageCircle } from "lucide-react";
import { AnnouncementsPanel } from "./AnnouncementsPanel";
import { DiscussionForums } from "./DiscussionForums";
import { LiveSessionsPanel } from "./LiveSessionsPanel";
import { MessagesPanel } from "./MessagesPanel";

interface Course {
  id: string;
  title: string;
}

interface CommunicationHubProps {
  userId: string;
  userRole: "admin" | "instructor" | "student";
  courses: Course[];
  enrolledCourseIds?: string[];
}

export const CommunicationHub = ({ userId, userRole, courses, enrolledCourseIds = [] }: CommunicationHubProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Communication</h2>
        <p className="text-muted-foreground">Stay connected with announcements, discussions, and live sessions</p>
      </div>

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="announcements" className="gap-2">
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="discussions" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Discussions</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Messages</span>
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Live Sessions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements">
          <AnnouncementsPanel 
            userId={userId} 
            userRole={userRole} 
            courses={courses}
            enrolledCourseIds={enrolledCourseIds}
          />
        </TabsContent>

        <TabsContent value="discussions">
          <DiscussionForums 
            userId={userId} 
            userRole={userRole} 
            courses={courses}
            enrolledCourseIds={enrolledCourseIds}
          />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesPanel userId={userId} isAdmin={userRole === "admin"} />
        </TabsContent>

        <TabsContent value="live">
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
