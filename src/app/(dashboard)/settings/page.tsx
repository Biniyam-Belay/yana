"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, Clock, ShieldCheck, Database, SlidersHorizontal, 
  User, Palette, Fingerprint, Trash2, Power, Check, AlertTriangle, Link, Activity, Target, Flag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import { useAppStore } from "@/store";

// Types
type SettingsTab = "General" | "North Star" | "Telemetry" | "Interface" | "Connectivity" | "Security" | "Danger Zone";

function SectionHead({ title, icon: Icon, badge, action }: { title: string; icon: any; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20 bg-background/60 backdrop-blur-sm z-10 w-full">
      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
        <Icon className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> {title}
      </span>
      <div className="flex items-center gap-2">{badge}{action}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { northStar, northStarKRs, objectives, setNorthStar, setNorthStarKRs, setObjectives, avgProgress, northStarProgress } = useNorthStar();
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [time, setTime] = useState("");
  const [isWiping, setIsWiping] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [editNS, setEditNS] = useState(northStar); // local draft for north star edit

  // Form State
  const [nodeName, setNodeName] = useState("Biniyam_Belay");
  const [themeMode, setThemeMode] = useState("dark");
  const [syncFreq, setSyncFreq] = useState("realtime");
  
  // App Store Telemetry
  const { executionRate, focusQuality, systemHealth, stressCoefficient, alignmentScore, updateTelemetry } = useAppStore();

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
    };
    tick();
    const clockInt = setInterval(tick, 1000);
    return () => clearInterval(clockInt);
  }, []);

  // Functional: Wipe all LocalStorage Data we just built across the app
  const handleFactoryReset = () => {
     setIsWiping(true);
     setTimeout(() => {
        localStorage.removeItem('yana_fin_accounts');
        localStorage.removeItem('yana_fin_flows');
        localStorage.removeItem('yana_fin_buckets');
        localStorage.removeItem('yana_bio_prot');
        localStorage.removeItem('yana_bio_int');
        localStorage.removeItem('yana_tac_matrix');
        localStorage.removeItem('yana_tac_commands');
        localStorage.removeItem('yana_tac_blocks');
        localStorage.removeItem('yana_tac_inbox');
        localStorage.removeItem('yana_northstar');
        setSuccess("SYSTEM CORE FLASHED. CACHE PURGED.");
        setIsWiping(false);
        setTimeout(() => window.location.reload(), 1500);
     }, 1200);
  };

  const handleSave = () => {
     setSuccess("PREFERENCES SYNCED TO CORE");
     setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
      
      {/* ═══ STATUS BAR ═══ */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full bg-slate-500 opacity-75" /><span className="relative h-1.5 w-1.5 bg-slate-500" /></span>
            System Preferences
          </span>
          <span className="flex items-center gap-2"><Clock className="h-3 w-3 stroke-[1.5]" /> {time}</span>
          <span className="flex items-center gap-2 hidden md:flex"><ShieldCheck className="h-3 w-3 stroke-[1.5]" /> Root Access</span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors">
          <Power className="h-3 w-3 stroke-[2]" /> Uplink Live
        </button>
      </header>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 overflow-hidden">
        
        {/* COL 1: SETTINGS NAVIGATION */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">
           <SectionHead title="Root Parameters" icon={SlidersHorizontal} />
           
           <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-1 z-0 relative scrollbar-hide">
              {/* Subtle Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {[
                { id: "General", icon: User },
                { id: "North Star", icon: Target },
                { id: "Telemetry", icon: Activity },
                { id: "Interface", icon: Palette },
                { id: "Connectivity", icon: Link },
                { id: "Security", icon: Fingerprint },
                { id: "Danger Zone", icon: AlertTriangle, danger: true },
              ].map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={cn(
                       "flex items-center gap-3 px-3 py-2.5 transition-all text-left relative z-10 w-full group",
                       activeTab === tab.id 
                         ? tab.danger ? "bg-rose-500/10 border border-rose-500/20 text-rose-500" : "bg-muted/10 border border-border/20 text-foreground"
                         : "text-muted-foreground hover:bg-muted/5 border border-transparent"
                    )}
                 >
                    <tab.icon className={cn("h-4 w-4 stroke-[1.5]", activeTab===tab.id && tab.danger ? "text-rose-500" : "")} />
                    <span className="text-[11px] font-mono uppercase tracking-widest font-semibold">{tab.id}</span>
                 </button>
              ))}
           </div>
        </div>

        {/* COL 2: ACTIVE PREFERENCES PANEL */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden relative">
           <SectionHead 
             title={`${activeTab} Config`} 
             icon={Settings} 
             action={
               activeTab !== "Danger Zone" && (
                 <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1 bg-muted/10 border border-border/20 text-[9px] font-mono text-muted-foreground hover:bg-foreground hover:text-background transition-all uppercase tracking-widest">
                    <Check className="h-3 w-3 stroke-[2]" /> Commit
                 </button>
               )
             }
           />
           
           <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide bg-muted/5">
              
              {/* SUCCESS TOAST ALERTS */}
              {success && (
                <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 animate-in slide-in-from-top-2">
                   <Activity className="h-4 w-4 stroke-[2] animate-pulse" />
                   <span className="text-[10px] font-mono uppercase tracking-widest font-black flex-1">{success}</span>
                </div>
              )}

              {/* ─ GENERAL SETTINGS ─ */}
              {activeTab === "General" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                   <div className="space-y-4">
                      <div className="flex flex-col gap-1 border-b border-border/10 pb-2 mb-4">
                         <h3 className="text-[11px] font-bold uppercase tracking-widest">Identity Subsystem</h3>
                         <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">Configure global node identification variables.</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Node Handler (Username)</label>
                            <input 
                               value={nodeName} 
                               onChange={e=>setNodeName(e.target.value)} 
                               className="bg-background border border-border/20 px-3 py-2 text-[11px] font-mono uppercase tracking-widest outline-none focus:border-foreground transition-colors"
                            />
                         </div>
                         <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">System Email</label>
                            <input 
                               readOnly
                               value="biniyam.root@capital.os" 
                               className="bg-muted/10 border border-border/10 px-3 py-2 text-[11px] font-mono uppercase tracking-widest outline-none text-muted-foreground cursor-not-allowed"
                            />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4 pt-4 border-t border-border/10">
                      <div className="flex flex-col gap-1 border-b border-border/10 pb-2 mb-4">
                         <h3 className="text-[11px] font-bold uppercase tracking-widest">Localization</h3>
                         <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">Date and numeric formatting constants.</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Primary Fiat</label>
                            <select className="bg-background border border-border/20 px-3 py-2 text-[11px] font-mono uppercase tracking-widest outline-none focus:border-foreground transition-colors appearance-none cursor-pointer">
                               <option>ETB (Ethiopian Birr)</option>
                               <option>USD (US Dollar)</option>
                               <option>EUR (Euro)</option>
                            </select>
                         </div>
                         <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Timezone</label>
                            <select className="bg-background border border-border/20 px-3 py-2 text-[11px] font-mono uppercase tracking-widest outline-none focus:border-foreground transition-colors appearance-none cursor-pointer">
                               <option>Africa/Addis_Ababa (EAT)</option>
                               <option>America/New_York (EST)</option>
                               <option>Europe/London (GMT)</option>
                            </select>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* ─ NORTH STAR SETTINGS ─ */}
              {activeTab === "North Star" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Mission KRs", val: `${northStarProgress}%`, sub: "avg completion" },
                      { label: "Objectives", val: `${objectives.length}`, sub: `${objectives.filter(o => o.status === "on-track").length} on track` },
                      { label: "Execution", val: `${avgProgress}%`, sub: "overall avg" },
                    ].map(s => (
                      <div key={s.label} className="flex flex-col border border-border/20 p-4 bg-background">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">{s.label}</span>
                        <span className="text-2xl font-extralight tabular-nums text-foreground">{s.val}</span>
                        <span className="text-[8px] font-mono text-muted-foreground/50">{s.sub}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/10 pt-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4"><Target className="h-4 w-4" /> Mission Statement</h3>
                    <textarea value={editNS} onChange={e => setEditNS(e.target.value)} rows={3}
                      className="w-full bg-background border border-border/20 px-3 py-2 text-[12px] font-semibold text-foreground outline-none focus:border-foreground transition-colors resize-none tracking-tight" />
                    <button onClick={() => { setNorthStar(editNS); setSuccess("NORTH STAR UPDATED"); setTimeout(() => setSuccess(null), 3000); }}
                      className="mt-2 text-[9px] font-mono font-bold uppercase tracking-widest bg-foreground text-background px-4 py-2 hover:bg-foreground/90 transition-colors">
                      Commit Mission
                    </button>
                  </div>
                  <div className="border-t border-border/10 pt-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4">Mission Key Results</h3>
                    {northStarKRs.map((kr, i) => (
                      <div key={kr.id} className="flex flex-col gap-2 p-4 border border-border/10 bg-background mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-foreground flex-1 pr-4">{kr.title}</span>
                          <span className="text-[11px] font-mono font-bold tabular-nums">{kr.progress}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={kr.progress}
                          onChange={e => setNorthStarKRs(prev => prev.map((k, j) => j === i ? { ...k, progress: Number(e.target.value) } : k))}
                          className="w-full accent-foreground" />
                        <div className="flex items-center gap-2">
                          {(["on-track", "at-risk", "behind"] as const).map(s => (
                            <button key={s} onClick={() => setNorthStarKRs(prev => prev.map((k, j) => j === i ? { ...k, status: s } : k))}
                              className={cn("text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 transition-all text-center flex-1",
                                kr.status === s ? (s === "on-track" ? "bg-emerald-500 text-background" : s === "at-risk" ? "bg-amber-500 text-background" : "bg-rose-500 text-background") : "border border-border/20 text-muted-foreground hover:text-foreground"
                              )}>{s.replace("-", " ")}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/10 pt-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4"><Flag className="h-3.5 w-3.5" /> Active Objectives</h3>
                    {objectives.map(obj => (
                      <div key={obj.id} className="flex items-center gap-4 p-3 border border-border/10 bg-background mb-2">
                        <div className={cn("h-2 w-2 shrink-0", obj.status === "on-track" ? "bg-emerald-500" : obj.status === "at-risk" ? "bg-amber-500" : "bg-rose-500")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-foreground truncate">{obj.title}</p>
                          <span className="text-[8px] font-mono text-muted-foreground uppercase">{obj.tier} · {obj.keyResults.length} KRs</span>
                        </div>
                        <input type="range" min="0" max="100" value={obj.progress}
                          onChange={e => setObjectives(prev => prev.map(o => o.id === obj.id ? { ...o, progress: Number(e.target.value) } : o))}
                          className="w-24 accent-foreground" />
                        <span className="text-[10px] font-mono tabular-nums w-8 text-right">{obj.progress}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─ TELEMETRY PROTOCOL (Vm) ─ */}
              {activeTab === "Telemetry" && (
                <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-4 mb-4">
                     <Activity className="h-6 w-6 text-indigo-500" />
                     <div>
                       <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest">Biological Machine State</h3>
                       <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-widest max-w-[600px] leading-relaxed">
                         Live override matrix for Mission Velocity (Vm) calculations. Modifying these streams adjusts layout desaturation rules, testing the Drift Protocol & Critical Stasis.
                       </p>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Execution Rate (E) */}
                     <div className="flex flex-col gap-3 p-4 bg-background border border-border/20 group hover:border-indigo-500/30 transition-colors">
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                           <span className="text-muted-foreground group-hover:text-foreground transition-colors font-semibold">Execution (E)</span>
                           <span className="text-indigo-400 font-bold">{(executionRate * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.01" value={executionRate} 
                           onChange={(e) => updateTelemetry({ executionRate: parseFloat(e.target.value) })}
                           className="w-full h-1 bg-muted/30 appearance-none rounded-none cursor-ew-resize accent-indigo-500 hover:accent-indigo-400" />
                     </div>

                     {/* Focus Quality (F) */}
                     <div className="flex flex-col gap-3 p-4 bg-background border border-border/20 group hover:border-amber-500/30 transition-colors">
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                           <span className="text-muted-foreground group-hover:text-foreground transition-colors font-semibold">Focus (F)</span>
                           <span className="text-amber-400 font-bold">{(focusQuality * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.01" value={focusQuality} 
                           onChange={(e) => updateTelemetry({ focusQuality: parseFloat(e.target.value) })}
                           className="w-full h-1 bg-muted/30 appearance-none rounded-none cursor-ew-resize accent-amber-500 hover:accent-amber-400" />
                     </div>

                     {/* System Health (H) */}
                     <div className="flex flex-col gap-3 p-4 bg-background border border-border/20 group hover:border-emerald-500/30 transition-colors">
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                           <span className="text-muted-foreground group-hover:text-foreground transition-colors font-semibold">Health (H)</span>
                           <span className="text-emerald-400 font-bold">{(systemHealth * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.01" value={systemHealth} 
                           onChange={(e) => updateTelemetry({ systemHealth: parseFloat(e.target.value) })}
                           className="w-full h-1 bg-muted/30 appearance-none rounded-none cursor-ew-resize accent-emerald-500 hover:accent-emerald-400" />
                     </div>

                     {/* Stress Coefficient (S) */}
                     <div className="flex flex-col gap-3 p-4 bg-background border border-border/20 group hover:border-rose-500/30 transition-colors">
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                           <span className="text-muted-foreground group-hover:text-foreground transition-colors font-semibold">Tolerance (S)</span>
                           <span className="text-rose-400 font-bold">{(stressCoefficient * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.01" value={stressCoefficient} 
                           onChange={(e) => updateTelemetry({ stressCoefficient: parseFloat(e.target.value) })}
                           className="w-full h-1 bg-muted/30 appearance-none rounded-none cursor-ew-resize accent-rose-500 hover:accent-rose-400" />
                     </div>
                     
                     {/* Alignment Score Override */}
                     <div className="flex flex-col gap-3 p-4 bg-background border border-border/20 group hover:border-foreground/30 transition-colors md:col-span-2">
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                           <span className="text-muted-foreground group-hover:text-foreground transition-colors font-semibold">Alignment Score</span>
                           <span className="text-foreground font-bold">{(alignmentScore * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.01" value={alignmentScore} 
                           onChange={(e) => updateTelemetry({ alignmentScore: parseFloat(e.target.value) })}
                           className="w-full h-1 bg-muted/30 appearance-none rounded-none cursor-ew-resize accent-foreground hover:accent-foreground" />
                        <span className="text-[8px] text-muted-foreground font-mono mt-1">{"Drop below 85% to trigger subjective Drift monochromatic filter."}</span>
                     </div>
                  </div>
                </div>
              )}


              {/* ─ INTERFACE SETTINGS ─ */}
              {activeTab === "Interface" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                   <div className="space-y-4">
                      <div className="flex flex-col gap-1 border-b border-border/10 pb-2 mb-4">
                         <h3 className="text-[11px] font-bold uppercase tracking-widest">Environment Styling</h3>
                         <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">Modify grid densities and lighting rendering.</span>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-6">
                         <button onClick={()=>setThemeMode("dark")} className={cn("flex flex-col items-center gap-4 flex-1 border p-6 transition-all", themeMode==="dark" ? "border-foreground bg-muted/5 shadow-md" : "border-border/20 bg-background opacity-50 hover:opacity-100")}>
                            <div className="h-16 w-32 bg-zinc-950 border border-zinc-800 rounded-sm flex items-center justify-center relative overflow-hidden">
                               <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:8px_8px]" />
                               <MoonIcon className="h-5 w-5 text-zinc-500 z-10" />
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Deep Space (Dark)</span>
                         </button>

                         <button onClick={()=>setThemeMode("light")} className={cn("flex flex-col items-center gap-4 flex-1 border p-6 transition-all", themeMode==="light" ? "border-foreground bg-muted/5 shadow-md" : "border-border/20 bg-background opacity-50 hover:opacity-100")}>
                            <div className="h-16 w-32 bg-stone-100 border border-stone-200 rounded-sm flex items-center justify-center relative overflow-hidden">
                               <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:8px_8px]" />
                               <SunIcon className="h-5 w-5 text-stone-400 z-10" />
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">High Contrast (Light)</span>
                         </button>
                      </div>
                   </div>
                </div>
              )}

              {/* ─ CONNECTIVITY SETTINGS ─ */}
              {activeTab === "Connectivity" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                   <div className="space-y-4">
                      <div className="flex flex-col gap-1 border-b border-border/10 pb-2 mb-4">
                         <h3 className="text-[11px] font-bold uppercase tracking-widest">Database Uplink</h3>
                         <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">Connect OS to external Postgres and Supabase engines.</span>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                         {[
                            { name: "Supabase Core Data", status: "Connected", url: "https://db.capital-os.com", connected: true },
                            { name: "Alpha Vantage (Financial APIs)", status: "Pending Key", url: "API Not Configured", connected: false },
                            { name: "Apple Health (Biometrics)", status: "Disconnected", url: "Offline", connected: false },
                         ].map(sys => (
                           <div key={sys.name} className="flex justify-between items-center p-4 border border-border/20 bg-background">
                              <div className="flex items-center gap-4">
                                 <div className={cn("h-2.5 w-2.5", sys.connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]")} />
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-bold tracking-widest uppercase">{sys.name}</span>
                                    <span className="text-[9px] font-mono text-muted-foreground mt-0.5">{sys.url}</span>
                                 </div>
                              </div>
                              <button className="text-[9px] font-mono uppercase tracking-widest border border-border/20 px-3 py-1 hover:bg-muted/10 transition-colors">
                                 {sys.connected ? "Configure" : "Link"}
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                   
                   <div className="space-y-4 pt-4 border-t border-border/10">
                      <div className="flex flex-col gap-2">
                         <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Telemetry Polling Rate</label>
                         <select value={syncFreq} onChange={e=>setSyncFreq(e.target.value)} className="bg-background border border-border/20 px-3 py-2 text-[11px] font-mono uppercase tracking-widest outline-none focus:border-foreground transition-colors appearance-none cursor-pointer max-w-xs">
                            <option value="realtime">Realtime (WebSockets)</option>
                            <option value="1min">1 Minute Poll</option>
                            <option value="5min">5 Minute Poll</option>
                            <option value="manual">Manual Execution Only</option>
                         </select>
                      </div>
                   </div>
                </div>
              )}

              {/* ─ SECURITY SETTINGS ─ */}
              {activeTab === "Security" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                   <div className="space-y-4">
                      <div className="flex flex-col gap-1 border-b border-border/10 pb-2 mb-4">
                         <h3 className="text-[11px] font-bold uppercase tracking-widest">Authentication Array</h3>
                         <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">Manage OS entry protocols.</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="flex flex-col gap-2 relative">
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Current Passphrase</label>
                            <input 
                               type="password"
                               placeholder="••••••••" 
                               className="bg-background border border-border/20 px-3 py-2 text-[11px] tracking-widest outline-none focus:border-foreground transition-colors"
                            />
                         </div>
                         <div className="flex flex-col gap-2 relative border-l border-border/10 pl-6">
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">New Passphrase</label>
                            <input 
                               type="password"
                               className="bg-background border border-border/20 px-3 py-2 text-[11px] tracking-widest outline-none focus:border-foreground transition-colors mb-2"
                            />
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Confirm Phrase</label>
                            <input 
                               type="password"
                               className="bg-background border border-border/20 px-3 py-2 text-[11px] tracking-widest outline-none focus:border-foreground transition-colors"
                            />
                            <button className="mt-4 self-end text-[9px] font-mono font-bold uppercase tracking-widest bg-foreground text-background px-4 py-2 hover:bg-foreground/90 transition-colors">
                               Update Directive
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* ─ DANGER ZONE ─ */}
              {activeTab === "Danger Zone" && (
                <div className="max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300">
                   <div className="space-y-4 border border-rose-500/30 bg-rose-500/5 p-6 relative overflow-hidden">
                      <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none" />
                      
                      <div className="flex items-center gap-3 mb-6 border-b border-rose-500/20 pb-4">
                         <AlertTriangle className="h-6 w-6 text-rose-500" />
                         <div className="flex flex-col">
                            <h3 className="text-[14px] font-black uppercase tracking-widest text-rose-500">Node Erase Protocol</h3>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-rose-500/60">Irreversible Action - Immediate Execution</span>
                         </div>
                      </div>
                      
                      <p className="text-[11px] font-mono tracking-widest text-rose-500/80 leading-relaxed max-w-xl pb-6">
                         Executing a factory reset will instantly purge all cached biometric arrays, financial pipelines, capital buckets, tactical timeblocks, and command matrices stored natively in this browser's LocalStorage. All states will aggressively revert to initial structural seeds.
                      </p>
                      
                      <button 
                         onClick={handleFactoryReset}
                         disabled={isWiping}
                         className="relative flex items-center justify-center gap-3 w-full border border-rose-500 text-rose-500 font-mono font-black uppercase tracking-[0.2em] py-4 hover:bg-rose-500 hover:text-white transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                         {isWiping ? (
                           <>
                             <Database className="h-4 w-4 animate-spin-slow" />
                             PURGING MEMORY BANKS...
                             <div className="absolute inset-y-0 left-0 bg-rose-500/20 animate-pulse w-full" />
                           </>
                         ) : (
                           <>
                             <Trash2 className="h-4 w-4" /> Initialize Core Wipe
                           </>
                         )}
                      </button>
                   </div>
                </div>
              )}

           </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Icons for custom visual UI
function MoonIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
}
function SunIcon(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
}
