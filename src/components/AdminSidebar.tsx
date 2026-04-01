import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  BookOpen, Users, Shield, GraduationCap, Clock, Award, Settings, LogOut,
  HelpCircle, User, Ticket, DollarSign, Building2, Handshake, Megaphone, Heart, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface AdminSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const navigationItems = [
  { id: "courses", title: "Courses", icon: BookOpen },
  { id: "approvals", title: "Approval", icon: Clock },
  { id: "applications", title: "Applications", icon: Clock },
  { id: "content", title: "Content", icon: BookOpen },
  { id: "users", title: "Users", icon: Users },
  { id: "enrollments", title: "Enrollments", icon: GraduationCap },
  { id: "coupons", title: "Coupons", icon: Ticket },
  { id: "instructors", title: "Instructors", icon: Users },
  { id: "earnings", title: "Earnings", icon: DollarSign },
  { id: "corporate", title: "Corporate", icon: Building2 },
  { id: "collaborations", title: "Collaborations", icon: Handshake },
  { id: "admins", title: "Admins", icon: Shield },
  { id: "certificates", title: "Templates", icon: Award },
  { id: "promotions", title: "Promotions", icon: Megaphone },
  { id: "donations", title: "Donations", icon: Heart },
];

const accountItems = [
  { id: "profile", title: "Profile", icon: User },
  { id: "settings", title: "Settings", icon: Settings },
  { id: "help", title: "Help & Support", icon: HelpCircle },
];

const AdminSidebar = ({ activeView, setActiveView }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserEmail(session.user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        setUserName(profile.full_name || session.user.email?.split("@")[0] || "Admin");
        setAvatarUrl(profile.avatar_url);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/");
  };

  const handleNavigation = (viewId: string) => {
    if (viewId === "profile") {
      navigate("/profile");
    } else if (viewId === "help") {
      toast({ title: "Help", description: "Contact support at globalnexusinstitute@gmail.com" });
    } else {
      setActiveView(viewId);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-5 py-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </button>
        <h2 className="font-display text-lg font-bold text-sidebar-foreground">Admin Portal</h2>
        <p className="text-xs text-sidebar-foreground/60">Global Nexus Institute</p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-sidebar-foreground/40 px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.title}
                    className="rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-sidebar-foreground/40 px-3">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.title}
                    className="rounded-lg transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-sidebar-accent/50">
          <Avatar className="h-9 w-9 ring-2 ring-sidebar-border">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">{userEmail}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
