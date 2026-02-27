import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DataSource {
  type: "yahoo_finance" | "github" | "url";
  query: string;
}

async function fetchYahooFinance(ticker: string): Promise<string> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
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
  const parts = path.split("/");
  if (parts.length < 2) throw new Error("GitHub: Use format 'owner/repo' or 'owner/repo/path/to/file'");
  const owner = parts[0];
  const repo = parts[1];
  const filePath = parts.slice(2).join("/");
  if (filePath) {
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
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await fetch(url, { headers: { "User-Agent": "LMS-Playground" } });
    if (!res.ok) throw new Error(`GitHub: Could not fetch repo "${owner}/${repo}"`);
    const json = await res.json();
    return JSON.stringify({
      source: "github", repo: json.full_name, description: json.description,
      stars: json.stargazers_count, forks: json.forks_count, language: json.language, topics: json.topics,
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
  return await res.text();
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
    default:
      break;
  }
  return preamble + code;
}

// Judge0 language IDs
const JUDGE0_LANG_MAP: Record<string, number> = {
  python: 71,       // Python 3
  javascript: 63,   // JavaScript (Node.js)
  typescript: 74,   // TypeScript
  java: 62,
  c: 50,
  cpp: 54,
  csharp: 51,
  ruby: 72,
  go: 60,
  php: 68,
  rust: 73,
  bash: 46,
  sql: 82,          // SQL (SQLite)
};

async function executeWithJudge0(languageId: number, sourceCode: string): Promise<{ output: string; stderr: string; exitCode: number }> {
  // Submit the code
  const submitRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=true&wait=true&fields=stdout,stderr,status,compile_output,exit_code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language_id: languageId,
      source_code: btoa(unescape(encodeURIComponent(sourceCode))),
      cpu_time_limit: 10,
      memory_limit: 128000,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    console.error("Judge0 error:", submitRes.status, errText);
    throw new Error("Code execution service unavailable. Please try again.");
  }

  const result = await submitRes.json();

  const decode = (b64: string | null) => {
    if (!b64) return "";
    try { return decodeURIComponent(escape(atob(b64))); } catch { return atob(b64); }
  };

  const stdout = decode(result.stdout);
  const stderr = decode(result.stderr);
  const compileOutput = decode(result.compile_output);
  const exitCode = result.exit_code ?? 0;

  // If compilation error
  if (result.status?.id === 6) {
    return { output: "", stderr: compileOutput || "Compilation error", exitCode: 1 };
  }
  // Runtime error
  if (result.status?.id >= 7 && result.status?.id <= 12) {
    return { output: stdout, stderr: stderr || result.status?.description || "Runtime error", exitCode: exitCode || 1 };
  }

  return { output: stdout, stderr, exitCode };
}

// For SQL: wrap the query so SQLite outputs results nicely
function wrapSqlForExecution(code: string, dataVars: Record<string, string>): string {
  let preamble = ".headers on\n.mode column\n";

  // Create tables from imported data
  for (const [name, data] of Object.entries(dataVars)) {
    try {
      const parsed = JSON.parse(data);
      // If it's array data (like stock data), create a table
      if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
        const cols = Object.keys(parsed.data[0]);
        const colDefs = cols.map(c => `${c} TEXT`).join(", ");
        preamble += `CREATE TABLE IF NOT EXISTS ${name} (${colDefs});\n`;
        for (const row of parsed.data) {
          const vals = cols.map(c => `'${String(row[c] ?? '').replace(/'/g, "''")}'`).join(", ");
          preamble += `INSERT INTO ${name} VALUES (${vals});\n`;
        }
      } else if (Array.isArray(parsed)) {
        // Direct array of objects
        if (parsed.length > 0) {
          const cols = Object.keys(parsed[0]);
          const colDefs = cols.map(c => `${c} TEXT`).join(", ");
          preamble += `CREATE TABLE IF NOT EXISTS ${name} (${colDefs});\n`;
          for (const row of parsed) {
            const vals = cols.map(c => `'${String(row[c] ?? '').replace(/'/g, "''")}'`).join(", ");
            preamble += `INSERT INTO ${name} VALUES (${vals});\n`;
          }
        }
      }
    } catch {
      // Not JSON, skip
    }
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

    const langKey = language.toLowerCase();
    const languageId = JUDGE0_LANG_MAP[langKey];
    if (!languageId) {
      return new Response(JSON.stringify({
        error: `Unsupported language: ${language}. Supported: ${Object.keys(JUDGE0_LANG_MAP).join(", ")}`,
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
            : ds.type === "github" ? "github_data" : "fetched_data";

          let data: string;
          switch (ds.type) {
            case "yahoo_finance": data = await fetchYahooFinance(ds.query); break;
            case "github": data = await fetchGitHub(ds.query); break;
            case "url": data = await fetchUrl(ds.query); break;
            default: continue;
          }
          dataVars[varName] = data;
        } catch (err) {
          dataVars[`error_${ds.type}`] = JSON.stringify({
            error: err instanceof Error ? err.message : "Failed to fetch data",
          });
        }
      }
    }

    // Build final code
    let finalCode: string;
    if (langKey === "sql") {
      finalCode = wrapSqlForExecution(code, dataVars);
    } else {
      finalCode = injectDataIntoCode(langKey, code, dataVars);
    }

    const { output, stderr, exitCode } = await executeWithJudge0(languageId, finalCode);

    return new Response(JSON.stringify({
      output: output || stderr || "No output",
      stderr,
      exitCode,
      language: langKey,
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
