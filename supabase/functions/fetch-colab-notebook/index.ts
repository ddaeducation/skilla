import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotebookCell {
  cell_type: string;
  source: string[];
  metadata?: Record<string, unknown>;
}

interface NotebookJson {
  cells?: NotebookCell[];
  nbformat?: number;
}

function parseColabUrl(url: string): { type: "github" | "drive" | "gist"; rawUrl: string } | null {
  const trimmed = url.trim();

  // GitHub-hosted: https://colab.research.google.com/github/{owner}/{repo}/blob/{branch}/{path}.ipynb
  const githubMatch = trimmed.match(
    /colab\.research\.google\.com\/github\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+\.ipynb)/
  );
  if (githubMatch) {
    const [, owner, repo, branch, path] = githubMatch;
    return {
      type: "github",
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
    };
  }

  // Direct GitHub raw URL
  if (trimmed.includes("raw.githubusercontent.com") && trimmed.endsWith(".ipynb")) {
    return { type: "github", rawUrl: trimmed };
  }

  // GitHub repo .ipynb URL: https://github.com/{owner}/{repo}/blob/{branch}/{path}.ipynb
  const githubRepoMatch = trimmed.match(
    /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+\.ipynb)/
  );
  if (githubRepoMatch) {
    const [, owner, repo, branch, path] = githubRepoMatch;
    return {
      type: "github",
      rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
    };
  }

  // Gist-hosted: https://colab.research.google.com/gist/{user}/{gistId}/{file}
  const gistMatch = trimmed.match(
    /colab\.research\.google\.com\/gist\/([^/]+)\/([^/]+)\/(.+\.ipynb)/
  );
  if (gistMatch) {
    const [, user, gistId, file] = gistMatch;
    return {
      type: "gist",
      rawUrl: `https://gist.githubusercontent.com/${user}/${gistId}/raw/${file}`,
    };
  }

  // Drive-hosted: https://colab.research.google.com/drive/{fileId}
  const driveMatch = trimmed.match(/colab\.research\.google\.com\/drive\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return {
      type: "drive",
      rawUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  // Direct .ipynb URL
  if (trimmed.endsWith(".ipynb") && trimmed.startsWith("http")) {
    return { type: "github", rawUrl: trimmed };
  }

  return null;
}

function extractCodeCells(notebook: NotebookJson): { cells: Array<{ index: number; source: string; hasMarkdownBefore?: string }> } {
  if (!notebook.cells || !Array.isArray(notebook.cells)) {
    throw new Error("Invalid notebook format: no cells found");
  }

  const result: Array<{ index: number; source: string; hasMarkdownBefore?: string }> = [];
  let lastMarkdown = "";

  for (let i = 0; i < notebook.cells.length; i++) {
    const cell = notebook.cells[i];
    if (cell.cell_type === "markdown") {
      // Capture markdown as context for the next code cell
      lastMarkdown = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
    } else if (cell.cell_type === "code") {
      const source = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
      if (source.trim()) {
        result.push({
          index: i,
          source,
          ...(lastMarkdown ? { hasMarkdownBefore: lastMarkdown.slice(0, 200) } : {}),
        });
      }
      lastMarkdown = "";
    }
  }

  return { cells: result };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "A Colab notebook URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseColabUrl(url);
    if (!parsed) {
      return new Response(
        JSON.stringify({
          error: "Could not parse notebook URL. Supported formats:\n• Google Colab links (colab.research.google.com/...)\n• GitHub .ipynb links\n• Direct .ipynb URLs",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching notebook from ${parsed.type}: ${parsed.rawUrl}`);

    const response = await fetch(parsed.rawUrl, {
      headers: { "User-Agent": "LMS-Playground/1.0" },
    });

    if (!response.ok) {
      const hint =
        parsed.type === "drive"
          ? " Make sure the notebook is shared publicly (Anyone with the link)."
          : "";
      return new Response(
        JSON.stringify({
          error: `Failed to fetch notebook (HTTP ${response.status}).${hint}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = await response.text();

    let notebook: NotebookJson;
    try {
      notebook = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "The URL did not return a valid Jupyter notebook (.ipynb) file." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { cells } = extractCodeCells(notebook);

    if (cells.length === 0) {
      return new Response(
        JSON.stringify({ error: "No code cells found in this notebook." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: parsed.type,
        totalCells: cells.length,
        cells,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fetch notebook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
