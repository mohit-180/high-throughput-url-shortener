import React, { useState } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend 
} from "recharts";
import { 
  Sliders, Activity, Play, RefreshCw, BarChart3 
} from "lucide-react";
import { LoadTestResult } from "../types";

interface LocustTesterProps {
  onRunTest: (concurrency: number, duration: number) => Promise<LoadTestResult>;
}

export default function LocustTester({ onRunTest }: LocustTesterProps) {
  const [concurrency, setConcurrency] = useState<number>(500);
  const [duration, setDuration] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<LoadTestResult | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const handleStartTest = async () => {
    setLoading(true);
    setTestResult(null);
    setCountdown(duration);

    // Simulate real-time progress countdown ticks
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const res = await onRunTest(concurrency, duration);
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      clearInterval(interval);
    }
  };

  return (
    <div className="bg-white rounded-none border border-[#141414] p-6 shadow-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#141414]">
        <div>
          <h2 className="text-xl font-bold text-[#141414] flex items-center gap-2 font-mono uppercase tracking-tighter">
            <Activity className="w-5 h-5 text-red-600 animate-pulse" />
            LOCUST-SWARM // DISTRIBUTED-LOAD-TESTER
          </h2>
          <p className="text-xs font-mono opacity-60 mt-1 uppercase">
            Simulate concurrent virtual clients pounding the Cache-Aside router to profile system limits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Column */}
        <div className="bg-[#E4E3E0] border border-[#141414] rounded-none p-5 h-fit flex flex-col gap-5 text-[#141414]">
          <h3 className="font-bold text-[#141414] text-xs font-mono uppercase tracking-widest flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#141414]" />
            TEST PARAMETERS
          </h3>

          <div>
            <label className="block text-[10px] font-bold font-mono text-[#141414] opacity-75 uppercase mb-2">
              CONCURRENCY (VIRTUAL USERS)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[100, 500, 1000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setConcurrency(val)}
                  disabled={loading}
                  className={`py-2 text-[10px] font-bold font-mono rounded-none border transition-all uppercase ${
                    concurrency === val
                      ? "bg-[#141414] border-[#141414] text-white"
                      : "bg-white border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-white"
                  }`}
                >
                  {val} Users
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold font-mono text-[#141414] opacity-75 uppercase mb-2">
              BENCHMARK DURATION
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-[#141414] rounded-none text-xs font-mono text-[#141414] outline-none focus:bg-[#E4E3E0] uppercase"
            >
              <option value="5">5 Seconds (Short Sweep)</option>
              <option value="10">10 Seconds (Standard Profile)</option>
              <option value="20">20 Seconds (Stress Sweep)</option>
            </select>
          </div>

          <button
            onClick={handleStartTest}
            disabled={loading}
            className="w-full py-3 bg-[#141414] hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-mono font-bold text-xs rounded-none transition-all flex items-center justify-center gap-2 shadow-none cursor-pointer uppercase border border-[#141414]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Profiling ({countdown}s)...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Spawn Virtual Swarm
              </>
            )}
          </button>

          {loading && (
            <div className="p-3 bg-white border border-red-600 rounded-none font-mono">
              <p className="text-[10px] leading-relaxed text-red-600 uppercase font-bold">
                ⚡ Warning: High concurrency load test creates heavy database writes and locks memory nodes.
              </p>
            </div>
          )}
        </div>

        {/* Graphs Dashboard Column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {!testResult && !loading && (
            <div className="border border-dashed border-[#141414] rounded-none h-[340px] flex flex-col items-center justify-center text-center p-6 bg-[#E4E3E0]/30 font-mono text-[#141414]">
              <Activity className="w-12 h-12 text-[#141414] opacity-40 mb-3" />
              <h4 className="font-bold uppercase tracking-widest text-sm">Ready for Benchmarking</h4>
              <p className="opacity-60 text-xs max-w-sm mt-1 uppercase">
                Select a client concurrency preset on the left and run the swarm to render live RPS and latency profiles.
              </p>
            </div>
          )}

          {loading && (
            <div className="border border-[#141414] rounded-none h-[340px] flex flex-col items-center justify-center text-center p-6 bg-white shadow-none font-mono text-[#141414]">
              <RefreshCw className="w-12 h-12 text-[#141414] animate-spin mb-4" />
              <h4 className="font-bold uppercase tracking-widest text-sm">Swarming Microservice Endpoint...</h4>
              <p className="opacity-60 text-xs max-w-sm mt-1 uppercase">
                Targeting <code>/r/[shortcode]</code>. Recording connection pools availability and cache memory-to-disk evictions in real time.
              </p>
            </div>
          )}

          {testResult && !loading && (
            <div className="flex flex-col gap-6">
              {/* Telemetry Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#E4E3E0] border border-[#141414] rounded-none p-4 font-mono text-[#141414]">
                  <span className="text-[10px] uppercase font-bold opacity-60">Total Swarm Requests</span>
                  <p className="text-2xl font-bold mt-1">
                    {testResult.summary.totalRequests.toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#E4E3E0] border border-[#141414] rounded-none p-4 font-mono text-[#141414]">
                  <span className="text-[10px] uppercase font-bold opacity-60">Average Throughput</span>
                  <p className="text-2xl font-bold mt-1">
                    {testResult.summary.avgRps.toLocaleString()} <span className="text-xs font-normal opacity-55">req/s</span>
                  </p>
                </div>
                <div className="bg-[#E4E3E0] border border-[#141414] rounded-none p-4 font-mono text-[#141414]">
                  <span className="text-[10px] uppercase font-bold opacity-60">Avg Redirect Latency</span>
                  <p className="text-2xl font-bold mt-1">
                    {testResult.summary.avgLatencyMs} <span className="text-xs font-normal opacity-55">ms</span>
                  </p>
                </div>
                <div className="bg-[#E4E3E0] border border-[#141414] rounded-none p-4 font-mono text-[#141414]">
                  <span className="text-[10px] uppercase font-bold opacity-60">Connection Failures</span>
                  <p className={`text-2xl font-bold mt-1 ${testResult.summary.totalFailures > 0 ? "text-red-600" : "text-green-600"}`}>
                    {testResult.summary.totalFailures}
                  </p>
                </div>
              </div>

              {/* RPS & Latency Graph */}
              <div className="bg-white border border-[#141414] rounded-none p-5 text-[#141414]">
                <h4 className="text-xs font-bold font-mono uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-[#141414] pb-2">
                  <BarChart3 className="w-4 h-4 text-[#141414]" />
                  RPS & LATENCY OVER TIME (LOCUST PROFILE)
                </h4>
                <div className="h-[240px] w-full font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={testResult.metrics}>
                      <defs>
                        <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#141414" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#141414" strokeOpacity={0.2} />
                      <XAxis dataKey="time" stroke="#141414" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#141414" fontSize={10} tickLine={false} label={{ value: 'RPS (Req/s)', angle: -90, position: 'insideLeft', style: { fill: '#141414', fontSize: '9px', fontWeight: 'bold' } }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#141414" fontSize={10} tickLine={false} label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', style: { fill: '#141414', fontSize: '9px', fontWeight: 'bold' } }} />
                      <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0px', border: '1px solid #141414', backgroundColor: '#E4E3E0' }} />
                      <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="rps" stroke="#141414" strokeWidth={2} fillOpacity={1} fill="url(#colorRps)" name="Requests Per Sec" />
                      <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#b91c1c" strokeWidth={2} dot={true} name="Avg Latency (ms)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
