import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, Users, Target, ArrowRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CareerSection = () => {
  const careerServices = [
    {
      icon: FileText,
      title: "Resume & Portfolio Review",
      description: "Get expert feedback on your resume and portfolio to stand out to employers.",
    },
    {
      icon: Users,
      title: "Interview Preparation",
      description: "Practice with mock interviews and receive personalized coaching.",
    },
    {
      icon: Target,
      title: "Job Matching",
      description: "Connect with hiring partners actively looking for talented graduates.",
    },
    {
      icon: Briefcase,
      title: "Career Mentorship",
      description: "One-on-one guidance from experienced professionals in your field.",
    },
  ];

  const stats = [
    { value: "500+", label: "Alumni Trained" },
    { value: "40%", label: "Avg. Salary Increase" },
    { value: "20+", label: "Companies Using Skills" },
    { value: "90%", label: "Apply Skills at Work" },
  ];

  const openPositions = [
    { title: "Instructor", description: "Share your expertise by creating and teaching courses", path: "/become-instructor" },
    { title: "Content Reviewer", description: "Review and improve course content quality", path: "/become-instructor" },
    { title: "Course Moderator", description: "Moderate discussions and support students", path: "/become-instructor" },
  ];

  return (
    <section id="career" aria-labelledby="career-heading" className="py-12 md:py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 id="career-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            Career Support & Opportunities
          </h2>
          <p className="text-xl text-muted-foreground">We don't just teach you—we help you land your dream job</p>
        </div>

        <div className="grid gap-8 mb-16 max-w-5xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" role="list" aria-label="Career statistics">
            {stats.map((stat, index) => (
              <Card
                key={index}
                role="listitem"
                className="text-center transition-all duration-300 hover:shadow-lg animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto mb-12">
          {careerServices.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card
                key={index}
                className="group transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1 + 0.4}s` }}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                View Open Positions
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-72 bg-popover">
              {openPositions.map((position, index) => (
                <DropdownMenuItem key={index} asChild className="cursor-pointer">
                  <Link to={position.path} className="flex flex-col items-start py-3">
                    <span className="font-medium">{position.title}</span>
                    <span className="text-xs text-muted-foreground">{position.description}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </section>
  );
};

export default CareerSection;
