import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProgramCard from "@/components/ProgramCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AllPrograms = () => {
  const navigate = useNavigate();

  const allPrograms = [
    {
      category: "Short-Course",
      categoryColor: "from-blue-500 to-cyan-500",
      categoryRoute: "Short-Course",
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
    {
      category: "Professional",
      categoryColor: "from-purple-500 to-pink-500",
      categoryRoute: "Professional",
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
    {
      category: "Masterclass",
      categoryColor: "from-orange-500 to-red-500",
      categoryRoute: "masterclass",
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
  ];

  const getEnrollUrl = (programTitle: string, categoryRoute: string) => {
    return `/apply?program=${encodeURIComponent(programTitle)}&type=${categoryRoute}`;
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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">All Programs</h1>
            <p className="text-xl text-muted-foreground">
              Explore our complete range of programs across Short-Courses, Professionals, and Masterclasses
            </p>
          </div>

          {allPrograms.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div
                    className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${category.categoryColor} text-white mb-2`}
                  >
                    {category.category.toUpperCase()}
                  </div>
                  <h2 className="text-2xl font-bold">{category.category} Programs</h2>
                </div>
                <Button variant="outline" onClick={() => navigate(`/programs/${category.categoryRoute}`)}>
                  View {category.category} Details
                </Button>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
                {category.programs.map((program, index) => (
                  <ProgramCard
                    key={index}
                    title={program.title}
                    description={program.description}
                    category={category.category}
                    skills={program.skills}
                    gradientColor={category.categoryColor}
                    enrollLink={getEnrollUrl(program.title, category.categoryRoute)}
                    enrollButtonText="Enroll Now - $20/mo"
                    animationDelay={index * 0.1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AllPrograms;
