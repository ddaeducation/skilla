import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Code, Database, Briefcase, Palette, TrendingUp, Cpu, Users, Clock, BookOpen, Target, Award, CheckCircle, Globe, Star, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const schoolBrochureData: Record<string, {
  title: string;
  tagline: string;
  description: string;
  icon: any;
  gradient: string;
  accentColor: string;
  heroImage: string;
  mission: string;
  highlights: { icon: any; title: string; description: string }[];
  programs: { title: string; duration: string; level: string; description: string }[];
  outcomes: { value: string; label: string }[];
  careers: string[];
  testimonial: { quote: string; author: string; role: string };
}> = {
  engineering: {
    title: "School of Data Engineering",
    tagline: "Build the Future with Code",
    description: "Master software development, cloud computing, and cybersecurity. Our engineering school equips you with the cutting-edge skills needed to architect, build, and deploy world-class software solutions.",
    icon: Code,
    gradient: "from-blue-600 via-cyan-500 to-blue-700",
    accentColor: "blue",
    heroImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80",
    mission: "To empower Africa's next generation of software engineers with world-class technical skills, practical experience, and the confidence to build solutions that matter.",
    highlights: [
      { icon: BookOpen, title: "Industry Curriculum", description: "Courses designed with input from leading tech companies across Africa and globally" },
      { icon: Users, title: "Expert Mentorship", description: "1-on-1 guidance from senior engineers at top companies" },
      { icon: Target, title: "Project-Based Learning", description: "Build real products that solve real problems from day one" },
      { icon: Award, title: "Recognized Certification", description: "Earn certificates that employers trust and value" },
    ],
    programs: [
      { title: "Frontend Engineering", duration: "12 months", level: "Intermediate", description: "Master React, TypeScript, and modern web technologies" },
      { title: "Backend Engineering", duration: "12 months", level: "Intermediate", description: "Build scalable APIs with Node.js, Python, and databases" },
      { title: "Cloud Engineering", duration: "12 months", level: "Advanced", description: "Deploy and manage infrastructure on AWS, Azure, and GCP" },
      { title: "Cyber Security", duration: "12 months", level: "Advanced", description: "Protect systems with ethical hacking and security architecture" },
      { title: "Software Fundamentals", duration: "6 months", level: "Beginner", description: "Start your coding journey with programming basics and algorithms" },
    ],
    outcomes: [
      { value: "2,500+", label: "Students Trained" },
      { value: "94%", label: "Completion Rate" },
      { value: "89%", label: "Job Placement" },
      { value: "45%", label: "Salary Increase" },
    ],
    careers: ["Software Engineer", "DevOps Engineer", "Cloud Architect", "Full Stack Developer", "Security Analyst"],
    testimonial: { quote: "This program transformed my career. I went from zero coding knowledge to landing a full-stack developer role in 10 months.", author: "Jean Pierre M.", role: "Software Engineer" },
  },
  data: {
    title: "School of Data & Analytics",
    tagline: "Turn Data into Decisions",
    description: "Transform raw data into actionable insights. Learn data science, analytics, machine learning, and business intelligence from industry experts.",
    icon: Database,
    gradient: "from-emerald-600 via-green-500 to-teal-600",
    accentColor: "emerald",
    heroImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    mission: "To create Africa's leading data professionals who can harness the power of data to drive innovation and business transformation.",
    highlights: [
      { icon: BookOpen, title: "Hands-On Labs", description: "Work with real datasets from African businesses and global companies" },
      { icon: Users, title: "Data Community", description: "Join a vibrant network of data professionals and enthusiasts" },
      { icon: Target, title: "Industry Tools", description: "Master Python, SQL, Tableau, Power BI, and cloud platforms" },
      { icon: Award, title: "Portfolio Projects", description: "Graduate with a portfolio of data projects that showcase your skills" },
    ],
    programs: [
      { title: "Data Science & ML", duration: "12 months", level: "Advanced", description: "Build predictive models with Python, TensorFlow, and scikit-learn" },
      { title: "Data Analytics", duration: "4-8 weeks", level: "Beginner", description: "Master Excel, SQL, and data visualization fundamentals" },
      { title: "Business Analytics", duration: "12 months", level: "Intermediate", description: "Drive business decisions with Power BI and Tableau" },
      { title: "Big Data Engineering", duration: "10 months", level: "Advanced", description: "Process massive datasets with Spark and cloud data platforms" },
    ],
    outcomes: [
      { value: "1,800+", label: "Students Trained" },
      { value: "92%", label: "Completion Rate" },
      { value: "87%", label: "Job Placement" },
      { value: "52%", label: "Salary Increase" },
    ],
    careers: ["Data Scientist", "Data Analyst", "ML Engineer", "BI Developer", "Data Engineer"],
    testimonial: { quote: "The data analytics program gave me the skills to transition from accounting to a data analyst role at a fintech company.", author: "Amina K.", role: "Data Analyst" },
  },
  business: {
    title: "School of Business Studies",
    tagline: "Lead with Vision, Grow with Strategy",
    description: "Build the business acumen needed to lead and grow organizations. From marketing to finance, master all aspects of modern business management.",
    icon: Briefcase,
    gradient: "from-purple-600 via-violet-500 to-purple-700",
    accentColor: "purple",
    heroImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80",
    mission: "To develop Africa's next generation of business leaders, entrepreneurs, and innovators who will drive economic growth across the continent.",
    highlights: [
      { icon: BookOpen, title: "Case Study Method", description: "Learn through real African and global business case studies" },
      { icon: Users, title: "Industry Network", description: "Connect with successful entrepreneurs and business leaders" },
      { icon: Target, title: "Startup Incubation", description: "Get support to launch your own business venture" },
      { icon: Award, title: "Professional Certifications", description: "Prepare for PMP, CFA, and other professional certifications" },
    ],
    programs: [
      { title: "Digital Marketing Strategy", duration: "4-8 weeks", level: "Beginner", description: "Create and execute effective digital marketing campaigns" },
      { title: "Financial Analysis", duration: "6 months", level: "Intermediate", description: "Build financial models and investment strategies" },
      { title: "Project Management", duration: "4-8 weeks", level: "Intermediate", description: "Master Agile, Scrum, and PMP methodologies" },
      { title: "Entrepreneurship", duration: "8 months", level: "All Levels", description: "From idea validation to scaling your business" },
      { title: "Sales Excellence", duration: "6 months", level: "Intermediate", description: "Master consultative selling and negotiation" },
    ],
    outcomes: [
      { value: "3,200+", label: "Students Trained" },
      { value: "91%", label: "Completion Rate" },
      { value: "85%", label: "Job Placement" },
      { value: "450+", label: "Businesses Started" },
    ],
    careers: ["Marketing Manager", "Financial Analyst", "Project Manager", "Sales Director", "Entrepreneur"],
    testimonial: { quote: "The entrepreneurship program helped me refine my business idea and secure funding. My startup now employs 15 people.", author: "David N.", role: "Founder & CEO" },
  },
  product: {
    title: "School of Product & Innovation",
    tagline: "Innovate. Build. Launch.",
    description: "Turn bold ideas into market-ready products. Master product strategy, design thinking, UX research, and growth methodologies.",
    icon: TrendingUp,
    gradient: "from-orange-600 via-amber-500 to-red-600",
    accentColor: "orange",
    heroImage: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&q=80",
    mission: "To cultivate product leaders who identify opportunities, validate concepts, and build solutions that create real impact across Africa.",
    highlights: [
      { icon: BookOpen, title: "Design Sprint Labs", description: "Run real design sprints to solve problems in 5 days" },
      { icon: Users, title: "Product Community", description: "Join a network of product managers and innovators" },
      { icon: Target, title: "Launch Projects", description: "Take a product from concept to launch during the program" },
      { icon: Award, title: "Industry Tools", description: "Master Figma, Jira, Mixpanel, and product analytics" },
    ],
    programs: [
      { title: "Product Management", duration: "4-8 weeks", level: "Beginner", description: "From ideation to roadmapping and agile delivery" },
      { title: "Innovation & Design Thinking", duration: "12 months", level: "Intermediate", description: "Human-centered design and innovation frameworks" },
      { title: "UI/UX Design", duration: "4-8 weeks", level: "Beginner", description: "Create beautiful, intuitive user experiences" },
      { title: "Product Analytics", duration: "6 months", level: "Intermediate", description: "Measure success and make data-driven product decisions" },
    ],
    outcomes: [
      { value: "1,400+", label: "Students Trained" },
      { value: "93%", label: "Completion Rate" },
      { value: "88%", label: "Job Placement" },
      { value: "320+", label: "Products Launched" },
    ],
    careers: ["Product Manager", "Innovation Strategist", "UX Researcher", "Growth Lead", "Design Thinking Facilitator"],
    testimonial: { quote: "I learned to think like a product leader. The design thinking methodology changed how I approach every problem.", author: "Grace W.", role: "Product Manager" },
  },
  "creative-economy": {
    title: "School of Digital & Creative Media",
    tagline: "Create. Inspire. Impact.",
    description: "Shape the future of media and entertainment. Master digital storytelling, media production, content creation, and creative technologies.",
    icon: Palette,
    gradient: "from-pink-600 via-rose-500 to-fuchsia-600",
    accentColor: "rose",
    heroImage: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=1200&q=80",
    mission: "To empower Africa's creative talent with the skills, tools, and networks needed to thrive in the global creative economy.",
    highlights: [
      { icon: BookOpen, title: "Creative Studio", description: "Access professional-grade production tools and equipment" },
      { icon: Users, title: "Creator Network", description: "Connect with successful content creators and media professionals" },
      { icon: Target, title: "Portfolio Building", description: "Graduate with a professional portfolio of creative work" },
      { icon: Award, title: "Monetization Skills", description: "Learn to earn from your creative skills across platforms" },
    ],
    programs: [
      { title: "Content Creation Mastery", duration: "6 months", level: "Beginner", description: "Create engaging content for YouTube, Instagram, and TikTok" },
      { title: "Digital Media Production", duration: "8 months", level: "Intermediate", description: "Master video, audio, and multimedia production" },
      { title: "Digital Arts & Animation", duration: "10 months", level: "Intermediate", description: "Create stunning digital art and animations" },
      { title: "Personal Branding", duration: "1-3 hours", level: "All Levels", description: "Build a strong brand that differentiates you" },
    ],
    outcomes: [
      { value: "2,100+", label: "Students Trained" },
      { value: "90%", label: "Completion Rate" },
      { value: "82%", label: "Freelance Success" },
      { value: "50M+", label: "Content Views" },
    ],
    careers: ["Digital Media Producer", "Content Strategist", "Motion Graphics Designer", "Social Media Manager", "Creative Director"],
    testimonial: { quote: "I started with zero followers. After the program, I built a brand with 100K+ followers and now earn a full-time income from content.", author: "Celine U.", role: "Content Creator" },
  },
  computing: {
    title: "School of Languages & Comms",
    tagline: "Communicate Without Borders",
    description: "Communicate with confidence across cultures and industries. Master languages, professional writing, public speaking, and intercultural communication.",
    icon: Cpu,
    gradient: "from-indigo-600 via-blue-500 to-violet-600",
    accentColor: "indigo",
    heroImage: "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=1200&q=80",
    mission: "To equip professionals with the language skills and communication expertise needed to succeed in Africa's multilingual business landscape.",
    highlights: [
      { icon: BookOpen, title: "Immersive Learning", description: "Live conversation practice with native speakers" },
      { icon: Users, title: "Language Exchange", description: "Practice with peers from across the continent" },
      { icon: Target, title: "Business Focus", description: "Communication skills tailored for professional settings" },
      { icon: Award, title: "Certification Prep", description: "Prepare for DELF, TOEFL, and other language exams" },
    ],
    programs: [
      { title: "Business English", duration: "4-8 weeks", level: "All Levels", description: "Professional writing, email etiquette, and presentations" },
      { title: "French for Professionals", duration: "6 months", level: "Beginner", description: "Business French for diplomacy and international careers" },
      { title: "Public Speaking", duration: "4-8 weeks", level: "All Levels", description: "Influence and inspire any audience with confidence" },
      { title: "Intercultural Communication", duration: "3 months", level: "Intermediate", description: "Navigate cross-cultural business environments" },
      { title: "Technical Communication", duration: "4 months", level: "Intermediate", description: "Communicate complex concepts clearly" },
    ],
    outcomes: [
      { value: "1,600+", label: "Students Trained" },
      { value: "88%", label: "Completion Rate" },
      { value: "8+", label: "Languages Offered" },
      { value: "200+", label: "Career Transitions" },
    ],
    careers: ["Communications Specialist", "Technical Writer", "Translator", "PR Manager", "ESL Instructor"],
    testimonial: { quote: "Learning business French opened doors I never imagined. I now work with francophone clients across West Africa.", author: "Patrick I.", role: "International Business Consultant" },
  },
};

const SchoolBrochure = () => {
  const { school } = useParams<{ school: string }>();
  const navigate = useNavigate();
  const data = schoolBrochureData[school || ""];

  if (!data) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="container px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Brochure not found</h1>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = data.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Hero Banner */}
        <section className={`relative overflow-hidden bg-gradient-to-br ${data.gradient} text-white`}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${data.heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />

          <div className="container px-4 relative z-10 py-20 md:py-32">
            <Button
              variant="ghost"
              className="mb-8 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate(`/schools/${school}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to School
            </Button>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Official Brochure
              </div>
              <div className="inline-flex p-4 rounded-2xl bg-white/20 backdrop-blur mb-6 ml-0 block">
                <Icon className="h-14 w-14" />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 font-display">
                {data.title}
              </h1>
              <p className="text-2xl md:text-3xl font-light text-white/90 mb-4">{data.tagline}</p>
              <p className="text-lg text-white/75 max-w-2xl leading-relaxed">{data.description}</p>
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="py-16 md:py-20">
          <div className="container px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Globe className="h-4 w-4" />
                Our Mission
              </div>
              <blockquote className="text-2xl md:text-3xl font-display font-medium text-foreground leading-relaxed italic">
                "{data.mission}"
              </blockquote>
            </div>
          </div>
        </section>

        {/* Outcomes Stats */}
        <section className={`py-16 bg-gradient-to-br ${data.gradient} text-white`}>
          <div className="container px-4">
            <h2 className="text-3xl font-bold text-center mb-12 font-display">Our Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {data.outcomes.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm text-white/80 uppercase tracking-wider font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">Why Choose Us</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Everything you need to build a successful career
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {data.highlights.map((h, i) => {
                const HIcon = h.icon;
                return (
                  <div
                    key={i}
                    className="group bg-card rounded-2xl p-6 border border-border/60 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${data.gradient} text-white mb-4 shadow-lg`}>
                      <HIcon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-foreground">{h.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{h.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>


        {/* Career Paths */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">Career Paths</h2>
              <p className="text-muted-foreground text-lg">Where our graduates work</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              {data.careers.map((career, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${data.gradient} text-white font-medium shadow-lg hover:scale-105 transition-transform`}
                >
                  <CheckCircle className="h-4 w-4" />
                  {career}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-16 md:py-20">
          <div className="container px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-xl md:text-2xl text-foreground font-medium leading-relaxed mb-6 italic">
                "{data.testimonial.quote}"
              </blockquote>
              <div>
                <p className="font-semibold text-foreground">{data.testimonial.author}</p>
                <p className="text-muted-foreground text-sm">{data.testimonial.role}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={`py-16 md:py-24 bg-gradient-to-br ${data.gradient} text-white`}>
          <div className="container px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-display">Ready to Get Started?</h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Take the first step towards transforming your career. Apply now and join thousands of successful graduates.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/apply">Apply Now</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10" asChild>
                <Link to={`/schools/${school}`}>View Programs</Link>
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
    </div>
  );
};

export default SchoolBrochure;
