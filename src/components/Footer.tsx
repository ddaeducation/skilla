import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import gniLogo from "@/assets/gni-logo.png";
const Footer = () => {
  const schoolsCol1 = ["Data Engineering", "Product & Innovation", "Data & Analytics"];
  const schoolsCol2 = ["Business Studies", "Digital & Creative Media", "Languages & Comms"];
  const companyLinks = ["About Us", "Career"];
  const resourcesLinks = ["FAQs", "Scholarship", "Terms of Service"];
  const socialLinks = [
    {
      Icon: Facebook,
      href: "https://www.facebook.com/p/Global-Nexus-Institute-61560364154598/",
    },
    {
      Icon: Twitter,
      href: "https://x.com/GlobalNexusInt",
    },
    {
      Icon: Instagram,
      href: "https://www.instagram.com/globalnexusinstitute/",
    },
    {
      Icon: Linkedin,
      href: "https://www.linkedin.com/company/global-nexus-institute/?viewAsMember=true",
    },
    {
      Icon: Youtube,
      href: "https://www.youtube.com/@Global_Nexus_Institute",
    },
  ];
  return (
    <footer className="bg-primary text-primary-foreground" role="contentinfo">
      <div className="container px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <img src={gniLogo} alt="Global Nexus Institute" className="h-16 w-auto bg-white rounded-lg p-2" />
            </div>
            <p className="text-sm font-medium text-primary-foreground/90 mb-4">Learn. Build. Get Hired.</p>
            <div className="flex space-x-4" role="list" aria-label="Social media links">
              {socialLinks.map(({ Icon, href }, index) => {
                const labels = ["Facebook", "Twitter", "Instagram", "LinkedIn", "YouTube"];
                return (
                  <a
                    key={index}
                    href={href}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                    aria-label={`Visit our ${labels[index]} page`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Schools - two columns */}
          <div className="lg:col-span-2">
            <h4 className="font-semibold mb-4">Schools</h4>
            <div className="grid grid-cols-2 gap-x-8">
              <ul className="space-y-2">
                {schoolsCol1.map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
              <ul className="space-y-2">
                {schoolsCol2.map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {companyLinks.map((link, i) => (
                <li key={i}>
                  <a href="#" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">{link}</a>
                </li>
              ))}
              <li>
                <Link to="/collaborate" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">Collaborate with us</Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              {resourcesLinks.map((link, i) => (
                <li key={i}>
                  <a href="#" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="text-center">
            <p className="text-sm text-primary-foreground/80">© 2026 Global Nexus Institute. All rights reserved. / info@globalnexus.africa</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
