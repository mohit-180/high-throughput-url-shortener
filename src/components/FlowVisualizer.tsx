import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Laptop, Network, Cpu, Database, Zap, Activity, Layers, Play 
} from "lucide-react";

interface FlowVisualizerProps {
  onMockRedirect: (code: string) => Promise<{ cacheStatus: "HIT" | "MISS"; code: string; url: string }>;
  activeLinks: { code: string; originalUrl: string }[];
}

export default function FlowVisualizer({ onMockRedirect, activeLinks }: FlowVisualizerProps) {
  const [selectedCode, setSelectedCode] = useState("");
  const [animationState, setAnimationState] = useState<"IDLE" | "ROUTING" | "CHECKING_CACHE" | "CACHE_HIT" | "CACHE_MISS" | "QUERY_DB" | "WRITE_CACHE" | "ASYNC_LOGGING" | "COMPLETED">("IDLE");
  const [statusText, setStatusText] = useState("SYSTEM IDLE. SELECT A MAPPED LINK TO TRACE DISPATCH TELEMETRY.");
  const [cacheResult, setCacheResult] = useState<"HIT" | "MISS" | null>(null);

  const handleStartSim = async () => {
    const code = selectedCode || (activeLinks.length > 0 ? activeLinks[0].code : "");
    if (!code) {
      setStatusText("ERROR // NO ACTIVE URL MAPPINGS DETECTED IN POSTGRES DATABASE.");
      return;
    }

    try {
      // Step 1: Routing via proxy
      setAnimationState("ROUTING");
      setStatusText(`[NGINX-PROXY] INCOMING REQUEST FOR /R/${code} -> FORWARDING TO PORT 3000 CLUSTER...`);
      setCacheResult(null);

      await new Promise(r => setTimeout(r, 800));

      // Step 2: FastAPI checks Cache
      setAnimationState("CHECKING_CACHE");
      setStatusText(`[FASTAPI-APP] ROUTER HASH KEY MATCH: 'URL:${code}' -> LOOKUP IN-MEMORY CACHE...`);

      await new Promise(r => setTimeout(r, 700));

      // Fetch actual redirect from backend
      const res = await onMockRedirect(code);
      setCacheResult(res.cacheStatus);

      if (res.cacheStatus === "HIT") {
        setAnimationState("CACHE_HIT");
        setStatusText(`⚡ [REDIS-HIT] CODE '${code}' FOUND IN VOLATILE RAM (0.2ms). DISPATCHING CLIENT REDIRECT TO CLIENT...`);
        
        await new Promise(r => setTimeout(r, 1000));
        
        // Spawn Background tasks
        setAnimationState("ASYNC_LOGGING");
        setStatusText(`[ASYNC-LOGGER] REDIRECT SENT (302 FOUND). DISPATCHED TASK QUEUE WORKER TO INCREMENT METRICS HISTOGRAM...`);
        
        await new Promise(r => setTimeout(r, 900));
        setAnimationState("COMPLETED");
        setStatusText(`✓ REDIRECT TO ${res.url} COMPLETED IN 0.8ms (REDIS HIT CACHE-ASIDE).`);
      } else {
        setAnimationState("CACHE_MISS");
        setStatusText(`⚠️ [REDIS-MISS] KEY 'URL:${code}' NOT PRESENT IN VOLATILE RAM. INITIATING PERSISTENT DB SCAN...`);
        
        await new Promise(r => setTimeout(r, 1000));

        // Postgres Query
        setAnimationState("QUERY_DB");
        setStatusText(`[POSTGRES-SQL] EXECUTING EXPLAIN ANALYZE ON B-TREE INDEX 'IDX_URLS_CODE' FOR '${code}' (18ms)...`);

        await new Promise(r => setTimeout(r, 1000));

        // Write Back cache
        setAnimationState("WRITE_CACHE");
        setStatusText(`[CACHE-ASIDE-BACKFILL] BACKFILLING KEY 'URL:${code}' IN REDIS MEMORY NODES WITH 300s TTL...`);

        await new Promise(r => setTimeout(r, 900));

        // Asynchronous logger
        setAnimationState("ASYNC_LOGGING");
        setStatusText(`[ASYNC-LOGGER] REDIRECT DISPATCHED TO CLIENT. RELEASING WORKER THREAD FOR METRICS LOGGING...`);

        await new Promise(r => setTimeout(r, 1000));
        setAnimationState("COMPLETED");
        setStatusText(`✓ REDIRECT TO ${res.url} COMPLETED IN 22ms (POSTGRES INDEX QUERY + REDIS CACHE BACKFILL).`);
      }
    } catch (e: any) {
      setStatusText(`REDirection Error: ${e.message || e}`);
      setAnimationState("IDLE");
    }
  };

  const isNodeActive = (nodeName: string): boolean => {
    switch (nodeName) {
      case "CLIENT":
        return true;
      case "NGINX":
        return animationState !== "IDLE";
      case "FASTAPI":
        return ["CHECKING_CACHE", "CACHE_HIT", "CACHE_MISS", "WRITE_CACHE", "ASYNC_LOGGING", "COMPLETED"].includes(animationState);
      case "REDIS":
        return ["CHECKING_CACHE", "CACHE_HIT", "WRITE_CACHE"].includes(animationState) || animationState === "CACHE_MISS";
      case "DB":
        return animationState === "QUERY_DB" || animationState === "WRITE_CACHE";
      case "WORKER":
        return animationState === "ASYNC_LOGGING";
      default:
        return false;
    }
  };

  const getNodeStyle = (nodeName: string): string => {
    const active = isNodeActive(nodeName);
    if (active) {
      return "bg-[#141414] text-white border-[#141414] scale-105 shadow-[4px_4px_0px_0px_rgba(20,20,20,0.15)]";
    }
    return "bg-white text-[#141414] border-[#141414] opacity-50";
  };

  return (
    <div className="bg-white rounded-none border border-[#141414] p-6 shadow-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#141414]">
        <div>
          <h2 className="text-xl font-bold text-[#141414] flex items-center gap-2 font-mono uppercase tracking-tighter">
            <Layers className="w-5 h-5 text-[#141414]" />
            DISTRIBUTED FLOW VISUALIZER // LOGIC TRACE
          </h2>
          <p className="text-xs font-mono opacity-60 mt-1 uppercase">
            Observe connection-pooling, caching logic, and asynchronous telemetry queues in action.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            disabled={animationState !== "IDLE" && animationState !== "COMPLETED"}
            className="px-3 py-2 bg-white border border-[#141414] rounded-none text-xs font-mono text-[#141414] outline-none focus:bg-[#E4E3E0] uppercase"
          >
            {activeLinks.length === 0 && <option value="">No Active links</option>}
            {activeLinks.map(link => (
              <option key={link.code} value={link.code}>
                /r/{link.code} ({link.originalUrl.substring(0, 15)}...)
              </option>
            ))}
          </select>

          <button
            onClick={handleStartSim}
            disabled={activeLinks.length === 0 || (animationState !== "IDLE" && animationState !== "COMPLETED")}
            className="flex items-center gap-2 bg-[#141414] hover:bg-white hover:text-[#141414] disabled:bg-slate-100 disabled:text-slate-400 text-white border border-[#141414] font-mono font-bold text-xs px-4 py-2 rounded-none transition-colors cursor-pointer uppercase"
          >
            <Play className="w-4 h-4 fill-current" />
            Trace Redirection
          </button>
        </div>
      </div>

      {/* Interactive Flowchart Diagram */}
      <div className="relative bg-[#E4E3E0] border border-[#141414] rounded-none p-8 min-h-[420px] flex flex-col justify-between overflow-hidden">
        {/* Connection Link Paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          {/* Client -> Nginx path */}
          <path d="M 120,80 L 260,80" stroke="#141414" strokeWidth="2" strokeDasharray="4 4" fill="none" />
          {/* Nginx -> FastAPI path */}
          <path d="M 380,80 L 510,80" stroke="#141414" strokeWidth="2" fill="none" />
          {/* FastAPI -> Redis path */}
          <path d="M 570,120 L 570,190" stroke="#141414" strokeWidth="2" fill="none" />
          {/* Redis -> DB path (Cache Miss path) */}
          <path d="M 510,230 L 380,230" stroke="#141414" strokeWidth="2" fill="none" />
          {/* FastAPI -> Background Worker (Async task queue path) */}
          <path d="M 630,80 C 720,80 720,230 630,230" stroke="#141414" strokeWidth="2" strokeDasharray="4 4" fill="none" />

          {/* Animating Particles */}
          <AnimatePresence>
            {animationState === "ROUTING" && (
              <motion.circle
                cx={120} cy={80} r="6" fill="#141414"
                animate={{ cx: [120, 260] }}
                transition={{ duration: 0.8, ease: "linear" }}
              />
            )}
            {animationState === "CHECKING_CACHE" && (
              <motion.circle
                cx={570} cy={120} r="6" fill="#b91c1c"
                animate={{ cy: [120, 190] }}
                transition={{ duration: 0.7, ease: "linear" }}
              />
            )}
            {animationState === "CACHE_HIT" && (
              <motion.circle
                cx={570} cy={190} r="6" fill="#16a34a"
                animate={{ cy: [190, 120] }}
                transition={{ duration: 0.6, ease: "linear" }}
              />
            )}
            {animationState === "CACHE_MISS" && (
              <motion.circle
                cx={570} cy={230} r="6" fill="#b91c1c"
                animate={{ cx: [570, 510] }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            )}
            {animationState === "QUERY_DB" && (
              <motion.circle
                cx={510} cy={230} r="6" fill="#b91c1c"
                animate={{ cx: [510, 380] }}
                transition={{ duration: 1.0, ease: "linear" }}
              />
            )}
            {animationState === "WRITE_CACHE" && (
              <motion.circle
                cx={380} cy={230} r="6" fill="#16a34a"
                animate={{ cx: [380, 510] }}
                transition={{ duration: 0.9, ease: "linear" }}
              />
            )}
            {animationState === "ASYNC_LOGGING" && (
              <motion.circle
                cx={630} cy={80} r="5" fill="#141414"
                animate={{ 
                  cx: [630, 715, 630],
                  cy: [80, 155, 230]
                }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
        </svg>

        {/* Row 1: Request Gateway */}
        <div className="flex justify-between items-center z-10">
          {/* Client Node */}
          <div className="flex flex-col items-center">
            <div className={`p-4 flex flex-col items-center justify-center w-28 h-24 border-2 transition-all duration-300 font-mono ${getNodeStyle("CLIENT")}`}>
              <Laptop className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-bold uppercase">Client Browser</span>
            </div>
            <span className="text-[9px] font-mono opacity-50 uppercase mt-1">HTTP GET</span>
          </div>

          {/* Nginx Node */}
          <div className="flex flex-col items-center">
            <div className={`p-4 flex flex-col items-center justify-center w-28 h-24 border-2 transition-all duration-300 font-mono ${getNodeStyle("NGINX")}`}>
              <Network className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-bold uppercase">Nginx Cluster</span>
            </div>
            <span className="text-[9px] font-mono opacity-50 uppercase mt-1">Reverse Proxy</span>
          </div>

          {/* FastAPI Node */}
          <div className="flex flex-col items-center">
            <div className={`p-4 flex flex-col items-center justify-center w-28 h-24 border-2 transition-all duration-300 font-mono ${getNodeStyle("FASTAPI")}`}>
              <Cpu className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-bold uppercase">FastAPI App</span>
            </div>
            <span className="text-[9px] font-mono opacity-50 uppercase mt-1">Async Router</span>
          </div>
        </div>

        {/* Row 2: In-Memory / Worker Cache Layer */}
        <div className="flex justify-between items-center z-10 mt-12">
          {/* Postgres SQL Node */}
          <div className="flex flex-col items-center">
            <div className={`p-4 flex flex-col items-center justify-center w-28 h-24 border-2 transition-all duration-300 font-mono ${getNodeStyle("DB")}`}>
              <Database className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-bold uppercase">Postgres DB</span>
            </div>
            <span className="text-[9px] font-mono opacity-50 uppercase mt-1">System of Record</span>
          </div>

          {/* Redis Caching Node */}
          <div className="flex flex-col items-center">
            <div className={`p-4 flex flex-col items-center justify-center w-28 h-24 border-2 transition-all duration-300 relative font-mono ${getNodeStyle("REDIS")}`}>
              <Zap className="w-8 h-8 mb-1 fill-current" />
              <span className="text-[10px] font-bold uppercase">Redis RAM</span>
              {cacheResult && (
                <span className="absolute -top-2.5 -right-2 px-1.5 py-0.5 text-[8px] font-bold border border-[#141414] bg-white text-[#141414] uppercase">
                  CACHE-{cacheResult}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono opacity-50 uppercase mt-1">volatile-lru</span>
          </div>

          {/* Background Telemetry Worker */}
          <div className="flex flex-col items-center">
            <div className={`p-4 flex flex-col items-center justify-center w-28 h-24 border-2 transition-all duration-300 font-mono ${getNodeStyle("WORKER")}`}>
              <Activity className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-bold uppercase">Telemetry Queue</span>
            </div>
            <span className="text-[9px] font-mono opacity-50 uppercase mt-1">Worker Worker</span>
          </div>
        </div>
      </div>

      {/* Progress Telemetry Console Logs */}
      <div className="mt-4 bg-[#141414] text-[#E4E3E0] font-mono text-xs p-4 rounded-none border border-[#141414] min-h-[60px] flex items-center">
        <div className="flex items-center gap-3 w-full">
          <span className="w-2 h-2 rounded-none bg-green-500 animate-pulse shrink-0" />
          <p className="leading-relaxed font-mono uppercase tracking-wider text-green-400">{statusText}</p>
        </div>
      </div>
    </div>
  );
}
