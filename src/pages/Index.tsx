import { Helmet } from "react-helmet";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import PathwaysSection from "@/components/PathwaysSection";
import SchoolsSection from "@/components/SchoolsSection";
import WhySection from "@/components/WhySection";
import CareerSection from "@/components/CareerSection";
import ResourcesSection from "@/components/ResourcesSection";
import FAQSection from "@/components/FAQSection";
import DonateSection from "@/components/DonateSection";
import Footer from "@/components/Footer";
import CourseAssistant from "@/components/CourseAssistant";
import SkipNavigation from "@/components/SkipNavigation";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Global Nexus Institute</title>
        <meta
          name="description"
          content="Get career clarity through flexible Nano-Diplomas or full Diplomas designed for international opportunities. Africa's premier online learning platform."
        />
        <meta
          name="keywords"
          content="online education Africa, tech training, diploma programs, nano-diplomas, career development Africa"
        />
        <link rel="canonical" href="https://www.globalnexus.africa" />
      </Helmet>
      <div className="min-h-screen">
        <SkipNavigation />
        <Navigation />
        <main id="main-content" role="main" aria-label="Page content">
          <Hero />
          <PathwaysSection />
          <SchoolsSection />
          <WhySection />
          <CareerSection />
          <ResourcesSection />
          <FAQSection />
          <DonateSection />
        </main>
        <Footer />
        <CourseAssistant />
      </div>
    </>
  );
};

export default Index;
