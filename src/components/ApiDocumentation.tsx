import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Play,
  Terminal,
  Code2,
  ExternalLink,
  Search,
  Server,
  Layers,
  Sparkles,
  ShieldCheck,
  FileCode,
  Activity,
  Tv,
  Film,
  Database,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

interface ApiDocumentationProps {
  onNavigateHome: () => void;
  onSelectEmbed?: (id: string) => void;
}

interface EndpointDef {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  category: "Embedding" | "Streams & Metadata" | "Analytics & System";
  description: string;
  parameters?: {
    name: string;
    in: "query" | "path" | "body";
    type: string;
    required: boolean;
    description: string;
    defaultValue?: string;
  }[];
  requestBodyExample?: string;
  curlExample: (origin: string) => string;
  jsExample: (origin: string) => string;
  pythonExample: (origin: string) => string;
  embedExample?: (origin: string) => string;
  defaultTestParam?: Record<string, string>;
  testUrlGenerator?: (origin: string, params: Record<string, string>) => string;
}

export function ApiDocumentation({ onNavigateHome, onSelectEmbed }: ApiDocumentationProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://fantomistic.player";
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>("embed");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [codeTab, setCodeTab] = useState<"curl" | "javascript" | "python" | "iframe">("curl");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Live tester state
  const [testParams, setTestParams] = useState<Record<string, string>>({
    id: "1007757",
    url: "https://idlink.lovable.app",
    type: "play",
    page: "embed",
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    status?: number;
    statusText?: string;
    durationMs?: number;
    data?: any;
    error?: string;
  } | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const endpoints: EndpointDef[] = [
    {
      id: "embed",
      method: "GET",
      path: "/embed/:id",
      title: "Fullscreen Minimalist Embed Player",
      category: "Embedding",
      description:
        "Renders a zero-margin, pure black & white iframe media player. Features automated TMDB movie/TV resolution, 3D Fantomism glowing wireframe loader, live shining search phrases, and adaptive HLS playback with fallback handling.",
      parameters: [
        {
          name: "id",
          in: "path",
          type: "string",
          required: true,
          description: "Stream identifier or TMDB media ID (e.g. 1007757).",
          defaultValue: "1007757",
        },
        {
          name: "autoplay",
          in: "query",
          type: "boolean",
          required: false,
          description: "Automatically start playback when initialized (true/false).",
          defaultValue: "true",
        },
      ],
      curlExample: (baseUrl) => `curl -i "${baseUrl}/embed/1007757"`,
      jsExample: (baseUrl) => `// Embed URL for iframe or direct redirect
const embedUrl = "${baseUrl}/embed/1007757";
window.open(embedUrl, "_blank");`,
      pythonExample: (baseUrl) => `# In Python web frameworks, generate an iframe HTML tag:
embed_url = "${baseUrl}/embed/1007757"
iframe_code = f'<iframe src="{embed_url}" width="100%" height="500" allowfullscreen></iframe>'`,
      embedExample: (baseUrl) =>
        `<iframe\n  src="${baseUrl}/embed/1007757"\n  width="100%"\n  height="500"\n  frameborder="0"\n  allow="autoplay; encrypted-media; fullscreen"\n  allowfullscreen\n></iframe>`,
      defaultTestParam: { id: "1007757" },
      testUrlGenerator: (baseUrl, params) => `${baseUrl}/embed/${encodeURIComponent(params.id || "1007757")}`,
    },
    {
      id: "lookup",
      method: "GET",
      path: "/api/public/lookup",
      title: "Stream Resolution & Source Lookup",
      category: "Streams & Metadata",
      description:
        "Resolves a stream identifier into playable master M3U8 source URLs, titles, and media configuration by querying the upstream index with server caching.",
      parameters: [
        {
          name: "id",
          in: "query",
          type: "string",
          required: true,
          description: "Target media ID or stream key to look up (e.g. 1007757).",
          defaultValue: "1007757",
        },
      ],
      curlExample: (baseUrl) => `curl -X GET "${baseUrl}/api/public/lookup?id=1007757" \\
  -H "Accept: application/json"`,
      jsExample: (baseUrl) => `const response = await fetch("${baseUrl}/api/public/lookup?id=1007757");
const data = await response.json();
console.log("Stream info:", data);`,
      pythonExample: (baseUrl) => `import requests

url = "${baseUrl}/api/public/lookup"
params = {"id": "1007757"}
response = requests.get(url, params=params)
data = response.json()
print(data)`,
      defaultTestParam: { id: "1007757" },
      testUrlGenerator: (baseUrl, params) => `${baseUrl}/api/public/lookup?id=${encodeURIComponent(params.id || "1007757")}`,
    },
    {
      id: "tmdb",
      method: "GET",
      path: "/api/tmdb/:id",
      title: "TMDB Media Title & Artwork Enrichment",
      category: "Streams & Metadata",
      description:
        "Fetches verified movie or television titles, overviews, high-res poster artwork, and release dates from TMDB with in-memory caching. Resolves movies first with TV fallback.",
      parameters: [
        {
          name: "id",
          in: "path",
          type: "string",
          required: true,
          description: "Numeric TMDB movie or TV show ID (e.g. 1007757).",
          defaultValue: "1007757",
        },
      ],
      curlExample: (baseUrl) => `curl -X GET "${baseUrl}/api/tmdb/1007757" \\
  -H "Accept: application/json"`,
      jsExample: (baseUrl) => `const response = await fetch("${baseUrl}/api/tmdb/1007757");
const meta = await response.json();
if (meta.found) {
  console.log(\`Title: \${meta.title} (\${meta.releaseYear})\`);
  console.log(\`Poster: \${meta.posterUrl}\`);
}`,
      pythonExample: (baseUrl) => `import requests

tmdb_id = "1007757"
response = requests.get(f"${baseUrl}/api/tmdb/{tmdb_id}")
movie_data = response.json()
print("Title:", movie_data.get("title"))`,
      defaultTestParam: { id: "1007757" },
      testUrlGenerator: (baseUrl, params) => `${baseUrl}/api/tmdb/${encodeURIComponent(params.id || "1007757")}`,
    },
    {
      id: "stream-proxy",
      method: "GET",
      path: "/api/stream/proxy",
      title: "HLS M3U8 Manifest & Segment Proxy",
      category: "Streams & Metadata",
      description:
        "Bypasses CDN hotlink referer verification and browser CORS limits. Dynamically parses and rewrites M3U8 playlist segment URIs to route through the proxy, streaming binary chunks (.ts/.m4s) with Range support.",
      parameters: [
        {
          name: "url",
          in: "query",
          type: "string",
          required: true,
          description: "Full URL of the target M3U8 manifest or media chunk.",
          defaultValue: "https://idlink.lovable.app/index/info",
        },
      ],
      curlExample: (baseUrl) => `curl -i "${baseUrl}/api/stream/proxy?url=https%3A%2F%2Fcdn.example.com%2Fstream.m3u8"`,
      jsExample: (baseUrl) => `// Initialize HLS.js through proxy URL
const proxyUrl = "${baseUrl}/api/stream/proxy?url=" + encodeURIComponent("https://cdn.example.com/master.m3u8");
const hls = new Hls();
hls.loadSource(proxyUrl);
hls.attachMedia(videoElement);`,
      pythonExample: (baseUrl) => `import requests

proxy_url = "${baseUrl}/api/stream/proxy"
params = {"url": "https://cdn.example.com/master.m3u8"}
r = requests.get(proxy_url, params=params)
print("Content-Type:", r.headers.get("Content-Type"))`,
      defaultTestParam: { url: "https://idlink.lovable.app/index/info" },
      testUrlGenerator: (baseUrl, params) => `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(params.url || "")}`,
    },
    {
      id: "index-info",
      method: "GET",
      path: "/api/index/info",
      title: "Aggregator Index & Top Entries",
      category: "Streams & Metadata",
      description:
        "Returns the global aggregated stream index from the upstream feed, containing top streaming titles, latest additions, and active count metadata.",
      curlExample: (baseUrl) => `curl -X GET "${baseUrl}/api/index/info" \\
  -H "Accept: application/json"`,
      jsExample: (baseUrl) => `const response = await fetch("${baseUrl}/api/index/info");
const indexData = await response.json();
console.log("Top entries:", indexData.topEntries?.length);`,
      pythonExample: (baseUrl) => `import requests

response = requests.get("${baseUrl}/api/index/info")
index_data = response.json()
print("Latest entries count:", len(index_data.get("latestEntries", [])))`,
      testUrlGenerator: (baseUrl) => `${baseUrl}/api/index/info`,
    },
    {
      id: "analytics-track",
      method: "POST",
      path: "/api/analytics/track",
      title: "Record Playback & Telemetry Event",
      category: "Analytics & System",
      description:
        "Logs player interactions and telemetry events. Supported event types: pageview, play, pause, complete, and error.",
      parameters: [
        {
          name: "type",
          in: "body",
          type: "string",
          required: true,
          description: "Event type ('pageview' | 'play' | 'pause' | 'complete' | 'error').",
          defaultValue: "play",
        },
        {
          name: "page",
          in: "body",
          type: "string",
          required: false,
          description: "Source screen ('aggregator' | 'embed').",
          defaultValue: "embed",
        },
        {
          name: "streamId",
          in: "body",
          type: "string",
          required: false,
          description: "Media stream ID associated with the event.",
          defaultValue: "1007757",
        },
      ],
      requestBodyExample: JSON.stringify(
        {
          type: "play",
          page: "embed",
          streamId: "1007757",
          metadata: { currentTime: 14.5, duration: 7200 },
        },
        null,
        2
      ),
      curlExample: (baseUrl) => `curl -X POST "${baseUrl}/api/analytics/track" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"play","page":"embed","streamId":"1007757"}'`,
      jsExample: (baseUrl) => `await fetch("${baseUrl}/api/analytics/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "play",
    page: "embed",
    streamId: "1007757"
  })
});`,
      pythonExample: (baseUrl) => `import requests

payload = {
    "type": "play",
    "page": "embed",
    "streamId": "1007757"
}
requests.post("${baseUrl}/api/analytics/track", json=payload)`,
      testUrlGenerator: (baseUrl) => `${baseUrl}/api/analytics/track`,
    },
    {
      id: "analytics-stats",
      method: "GET",
      path: "/api/analytics/stats",
      title: "Aggregated Telemetry Statistics",
      category: "Analytics & System",
      description:
        "Retrieves real-time counts of aggregator and embed views, total plays, pauses, completions, errors, and the recent telemetry event log.",
      curlExample: (baseUrl) => `curl -X GET "${baseUrl}/api/analytics/stats"`,
      jsExample: (baseUrl) => `const res = await fetch("${baseUrl}/api/analytics/stats");
const stats = await res.json();
console.log("Total plays:", stats.counts?.video?.plays);`,
      pythonExample: (baseUrl) => `import requests

stats = requests.get("${baseUrl}/api/analytics/stats").json()
print("Metrics:", stats["counts"])`,
      testUrlGenerator: (baseUrl) => `${baseUrl}/api/analytics/stats`,
    },
    {
      id: "health",
      method: "GET",
      path: "/api/health",
      title: "Service Health Check",
      category: "Analytics & System",
      description:
        "Verifies that the Fantomistic Player server is responsive and running normally. Returns ISO 8601 server timestamp.",
      curlExample: (baseUrl) => `curl -X GET "${baseUrl}/api/health"`,
      jsExample: (baseUrl) => `const res = await fetch("${baseUrl}/api/health");
const status = await res.json();
console.log("Server health:", status);`,
      pythonExample: (baseUrl) => `import requests

health = requests.get("${baseUrl}/api/health").json()
print(health["status"])`,
      testUrlGenerator: (baseUrl) => `${baseUrl}/api/health`,
    },
    {
      id: "openapi-json",
      method: "GET",
      path: "/api/docs",
      title: "OpenAPI 3.0 Specification JSON",
      category: "Analytics & System",
      description:
        "Returns the complete, standard OpenAPI 3.0.3 machine-readable schema for all Fantomistic Player endpoints and embed routes.",
      curlExample: (baseUrl) => `curl -X GET "${baseUrl}/api/docs" \\
  -H "Accept: application/json"`,
      jsExample: (baseUrl) => `const spec = await fetch("${baseUrl}/api/docs").then(r => r.json());
console.log("OpenAPI version:", spec.openapi);`,
      pythonExample: (baseUrl) => `import requests

spec = requests.get("${baseUrl}/api/docs").json()
print("Endpoints available:", list(spec["paths"].keys()))`,
      testUrlGenerator: (baseUrl) => `${baseUrl}/api/docs`,
    },
  ];

  const currentEndpoint = endpoints.find((e) => e.id === selectedEndpointId) || endpoints[0];

  const filteredEndpoints = endpoints.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.path.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.method.toLowerCase().includes(q)
    );
  });

  const categories = ["Embedding", "Streams & Metadata", "Analytics & System"] as const;

  const handleRunTest = async () => {
    setTestLoading(true);
    setTestResponse(null);
    const start = performance.now();

    try {
      if (currentEndpoint.id === "embed") {
        const id = testParams.id || "1007757";
        const embedUrl = `${origin}/embed/${encodeURIComponent(id)}`;
        setTestResponse({
          status: 200,
          statusText: "OK (HTML Embed View)",
          durationMs: Math.round(performance.now() - start),
          data: {
            previewUrl: embedUrl,
            iframeSnippet: `<iframe src="${embedUrl}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`,
            message: "Embed endpoint renders full-bleed HTML5 player. Click below to open preview.",
          },
        });
        return;
      }

      if (currentEndpoint.method === "POST") {
        const res = await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: testParams.type || "play",
            page: testParams.page || "embed",
            streamId: testParams.id || "1007757",
            metadata: { testedFrom: "api_documentation" },
          }),
        });
        const duration = Math.round(performance.now() - start);
        const data = await res.json();
        setTestResponse({
          status: res.status,
          statusText: res.statusText,
          durationMs: duration,
          data,
        });
      } else {
        let testUrl = currentEndpoint.testUrlGenerator
          ? currentEndpoint.testUrlGenerator(origin, testParams)
          : `/api/${currentEndpoint.id}`;

        // Make relative for fetch in same origin
        const relativeUrl = testUrl.replace(origin, "");
        const res = await fetch(relativeUrl);
        const duration = Math.round(performance.now() - start);

        let data: any;
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          const text = await res.text();
          data = text.slice(0, 500) + (text.length > 500 ? "\n... (truncated)" : "");
        }

        setTestResponse({
          status: res.status,
          statusText: res.statusText,
          durationMs: duration,
          data,
        });
      }
    } catch (err: any) {
      setTestResponse({
        error: err?.message || "Failed to execute request",
        durationMs: Math.round(performance.now() - start),
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 selection:bg-white selection:text-black pb-20">
      {/* Top Header */}
      <header className="border-b border-white/15 bg-black/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="p-2 rounded-xl bg-neutral-950 border border-white/20 text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Return to Aggregator"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-neutral-950 border border-white/20 flex items-center justify-center p-1">
              <img src="/favicon.svg" alt="Fantomistic Player" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-base">
                  Fantomistic Player
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-white text-black">
                  API DOCS
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono hidden sm:block">
                OpenAPI 3.0 Specification & Interactive Reference
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-white/20 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="View Raw OpenAPI JSON"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">OpenAPI JSON</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold shadow-md transition-all cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Back to Player</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Documentation Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar: Endpoint Directory */}
        <aside className="lg:w-72 shrink-0 flex flex-col gap-6">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-white/20 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Quick Overview Card */}
          <div className="bg-neutral-950 border border-white/15 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
              <Server className="w-3.5 h-3.5" />
              <span>Base URL</span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-black border border-white/15 rounded-lg p-2 font-mono text-[11px] text-neutral-300">
              <span className="truncate">{origin}</span>
              <button
                onClick={() => copyToClipboard(origin, "base-url")}
                className="text-neutral-400 hover:text-white cursor-pointer"
                title="Copy Base URL"
              >
                {copiedKey === "base-url" ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-1 border-t border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>CORS Enabled (Public Access)</span>
            </div>
          </div>

          {/* Categorized Endpoint Navigation */}
          <nav className="flex flex-col gap-6">
            {categories.map((cat) => {
              const catEndpoints = filteredEndpoints.filter((e) => e.category === cat);
              if (catEndpoints.length === 0) return null;

              return (
                <div key={cat} className="flex flex-col gap-1.5">
                  <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-2">
                    {cat}
                  </h3>
                  <div className="flex flex-col gap-1">
                    {catEndpoints.map((ep) => {
                      const isSelected = selectedEndpointId === ep.id;
                      return (
                        <button
                          key={ep.id}
                          onClick={() => {
                            setSelectedEndpointId(ep.id);
                            setTestResponse(null);
                            if (ep.defaultTestParam) {
                              setTestParams((prev) => ({ ...prev, ...ep.defaultTestParam }));
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-white text-black font-semibold shadow-md"
                              : "bg-neutral-950/60 hover:bg-neutral-900 text-neutral-300 border border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                isSelected
                                  ? "bg-black text-white"
                                  : ep.method === "GET"
                                  ? "bg-white/10 text-white"
                                  : "bg-white/20 text-white"
                              }`}
                            >
                              {ep.method}
                            </span>
                            <span className="truncate">{ep.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Right Content Area: Detailed Endpoint Specification */}
        <main className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Endpoint Banner */}
          <section className="bg-neutral-950 border border-white/20 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white text-black">
                  {currentEndpoint.method}
                </span>
                <span className="text-sm sm:text-base font-mono font-bold text-white tracking-wide break-all">
                  {currentEndpoint.path}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-black border border-white/20 text-neutral-300 font-medium">
                {currentEndpoint.category}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {currentEndpoint.title}
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-3xl">
              {currentEndpoint.description}
            </p>

            {/* If embed, offer quick launch */}
            {currentEndpoint.id === "embed" && onSelectEmbed && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => onSelectEmbed(testParams.id || "1007757")}
                  className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold cursor-pointer shadow-md transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Live Embed Player</span>
                </button>
              </div>
            )}
          </section>

          {/* Parameters Section */}
          {currentEndpoint.parameters && currentEndpoint.parameters.length > 0 && (
            <section className="bg-neutral-950 border border-white/15 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Layers className="w-4 h-4" />
                <span>Parameters</span>
              </div>

              <div className="overflow-x-auto border border-white/15 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-neutral-400 border-b border-white/15 uppercase font-mono text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono text-neutral-300">
                    {currentEndpoint.parameters.map((p) => (
                      <tr key={p.name} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-bold text-white">{p.name}</td>
                        <td className="px-4 py-3 text-neutral-400">{p.in}</td>
                        <td className="px-4 py-3 text-neutral-400">{p.type}</td>
                        <td className="px-4 py-3">
                          {p.required ? (
                            <span className="text-white font-semibold">required</span>
                          ) : (
                            <span className="text-neutral-500">optional</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-sans text-neutral-300 max-w-xs sm:max-w-md">
                          {p.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Request Code Snippets */}
          <section className="bg-neutral-950 border border-white/15 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Terminal className="w-4 h-4" />
                <span>Request Examples</span>
              </div>

              {/* Language Selector Tabs */}
              <div className="flex items-center p-1 bg-black border border-white/15 rounded-xl gap-1 text-xs">
                <button
                  onClick={() => setCodeTab("curl")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                    codeTab === "curl"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setCodeTab("javascript")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                    codeTab === "javascript"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  JavaScript
                </button>
                <button
                  onClick={() => setCodeTab("python")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                    codeTab === "python"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Python
                </button>
                {currentEndpoint.embedExample && (
                  <button
                    onClick={() => setCodeTab("iframe")}
                    className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                      codeTab === "iframe"
                        ? "bg-white text-black font-semibold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    HTML Iframe
                  </button>
                )}
              </div>
            </div>

            {/* Code Display Area */}
            <div className="relative group">
              <pre className="p-4 bg-black border border-white/15 rounded-xl font-mono text-xs text-neutral-200 overflow-x-auto leading-relaxed whitespace-pre">
                {codeTab === "curl" && currentEndpoint.curlExample(origin)}
                {codeTab === "javascript" && currentEndpoint.jsExample(origin)}
                {codeTab === "python" && currentEndpoint.pythonExample(origin)}
                {codeTab === "iframe" &&
                  (currentEndpoint.embedExample
                    ? currentEndpoint.embedExample(origin)
                    : currentEndpoint.curlExample(origin))}
              </pre>

              <button
                onClick={() => {
                  let text = currentEndpoint.curlExample(origin);
                  if (codeTab === "javascript") text = currentEndpoint.jsExample(origin);
                  if (codeTab === "python") text = currentEndpoint.pythonExample(origin);
                  if (codeTab === "iframe" && currentEndpoint.embedExample) {
                    text = currentEndpoint.embedExample(origin);
                  }
                  copyToClipboard(text, "code-snippet");
                }}
                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/20 text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy code"
              >
                {copiedKey === "code-snippet" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Interactive "Try It Out" Live Console */}
          <section className="bg-neutral-950 border border-white/20 rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Play className="w-4 h-4 text-white" />
                <span>Live Interactive Tester</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                Direct client execution
              </span>
            </div>

            {/* Test Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentEndpoint.parameters?.map((p) => (
                <div key={p.name} className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-neutral-300 flex items-center justify-between">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-neutral-500">{p.in}</span>
                  </label>
                  <input
                    type="text"
                    value={testParams[p.name] ?? p.defaultValue ?? ""}
                    onChange={(e) =>
                      setTestParams({ ...testParams, [p.name]: e.target.value })
                    }
                    placeholder={p.defaultValue || p.name}
                    className="px-3 py-2 bg-black border border-white/20 rounded-xl text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="text-xs font-mono text-neutral-400 truncate max-w-sm">
                Target:{" "}
                <span className="text-neutral-200">
                  {currentEndpoint.testUrlGenerator
                    ? currentEndpoint.testUrlGenerator(origin, testParams)
                    : currentEndpoint.path}
                </span>
              </div>

              <button
                onClick={handleRunTest}
                disabled={testLoading}
                className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                {testLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Test Results */}
            {testResponse && (
              <div className="mt-2 flex flex-col gap-2 bg-black border border-white/20 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-white/15">
                  <div className="flex items-center gap-2 font-mono">
                    {testResponse.error ? (
                      <span className="flex items-center gap-1.5 text-neutral-400">
                        <AlertCircle className="w-3.5 h-3.5 text-white" />
                        <span>ERROR</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-white font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>
                          {testResponse.status} {testResponse.statusText}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
                    {testResponse.durationMs !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{testResponse.durationMs}ms</span>
                      </span>
                    )}
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(testResponse.data || testResponse.error, null, 2),
                          "test-output"
                        )
                      }
                      className="hover:text-white cursor-pointer"
                      title="Copy Response"
                    >
                      {copiedKey === "test-output" ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Embed Result Quick Launch */}
                {testResponse.data?.previewUrl && (
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-neutral-300">
                      Iframe Embed Ready:
                    </span>
                    <a
                      href={testResponse.data.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-white underline hover:text-neutral-300 font-mono"
                    >
                      <span>Open {testResponse.data.previewUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <pre className="font-mono text-xs text-neutral-200 overflow-x-auto max-h-72 p-2 whitespace-pre-wrap">
                  {testResponse.error
                    ? testResponse.error
                    : typeof testResponse.data === "string"
                    ? testResponse.data
                    : JSON.stringify(testResponse.data, null, 2)}
                </pre>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
