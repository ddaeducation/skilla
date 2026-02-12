import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Video, Award, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
const PathwaysSection = () => {
  const navigate = useNavigate();
  const pathways = [
    {
      title: "Short-Course",
      description:
        "Self-paced programs that let you go deeper into a focused skill. Earn recognized certificates to boost your profile and prove your expertise.",
      duration: "4–8 weeks (flexible, self-paced)",
      format: "Online with recorded lectures",
      certification: "Global Nexus Institute Short-Course certificate",
      icon: Clock,
      color: "from-blue-500 to-cyan-500",
      route: "Short-Course",
      programs: [],
    },
    {
      title: "Professional",
      description:
        "A comprehensive, instructor-led program with community and mentorship support. In 3-12 months, you'll master a new career path and open global opportunities.",
      duration: "3-12 months  (flexible, self-paced)",
      format: "Live classes + recorded lectures",
      certification: "Global Nexus Institute Professional certificate",
      icon: Video,
      color: "from-purple-500 to-pink-500",
      route: "Professional",
      programs: [],
    },
    {
      title: "Masterclass",
      description:
        "Bite-sized sessions on practical topics to give you quick wins in your career. Perfect for busy professionals who want immediate results.",
      duration: "2-7 hours",
      format: "Physical/Online, Live Sessions",
      certification: "Masterclass certification",
      icon: Award,
      color: "from-orange-500 to-red-500",
      route: "masterclass",
      programs: [],
    },
  ];
  return (
    <section id="pathways" aria-labelledby="pathways-heading" className="py-12 md:py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 id="pathways-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            A Learning Path for Every Learner
          </h2>
          <p className="text-xl text-muted-foreground">Students! Professionals! Career Switchers!</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto" role="list" aria-label="Learning pathways">
          {pathways.map((pathway, index) => {
            const Icon = pathway.icon;
            return (
              <Card
                key={index}
                role="listitem"
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl border-2 hover:border-primary/50 animate-fade-in"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${pathway.color}`} aria-hidden="true" />
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${pathway.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl">{pathway.title}</CardTitle>
                  </div>
                  <CardDescription className="text-base leading-relaxed">{pathway.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{pathway.duration}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Video className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{pathway.format}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Award className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{pathway.certification}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Available Programs:</h4>
                    <ul className="space-y-2">
                      {pathway.programs.map((program, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{program}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => navigate(`/programs/${pathway.route}`)}
                  >
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
export default PathwaysSection;
