import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from "lucide-react";

const FAQSection = () => {
  const faqs = [
    {
      question: "Who can enroll in Global Nexus Institute programs?",
      answer:
        "Anyone with a passion for learning can enroll! Our programs are designed for students, working professionals, career switchers, and entrepreneurs across Africa. No prior experience is required for most entry-level programs.",
    },
    {
      question: "What are the payment options available?",
      answer:
        "We offer flexible payment options including full upfront payment, monthly installments, and scholarship opportunities. We also partner with financial institutions to provide student loans. Contact our admissions team for more details.",
    },
    {
      question: "Are the certificates recognized internationally?",
      answer:
        "Yes! Global Nexus Institute is accredited by RTB (Rwanda TVET Board) and endorsed by the Institute of Analytics. Our certificates are recognized by employers worldwide and demonstrate your competence in your chosen field.",
    },
    {
      question: "What is the difference between Short-Course, Professional, and Masterclass?",
      answer:
        "Short courses are short, self-paced programs (4-8 weeks) focusing on specific skills. Professional are comprehensive (3-12-months) programs with live classes and mentorship. Masterclasses are (1-3 hours) sessions on practical topics for quick wins.",
    },
    {
      question: "Do I need a laptop to participate?",
      answer:
        "Yes, a laptop is required for most of our technical programs. We recommend a laptop with at least 8GB RAM and a modern operating system. Some programs have specific technical requirements which will be communicated upon enrollment.",
    },
    {
      question: "Can I access course materials after completion?",
      answer:
        "Yes! All students get lifetime access to course materials, including video recordings, slides, and resources. You can revisit the content anytime to refresh your knowledge.",
    },
    {
      question: "What career support do you provide?",
      answer:
        "We offer comprehensive career support including resume reviews, interview preparation, job matching with our 200+ hiring partners, and one-on-one mentorship. 90% of our graduates find employment within 6 months.",
    },
    {
      question: "Is there a refund policy?",
      answer:
        "Yes, we offer a 14-day money-back guarantee if you're not satisfied with your program. Refund terms vary by program type, so please review the specific policy in your enrollment agreement.",
    },
  ];

  return (
    <section id="faqs" aria-labelledby="faqs-heading" className="py-12 md:py-16 bg-background">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 id="faqs-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-muted-foreground">Got questions? We've got answers</p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faqs.map((faq, index) => (
              <Card
                key={index}
                className="animate-fade-in hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg leading-snug">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-lg text-muted-foreground mb-4">Still have questions?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
                <a href="https://wa.me/250787406140" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  WhatsApp: +250 787 406 140
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:globalnexusinstitute@gmail.com">
                  <Mail className="mr-2 h-5 w-5" />
                  globalnexusinstitute@gmail.com
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
