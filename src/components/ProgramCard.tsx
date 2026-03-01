import { Link } from "react-router-dom";
import { Clock, Video, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ProgramCardProps {
  title: string;
  description: string;
  duration?: string;
  format?: string;
  category?: string;
  skills: string[];
  gradientColor?: string;
  enrollLink?: string;
  enrollButtonText?: string;
  animationDelay?: number;
}

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case "Short-Course":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Professional":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "Masterclass":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const ProgramCard = ({
  title,
  description,
  duration,
  format,
  category,
  skills,
  gradientColor = "from-primary to-primary/70",
  enrollLink = "/apply",
  enrollButtonText = "Enroll Now",
  animationDelay = 0,
}: ProgramCardProps) => {
  const showMeta = duration || format;

  return (
    <Card
      className="group hover:shadow-2xl transition-all duration-300 border hover:border-primary/50 flex flex-col animate-fade-in overflow-hidden"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className={`h-1.5 bg-gradient-to-r ${gradientColor}`} />
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl font-bold text-foreground">{title}</CardTitle>
          {category && (
            <Badge variant="outline" className={`shrink-0 ${getCategoryBadgeStyle(category)}`}>
              {category}
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        <div className="flex-1">
          {showMeta && (
            <div className="flex flex-wrap gap-4 mb-5 text-sm text-muted-foreground">
              {duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{duration}</span>
                </div>
              )}
              {format && (
                <div className="flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span>{format}</span>
                </div>
              )}
            </div>
          )}
          {skills.length > 0 && (
            <>
              <h4 className="text-sm font-semibold mb-3 text-foreground">What you'll learn:</h4>
              <ul className="space-y-2.5 mb-6">
                {skills.map((skill, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            className="flex-1"
          >
            <Link to={enrollLink}>View Details</Link>
          </Button>
          <Button
            asChild
            className="flex-1 group-hover:shadow-lg transition-shadow bg-primary hover:bg-primary/90"
          >
            <Link to={enrollLink}>{enrollButtonText}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgramCard;
