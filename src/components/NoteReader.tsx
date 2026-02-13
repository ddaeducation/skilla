import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Pause, Play, Square, Headphones } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BlockMapping {
  element: HTMLElement;
  start: number;
  end: number;
}

const NoteReader = () => {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const blocksRef = useRef<BlockMapping[]>([]);
  const fullTextRef = useRef("");
  const { toast } = useToast();

  useEffect(() => {
    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        const english = available.find(v => v.lang.startsWith("en") && v.localService);
        setSelectedVoice((english || available[0]).name);
      }
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      speechSynthesis.cancel();
      clearHighlights();
    };
  }, []);

  const clearHighlights = useCallback(() => {
    document.querySelectorAll(".note-reader-active").forEach(el =>
      el.classList.remove("note-reader-active")
    );
  }, []);

  const collectBlocks = useCallback((): { text: string; blocks: BlockMapping[] } => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 5) {
      return { text: selection, blocks: [] };
    }

    const mainEl = document.querySelector("main") || document.querySelector("[role='main']") || document.body;
    const skipSelectors = "nav, footer, header, [role='navigation'], [role='banner'], .sidebar, button, script, style, noscript, .note-reader-container, svg, [aria-hidden='true']";

    // Collect all potential text-bearing elements
    const allCandidates = Array.from(
      mainEl.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre, figcaption, dt, dd, label, span, div, section, article, aside")
    ) as HTMLElement[];

    // Filter: skip navigation/UI elements, and only keep leaf-level text nodes
    const filtered = allCandidates.filter(el => {
      if (el.closest(skipSelectors)) return false;
      const text = el.innerText?.trim();
      if (!text || text.length < 2) return false;
      // Keep element only if no child candidate also contains the same full text
      // This prevents double-reading parent + child
      const hasChildCandidate = allCandidates.some(
        other => other !== el && el.contains(other) && other.innerText?.trim() === text
      );
      if (hasChildCandidate) return false;
      // For divs/sections/articles, only include if they have direct text content (not just child elements)
      if (['DIV', 'SECTION', 'ARTICLE', 'ASIDE'].includes(el.tagName)) {
        const hasTextChild = Array.from(el.childNodes).some(
          node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
        );
        const hasNoNestedCandidates = !allCandidates.some(
          other => other !== el && el.contains(other) && other.innerText?.trim()
        );
        if (!hasTextChild && !hasNoNestedCandidates) return false;
      }
      return true;
    });

    // Deduplicate: remove elements whose text is fully contained in a previous sibling/cousin
    const seen = new Set<string>();
    const deduped = filtered.filter(el => {
      const text = el.innerText?.trim();
      if (!text) return false;
      if (seen.has(text)) return false;
      seen.add(text);
      return true;
    });

    const blocks: BlockMapping[] = [];
    let fullText = "";

    deduped.forEach(el => {
      const text = el.innerText?.trim();
      if (!text) return;
      const start = fullText.length;
      fullText += text + " ";
      blocks.push({ element: el, start, end: fullText.length - 1 });
    });

    return { text: fullText.trim(), blocks };
  }, []);

  const startReading = () => {
    const { text, blocks } = collectBlocks();
    if (!text) {
      toast({ title: "Nothing to read", description: "No readable content found on this page.", variant: "destructive" });
      return;
    }

    speechSynthesis.cancel();
    clearHighlights();
    fullTextRef.current = text;
    blocksRef.current = blocks;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
      setProgress(0);
    };

    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
      setProgress(100);
      clearHighlights();
    };

    utterance.onboundary = (event) => {
      const charIndex = event.charIndex;
      if (fullTextRef.current.length > 0) {
        setProgress(Math.min((charIndex / fullTextRef.current.length) * 100, 100));
      }

      // Highlight current block
      if (blocksRef.current.length > 0) {
        clearHighlights();
        const block = blocksRef.current.find(b => charIndex >= b.start && charIndex < b.end);
        if (block) {
          block.element.classList.add("note-reader-active");
          block.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
    toast({ title: "🎧 Reading aloud", description: text.length > 80 ? text.slice(0, 80) + "…" : text });
  };

  const togglePause = () => {
    if (paused) {
      speechSynthesis.resume();
      setPaused(false);
    } else {
      speechSynthesis.pause();
      setPaused(true);
    }
  };

  const stop = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setProgress(0);
    clearHighlights();
  };

  const handleRateChange = (val: number[]) => {
    setRate(val[0]);
    if (speaking) {
      const wasText = fullTextRef.current;
      const wasBlocks = blocksRef.current;
      stop();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(wasText);
        utterance.rate = val[0];
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
        utterance.onstart = () => { setSpeaking(true); setPaused(false); };
        utterance.onend = () => { setSpeaking(false); setPaused(false); setProgress(100); clearHighlights(); };
        utterance.onboundary = (e) => {
          if (wasText.length > 0) setProgress(Math.min((e.charIndex / wasText.length) * 100, 100));
          if (wasBlocks.length > 0) {
            clearHighlights();
            const block = wasBlocks.find(b => e.charIndex >= b.start && e.charIndex < b.end);
            if (block) {
              block.element.classList.add("note-reader-active");
              block.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          }
        };
        fullTextRef.current = wasText;
        blocksRef.current = wasBlocks;
        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  const displayVoices = voices.filter(v => v.lang.startsWith("en") || v.localService).slice(0, 20);

  return (
    <div className="note-reader-container fixed top-20 right-4 z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={speaking ? "default" : "outline"}
            className={`gap-2 rounded-full shadow-lg transition-all ${
              speaking ? "animate-pulse" : ""
            }`}
            aria-label="Note Reader - Text to Speech"
          >
            {speaking ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            <span className="text-xs hidden sm:inline">
              {speaking ? "Reading…" : "Read"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-64 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Note Reader</span>
          </div>

          {speaking && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            {!speaking ? (
              <Button onClick={startReading} size="sm" className="gap-2 flex-1">
                <Play className="w-4 h-4" /> Read Page
              </Button>
            ) : (
              <>
                <Button onClick={togglePause} size="icon" variant="outline" className="h-8 w-8">
                  {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </Button>
                <Button onClick={stop} size="icon" variant="outline" className="h-8 w-8">
                  <Square className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Speed</span>
              <span className="text-xs font-medium">{rate.toFixed(1)}x</span>
            </div>
            <Slider value={[rate]} onValueChange={handleRateChange} min={0.5} max={2} step={0.1} className="w-full" />
          </div>

          {displayVoices.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Voice</span>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {displayVoices.map(v => (
                    <SelectItem key={v.name} value={v.name} className="text-xs">
                      {v.name.length > 28 ? v.name.slice(0, 28) + "…" : v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Select text to read specific content, or click "Read Page" for all visible content.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default NoteReader;
