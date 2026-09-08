export interface TmdbMedia {
  found: boolean;
  id: string;
  type?: "movie" | "tv";
  title?: string | null;
  overview?: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseYear?: string;
}

const TMDB_API_KEY = "e3d6866fc02af9808d1d0799be597d51";
const clientTmdbCache = new Map<string, TmdbMedia>();

export async function fetchTmdbMedia(id: string): Promise<TmdbMedia | null> {
  if (!id || typeof id !== "string") return null;

  const cleanId = id.trim();
  if (clientTmdbCache.has(cleanId)) {
    return clientTmdbCache.get(cleanId)!;
  }

  // 1. Try local server endpoint first
  try {
    const res = await fetch(`/api/tmdb/${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data: TmdbMedia = await res.json();
      if (data && data.found) {
        clientTmdbCache.set(cleanId, data);
        return data;
      }
    }
  } catch {
    // Fall back to direct TMDB API if server endpoint fails or is in dev static mode
  }

  // 2. Direct TMDB API fallback (Movie first, then TV)
  try {
    const movieRes = await fetch(
      `https://api.themoviedb.org/3/movie/${encodeURIComponent(cleanId)}?api_key=${TMDB_API_KEY}`
    );

    if (movieRes.ok) {
      const data = await movieRes.json();
      const media: TmdbMedia = {
        found: true,
        id: cleanId,
        type: "movie",
        title: data.title || data.original_title || "Unknown Movie",
        overview: data.overview || "",
        posterUrl: data.poster_path
          ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
          : null,
        backdropUrl: data.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
          : data.poster_path
          ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
          : null,
        releaseYear: data.release_date ? data.release_date.split("-")[0] : undefined,
      };
      clientTmdbCache.set(cleanId, media);
      return media;
    }

    const tvRes = await fetch(
      `https://api.themoviedb.org/3/tv/${encodeURIComponent(cleanId)}?api_key=${TMDB_API_KEY}`
    );

    if (tvRes.ok) {
      const data = await tvRes.json();
      const media: TmdbMedia = {
        found: true,
        id: cleanId,
        type: "tv",
        title: data.name || data.original_name || "Unknown TV Show",
        overview: data.overview || "",
        posterUrl: data.poster_path
          ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
          : null,
        backdropUrl: data.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
          : data.poster_path
          ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
          : null,
        releaseYear: data.first_air_date ? data.first_air_date.split("-")[0] : undefined,
      };
      clientTmdbCache.set(cleanId, media);
      return media;
    }
  } catch (err) {
    console.warn("Direct TMDB fetch error:", err);
  }

  const notFound: TmdbMedia = {
    found: false,
    id: cleanId,
    title: null,
    posterUrl: null,
    backdropUrl: null,
  };
  clientTmdbCache.set(cleanId, notFound);
  return notFound;
}
