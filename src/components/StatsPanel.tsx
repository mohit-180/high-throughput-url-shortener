import React from "react";
import { 
  Database, Zap 
} from "lucide-react";
import { SystemStats } from "../types";

interface StatsPanelProps {
  stats: SystemStats | null;
  onRunCleanup: () => Promise<void>;
}

export default function StatsPanel({ stats, onRunCleanup }: StatsPanelProps) {
  if (!stats) {
    return (
      <div className="flex justify-center items-center h-48 border border-[#141414] bg-white rounded-none">
        <span className="text-[#141414] text-xs font-mono animate-pulse uppercase tracking-widest">Retrieving live performance telemetry...</span>
      </div>
    );
  }

  const { database, cache } = stats;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* PostgreSQL Diagnostics */}
      <div className="bg-white rounded-none border border-[#141414] p-6 shadow-none flex flex-col justify-between text-[#141414]">
        <div>
          <div className="flex justify-between items-start mb-6 border-b border-[#141414] pb-4">
            <div>
              <h3 className="text-lg font-bold tracking-tighter uppercase font-mono flex items-center gap-2 text-[#141414]">
                <Database className="w-5 h-5 text-[#141414]" />
                POSTGRES-DB // CLUSTER-HEALTH
              </h3>
              <p className="text-xs font-mono opacity-60 mt-1 uppercase">Durable SQL system of record (Connection Pooled)</p>
            </div>
            <span className="border border-[#141414] bg-white text-[#141414] text-[10px] font-mono font-bold px-2 py-1 rounded-none uppercase">
              99.8% Index Coverage
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#E4E3E0] rounded-none border border-[#141414] p-4 font-mono">
              <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">Total URL Records</span>
              <p className="text-2xl font-mono font-bold text-[#141414]">{database.totalRecords}</p>
            </div>
            <div className="bg-[#E4E3E0] rounded-none border border-[#141414] p-4 font-mono">
              <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">Total DB Footprint</span>
              <p className="text-2xl font-mono font-bold text-[#141414]">{database.sizeMb} MB</p>
            </div>
          </div>

          <div className="border-t border-[#141414] pt-5 flex flex-col gap-4">
            <h4 className="text-xs font-bold font-mono uppercase tracking-widest opacity-60 mb-2">Connection Pooling Allocations</h4>
            
            {/* Connection Pool Visualizer */}
            <div className="font-mono text-xs">
              <div className="flex justify-between text-xs text-[#141414] mb-2 font-mono">
                <span>Active Connections ({database.pool.active})</span>
                <span>Max Capacity ({database.pool.max})</span>
              </div>
              <div className="w-full bg-[#E4E3E0] border border-[#141414] h-3 rounded-none overflow-hidden flex">
                <div 
                  className="bg-[#141414] h-full" 
                  style={{ width: `${(database.pool.active / database.pool.max) * 100}%` }}
                />
                <div 
                  className="bg-[#141414]/30 h-full" 
                  style={{ width: `${(database.pool.idle / database.pool.max) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-[10px] font-mono text-[#141414] justify-end">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#141414]" /> Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#141414]/30" /> Idle ({database.pool.idle})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono text-[#141414] pt-4 border-t border-[#141414]">
              <div className="flex justify-between">
                <span className="opacity-60 uppercase text-[10px]">Query Engine:</span>
                <span className="font-bold">asyncpg (Async)</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60 uppercase text-[10px]">Avg Read Latency:</span>
                <span className="font-bold">{database.avgQueryTimeMs} ms</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#141414] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <p className="text-[10px] text-[#141414] opacity-75 leading-normal max-w-xs uppercase">
            Pruning sweeps automatically run every hour in the background, deleting expired links. Trigger a manual sweep instantly.
          </p>
          <button
            onClick={onRunCleanup}
            className="text-xs font-mono font-bold border border-[#141414] bg-[#141414] hover:bg-white text-white hover:text-[#141414] px-4 py-2 rounded-none transition-colors shrink-0 cursor-pointer uppercase"
          >
            Run Garbage Collector
          </button>
        </div>
      </div>

      {/* Redis Cache Diagnostics */}
      <div className="bg-white rounded-none border border-[#141414] p-6 shadow-none text-[#141414]">
        <div className="flex justify-between items-start mb-6 border-b border-[#141414] pb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tighter uppercase font-mono flex items-center gap-2 text-[#141414]">
              <Zap className="w-5 h-5 text-[#141414]" />
              REDIS-CACHE // CLUSTER-HEALTH
            </h3>
            <p className="text-xs font-mono opacity-60 mt-1 uppercase">High-Speed In-Memory Layer (Cache-Aside)</p>
          </div>
          <span className="border border-green-600 bg-green-50 text-green-700 text-[10px] font-mono font-bold px-2 py-1 rounded-none uppercase">
            CONNECTED
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#E4E3E0] rounded-none border border-[#141414] p-4 font-mono">
            <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">Cached Mapping Keys</span>
            <p className="text-2xl font-mono font-bold text-[#141414]">{cache.activeKeys}</p>
          </div>
          <div className="bg-[#E4E3E0] rounded-none border border-[#141414] p-4 font-mono">
            <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">RAM Footprint</span>
            <p className="text-2xl font-mono font-bold text-[#141414]">{cache.memoryKb} KB</p>
          </div>
        </div>

        {/* Cache Hit Ratio Radial Gauge Indicator */}
        <div className="border-t border-[#141414] pt-5 flex flex-col gap-4">
          <h4 className="text-xs font-bold font-mono uppercase tracking-widest opacity-60 mb-2">Cache Effectiveness Ratio</h4>
          
          <div className="flex items-center gap-6">
            {/* Donut Ratio Display */}
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="40" cy="40" r="32" 
                  stroke="#E4E3E0" strokeWidth="6" 
                  fill="transparent" 
                />
                <circle 
                  cx="40" cy="40" r="32" 
                  stroke="#141414" strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - cache.hitRatio / 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono">
                <span className="text-sm font-bold text-[#141414]">{cache.hitRatio}%</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 font-mono">
              <div className="flex justify-between text-xs">
                <span className="opacity-60 uppercase text-[10px]">Total Cache Hits:</span>
                <span className="font-bold text-[#141414]">{cache.hits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-60 uppercase text-[10px]">Total Cache Misses:</span>
                <span className="font-bold text-[#141414]">{cache.misses.toLocaleString()}</span>
              </div>
              <div className="w-full h-[1px] bg-[#141414] my-1" />
              <div className="flex justify-between text-xs">
                <span className="opacity-60 uppercase text-[10px]">Eviction Model:</span>
                <span className="font-bold">{cache.evictionPolicy}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-[#141414] pt-4 border-t border-[#141414]">
            <div className="flex justify-between">
              <span className="opacity-60 uppercase text-[10px]">Lookup Latency:</span>
              <span className="font-bold">~{cache.avgResponseTimeMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60 uppercase text-[10px]">Cache Strategy:</span>
              <span className="font-bold underline">Cache-Aside</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
