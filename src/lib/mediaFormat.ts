export type MediaType = "hls" | "video" | "audio";

export interface MediaFormatInfo {
  type: MediaType;
  format: "mp4" | "mp3" | "mkv" | "m3u8" | "webm" | "wav" | "flac" | "aac" | "ogg" | "mov" | "other";
  name: string;
  badge: string;
  mimeType: string;
  isAudio: boolean;
  isHls: boolean;
  isVideo: boolean;
}

const EXTENSION_MAP: Record<string, { type: MediaType; format: MediaFormatInfo["format"]; name: string; badge: string; mimeType: string }> = {
  // Video formats
  mp4: { type: "video", format: "mp4", name: "MP4 Video", badge: "MP4", mimeType: "video/mp4" },
  m4v: { type: "video", format: "mp4", name: "MP4 Video (M4V)", badge: "MP4", mimeType: "video/mp4" },
  mkv: { type: "video", format: "mkv", name: "Matroska Video", badge: "MKV", mimeType: "video/x-matroska" },
  webm: { type: "video", format: "webm", name: "WebM Video", badge: "WEBM", mimeType: "video/webm" },
  mov: { type: "video", format: "mov", name: "QuickTime Video", badge: "MOV", mimeType: "video/quicktime" },
  ogv: { type: "video", format: "ogg", name: "Ogg Video", badge: "OGV", mimeType: "video/ogg" },
  ogg: { type: "video", format: "ogg", name: "Ogg Media", badge: "OGG", mimeType: "video/ogg" },
  ts: { type: "video", format: "other", name: "MPEG-2 Transport Stream", badge: "TS", mimeType: "video/mp2t" },
  m3u8: { type: "hls", format: "m3u8", name: "HLS Adaptive Playlist", badge: "HLS / M3U8", mimeType: "application/vnd.apple.mpegurl" },
  
  // Audio formats
  mp3: { type: "audio", format: "mp3", name: "MP3 Audio", badge: "MP3", mimeType: "audio/mpeg" },
  wav: { type: "audio", format: "wav", name: "WAV Lossless Audio", badge: "WAV", mimeType: "audio/wav" },
  flac: { type: "audio", format: "flac", name: "FLAC Lossless Audio", badge: "FLAC", mimeType: "audio/flac" },
  aac: { type: "audio", format: "aac", name: "AAC Audio", badge: "AAC", mimeType: "audio/aac" },
  m4a: { type: "audio", format: "aac", name: "M4A Audio", badge: "M4A", mimeType: "audio/mp4" },
  oga: { type: "audio", format: "ogg", name: "Ogg Vorbis Audio", badge: "OGA", mimeType: "audio/ogg" },
  opus: { type: "audio", format: "ogg", name: "Opus Audio", badge: "OPUS", mimeType: "audio/opus" },
  weba: { type: "audio", format: "webm", name: "WebM Audio", badge: "WEBA", mimeType: "audio/webm" },
};

/**
 * Detects format and media characteristics from a stream URL or filename.
 */
export function detectMediaFormat(url: string): MediaFormatInfo {
  if (!url || typeof url !== "string") {
    return {
      type: "video",
      format: "other",
      name: "Media Stream",
      badge: "STREAM",
      mimeType: "video/mp4",
      isAudio: false,
      isHls: false,
      isVideo: true,
    };
  }

  // Check for proxy wrapper
  let testUrl = url;
  if (testUrl.includes("/api/stream/proxy?url=")) {
    try {
      const match = testUrl.match(/[?&]url=([^&]+)/);
      if (match && match[1]) {
        testUrl = decodeURIComponent(match[1]);
      }
    } catch {
      // keep original
    }
  }

  // Remove query parameters and hash for extension extraction
  const cleanUrl = testUrl.split("?")[0].split("#")[0].toLowerCase();

  // Check known extensions
  for (const [ext, info] of Object.entries(EXTENSION_MAP)) {
    if (cleanUrl.endsWith(`.${ext}`) || cleanUrl.includes(`.${ext}/`)) {
      return {
        type: info.type,
        format: info.format,
        name: info.name,
        badge: info.badge,
        mimeType: info.mimeType,
        isAudio: info.type === "audio",
        isHls: info.type === "hls",
        isVideo: info.type === "video" || info.type === "hls",
      };
    }
  }

  // Check URL patterns for HLS
  if (
    cleanUrl.includes(".m3u8") ||
    cleanUrl.includes("/vd/") ||
    cleanUrl.includes("/hls/") ||
    cleanUrl.includes("manifest")
  ) {
    return {
      type: "hls",
      format: "m3u8",
      name: "HLS Adaptive Stream",
      badge: "HLS / M3U8",
      mimeType: "application/vnd.apple.mpegurl",
      isAudio: false,
      isHls: true,
      isVideo: true,
    };
  }

  // Check if URL indicates an audio file by keyword
  if (
    cleanUrl.includes("/audio/") ||
    cleanUrl.includes("audio") ||
    cleanUrl.includes("podcast") ||
    cleanUrl.includes("track")
  ) {
    return {
      type: "audio",
      format: "mp3",
      name: "Audio Stream",
      badge: "AUDIO",
      mimeType: "audio/mpeg",
      isAudio: true,
      isHls: false,
      isVideo: false,
    };
  }

  // Default to universal video
  return {
    type: "video",
    format: "mp4",
    name: "Video Stream",
    badge: "VIDEO",
    mimeType: "video/mp4",
    isAudio: false,
    isHls: false,
    isVideo: true,
  };
}

/**
 * Validates whether the given URL is a supported media resource (video, audio, or HLS stream).
 */
export function isValidMediaUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Must be http/https or relative path
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  
  // Direct supported extensions
  const supportedExtensions = [
    ".m3u8", ".mp4", ".mp3", ".mkv", ".webm", ".weba",
    ".wav", ".flac", ".aac", ".m4a", ".ogg", ".ogv",
    ".oga", ".opus", ".mov", ".ts",
  ];

  if (supportedExtensions.some((ext) => lower.includes(ext))) {
    return true;
  }

  // Supported path signatures
  if (
    lower.includes("/vd/") ||
    lower.includes("/hls/") ||
    lower.includes("/stream/") ||
    lower.includes("/video/") ||
    lower.includes("/audio/") ||
    lower.includes("streamable.com") ||
    lower.includes("/api/stream/proxy")
  ) {
    return true;
  }

  // Allow any valid HTTP/HTTPS URL as long as it looks like a media link
  return true;
}

export const SUPPORTED_FORMATS_LIST = [
  { name: "MP4", label: "MP4", category: "video" as const, desc: "MPEG-4 Part 14 Video (H.264/H.265/AV1)", ext: ".mp4, .m4v", type: "Video" },
  { name: "MP3", label: "MP3", category: "audio" as const, desc: "MPEG-1 Audio Layer III", ext: ".mp3", type: "Audio" },
  { name: "MKV", label: "MKV", category: "video" as const, desc: "Matroska Multimedia Container", ext: ".mkv", type: "Video" },
  { name: "HLS / M3U8", label: "M3U8 / HLS", category: "stream" as const, desc: "HTTP Live Streaming Adaptive Playlists", ext: ".m3u8", type: "Stream" },
  { name: "WebM", label: "WebM", category: "video" as const, desc: "Open Web Media (VP8, VP9, AV1, Opus)", ext: ".webm, .weba", type: "Video / Audio" },
  { name: "WAV", label: "WAV", category: "audio" as const, desc: "Waveform Audio File Format (Lossless)", ext: ".wav", type: "Audio" },
  { name: "FLAC", label: "FLAC", category: "audio" as const, desc: "Free Lossless Audio Codec", ext: ".flac", type: "Audio" },
  { name: "AAC / M4A", label: "AAC / M4A", category: "audio" as const, desc: "Advanced Audio Coding", ext: ".aac, .m4a", type: "Audio" },
  { name: "OGG / Opus", label: "OGG / Opus", category: "audio" as const, desc: "Ogg Vorbis & Opus Multimedia", ext: ".ogg, .ogv, .opus", type: "Video / Audio" },
  { name: "MOV", label: "MOV", category: "video" as const, desc: "Apple QuickTime Movie", ext: ".mov", type: "Video" },
  { name: "TS", label: "TS", category: "video" as const, desc: "MPEG-2 Transport Stream Chunks", ext: ".ts", type: "Video" },
];
