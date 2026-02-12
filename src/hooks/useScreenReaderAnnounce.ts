import { useCallback, useRef } from "react";

/**
 * Hook for announcing messages to screen readers via ARIA live regions.
 * Creates and manages a visually hidden live region element.
 */
export function useScreenReaderAnnounce() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    // Clear any pending announcement
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    let region = document.getElementById(`sr-live-${priority}`);
    if (!region) {
      region = document.createElement("div");
      region.id = `sr-live-${priority}`;
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", priority);
      region.setAttribute("aria-atomic", "true");
      region.className = "sr-only";
      document.body.appendChild(region);
    }

    // Clear then set after a tick so screen readers detect the change
    region.textContent = "";
    timeoutRef.current = setTimeout(() => {
      region!.textContent = message;
    }, 100);
  }, []);

  return announce;
}
