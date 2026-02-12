import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Database, Briefcase, Palette, TrendingUp, ArrowRight, Cpu } from "lucide-react";
import { Link } from "react-router-dom";

const SchoolsSection = () => {
  const schools = [
    {
      name: "Data Engineering",
      slug: "engineering",
      description: "Master software development, cloud computing, and cybersecurity",
      icon: Code,
      color: "from-blue-600 to-cyan-600",
    },
    {
      name: "Data & Analytics",
      slug: "data",
      description: "Learn data science, analytics, and machine learning",
      icon: Database,
      color: "from-green-600 to-emerald-600",
    },
    {
      name: "Business Studies",
      slug: "business",
      description: "Develop skills in management, sales, and entrepreneurship",
      icon: Briefcase,
      color: "from-purple-600 to-pink-600",
    },
    {
      name: "Product Design",
      slug: "product",
      description: "Build expertise in product management and design thinking",
      icon: TrendingUp,
      color: "from-orange-600 to-red-600",
    },
    {
      name: "Creative Economy",
      slug: "creative-economy",
      description: "Explore content creation, music business, and digital arts",
      icon: Palette,
      color: "from-pink-600 to-rose-600",
    },
    {
      name: "Business Computing",
      slug: "computing",
      description: "Dive into computer science, AI, and advanced programming",
      icon: Cpu,
      color: "from-indigo-600 to-violet-600",
    },
  ];

  return (
    <section id="schools" aria-labelledby="schools-heading" className="py-12 md:py-16 bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 id="schools-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            Our Schools
          </h2>
          <p className="text-xl text-muted-foreground">
            We ensure that Africans interested in exploring various occupations can
            readily access the resources they need to learn and grow
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 max-w-6xl mx-auto" role="list" aria-label="Available schools">
          {schools.map((school, index) => {
            const Icon = school.icon;
            return (
              <Card
                key={index}
                role="listitem"
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${school.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} aria-hidden="true" />
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${school.color} text-white mb-4 w-fit`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-2xl mb-2">{school.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">{school.description}</p>
                  <Link to={`/schools/${school.slug}`}>
                    <Button
                      variant="ghost"
                      className="group/btn p-0 h-auto font-semibold text-primary hover:text-primary/80"
                    >
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SchoolsSection;
