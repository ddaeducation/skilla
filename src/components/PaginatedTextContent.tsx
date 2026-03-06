import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginatedTextContentProps {
  htmlContent: string;
  className?: string;
  onPageInfo?: (currentPage: number, totalPages: number, setPage: (page: number) => void) => void;
}

export default function PaginatedTextContent({ htmlContent, className, onPageInfo }: PaginatedTextContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageHeight, setPageHeight] = useState(500);

  const calculatePages = useCallback(() => {
    if (!contentRef.current || !containerRef.current) return;
    const containerH = containerRef.current.clientHeight || 500;
    setPageHeight(containerH);
    const scrollH = contentRef.current.scrollHeight;
    const pages = Math.max(1, Math.ceil(scrollH / containerH));
    setTotalPages(pages);
    if (currentPage > pages) setCurrentPage(pages);
  }, [currentPage]);

  useEffect(() => {
    calculatePages();
    const observer = new ResizeObserver(calculatePages);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calculatePages, htmlContent]);

  useEffect(() => {
    setCurrentPage(1);
  }, [htmlContent]);

  useEffect(() => {
    onPageInfo?.(currentPage, totalPages, setCurrentPage);
  }, [currentPage, totalPages, onPageInfo]);

  const scrollOffset = (currentPage - 1) * pageHeight;

  return (
    <div className="relative flex items-center gap-2">
      {/* Left arrow */}
      {totalPages > 1 && (
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground shadow-md"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          ref={containerRef}
          className="overflow-hidden relative"
          style={{ height: "calc(100vh - 140px)", minHeight: 400 }}
        >
          <div
            ref={contentRef}
            className={className}
            style={{
              transform: `translateY(-${scrollOffset}px)`,
              transition: "transform 0.3s ease",
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

      {/* Right arrow */}
      {totalPages > 1 && (
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground shadow-md"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
