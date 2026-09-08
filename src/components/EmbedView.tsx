import { useEffect, useState } from "react";
import { PlyrVideoPlayer } from "./PlyrVideoPlayer";
import { LookupResponse } from "../types";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { trackPageView } from "../lib/analytics";
import { fetchTmdbMedia, TmdbMedia } from "../lib/tmdb";
import { FantomismLoader } from "./FantomismLoader";
import { PhrasesGJM } from "./PhrasesGJM";

interface EmbedViewProps {
  id: string;
  onNavigateHome?: () => void;
}

export function EmbedView({ id }: EmbedViewProps) {
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tmdbMedia, setTmdbMedia] = useState<TmdbMedia | null>(null);

  const isValidM3u8Url = (url: string) => {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    return (
      lower.includes(".m3u8") ||
      lower.includes("/vd/") ||
      lower.includes("hls") ||
      lower.includes("/api/stream/proxy")
    );
  };

  const fetchLookup = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Track pageview for embed page
      trackPageView("embed", id);

      // Pre-fetch TMDB metadata concurrently
      fetchTmdbMedia(id)
        .then((media) => {
          if (media) setTmdbMedia(media);
        })
        .catch(() => {});

      const res = await fetch(`/api/public/lookup?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        throw new Error(`Lookup request failed with status code ${res.status}`);
      }
      const json: LookupResponse = await res.json();

      if (!json.found) {
        setError(`Content could not be loaded: Stream ID "${id}" was not found or has expired.`);
        setData(json);
        return;
      }

      if (!json.url || !isValidM3u8Url(json.url)) {
        setError(
          `Content could not be loaded: The returned URL is not a valid M3U8/HLS stream.`
        );
        setData(json);
        return;
      }

      setData(json);
    } catch (err: any) {
      setError(
        err?.message || "Content could not be loaded: Failed to connect to the lookup service."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookup();
  }, [id]);

  if (loading) {
    const poster = tmdbMedia?.backdropUrl || tmdbMedia?.posterUrl;
    return (
      <div className="relative w-screen h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
        {/* Blurred Poster Background While Loading */}
        {poster && (
          <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-700">
            <img
              src={poster}
              alt={tmdbMedia?.title || "Poster"}
              className="w-full h-full object-cover filter blur-3xl scale-125 opacity-35 brightness-50"
            />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          </div>
        )}
        <div className="relative z-10">
          <FantomismLoader
            label={<PhrasesGJM title={tmdbMedia?.title} id={id} />}
            subLabel={
              tmdbMedia?.releaseYear
                ? `TMDB • ${tmdbMedia.releaseYear} • ID: ${id}`
                : `Stream ID: ${id}`
            }
            scale={1.3}
          />
        </div>
      </div>
    );
  }

  if (error || !data?.found || !data?.url || !isValidM3u8Url(data.url)) {
    const poster = tmdbMedia?.backdropUrl || tmdbMedia?.posterUrl;
    return (
      <div className="relative w-screen h-screen bg-black flex items-center justify-center p-4 text-center overflow-hidden">
        {poster && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={poster}
              alt={tmdbMedia?.title || "Poster"}
              className="w-full h-full object-cover filter blur-3xl scale-125 opacity-20 brightness-40"
            />
            <div className="absolute inset-0 bg-black/80" />
          </div>
        )}
        <div className="relative z-10 bg-black/90 border border-white/20 rounded-2xl p-6 max-w-sm shadow-2xl backdrop-blur-md">
          <AlertTriangle className="w-8 h-8 text-white mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-white">Content Could Not Be Loaded</p>
          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed font-sans">
            {error || "Stream not found or invalid format."}
          </p>
          <p className="text-[11px] text-neutral-500 mt-2 font-mono">
            {tmdbMedia?.title ? `${tmdbMedia.title} (ID: ${id})` : `ID: ${id}`}
          </p>
          <button
            id="retry-lookup-btn"
            onClick={fetchLookup}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white text-black hover:bg-neutral-200 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Lookup
          </button>
        </div>
      </div>
    );
  }

  // Pure Edge-to-Edge Player View taking the entire page
  return (
    <div className="w-screen h-screen bg-black overflow-hidden m-0 p-0 flex items-center justify-center">
      <PlyrVideoPlayer streamUrl={data.url} id={id} autoPlay={false} fullPage={true} />
    </div>
  );
}
