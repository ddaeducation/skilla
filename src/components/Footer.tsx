import { Facebook, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";
import gniLogo from "@/assets/gni-logo.png";
const Footer = () => {
  const footerSections = [
    {
      title: "Schools",
      links: [
        "Data Engineering",
        "Product & Innovation",
        "Data & Analytics",
        "Business Studies",
        "Digital & Creative Media",
        "Languages & Comms",
      ],
    },
    {
      title: "Programs",
      links: ["Frontend Engineering", "Backend Engineering", "Data Science", "Product Management", "Digital Marketing"],
    },
    {
      title: "Company",
      links: ["About Us", "Why Global Nexus Institute", "Career", "Blog", "Contact"],
    },
    {
      title: "Resources",
      links: ["FAQs", "Scholarship", "Terms of Service", "Privacy Policy", "Collaborate with us"],
    },
  ];
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
            <p className="text-sm text-primary-foreground/80 mb-4">Africa's premier online learning platform</p>
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

          {/* Footer sections */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href="#"
                      className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/80">© 2026 Global Nexus Institute. All rights reserved.</p>
            <p className="text-sm text-primary-foreground/80">info@globalnexus.africa</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
