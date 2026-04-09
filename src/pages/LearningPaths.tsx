import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Clock, Target, Sparkles, CheckCircle } from "lucide-react";

interface PathCourse {
  id: string;
  title: string;
  slug: string;
  duration: string | null;
  category: string | null;
}

const LEARNING_PATHS = [
  {
    id: "data-analyst",
    title: "Become a Data Analyst",
    description: "Master data analysis from fundamentals to advanced visualization and business intelligence.",
    duration: "6-12 months",
    icon: "📊",
    gradient: "from-emerald-500 to-teal-600",
    schools: ["Data & Analytics"],
    categories: ["Short-Course", "Professional"],
    skills: ["Excel & SQL", "Data Visualization", "Statistical Analysis", "Business Intelligence"],
  },
  {
    id: "full-stack-dev",
    title: "Become a Full-Stack Developer",
    description: "Go from beginner to building complete web applications with modern technologies.",
    duration: "8-14 months",
    icon: "💻",
    gradient: "from-blue-500 to-indigo-600",
    schools: ["Data Engineering"],
    categories: ["Short-Course", "Professional"],
    skills: ["Frontend (React)", "Backend (Node.js)", "Databases", "Cloud Deployment"],
  },
  {
    id: "product-leader",
    title: "Become a Product Leader",
    description: "Learn product management, UX design, and innovation frameworks to lead digital products.",
    duration: "4-10 months",
    icon: "🚀",
    gradient: "from-orange-500 to-red-600",
    schools: ["Product & Innovation"],
    categories: ["Short-Course", "Professional"],
    skills: ["Product Strategy", "UX Research", "Agile/Scrum", "Product Analytics"],
  },
  {
    id: "digital-marketer",
    title: "Become a Digital Marketer",
    description: "Master digital marketing strategies, analytics, and content creation for modern businesses.",
    duration: "4-8 months",
    icon: "📱",
    gradient: "from-purple-500 to-pink-600",
    schools: ["Business Studies"],
    categories: ["Short-Course", "Professional"],
    skills: ["SEO & SEM", "Social Media Marketing", "Content Strategy", "Marketing Analytics"],
  },
  {
    id: "content-creator",
    title: "Become a Content Creator",
    description: "Build your brand, create engaging content, and monetize your creative skills.",
    duration: "3-6 months",
    icon: "🎬",
    gradient: "from-pink-500 to-rose-600",
    schools: ["Digital & Creative Media"],
    categories: ["Short-Course", "Masterclass"],
    skills: ["Video Production", "Personal Branding", "Social Media", "Monetization"],
  },
  {
    id: "business-leader",
    title: "Become a Business Leader",
    description: "Develop strategic thinking, financial acumen, and leadership skills for business success.",
    duration: "6-12 months",
    icon: "👔",
    gradient: "from-violet-500 to-purple-700",
    schools: ["Business Studies"],
    categories: ["Professional"],
    skills: ["Strategic Management", "Financial Analysis", "Leadership", "Project Management"],
  },
];

const LearningPaths = () => {
  const [pathCourses, setPathCourses] = useState<Record<string, PathCourse[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, slug, duration, category, school")
        .eq("approval_status", "approved")
        .in("publish_status", ["live", "upcoming"]);

      if (data) {
        const mapped: Record<string, PathCourse[]> = {};
        for (const path of LEARNING_PATHS) {
          mapped[path.id] = data.filter(
            (c) => path.schools.includes(c.school) && path.categories.includes(c.category || "")
          );
        }
        setPathCourses(mapped);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="py-20 md:py-28">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Guided Learning
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Learning Paths
            </h1>
            <p className="text-xl text-muted-foreground">
              Follow a structured roadmap to reach your career goals. Each path guides you through the right courses in the right order.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {LEARNING_PATHS.map((path) => {
              const courses = pathCourses[path.id] || [];
              return (
                <Card key={path.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className={`h-2 bg-gradient-to-r ${path.gradient}`} />
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{path.icon}</span>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{path.title}</CardTitle>
                        <CardDescription className="mt-1">{path.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {path.duration}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <BookOpen className="h-3 w-3" />
                        {courses.length} courses
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-primary" />
                        Skills you'll gain
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {path.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {courses.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-foreground mb-2">Courses in this path:</p>
                        <div className="space-y-1.5">
                          {courses.slice(0, 4).map((c, i) => (
                            <Link key={c.id} to={`/course/${c.id}`} className="flex items-center gap-2 text-sm group hover:bg-accent/50 rounded-md px-1.5 py-1 -mx-1.5 transition-colors">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                                {i + 1}
                              </span>
                              <span className="text-muted-foreground group-hover:text-primary truncate transition-colors">{c.title}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
                            </Link>
                          ))}
                          {courses.length > 4 && (
                            <p className="text-xs text-muted-foreground pl-7">
                              + {courses.length - 4} more courses
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto pt-3">
                      <Button className="w-full gap-2" asChild>
                        <Link to="/programs">
                          Explore Courses
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LearningPaths;
