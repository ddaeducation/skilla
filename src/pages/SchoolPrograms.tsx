import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProgramCard from "@/components/ProgramCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, ArrowLeft, Code, Database, Briefcase, Palette, TrendingUp, Cpu, Users, Target, GraduationCap, Zap, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Mapping from URL param to database school name
const schoolDbNameMap: Record<string, string> = {
  engineering: "Data Engineering",
  data: "Data & Analytics",
  business: "Business Studies",
  product: "Product & Innovation",
  "creative-economy": "Digital & Creative Media",
  computing: "Languages & Comms"
};
const SchoolPrograms = () => {
  const {
    school
  } = useParams<{
    school: string;
  }>();
  const navigate = useNavigate();

  // Fetch courses from database for this school
  const {
    data: dbCourses = [],
    isLoading: coursesLoading
  } = useQuery({
    queryKey: ["school-courses", school],
    queryFn: async () => {
      const dbSchoolName = schoolDbNameMap[school || ""];
      if (!dbSchoolName) return [];
      const {
        data,
        error
      } = await supabase.from("courses").select("id, title, description, duration, school, price, monthly_price, learning_outcomes, category, slug").eq("school", dbSchoolName).eq("approval_status", "approved").in("publish_status", ["live", "upcoming"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!school
  });
  const schoolData = {
    engineering: {
      title: "School of Data Engineering",
      subtitle: "Master software development, cloud computing, and cybersecurity",
      description: "Our Data Engineering school prepares you for the most in-demand tech careers. Learn from industry experts, work on real-world projects, and build a portfolio that gets you hired.",
      icon: Code,
      color: "from-blue-600 to-cyan-600",
      stats: [{
        label: "Students Enrolled",
        value: "2,500+"
      }, {
        label: "Completion Rate",
        value: "94%"
      }, {
        label: "Job Placement",
        value: "89%"
      }, {
        label: "Avg Salary Increase",
        value: "45%"
      }],
      careers: ["Software Engineer", "DevOps Engineer", "Cloud Architect", "Full Stack Developer"],
      programs: [{
        title: "Frontend Engineering",
        description: "Master modern frontend technologies including React, Vue, and Angular. Build beautiful, responsive web applications.",
        duration: "12 months",
        format: "Live classes + recorded lectures",
        skills: ["React", "TypeScript", "CSS/Tailwind", "Web Performance"]
      }, {
        title: "Backend Engineering",
        description: "Learn server-side development with Node.js, Python, and databases. Build scalable APIs and services.",
        duration: "12 months",
        format: "Live classes + recorded lectures",
        skills: ["Node.js", "Python", "PostgreSQL", "API Design"]
      }, {
        title: "Cloud Engineering",
        description: "Master cloud infrastructure and DevOps practices. Deploy and manage scalable applications on major cloud platforms.",
        duration: "12 months",
        format: "Live classes + recorded lectures",
        skills: ["AWS/Azure", "Docker/Kubernetes", "CI/CD", "Infrastructure as Code"]
      }, {
        title: "Cyber Security",
        description: "Protect systems and data from cyber threats. Learn ethical hacking, security architecture, and compliance.",
        duration: "12 months",
        format: "Live classes + recorded lectures",
        skills: ["Network Security", "Penetration Testing", "Security Architecture", "Compliance"]
      }, {
        title: "Software Engineering Fundamentals",
        description: "Learn programming basics, algorithms, and software design principles. Perfect for beginners.",
        duration: "6 months",
        format: "Self-paced + mentorship",
        skills: ["Programming Basics", "Algorithms", "Data Structures", "Version Control"]
      }]
    },
    data: {
      title: "School of Data & Analytics",
      subtitle: "Learn data science, analytics, and machine learning",
      description: "Transform raw data into actionable insights. Our Data & Analytics school teaches you to harness the power of data to drive business decisions and innovation.",
      icon: Database,
      color: "from-green-600 to-emerald-600",
      stats: [{
        label: "Students Enrolled",
        value: "1,800+"
      }, {
        label: "Completion Rate",
        value: "92%"
      }, {
        label: "Job Placement",
        value: "87%"
      }, {
        label: "Avg Salary Increase",
        value: "52%"
      }],
      careers: ["Data Scientist", "Data Analyst", "ML Engineer", "BI Developer", "Data Engineer"],
      programs: [{
        title: "Data Science & Machine Learning",
        description: "Learn to build predictive models and extract insights from complex datasets using cutting-edge ML techniques.",
        duration: "12 months",
        format: "Live classes + recorded lectures",
        skills: ["Python", "Machine Learning", "Deep Learning", "Data Engineering"]
      }, {
        title: "Data Analytics Fundamentals",
        description: "Dive into data analysis with Excel, SQL, and visualization tools. Transform raw data into actionable business insights.",
        duration: "4-8 weeks",
        format: "Self-paced",
        skills: ["Excel", "SQL", "Data Visualization", "Statistical Analysis"]
      }, {
        title: "Business Analytics",
        description: "Transform data into strategic business insights. Master analytics tools and business intelligence platforms.",
        duration: "12 months",
        format: "Live classes + recorded lectures",
        skills: ["Power BI", "Tableau", "Business Intelligence", "Predictive Analytics"]
      }, {
        title: "Big Data Engineering",
        description: "Learn to process and analyze massive datasets using modern big data technologies.",
        duration: "10 months",
        format: "Live classes + projects",
        skills: ["Hadoop", "Spark", "Data Pipelines", "Cloud Data Platforms"]
      }]
    },
    business: {
      title: "School of Business Studies",
      subtitle: "Develop skills in management, sales, and entrepreneurship",
      description: "Build the business acumen needed to lead and grow organizations. From marketing to finance, our Business school covers all aspects of modern business management.",
      icon: Briefcase,
      color: "from-purple-600 to-pink-600",
      stats: [{
        label: "Students Enrolled",
        value: "3,200+"
      }, {
        label: "Completion Rate",
        value: "91%"
      }, {
        label: "Job Placement",
        value: "85%"
      }, {
        label: "Businesses Started",
        value: "450+"
      }],
      careers: ["Marketing Manager", "Financial Analyst", "Project Manager", "Sales Director"],
      programs: [{
        title: "Digital Marketing Strategy",
        description: "Learn to create and execute effective digital marketing campaigns across multiple channels.",
        duration: "4-8 weeks",
        format: "Self-paced",
        skills: ["SEO/SEM", "Social Media", "Content Marketing", "Analytics"]
      }, {
        title: "Financial Analysis & Modeling",
        description: "Build financial models and perform analysis to drive business decisions and investment strategies.",
        duration: "6 months",
        format: "Self-paced + mentorship",
        skills: ["Financial Modeling", "Valuation", "Excel", "Business Analysis"]
      }, {
        title: "Project Management Professional",
        description: "Master project management methodologies and tools to deliver projects on time and within budget.",
        duration: "4-8 weeks",
        format: "Self-paced",
        skills: ["PMP Framework", "Risk Management", "Stakeholder Management", "Agile"]
      }, {
        title: "Entrepreneurship & Startup Management",
        description: "Learn how to start, grow, and scale a successful business from idea to execution.",
        duration: "8 months",
        format: "Live classes + mentorship",
        skills: ["Business Planning", "Fundraising", "Growth Strategy", "Leadership"]
      }, {
        title: "Sales Excellence",
        description: "Master modern sales techniques and strategies to close more deals and build lasting client relationships.",
        duration: "6 months",
        format: "Live classes + role-play",
        skills: ["Consultative Selling", "Negotiation", "CRM Systems", "Sales Analytics"]
      }]
    },
    product: {
      title: "School of Product & Innovation",
      subtitle: "Drive innovation through product strategy, design thinking, and entrepreneurship",
      description: "Turn bold ideas into market-ready products. Our Product & Innovation school teaches you to identify opportunities, validate concepts, and build solutions that create real impact.",
      icon: TrendingUp,
      color: "from-orange-600 to-red-600",
      stats: [{
        label: "Students Enrolled",
        value: "1,400+"
      }, {
        label: "Completion Rate",
        value: "93%"
      }, {
        label: "Job Placement",
        value: "88%"
      }, {
        label: "Products Launched",
        value: "320+"
      }],
      careers: ["Product Manager", "Innovation Strategist", "UX Researcher", "Growth Product Lead", "Design Thinking Facilitator"],
      programs: [{
        title: "Product Management Essentials",
        description: "Learn the fundamentals of product management, from ideation to launch. Master user research, roadmapping, and agile methodologies.",
        duration: "4-8 weeks",
        format: "Self-paced",
        skills: ["User Research", "Roadmapping", "Agile/Scrum", "Product Strategy"]
      }, {
        title: "Innovation & Design Thinking",
        description: "Master human-centered design and innovation frameworks to solve complex problems creatively.",
        duration: "12 months",
        format: "Live classes + recorded lectures",
        skills: ["Design Thinking", "Prototyping", "User Research", "Innovation Frameworks"]
      }, {
        title: "UI/UX Design Basics",
        description: "Master user interface and experience design principles. Create beautiful, intuitive designs that users love.",
        duration: "4-8 weeks",
        format: "Self-paced",
        skills: ["Figma", "User Research", "Wireframing", "Prototyping"]
      }, {
        title: "Product Analytics",
        description: "Learn to measure product success and make data-driven decisions to improve user experience.",
        duration: "6 months",
        format: "Live classes + projects",
        skills: ["Product Metrics", "A/B Testing", "User Analytics", "Data Interpretation"]
      }]
    },
    "creative-economy": {
      title: "School of Digital & Creative Media",
      subtitle: "Master digital storytelling, media production, and creative technologies",
      description: "Shape the future of media and entertainment. Our Digital & Creative Media school equips you with the skills to create compelling content, build brands, and thrive in the creative economy.",
      icon: Palette,
      color: "from-pink-600 to-rose-600",
      stats: [{
        label: "Students Enrolled",
        value: "2,100+"
      }, {
        label: "Completion Rate",
        value: "90%"
      }, {
        label: "Freelance Success",
        value: "82%"
      }, {
        label: "Content Views",
        value: "50M+"
      }],
      careers: ["Digital Media Producer", "Content Strategist", "Motion Graphics Designer", "Social Media Manager", "Creative Director"],
      programs: [{
        title: "Content Creation Mastery",
        description: "Learn to create engaging content across platforms including YouTube, Instagram, and TikTok.",
        duration: "6 months",
        format: "Live classes + practical projects",
        skills: ["Video Production", "Content Strategy", "Social Media", "Monetization"]
      }, {
        title: "Digital Media Production",
        description: "Master audio, video, and multimedia production using industry-standard tools and workflows.",
        duration: "8 months",
        format: "Live classes + mentorship",
        skills: ["Video Editing", "Audio Production", "Motion Graphics", "Storytelling"]
      }, {
        title: "Digital Arts & Animation",
        description: "Create stunning digital artwork and animations using industry-standard tools.",
        duration: "10 months",
        format: "Live classes + portfolio building",
        skills: ["Adobe Creative Suite", "3D Modeling", "Animation", "Portfolio Design"]
      }, {
        title: "Personal Branding Strategy",
        description: "Build a strong personal brand that differentiates you in the marketplace.",
        duration: "1-3 hours",
        format: "Live session",
        skills: ["Brand Identity", "Content Creation", "Online Presence", "Thought Leadership"]
      }]
    },
    computing: {
      title: "School of Languages & Comms",
      subtitle: "Build fluency in global languages, professional communication, and cross-cultural skills",
      description: "Communicate with confidence across cultures and industries. Our Languages & Comms school helps you master languages, professional writing, public speaking, and intercultural communication.",
      icon: Cpu,
      color: "from-indigo-600 to-violet-600",
      stats: [{
        label: "Students Enrolled",
        value: "1,600+"
      }, {
        label: "Completion Rate",
        value: "88%"
      }, {
        label: "Languages Offered",
        value: "8+"
      }, {
        label: "Career Transitions",
        value: "200+"
      }],
      careers: ["Corporate Communications Specialist", "Technical Writer", "Translator/Interpreter", "Public Relations Manager", "ESL Instructor"],
      programs: [{
        title: "Business English & Professional Writing",
        description: "Master business communication, report writing, and professional correspondence for the global workplace.",
        duration: "4-8 weeks",
        format: "Self-paced + live practice sessions",
        skills: ["Business Writing", "Email Etiquette", "Report Writing", "Presentation Skills"]
      }, {
        title: "French for Professionals",
        description: "Build professional-level French language skills for business, diplomacy, and international careers.",
        duration: "6 months",
        format: "Live classes + conversation practice",
        skills: ["French Grammar", "Business French", "Conversation", "Cultural Fluency"]
      }, {
        title: "Public Speaking & Persuasion",
        description: "Develop powerful presentation and public speaking skills to influence and inspire any audience.",
        duration: "4-8 weeks",
        format: "Live workshops + recorded lectures",
        skills: ["Speech Writing", "Delivery Techniques", "Storytelling", "Audience Engagement"]
      }, {
        title: "Intercultural Communication",
        description: "Navigate cross-cultural business environments with confidence and cultural intelligence.",
        duration: "3 months",
        format: "Live classes + case studies",
        skills: ["Cultural Intelligence", "Global Etiquette", "Cross-Cultural Negotiation", "Diversity & Inclusion"]
      }, {
        title: "Technical & Scientific Communication",
        description: "Learn to communicate complex technical and scientific concepts clearly to diverse audiences.",
        duration: "4 months",
        format: "Self-paced + peer review",
        skills: ["Technical Writing", "Documentation", "Data Visualization", "Scientific Reporting"]
      }]
    }
  };
  const currentSchool = schoolData[school as keyof typeof schoolData];
  if (!currentSchool) {
    return <div className="min-h-screen">
        <Navigation />
        <main className="container px-4 py-20">
          <h1 className="text-3xl font-bold mb-4">School not found</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
        <Footer />
      </div>;
  }
  const Icon = currentSchool.icon;
  return <div className="min-h-screen">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className={`relative py-20 md:py-32 bg-gradient-to-br ${currentSchool.color} text-white overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="container px-4 relative z-10">
            <Button variant="ghost" className="mb-8 text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>

            <div className="max-w-4xl">
              <div className="inline-flex p-4 rounded-2xl bg-white/20 backdrop-blur mb-6">
                <Icon className="h-12 w-12" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-4">{currentSchool.title}</h1>
              <p className="text-xl md:text-2xl text-white/90 mb-6">{currentSchool.subtitle}</p>
              <p className="text-lg text-white/80 max-w-2xl mb-8">{currentSchool.description}</p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/apply">Apply Now</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10" asChild>
                  <Link to={`/schools/${school}/brochure`}>Open Brochure</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-muted/30">
          <div className="container px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {currentSchool.stats.map((stat, index) => <div key={index} className="text-center">
                  <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${currentSchool.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>)}
            </div>
          </div>
        </section>

        {/* Why This School Section */}
        <section className="py-16 md:py-[9px]">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Choose This School?</h2>
              <p className="text-muted-foreground text-lg">
                Our programs are designed to give you practical skills that employers are looking for
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${currentSchool.color} text-white mx-auto mb-2`}>
                    <Users className="h-6 w-6" />
                  </div>
                  <CardTitle>Expert Instructors</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Learn from industry professionals with years of real-world experience
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${currentSchool.color} text-white mx-auto mb-2`}>
                    <Zap className="h-6 w-6" />
                  </div>
                  <CardTitle>Hands-On Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Build a portfolio of real projects that demonstrate your skills
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${currentSchool.color} text-white mx-auto mb-2`}>
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <CardTitle>Career Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get job placement assistance and career coaching after graduation
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Career Outcomes Section */}
        <section className="py-16 bg-muted/30">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Career Paths</h2>
              <p className="text-muted-foreground text-lg">
                Graduates from this school go on to work in these exciting roles
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {currentSchool.careers.map((career, index) => <div key={index} className={`px-6 py-3 rounded-full bg-gradient-to-r ${currentSchool.color} text-white font-medium`}>
                  {career}
                </div>)}
            </div>
          </div>
        </section>

        {/* Programs Section */}
        <section className="py-16 md:py-[9px]">
          <div className="container px-4">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Available Programs</h2>
              <p className="text-xl text-muted-foreground">
                Choose from our range of programs designed to meet your career goals
              </p>
            </div>

            {coursesLoading ? <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div> : dbCourses.length > 0 ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
                {dbCourses.map((course, index) => {
              const displayPrice = (course as any).monthly_price ?? course.price;
              const priceText = displayPrice > 0 ? `$${displayPrice}/mo` : 'Free';
              return <ProgramCard key={course.id} title={course.title} description={course.description || ""} duration={course.duration || "Self-paced"} format="Live classes + recorded lectures" category={(course as any).category || undefined} skills={course.learning_outcomes as string[] || []} gradientColor={currentSchool.color} animationDelay={index * 0.1} enrollLink={`/course/${(course as any).slug || course.id}`} enrollButtonText={displayPrice > 0 ? `Enroll Now - ${priceText}` : `Enroll Now - Free`} />;
            })}
              </div> : <div className="text-center py-12">
                <p className="text-muted-foreground">No programs available yet. Check back soon!</p>
              </div>}
          </div>
        </section>

        {/* CTA Section */}
        <section className={`py-16 md:py-24 bg-gradient-to-br ${currentSchool.color} text-white`}>
          <div className="container px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of students who have transformed their careers with Global Nexus Institute
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/apply">Apply Now</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10" asChild>
                <a href="https://wa.me/250787406140" target="_blank" rel="noopener noreferrer">
                  Talk to an Advisor
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>;
};
export default SchoolPrograms;