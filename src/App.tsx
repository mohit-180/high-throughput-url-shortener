import { api } from "./api";
import React, { useState, useEffect, useMemo } from "react";
import { 
  motion, AnimatePresence 
} from "motion/react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  Link2, Flame, Trash2, Play, Database, Cpu, Layers, Globe, Chrome, Clock, Activity, 
  Terminal, FileText, CheckCircle2, AlertCircle, ExternalLink, Copy, Zap, BarChart3, 
  RefreshCw, Sliders, Download, BookOpen, ShieldCheck, Laptop, Tablet, Smartphone, ChevronRight
} from "lucide-react";

import { ShortUrl, AnalyticsLog, AnalyticsData, SystemStats, LoadTestResult } from "./types";
import { pythonFiles } from "./pythonData";
import FlowVisualizer from "./components/FlowVisualizer";
import LocustTester from "./components/LocustTester";
import StatsPanel from "./components/StatsPanel";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "visualizer" | "analytics" | "diagnostics" | "loadtester" | "repo" | "readme">("dashboard");
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Shortener form state
  const [formUrl, setFormUrl] = useState("");
  const [formCustomCode, setFormCustomCode] = useState("");
  const [formExpiryHours, setFormExpiryHours] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Repository state
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [repoCopied, setRepoCopied] = useState(false);

  // Poll intervals trigger sync
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 4000); // Live poll stats every 4s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
  try {
    const [urls, stats, analytics] = await Promise.all([
      api.getUrls(),
      api.getSystemStats(),
      api.getAnalytics(),
    ]);

    setUrls(urls);
    setStats(stats);
    setAnalytics(analytics);
  } catch (err) {
    console.error("Telemetry connection lost:", err);
  }
};

  const handleShortenSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setFormError(null);
  setFormSuccess(null);
  setFormLoading(true);

  try {
    const data = await api.shortenUrl({
      url: formUrl,
      custom_code: formCustomCode || undefined,
      expiry_hours: formExpiryHours
        ? Number(formExpiryHours)
        : undefined,
    });

    setFormSuccess(data.shortUrl);

    setFormUrl("");
    setFormCustomCode("");
    setFormExpiryHours("");

    await fetchData();
  } catch (err: any) {
    setFormError(err.message || "Something went wrong");
  } finally {
    setFormLoading(false);
  }
};

  const handleDeleteUrl = async (code: string) => {
  if (!confirm(`Are you sure you want to delete /r/${code}?`)) return;

  try {
    await api.deleteUrl(code);
    await fetchData();
  } catch (err) {
    console.error("Deletion failed:", err);
  }
};

  const handleManualPrune = async () => {
  try {
    const res = await fetch("/api/cleanup", {
      method: "POST",
    });

    const data = await res.json();

    alert(
      `Garbage collector executed! ${data.deletedCount} expired mappings pruned from database and cache.`
    );

    await fetchData();
  } catch (e) {
    console.error("Manual prune sweep failed:", e);
  }
};

  const handleMockRedirect = async (code: string) => {
  try {
    // Trigger the backend redirect endpoint (this increments clicks and records analytics)
    await fetch(`${import.meta.env.VITE_API_BASE_URL.replace("/api/v1", "")}/r/${code}`, {
      redirect: "manual",
    });

    // Refresh dashboard data
    await fetchData();

    // Get updated data from the API layer
    const updatedList = await api.getUrls();
    const analytics = await api.getAnalytics();

    const item = updatedList.find((u) => u.code === code);

    const mostRecentLog = analytics.recentClicks.find(
      (l: any) => l.code === code
    );

    return {
      cacheStatus: mostRecentLog?.cacheStatus ?? "MISS",
      code,
      url: item?.originalUrl ?? "https://www.google.com",
    };
  } catch (e) {
    console.error("Visual redirection trace error:", e);

    return {
      cacheStatus: "MISS" as const,
      code,
      url: "https://www.google.com",
    };
  }
};

  const handleRunLoadTest = async (concurrency: number, duration: number) => {
    const res = await fetch("/api/simulate-load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concurrency, durationSeconds: duration })
    });
    const data = await res.json();
    fetchData(); // Sync live graphs instantly
    return data;
  };

  // Color arrays for Recharts Pie
  const COLORS = ["#141414", "#404040", "#737373", "#a3a3a3", "#d4d4d4", "#b91c1c"];
console.log(urls);
  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans border-8 border-[#141414] selection:bg-[#141414] selection:text-white antialiased">
      {/* Premium Top Navigation Bar */}
      <header className="sticky top-0 bg-white border-b-4 border-[#141414] z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] text-white p-2 rounded-none border border-[#141414]">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tighter text-[#141414] leading-none font-mono uppercase">
                HIGH-THROUGHPUT DISTRIBUTED URL SHORTENER & ANALYTICS
              </h1>
              <span className="text-[10px] text-[#141414] font-mono tracking-widest uppercase block mt-1 opacity-70">
                Distributed Cache-Aside Demonstration Suite // Live Nodes Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-none bg-green-600 animate-pulse border border-[#141414]" />
            <span className="text-xs font-mono font-bold text-[#141414] uppercase tracking-wider">
              SANDBOX STATUS: ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1 flex flex-col gap-8">
        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-[#141414] gap-1 overflow-x-auto pb-px">
          {[
            { id: "dashboard", label: "Dashboard", icon: Link2 },
            { id: "visualizer", label: "Flow Visualizer", icon: Layers },
            { id: "analytics", label: "Analytics Charts", icon: BarChart3 },
            { id: "diagnostics", label: "Server Health", icon: Cpu },
            { id: "loadtester", label: "Locust Simulator", icon: Activity },
            { id: "repo", label: "Python Source Code", icon: Terminal },
            { id: "readme", label: "Documentation", icon: BookOpen }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-4 font-bold font-mono text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-none ${
                  active 
                    ? "border-[#141414] bg-[#141414] text-white" 
                    : "border-transparent text-[#141414] hover:bg-[#141414]/10"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-[#141414]"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Panel content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {/* TAB 1: DASHBOARD / LINK CREATOR */}
              {activeTab === "dashboard" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Input Form */}
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-white border-2 border-[#141414] rounded-none p-6 shadow-none text-[#141414] font-mono">
                      <h2 className="text-sm font-bold uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-[#141414] pb-2">
                        <Zap className="w-5 h-5 text-[#141414]" />
                        GENERATE SHORT CODE
                      </h2>

                      <form onSubmit={handleShortenSubmit} className="flex flex-col gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1.5">Target URL</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. https://github.com/trending"
                            value={formUrl}
                            onChange={(e) => setFormUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-[#141414] rounded-none text-xs bg-white focus:bg-[#E4E3E0] outline-none text-[#141414] font-mono uppercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1.5">Custom Alias (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. git-trending"
                            value={formCustomCode}
                            onChange={(e) => setFormCustomCode(e.target.value)}
                            className="w-full px-3 py-2 border border-[#141414] rounded-none text-xs bg-white focus:bg-[#E4E3E0] outline-none text-[#141414] font-mono uppercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#141414] uppercase mb-1.5">Custom Expiry (Hours - Optional)</label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="e.g. 24"
                            value={formExpiryHours}
                            onChange={(e) => setFormExpiryHours(e.target.value)}
                            className="w-full px-3 py-2 border border-[#141414] rounded-none text-xs bg-white focus:bg-[#E4E3E0] outline-none text-[#141414] font-mono uppercase"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={formLoading}
                          className="w-full bg-[#141414] hover:bg-white hover:text-[#141414] disabled:bg-slate-200 disabled:text-slate-400 text-white border-2 border-[#141414] font-bold py-2.5 rounded-none text-xs transition-all shadow-none flex items-center justify-center gap-2 cursor-pointer mt-2 uppercase"
                        >
                          {formLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Shortening Link...
                            </>
                          ) : (
                            "Generate Link"
                          )}
                        </button>
                      </form>

                      {/* Validation messages */}
                      {formSuccess && (
                        <div className="mt-5 p-4 bg-white border-2 border-green-600 text-green-700 text-xs rounded-none flex flex-col gap-2">
                          <p className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            URL shortened successfully!
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}${formSuccess}`}
                              className="w-full bg-white p-1.5 border border-[#141414] rounded-none text-[#141414] font-mono text-[10px]"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}${formSuccess}`);
                                alert("Copied shortened URL!");
                              }}
                              className="bg-[#141414] hover:bg-white hover:text-[#141414] text-white border border-[#141414] font-bold p-1.5 rounded-none transition-colors uppercase text-[10px] px-3"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      )}

                      {formError && (
                        <div className="mt-5 p-4 bg-white border-2 border-red-600 text-red-600 text-xs rounded-none font-mono flex items-center gap-2 uppercase">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <p className="font-bold leading-normal">{formError}</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#141414] border-2 border-[#141414] rounded-none p-5 shadow-none text-[#E4E3E0] font-mono">
                      <h3 className="font-bold text-white text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                        <Terminal className="w-4 h-4 text-white" />
                        REDIRECT CACHE ENGINE
                      </h3>
                      <p className="text-[#E4E3E0] opacity-80 text-xs leading-relaxed uppercase">
                        To test, click "Visit" on any link. The first visit queries PostgreSQL (Cache Miss). Subsequent visits resolve instantly in Redis (Cache Hit)!
                      </p>
                    </div>
                  </div>

                  {/* Right Column: URLs Index table */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white border-2 border-[#141414] rounded-none p-6 shadow-none overflow-hidden text-[#141414]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#141414] pb-4">
                        <div>
                          <h2 className="text-sm font-bold uppercase tracking-wider">Active Short URLs Database</h2>
                          <p className="text-xs font-mono opacity-60 mt-1 uppercase">Currently managed shortened URL mappings and click statistics.</p>
                        </div>
                        <button
                          onClick={handleManualPrune}
                          className="text-xs font-bold font-mono border-2 border-[#141414] bg-[#141414] text-white hover:bg-white hover:text-[#141414] px-4 py-2 rounded-none transition-colors cursor-pointer shrink-0 uppercase"
                        >
                          Trigger Manual Prune
                        </button>
                      </div>

                      {urls.length === 0 ? (
                        <div className="border border-dashed border-[#141414] rounded-none py-12 text-center p-6 bg-[#E4E3E0]/30 font-mono">
                          <Link2 className="w-10 h-10 text-[#141414] opacity-40 mx-auto mb-2" />
                          <h4 className="font-bold uppercase tracking-widest text-sm">No Short Codes Configured</h4>
                          <p className="opacity-60 text-xs max-w-xs mx-auto mt-1 uppercase">
                            Paste a long URL on the left panel to populate the database and pre-warm the Redis cache cluster.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs font-mono">
                            <thead>
                              <tr className="border-b-2 border-[#141414] text-[#141414] font-bold uppercase tracking-wider">
                                <th className="pb-3 pr-4">Code</th>
                                <th className="pb-3 pr-4">Destination URL</th>
                                <th className="pb-3 pr-4">Status</th>
                                <th className="pb-3 pr-4 text-right">Clicks</th>
                                <th className="pb-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {urls.map((u) => (
                                <tr key={u.code} className="border-b border-[#141414]/25 hover:bg-[#E4E3E0]/30 transition-colors">
                                  <td className="py-3 pr-4 font-mono font-bold text-[#141414] underline">
                                    <a 
                                      href={u.shortUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="hover:text-red-600 flex items-center gap-1"
                                    >
                                      {u.code}
                                      <ExternalLink className="w-3 h-3 text-[#141414]" />
                                    </a>
                                  </td>
                                  <td className="py-3 pr-4 max-w-[200px] truncate text-[#141414] opacity-80 font-mono text-[11px]">
                                    {u.originalUrl}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <div className="flex gap-1.5 items-center">
                                      <span className={`w-2.5 h-2.5 rounded-none border border-[#141414] ${u.isCached ? "bg-green-500 animate-pulse" : "bg-white"}`} />
                                      <span className="font-bold text-[10px] uppercase text-[#141414]">
                                        {u.isCached ? "REDIS CACHED" : "POSTGRES ONLY"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 pr-4 text-right font-bold text-[#141414]">
                                    {u.clicks.toLocaleString()}
                                  </td>
                                  <td className="py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={async () => {
    const result = await handleMockRedirect(u.code);

    window.open(result.url, "_blank");

    alert("Visually redirected! Telemetry processed in background.");
}}
                                        className="text-[10px] bg-[#141414] hover:bg-white hover:text-[#141414] text-white border border-[#141414] px-3 py-1 rounded-none transition-all cursor-pointer font-mono font-bold uppercase"
                                      >
                                        Visit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUrl(u.code)}
                                        className="text-[#141414] hover:bg-red-600 hover:text-white border border-transparent hover:border-[#141414] p-1.5 rounded-none transition-all cursor-pointer"
                                        title="Delete URL and evict cache key"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SYSTEM ARCHITECTURE FLOW VISUALIZER */}
              {activeTab === "visualizer" && (
                <div className="flex flex-col gap-6">
                  <FlowVisualizer 
                    onMockRedirect={handleMockRedirect}
                    activeLinks={urls.map(u => ({ code: u.code, originalUrl: u.originalUrl }))}
                  />
                </div>
              )}

              {/* TAB 3: REAL-TIME ANALYTICS DASHBOARD */}
              {activeTab === "analytics" && (
                <div className="flex flex-col gap-6">
                  {analytics && analytics.summary.totalClicks > 0 ? (
                    <>
                      {/* Telemetry Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Aggregate Visits</span>
                          <p className="text-2xl font-bold mt-1">{analytics.summary.totalClicks.toLocaleString()}</p>
                        </div>
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">In-Memory Hits</span>
                          <p className="text-2xl font-bold text-green-600 mt-1">{analytics.summary.cacheHits.toLocaleString()}</p>
                        </div>
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Storage Misses</span>
                          <p className="text-2xl font-bold text-red-600 mt-1">{analytics.summary.cacheMisses.toLocaleString()}</p>
                        </div>
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Avg Gateway Latency</span>
                          <p className="text-2xl font-bold mt-1">{analytics.summary.averageLatencyMs} <span className="text-xs font-normal opacity-55">ms</span></p>
                        </div>
                      </div>

                      {/* Primary timeline graph */}
                      <div className="bg-white border-2 border-[#141414] rounded-none p-6 shadow-none text-[#141414] font-mono">
                        <h3 className="text-xs font-bold font-mono text-[#141414] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-[#141414] pb-2">
                          <Clock className="w-4 h-4 text-[#141414]" />
                          Inbound Redirect Pipeline Timeline (Aggregate)
                        </h3>
                        <div className="h-[280px] w-full font-mono">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.timeline}>
                              <defs>
                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#141414" stopOpacity={0.15}/>
                                  <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.15}/>
                                  <stop offset="95%" stopColor="#b91c1c" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#141414" strokeOpacity={0.2} />
                              <XAxis dataKey="time" stroke="#141414" fontSize={10} tickLine={false} />
                              <YAxis stroke="#141414" fontSize={10} tickLine={false} />
                              <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#E4E3E0', color: '#141414' }} />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                              <Area type="monotone" dataKey="clicks" stroke="#141414" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" name="Total Request Clicks" />
                              <Area type="monotone" dataKey="cacheHits" stroke="#b91c1c" strokeWidth={2} fillOpacity={1} fill="url(#colorHits)" name="Cache Hits" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Group distributions */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Devices */}
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <h4 className="text-xs font-bold font-mono text-[#141414] uppercase mb-4 flex items-center gap-1.5 border-b border-[#141414] pb-2">
                            <Laptop className="w-4 h-4 text-[#141414]" /> Client Devices
                          </h4>
                          <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analytics.devices}
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {analytics.devices.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#E4E3E0' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* OS */}
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <h4 className="text-xs font-bold font-mono text-[#141414] uppercase mb-4 flex items-center gap-1.5 border-b border-[#141414] pb-2">
                            <Cpu className="w-4 h-4 text-[#141414]" /> Operating Systems
                          </h4>
                          <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analytics.os}
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {analytics.os.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#E4E3E0' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Referrers */}
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <h4 className="text-xs font-bold font-mono text-[#141414] uppercase mb-4 flex items-center gap-1.5 border-b border-[#141414] pb-2">
                            <Globe className="w-4 h-4 text-[#141414]" /> Referrers Origin
                          </h4>
                          <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analytics.referrers}
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {analytics.referrers.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#E4E3E0' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Geographic Demographics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <h4 className="text-xs font-bold font-mono text-[#141414] uppercase mb-4 border-b border-[#141414] pb-2">Traffic Country Breakdown</h4>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analytics.countries} layout="vertical">
                                <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#141414" strokeOpacity={0.2} />
                                <XAxis type="number" stroke="#141414" fontSize={9} tickLine={false} />
                                <YAxis dataKey="name" type="category" stroke="#141414" fontSize={9} tickLine={false} />
                                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#E4E3E0' }} />
                                <Bar dataKey="value" fill="#141414" radius={0} barSize={12} name="Traffic Clicks" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Browsers */}
                        <div className="bg-white border-2 border-[#141414] rounded-none p-5 shadow-none text-[#141414] font-mono">
                          <h4 className="text-xs font-bold font-mono text-[#141414] uppercase mb-4 border-b border-[#141414] pb-2">Browsers Distribution</h4>
                          <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analytics.browsers}>
                                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#141414" strokeOpacity={0.2} />
                                <XAxis dataKey="name" stroke="#141414" fontSize={9} tickLine={false} />
                                <YAxis stroke="#141414" fontSize={9} tickLine={false} />
                                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#E4E3E0' }} />
                                <Bar dataKey="value" fill="#b91c1c" radius={0} barSize={20} name="Visits" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Live click telemetry log entries */}
                      <div className="bg-white border-2 border-[#141414] rounded-none p-6 shadow-none text-[#141414] font-mono">
                        <h3 className="text-sm font-bold font-mono uppercase tracking-widest mb-5 border-b border-[#141414] pb-2">Recent Telemetry Click Logs</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px] font-mono">
                            <thead>
                              <tr className="border-b-2 border-[#141414] text-[#141414] font-bold uppercase tracking-wider">
                                <th className="pb-3 pr-4">Timestamp</th>
                                <th className="pb-3 pr-4">Code</th>
                                <th className="pb-3 pr-4">Country</th>
                                <th className="pb-3 pr-4">Device / OS</th>
                                <th className="pb-3 pr-4">Referrer</th>
                                <th className="pb-3 pr-4">IP Address</th>
                                <th className="pb-3 pr-4">Cache</th>
                                <th className="pb-3 text-right">Latency</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.recentClicks.map((log, i) => (
                                <tr key={i} className="border-b border-[#141414]/20 hover:bg-[#E4E3E0]/30 transition-colors font-mono">
                                  <td className="py-2.5 pr-4 text-[#141414] opacity-70 font-mono">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                  </td>
                                  <td className="py-2.5 pr-4 font-bold text-[#141414] font-mono">
                                    {log.code}
                                  </td>
                                  <td className="py-2.5 pr-4 font-bold text-[#141414]">
                                    {log.country}
                                  </td>
                                  <td className="py-2.5 pr-4 text-[#141414] opacity-80">
                                    {log.device} • {log.os} ({log.browser})
                                  </td>
                                  <td className="py-2.5 pr-4 text-[#141414] opacity-60">
                                    {log.referrer}
                                  </td>
                                  <td className="py-2.5 pr-4 font-mono text-[10px] text-[#141414] opacity-80">
                                    {log.ip}
                                  </td>
                                  <td className="py-2.5 pr-4">
                                    <span className="px-1.5 py-0.5 rounded-none text-[9px] font-bold border border-[#141414] bg-white text-[#141414] uppercase">
                                      {log.cacheStatus}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right font-bold font-mono text-[#141414]">
                                    {log.latencyMs} ms
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="border border-dashed border-[#141414] rounded-none py-16 text-center p-6 bg-white shadow-none flex flex-col items-center font-mono">
                      <BarChart3 className="w-12 h-12 text-[#141414] opacity-40 mb-3" />
                      <h4 className="font-bold uppercase tracking-widest text-sm text-[#141414]">No Analytics Logs Found</h4>
                      <p className="text-[#141414] opacity-60 text-xs max-w-xs mt-1 uppercase">
                        Trigger redirection paths by clicking "Visit" next to any URL mapping in the dashboard to generate analytics telemetry.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SYSTEM DIAGNOSTICS & TELEMETRY */}
              {activeTab === "diagnostics" && (
                <StatsPanel stats={stats} onRunCleanup={handleManualPrune} />
              )}

              {/* TAB 5: LOCUST LOAD TEST SIMULATOR */}
              {activeTab === "loadtester" && (
                <LocustTester onRunTest={handleRunLoadTest} />
              )}

              {/* TAB 6: PYTHON REPOSITORY EXPLORER */}
              {activeTab === "repo" && (
                <div className="bg-white border-2 border-[#141414] rounded-none overflow-hidden shadow-none flex flex-col md:flex-row min-h-[580px]">
                  {/* Repo Sidebar */}
                  <div className="md:w-64 border-r-2 border-[#141414] p-4 bg-[#E4E3E0] flex flex-col gap-4 text-[#141414] font-mono">
                    <div>
                      <h3 className="font-bold text-[#141414] text-xs uppercase tracking-widest">Repository Tree</h3>
                      <p className="text-[10px] opacity-60 mt-0.5 uppercase">Explore complete Python backend modules</p>
                    </div>

                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[500px]">
                      {pythonFiles.map((f, i) => (
                        <button
                          key={f.path}
                          onClick={() => {
                            setSelectedFileIdx(i);
                            setRepoCopied(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-none text-xs font-bold font-mono flex items-center justify-between transition-colors border border-transparent cursor-pointer ${
                            selectedFileIdx === i
                              ? "bg-[#141414] text-white border-[#141414]"
                              : "text-[#141414] hover:bg-white"
                          }`}
                        >
                          <span className="truncate flex items-center gap-1.5 font-mono">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            {f.name}
                          </span>
                          <span className="text-[9px] uppercase border border-[#141414] px-1 rounded-none bg-white text-[#141414] shrink-0 scale-90">
                            {f.category}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-auto border-t border-[#141414] pt-4 flex flex-col gap-2">
                      <p className="text-[9px] opacity-70 leading-normal uppercase">
                        All files exist physically inside the <code>/python_backend</code> directory of this workspace and are complete.
                      </p>
                    </div>
                  </div>

                  {/* Code Viewer Workspace */}
                  <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b-2 border-[#141414] bg-white flex items-center justify-between font-mono text-[#141414]">
                      <div>
                        <span className="text-[10px] uppercase font-bold opacity-60">File Path</span>
                        <p className="font-mono text-xs font-bold text-[#141414] mt-0.5">
                          python_backend/{pythonFiles[selectedFileIdx].path}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pythonFiles[selectedFileIdx].code);
                          setRepoCopied(true);
                          setTimeout(() => setRepoCopied(false), 2000);
                        }}
                        className="text-xs font-bold bg-[#141414] hover:bg-white hover:text-[#141414] border-2 border-[#141414] text-white px-4 py-2 rounded-none transition-colors flex items-center gap-1.5 cursor-pointer uppercase"
                      >
                        {repoCopied ? (
                          <>
                            <CheckCircle2 className="w-4.5 h-4.5 text-white hover:text-[#141414]" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy File
                          </>
                        )}
                      </button>
                    </div>

                    {/* Editor */}
                    <div className="flex-1 p-6 bg-[#141414] text-[#E4E3E0] font-mono text-xs leading-relaxed overflow-auto max-h-[500px]">
                      <pre className="font-mono text-[11px] select-text">
                        <code>{pythonFiles[selectedFileIdx].code}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: SYSTEM ARCHITECTURE & DOCUMENTATION */}
              {activeTab === "readme" && (
                <div className="bg-white border-2 border-[#141414] rounded-none p-8 shadow-none max-w-4xl mx-auto text-[#141414]">
                  <article className="prose max-w-none text-[#141414] leading-relaxed text-sm">
                    <div className="flex items-center gap-3 pb-6 border-b-2 border-[#141414] mb-6 font-mono">
                      <div className="bg-[#E4E3E0] text-[#141414] p-2.5 rounded-none border border-[#141414]">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold uppercase tracking-tighter text-[#141414] mb-0">Production Blueprint & Documentation</h2>
                        <p className="text-xs opacity-60 mt-1 uppercase">Written to meet architectural standards of Google, Meta, and Amazon technical leaders</p>
                      </div>
                    </div>

                    <h3 className="text-base font-bold font-mono uppercase tracking-widest mt-8 mb-4 border-b border-[#141414] pb-1">1. High-Performance Design Matrix</h3>
                    <p className="font-sans">
                      Our primary objective was to build a system where the redirection latency stays close to zero (less than 1ms). This is achieved by utilizing the <strong>Cache-Aside (or Lazy Load)</strong> design pattern on top of a single-threaded asynchronous web engine.
                    </p>
                    <p className="font-sans">
                      Instead of querying relational PostgreSQL indexes on every HTTP request, targets are fetched directly from <strong>Redis RAM buckets</strong>. This mitigates heavy disk I/O, prevents the database connection pools from saturating under high concurrency, and allows standard virtual machines to scale up dynamically.
                    </p>

                    <h3 className="text-base font-bold font-mono uppercase tracking-widest mt-8 mb-4 border-b border-[#141414] pb-1">2. Database Schema Normalized Design</h3>
                    <p className="font-sans">
                      The database uses a normalized PostgreSQL schema consisting of two primary tables linked via foreign key cascade constraints:
                    </p>
                    <ul className="list-disc list-inside flex flex-col gap-1.5 pl-4 font-mono text-xs uppercase py-2">
                      <li>
                        <strong>url_mappings</strong>: Maps shortened Base62 codes to full destination URLs, tracking creation timestamps, clicks, and optional custom expiration Dates.
                      </li>
                      <li>
                        <strong>analytics_events</strong>: Stores structured visitor logs including browser, country, operating system, IP address, referral hostname, device, cache status, and transaction latency.
                      </li>
                    </ul>
                    <p className="font-sans">
                      To maximize query lookup speeds, an explicit <strong>B-Tree Index</strong> is initialized on the <code>short_code</code> primary key column.
                    </p>

                    <h3 className="text-base font-bold font-mono uppercase tracking-widest mt-8 mb-4 border-b border-[#141414] pb-1">3. Local Terminal Installation Commands</h3>
                    <p className="font-sans">
                      To download, install, migrate, and execute this codebase locally:
                    </p>
                    <div className="bg-[#141414] text-[#E4E3E0] font-mono text-xs p-5 rounded-none my-4 select-all leading-relaxed whitespace-pre-wrap border border-[#141414]">
{`# 1. Clone the repository tree
git clone https://github.com/example/url-shortener.git
cd url-shortener/python_backend

# 2. Spin up a virtual environment and load libraries
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# 3. Migrate PostgreSQL schemas via Alembic
alembic upgrade head

# 4. Bootstrap the async server on local host
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`}
                    </div>

                    <h3 className="text-base font-bold font-mono uppercase tracking-widest mt-8 mb-4 border-b border-[#141414] pb-1">4. Docker Swarm Quickstart</h3>
                    <p className="font-sans">
                      To build and deploy the complete microservice with its networked instances (FastAPI, Redis, and PostgreSQL) automatically:
                    </p>
                    <div className="bg-[#141414] text-[#E4E3E0] font-mono text-xs p-5 rounded-none my-4 select-all leading-relaxed border border-[#141414]">
{`# Build and launch all container nodes
docker compose up --build -d

# Check live cluster health logs
docker compose logs -f fastapi`}
                    </div>
                  </article>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-4 border-[#141414] py-6 mt-12 text-center text-xs text-[#141414] font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="uppercase tracking-wider">
            PORTFOLIO SHOWCASE: <strong>HIGH THROUGHPUT URL SHORTENER AND ANALYTICS ENGINE</strong>.
          </p>
          <div className="flex gap-4 justify-center uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              PRODUCTION READY
            </span>
            <span className="text-slate-300">|</span>
            <span>TypeScript / React / Python 3.13 / FastAPI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
