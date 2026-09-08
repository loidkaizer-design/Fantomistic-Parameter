import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import Plyr from "plyr";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { trackVideoEvent } from "../lib/analytics";
import { fetchTmdbMedia, TmdbMedia } from "../lib/tmdb";
import { FantomismLoader } from "./FantomismLoader";

interface PlyrVideoPlayerProps {
  streamUrl: string;
  id?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  fullPage?: boolean;
}

export function PlyrVideoPlayer({
  streamUrl,
  id,
  autoPlay = false,
  onEnded,
  fullPage = false,
}: PlyrVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [media, setMedia] = useState<TmdbMedia | null>(null);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(false);
  const [mouseActive, setMouseActive] = useState<boolean>(true);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch TMDB Movie/TV Title and Poster Image using ID
  useEffect(() => {
    if (!id) {
      setMedia(null);
      return;
    }

    let isMounted = true;
    setLoadingMedia(true);

    fetchTmdbMedia(id)
      .then((res) => {
        if (isMounted && res) {
          setMedia(res);
        }
      })
      .catch((err) => {
        console.warn("Error fetching TMDB media info:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingMedia(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Smooth hover/mouse movement behavior for overlays in full-page mode
  const handleMouseMove = () => {
    setMouseActive(true);
    if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
    mouseTimeoutRef.current = setTimeout(() => {
      setMouseActive(false);
    }, 3500);
  };

  // Validate if URL is a valid M3U8 / HLS stream
  const isValidM3u8 = (url: string) => {
    if (!url || typeof url !== "string") return false;
    const lower = url.toLowerCase();
    return (
      lower.includes(".m3u8") ||
      lower.includes("/vd/") ||
      lower.includes("hls") ||
      lower.includes("/api/stream/proxy")
    );
  };

  const getPlayableUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith("/api/stream/proxy")) return url;
    // Proxy external HLS streams to bypass CDN hotlink 403 blocks
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return `/api/stream/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!streamUrl) {
      setError("No stream URL was provided.");
      setLoading(false);
      trackVideoEvent("error", id, { message: "Missing stream URL" });
      return;
    }

    if (!isValidM3u8(streamUrl)) {
      setError("Invalid M3U8 stream: The returned URL is not a valid HLS/M3U8 playlist.");
      setLoading(false);
      trackVideoEvent("error", id, { message: "Invalid M3U8 stream", streamUrl });
      return;
    }

    setError(null);
    setLoading(true);

    const effectiveUrl = getPlayableUrl(streamUrl);
    let hls: Hls | null = null;
    let player: Plyr | null = null;

    // Move settings button to the left (directly after play)
    const plyrOptions: Plyr.Options = {
      controls: [
        "play-large",
        "play",
        "settings",
        "current-time",
        "duration",
        "progress",
        "mute",
        "volume",
        "captions",
        "pip",
        "airplay",
        "fullscreen",
      ],
      settings: ["quality", "speed", "loop"],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
      keyboard: { focused: true, global: true },
      tooltips: { controls: true, seek: true },
      autoplay: autoPlay,
      invertTime: false,
      toggleInvert: false,
      hideControls: false,
      clickToPlay: true,
      resetOnEnd: true,
    };

    // Initialize Plyr player UI on the video element
    player = new Plyr(video, plyrOptions);
    playerRef.current = player;

    // Analytics event listeners for video playback
    player.on("play", () => {
      trackVideoEvent("play", id, { currentTime: player?.currentTime });
    });

    player.on("pause", () => {
      trackVideoEvent("pause", id, { currentTime: player?.currentTime });
    });

    player.on("ended", () => {
      trackVideoEvent("complete", id);
      if (onEnded) onEnded();
    });

    player.on("error", (e) => {
      console.warn("Plyr error event:", e);
      setError("Playback error: unable to decode or load media stream.");
      setLoading(false);
      trackVideoEvent("error", id, { details: "Plyr playback error" });
    });

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        capLevelToPlayerSize: true,
      });

      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        setError(null);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("HLS fatal network error, attempting recovery...", data);
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS fatal media error, attempting recovery...", data);
              hls?.recoverMediaError();
              break;
            default:
              console.error("Fatal unrecoverable HLS error:", data);
              setError("Stream failed to load. The M3U8 source or segments could not be fetched.");
              setLoading(false);
              trackVideoEvent("error", id, { fatalError: data.details });
              hls?.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple Safari HLS
      video.src = effectiveUrl;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
      });
      video.addEventListener("error", () => {
        setError("Error loading M3U8 stream in native player.");
        setLoading(false);
        trackVideoEvent("error", id, { message: "Native HLS error" });
      });
    } else {
      setError("Your browser does not support HLS/M3U8 video playback.");
      setLoading(false);
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
      if (player) {
        player.destroy();
        playerRef.current = null;
      }
    };
  }, [streamUrl, autoPlay, id, onEnded]);

  const wrapperClass = fullPage
    ? "relative w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-none m-0 p-0 overflow-hidden flex items-center justify-center select-none plyr-full-page bg-black"
    : "relative w-full aspect-video max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border border-white/15 flex items-center justify-center group select-none transition-all duration-300";

  const posterImage = media?.backdropUrl || media?.posterUrl;
  const displayTitle =
    media?.title ||
    (loadingMedia ? "Fetching Title..." : id ? `ID: ${id}` : "Stream Playback");

  return (
    <div
      id={`player-wrapper-${id || "main"}`}
      className={wrapperClass}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Top Hairline Monochrome Accent Bar (card mode only) */}
      {!fullPage && (
        <div className="absolute top-0 inset-x-0 h-[1px] bg-white/20 z-30 opacity-80 pointer-events-none" />
      )}

      {/* Blurred Poster Background While Loading */}
      {posterImage && (
        <div
          className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ease-out z-10 ${
            loading ? "opacity-100" : "opacity-0 -z-10"
          }`}
        >
          <img
            src={posterImage}
            alt={media?.title || "Poster Backdrop"}
            className="w-full h-full object-cover filter blur-3xl scale-125 opacity-40 brightness-50 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />
        </div>
      )}

      {/* Top-left Overlay: TMDB Movie/Show Title Badge (Replaces "LIVE") */}
      <div
        className={`absolute top-3.5 left-3.5 z-30 flex items-center gap-2 transition-all duration-500 ease-out ${
          fullPage && !mouseActive && !loading
            ? "opacity-0 -translate-y-2 pointer-events-none"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 hover:bg-black/95 backdrop-blur-md border border-white/20 text-white text-xs font-medium shadow-2xl transition-all duration-300 hover:scale-[1.02]"
          title={
            media?.title
              ? `${media.title}${media.releaseYear ? ` (${media.releaseYear})` : ""}`
              : undefined
          }
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-white font-semibold text-[11px] sm:text-xs tracking-wide truncate max-w-[160px] sm:max-w-[280px]">
            {displayTitle}
          </span>
          {media?.releaseYear && (
            <>
              <span className="text-white/30 text-[10px]">|</span>
              <span className="text-neutral-400 text-[11px] font-mono shrink-0">
                {media.releaseYear}
              </span>
            </>
          )}
          <span className="text-white/30 text-[10px]">|</span>
          <span className="text-white/90 text-[11px] font-mono shrink-0">1080p</span>
        </div>
      </div>

      {/* Top-right Overlay: Stream ID Pill & Reload Action */}
      <div
        className={`absolute top-3.5 right-3.5 z-30 flex items-center gap-1.5 transition-all duration-500 ease-out ${
          fullPage && !mouseActive && !loading
            ? "opacity-0 -translate-y-2 pointer-events-none"
            : "opacity-85 hover:opacity-100 translate-y-0"
        }`}
      >
        {id && (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-black/90 backdrop-blur-md border border-white/20 text-neutral-300 text-[11px] font-mono shadow-md">
            ID: {id}
          </span>
        )}
        <button
          id={`reload-stream-btn-${id || "main"}`}
          onClick={() => {
            setError(null);
            setLoading(true);
            if (hlsRef.current) {
              hlsRef.current.loadSource(getPlayableUrl(streamUrl));
            }
          }}
          className="p-1.5 rounded-full bg-black/90 hover:bg-white text-neutral-300 hover:text-black backdrop-blur-md border border-white/20 hover:border-white transition-all shadow-md cursor-pointer"
          title="Reload stream"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg z-20 bg-black/95 border border-white/20 rounded-2xl m-4 shadow-2xl backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-white/20 flex items-center justify-center mb-3 text-white">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">Playback Error</p>
          <p className="text-xs text-neutral-400 mb-3 leading-relaxed">{error}</p>
          <p className="text-[11px] font-mono text-neutral-300 bg-neutral-900 border border-white/10 px-3 py-1 rounded-lg mb-4 truncate max-w-sm">
            {streamUrl}
          </p>
          <div className="flex items-center gap-2">
            <button
              id="retry-playback-btn"
              onClick={() => {
                setError(null);
                setLoading(true);
                if (hlsRef.current) {
                  hlsRef.current.loadSource(getPlayableUrl(streamUrl));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Stream
            </button>
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-white/15 rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Direct URL
            </a>
          </div>
        </div>
      ) : null}

      <div className={`w-full h-full ${error ? "hidden" : "block"}`}>
        <video
          ref={videoRef}
          className="plyr-react plyr w-full h-full object-contain"
          playsInline
        />
      </div>

      {/* Fantomism Official 3D Loading Animation */}
      {loading && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700 bg-black/60 backdrop-blur-[2px]">
          <FantomismLoader
            label={
              <div className="inline-flex items-center justify-center flex-wrap gap-x-2 gap-y-1 font-mono text-xs sm:text-sm uppercase tracking-wider select-none">
                <span className="text-white font-semibold">
                  {media?.title || (id ? `ID: ${id}` : "Stream")}
                </span>
                <span className="animate-blinking text-white text-[10px] sm:text-xs leading-none">
                  ●
                </span>
                <span className="shining-ltr font-bold tracking-widest text-white">
                  1080p HD
                </span>
              </div>
            }
            subLabel={
              media?.releaseYear
                ? `TMDB • ${media.releaseYear} • ID: ${id || "Stream"}`
                : id
                ? `Stream ID: ${id}`
                : undefined
            }
            scale={1.25}
          />
        </div>
      )}
    </div>
  );
}

