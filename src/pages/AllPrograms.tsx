import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Clock, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

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
  instructor_name: string | null;
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

const CourseCard = ({ course }: { course: Course }) => {
  const config = categoryConfig[course.category || "Short-Course"] || categoryConfig["Short-Course"];
  const price = course.monthly_price ?? course.price;

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
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
          {course.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.duration}
            </span>
          )}
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.school}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-primary">
            {price > 0 ? `$${price}/mo` : "Free"}
          </span>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to={`/course/${course.id}`}>View Course</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AllPrograms = () => {
  const navigate = useNavigate();
  const [coursesByCategory, setCoursesByCategory] = useState<Record<string, Course[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, school, category, price, monthly_price, duration, image_url, instructor_name")
        .eq("approval_status", "approved");

      if (!error && data) {
        const grouped: Record<string, Course[]> = {};
        for (const cat of CATEGORIES) {
          const filtered = data.filter((c) => c.category === cat);
          grouped[cat] = shuffle(filtered).slice(0, 6);
        }
        setCoursesByCategory(grouped);
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
                      <CourseCard key={course.id} course={course} />
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
