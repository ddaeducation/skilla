import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import student1 from "@/assets/student-1.jpg";
import student2 from "@/assets/student-2.jpg";
import student3 from "@/assets/student-3.jpg";
import student4 from "@/assets/student-4.jpg";
import student5 from "@/assets/student-5.jpg";
import student6 from "@/assets/student-6.jpg";
import rtbLogo from "@/assets/rtb-logo.png";
import ioaLogo from "@/assets/institute-of-analytics.png";

interface CourseResult {
  id: string;
  title: string;
  school: string;
  category: string | null;
}

// Reverse map: database school name -> URL slug
const schoolUrlMap: Record<string, string> = {
  "Data Engineering": "engineering",
  "Data & Analytics": "data",
  "Business Studies": "business",
  "Product & Innovation": "product",
  "Digital & Creative Media": "creative-economy",
  "Languages & Comms": "computing"
};

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<CourseResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase.
      from("courses").
      select("id, title, school, category").
      ilike("title", `%${q}%`).
      eq("approval_status", "approved").
      limit(8);
      setResults(data || []);
      setShowResults(true);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const students = [{
    src: student1,
    alt: "Student studying with tablet"
  }, {
    src: student2,
    alt: "Professional student with glasses"
  }, {
    src: student3,
    alt: "Student with books outdoors"
  }, {
    src: student4,
    alt: "Group of students collaborating"
  }, {
    src: student5,
    alt: "Students celebrating with certificates"
  }, {
    src: student6,
    alt: "Professional working on laptop"
  }];
  return <section className="relative min-h-[90vh] bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground overflow-hidden" aria-labelledby="main-heading" role="banner">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="container relative z-10 px-4 py-16 md:py-24">
        {/* Hero content */}
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl animate-fade-in lg:text-5xl" id="main-heading">Master and Monetize Skills.</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl md:text-2xl animate-fade-in" style={{
          animationDelay: "0.1s"
        }}>Learn Job-Ready Skills. Monitize Your Professional Experience. </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all" onClick={() => navigate("/programs/all")}>
              Explore all programs
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <div className="relative w-full max-w-xs" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/50 z-10" />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/50 animate-spin z-10" />}
              <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              className="pl-10 py-6 h-auto bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-accent" />

              {showResults &&
            <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-xl overflow-hidden z-50">
                  {results.length === 0 ?
              <div className="px-4 py-3 text-sm text-muted-foreground">No courses found</div> :

              results.map((course) =>
              <button
                key={course.id}
                className="w-full text-left px-4 py-3 hover:bg-accent/10 transition-colors border-b border-border last:border-0 flex items-center justify-between gap-2"
                onClick={() => {
                  setShowResults(false);
                  setSearchQuery("");
                  const schoolSlug = schoolUrlMap[course.school];
                  if (schoolSlug) {
                    navigate(`/schools/${schoolSlug}`);
                  } else {
                    navigate(`/programs/all`);
                  }
                }}>

                        <span className="text-sm font-medium text-foreground truncate">{course.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{course.category || course.school}</span>
                      </button>
              )
              }
                </div>
            }
            </div>
          </div>
        </div>

        {/* Student image grid */}
        <div className="mt-16 md:mt-24" aria-label="Our students" role="region">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-6" role="list" aria-label="Student photos">
              {students.map((student, index) => <div key={index} role="listitem" className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-white/10 backdrop-blur-sm animate-fade-in hover:scale-105 transition-transform duration-300" style={{
              animationDelay: `${0.3 + index * 0.1}s`
            }}>
                  <img src={student.src} alt={student.alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
                </div>)}
            </div>
          </div>
        </div>

        {/* Accreditation badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 border-t border-white/20 pt-12" role="region" aria-label="Accreditation partners">
          <div className="flex items-center gap-4 text-sm text-primary-foreground/80">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white p-2">
              <img src={rtbLogo} alt="Rwanda TVET Board logo" className="h-full w-full object-contain" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Accredited by RTB</div>
              <div className="text-xs">(Rwanda TVET Board (coming soon))</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-primary-foreground/80">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white p-2">
              <img src={ioaLogo} alt="Institute of Analytics logo" className="h-full w-full object-contain" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Endorsed by Institute of Analytics</div>
              <div className="text-xs">Professional Recognition</div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Hero;