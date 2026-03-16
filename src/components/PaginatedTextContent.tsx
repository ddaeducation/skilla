import { useRef, useEffect } from "react";
import hljs from "highlight.js";

interface PaginatedTextContentProps {
  htmlContent: string;
  className?: string;
  onPageInfo?: (currentPage: number, totalPages: number, setPage: (page: number) => void) => void;
}

export default function PaginatedTextContent({ htmlContent, className, onPageInfo }: PaginatedTextContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onPageInfo?.(1, 1, () => {});
  }, [htmlContent, onPageInfo]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      // Apply syntax highlighting to all code blocks
      containerRef.current.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [htmlContent]);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto custom-scrollbar"
      style={{ height: "calc(100vh - 140px)", minHeight: 400 }}
    >
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
