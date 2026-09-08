import { useEffect, useState, type FormEvent } from "react";
import { IndexInfo, TopEntry, LatestEntry } from "../types";
import {
  Activity,
  Layers,
  TrendingUp,
  Clock,
  ExternalLink,
  Play,
  Copy,
  Check,
  RefreshCw,
  Search,
  Code2,
  Sparkles,
  ChevronRight,
  X,
  BarChart2,
  Eye,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { PlyrVideoPlayer } from "./PlyrVideoPlayer";
import { FantomismLoader } from "./FantomismLoader";
import { trackPageView, getAnalyticsStats, AnalyticsStats } from "../lib/analytics";

interface AggregatorHomeProps {
  onSelectEmbed: (id: string) => void;
  onNavigateDocs?: () => void;
}

export function AggregatorHome({ onSelectEmbed, onNavigateDocs }: AggregatorHomeProps) {
  const [data, setData] = useState<IndexInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{ id: string; url: string } | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false);

  const fetchIndexInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/index/info");
      if (!res.ok) {
        throw new Error(`Failed to fetch /index/info: HTTP ${res.status}`);
      }
      const json: IndexInfo = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Could not retrieve /index/info from service");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    const stats = await getAnalyticsStats();
    if (stats) setAnalytics(stats);
  };

  useEffect(() => {
    // Track aggregator pageview
    trackPageView("aggregator");
    fetchIndexInfo();
    loadAnalytics();

    const interval = setInterval(loadAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyEmbed = (id: string) => {
    const embedCode = `<iframe src="${window.location.origin}/embed/${encodeURIComponent(
      id
    )}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    let query = searchId.trim();
    if (!query) return;

    // Handle full embed URLs: e.g. /embed/1007757 or http://.../embed/1007757
    const embedMatch = query.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch && embedMatch[1]) {
      onSelectEmbed(embedMatch[1]);
      return;
    }

    // Handle full stream URLs matching top/latest entries
    if (query.startsWith("http://") || query.startsWith("https://")) {
      const topMatch = data?.topEntries?.find(
        (entry) => entry.url === query || (query.includes(entry.key) && entry.key.length > 3)
      );
      if (topMatch) {
        onSelectEmbed(topMatch.key);
        return;
      }

      const latestMatch = data?.latestEntries?.find(
        (entry) => entry.url === query || (query.includes(entry.key) && entry.key.length > 3)
      );
      if (latestMatch) {
        onSelectEmbed(latestMatch.key);
        return;
      }
    }

    onSelectEmbed(query);
  };

  const isM3u8Stream = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes(".m3u8") ||
      lower.includes("/vd/") ||
      lower.includes("hls") ||
      lower.includes("/api/stream/proxy")
    );
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 selection:bg-white selection:text-black pb-16">
      {/* Top Header */}
      <header className="border-b border-white/15 bg-black/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-white/20 flex items-center justify-center overflow-hidden p-1">
              <img src="/favicon.svg" alt="Fantomistic Player" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-base">
                  Fantomistic Player
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-900 text-neutral-300 border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  idlink.lovable.app
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Service outputs from <code className="font-mono text-neutral-300">/index/info</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onNavigateDocs && (
              <button
                id="open-api-docs-btn"
                onClick={onNavigateDocs}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-white/20 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="View Full API Documentation"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">API Docs</span>
              </button>
            )}

            <button
              id="toggle-analytics-btn"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                showAnalytics
                  ? "border-white bg-white text-black font-semibold"
                  : "border-white/20 bg-neutral-950 hover:bg-neutral-900 text-neutral-300"
              }`}
              title="Toggle Analytics Dashboard"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </button>

            <button
              id="toggle-raw-json-btn"
              onClick={() => setShowRawJson(!showRawJson)}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-white/20 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 transition-colors cursor-pointer"
              title="Toggle Raw JSON"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showRawJson ? "Hide JSON" : "Raw JSON"}</span>
            </button>

            <button
              id="refresh-index-btn"
              onClick={() => {
                fetchIndexInfo();
                loadAnalytics();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col gap-6">
        {/* Analytics Drawer / Card */}
        {showAnalytics && analytics && (
          <section className="bg-black border border-white/20 rounded-2xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/15">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-white" />
                <h3 className="text-sm font-semibold text-white">Aggregator Analytics Tracking</h3>
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="bg-neutral-950 border border-white/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
                  <Eye className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Total Views</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {analytics.counts.pageviews.total}
                </div>
              </div>

              <div className="bg-neutral-950 border border-white/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
                  <Layers className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Embed Views</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {analytics.counts.pageviews.embed}
                </div>
              </div>

              <div className="bg-neutral-950 border border-white/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
                  <PlayCircle className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Video Plays</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {analytics.counts.video.plays}
                </div>
              </div>

              <div className="bg-neutral-950 border border-white/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
                  <PauseCircle className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Pauses</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {analytics.counts.video.pauses}
                </div>
              </div>

              <div className="bg-neutral-950 border border-white/15 rounded-xl p-3 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Completions</span>
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {analytics.counts.video.completions}
                </div>
              </div>
            </div>

            {analytics.recentEvents.length > 0 && (
              <div className="bg-neutral-950 border border-white/15 rounded-xl p-3">
                <span className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-2 font-mono">
                  Live Event Feed
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
                  {analytics.recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between text-neutral-300 py-0.5 border-b border-white/10 last:border-0"
                    >
                      <span className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-200 uppercase text-[9px] border border-white/20">
                          {evt.type}
                        </span>
                        <span>{evt.page}</span>
                        {evt.streamId && (
                          <span className="text-neutral-400">ID: {evt.streamId}</span>
                        )}
                      </span>
                      <span className="text-neutral-500 text-[10px]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Quick ID Embed Launcher */}
        <section className="bg-black border border-white/20 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white mb-1">
                Open Stream Embed Route
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                Route to <code className="font-mono text-neutral-200">/embed/(ID)</code> with live backend lookup and Plyr HLS playback.
                {onNavigateDocs && (
                  <button
                    onClick={onNavigateDocs}
                    className="ml-2 text-white hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <span>View API Reference</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="lookup-id-input"
                  type="text"
                  placeholder="Enter stream ID (e.g. 860508)"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/20 focus:border-white pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-500 rounded-xl focus:outline-none transition-all font-mono"
                />
              </div>
              <button
                type="submit"
                id="submit-lookup-btn"
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer shrink-0"
              >
                Go to Embed
              </button>
            </form>
          </div>
        </section>

        {/* Loading / Error States */}
        {loading && !data && (
          <div className="p-12 text-center flex flex-col items-center justify-center bg-black border border-white/15 rounded-2xl min-h-[220px]">
            <FantomismLoader label="Fetching /index/info" subLabel="Connecting to upstream IdLink service" scale={1.2} />
          </div>
        )}

        {error && (
          <div className="p-6 bg-black border border-white/20 rounded-2xl text-center">
            <p className="text-sm font-semibold text-white mb-1">Failed to load /index/info</p>
            <p className="text-xs text-neutral-400 mb-4">{error}</p>
            <button
              onClick={fetchIndexInfo}
              className="px-4 py-2 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Outputs from /index/info */}
        {data && (
          <>
            {/* Metric / Info Badges */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-neutral-950 border border-white/15 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                  <Activity className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold font-mono text-white capitalize">
                    {data.status}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-white" />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">Service online</p>
              </div>

              <div className="bg-neutral-950 border border-white/15 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                  <Layers className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Indexed Streams</span>
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-white">
                  {data.indexed}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">Total available</p>
              </div>

              <div className="bg-neutral-950 border border-white/15 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Total Requests</span>
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-white">
                  {data.totalRequests}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">Lookups processed</p>
              </div>

              <div className="bg-neutral-950 border border-white/15 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Generated At</span>
                </div>
                <div className="text-xs font-mono font-medium text-neutral-200 truncate" title={data.generatedAt}>
                  {new Date(data.generatedAt).toLocaleTimeString()}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                  {new Date(data.generatedAt).toLocaleDateString()}
                </p>
              </div>
            </section>

            {/* Raw JSON viewer drawer/card if toggled */}
            {showRawJson && (
              <section className="bg-neutral-950 border border-white/20 rounded-xl p-4 font-mono text-xs text-neutral-300">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/15">
                  <span className="font-semibold text-white">GET /index/info Payload</span>
                  <button
                    onClick={() => setShowRawJson(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <pre className="overflow-x-auto max-h-72 p-2 bg-black rounded-lg text-[11px] text-neutral-300 leading-relaxed border border-white/10">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </section>
            )}

            {/* Top Entries Section */}
            <section className="bg-black border border-white/15 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-white/20 flex items-center justify-center text-white">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      Top Entries ({data.topEntries?.length || 0})
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Most requested streams from <code className="font-mono text-neutral-300">/index/info</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/15 text-neutral-400 font-mono text-[11px]">
                      <th className="pb-3 font-medium">Key (ID)</th>
                      <th className="pb-3 font-medium text-center">Lookups</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Target Stream URL</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono">
                    {data.topEntries?.map((entry: TopEntry) => {
                      const validM3u8 = isM3u8Stream(entry.url);
                      return (
                        <tr key={entry.key} className="hover:bg-neutral-900/40 transition-colors group">
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white bg-neutral-900 px-2 py-0.5 rounded border border-white/20">
                                {entry.key}
                              </span>
                              {!validM3u8 && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-white/20 flex items-center gap-1 font-sans"
                                  title="URL format is not standard M3U8"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Non-M3U8
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-900 text-neutral-300 border border-white/20">
                              {entry.lookups} hits
                            </span>
                          </td>
                          <td className="py-3 px-3 text-neutral-400 truncate max-w-xs hidden md:table-cell" title={entry.url}>
                            {entry.url}
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                id={`preview-top-${entry.key}`}
                                onClick={() => setPreviewItem({ id: entry.key, url: entry.url })}
                                className="p-1.5 rounded-lg border border-white/20 bg-neutral-950 hover:bg-white hover:text-black text-white transition-colors cursor-pointer"
                                title="Preview Player Inline"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                              <button
                                id={`embed-top-${entry.key}`}
                                onClick={() => onSelectEmbed(entry.key)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-sans text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                title="Open in /embed/:id route"
                              >
                                <span>/embed/{entry.key}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button
                                id={`copy-top-${entry.key}`}
                                onClick={() => handleCopyEmbed(entry.key)}
                                className="p-1.5 rounded-lg border border-white/15 hover:border-white/30 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                title="Copy Embed Iframe"
                              >
                                {copiedKey === entry.key ? (
                                  <Check className="w-3.5 h-3.5 text-white" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Latest Entries Section */}
            <section className="bg-black border border-white/15 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-white/20 flex items-center justify-center text-white">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      Latest Entries ({data.latestEntries?.length || 0})
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Recently indexed streams from <code className="font-mono text-neutral-300">/index/info</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/15 text-neutral-400 font-mono text-[11px]">
                      <th className="pb-3 font-medium">Key (ID)</th>
                      <th className="pb-3 font-medium">Created Time</th>
                      <th className="pb-3 font-medium hidden md:table-cell">Target Stream URL</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 font-mono">
                    {data.latestEntries?.map((entry: LatestEntry) => (
                      <tr key={entry.key} className="hover:bg-neutral-900/40 transition-colors group">
                        <td className="py-3 pr-3">
                          <span className="font-semibold text-white bg-neutral-900 px-2 py-0.5 rounded border border-white/20">
                            {entry.key}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-neutral-300 font-sans text-xs">
                          {entry.created_at ? new Date(entry.created_at).toLocaleString() : "Unknown"}
                        </td>
                        <td className="py-3 px-3 text-neutral-400 truncate max-w-xs hidden md:table-cell" title={entry.url}>
                          {entry.url}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`preview-latest-${entry.key}`}
                              onClick={() => setPreviewItem({ id: entry.key, url: entry.url })}
                              className="p-1.5 rounded-lg border border-white/20 bg-neutral-950 hover:bg-white hover:text-black text-white transition-colors cursor-pointer"
                              title="Preview Player Inline"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              id={`embed-latest-${entry.key}`}
                              onClick={() => onSelectEmbed(entry.key)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-sans text-xs font-semibold shadow-sm transition-all cursor-pointer"
                              title="Open in /embed/:id route"
                            >
                              <span>/embed/{entry.key}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                              id={`copy-latest-${entry.key}`}
                              onClick={() => handleCopyEmbed(entry.key)}
                              className="p-1.5 rounded-lg border border-white/15 hover:border-white/30 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                              title="Copy Embed Iframe"
                            >
                              {copiedKey === entry.key ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Inline Plyr Video Player Modal */}
      {previewItem && (
        <div
          id="preview-player-modal"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-black border border-white/20 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Hairline Monochrome Accent */}
            <div className="h-[1px] w-full bg-white/20" />

            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-black">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-neutral-900 text-white border border-white/20">
                  ID: {previewItem.id}
                </span>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-white/20 text-[11px] font-medium text-white">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                  </span>
                  <span className="font-semibold tracking-wider uppercase">PREVIEW PLAYER</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectEmbed(previewItem.id)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold cursor-pointer shadow-md transition-all"
                >
                  <span>Full /embed/{previewItem.id}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="p-4 sm:p-6 bg-black flex items-center justify-center">
              <PlyrVideoPlayer streamUrl={previewItem.url} id={previewItem.id} autoPlay={true} />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/10 bg-black flex items-center justify-between text-xs text-neutral-400">
              <span className="font-mono truncate max-w-md text-neutral-400" title={previewItem.url}>
                {previewItem.url}
              </span>
              <button
                onClick={() => handleCopyEmbed(previewItem.id)}
                className="inline-flex items-center gap-1 text-white hover:text-neutral-300 font-medium cursor-pointer"
              >
                {copiedKey === previewItem.id ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === previewItem.id ? "Copied" : "Copy Embed"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
