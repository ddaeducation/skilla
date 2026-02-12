import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Video, FileText, Headphones, Download, ExternalLink } from "lucide-react";

const ResourcesSection = () => {
  const resources = [
    {
      icon: BookOpen,
      title: " Learning Materials",
      description: "Access our library of  ebooks, guides, and tutorials covering various tech topics.",
      cta: "Browse Library",
    },
    {
      icon: Video,
      title: "Video Tutorials",
      description: "Watch hundreds of  video lessons from industry experts on YouTube.",
      cta: "Watch Now",
    },
    {
      icon: FileText,
      title: "Blog & Articles",
      description: "Read insightful articles about career development, industry trends, and success stories.",
      cta: "Read Blog",
    },
    {
      icon: Headphones,
      title: "Podcasts",
      description: "Listen to interviews with African tech leaders and learn from their journeys.",
      cta: "Listen Now",
    },
    {
      icon: Download,
      title: "Downloadable Templates",
      description: "Get professionally designed resume templates, project worksheets, and more.",
      cta: "Download",
    },
    {
      icon: ExternalLink,
      title: "Scholarship Information",
      description: "Explore scholarship opportunities and financial aid options for our programs.",
      cta: "Learn More",
    },
  ];

  return (
    <section id="resources" aria-labelledby="resources-heading" className="py-12 md:py-16 bg-muted/30">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 id="resources-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">Learning Resources</h2>
          <p className="text-xl text-muted-foreground">tools and materials to support your learning journey</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto" role="list" aria-label="Available resources">
          {resources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <Card
                key={index}
                role="listitem"
                className="group transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-2">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{resource.title}</CardTitle>
                  <CardDescription className="text-base">{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    {resource.cta}
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

export default ResourcesSection;
