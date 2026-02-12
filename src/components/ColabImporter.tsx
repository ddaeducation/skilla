import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Loader2, BookOpen, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CodeCell {
  index: number;
  source: string;
  hasMarkdownBefore?: string;
}

interface ColabImporterProps {
  onImport: (code: string) => void;
}

const ColabImporter = ({ onImport }: ColabImporterProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [cells, setCells] = useState<CodeCell[]>([]);
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"url" | "select">("url");
  const { toast } = useToast();

  const handleFetch = async () => {
    if (!url.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-colab-notebook", {
        body: { url: url.trim() },
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      setCells(data.cells);
      setSelectedCells(new Set(data.cells.map((_: CodeCell, i: number) => i)));
      setStep("select");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to fetch notebook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCell = (index: number) => {
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCells(new Set(cells.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedCells(new Set());
  };

  const handleImport = () => {
    const selected = cells
      .filter((_, i) => selectedCells.has(i))
      .map((cell) => cell.source)
      .join("\n\n");

    if (!selected.trim()) {
      toast({ title: "No cells selected", description: "Please select at least one code cell.", variant: "destructive" });
      return;
    }

    onImport(selected);
    toast({ title: "Imported!", description: `${selectedCells.size} code cell(s) loaded into the editor.` });

    // Reset state
    setOpen(false);
    setStep("url");
    setCells([]);
    setSelectedCells(new Set());
    setUrl("");
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep("url");
      setCells([]);
      setSelectedCells(new Set());
    }
  };

  const truncate = (text: string, maxLen: number) =>
    text.length > maxLen ? text.slice(0, maxLen) + "…" : text;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <BookOpen className="w-3.5 h-3.5" />
          Import Colab
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Import from Google Colab
          </DialogTitle>
          <DialogDescription>
            Paste a Colab notebook URL to extract and import code cells into the editor.
          </DialogDescription>
        </DialogHeader>

        {step === "url" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://colab.research.google.com/drive/... or GitHub .ipynb URL"
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              />
              <p className="text-xs text-muted-foreground">
                Supports Colab links, GitHub .ipynb URLs, and Gist notebooks.
                Drive notebooks must be shared publicly.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleFetch} disabled={!url.trim() || loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {loading ? "Fetching..." : "Fetch Notebook"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <strong>{cells.length}</strong> code cell{cells.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                  Select all
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={deselectAll}>
                  Deselect all
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[350px] pr-3">
              <div className="space-y-2">
                {cells.map((cell, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedCells.has(i)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    onClick={() => toggleCell(i)}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedCells.has(i)}
                        onCheckedChange={() => toggleCell(i)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Code2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Badge variant="outline" className="text-[10px] h-5">
                            Cell {i + 1}
                          </Badge>
                          {cell.hasMarkdownBefore && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              {truncate(cell.hasMarkdownBefore.replace(/[#*_\n]/g, " ").trim(), 60)}
                            </span>
                          )}
                        </div>
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words line-clamp-4">
                          {truncate(cell.source, 300)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setStep("url")}>
                ← Back
              </Button>
              <Button onClick={handleImport} disabled={selectedCells.size === 0} className="gap-2">
                <FileDown className="w-4 h-4" />
                Import {selectedCells.size} Cell{selectedCells.size !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ColabImporter;
