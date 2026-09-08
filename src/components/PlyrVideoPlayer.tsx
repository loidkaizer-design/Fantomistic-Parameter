import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import Plyr from "plyr";
import { AlertTriangle, RefreshCw, ExternalLink, Download, Music, Film, Disc } from "lucide-react";
import { trackVideoEvent } from "../lib/analytics";
import { fetchTmdbMedia, TmdbMedia } from "../lib/tmdb";
import { FantomismLoader } from "./FantomismLoader";
import { detectMediaFormat, isValidMediaUrl, MediaFormatInfo } from "../lib/mediaFormat";

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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [media, setMedia] = useState<TmdbMedia | null>(null);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(false);
  const [mouseActive, setMouseActive] = useState<boolean>(true);
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatInfo: MediaFormatInfo = detectMediaFormat(streamUrl);

  // Fetch TMDB Movie/TV Title and Poster Image using ID
  useEffect(() => {
    if (!id || formatInfo.isAudio) {
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
  }, [id, formatInfo.isAudio]);

  // Smooth hover/mouse movement behavior for overlays in full-page mode
  const handleMouseMove = () => {
    setMouseActive(true);
    if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
    mouseTimeoutRef.current = setTimeout(() => {
      setMouseActive(false);
    }, 3500);
  };

  const getPlayableUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith("/api/stream/proxy")) return url;
    // Proxy external streams to bypass CDN hotlink 403 blocks and CORS restrictions
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return `/api/stream/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const reloadStream = () => {
    setError(null);
    setLoading(true);
    const video = videoRef.current;
    const effectiveUrl = getPlayableUrl(streamUrl);

    if (formatInfo.isHls && hlsRef.current) {
      hlsRef.current.loadSource(effectiveUrl);
    } else if (video) {
      video.src = effectiveUrl;
      video.load();
    }
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

    if (!isValidMediaUrl(streamUrl)) {
      setError("Unsupported media format: The provided URL is not a recognized video or audio stream.");
      setLoading(false);
      trackVideoEvent("error", id, { message: "Unsupported media format", streamUrl });
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

    // Playback state tracking
    player.on("play", () => {
      setIsPlaying(true);
      trackVideoEvent("play", id, { currentTime: player?.currentTime });
    });

    player.on("pause", () => {
      setIsPlaying(false);
      trackVideoEvent("pause", id, { currentTime: player?.currentTime });
    });

    player.on("ended", () => {
      setIsPlaying(false);
      trackVideoEvent("complete", id);
      if (onEnded) onEnded();
    });

    player.on("error", (e) => {
      console.warn("Plyr error event:", e);
      setError("Playback error: unable to decode or load media stream.");
      setLoading(false);
      trackVideoEvent("error", id, { details: "Plyr playback error" });
    });

    // Handle HLS streams
    if (formatInfo.isHls) {
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
    } else {
      // Direct media streams: MP4, MP3, MKV, WebM, WAV, FLAC, AAC, MOV, OGG, etc.
      video.src = effectiveUrl;
      video.load();

      const handleLoaded = () => {
        setLoading(false);
        setError(null);
      };

      const handleDirectError = () => {
        const mediaErr = video.error;
        let msg = `Playback error: Unable to play this ${formatInfo.badge} file.`;
        if (mediaErr?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          msg = `Codec unsupported: Your browser cannot decode this ${formatInfo.badge} stream natively. Some MKV files require external codecs.`;
        } else if (mediaErr?.code === MediaError.MEDIA_ERR_NETWORK) {
          msg = `Network error: Connection to media stream was lost.`;
        }
        setError(msg);
        setLoading(false);
        trackVideoEvent("error", id, { message: msg, code: mediaErr?.code });
      };

      video.addEventListener("loadedmetadata", handleLoaded);
      video.addEventListener("canplay", handleLoaded);
      video.addEventListener("error", handleDirectError);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoaded);
        video.removeEventListener("canplay", handleLoaded);
        video.removeEventListener("error", handleDirectError);
        if (player) {
          player.destroy();
          playerRef.current = null;
        }
      };
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
  }, [streamUrl, autoPlay, id, onEnded, formatInfo.isHls, formatInfo.badge]);

  const wrapperClass = fullPage
    ? "relative w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-none m-0 p-0 overflow-hidden flex items-center justify-center select-none plyr-full-page bg-black"
    : "relative w-full aspect-video max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border border-white/15 flex items-center justify-center group select-none transition-all duration-300";

  const posterImage = media?.backdropUrl || media?.posterUrl;
  const displayTitle =
    media?.title ||
    (loadingMedia
      ? "Fetching Title..."
      : id
      ? `ID: ${id}`
      : formatInfo.name);

  const downloadUrl = `/api/stream/download?url=${encodeURIComponent(
    streamUrl
  )}&id=${encodeURIComponent(id || "media")}`;

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
      {posterImage && !formatInfo.isAudio && (
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

      {/* Top-left Overlay: Format badge + Title */}
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
              : `${displayTitle} • ${formatInfo.name}`
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
          <span className="text-white font-mono text-[10px] sm:text-[11px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 border border-white/20 shrink-0 uppercase">
            {formatInfo.badge}
          </span>
        </div>
      </div>

      {/* Top-right Overlay: Stream ID Pill, Download & Reload Action */}
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
        <a
          href={downloadUrl}
          download
          className="p-1.5 rounded-full bg-black/90 hover:bg-white text-neutral-300 hover:text-black backdrop-blur-md border border-white/20 hover:border-white transition-all shadow-md cursor-pointer"
          title={`Download ${formatInfo.badge} media`}
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <button
          id={`reload-stream-btn-${id || "main"}`}
          onClick={reloadStream}
          className="p-1.5 rounded-full bg-black/90 hover:bg-white text-neutral-300 hover:text-black backdrop-blur-md border border-white/20 hover:border-white transition-all shadow-md cursor-pointer"
          title="Reload stream"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error state overlay */}
      {error ? (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg z-20 bg-black/95 border border-white/20 rounded-2xl m-4 shadow-2xl backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-white/20 flex items-center justify-center mb-3 text-white">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-white mb-1">Playback Error</p>
          <p className="text-xs text-neutral-400 mb-3 leading-relaxed">{error}</p>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-300 bg-neutral-900 border border-white/10 px-3 py-1 rounded-lg mb-4 truncate max-w-sm">
            <span className="font-bold text-white uppercase">{formatInfo.badge}</span>
            <span className="text-neutral-500">•</span>
            <span className="truncate">{streamUrl}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              id="retry-playback-btn"
              onClick={reloadStream}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Stream
            </button>
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 border border-white/25 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download {formatInfo.badge}
            </a>
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-white/15 rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Direct URL
            </a>
          </div>
        </div>
      ) : null}

      {/* Audio Visualizer Mode for MP3, WAV, FLAC, AAC, etc. */}
      {formatInfo.isAudio && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none p-6 bg-radial from-neutral-900/60 to-black select-none">
          <div className="relative mb-6 flex items-center justify-center">
            {/* Spinning subtle vinyl ring */}
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-white/20 bg-neutral-950/80 shadow-[0_0_50px_rgba(255,255,255,0.08)] flex items-center justify-center transition-transform duration-1000 ${
                isPlaying ? "animate-[spin_6s_linear_infinite]" : ""
              }`}
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/25 bg-neutral-900 flex items-center justify-center">
                  <Disc className="w-8 h-8 text-white/80" />
                </div>
              </div>
            </div>
            {/* Pulsing center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Music className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="text-center max-w-md">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white font-mono text-[11px] uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              {formatInfo.name}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              {displayTitle}
            </h3>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              {id ? `Audio Track ID: ${id}` : "Audio Playback"}
            </p>
          </div>

          {/* Equalizer waveform bars animation */}
          <div className="flex items-end gap-1.5 h-8 mt-5">
            {[40, 75, 100, 60, 85, 45, 90, 70, 95, 50, 80, 65].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-white/80 rounded-full transition-all duration-300"
                style={{
                  height: isPlaying ? `${h}%` : "20%",
                  animation: isPlaying
                    ? `pulse 1.${(i % 5) + 2}s infinite alternate ease-in-out`
                    : "none",
                }}
              />
            ))}
          </div>
        </div>
      )}

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
                  {media?.title || (id ? `ID: ${id}` : formatInfo.name)}
                </span>
                <span className="animate-blinking text-white text-[10px] sm:text-xs leading-none">
                  ●
                </span>
                <span className="shining-ltr font-bold tracking-widest text-white">
                  {formatInfo.badge}
                </span>
              </div>
            }
            subLabel={
              media?.releaseYear
                ? `TMDB • ${media.releaseYear} • ID: ${id || "Stream"}`
                : id
                ? `Media ID: ${id}`
                : `${formatInfo.name}`
            }
            scale={1.25}
          />
        </div>
      )}
    </div>
  );
}

