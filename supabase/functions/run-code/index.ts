import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DataSource {
  type: "yahoo_finance" | "github" | "url";
  query: string; // ticker symbol, repo path, or URL
}

async function fetchYahooFinance(ticker: string): Promise<string> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo Finance: Could not fetch data for "${ticker}"`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance: No data found for "${ticker}"`);

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const rows = timestamps.map((ts: number, i: number) => ({
    date: new Date(ts * 1000).toISOString().split("T")[0],
    open: quote.open?.[i] ?? null,
    high: quote.high?.[i] ?? null,
    low: quote.low?.[i] ?? null,
    close: quote.close?.[i] ?? null,
    volume: quote.volume?.[i] ?? null,
  }));

  return JSON.stringify({ ticker: ticker.toUpperCase(), period: "1mo", interval: "1d", data: rows });
}

async function fetchGitHub(path: string): Promise<string> {
  // path format: "owner/repo" or "owner/repo/path/to/file"
  const parts = path.split("/");
  if (parts.length < 2) throw new Error("GitHub: Use format 'owner/repo' or 'owner/repo/path/to/file'");

  const owner = parts[0];
  const repo = parts[1];
  const filePath = parts.slice(2).join("/");

  if (filePath) {
    // Fetch file content
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const res = await fetch(url, { headers: { "User-Agent": "LMS-Playground" } });
    if (!res.ok) throw new Error(`GitHub: Could not fetch "${path}"`);
    const json = await res.json();
    if (json.content) {
      const decoded = atob(json.content.replace(/\n/g, ""));
      return JSON.stringify({ source: "github", path, content: decoded });
    }
    return JSON.stringify({ source: "github", path, data: json });
  } else {
    // Fetch repo info
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await fetch(url, { headers: { "User-Agent": "LMS-Playground" } });
    if (!res.ok) throw new Error(`GitHub: Could not fetch repo "${owner}/${repo}"`);
    const json = await res.json();
    return JSON.stringify({
      source: "github",
      repo: json.full_name,
      description: json.description,
      stars: json.stargazers_count,
      forks: json.forks_count,
      language: json.language,
      topics: json.topics,
    });
  }
}

async function fetchUrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "LMS-Playground" } });
  if (!res.ok) throw new Error(`URL fetch failed: ${res.status}`);
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("json")) {
    const json = await res.json();
    return JSON.stringify(json);
  }
  const text = await res.text();
  // If it looks like CSV, return as-is
  return text;
}

function injectDataIntoCode(language: string, code: string, dataVars: Record<string, string>): string {
  const entries = Object.entries(dataVars);
  if (entries.length === 0) return code;

  let preamble = "";

  switch (language) {
    case "python":
      preamble = "import json\n\n# === Pre-loaded Data Sources ===\n";
      for (const [name, data] of entries) {
        preamble += `${name} = json.loads('''${data}''')\n`;
      }
      preamble += "# === End Data Sources ===\n\n";
      break;
    case "javascript":
    case "typescript":
      preamble = "// === Pre-loaded Data Sources ===\n";
      for (const [name, data] of entries) {
        preamble += `const ${name} = ${data};\n`;
      }
      preamble += "// === End Data Sources ===\n\n";
      break;
    case "ruby":
      preamble = "require 'json'\n\n# === Pre-loaded Data Sources ===\n";
      for (const [name, data] of entries) {
        preamble += `${name} = JSON.parse('${data.replace(/'/g, "\\'")}')\n`;
      }
      preamble += "# === End Data Sources ===\n\n";
      break;
    case "php":
      preamble = "<?php\n// === Pre-loaded Data Sources ===\n";
      for (const [name, data] of entries) {
        preamble += `$${name} = json_decode('${data.replace(/'/g, "\\'")}', true);\n`;
      }
      preamble += "// === End Data Sources ===\n\n";
      // Remove leading <?php from user code if present
      code = code.replace(/^<\?php\s*/, "");
      break;
    default:
      // For languages without easy JSON support, add as comment
      preamble = "/* Pre-loaded data available as JSON strings */\n";
      break;
  }

  return preamble + code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { language, code, dataSources } = await req.json();

    if (!code || !language) {
      return new Response(JSON.stringify({ error: "Language and code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map friendly names to Piston API language identifiers and versions
    const languageMap: Record<string, { language: string; version: string }> = {
      python: { language: "python", version: "3.10.0" },
      javascript: { language: "javascript", version: "18.15.0" },
      typescript: { language: "typescript", version: "5.0.3" },
      java: { language: "java", version: "15.0.2" },
      c: { language: "c", version: "10.2.0" },
      cpp: { language: "c++", version: "10.2.0" },
      csharp: { language: "csharp.net", version: "5.0.201" },
      ruby: { language: "ruby", version: "3.0.1" },
      go: { language: "go", version: "1.16.2" },
      php: { language: "php", version: "8.2.3" },
      rust: { language: "rust", version: "1.68.2" },
      bash: { language: "bash", version: "5.2.0" },
    };

    const langConfig = languageMap[language.toLowerCase()];
    if (!langConfig) {
      return new Response(JSON.stringify({
        error: `Unsupported language: ${language}. Supported: ${Object.keys(languageMap).join(", ")}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch data sources if provided
    const dataVars: Record<string, string> = {};
    if (dataSources && Array.isArray(dataSources)) {
      for (const ds of dataSources as DataSource[]) {
        try {
          const varName = ds.type === "yahoo_finance"
            ? `stock_${ds.query.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`
            : ds.type === "github"
              ? "github_data"
              : "fetched_data";

          let data: string;
          switch (ds.type) {
            case "yahoo_finance":
              data = await fetchYahooFinance(ds.query);
              break;
            case "github":
              data = await fetchGitHub(ds.query);
              break;
            case "url":
              data = await fetchUrl(ds.query);
              break;
            default:
              continue;
          }
          dataVars[varName] = data;
        } catch (err) {
          dataVars[`error_${ds.type}`] = JSON.stringify({
            error: err instanceof Error ? err.message : "Failed to fetch data",
          });
        }
      }
    }

    // Inject fetched data into the code
    const finalCode = injectDataIntoCode(language.toLowerCase(), code, dataVars);

    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ content: finalCode }],
        stdin: "",
        run_timeout: 15000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Piston API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Code execution service unavailable. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();

    const output = result.run?.output || "";
    const stderr = result.run?.stderr || "";
    const exitCode = result.run?.code ?? 0;

    return new Response(JSON.stringify({
      output: output || stderr || "No output",
      stderr,
      exitCode,
      language: langConfig.language,
      loadedSources: Object.keys(dataVars),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Run code error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
