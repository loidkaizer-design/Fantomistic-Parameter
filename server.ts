import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const UPSTREAM_BASE = process.env.UPSTREAM_BASE_URL || "https://idlink-aggregator-iyimpryfxq-as.a.run.app";

interface AnalyticsEvent {
  id: string;
  type: "pageview" | "play" | "pause" | "complete" | "error";
  page: "aggregator" | "embed";
  streamId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const analyticsStore: {
  events: AnalyticsEvent[];
  counts: {
    pageviews: { aggregator: number; embed: number; total: number };
    video: { plays: number; pauses: number; completions: number; errors: number };
  };
} = {
  events: [],
  counts: {
    pageviews: { aggregator: 0, embed: 0, total: 0 },
    video: { plays: 0, pauses: 0, completions: 0, errors: 0 },
  },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Machine-readable OpenAPI specification & API Docs endpoint
  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Fantomistic Player API",
      version: "1.0.0",
      description:
        "Public API documentation for Fantomistic Player — an adaptive multi-format (MP4, MP3, MKV, HLS/M3U8, WebM, and more) stream aggregator, TMDB media enrichment resolver, and responsive embeddable player.",
      contact: {
        name: "Fantomistic Player Support",
        url: "https://idlink-aggregator-iyimpryfxq-as.a.run.app",
      },
    },
    servers: [
      {
        url: "/",
        description: "Current Fantomistic Player instance",
      },
    ],
    paths: {
      "/api/public/lookup": {
        get: {
          summary: "Resolve Stream Source & Metadata by ID",
          description:
            "Resolves a given media stream identifier or TMDB ID into master playlist M3U8 URLs, media sources, and metadata.",
          parameters: [
            {
              name: "id",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "The unique media identifier or TMDB ID (e.g. 1007757).",
              example: "1007757",
            },
          ],
          responses: {
            "200": {
              description: "Stream resolution details and sources",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      found: { type: "boolean", example: true },
                      id: { type: "string", example: "1007757" },
                      url: { type: "string", example: "https://example.com/stream.m3u8" },
                      title: { type: "string", example: "Example Movie" },
                    },
                  },
                },
              },
            },
            "400": { description: "Missing required 'id' parameter" },
            "502": { description: "Upstream service unreachable" },
          },
        },
      },
      "/api/tmdb/{id}": {
        get: {
          summary: "Fetch TMDB Movie or TV Metadata",
          description:
            "Queries TMDB for movie or TV show title, overview, poster/backdrop artwork, and release year with automatic server-side caching.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "TMDB numeric movie or TV show ID (e.g. 1007757).",
              example: "1007757",
            },
          ],
          responses: {
            "200": {
              description: "TMDB media metadata",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      found: { type: "boolean", example: true },
                      id: { type: "string", example: "1007757" },
                      type: { type: "string", enum: ["movie", "tv"], example: "movie" },
                      title: { type: "string", example: "Sample Title" },
                      overview: { type: "string", example: "Synopsis of the film..." },
                      posterUrl: { type: "string", nullable: true },
                      backdropUrl: { type: "string", nullable: true },
                      releaseYear: { type: "string", example: "2024" },
                    },
                  },
                },
              },
            },
            "400": { description: "Missing ID" },
          },
        },
      },
      "/api/stream/proxy": {
        get: {
          summary: "HLS M3U8 Manifest and Media Segment Proxy",
          description:
            "Proxies HLS playlists and binary media chunks (.ts, .m4s) to bypass CDN referer and CORS hotlink protections. Rewrites internal segment URIs to maintain proxy routing.",
          parameters: [
            {
              name: "url",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "The full target media URL to proxy.",
              example: "https://example.com/hls/master.m3u8",
            },
          ],
          responses: {
            "200": {
              description: "Rewritten M3U8 playlist or raw binary media chunk",
              content: {
                "application/vnd.apple.mpegurl": {},
                "video/mp2t": {},
                "video/mp4": {},
              },
            },
            "206": { description: "Partial Content (Byte-range request)" },
            "400": { description: "Invalid or missing URL parameter" },
            "502": { description: "Error streaming media chunk" },
          },
        },
      },
      "/api/index/info": {
        get: {
          summary: "Aggregator Index & Active Streams",
          description:
            "Retrieves index data from the upstream aggregator, including top streaming entries and latest additions.",
          responses: {
            "200": {
              description: "Aggregator service information and stream entries",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      topEntries: { type: "array", items: { type: "object" } },
                      latestEntries: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/analytics/track": {
        post: {
          summary: "Record Telemetry & Playback Event",
          description: "Records player state events (pageview, play, pause, complete, error).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["type"],
                  properties: {
                    type: {
                      type: "string",
                      enum: ["pageview", "play", "pause", "complete", "error"],
                      example: "play",
                    },
                    page: {
                      type: "string",
                      enum: ["aggregator", "embed"],
                      example: "embed",
                    },
                    streamId: { type: "string", example: "1007757" },
                    metadata: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Event tracked successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      recorded: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/analytics/stats": {
        get: {
          summary: "Get Aggregated Analytics & Events",
          description: "Returns view metrics, playback counts, and recent telemetry events.",
          responses: {
            "200": {
              description: "Analytics statistics summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      counts: { type: "object" },
                      recentEvents: { type: "array" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/health": {
        get: {
          summary: "Service Health Check",
          description: "Checks if the Fantomistic Player server is responsive and healthy.",
          responses: {
            "200": {
              description: "Server is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      timestamp: { type: "string", example: "2026-09-07T21:44:00.000Z" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/embed/{id}": {
        get: {
          summary: "Fullscreen Pure Minimalist Embed Player",
          description:
            "Zero-margin, borderless, pure black & white iframe embed player supporting TMDB dynamic titles, 3D Fantomism loading animations, and 1080p adaptive HLS.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The stream key or TMDB ID to embed.",
              example: "1007757",
            },
          ],
          responses: {
            "200": {
              description: "HTML5 player interface configured for responsive iframe embedding",
              content: { "text/html": {} },
            },
          },
        },
      },
    },
  };

  app.get("/api/docs", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(openApiSpec);
  });

  app.get("/api/openapi.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(openApiSpec);
  });

  // Analytics Endpoints
  app.post("/api/analytics/track", (req, res) => {
    const { type, page, streamId, metadata } = req.body;
    if (!type) {
      return res.status(400).json({ error: "Missing event type" });
    }

    const event: AnalyticsEvent = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      page: page || "aggregator",
      streamId,
      timestamp: new Date().toISOString(),
      metadata,
    };

    analyticsStore.events.unshift(event);
    if (analyticsStore.events.length > 100) {
      analyticsStore.events.pop();
    }

    if (type === "pageview") {
      analyticsStore.counts.pageviews.total++;
      if (page === "embed") {
        analyticsStore.counts.pageviews.embed++;
      } else {
        analyticsStore.counts.pageviews.aggregator++;
      }
    } else if (type === "play") {
      analyticsStore.counts.video.plays++;
    } else if (type === "pause") {
      analyticsStore.counts.video.pauses++;
    } else if (type === "complete") {
      analyticsStore.counts.video.completions++;
    } else if (type === "error") {
      analyticsStore.counts.video.errors++;
    }

    return res.json({ success: true, recorded: event });
  });

  app.get("/api/analytics/stats", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.json({
      counts: analyticsStore.counts,
      recentEvents: analyticsStore.events.slice(0, 15),
    });
  });

  // Proxy /index/info endpoint
  const handleIndexInfo = async (_req: express.Request, res: express.Response) => {
    try {
      const response = await fetch(`${UPSTREAM_BASE}/index/info`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "IdLink-Aggregator/1.0",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          status: "error",
          message: `Upstream service responded with status ${response.status}`,
        });
      }

      const data = await response.json();
      res.setHeader("Cache-Control", "no-cache");
      return res.json(data);
    } catch (error: any) {
      console.error("Error fetching /index/info from upstream:", error?.message);
      return res.status(502).json({
        status: "error",
        message: "Failed to connect to upstream service",
      });
    }
  };

  app.get("/api/index/info", handleIndexInfo);
  app.get("/index/info", handleIndexInfo);

  // TMDB Metadata Proxy Endpoint (with in-memory cache)
  const TMDB_API_KEY = "e3d6866fc02af9808d1d0799be597d51";
  const tmdbCache = new Map<string, any>();

  app.get("/api/tmdb/:id", async (req, res) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "Missing ID" });
    }

    if (tmdbCache.has(id)) {
      return res.json(tmdbCache.get(id));
    }

    try {
      // Try movie endpoint first
      const movieRes = await fetch(
        `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?api_key=${TMDB_API_KEY}`
      );

      if (movieRes.ok) {
        const data = await movieRes.json();
        const result = {
          found: true,
          id,
          type: "movie",
          title: data.title || data.original_title || "Unknown Movie",
          overview: data.overview || "",
          posterPath: data.poster_path,
          backdropPath: data.backdrop_path,
          posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : null,
          backdropUrl: data.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
            : data.poster_path
            ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
            : null,
          releaseDate: data.release_date,
          releaseYear: data.release_date ? data.release_date.split("-")[0] : undefined,
        };
        tmdbCache.set(id, result);
        return res.json(result);
      }

      // Fallback to TV show endpoint
      const tvRes = await fetch(
        `https://api.themoviedb.org/3/tv/${encodeURIComponent(id)}?api_key=${TMDB_API_KEY}`
      );

      if (tvRes.ok) {
        const data = await tvRes.json();
        const result = {
          found: true,
          id,
          type: "tv",
          title: data.name || data.original_name || "Unknown TV Show",
          overview: data.overview || "",
          posterPath: data.poster_path,
          backdropPath: data.backdrop_path,
          posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : null,
          backdropUrl: data.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
            : data.poster_path
            ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
            : null,
          releaseDate: data.first_air_date,
          releaseYear: data.first_air_date ? data.first_air_date.split("-")[0] : undefined,
        };
        tmdbCache.set(id, result);
        return res.json(result);
      }

      // If not found in either movie or tv
      const notFoundResult = {
        found: false,
        id,
        title: null,
        posterUrl: null,
        backdropUrl: null,
      };
      tmdbCache.set(id, notFoundResult);
      return res.json(notFoundResult);
    } catch (err: any) {
      console.error("TMDB fetch error:", err?.message);
      return res.status(500).json({ error: "Failed to fetch from TMDB", details: err?.message });
    }
  });

  // GET /api/public/lookup?id=(ID)
  app.get("/api/public/lookup", async (req, res) => {
    const id = req.query.id as string;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        found: false,
        error: "Missing required query parameter: id",
      });
    }

    // Direct media URL support (e.g. user enters direct MP4, MP3, MKV, M3U8, or WebM URL)
    if (id.startsWith("http://") || id.startsWith("https://")) {
      const urlObj = new URL(id);
      const filename = path.basename(urlObj.pathname) || "media-stream";
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json({
        found: true,
        id,
        url: id,
        title: decodeURIComponent(filename),
      });
    }

    try {
      const targetUrl = `${UPSTREAM_BASE}/api/public/lookup?id=${encodeURIComponent(id)}`;
      const response = await fetch(targetUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "IdLink-Aggregator/1.0",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          found: false,
          id,
          error: `Upstream returned status ${response.status}`,
        });
      }

      const data = await response.json();
      res.setHeader("Cache-Control", "public, max-age=60");
      return res.json(data);
    } catch (error: any) {
      console.error(`Error looking up id ${id}:`, error?.message);
      return res.status(502).json({
        found: false,
        id,
        error: "Upstream service unreachable",
      });
    }
  });

  // Helper to infer media Content-Type from URL extension
  const inferContentType = (urlStr: string, currentHeader?: string | null): string => {
    if (
      currentHeader &&
      currentHeader !== "application/octet-stream" &&
      currentHeader !== "text/plain" &&
      currentHeader !== "binary/octet-stream"
    ) {
      return currentHeader;
    }
    const clean = urlStr.split("?")[0].split("#")[0].toLowerCase();
    if (clean.endsWith(".mp4") || clean.endsWith(".m4v")) return "video/mp4";
    if (clean.endsWith(".mp3")) return "audio/mpeg";
    if (clean.endsWith(".mkv")) return "video/x-matroska";
    if (clean.endsWith(".webm")) return "video/webm";
    if (clean.endsWith(".weba")) return "audio/webm";
    if (clean.endsWith(".wav")) return "audio/wav";
    if (clean.endsWith(".flac")) return "audio/flac";
    if (clean.endsWith(".aac")) return "audio/aac";
    if (clean.endsWith(".m4a")) return "audio/mp4";
    if (clean.endsWith(".ogg") || clean.endsWith(".ogv")) return "video/ogg";
    if (clean.endsWith(".oga") || clean.endsWith(".opus")) return "audio/ogg";
    if (clean.endsWith(".mov")) return "video/quicktime";
    if (clean.endsWith(".ts")) return "video/mp2t";
    if (clean.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
    return currentHeader || "application/octet-stream";
  };

  // Helper to infer file extension from URL
  const inferExtension = (urlStr: string): string => {
    const clean = urlStr.split("?")[0].split("#")[0].toLowerCase();
    const exts = [
      "mp4", "mp3", "mkv", "webm", "weba", "wav", "flac", "aac",
      "m4a", "ogg", "ogv", "oga", "opus", "mov", "ts", "m3u8"
    ];
    for (const ext of exts) {
      if (clean.endsWith(`.${ext}`)) return ext;
    }
    return clean.includes(".m3u8") ? "m3u8" : "mp4";
  };

  // Stream proxy endpoint to bypass hotlink referer protection and CORS limits
  app.get("/api/stream/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).send("Missing target url parameter");
    }

    try {
      const parsedUrl = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return res.status(400).send("Invalid target URL protocol");
      }

      const forwardHeaders: Record<string, string> = {
        Referer: `${parsedUrl.origin}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "*/*",
      };

      if (req.headers.range) {
        forwardHeaders["Range"] = req.headers.range as string;
      }

      const upstreamRes = await fetch(targetUrl, {
        headers: forwardHeaders,
      });

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return res
          .status(upstreamRes.status)
          .send(`Upstream stream returned ${upstreamRes.status}`);
      }

      const rawContentType = upstreamRes.headers.get("content-type") || "";
      const contentType = inferContentType(targetUrl, rawContentType);
      const isM3u8 =
        targetUrl.includes(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("x-mpegurl");

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (isM3u8) {
        const text = await upstreamRes.text();
        // Rewrite URLs inside M3U8 so segments route through our proxy
        const lines = text.split("\n");
        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          if (trimmed.startsWith("#EXT-X-MAP:URI=")) {
            const uriMatch = trimmed.match(/URI="([^"]+)"/);
            if (uriMatch && uriMatch[1]) {
              const fullUrl = new URL(uriMatch[1], targetUrl).toString();
              const proxyUrl = `/api/stream/proxy?url=${encodeURIComponent(fullUrl)}`;
              return trimmed.replace(uriMatch[1], proxyUrl);
            }
          }

          if (trimmed.startsWith("#")) {
            return line;
          }

          // Line is a segment URL
          const fullSegUrl = new URL(trimmed, targetUrl).toString();
          return `/api/stream/proxy?url=${encodeURIComponent(fullSegUrl)}`;
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Cache-Control", "no-cache");
        return res.send(rewrittenLines.join("\n"));
      }

      // Binary media chunk (ts, m4s, mp4, mp3, mkv, webm, flac, etc.)
      res.status(upstreamRes.status);
      res.setHeader("Content-Type", contentType);
      const contentLength = upstreamRes.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const contentRange = upstreamRes.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);
      const acceptRanges = upstreamRes.headers.get("accept-ranges") || "bytes";
      res.setHeader("Accept-Ranges", acceptRanges);

      if (upstreamRes.body) {
        // Node 18+ Web ReadableStream to Express response
        // @ts-ignore
        const reader = upstreamRes.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        await pump();
      } else {
        res.end();
      }
    } catch (error: any) {
      console.error("Stream proxy error:", error?.message);
      if (!res.headersSent) {
        return res.status(502).send("Error streaming media chunk");
      }
      res.end();
    }
  });

  // Download media stream (MP4, MP3, MKV, M3U8 playlist, etc.)
  app.get("/api/stream/download", async (req, res) => {
    const targetUrl = req.query.url as string;
    const id = (req.query.id as string) || "media";
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).send("Missing target url parameter");
    }

    try {
      const parsedUrl = new URL(targetUrl);
      const forwardHeaders: Record<string, string> = {
        Referer: `${parsedUrl.origin}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "*/*",
      };

      const upstreamRes = await fetch(targetUrl, {
        headers: forwardHeaders,
      });

      if (!upstreamRes.ok) {
        return res
          .status(upstreamRes.status)
          .send(`Upstream stream returned ${upstreamRes.status}`);
      }

      const rawContentType = upstreamRes.headers.get("content-type") || "";
      const contentType = inferContentType(targetUrl, rawContentType);
      const ext = inferExtension(targetUrl);
      const isM3u8 = ext === "m3u8" || contentType.includes("mpegurl");

      if (isM3u8) {
        const text = await upstreamRes.text();
        const host = req.get("host");
        const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
        const origin = `${proto}://${host}`;

        const lines = text.split("\n");
        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          if (trimmed.startsWith("#EXT-X-MAP:URI=")) {
            const uriMatch = trimmed.match(/URI="([^"]+)"/);
            if (uriMatch && uriMatch[1]) {
              const fullUrl = new URL(uriMatch[1], targetUrl).toString();
              const proxyUrl = `${origin}/api/stream/proxy?url=${encodeURIComponent(fullUrl)}`;
              return trimmed.replace(uriMatch[1], proxyUrl);
            }
          }

          if (trimmed.startsWith("#")) {
            return line;
          }

          const fullSegUrl = new URL(trimmed, targetUrl).toString();
          return `${origin}/api/stream/proxy?url=${encodeURIComponent(fullSegUrl)}`;
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${id}.m3u8"`);
        return res.send(rewrittenLines.join("\n"));
      }

      // Binary media download (MP4, MP3, MKV, etc.)
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${id}.${ext}"`);
      const contentLength = upstreamRes.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      if (upstreamRes.body) {
        // @ts-ignore
        const reader = upstreamRes.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        await pump();
      } else {
        res.end();
      }
    } catch (error: any) {
      console.error("Stream download error:", error?.message);
      return res.status(502).send("Error preparing stream media for download");
    }
  });

  // Vite middleware for development vs production static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
