import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface ShortUrl {
  code: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clicks: number;
}

interface AnalyticsLog {
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

// In-Memory Database & Cache Simulation
const urls: Map<string, ShortUrl> = new Map();
const cache: Map<string, { url: ShortUrl; expiresAt: number }> = new Map();
const logs: AnalyticsLog[] = [];

// Cache Stats Tracker
let cacheHits = 0;
let cacheMisses = 0;

// Base62 Alphabet
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Base62 Helper
function encodeBase62(num: number): string {
  if (num === 0) return BASE62[0];
  let result = "";
  while (num > 0) {
    result = BASE62[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

// Generate unique 6-character short code
function generateShortCode(): string {
  let attempts = 0;
  while (attempts < 100) {
    // Generate an ID based on Timestamp and Random offset
    const id = Date.now() + Math.floor(Math.random() * 1000000);
    let code = encodeBase62(id);
    // Standardize to exactly 6 characters or slice it
    if (code.length > 6) {
      code = code.substring(code.length - 6);
    } else if (code.length < 6) {
      code = code.padStart(6, "0");
    }
    
    if (!urls.has(code)) {
      return code;
    }
    attempts++;
  }
  return Math.random().toString(36).substring(2, 8);
}

// Seed Initial Data for the Dashboard Visualizer
const initialUrls = [
  { code: "goog89", originalUrl: "https://www.google.com", createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), clicks: 432 },
  { code: "github", originalUrl: "https://github.com", createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), clicks: 284 },
  { code: "ytbe12", originalUrl: "https://www.youtube.com", createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), clicks: 195 },
  { code: "fastap", originalUrl: "https://fastapi.tiangolo.com", createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), clicks: 76 }
];

initialUrls.forEach(u => {
  urls.set(u.code, {
    code: u.code,
    originalUrl: u.originalUrl,
    createdAt: u.createdAt,
    expiresAt: null,
    clicks: u.clicks
  });
});

// Seed Analytics Logs to render charts instantly
const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"];
const osList = ["macOS", "Windows", "Linux", "iOS", "Android"];
const countries = ["United States", "United Kingdom", "Germany", "Japan", "India", "Canada", "Australia", "France"];
const referrers = ["Direct", "Twitter", "GitHub", "LinkedIn", "Google", "Hacker News"];
const devices = ["Desktop", "Mobile", "Tablet"];

for (let i = 0; i < 300; i++) {
  const hoursAgo = Math.random() * 72; // Last 3 days
  const timestamp = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  const urlItem = initialUrls[Math.floor(Math.random() * initialUrls.length)];
  const isHit = Math.random() > 0.3; // 70% cache hit simulation
  
  logs.push({
    timestamp,
    code: urlItem.code,
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    os: osList[Math.floor(Math.random() * osList.length)],
    country: countries[Math.floor(Math.random() * countries.length)],
    ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
    referrer: referrers[Math.floor(Math.random() * referrers.length)],
    device: devices[Math.floor(Math.random() * devices.length)],
    cacheStatus: isHit ? "HIT" : "MISS",
    latencyMs: isHit ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 45) + 15
  });
}

// Calculate initial Cache Hits & Misses from Seed Logs
logs.forEach(log => {
  if (log.cacheStatus === "HIT") cacheHits++;
  else cacheMisses++;
});

// Parse Metadata from user agent
function parseUserAgent(userAgentStr: string, referrerHeader: string | undefined) {
  let browser = "Other";
  let os = "Other";
  let device = "Desktop";
  
  const ua = userAgentStr.toLowerCase();
  
  if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";
  else if (ua.includes("opera")) browser = "Opera";
  
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS";
    device = "Mobile";
  }
  else if (ua.includes("android")) {
    os = "Android";
    device = "Mobile";
  }
  
  if (ua.includes("mobile") && device !== "Mobile") {
    device = "Mobile";
  } else if (ua.includes("tablet")) {
    device = "Tablet";
  }
  
  let referrer = "Direct";
  if (referrerHeader) {
    try {
      const url = new URL(referrerHeader);
      if (url.hostname.includes("google")) referrer = "Google";
      else if (url.hostname.includes("github")) referrer = "GitHub";
      else if (url.hostname.includes("twitter") || url.hostname.includes("t.co")) referrer = "Twitter";
      else if (url.hostname.includes("linkedin")) referrer = "LinkedIn";
      else if (url.hostname.includes("ycombinator")) referrer = "Hacker News";
      else referrer = url.hostname;
    } catch {
      referrer = "Direct";
    }
  }
  
  return { browser, os, device, referrer };
}

// Setup Express
async function startServer() {
  const app = express();
  app.use(express.json());

  // API Endpoints
  
  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "url-shortener-backend",
      version: "1.0.0"
    });
  });

  // Create Short URL
  app.post("/api/shorten", (req, res) => {
    const { url, custom_code, expiry_hours } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    let code = custom_code ? custom_code.trim() : "";
    if (code) {
      // Validate Custom Code (alphanumeric, 3-20 chars)
      const codeRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({ error: "Custom code must be alphanumeric (including '-' or '_') and between 3-20 characters." });
      }
      if (urls.has(code)) {
        return res.status(409).json({ error: "Custom short code already in use." });
      }
    } else {
      code = generateShortCode();
    }

    let expiresAt: string | null = null;
    if (expiry_hours) {
      const hours = parseFloat(expiry_hours);
      if (isNaN(hours) || hours <= 0) {
        return res.status(400).json({ error: "Expiry hours must be a positive number" });
      }
      expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    }

    const shortUrl: ShortUrl = {
      code,
      originalUrl: url,
      createdAt: new Date().toISOString(),
      expiresAt,
      clicks: 0
    };

    urls.set(code, shortUrl);

    // Warm up the cache instantly (simulation)
    cache.set(code, {
      url: shortUrl,
      expiresAt: Date.now() + 600000 // 10 minutes cache TTL
    });

    res.status(201).json({
      ...shortUrl,
      shortUrl: `/r/${code}`
    });
  });

  // Get All URL items
  app.get("/api/urls", (req, res) => {
    const list = Array.from(urls.values()).map(u => {
      // Check if item is expired
      const isExpired = u.expiresAt && new Date(u.expiresAt).getTime() < Date.now();
      return {
        ...u,
        isExpired,
        isCached: cache.has(u.code) && !isExpired,
        shortUrl: `/r/${u.code}`
      };
    });
    res.json(list);
  });

  // Delete a URL item
  app.delete("/api/urls/:code", (req, res) => {
    const { code } = req.params;
    if (!urls.has(code)) {
      return res.status(404).json({ error: "Short code not found" });
    }
    urls.delete(code);
    cache.delete(code); // Cache invalidation
    res.json({ message: "URL deleted successfully" });
  });

  // Get Cache and Database Statistics
  app.get("/api/stats", (req, res) => {
    // Simulated DB parameters
    const totalRecords = urls.size;
    const dbSizeMb = (totalRecords * 0.15 + 12.4).toFixed(2); // Base DB size of 12.4 MB
    
    // Connection Pool metrics
    const dbPoolActive = Math.floor(Math.random() * 3) + 1; // 1-3 active connections
    const dbPoolIdle = 10 - dbPoolActive;
    
    // Cache Metrics
    const cachedKeysCount = cache.size;
    const hitRatio = cacheHits + cacheMisses === 0 ? 0 : cacheHits / (cacheHits + cacheMisses);
    const cacheMemoryKb = (cachedKeysCount * 0.82).toFixed(2);

    res.json({
      database: {
        totalRecords,
        sizeMb: parseFloat(dbSizeMb),
        pool: {
          active: dbPoolActive,
          idle: dbPoolIdle,
          max: 20
        },
        indexUsageEfficiency: "99.8%",
        avgQueryTimeMs: 1.8
      },
      cache: {
        activeKeys: cachedKeysCount,
        memoryKb: parseFloat(cacheMemoryKb),
        hits: cacheHits,
        misses: cacheMisses,
        hitRatio: parseFloat((hitRatio * 100).toFixed(1)),
        evictionPolicy: "volatile-lru",
        avgResponseTimeMs: 0.25
      }
    });
  });

  // Get Aggregated Analytics Data
  app.get("/api/analytics", (req, res) => {
    const browserMap: Record<string, number> = {};
    const osMap: Record<string, number> = {};
    const countryMap: Record<string, number> = {};
    const referrerMap: Record<string, number> = {};
    const deviceMap: Record<string, number> = {};
    const cacheMap: Record<string, number> = { HIT: 0, MISS: 0 };
    
    // Sort logs by date descending
    const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    logs.forEach(log => {
      browserMap[log.browser] = (browserMap[log.browser] || 0) + 1;
      osMap[log.os] = (osMap[log.os] || 0) + 1;
      countryMap[log.country] = (countryMap[log.country] || 0) + 1;
      referrerMap[log.referrer] = (referrerMap[log.referrer] || 0) + 1;
      deviceMap[log.device] = (deviceMap[log.device] || 0) + 1;
      cacheMap[log.cacheStatus] = (cacheMap[log.cacheStatus] || 0) + 1;
    });

    // Clicks timeline (grouped by day/hour)
    // To keep it simple, group by hour for the last 24 hours
    const clicksTimeline: { time: string; clicks: number; cacheHits: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const hourDate = new Date(Date.now() - i * 3600000);
      const label = hourDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      
      // Count clicks in this hour range
      let clicks = 0;
      let hits = 0;
      logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        const diffMs = hourDate.getTime() - logDate.getTime();
        // within the same hour bucket (3600000 ms)
        if (diffMs >= 0 && diffMs < 3600000) {
          clicks++;
          if (log.cacheStatus === "HIT") hits++;
        }
      });

      clicksTimeline.push({
        time: label,
        clicks,
        cacheHits: hits
      });
    }

    res.json({
      summary: {
        totalClicks: logs.length,
        cacheHits: cacheMap.HIT || 0,
        cacheMisses: cacheMap.MISS || 0,
        averageLatencyMs: parseFloat((logs.reduce((sum, l) => sum + l.latencyMs, 0) / (logs.length || 1)).toFixed(2))
      },
      browsers: Object.entries(browserMap).map(([name, value]) => ({ name, value })),
      os: Object.entries(osMap).map(([name, value]) => ({ name, value })),
      countries: Object.entries(countryMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6),
      referrers: Object.entries(referrerMap).map(([name, value]) => ({ name, value })),
      devices: Object.entries(deviceMap).map(([name, value]) => ({ name, value })),
      timeline: clicksTimeline,
      recentClicks: sortedLogs.slice(0, 15)
    });
  });

  // Simulated Load Testing Suite (Locust Simulator)
  app.post("/api/simulate-load", (req, res) => {
    const { concurrency, durationSeconds } = req.body;
    const uArr = Array.from(urls.values());
    if (uArr.length === 0) {
      return res.status(400).json({ error: "Create at least one URL first before running load tests" });
    }

    const testConcurrency = parseInt(concurrency) || 100;
    const testDuration = parseInt(durationSeconds) || 5;

    // Simulate high-throughput metrics over time (e.g. 1-second buckets)
    const results: { time: string; rps: number; latency: number; failures: number }[] = [];
    let cumulativeClicks = 0;

    for (let sec = 1; sec <= testDuration; sec++) {
      // Calculate randomized high-throughput metrics based on concurrency
      const multiplier = testConcurrency === 1000 ? 9.5 : testConcurrency === 500 ? 5.2 : 1.1;
      const baseRps = Math.floor(250 + Math.random() * 50);
      const rps = Math.floor(baseRps * multiplier);
      
      // Cache-hit ratios: 1000 users causes slightly higher cache efficiency but slightly more latency on the pool
      const cacheHitRate = testConcurrency === 1000 ? 0.94 : 0.88;
      const avgLatency = testConcurrency === 1000 
        ? parseFloat((0.85 + Math.random() * 0.4).toFixed(2)) // 0.85 - 1.25 ms under heavy load
        : parseFloat((0.42 + Math.random() * 0.15).toFixed(2)); // 0.42 - 0.57 ms under normal load
      
      const failures = Math.random() > 0.97 ? Math.floor(Math.random() * 3) : 0; // Very minor failures

      // Append logs in background to simulate click activity
      for (let c = 0; c < Math.min(rps, 200); c++) { // Limit DB logs cap to avoid local memory bloat
        const isHit = Math.random() < cacheHitRate;
        const randUrl = uArr[Math.floor(Math.random() * uArr.length)];
        
        // Asynchronously push to our analytics log
        logs.push({
          timestamp: new Date().toISOString(),
          code: randUrl.code,
          browser: browsers[Math.floor(Math.random() * browsers.length)],
          os: osList[Math.floor(Math.random() * osList.length)],
          country: countries[Math.floor(Math.random() * countries.length)],
          ip: `10.0.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254)}`,
          referrer: referrers[Math.floor(Math.random() * referrers.length)],
          device: devices[Math.floor(Math.random() * devices.length)],
          cacheStatus: isHit ? "HIT" : "MISS",
          latencyMs: isHit ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 40) + 10
        });

        // Increment hit/miss counters
        if (isHit) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
        
        // Add random click count to url item
        randUrl.clicks++;
      }

      results.push({
        time: `Sec ${sec}`,
        rps,
        latency: avgLatency,
        failures
      });
    }

    res.json({
      testConcurrency,
      testDuration,
      metrics: results,
      summary: {
        totalRequests: results.reduce((sum, r) => sum + r.rps, 0),
        avgRps: Math.floor(results.reduce((sum, r) => sum + r.rps, 0) / testDuration),
        avgLatencyMs: parseFloat((results.reduce((sum, r) => sum + r.latency, 0) / testDuration).toFixed(2)),
        totalFailures: results.reduce((sum, r) => sum + r.failures, 0)
      }
    });
  });

  // Short URL Redirection Endpoint with Real-Time Routing Logic Simulation
  app.get("/r/:code", (req, res) => {
    const { code } = req.params;
    const urlItem = urls.get(code);

    if (!urlItem) {
      return res.status(404).send(`
        <html>
          <head>
            <title>URL Not Found</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f9fafb; color: #111827; }
              .card { text-align: center; padding: 2.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 450px; }
              h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; }
              p { color: #4b5563; line-height: 1.5; font-size: 0.95rem; margin-bottom: 1.5rem; }
              a { display: inline-block; background-color: #2563eb; color: white; padding: 0.625rem 1.25rem; font-weight: 500; text-decoration: none; border-radius: 6px; font-size: 0.9rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>404 - Short Code Not Found</h1>
              <p>The short link <strong>${code}</strong> is either invalid or has been deleted from our system.</p>
              <a href="/">Go to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    }

    // Expiration check
    if (urlItem.expiresAt && new Date(urlItem.expiresAt).getTime() < Date.now()) {
      urls.delete(code);
      cache.delete(code);
      return res.status(410).send(`
        <html>
          <head>
            <title>Link Expired</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f9fafb; color: #111827; }
              .card { text-align: center; padding: 2.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 450px; }
              h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #dc2626; }
              p { color: #4b5563; line-height: 1.5; font-size: 0.95rem; margin-bottom: 1.5rem; }
              a { display: inline-block; background-color: #2563eb; color: white; padding: 0.625rem 1.25rem; font-weight: 500; text-decoration: none; border-radius: 6px; font-size: 0.9rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Link Expired</h1>
              <p>This short link <strong>${code}</strong> has reached its custom expiration date and was automatically deleted.</p>
              <a href="/">Go to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    }

    // Cache Aside Logic simulation
    let cacheStatus: "HIT" | "MISS" = "MISS";
    let latencyMs = Math.floor(Math.random() * 40) + 15; // Database read latency: 15-55ms
    
    const now = Date.now();
    const cacheEntry = cache.get(code);

    if (cacheEntry && cacheEntry.expiresAt > now) {
      cacheStatus = "HIT";
      latencyMs = Math.floor(Math.random() * 3) + 1; // Redis latency: 1-3ms
      cacheHits++;
    } else {
      cacheMisses++;
      // Write database fetch back to Redis cache
      cache.set(code, {
        url: urlItem,
        expiresAt: now + 30000 // Cache for 30 seconds
      });
    }

    // Increment click count in Postgres-simulated DB
    urlItem.clicks++;

    // Extract user metadata from user-agent
    const userAgent = req.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
    const referer = req.headers["referer"];
    const parsedUa = parseUserAgent(userAgent, referer);

    // Random geographic lookup simulator
    const ipAddress = (req.headers["x-forwarded-for"] as string || req.ip || "127.0.0.1").split(",")[0].trim();
    const mockCountry = countries[Math.floor(Math.random() * countries.length)];

    // Background asynchronous logger (does not block redirect)
    setTimeout(() => {
      logs.push({
        timestamp: new Date().toISOString(),
        code,
        browser: parsedUa.browser,
        os: parsedUa.os,
        country: mockCountry,
        ip: ipAddress,
        referrer: parsedUa.referrer,
        device: parsedUa.device,
        cacheStatus,
        latencyMs
      });
    }, 5);

    // Perform HTTP Redirect
    res.redirect(urlItem.originalUrl);
  });

  // Scheduled Expiration Cleanup Route (callable by UI)
  app.post("/api/cleanup", (req, res) => {
    let deletedCount = 0;
    const now = Date.now();
    urls.forEach((u, code) => {
      if (u.expiresAt && new Date(u.expiresAt).getTime() < now) {
        urls.delete(code);
        cache.delete(code);
        deletedCount++;
      }
    });
    res.json({ message: "Cleanup completed successfully", deletedCount });
  });

  // Vite Integration for frontend asset serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
