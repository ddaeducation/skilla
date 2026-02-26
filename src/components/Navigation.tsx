import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import gniLogo from "@/assets/gni-logo.png";

interface UserProfile {
  avatar_url: string | null;
  full_name: string | null;
}

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
        setIsInstructor(roles?.some(r => r.role === "moderator") ?? false);
        const { data: profileData } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", session.user.id).maybeSingle();
        setProfile(profileData);
      } else {
        setIsAdmin(false);
        setIsInstructor(false);
        setProfile(null);
      }
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
          setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
          setIsInstructor(roles?.some(r => r.role === "moderator") ?? false);
          const { data: profileData } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", session.user.id).maybeSingle();
          setProfile(profileData);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsInstructor(false);
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await logActivity("logout", "Signed out");
    await supabase.auth.signOut();
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <nav role="navigation" aria-label="Main navigation" className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a href="/" className="flex items-center space-x-2">
          <img src={gniLogo} alt="Global Nexus Institute" className="h-12 w-auto" />
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:space-x-6">
          <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <a href="#why" className="text-sm font-medium transition-colors hover:text-primary">
            Why Choose Us
          </a>
          <a href="#career" className="text-sm font-medium transition-colors hover:text-primary">
            Career
          </a>
          <Link to="/corporate-training" className="text-sm font-medium transition-colors hover:text-primary">
            Corporate
          </Link>
          <a href="#resources" className="text-sm font-medium transition-colors hover:text-primary">
            Resources
          </a>
          <a href="#faqs" className="text-sm font-medium transition-colors hover:text-primary">
            FAQs
          </a>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {user && <AccessibilityPanel />}
          <Button variant="ghost" asChild className="hidden md:inline-flex">
            <Link to="/lms">LMS</Link>
          </Button>
          {isInstructor && (
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/instructor">Instructor</Link>
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {user && !isInstructor && !isAdmin && (
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/become-instructor">Teach</Link>
            </Button>
          )}
          {user ? (
            <>
              <Link to="/profile" className="hidden md:inline-flex">
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="text-xs">{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" onClick={handleSignOut} className="hidden md:inline-flex">
                Sign Out
              </Button>
            </>
          ) : (
            <Button asChild className="hidden md:inline-flex">
              <Link to="/signin">Sign In</Link>
            </Button>
          )}

          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t md:hidden">
          <div className="container space-y-3 px-4 py-6">
            <div className="space-y-2">
              <Link to="/" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
              <a href="#why" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                Why Choose Us
              </a>
              <a href="#career" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                Career
              </a>
              <Link to="/corporate-training" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                Corporate
              </Link>
              <a href="#resources" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                Resources
              </a>
              <a href="#faqs" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                FAQs
              </a>
            </div>
            <div className="space-y-2 border-t pt-3">
              <Button variant="outline" asChild className="w-full">
                <Link to="/lms">LMS</Link>
              </Button>
              {isInstructor && (
                <Button variant="outline" asChild className="w-full">
                  <Link to="/instructor">Instructor Dashboard</Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" asChild className="w-full">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              {user && !isInstructor && !isAdmin && (
                <Button variant="outline" asChild className="w-full">
                  <Link to="/become-instructor">Become an Instructor</Link>
                </Button>
              )}
              {user ? (
                <>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/profile" className="flex items-center">
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                        <AvatarFallback className="text-[10px]">{getInitials(profile?.full_name)}</AvatarFallback>
                      </Avatar>
                      My Profile
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleSignOut} className="w-full">
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button asChild className="w-full">
                  <Link to="/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
