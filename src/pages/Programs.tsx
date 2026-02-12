import { useParams, useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Video, Award, ArrowLeft, CheckCircle } from "lucide-react";

const Programs = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  const programsData = {
    "Short-Course": {
      title: "Short-Course Programs",
      subtitle: "Self-paced programs that let you go deeper into a focused skill",
      duration: "4–8 weeks (flexible, self-paced)",
      format: "Online with recorded lectures",
      certification: "Global Nexus Institute Short-Course certificate",
      color: "from-blue-500 to-cyan-500",
      programs: [
        {
          title: "Product Management Essentials",
          description:
            "Learn the fundamentals of product management, from ideation to launch. Master user research, roadmapping, and agile methodologies.",
          skills: ["User Research", "Roadmapping", "Agile/Scrum", "Product Strategy"],
        },
        {
          title: "Data Analytics Fundamentals",
          description:
            "Dive into data analysis with Excel, SQL, and visualization tools. Transform raw data into actionable business insights.",
          skills: ["Excel", "SQL", "Data Visualization", "Statistical Analysis"],
        },
        {
          title: "UI/UX Design Basics",
          description:
            "Master user interface and experience design principles. Create beautiful, intuitive designs that users love.",
          skills: ["Figma", "User Research", "Wireframing", "Prototyping"],
        },
        {
          title: "Digital Marketing Strategy",
          description: "Learn to create and execute effective digital marketing campaigns across multiple channels.",
          skills: ["SEO/SEM", "Social Media", "Content Marketing", "Analytics"],
        },
        {
          title: "Financial Analysis & Modeling",
          description:
            "Build financial models and perform analysis to drive business decisions and investment strategies.",
          skills: ["Financial Modeling", "Valuation", "Excel", "Business Analysis"],
        },
        {
          title: "Project Management Professional",
          description:
            "Master project management methodologies and tools to deliver projects on time and within budget.",
          skills: ["PMP Framework", "Risk Management", "Stakeholder Management", "Agile"],
        },
      ],
    },
    Professional: {
      title: "Professional Programs",
      subtitle: "Comprehensive, instructor-led programs with community and mentorship support",
      duration: "12 months",
      format: "Live classes + recorded lectures",
      certification: "Global Nexus Institute Professional certificate",
      color: "from-purple-500 to-pink-500",
      programs: [
        {
          title: "Software Engineering",
          description:
            "Become a full-stack software engineer. Learn modern programming languages, frameworks, and best practices.",
          skills: ["JavaScript/TypeScript", "React", "Node.js", "Database Design"],
        },
        {
          title: "Cloud Engineering",
          description:
            "Master cloud infrastructure and DevOps practices. Deploy and manage scalable applications on major cloud platforms.",
          skills: ["AWS/Azure", "Docker/Kubernetes", "CI/CD", "Infrastructure as Code"],
        },
        {
          title: "Product Design",
          description: "Transform into a product designer who can lead design projects from concept to completion.",
          skills: ["Design Systems", "User Research", "Prototyping", "Design Thinking"],
        },
        {
          title: "Data Science & Machine Learning",
          description:
            "Learn to build predictive models and extract insights from complex datasets using cutting-edge ML techniques.",
          skills: ["Python", "Machine Learning", "Deep Learning", "Data Engineering"],
        },
        {
          title: "Cybersecurity",
          description:
            "Protect systems and data from cyber threats. Learn ethical hacking, security architecture, and compliance.",
          skills: ["Network Security", "Penetration Testing", "Security Architecture", "Compliance"],
        },
        {
          title: "Business Analytics",
          description:
            "Transform data into strategic business insights. Master analytics tools and business intelligence platforms.",
          skills: ["Power BI", "Tableau", "Business Intelligence", "Predictive Analytics"],
        },
      ],
    },
    masterclass: {
      title: "Masterclass Sessions",
      subtitle: "Bite-sized sessions on practical topics for immediate career wins",
      duration: "1-3 hours",
      format: "Physical/Online, Live Sessions",
      certification: "No certification",
      color: "from-orange-500 to-red-500",
      programs: [
        {
          title: "Resume Writing Workshop",
          description: "Craft a compelling resume that gets noticed by recruiters and passes ATS systems.",
          skills: ["ATS Optimization", "Achievement Highlighting", "Format Selection", "Keyword Usage"],
        },
        {
          title: "Interview Skills Mastery",
          description: "Master the art of interviewing with proven techniques for behavioral and technical questions.",
          skills: ["STAR Method", "Technical Interviews", "Behavioral Questions", "Confidence Building"],
        },
        {
          title: "LinkedIn Profile Optimization",
          description: "Transform your LinkedIn profile into a powerful personal brand that attracts opportunities.",
          skills: ["Profile Optimization", "Content Strategy", "Networking", "Personal Branding"],
        },
        {
          title: "Salary Negotiation Tactics",
          description: "Learn negotiation strategies to maximize your compensation and benefits package.",
          skills: ["Negotiation Techniques", "Market Research", "Value Communication", "Counter-Offers"],
        },
        {
          title: "Personal Branding Strategy",
          description: "Build a strong personal brand that differentiates you in the marketplace.",
          skills: ["Brand Identity", "Content Creation", "Online Presence", "Thought Leadership"],
        },
        {
          title: "Networking for Success",
          description:
            "Master networking strategies to build meaningful professional relationships that advance your career.",
          skills: ["Relationship Building", "Follow-up Strategy", "Event Networking", "Online Networking"],
        },
      ],
    },
  };

  const currentPrograms = programsData[type as keyof typeof programsData];

  if (!currentPrograms) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="container px-4 py-20">
          <h1 className="text-3xl font-bold mb-4">Program not found</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const getEnrollUrl = (programTitle: string) => {
    return `/apply?program=${encodeURIComponent(programTitle)}&type=${type}`;
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

          <div className="mx-auto max-w-3xl text-center mb-16">
            <div
              className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${currentPrograms.color} text-white mb-4`}
            >
              {type?.replace("-", " ").toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">{currentPrograms.title}</h1>
            <p className="text-xl text-muted-foreground mb-8">{currentPrograms.subtitle}</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{currentPrograms.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span>{currentPrograms.format}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span>{currentPrograms.certification}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {currentPrograms.programs.map((program, index) => (
              <Card
                key={index}
                className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 flex flex-col animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`h-2 bg-gradient-to-r ${currentPrograms.color}`} />
                <CardHeader>
                  <CardTitle className="text-xl">{program.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{program.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold mb-3">What you'll learn:</h4>
                    <ul className="space-y-2 mb-6">
                      {program.skills.map((skill, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button asChild className="w-full group-hover:shadow-lg transition-shadow">
                    <Link to={getEnrollUrl(program.title)}>Enroll Now - $20/month</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Programs;
