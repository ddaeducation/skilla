import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Play, Loader2, Trash2, Copy, Check, Terminal, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DataSourcesPanel, { type DataSource } from "./DataSourcesPanel";
import ColabImporter from "./ColabImporter";

const LANGUAGES = [
  { value: "python", label: "Python", icon: "🐍", boilerplate: '# Write your Python code here\nprint("Hello, World!")' },
  { value: "javascript", label: "JavaScript", icon: "🟨", boilerplate: '// Write your JavaScript code here\nconsole.log("Hello, World!");' },
  { value: "typescript", label: "TypeScript", icon: "🔷", boilerplate: '// Write your TypeScript code here\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);' },
  { value: "java", label: "Java", icon: "☕", boilerplate: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
  { value: "c", label: "C", icon: "🔵", boilerplate: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { value: "cpp", label: "C++", icon: "🔵", boilerplate: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
  { value: "ruby", label: "Ruby", icon: "💎", boilerplate: '# Write your Ruby code here\nputs "Hello, World!"' },
  { value: "go", label: "Go", icon: "🐹", boilerplate: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}' },
  { value: "php", label: "PHP", icon: "🐘", boilerplate: '<?php\n// Write your PHP code here\necho "Hello, World!\\n";\n?>' },
  { value: "rust", label: "Rust", icon: "🦀", boilerplate: 'fn main() {\n    println!("Hello, World!");\n}' },
  { value: "bash", label: "Bash", icon: "🖥️", boilerplate: '#!/bin/bash\n# Write your Bash script here\necho "Hello, World!"' },
];

const CodePlayground = () => {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(LANGUAGES[0].boilerplate);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const selectedLang = LANGUAGES.find((l) => l.value === language)!;

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    const lang = LANGUAGES.find((l) => l.value === val)!;
    setCode(lang.boilerplate);
    setOutput("");
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast({ title: "Empty code", description: "Please write some code to run.", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    setOutput("Running...");

    try {
      const { data, error } = await supabase.functions.invoke("run-code", {
        body: { language, code, dataSources: dataSources.length > 0 ? dataSources : undefined },
      });

      if (error) {
        setOutput(`Error: ${error.message}`);
        return;
      }

      if (data.error) {
        setOutput(`Error: ${data.error}`);
        return;
      }

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

  const handleColabImport = (importedCode: string) => {
    setLanguage("python");
    setCode(importedCode);
    setOutput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab key inserts spaces instead of moving focus
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = code.substring(0, start) + "    " + code.substring(end);
      setCode(newValue);
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
    // Ctrl/Cmd + Enter runs code
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  // Calculate line numbers
  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span>{lang.icon}</span>
                    <span>{lang.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ColabImporter onImport={handleColabImport} />
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

      {/* Data Sources Panel */}
      <DataSourcesPanel dataSources={dataSources} onChange={setDataSources} language={language} />

      {/* Editor + Output split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Editor */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
            <Code2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {selectedLang.icon} {selectedLang.label} Editor
            </span>
          </div>
          <div className="relative flex">
            {/* Line numbers */}
            <div className="select-none bg-muted/30 text-muted-foreground text-right py-3 px-2 font-mono text-sm leading-6 border-r min-w-[3rem]">
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>
            {/* Code textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 resize-none bg-background p-3 font-mono text-sm leading-6 outline-none min-h-[350px] w-full"
              placeholder="Write your code here..."
            />
          </div>
          <div className="px-4 py-1.5 bg-muted/30 border-t text-xs text-muted-foreground">
            Press Ctrl+Enter to run • Tab inserts spaces
          </div>
        </Card>

        {/* Output Panel */}
        <Card className="overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Output</span>
          </div>
          <div className="flex-1 min-h-[350px] bg-card p-4 border-0">
            <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words">
              {output || <span className="text-muted-foreground italic">Run your code to see output here...</span>}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CodePlayground;
