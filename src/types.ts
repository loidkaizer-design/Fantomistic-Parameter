export interface TopEntry {
  key: string;
  url: string;
  lookups: number;
}

export interface LatestEntry {
  key: string;
  url: string;
  created_at: string;
}

export interface IndexInfo {
  status: string;
  indexed: number;
  totalRequests: number;
  topEntries: TopEntry[];
  latestEntries: LatestEntry[];
  generatedAt: string;
}

export interface LookupResponse {
  found: boolean;
  id: string;
  url?: string;
}

// Module declaration for plyr CSS or types if needed
declare module 'plyr';
