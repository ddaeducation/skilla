import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Loader2, Trash2, Copy, Check, Terminal, Code2, Sparkles, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface CodeLessonPlayerProps {
  language: "python" | "sql";
  initialCode?: string;
  lessonTitle?: string;
}

const BOILERPLATE: Record<string, string> = {
  python: '# Write your Python code here\nprint("Hello, World!")',
  sql: '-- Write your SQL query here\nSELECT 1 AS result;',
};

const CodeLessonPlayer = ({ language, initialCode, lessonTitle }: CodeLessonPlayerProps) => {
  const [code, setCode] = useState(initialCode || BOILERPLATE[language] || "");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const langLabel = language === "python" ? "🐍 Python" : "🗄️ SQL";

  const handleRun = async () => {
    if (!code.trim()) {
      toast({ title: "Empty code", description: "Please write some code to run.", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    setOutput("Running...");
    try {
      const { data, error } = await supabase.functions.invoke("run-code", {
        body: { language, code },
      });
      if (error) { setOutput(`Error: ${error.message}`); return; }
      if (data.error) { setOutput(`Error: ${data.error}`); return; }
      setOutput(data.output || "No output");
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : "Failed to run code"}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setCode("");
    setOutput("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = code.substring(0, start) + "    " + code.substring(end);
      setCode(newValue);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  const handleAiHelp = useCallback(async () => {
    if (!aiPrompt.trim() && !code.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const prompt = aiPrompt.trim()
        ? `The student is writing ${language} code and asks: "${aiPrompt}"\n\nTheir current code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n${output ? `Current output:\n${output}` : ""}`
        : `Review and suggest improvements for this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n${output ? `Current output:\n${output}` : ""}`;

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
  }, [aiPrompt, code, output, language]);

  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{langLabel} Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showAi ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAi(!showAi)}
            className="gap-1"
          >
            <Sparkles className="w-4 h-4" />
            AI Help
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button onClick={handleRun} disabled={isRunning} size="sm" className="gap-2">
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Running..." : "Run"}
          </Button>
        </div>
      </div>

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
            <Button
              onClick={handleAiHelp}
              disabled={aiLoading}
              size="sm"
              className="self-end"
            >
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

      {/* Editor + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
            <Code2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{langLabel}</span>
          </div>
          <div className="relative flex">
            <div className="select-none bg-muted/30 text-muted-foreground text-right py-3 px-2 font-mono text-sm leading-6 border-r min-w-[3rem]">
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 resize-none bg-background p-3 font-mono text-sm leading-6 outline-none min-h-[300px] w-full"
              placeholder={`Write your ${language} code here...`}
            />
          </div>
          <div className="px-4 py-1.5 bg-muted/30 border-t text-xs text-muted-foreground">
            Press Ctrl+Enter to run • Tab inserts spaces
          </div>
        </Card>

        <Card className="overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Output</span>
          </div>
          <div className="flex-1 min-h-[300px] bg-card p-4">
            <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words">
              {output || <span className="text-muted-foreground italic">Run your code to see output here...</span>}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CodeLessonPlayer;
