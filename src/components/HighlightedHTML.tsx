import { useRef, useEffect } from "react";
import hljs from "highlight.js";

interface HighlightedHTMLProps {
  html: string;
  className?: string;
}

export default function HighlightedHTML({ html, className }: HighlightedHTMLProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
