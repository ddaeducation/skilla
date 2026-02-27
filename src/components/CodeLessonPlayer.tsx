import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Play, Loader2, Trash2, Copy, Check, Terminal, Code2, Sparkles, Send,
  Plus, X, Database, Table2, ChevronDown, ChevronRight, GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DataSourcesPanel, { type DataSource } from "./DataSourcesPanel";
import ColabImporter from "./ColabImporter";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

interface CodeLessonPlayerProps {
  language: "python" | "sql";
  initialCode?: string;
  lessonTitle?: string;
}

interface CodeCell {
  id: string;
  code: string;
  output: string;
  isRunning: boolean;
  variableName: string;
  dataType: "DataFrame" | "Series" | "Variable" | "Table";
  showDataSource: boolean;
  dataSource?: DataSource;
  executionCount: number | null;
}

let cellCounter = 0;
const createCell = (language: string, code?: string): CodeCell => ({
  id: `cell-${++cellCounter}-${Date.now()}`,
  code: code ?? "",
  output: "",
  isRunning: false,
  variableName: `df${cellCounter > 1 ? cellCounter : ""}`,
  dataType: language === "sql" ? "DataFrame" : "Variable",
  showDataSource: false,
  executionCount: null,
});

const CodeLessonPlayer = ({ language, initialCode, lessonTitle }: CodeLessonPlayerProps) => {
  const [cells, setCells] = useState<CodeCell[]>([
    createCell(language, initialCode),
  ]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const langLabel = language === "python" ? "🐍 Python" : "🗄️ SQL";

  const updateCell = (id: string, updates: Partial<CodeCell>) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addCell = () => {
    setCells(prev => [...prev, createCell(language)]);
  };

  const removeCell = (id: string) => {
    if (cells.length <= 1) {
      toast({ title: "Cannot remove", description: "At least one code cell is required.", variant: "destructive" });
      return;
    }
    setCells(prev => prev.filter(c => c.id !== id));
  };

  const handleRunCell = async (id: string) => {
    const cell = cells.find(c => c.id === id);
    if (!cell || !cell.code.trim()) {
      toast({ title: "Empty code", description: "Please write some code to run.", variant: "destructive" });
      return;
    }
    updateCell(id, { isRunning: true, output: "Running..." });
    try {
      const { data, error } = await supabase.functions.invoke("run-code", {
        body: {
          language,
          code: cell.code,
          dataSources: dataSources.length > 0 ? dataSources : undefined,
        },
      });
      if (error) { updateCell(id, { output: `Error: ${error.message}`, isRunning: false }); return; }
      if (data.error) { updateCell(id, { output: `Error: ${data.error}`, isRunning: false }); return; }
      updateCell(id, {
        output: data.output || "No output",
        isRunning: false,
        executionCount: (cell.executionCount || 0) + 1,
      });
    } catch (err) {
      updateCell(id, {
        output: `Error: ${err instanceof Error ? err.message : "Failed to run code"}`,
        isRunning: false,
      });
    }
  };

  const handleRunAll = async () => {
    for (const cell of cells) {
      await handleRunCell(cell.id);
    }
  };

  const handleCopy = async (id: string, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleColabImport = (importedCode: string) => {
    const cellBlocks = importedCode
      .split(/\n(?=# %%|# In\[)/)
      .filter(block => block.trim());

    if (cellBlocks.length > 1) {
      setCells(cellBlocks.map(block => createCell("python", block.trim())));
    } else {
      setCells([createCell("python", importedCode)]);
    }
  };

  const handleAiHelp = useCallback(async () => {
    const allCode = cells.map(c => c.code).join("\n\n");
    if (!aiPrompt.trim() && !allCode.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const allOutputs = cells.filter(c => c.output).map(c => c.output).join("\n---\n");
      const prompt = aiPrompt.trim()
        ? `The student is writing ${language} code and asks: "${aiPrompt}"\n\nTheir current code:\n\`\`\`${language}\n${allCode}\n\`\`\`\n\n${allOutputs ? `Current output:\n${allOutputs}` : ""}`
        : `Review and suggest improvements for this ${language} code:\n\`\`\`${language}\n${allCode}\n\`\`\`\n\n${allOutputs ? `Current output:\n${allOutputs}` : ""}`;

      const { data, error } = await supabase.functions.invoke("code-ai-assist", {
        body: { prompt, language },
      });
      if (error) throw error;
      setAiResponse(data.response || "No response from AI.");
    } catch (err) {
      setAiResponse(`Error: ${err instanceof Error ? err.message : "Failed to get AI help"}`);
    } finally {
      setAiLoading(false);
      setAiPrompt("");
    }
  }, [aiPrompt, cells, language]);

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm gap-1.5 py-1 px-3">
            <Code2 className="w-3.5 h-3.5" />
            {langLabel} Notebook
          </Badge>
          {lessonTitle && (
            <span className="text-sm text-muted-foreground hidden sm:inline">{lessonTitle}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ColabImporter onImport={handleColabImport} />
          <Button variant="outline" size="sm" onClick={handleRunAll} className="gap-1.5">
            <Play className="w-3.5 h-3.5" />
            Run All
          </Button>
          <Button
            variant={showAi ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAi(!showAi)}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </Button>
        </div>
      </div>

      {/* Data Sources */}
      <DataSourcesPanel dataSources={dataSources} onChange={setDataSources} language={language} />

      {/* AI Assistant Panel */}
      {showAi && (
        <Card className="p-4 space-y-3 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI Code Assistant</span>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask AI to help, fix, or explain your code..."
              className="min-h-[60px] text-sm"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleAiHelp();
                }
              }}
            />
            <Button onClick={handleAiHelp} disabled={aiLoading} size="sm" className="self-end">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {aiResponse && (
            <div className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap border max-h-[300px] overflow-y-auto">
              {aiResponse}
            </div>
          )}
        </Card>
      )}

      {/* Code Cells */}
      <div className="space-y-3">
        {cells.map((cell, index) => (
          <CellBlock
            key={cell.id}
            cell={cell}
            index={index}
            language={language}
            onUpdate={(updates) => updateCell(cell.id, updates)}
            onRun={() => handleRunCell(cell.id)}
            onRemove={() => removeCell(cell.id)}
            onCopy={() => handleCopy(cell.id, cell.code)}
            isCopied={copied === cell.id}
          />
        ))}
      </div>

      {/* Add Cell Button */}
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={addCell} className="gap-2 text-muted-foreground">
          <Plus className="w-4 h-4" />
          Add Code Cell
        </Button>
      </div>
    </div>
  );
};

// ─── Syntax Highlighting Helper ─────────────────────────────────

function hastToHtml(node: any): string {
  if (node.type === "text") return escapeHtml(node.value);
  if (node.type === "element") {
    const cls = node.properties?.className?.join(" ") || "";
    const children = (node.children || []).map(hastToHtml).join("");
    return cls ? `<span class="${cls}">${children}</span>` : `<span>${children}</span>`;
  }
  if (node.children) return node.children.map(hastToHtml).join("");
  return "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightCode(code: string, language: string): string {
  try {
    const lang = language === "python" ? "python" : "sql";
    const tree = lowlight.highlight(lang, code);
    return tree.children.map(hastToHtml).join("");
  } catch {
    return escapeHtml(code);
  }
}

// ─── Individual Cell Component ───────────────────────────────────

interface CellBlockProps {
  cell: CodeCell;
  index: number;
  language: string;
  onUpdate: (updates: Partial<CodeCell>) => void;
  onRun: () => void;
  onRemove: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

const CellBlock = ({ cell, index, language, onUpdate, onRun, onRemove, onCopy, isCopied }: CellBlockProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showOutput, setShowOutput] = useState(true);

  const highlighted = useMemo(() => highlightCode(cell.code, language), [cell.code, language]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = cell.code.substring(0, start) + "    " + cell.code.substring(end);
      onUpdate({ code: newValue });
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  };

  const lineCount = Math.max(cell.code.split("\n").length, 1);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <Card className="overflow-hidden border group">
      {/* Cell Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-mono">
            [{cell.executionCount !== null ? cell.executionCount : " "}]
          </span>
        </div>

        {language === "sql" && (
          <>
            <div className="flex items-center gap-1.5 bg-background rounded-md border px-2 py-1">
              <Database className="w-3 h-3 text-primary" />
              <span className="font-medium text-foreground">SQLite</span>
            </div>
            <span className="text-muted-foreground">|</span>
          </>
        )}

        <div className="flex items-center gap-1.5 bg-background rounded-md border px-2 py-1">
          <Table2 className="w-3 h-3 text-primary" />
          <Select
            value={cell.dataType}
            onValueChange={(v) => onUpdate({ dataType: v as CodeCell["dataType"] })}
          >
            <SelectTrigger className="h-auto p-0 border-0 shadow-none text-xs font-medium min-w-[80px] bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DataFrame">DataFrame</SelectItem>
              <SelectItem value="Series">Series</SelectItem>
              <SelectItem value="Variable">Variable</SelectItem>
              <SelectItem value="Table">Table</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-muted-foreground">→</span>
        <Input
          value={cell.variableName}
          onChange={(e) => onUpdate({ variableName: e.target.value })}
          className="h-6 w-16 text-xs font-mono border bg-background px-1.5 py-0"
        />

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={onCopy}>
            {isCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {/* Code Editor with Syntax Highlighting */}
      <div className="relative flex code-cell-editor">
        {/* Line Numbers */}
        <div className="select-none bg-muted/20 text-muted-foreground text-right py-3 px-2 font-mono text-[13px] leading-[1.7] border-r min-w-[2.5rem]">
          {lineNumbers.map((num) => (
            <div key={num}>{num}</div>
          ))}
        </div>

        {/* Highlighted code overlay + transparent textarea */}
        <div className="relative flex-1 min-h-[80px]">
          {/* Syntax highlighted layer (visual only) */}
          <pre
            className="absolute inset-0 p-3 font-mono text-[13px] leading-[1.7] pointer-events-none overflow-hidden whitespace-pre-wrap break-words m-0 code-highlight-layer"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: highlighted + (cell.code.endsWith("\n") ? "\n" : "") }}
          />
          {/* Transparent textarea for editing */}
          <textarea
            ref={textareaRef}
            value={cell.code}
            onChange={(e) => onUpdate({ code: e.target.value })}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="relative w-full h-full resize-none bg-transparent p-3 font-mono text-[13px] leading-[1.7] outline-none min-h-[80px] text-transparent caret-foreground z-10"
            placeholder={language === "python" ? "# Write your Python code here..." : "-- Write your SQL query here..."}
          />
        </div>
      </div>

      {/* Cell Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {cell.isRunning && (
            <span className="flex items-center gap-1 text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running...
            </span>
          )}
          {!cell.isRunning && cell.output && (
            <button
              onClick={() => setShowOutput(!showOutput)}
              className="flex items-center gap-1 hover:text-foreground"
            >
              {showOutput ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Output
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 px-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <span className="text-muted-foreground/30">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRun}
            disabled={cell.isRunning}
            className="h-7 gap-1.5 text-xs font-medium"
          >
            {cell.isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs font-medium text-primary"
            onClick={() => {/* AI handled at parent level */}}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI
          </Button>
        </div>
      </div>

      {/* Output Area */}
      {cell.output && showOutput && (
        <div className="border-t bg-muted/10 p-3">
          <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
            {cell.output}
          </pre>
        </div>
      )}
    </Card>
  );
};

export default CodeLessonPlayer;
