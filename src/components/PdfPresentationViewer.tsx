import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Minimize2,
  X,
  Presentation,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Download,
  Menu,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfPresentationViewerProps {
  url: string;
  title?: string;
}

export default function PdfPresentationViewer({ url, title }: PdfPresentationViewerProps) {
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPresenting, setIsPresenting] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [scale, setScale] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasAreaRef = useRef<HTMLDivElement>(null);
  const thumbnailCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const renderTaskRef = useRef<any>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    pdfjsLib.getDocument(url).promise.then((doc) => {
      if (!cancelled) {
        setPdf(doc);
        setTotalPages(doc.numPages);
      }
    });
    return () => { cancelled = true; };
  }, [url]);

  // Render current page
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || !canvasRef.current) return;
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
    }
    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = mainCanvasAreaRef.current || containerRef.current;
    const containerW = container?.clientWidth || 960;
    const containerH = container?.clientHeight || 540;
    const viewport = page.getViewport({ scale: 1 });
    const fitScale = Math.min(containerW / viewport.width, containerH / viewport.height) * 0.92 * scale;
    const scaledViewport = page.getViewport({ scale: fitScale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    const task = page.render({ canvasContext: ctx, viewport: scaledViewport });
    renderTaskRef.current = task;
    try { await task.promise; } catch {}
  }, [pdf, scale]);

  useEffect(() => { renderPage(currentPage); }, [currentPage, renderPage, isPresenting, sidebarOpen]);

  useEffect(() => {
    const onResize = () => renderPage(currentPage);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [currentPage, renderPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || (isPresenting && e.key === " ")) {
        e.preventDefault();
        setCurrentPage((p) => Math.min(p + 1, totalPages));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(p - 1, 1));
      } else if (e.key === "Escape" && isPresenting) {
        e.preventDefault();
        exitPresentation();
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentPage(totalPages);
      } else if (e.key === "g" || e.key === "G") {
        setShowGrid((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isPresenting, totalPages]);

  // Auto-hide controls in presentation
  useEffect(() => {
    if (!isPresenting) return;
    const handleMove = () => {
      setControlsVisible(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    };
    handleMove();
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      clearTimeout(hideTimerRef.current);
    };
  }, [isPresenting]);

  // Scroll active thumbnail into view
  useEffect(() => {
    activeThumbnailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentPage]);

  const enterPresentation = async () => {
    setIsPresenting(true);
    setShowGrid(false);
    try { await document.documentElement.requestFullscreen(); } catch {}
  };

  const exitPresentation = () => {
    setIsPresenting(false);
    setScale(1);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && isPresenting) {
        setIsPresenting(false);
        setScale(1);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [isPresenting]);

  // Render thumbnail
  const renderThumbnail = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdf) return;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.25 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport }).promise;
  }, [pdf]);

  const zoomPercent = Math.round(scale * 100);

  // Grid overlay
  const GridView = () => {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (
      <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">All Slides ({totalPages})</h3>
          <Button variant="ghost" size="icon" onClick={() => setShowGrid(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pages.map((num) => (
            <button
              key={num}
              onClick={() => { setCurrentPage(num); setShowGrid(false); }}
              className={cn(
                "group relative rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg",
                currentPage === num ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
              )}
            >
              <canvas
                ref={(el) => { if (el && pdf) renderThumbnail(num, el); }}
                className="w-full h-auto"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="text-white text-xs font-medium">{num}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Thumbnail sidebar (shared between inline & presenting)
  const ThumbnailSidebar = ({ dark = false }: { dark?: boolean }) => (
    <ScrollArea className={cn(
      "flex-shrink-0 border-r",
      dark ? "bg-neutral-900 border-neutral-700 w-[180px]" : "bg-muted/40 border-border w-[160px] lg:w-[180px]"
    )}>
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            ref={num === currentPage ? activeThumbnailRef : undefined}
            onClick={() => setCurrentPage(num)}
            className={cn(
              "relative rounded-md overflow-hidden border-2 transition-all hover:shadow-md group",
              currentPage === num
                ? (dark ? "border-blue-500 ring-2 ring-blue-500/40" : "border-primary ring-2 ring-primary/30")
                : (dark ? "border-neutral-700 hover:border-neutral-500" : "border-transparent hover:border-muted-foreground/30")
            )}
          >
            <canvas
              ref={(el) => { if (el && pdf) renderThumbnail(num, el); }}
              className="w-full h-auto"
            />
            <span className={cn(
              "absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium px-1.5 py-0.5 rounded",
              dark ? "bg-black/60 text-white/80" : "bg-background/80 text-muted-foreground"
            )}>
              {num}
            </span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );

  if (!pdf) {
    return (
      <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading PDF...</div>
      </div>
    );
  }

  // ─── Inline (non-presentation) mode ───
  if (!isPresenting) {
    return (
      <div className="border rounded-lg overflow-hidden bg-background shadow-sm" style={{ height: 600 }}>
        {/* Top toolbar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/60 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen((v) => !v)} title="Toggle sidebar">
              <Menu className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground truncate max-w-[240px]">{title || "PDF Document"}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium bg-muted rounded px-2 py-1 min-w-[48px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))} title="Zoom out">
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center font-medium">{zoomPercent}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.min(s + 0.15, 3))} title="Zoom in">
              <Plus className="w-4 h-4" />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowGrid((v) => !v)} title="Grid overview">
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={enterPresentation} title="Present">
              <Presentation className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Download">
              <a href={url} download target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Body: sidebar + canvas */}
        <div ref={containerRef} className="flex relative" style={{ height: "calc(100% - 44px)" }}>
          {showGrid && <GridView />}

          {sidebarOpen && <ThumbnailSidebar />}

          <div ref={mainCanvasAreaRef} className="flex-1 flex items-center justify-center overflow-auto bg-muted/20">
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Fullscreen presentation mode ───
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex select-none"
      style={{ cursor: controlsVisible ? "default" : "none" }}
    >
      {showGrid ? (
        <GridView />
      ) : (
        <>
          {controlsVisible && <ThumbnailSidebar dark />}
          <div ref={mainCanvasAreaRef} className="flex-1 flex items-center justify-center">
            <canvas ref={canvasRef} className="max-w-full max-h-full" />
          </div>
        </>
      )}

      {/* Top bar */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <span className="text-white/80 text-sm font-medium truncate max-w-[60%]">{title || "PDF Presentation"}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs">{currentPage} / {totalPages}</span>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setShowGrid((v) => !v)}>
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={exitPresentation}>
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Side navigation arrows */}
      <button
        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        disabled={currentPage === 1}
        className={cn(
          "absolute left-[180px] top-0 bottom-0 w-16 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-opacity duration-300 disabled:opacity-0",
          controlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        disabled={currentPage === totalPages}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-opacity duration-300 disabled:opacity-0",
          controlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Bottom progress */}
      <div className={cn(
        "absolute bottom-0 inset-x-0 h-1 bg-white/10 transition-opacity duration-300",
        controlsVisible ? "opacity-100" : "opacity-0"
      )}>
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(currentPage / totalPages) * 100}%` }} />
      </div>
    </div>
  );
}
