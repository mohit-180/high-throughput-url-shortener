export interface ShortUrl {
  code: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clicks: number;
  isExpired?: boolean;
  isCached?: boolean;
  shortUrl: string;
}

export interface AnalyticsLog {
  timestamp: string;
  code: string;
  browser: string;
  os: string;
  country: string;
  ip: string;
  referrer: string;
  device: string;
  cacheStatus: "HIT" | "MISS";
  latencyMs: number;
}

export interface TimelineData {
  time: string;
  clicks: number;
  cacheHits: number;
}

export interface BrowserStats {
  name: string;
  value: number;
}

export interface OsStats {
  name: string;
  value: number;
}

export interface CountryStats {
  name: string;
  value: number;
}

export interface ReferrerStats {
  name: string;
  value: number;
}

export interface DeviceStats {
  name: string;
  value: number;
}

export interface AnalyticsSummary {
  totalClicks: number;
  cacheHits: number;
  cacheMisses: number;
  averageLatencyMs: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  browsers: BrowserStats[];
  os: OsStats[];
  countries: CountryStats[];
  referrers: ReferrerStats[];
  devices: DeviceStats[];
  timeline: TimelineData[];
  recentClicks: AnalyticsLog[];
}

export interface DatabasePoolStats {
  active: number;
  idle: number;
  max: number;
}

export interface DatabaseStats {
  totalRecords: number;
  sizeMb: number;
  pool: DatabasePoolStats;
  indexUsageEfficiency: string;
  avgQueryTimeMs: number;
}

export interface CacheStats {
  activeKeys: number;
  memoryKb: number;
  hits: number;
  misses: number;
  hitRatio: number;
  evictionPolicy: string;
  avgResponseTimeMs: number;
}

export interface SystemStats {
  database: DatabaseStats;
  cache: CacheStats;
}

export interface LoadTestMetrics {
  time: string;
  rps: number;
  latency: number;
  failures: number;
}

export interface LoadTestSummary {
  totalRequests: number;
  avgRps: number;
  avgLatencyMs: number;
  totalFailures: number;
}

export interface LoadTestResult {
  testConcurrency: number;
  testDuration: number;
  metrics: LoadTestMetrics[];
  summary: LoadTestSummary;
}
