import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Facebook, Linkedin, Instagram, PartyPopper, Twitter } from "lucide-react";

interface SocialSharePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  rating: number;
  review?: string;
  onDone: () => void;
}

const SocialSharePrompt = ({
  open,
  onOpenChange,
  courseTitle,
  rating,
  review,
  onDone,
}: SocialSharePromptProps) => {
  const shareText = review
    ? `I just completed "${courseTitle}" on Skilll Africa and rated it ${rating}/5 stars! "${review}" 🎓`
    : `I just completed "${courseTitle}" on Skilll Africa and rated it ${rating}/5 stars! 🎓 Highly recommend it!`;

  const siteUrl = window.location.origin;

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}&summary=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const handleXShare = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(siteUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
  };

  const handleInstagramShare = () => {
    // Instagram doesn't have a direct share URL — open profile/app as a prompt
    navigator.clipboard.writeText(shareText + " " + siteUrl);
    window.open("https://www.instagram.com/", "_blank");
  };

  const handleSkip = () => {
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Share Your Achievement!
          </DialogTitle>
          <DialogDescription className="text-center">
            You rated <span className="font-semibold text-foreground">{courseTitle}</span>{" "}
            <span className="font-bold text-yellow-500">{rating}★</span> — let your network know about your learning journey!
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <Button
            onClick={handleFacebookShare}
            className="w-full gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
          >
            <Facebook className="h-5 w-5" />
            Share on Facebook
          </Button>
          <Button
            onClick={handleLinkedInShare}
            className="w-full gap-2 bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white"
          >
            <Linkedin className="h-5 w-5" />
            Share on LinkedIn
          </Button>
          <Button
            onClick={handleXShare}
            className="w-full gap-2 bg-foreground hover:bg-foreground/90 text-background"
          >
            <Twitter className="h-5 w-5" />
            Share on X
          </Button>
          <Button
            onClick={handleInstagramShare}
            className="w-full gap-2 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-90 text-white"
          >
            <Instagram className="h-5 w-5" />
            Copy & Open Instagram
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialSharePrompt;
