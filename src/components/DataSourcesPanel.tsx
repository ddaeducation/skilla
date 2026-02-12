import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, X, Database, TrendingUp, Github, Globe } from "lucide-react";

export interface DataSource {
  type: "yahoo_finance" | "github" | "url";
  query: string;
}

const SOURCE_CONFIG = {
  yahoo_finance: {
    label: "Yahoo Finance",
    icon: TrendingUp,
    placeholder: "e.g. AAPL, MSFT, GOOGL",
    hint: "Enter a stock ticker symbol. Data is injected as stock_<ticker> variable.",
    color: "bg-purple-500/10 text-purple-700 border-purple-200",
  },
  github: {
    label: "GitHub",
    icon: Github,
    placeholder: "e.g. facebook/react or owner/repo/path/to/file.json",
    hint: "Enter owner/repo for info, or owner/repo/path for file content. Injected as github_data.",
    color: "bg-gray-500/10 text-gray-700 border-gray-200",
  },
  url: {
    label: "URL (JSON/CSV)",
    icon: Globe,
    placeholder: "https://api.example.com/data.json",
    hint: "Fetch any public JSON or CSV URL. Injected as fetched_data.",
    color: "bg-blue-500/10 text-blue-700 border-blue-200",
  },
};

interface DataSourcesPanelProps {
  dataSources: DataSource[];
  onChange: (sources: DataSource[]) => void;
  language: string;
}

const DataSourcesPanel = ({ dataSources, onChange, language }: DataSourcesPanelProps) => {
  const [newType, setNewType] = useState<DataSource["type"]>("yahoo_finance");
  const [newQuery, setNewQuery] = useState("");

  const addSource = () => {
    if (!newQuery.trim()) return;
    onChange([...dataSources, { type: newType, query: newQuery.trim() }]);
    setNewQuery("");
  };

  const removeSource = (index: number) => {
    onChange(dataSources.filter((_, i) => i !== index));
  };

  const config = SOURCE_CONFIG[newType];
  const supportedLanguages = ["python", "javascript", "typescript", "ruby", "php"];
  const isSupported = supportedLanguages.includes(language);

  const getVarName = (ds: DataSource) => {
    if (ds.type === "yahoo_finance") return `stock_${ds.query.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;
    if (ds.type === "github") return "github_data";
    return "fetched_data";
  };

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Data Sources</span>
        {!isSupported && (
          <Badge variant="outline" className="text-xs ml-auto">
            Supported: Python, JS, TS, Ruby, PHP
          </Badge>
        )}
      </div>

      {/* Active sources */}
      {dataSources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dataSources.map((ds, i) => {
            const cfg = SOURCE_CONFIG[ds.type];
            const Icon = cfg.icon;
            return (
              <Badge key={i} variant="outline" className={`gap-1.5 pr-1 ${cfg.color}`}>
                <Icon className="w-3 h-3" />
                <span className="max-w-[150px] truncate">{ds.query}</span>
                <span className="text-[10px] opacity-60">→ {getVarName(ds)}</span>
                <button onClick={() => removeSource(i)} className="ml-1 hover:bg-background/50 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Add new source */}
      {isSupported && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={newType} onValueChange={(v) => setNewType(v as DataSource["type"])}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yahoo_finance">
                  <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Yahoo Finance</span>
                </SelectItem>
                <SelectItem value="github">
                  <span className="flex items-center gap-1.5"><Github className="w-3 h-3" /> GitHub</span>
                </SelectItem>
                <SelectItem value="url">
                  <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> URL</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder={config.placeholder}
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => e.key === "Enter" && addSource()}
            />
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={addSource} disabled={!newQuery.trim()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{config.hint}</p>
        </div>
      )}
    </Card>
  );
};

export default DataSourcesPanel;
