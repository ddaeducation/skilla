import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Video, Award, ArrowLeft, CheckCircle, Loader2, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFallbackRating, formatCoursePrice } from "@/lib/courseUtils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  monthly_price: number | null;
  duration: string | null;
  image_url: string | null;
  learning_outcomes: string[] | null;
  category: string | null;
  publish_status: string;
  instructor_id: string | null;
  instructor_name: string | null;
}

interface InstructorInfo {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const categoryMeta: Record<string, { title: string; subtitle: string; duration: string; format: string; certification: string; color: string }> = {
  "Short-Course": {
    title: "Short-Course Programs",
    subtitle: "Self-paced programs that let you go deeper into a focused skill",
    duration: "4–8 weeks (flexible, self-paced)",
    format: "Online with recorded lectures",
    certification: "Global Nexus Institute Certificate",
    color: "from-blue-500 to-cyan-500",
  },
  Professional: {
    title: "Professional Programs",
    subtitle: "Comprehensive, instructor-led programs with community and mentorship support",
    duration: "3-12 months (flexible, self-paced)",
    format: "Live classes + recorded lectures",
    certification: "Global Nexus Institute Professional certificate",
    color: "from-purple-500 to-pink-500",
  },
  masterclass: {
    title: "Masterclass Sessions",
    subtitle: "Bite-sized sessions on practical topics for immediate career wins",
    duration: "2-7 hours",
    format: "Physical/Online, Live Sessions",
    certification: "Masterclass Certification",
    color: "from-orange-500 to-red-500",
  },
};

// Map URL param to database category value
const routeToCategoryMap: Record<string, string> = {
  "Short-Course": "Short-Course",
  Professional: "Professional",
  masterclass: "Masterclass",
};

const Programs = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const meta = categoryMeta[type as string];
  const dbCategory = routeToCategoryMap[type as string];

  const [instructors, setInstructors] = useState<Record<string, InstructorInfo>>({});
  const [courseRatings, setCourseRatings] = useState<Record<string, { avg: number; count: number }>>({});


  useEffect(() => {
    const fetchCourses = async () => {
      if (!dbCategory) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, price, monthly_price, duration, image_url, learning_outcomes, category, publish_status, instructor_id, instructor_name")
        .eq("category", dbCategory)
        .eq("approval_status", "approved");

      if (!error && data) {
        setCourses(data);

        const courseIds = data.map(c => c.id);

        // Fetch instructor profiles, bios, and ratings in parallel
        const instructorIds = [...new Set(data.map(c => c.instructor_id).filter(Boolean))] as string[];

        // Fetch ratings
        const ratingsPromise = supabase.from("course_ratings").select("course_id, rating").in("course_id", courseIds.length > 0 ? courseIds : ["none"]);

        let profilesPromise: any = null;
        let applicationsPromise: any = null;
        if (instructorIds.length > 0) {
          profilesPromise = supabase.from("profiles").select("id, full_name, avatar_url").in("id", instructorIds);
          applicationsPromise = supabase.from("instructor_applications").select("user_id, bio").in("user_id", instructorIds);
        }

        const [ratingsRes, profilesRes, applicationsRes] = await Promise.all([
          ratingsPromise,
          profilesPromise,
          applicationsPromise,
        ]);

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
  }, [dbCategory]);

  if (!meta) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="container px-4 py-20">
          <h1 className="text-3xl font-bold mb-4">Program not found</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
        <Footer />
      </div>
    );
  }

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
            <div
              className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${meta.color} text-white mb-4`}
            >
              {type?.replace("-", " ").toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">{meta.title}</h1>
            <p className="text-xl text-muted-foreground mb-8">{meta.subtitle}</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{meta.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span>{meta.format}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>{meta.certification}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">No courses available in this category yet.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
              {courses.map((course, index) => {
                const isUpcoming = course.publish_status === "upcoming";
                const ratingData = courseRatings[course.id];
                const rating = ratingData ? Math.max(ratingData.avg, 4.5) : getFallbackRating(course.id);
                const ratingCount = ratingData?.count || 0;
                const instructor = course.instructor_id ? instructors[course.instructor_id] : null;
                const instructorName = instructor?.full_name || course.instructor_name;

                return (
                  <Card
                    key={course.id}
                    className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 flex flex-col animate-fade-in overflow-hidden"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`h-2 bg-gradient-to-r ${meta.color}`} />
                    {course.image_url && (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl">{course.title}</CardTitle>
                        {isUpcoming && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shrink-0">
                            Upcoming
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm leading-relaxed line-clamp-2">
                        {course.description?.replace(/<[^>]*>/g, '') || ''}
                      </CardDescription>
                      {/* Rating as number */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-foreground">
                          {rating.toFixed(1)}
                        </span>
                        {ratingCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold mb-3">What you'll learn:</h4>
                          <ul className="space-y-2 mb-6">
                            {course.learning_outcomes.slice(0, 3).map((skill, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <span>{skill}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-primary">
                          {formatCoursePrice(course.monthly_price, course.price)}
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
                          {isUpcoming ? (
                            <Button size="sm" disabled variant="outline">
                              Coming Soon
                            </Button>
                          ) : (
                            <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
                              <Link to={`/course/${course.id}`}>Enroll Now</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Programs;
