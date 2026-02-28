import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook to track video watch progress and determine if the required
 * watch percentage has been met.
 *
 * Supports:
 * - HTML5 <video> elements (via ref callback)
 * - YouTube iframes (via postMessage API)
 * - Vimeo iframes (via postMessage API)
 */
export const useVideoWatchProgress = (requiredPercentage: number | null) => {
  const [watchedPercentage, setWatchedPercentage] = useState(0);
  const [hasMetRequirement, setHasMetRequirement] = useState(
    requiredPercentage == null || requiredPercentage <= 0
  );
  const maxWatchedRef = useRef(0);

  // Reset when lesson changes
  const reset = useCallback(() => {
    setWatchedPercentage(0);
    setHasMetRequirement(
      requiredPercentage == null || requiredPercentage <= 0
    );
    maxWatchedRef.current = 0;
  }, [requiredPercentage]);

  const updateProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (duration <= 0) return;
      const pct = Math.min(100, Math.round((currentTime / duration) * 100));
      if (pct > maxWatchedRef.current) {
        maxWatchedRef.current = pct;
        setWatchedPercentage(pct);
        if (requiredPercentage != null && pct >= requiredPercentage) {
          setHasMetRequirement(true);
        }
      }
    },
    [requiredPercentage]
  );

  // --- HTML5 Video ---
  const videoRefCallback = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return;
      const onTimeUpdate = () => updateProgress(el.currentTime, el.duration);
      el.addEventListener("timeupdate", onTimeUpdate);
      // cleanup via MutationObserver is impractical; we rely on React unmount
      return () => el.removeEventListener("timeupdate", onTimeUpdate);
    },
    [updateProgress]
  );

  // --- YouTube iframe API via postMessage ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // YouTube sends messages with channel & event
        if (data?.event === "infoDelivery" && data?.info) {
          const info = data.info;
          if (
            info.currentTime !== undefined &&
            info.duration !== undefined &&
            info.duration > 0
          ) {
            updateProgress(info.currentTime, info.duration);
          }
        }

        // Vimeo sends messages with method "playProgress" (old API)
        // or data.event === "timeupdate" (newer player SDK postMessage)
        if (data?.method === "playProgress" && data?.value) {
          updateProgress(data.value.seconds, data.value.duration);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [updateProgress]);

  // Function to enable YouTube JS API on an iframe after mount
  const enableYouTubeJSApi = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    try {
      // Tell YouTube to send us events
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*"
      );
      // Also try command approach
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
        "*"
      );
    } catch {
      // cross-origin may block
    }
  }, []);

  return {
    watchedPercentage,
    hasMetRequirement,
    requiredPercentage,
    maxWatchedRef,
    reset,
    updateProgress,
    videoRefCallback,
    enableYouTubeJSApi,
  };
};
