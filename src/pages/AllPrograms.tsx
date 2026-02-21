import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
}

interface InstructorInfo {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const categoryConfig: Record<string, { color: string; gradient: string; route: string; label: string }> = {
  "Short-Course": {
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    gradient: "from-blue-500 to-cyan-500",
    route: "Short-Course",
    label: "Short Courses",
  },
  Professional: {
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    gradient: "from-purple-500 to-pink-500",
    route: "Professional",
    label: "Professional Programs",
  },
  Masterclass: {
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    gradient: "from-orange-500 to-red-500",
    route: "masterclass",
    label: "Masterclasses",
  },
};

const CATEGORIES = ["Short-Course", "Professional", "Masterclass"];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const getFallbackRating = (courseId: string) => {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 2 === 0 ? 4.5 : 5.0;
};

const CourseCard = ({
  course,
  instructor,
  ratingData,
}: {
  course: Course;
  instructor?: InstructorInfo | null;
  ratingData?: { avg: number; count: number } | null;
}) => {
  const config = categoryConfig[course.category || "Short-Course"] || categoryConfig["Short-Course"];
  const price = course.monthly_price ?? course.price;
  const rating = ratingData ? ratingData.avg : getFallbackRating(course.id);
  const ratingCount = ratingData?.count || 0;
  const instructorName = instructor?.full_name || course.instructor_name;

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border hover:border-primary/50 flex flex-col overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
      {course.image_url && (
        <div className="h-40 overflow-hidden">
          <img
            src={course.image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-bold text-foreground leading-tight">{course.title}</CardTitle>
          <Badge variant="outline" className={`shrink-0 text-xs ${config.color}`}>
            {course.category}
          </Badge>
        </div>
        <CardDescription className="text-sm leading-relaxed line-clamp-2">
          {course.description}
        </CardDescription>
        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-2">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
          {ratingCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
            </span>
          )}
        </div>
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
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-primary">
            {price > 0 ? `$${price}/mo` : "Free"}
          </span>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Bio
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={instructor?.avatar_url || ""} alt={instructorName || "Instructor"} />
                    <AvatarFallback className="text-xs">
                      {(instructorName || "IN").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{instructorName || "Instructor"}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {instructor?.bio || "Bio coming soon."}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
              <Link to={`/course/${course.id}`}>Enroll Now</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AllPrograms = () => {
  const navigate = useNavigate();
  const [coursesByCategory, setCoursesByCategory] = useState<Record<string, Course[]>>({});
  const [instructors, setInstructors] = useState<Record<string, InstructorInfo>>({});
  const [courseRatings, setCourseRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, school, category, price, monthly_price, duration, image_url, instructor_id, instructor_name, learning_outcomes")
        .eq("approval_status", "approved");

      if (!error && data) {
        const grouped: Record<string, Course[]> = {};
        for (const cat of CATEGORIES) {
          const filtered = data.filter((c) => c.category === cat);
          grouped[cat] = shuffle(filtered).slice(0, 6);
        }
        setCoursesByCategory(grouped);

        // Fetch ratings and instructor info
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

        // Process ratings
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

        // Process instructors
        if (instructorIds.length > 0) {
          const map: Record<string, InstructorInfo> = {};
          for (const id of instructorIds) {
            const profile = profilesRes?.data?.find((p: any) => p.id === id);
            const app = applicationsRes?.data?.find((a: any) => a.user_id === id);
            map[id] = {
              full_name: profile?.full_name ?? null,
              avatar_url: profile?.avatar_url ?? null,
              bio: app?.bio ?? null,
            };
          }
          setInstructors(map);
        }
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="py-20 md:py-32">
        <div className="container px-4">
          <Button variant="ghost" className="mb-8" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="mx-auto max-w-3xl text-center mb-16">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              All Programs
            </h1>
            <p className="text-xl text-muted-foreground">
              Explore our complete range of programs across Short Courses, Professional Programs, and Masterclasses
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            CATEGORIES.map((cat) => {
              const config = categoryConfig[cat];
              const courses = coursesByCategory[cat] || [];
              if (courses.length === 0) return null;
              return (
                <div key={cat} className="mb-20">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <div
                        className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${config.gradient} text-white mb-2 text-sm font-semibold`}
                      >
                        {cat.toUpperCase()}
                      </div>
                      <h2 className="text-2xl font-bold">{config.label}</h2>
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/programs/${config.route}`)}>
                      View All {config.label}
                    </Button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
                    {courses.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        instructor={course.instructor_id ? instructors[course.instructor_id] : null}
                        ratingData={courseRatings[course.id] || null}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AllPrograms;
