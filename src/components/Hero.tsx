import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import student1 from "@/assets/student-1.jpg";
import student2 from "@/assets/student-2.jpg";
import student3 from "@/assets/student-3.jpg";
import student4 from "@/assets/student-4.jpg";
import student5 from "@/assets/student-5.jpg";
import student6 from "@/assets/student-6.jpg";
import rtbLogo from "@/assets/rtb-logo.png";
import ioaLogo from "@/assets/institute-of-analytics.png";
const Hero = () => {
  const navigate = useNavigate();
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
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl animate-fade-in lg:text-5xl" id="main-heading">Job-Ready Tech Skills For Global Careers</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl md:text-2xl animate-fade-in" style={{
          animationDelay: "0.1s"
        }}>Achieve career clarity and global relevance through flexible short courses or full professional programs—built for international success.</p>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold px-8 py-6 h-auto animate-fade-in shadow-lg hover:shadow-xl transition-all" style={{
          animationDelay: "0.2s"
        }} onClick={() => navigate("/programs/all")}>
            Explore all programs
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
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
              <div className="text-xs">(Rwanda TVET Board)</div>
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