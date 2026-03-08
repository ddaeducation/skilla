import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Star, User, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFallbackRating } from "@/lib/courseUtils";
import CoursePriceDisplay from "@/components/CoursePriceDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Course {
  id: string;
  title: string;
  description: string | null;
  school: string;
  category: string | null;
  price: number;
  monthly_price: number | null;
  duration: string | null;
  image_url: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  learning_outcomes: string[] | null;
  publish_status: string;
  price_display_currency?: string;
}

interface InstructorInfo {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const SCHOOLS = [
  { label: "Data Engineering", values: ["Data Engineering"] },
  { label: "Product & Innovation", values: ["Product & Innovation"] },
  { label: "Data & Analytics", values: ["Data & Analytics"] },
  { label: "Business Studies", values: ["Business Studies"] },
  { label: "Digital & Creative Media", values: ["Digital & Creative Media"] },
  { label: "Languages & Comms", values: ["Languages & Comms"] },
];

const CATEGORIES = [
  { key: "Professional", label: "Professional Programs", description: "Career-focused programs with mentorship, projects, and 2–6 months of guided learning." },
  { key: "Short-Course", label: "Short Courses", description: "Practical, skill-based courses to quickly build targeted expertise." },
  { key: "Masterclass", label: "Masterclasses", description: "Intensive expert-led sessions for deep dives into specialized topics." },
];

const categoryConfig: Record<string, { color: string; gradient: string }> = {
  "Short-Course": { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", gradient: "from-blue-500 to-cyan-500" },
  Professional: { color: "bg-purple-500/10 text-purple-600 border-purple-500/20", gradient: "from-purple-500 to-pink-500" },
  Masterclass: { color: "bg-orange-500/10 text-orange-600 border-orange-500/20", gradient: "from-orange-500 to-red-500" },
};

const CourseCard = ({ course, instructor, ratingData }: {
  course: Course;
  instructor?: InstructorInfo | null;
  ratingData?: { avg: number; count: number } | null;
}) => {
  const config = categoryConfig[course.category || "Short-Course"] || categoryConfig["Short-Course"];
  const rating = ratingData ? Math.max(ratingData.avg, 4.5) : getFallbackRating(course.id);
  const ratingCount = ratingData?.count || 0;
  const instructorName = instructor?.full_name || course.instructor_name;
  const isUpcoming = course.publish_status === "upcoming";
  const navigate = useNavigate();

  const handleEnroll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate(`/signin?redirect=${encodeURIComponent(`/course/${course.id}`)}`);
    } else {
      navigate(`/course/${course.id}`);
    }
  };

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border hover:border-primary/50 flex flex-col overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
      {course.image_url && (
        <div className="h-40 overflow-hidden">
          <img src={course.image_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-bold text-foreground leading-tight">{course.title}</CardTitle>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className={`text-xs ${config.color}`}>{course.category}</Badge>
            {isUpcoming && (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                Upcoming
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-sm leading-relaxed line-clamp-2">{course.description?.replace(/<[^>]*>/g, '') || ''}</CardDescription>
        <div className="flex items-center gap-1.5 mt-2">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
          {ratingCount > 0 && <span className="text-xs text-muted-foreground">({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})</span>}
        </div>
        {course.duration && (
          <p className="text-xs text-muted-foreground mt-1">Duration: {course.duration}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        {course.learning_outcomes && course.learning_outcomes.length > 0 && (
          <>
            <h4 className="text-sm font-semibold mb-3 text-foreground">What you'll learn:</h4>
            <ul className="space-y-2 mb-5">
              {course.learning_outcomes.slice(0, 3).map((skill, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{skill}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-auto space-y-3">
          <CoursePriceDisplay monthlyPrice={course.monthly_price} price={course.price} defaultCurrency={course.price_display_currency || "USD"} />
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5"><User className="h-3.5 w-3.5" />Bio</Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={instructor?.avatar_url || ""} alt={instructorName || "Instructor"} />
                    <AvatarFallback className="text-xs">{(instructorName || "IN").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{instructorName || "Instructor"}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{instructor?.bio || "Bio coming soon."}</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/course/${course.id}`}>View Details</Link>
            </Button>
            {isUpcoming ? (
              <Button size="sm" disabled variant="outline">
                Coming Soon
              </Button>
            ) : (
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleEnroll}>
                Enroll Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AllPrograms = () => {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Record<string, InstructorInfo>>({});
  const [courseRatings, setCourseRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("Professional");

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, school, category, price, monthly_price, duration, image_url, instructor_id, instructor_name, learning_outcomes, publish_status, price_display_currency")
        .eq("approval_status", "approved")
        .in("publish_status", ["live", "upcoming"]);

      if (!error && data) {
        setAllCourses(data);
        const courseIds = data.map(c => c.id);
        const instructorIds = [...new Set(data.map(c => c.instructor_id).filter(Boolean))] as string[];

        const ratingsPromise = supabase.from("course_ratings").select("course_id, rating").in("course_id", courseIds.length > 0 ? courseIds : ["none"]);
        let profilesPromise: any = null;
        let applicationsPromise: any = null;
        if (instructorIds.length > 0) {
          profilesPromise = supabase.from("profiles").select("id, full_name, avatar_url").in("id", instructorIds);
          applicationsPromise = supabase.from("instructor_applications").select("user_id, bio").in("user_id", instructorIds);
        }

        const [ratingsRes, profilesRes, applicationsRes] = await Promise.all([ratingsPromise, profilesPromise, applicationsPromise]);

        if (ratingsRes?.data) {
          const ratingsMap: Record<string, { total: number; count: number }> = {};
          for (const r of ratingsRes.data) {
            if (!ratingsMap[r.course_id]) ratingsMap[r.course_id] = { total: 0, count: 0 };
            ratingsMap[r.course_id].total += r.rating;
            ratingsMap[r.course_id].count += 1;
          }
          const avgMap: Record<string, { avg: number; count: number }> = {};
          for (const [cid, val] of Object.entries(ratingsMap)) {
            avgMap[cid] = { avg: val.total / val.count, count: val.count };
          }
          setCourseRatings(avgMap);
        }

        if (instructorIds.length > 0) {
          const map: Record<string, InstructorInfo> = {};
          for (const id of instructorIds) {
            const profile = profilesRes?.data?.find((p: any) => p.id === id);
            const app = applicationsRes?.data?.find((a: any) => a.user_id === id);
            map[id] = { full_name: profile?.full_name ?? null, avatar_url: profile?.avatar_url ?? null, bio: app?.bio ?? null };
          }
          setInstructors(map);
        }
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const toggleSchool = (label: string) => {
    setSelectedSchools(prev => prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]);
  };

  const getFilteredCourses = (category: string) => {
    let filtered = allCourses.filter(c => c.category === category);
    if (selectedSchools.length > 0) {
      const allowedSchoolValues = selectedSchools.flatMap(label => SCHOOLS.find(s => s.label === label)?.values || []);
      filtered = filtered.filter(c => allowedSchoolValues.includes(c.school));
    }
    return filtered;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="py-20 md:py-28">
        <div className="container px-4">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Explore Our Programs
            </h1>
            <p className="text-xl text-muted-foreground">
              Find the right program for your career goals across our schools and categories.
            </p>
          </div>

          {/* School Filter */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Filter by School</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {SCHOOLS.map(school => (
                <label
                  key={school.label}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedSchools.includes(school.label)
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  <Checkbox
                    checked={selectedSchools.includes(school.label)}
                    onCheckedChange={() => toggleSchool(school.label)}
                  />
                  <span className="text-sm font-medium">{school.label}</span>
                </label>
              ))}
              {selectedSchools.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedSchools([])}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid w-full grid-cols-3 mb-8">
                {CATEGORIES.map(cat => (
                  <TabsTrigger key={cat.key} value={cat.key}>{cat.label}</TabsTrigger>
                ))}
              </TabsList>

              {CATEGORIES.map(cat => {
                const courses = getFilteredCourses(cat.key);
                return (
                  <TabsContent key={cat.key} value={cat.key}>
                    <p className="text-muted-foreground mb-8 max-w-2xl">{cat.description}</p>
                    {courses.length === 0 ? (
                      <div className="text-center py-16">
                        <p className="text-lg text-muted-foreground">No programs found matching your filters.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {courses.map(course => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            instructor={course.instructor_id ? instructors[course.instructor_id] : null}
                            ratingData={courseRatings[course.id] || null}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AllPrograms;
