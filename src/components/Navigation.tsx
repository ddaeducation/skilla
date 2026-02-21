import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown, UserCircle } from "lucide-react";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
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
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        // Check if user has admin or instructor role
        const {
          data: roles
        } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
        setIsInstructor(roles?.some(r => r.role === "moderator") ?? false);

        // Fetch user profile for avatar
        const {
          data: profileData
        } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", session.user.id).maybeSingle();
        setProfile(profileData);
      } else {
        setIsAdmin(false);
        setIsInstructor(false);
        setProfile(null);
      }
    };
    checkAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Defer Supabase calls
        setTimeout(async () => {
          const {
            data: roles
          } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
          setIsAdmin(roles?.some(r => r.role === "admin") ?? false);
          setIsInstructor(roles?.some(r => r.role === "moderator") ?? false);
          const {
            data: profileData
          } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", session.user.id).maybeSingle();
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
  const schools = [{
    name: "Data Engineering",
    href: "/schools/engineering"
  }, {
    name: "Product & Innovation",
    href: "/schools/product"
  }, {
    name: "Data & Analytics",
    href: "/schools/data"
  }, {
    name: "Business Studies",
    href: "/schools/business"
  }, {
    name: "Digital & Creative Media",
    href: "/schools/creative-economy"
  }, {
    name: "Languages & Comms",
    href: "/schools/computing"
  }];
  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  const programs = [{
    name: "Frontend Engineering",
    href: "#frontend"
  }, {
    name: "Backend Engineering",
    href: "#backend"
  }, {
    name: "Cloud Engineering",
    href: "#cloud"
  }, {
    name: "Cyber Security",
    href: "#security"
  }, {
    name: "Data Science",
    href: "#datascience"
  }, {
    name: "Product Management",
    href: "#pm"
  }];
  return <nav role="navigation" aria-label="Main navigation" className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Schools</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-3 p-4">
                    <div className="text-sm font-semibold text-muted-foreground">OUR SCHOOLS</div>
                    {schools.map(school => <Link key={school.name} to={school.href} className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="text-sm font-medium leading-none">{school.name}</div>
                      </Link>)}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <a href="#why" className="text-sm font-medium transition-colors hover:text-primary">
            Why Choose Us 
          </a>
          <a href="#career" className="text-sm font-medium transition-colors hover:text-primary">
            Career
          </a>
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
          {isInstructor && <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/instructor">Instructor</Link>
            </Button>}
          {isAdmin && <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/admin">Admin</Link>
            </Button>}
          {user && !isInstructor && !isAdmin && <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/become-instructor">Teach</Link>
            </Button>}
          {user ? <>
              <Link to="/profile" className="hidden md:inline-flex">
                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="text-xs">{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" onClick={handleSignOut} className="hidden md:inline-flex">
                Sign Out
              </Button>
            </> : <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link to="/auth">Login/Sign Up</Link>
            </Button>}
          <Button asChild className="hidden md:inline-flex">
            <Link to="/apply">Apply Now</Link>
          </Button>

          {/* Mobile menu button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && <div className="border-t md:hidden">
          <div className="container space-y-3 px-4 py-6">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-muted-foreground">SCHOOLS</div>
              {schools.map(school => <Link key={school.name} to={school.href} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                  {school.name}
                </Link>)}
            </div>
            <div className="space-y-2 border-t pt-3">
              <Link to="/" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
              <a href="#why" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                Why GNI
              </a>
              <a href="#career" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                Career
              </a>
              <a href="#resources" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                Resources
              </a>
              <a href="#faqs" className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                FAQs
              </a>
            </div>
            <div className="space-y-2 border-t pt-3">
              <Button variant="outline" asChild className="w-full">
                <Link to="/lms">LMS</Link>
              </Button>
              {isInstructor && <Button variant="outline" asChild className="w-full">
                  <Link to="/instructor">Instructor Dashboard</Link>
                </Button>}
              {isAdmin && <Button variant="outline" asChild className="w-full">
                  <Link to="/admin">Admin</Link>
                </Button>}
              {user && !isInstructor && !isAdmin && <Button variant="outline" asChild className="w-full">
                  <Link to="/become-instructor">Become an Instructor</Link>
                </Button>}
              {user ? <>
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
                </> : <Button variant="outline" asChild className="w-full">
                  <Link to="/auth">Login</Link>
                </Button>}
              <Button asChild className="w-full">
                <Link to="/apply">Apply Now</Link>
              </Button>
            </div>
          </div>
        </div>}
    </nav>;
};
export default Navigation;