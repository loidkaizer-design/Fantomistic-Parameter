export interface AnalyticsStats {
  counts: {
    pageviews: { aggregator: number; embed: number; total: number };
    video: { plays: number; pauses: number; completions: number; errors: number };
  };
  recentEvents: Array<{
    id: string;
    type: "pageview" | "play" | "pause" | "complete" | "error";
    page: "aggregator" | "embed";
    streamId?: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
}

export async function trackPageView(page: "aggregator" | "embed", streamId?: string) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        page,
        streamId,
      }),
    });
  } catch (err) {
    console.debug("Analytics track pageview error:", err);
  }
}

export async function trackVideoEvent(
  type: "play" | "pause" | "complete" | "error",
  streamId?: string,
  metadata?: Record<string, any>
) {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        page: "embed",
        streamId,
        metadata,
      }),
    });
  } catch (err) {
    console.debug("Analytics track video error:", err);
  }
}

export async function getAnalyticsStats(): Promise<AnalyticsStats | null> {
  try {
    const res = await fetch("/api/analytics/stats");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
