import { Button } from "@/components/ui/button";

/**
 * Skip navigation link for keyboard/screen reader users.
 * Visually hidden until focused via Tab key.
 */
const SkipNavigation = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
    >
      Skip to main content
    </a>
  );
};

export default SkipNavigation;
