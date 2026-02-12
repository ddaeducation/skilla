import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  Award, 
  Settings, 
  LogOut, 
  User,
  FileText,
  ClipboardCheck,
  BarChart3,
  HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface LMSSidebarProps {
  user: SupabaseUser | null;
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigationItems = [
  { id: "home", title: "Home", icon: Home },
  { id: "courses", title: "All Courses", icon: BookOpen },
  { id: "my-courses", title: "My Courses", icon: GraduationCap },
];

const learningItems = [
  { id: "lessons", title: "Lessons", icon: FileText },
  { id: "assignments", title: "Assignments", icon: ClipboardCheck },
  { id: "quizzes", title: "Quizzes & Exams", icon: ClipboardCheck },
  { id: "grades", title: "Grade Book", icon: BarChart3 },
];


const achievementItems = [
  { id: "certificates", title: "Certificates", icon: Award },
  { id: "leaderboard", title: "Leaderboard", icon: BarChart3 },
];

const LMSSidebar = ({ user, activeView, onViewChange }: LMSSidebarProps) => {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const userInitials = userName.slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon" aria-label="Student dashboard navigation">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            L
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold">Learning Portal</span>
              <span className="text-xs text-muted-foreground">Student Dashboard</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeView === item.id}
                    onClick={() => onViewChange(item.id)}
                    tooltip={item.title}
                    aria-current={activeView === item.id ? "page" : undefined}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Learning & Assessment */}
        <SidebarGroup>
          <SidebarGroupLabel>Learning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {learningItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeView === item.id}
                    onClick={() => onViewChange(item.id)}
                    tooltip={item.title}
                    aria-current={activeView === item.id ? "page" : undefined}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Achievements */}
        <SidebarGroup>
          <SidebarGroupLabel>Achievements</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {achievementItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeView === item.id}
                    onClick={() => onViewChange(item.id)}
                    tooltip={item.title}
                    aria-current={activeView === item.id ? "page" : undefined}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/profile")}
                  tooltip="Profile"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "settings"}
                  onClick={() => onViewChange("settings")}
                  tooltip="Settings"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeView === "help"}
                  onClick={() => onViewChange("help")}
                  tooltip="Help & Support"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Help & Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </div>
          )}
        </div>
        <SidebarMenu className="mt-2">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default LMSSidebar;
