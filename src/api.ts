import { AnalyticsData, ShortUrl, SystemStats } from "./types";

const API_BASE = "http://127.0.0.1:8000/api/v1";

/**
 * Convert snake_case -> camelCase
 */
function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Recursively convert all object keys
 */
function camelize(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(camelize);
    }

    if (obj !== null && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
                toCamelCase(key),
                camelize(value),
            ])
        );
    }

    return obj;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const data = await response.json();

    return camelize(data) as T;
}

export const api = {
    getUrls: () =>
        request<ShortUrl[]>("/urls"),

    getAnalytics: async () => {
    const a = await request<any>("/analytics");

    return {
        summary: {
            totalClicks: a.summary.totalClicks,
            cacheHits: a.summary.cacheHits,
            cacheMisses: a.summary.cacheMisses,
            averageLatencyMs: a.summary.averageLatency,
        },

        timeline: a.clickTimeline.map((x: any) => ({
            time: x.date,
            clicks: x.clicks,
            cacheHits: a.summary.cacheHits,
        })),

        browsers: a.browserDistribution,

        os: a.osDistribution,

        countries: a.countryDistribution,

        devices: a.deviceDistribution,

        // Backend doesn't provide referrer distribution yet
        referrers: [],

        recentClicks: a.recentClicks.map((log: any) => ({
            ...log,
            device: log.deviceType,
            ip: log.ipAddress,
        })),
    };
},

    getSystemStats: async () => {
    const stats = await request<any>("/system/stats");

    return {
        database: {
            totalRecords: stats.database.totalRecords,
            sizeMb: 0,
            avgQueryTimeMs: 0,
            pool: {
                active: stats.database.activeConnections,
                idle: stats.database.idleConnections,
                max: stats.database.maxConnections,
            },
        },

        cache: {
            activeKeys: 0,
            memoryKb: 0,
            hitRatio: stats.cache.hitRatioPercent,
            hits: stats.cache.hits,
            misses: stats.cache.misses,
            evictionPolicy: "allkeys-lru",
            avgResponseTimeMs: 1,
        },
    };
},

    shortenUrl: (body: {
        url: string;
        custom_code?: string;
        expiry_hours?: number;
    }) =>
        request<ShortUrl>("/shorten", {
            method: "POST",
            body: JSON.stringify(body),
        }),

    deleteUrl: (code: string) =>
        request(`/urls/${code}`, {
            method: "DELETE",
        }),
};