import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, CheckCircle, Search, X } from "lucide-react";
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
  learning_outcomes: string[] | null;
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
const PRICE_FILTERS = [
  { label: "All Prices", value: "all" },
  { label: "Free", value: "free" },
  { label: "Under $50/mo", value: "under50" },
  { label: "$50–$100/mo", value: "50to100" },
  { label: "Over $100/mo", value: "over100" },
];

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
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, description, school, category, price, monthly_price, duration, image_url, instructor_name, learning_outcomes")
        .eq("approval_status", "approved");

      if (!error && data) {
        setAllCourses(data);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const isFiltering = search.trim() !== "" || selectedCategory !== "all" || selectedPrice !== "all";

  const filteredCourses = useMemo(() => {
    return allCourses.filter((course) => {
      // Keyword search
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        (course.description?.toLowerCase().includes(q) ?? false) ||
        (course.learning_outcomes?.some((s) => s.toLowerCase().includes(q)) ?? false);

      // Category filter
      const matchesCategory =
        selectedCategory === "all" || course.category === selectedCategory;

      // Price filter
      const price = course.monthly_price ?? course.price;
      const matchesPrice =
        selectedPrice === "all" ||
        (selectedPrice === "free" && price === 0) ||
        (selectedPrice === "under50" && price > 0 && price < 50) ||
        (selectedPrice === "50to100" && price >= 50 && price <= 100) ||
        (selectedPrice === "over100" && price > 100);

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [allCourses, search, selectedCategory, selectedPrice]);

  // When not filtering, show 6 random per category; when filtering, show all matches flat
  const coursesByCategory = useMemo(() => {
    if (isFiltering) return null;
    const grouped: Record<string, Course[]> = {};
    for (const cat of CATEGORIES) {
      const filtered = allCourses.filter((c) => c.category === cat);
      grouped[cat] = shuffle(filtered).slice(0, 6);
    }
    return grouped;
  }, [allCourses, isFiltering]);

  const hasResults = isFiltering ? filteredCourses.length > 0 : CATEGORIES.some((cat) => (coursesByCategory?.[cat]?.length ?? 0) > 0);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedPrice("all");
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="py-20 md:py-32">
        <div className="container px-4">
          <Button variant="ghost" className="mb-8" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="mx-auto max-w-3xl text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              All Programs
            </h1>
            <p className="text-xl text-muted-foreground">
              Explore our complete range of programs across Short Courses, Professional Programs, and Masterclasses
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="max-w-5xl mx-auto mb-12 space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses by title, description, or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 h-12 text-base"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter chips row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    selectedCategory === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  All Categories
                </button>
                {CATEGORIES.map((cat) => {
                  const cfg = categoryConfig[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? "all" : cat)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        selectedCategory === cat
                          ? `bg-gradient-to-r ${cfg.gradient} text-white border-transparent`
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border hidden sm:block" />

              {/* Price filter */}
              <div className="flex flex-wrap gap-2">
                {PRICE_FILTERS.map((pf) => (
                  <button
                    key={pf.value}
                    onClick={() => setSelectedPrice(selectedPrice === pf.value ? "all" : pf.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selectedPrice === pf.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {pf.label}
                  </button>
                ))}
              </div>

              {/* Clear all */}
              {isFiltering && (
                <button
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>

            {/* Results count when filtering */}
            {isFiltering && (
              <p className="text-sm text-muted-foreground">
                {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasResults ? (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground mb-4">No courses match your search.</p>
              <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : isFiltering ? (
            /* Flat grid when filtering */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            /* Grouped by category when not filtering */
            CATEGORIES.map((cat) => {
              const config = categoryConfig[cat];
              const courses = coursesByCategory?.[cat] || [];
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
