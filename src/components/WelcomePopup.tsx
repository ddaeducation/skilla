import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { X, ArrowRight, Sparkles, Megaphone, Video, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PopupData {
  id: string;
  title: string;
  message: string;
  popup_type: string;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  announcement: <Megaphone className="h-6 w-6" />,
  promotion: <Gift className="h-6 w-6" />,
  live_session: <Video className="h-6 w-6" />,
  new_activity: <Sparkles className="h-6 w-6" />,
};

const typeColors: Record<string, string> = {
  announcement: "from-primary to-primary/80",
  promotion: "from-orange-500 to-amber-500",
  live_session: "from-red-500 to-pink-500",
  new_activity: "from-emerald-500 to-teal-500",
};

const WelcomePopup = () => {
  const [popups, setPopups] = useState<PopupData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = sessionStorage.getItem("popup_dismissed");
    if (dismissed) return;

    const fetchPopups = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("promotional_popups")
        .select("id, title, message, popup_type, image_url, cta_text, cta_link")
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        setPopups(data);
        setTimeout(() => setOpen(true), 1500);
      }
    };

    fetchPopups();
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    sessionStorage.setItem("popup_dismissed", "true");
  };

  const handleCta = (link: string | null) => {
    handleDismiss();
    if (link) {
      if (link.startsWith("http")) {
        window.open(link, "_blank");
      } else {
        navigate(link);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < popups.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (popups.length === 0) return null;

  const popup = popups[currentIndex];
  const gradientClass = typeColors[popup.popup_type] || typeColors.announcement;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 rounded-2xl shadow-2xl gap-0">
        {/* Header gradient */}
        <div className={`bg-gradient-to-br ${gradientClass} p-6 pb-8 text-white relative`}>
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {typeIcons[popup.popup_type] || typeIcons.announcement}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              {popup.popup_type === "live_session" ? "Live Session" : 
               popup.popup_type === "new_activity" ? "New" : 
               popup.popup_type.charAt(0).toUpperCase() + popup.popup_type.slice(1)}
            </span>
          </div>
          <h2 className="text-xl font-bold leading-tight">{popup.title}</h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {popup.image_url && (
            <img
              src={popup.image_url}
              alt={popup.title}
              className="w-full h-40 object-cover rounded-xl"
            />
          )}
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {popup.message}
          </p>

          <div className="flex items-center justify-between pt-2">
            {popup.cta_text && popup.cta_link ? (
              <Button
                onClick={() => handleCta(popup.cta_link)}
                className="bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {popup.cta_text}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div />
            )}

            {popups.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="text-xs"
                >
                  Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1}/{popups.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === popups.length - 1}
                  className="text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;
