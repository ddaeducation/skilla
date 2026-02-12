import { Card, CardContent } from "@/components/ui/card";
import { Users, Globe, Award, TrendingUp, Heart, Shield } from "lucide-react";

const WhySection = () => {
  const reasons = [
    {
      icon: Globe,
      title: "Africa-Focused Curriculum",
      description: "Our programs are tailored to address the unique challenges and opportunities across Africa.",
    },
    {
      icon: Users,
      title: "Expert Instructors",
      description: "Learn from industry professionals with years of real-world experience.",
    },
    {
      icon: Award,
      title: "Globally Recognized Certifications",
      description: "Earn credentials that are respected by employers worldwide.",
    },
    {
      icon: TrendingUp,
      title: "Career Growth",
      description: "Our alumni see an average 40% salary increase within 6 months of graduation.",
    },
    {
      icon: Heart,
      title: "Community Support",
      description: "Join a vibrant community of learners and professionals supporting each other.",
    },
    {
      icon: Shield,
      title: "Flexible Learning",
      description: "Study at your own pace with both live and recorded sessions available.",
    },
  ];

  return (
    <section id="why" aria-labelledby="why-heading" className="py-12 md:py-16 bg-background">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 id="why-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">Why Choose Us</h2>
          <p className="text-xl text-muted-foreground">
            We're committed to empowering Africans with the skills and knowledge needed to thrive in the digital economy
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto" role="list" aria-label="Reasons to choose us">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <Card
                key={index}
                role="listitem"
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-2 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{reason.title}</h3>
                    <p className="text-muted-foreground">{reason.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhySection;
