/**
 * Sanitize YouTube iframe URLs in HTML to enforce distraction-free playback.
 * Adds parameters to disable recommendations, titles, annotations, and end screens.
 */

const YOUTUBE_DISTRACTION_FREE_PARAMS: Record<string, string> = {
  rel: "0",
  showinfo: "0",
  iv_load_policy: "3",
  modestbranding: "1",
  title: "0",
  autoplay: "0",
  fs: "1",
  controls: "1",
  disablekb: "0",
  cc_load_policy: "0",
  playsinline: "1",
};

/**
 * Take any YouTube embed URL and ensure it has all distraction-free params.
 */
export function enforceYouTubeParams(src: string): string {
  try {
    // Convert to nocookie domain
    let url = src.replace(
      "www.youtube.com/embed/",
      "www.youtube-nocookie.com/embed/"
    );

    const parsed = new URL(url);

    // Only process youtube embed URLs
    if (
      !parsed.hostname.includes("youtube-nocookie.com") &&
      !parsed.hostname.includes("youtube.com")
    ) {
      return src;
    }

    // Apply all distraction-free params (don't override if already set)
    for (const [key, value] of Object.entries(YOUTUBE_DISTRACTION_FREE_PARAMS)) {
      if (!parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, value);
      }
    }

    // Always set origin
    if (typeof window !== "undefined") {
      parsed.searchParams.set("origin", window.location.origin);
    }

    return parsed.toString();
  } catch {
    return src;
  }
}

/**
 * Sanitize all YouTube iframe src attributes in an HTML string
 * to enforce distraction-free params.
 */
export function sanitizeYouTubeIframes(html: string): string {
  if (!html) return html;

  // Match iframe src attributes containing youtube
  return html.replace(
    /(<iframe[^>]*\ssrc=["'])(https?:\/\/[^"']*youtube[^"']*)(["'][^>]*>)/gi,
    (_match, prefix, src, suffix) => {
      return prefix + enforceYouTubeParams(src) + suffix;
    }
  );
}
