import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import gniLogo from "@/assets/gni-logo.png";
import type { NavTab } from "@/pages/Index";

interface UserProfile {
  avatar_url: string | null;
  full_name: string | null;
}

interface NavigationProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; school: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from("courses")
        .select("id, title, school, slug")
        .ilike("title", `%${searchQuery}%`)
        .in("publish_status", ["live", "upcoming"])
        .limit(8);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

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

  const navTabs: { id: NavTab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "why", label: "Why Us" },
    { id: "career", label: "Career" },
  ];

  const navTabs2: { id: NavTab; label: string }[] = [
    { id: "faqs", label: "FAQs" },
  ];

  const handleTabClick = (id: NavTab) => {
    if (isHomePage && onTabChange) {
      onTabChange(id);
    } else {
      window.location.href = `/#${id}`;
    }
  };

  return (
    <nav role="navigation" aria-label="Main navigation" className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a href="/" className="flex items-center space-x-2 shrink-0">
          <img src={gniLogo} alt="Global Nexus Institute" className="h-11 w-auto" />
        </a>

        <div className="hidden md:flex md:items-center md:space-x-1">
          {navTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted hover:text-primary ${
                isHomePage && activeTab === item.id
                  ? "text-primary bg-primary/5"
                  : "text-foreground/70"
              }`}
            >
              {item.label}
            </button>
          ))}
          <Link to="/corporate-training" className="px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted hover:text-primary text-foreground/70">
            Corporate
          </Link>
          <Link to="/collaborate" className="px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted hover:text-primary text-foreground/70">
            Collaborate
          </Link>
          {navTabs2.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-muted hover:text-primary ${
                isHomePage && activeTab === item.id
                  ? "text-primary bg-primary/5"
                  : "text-foreground/70"
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Search */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); setSearchResults([]); }}
              className="p-2 rounded-lg text-foreground/70 hover:bg-muted hover:text-primary transition-colors"
              aria-label="Search courses"
            >
              <Search className="h-4 w-4" />
            </button>
            {searchOpen && (
              <div className="absolute top-10 right-0 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 p-3 animate-fade-in">
                <Input
                  autoFocus
                  placeholder="What do you want to learn?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
                {isSearching && <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>}
                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No courses found</p>
                )}
                {searchResults.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      navigate(`/course/${(course as any).slug || course.id}`);
                      setSearchOpen(false);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/10 text-sm transition-colors"
                  >
                    <span className="font-medium">{course.title}</span>
                    <span className="block text-xs text-muted-foreground">{course.school}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {user && <AccessibilityPanel />}
          <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex text-foreground/70 hover:text-primary">
            <Link to="/lms">Go to Course</Link>
          </Button>
          {isInstructor && (
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex text-foreground/70 hover:text-primary">
              <Link to="/instructor">Instructor</Link>
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex text-foreground/70 hover:text-primary">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {user && !isInstructor && !isAdmin && (
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex text-foreground/70 hover:text-primary">
              <Link to="/become-instructor">Teach</Link>
            </Button>
          )}
          {user ? (
            <>
              <Link to="/profile" className="hidden md:inline-flex">
                <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:inline-flex text-foreground/70">
                Sign Out
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="hidden md:inline-flex shadow-md hover:shadow-lg transition-shadow">
              <Link to="/signin">Sign In</Link>
            </Button>
          )}

          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t border-border/60 md:hidden bg-background/95 backdrop-blur-md">
          <div className="container space-y-3 px-4 py-6">
            <div className="space-y-1">
              {navTabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { handleTabClick(item.id); setIsMenuOpen(false); }}
                  className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors ${
                    isHomePage && activeTab === item.id ? "bg-primary/5 text-primary" : "text-foreground/70"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <Link to="/corporate-training" className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted text-foreground/70 transition-colors" onClick={() => setIsMenuOpen(false)}>
                Corporate
              </Link>
              <Link to="/collaborate" className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted text-foreground/70 transition-colors" onClick={() => setIsMenuOpen(false)}>
                Collaborate
              </Link>
              {navTabs2.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { handleTabClick(item.id); setIsMenuOpen(false); }}
                  className={`block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors ${
                    isHomePage && activeTab === item.id ? "bg-primary/5 text-primary" : "text-foreground/70"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Mobile Search */}
              <div className="pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="What do you want to learn?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {isSearching && <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>}
                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No courses found</p>
                )}
                {searchResults.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      navigate(`/course/${(course as any).slug || course.id}`);
                      setIsMenuOpen(false);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted text-sm transition-colors"
                  >
                    <span className="font-medium">{course.title}</span>
                    <span className="block text-xs text-muted-foreground">{course.school}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 border-t border-border/60 pt-3">
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
