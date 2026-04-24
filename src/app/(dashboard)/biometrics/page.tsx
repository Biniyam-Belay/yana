"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Heart, Dumbbell, Apple, Plus, Clock, ShieldCheck, Activity, 
  CheckCircle2, Circle, ArrowUpRight, Trash2, Check, X,
  Moon, Droplets, Target, ArrowDownRight, BrainCircuit
} from "lucide-react";
import { useNorthStar } from "@/store/north-star";
import { 
  AreaChart, Area, XAxis, ResponsiveContainer, CartesianGrid, Tooltip as RechartsTooltip
} from "recharts";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BiometricProtocolRow, BiometricIntakeRow, BiometricRow } from "@/lib/supabase/types";

// ─── TYPES ───
interface ProtocolNode {
  id: string;
  name: string;
  weight: number;
  reps: number;
  sets: number;
  completed: boolean;
}

interface IntakeNode {
  id: string;
  name: string;
  calories: number;
  protein: number;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2, 11));

// ─── DATA ───
const RECOVERY_DATA: { day: string; recovery: number; strain: number }[] = [];

// ─── SHARED UI ───
function InlineInput({ placeholder, onSubmit, onCancel }: { placeholder: string; onSubmit: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = () => { if (val.trim()) { onSubmit(val.trim()); setVal(""); } };
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border/20 w-full rounded-none">
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }} placeholder={placeholder}
        className="flex-1 bg-transparent text-[11px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40" />
      <button onClick={submit} className="p-0.5 rounded-none text-emerald-500/70 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"><Check className="h-3 w-3 stroke-[2]" /></button>
      <button onClick={onCancel} className="p-0.5 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"><X className="h-3 w-3 stroke-[2]" /></button>
    </div>
  );
}

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

function NorthStarStrip() {
  const { northStar, topObjective, avgProgress } = useNorthStar();
  return (
    <div className="shrink-0 flex items-center gap-4 px-4 py-2.5 border border-border/20 bg-muted/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 shrink-0">
        <Target className="h-3 w-3 text-muted-foreground stroke-[1.5]" />
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">North Star</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-foreground truncate">{northStar}</p>
      </div>
      <div className="shrink-0 flex items-center gap-4">
        {topObjective && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 truncate max-w-[180px]">{topObjective.title}</span>
            <div className="w-16 h-1 bg-border/20">
              <div className="h-full bg-foreground/40 transition-all duration-500" style={{ width: `${topObjective.progress}%` }} />
            </div>
            <span className="text-[9px] font-mono text-foreground tabular-nums">{topObjective.progress}%</span>
          </div>
        )}
        <div className="flex items-center gap-2 border-l border-border/20 pl-4">
          <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Exec</span>
          <span className="text-[11px] font-mono font-bold text-indigo-400 tabular-nums">{avgProgress}%</span>
        </div>
      </div>
    </div>
  );
}

function BiometricsPageContent() {
  const searchParams = useSearchParams();
  const { northStar, topObjective, northStarKRs, avgProgress, objectives } = useNorthStar();
  const [protocols, setProtocols] = useState<ProtocolNode[]>([]);
  const [intake, setIntake] = useState<IntakeNode[]>([]);
  const [addingProt, setAddingProt] = useState(false);
  const [addingIntake, setAddingIntake] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hydration, setHydration] = useState(0);
  // User-editable body stats
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const [bodyFat, setBodyFat] = useState<number | null>(null);
  const [hrv, setHrv] = useState<number | null>(null);
  const [sleepTotal, setSleepTotal] = useState("");    // "7h 14m" format
  const [sleepDeep, setSleepDeep] = useState("");
  const [sleepRem, setSleepRem] = useState("");
  const [editingStats, setEditingStats] = useState(false);
  // Goal targets
  const [calGoal, setCalGoal] = useState(2800);
  const [protGoal, setProtGoal] = useState(180);
  const [waterGoal, setWaterGoal] = useState(4.0);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);

  useEffect(() => {
    try {
      supabaseRef.current = createSupabaseBrowserClient();
      setSupabaseAvailable(true);
    } catch {
      setSupabaseAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseAvailable || !supabaseRef.current) return;
    supabaseRef.current.auth.getUser().then(({ data, error }: { data: any, error: any }) => {
      if (error || !data?.user) {
        setSupabaseUserId(null);
        return;
      }
      setSupabaseUserId(data.user.id);
    });
  }, [supabaseAvailable]);

  useEffect(() => {
    if (searchParams.get("action") === "log-workout") {
      setAddingProt(true);
    }
  }, [searchParams]);

  // Live Time
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
    };
    tick();
    const clockInt = setInterval(tick, 1000);
    return () => clearInterval(clockInt);
  }, []);

  useEffect(() => {
    if (supabaseUserId && supabaseRef.current) {
      const supabase = supabaseRef.current;
      const today = new Date().toISOString().slice(0, 10);
      Promise.all([
        supabase
          .from("biometric_protocols")
          .select("*")
          .eq("user_id", supabaseUserId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("biometric_intakes")
          .select("*")
          .eq("user_id", supabaseUserId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("biometrics")
          .select("*")
          .eq("user_id", supabaseUserId)
          .eq("date", today)
          .maybeSingle(),
      ]).then(([protRes, intakeRes, bioRes]) => {
        const protRows = (protRes.data ?? []) as BiometricProtocolRow[];
        const intakeRows = (intakeRes.data ?? []) as BiometricIntakeRow[];
        const biometrics = bioRes.data as BiometricRow | null;

        if (protRows.length > 0) {
          setProtocols(protRows.map((row) => ({
            id: row.id,
            name: row.name,
            weight: row.weight,
            reps: row.reps,
            sets: row.sets,
            completed: row.completed,
          })));
        }

        if (intakeRows.length > 0) {
          setIntake(intakeRows.map((row) => ({
            id: row.id,
            name: row.name,
            calories: row.calories,
            protein: row.protein,
          })));
        }

        if (biometrics?.hydration_l !== null && biometrics?.hydration_l !== undefined) {
          setHydration(biometrics.hydration_l);
        }

        setIsReady(true);
      });
      return;
    }

    const sProt = localStorage.getItem("yana_bio_prot");
    const sInt = localStorage.getItem("yana_bio_int");
    const sHyd = localStorage.getItem("yana_bio_hyd");
    const sStats = localStorage.getItem("yana_bio_stats");
    if (sProt) setProtocols(JSON.parse(sProt));
    if (sInt) setIntake(JSON.parse(sInt));
    if (sHyd) setHydration(Number(sHyd));
    if (sStats) {
      const s = JSON.parse(sStats);
      if (s.bodyWeight != null) setBodyWeight(s.bodyWeight);
      if (s.bodyFat != null) setBodyFat(s.bodyFat);
      if (s.hrv != null) setHrv(s.hrv);
      if (s.sleepTotal) setSleepTotal(s.sleepTotal);
      if (s.sleepDeep) setSleepDeep(s.sleepDeep);
      if (s.sleepRem) setSleepRem(s.sleepRem);
      if (s.calGoal) setCalGoal(s.calGoal);
      if (s.protGoal) setProtGoal(s.protGoal);
      if (s.waterGoal) setWaterGoal(s.waterGoal);
    }
    setIsReady(true);
  }, [supabaseUserId]);

  const macroGoals = { cal: calGoal, pro: protGoal };
  const totals = useMemo(() => {
    return intake.reduce((acc, curr) => ({
      cal: acc.cal + curr.calories,
      pro: acc.pro + curr.protein,
    }), { cal: 0, pro: 0 });
  }, [intake]);

  useEffect(() => {
    if (!isReady) return;
    if (!supabaseUserId || !supabaseRef.current) {
      localStorage.setItem("yana_bio_prot", JSON.stringify(protocols));
      localStorage.setItem("yana_bio_int", JSON.stringify(intake));
      localStorage.setItem("yana_bio_hyd", hydration.toString());
      localStorage.setItem("yana_bio_stats", JSON.stringify({ bodyWeight, bodyFat, hrv, sleepTotal, sleepDeep, sleepRem, calGoal, protGoal, waterGoal }));
      return;
    }

    const supabase = supabaseRef.current;

    const sync = async () => {
      if (protocols.length > 0) {
        await supabase
          .from("biometric_protocols")
          .upsert(
            protocols.map((protocol, index) => ({
              id: protocol.id,
              user_id: supabaseUserId,
              name: protocol.name,
              weight: protocol.weight,
              reps: protocol.reps,
              sets: protocol.sets,
              completed: protocol.completed,
              sort_order: index,
            }))
          );
      }

      if (intake.length > 0) {
        await supabase
          .from("biometric_intakes")
          .upsert(
            intake.map((item, index) => ({
              id: item.id,
              user_id: supabaseUserId,
              name: item.name,
              calories: item.calories,
              protein: item.protein,
              sort_order: index,
            }))
          );
      }

      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from("biometrics")
        .upsert({
          user_id: supabaseUserId,
          date: today,
          hydration_l: hydration,
          nutrition_cal: totals.cal,
        });
    };

    void sync();
  }, [protocols, intake, hydration, totals.cal, isReady, supabaseUserId, bodyWeight, bodyFat, hrv, sleepTotal, sleepDeep, sleepRem, calGoal, protGoal, waterGoal]);

  // Live Simulation
  const [hr, setHr] = useState(62);
  useEffect(() => {
    const hrInt = setInterval(() => setHr(prev => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3)), 2000);
    return () => clearInterval(hrInt);
  }, []);

  const tonnage = protocols.filter(p => p.completed).reduce((a, b) => a + (b.weight * b.reps * b.sets), 0);
  const completedProts = protocols.filter(p => p.completed).length;


  if (!isReady) {
    return (
      <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
        <div className="h-8 w-40 bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-4 flex-1 min-h-0">
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
      
      {/* ═══ STATUS BAR ═══ */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full bg-emerald-500 opacity-75" /><span className="relative h-1.5 w-1.5 bg-emerald-500" /></span>
            Biometrics
          </span>
          <span className="flex items-center gap-2"><Clock className="h-3 w-3 stroke-[1.5]" /> {time}</span>
          <span className="flex items-center gap-2 hidden md:flex"><ShieldCheck className="h-3 w-3 stroke-[1.5]" /> Synced</span>
          <span className="flex items-center gap-2 hidden lg:flex"><Activity className="h-3 w-3 stroke-[1.5]" /> Live BPM: {hr}</span>
        </div>
      </header>

      {/* ═══ NORTH STAR ALIGNMENT ═══ */}
      <NorthStarStrip />

      {/* ═══ MAIN 3-COL LAYOUT ═══ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-4 overflow-hidden">
        
        {/* COL 1: KINETICS */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
             
             <SectionHead 
                title="Kinetics Protocol" 
                icon={Dumbbell} 
                badge={<span className="text-[9px] font-mono text-muted-foreground">{completedProts}/{protocols.length}</span>} 
                action={<button onClick={() => setAddingProt(true)} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 stroke-[1.5]" /></button>}
             />

             <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide py-2">
                
                                 {/* Physical Adaptation Sub-module */}
                 <div className="px-4 py-3 border-b border-border/10 mb-2 bg-muted/5">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                         <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1 flex items-center gap-1.5"><Target className="h-2.5 w-2.5" /> Body Weight</span>
                         {bodyWeight != null
                           ? <span className="text-xl font-extralight tracking-tight tabular-nums">{bodyWeight} <span className="text-[10px] text-muted-foreground/60 ml-0.5">KG</span></span>
                           : <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">—</span>
                         }
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1">Body Fat</span>
                         {bodyFat != null
                           ? <span className="text-xl font-extralight tracking-tight tabular-nums text-indigo-400">{bodyFat} <span className="text-[10px] text-muted-foreground/60 ml-0.5">%</span></span>
                           : <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">—</span>
                         }
                      </div>
                    </div>
                    <button onClick={() => setEditingStats(true)} className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors border border-border/20 px-2 py-0.5">Update Stats</button>
                 </div>

                 
                <div className="px-4 py-3 border-b border-border/10 mb-2">
                  <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-muted-foreground/60">Session Tonnage</span>
                  <div className="text-4xl font-extralight tracking-tighter tabular-nums leading-none mt-1 mb-2">
                    {tonnage.toLocaleString()} <span className="text-[12px] text-muted-foreground/50">KG</span>
                  </div>
                </div>

                <div className="flex flex-col pb-2">
                  {protocols.map(p => (
                    <div key={p.id} className="group flex items-center gap-3 px-4 py-2.5 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer">
                      <button onClick={() => setProtocols(prev => prev.map(flow => flow.id === p.id ? { ...flow, completed: !flow.completed } : flow))} className="shrink-0">
                        {p.completed ? <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-emerald-500/60" /> : <Circle className="h-3.5 w-3.5 stroke-[1.5] text-muted-foreground/40 hover:text-foreground transition-colors" />}
                      </button>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn("text-[11px] font-medium truncate", p.completed && "text-muted-foreground/40 line-through decoration-muted-foreground/20")}>{p.name}</span>
                        <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{p.sets}x{p.reps} @ {p.weight}kg</span>
                      </div>
                      <button onClick={() => setProtocols(prev => prev.filter(flow => flow.id !== p.id))} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-500 shrink-0"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                    </div>
                  ))}
                  {addingProt && (
                    <div className="px-2 pt-2">
                      <InlineInput placeholder="Movement (Name Wt Sets Reps)..." onSubmit={(val) => {
                        if (val) {
                          const parts = val.trim().split(' ');
                          let w = 0, s = 0, r = 0, name = val;
                          if (parts.length >= 4 && !isNaN(Number(parts[parts.length - 1]))) {
                            r = Number(parts.pop());
                            s = Number(parts.pop());
                            w = Number(parts.pop());
                            name = parts.join(' ');
                          }
                          setProtocols(prev => [...prev, { id: uid(), name, weight: w, sets: s, reps: r, completed: false }]);
                        }
                        setAddingProt(false);
                      }} onCancel={() => setAddingProt(false)} />
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* COL 2: TELEMETRY (CHART + NUMBERS) */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
             <SectionHead 
                title="System Telemetry" 
                icon={Activity} 
                badge={<span className="text-[9px] font-mono uppercase text-muted-foreground">Live Feed</span>}
             />
             
             <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
               {/* Readouts */}
               <div className="grid grid-cols-2 gap-4 px-4 py-4 border-b border-border/10 shrink-0">
                  <div className="flex flex-col gap-1 border-r border-border/10">
                     <h4 className="text-[9px] font-mono uppercase text-muted-foreground/60 tracking-widest">HRV Baseline</h4>
                     {hrv != null
                       ? <span className="text-3xl font-extralight tabular-nums tracking-tight">{hrv}<span className="text-[12px] text-muted-foreground ml-1">ms</span></span>
                       : <span className="text-xl font-extralight text-muted-foreground/30">— ms</span>
                     }
                     <button onClick={() => setEditingStats(true)} className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-colors text-left">Enter value</button>
                  </div>
                  <div className="flex flex-col gap-1 pl-2">
                     <h4 className="text-[9px] font-mono uppercase text-muted-foreground/60 tracking-widest">Live BPM</h4>
                     <span className="text-3xl font-extralight tabular-nums tracking-tight text-rose-500">{hr}</span>
                     <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-1">Optimal Range</span>
                  </div>
               </div>

               {/* Chart Legend */}
               <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/10 bg-muted/5 z-10 relative">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 bg-indigo-500 rounded-none border border-indigo-500/20" /><span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Recovery Rate</span></div>
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 bg-amber-500 rounded-none border border-amber-500/20" /><span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Nervous Strain</span></div>
                 </div>
               </div>

               {/* Chart */}
               <div className="shrink-0 h-[180px] w-full p-2 relative bg-background/20 border-b border-border/10">
               {RECOVERY_DATA.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={RECOVERY_DATA} margin={{ top: 10, right: 12, left: 10, bottom: 4 }}>
                     <defs>
                       <linearGradient id="bioRec" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15}/>
                         <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="bioStr" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15}/>
                         <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)", fontWeight: 500 }} dy={5} />
                     <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 2" opacity={0.3} />
                     <RechartsTooltip
                       cursor={{ stroke: 'var(--color-muted-foreground)', strokeWidth: 1, strokeDasharray: '4 4' }}
                       contentStyle={{ borderRadius: "0", border: "1px solid var(--color-border)", backgroundColor: "var(--color-background)", boxShadow: "none", fontSize: "11px", fontFamily: "monospace", padding: "6px 10px" }}
                     />
                     <Area type="monotone" dataKey="recovery" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#bioRec)" activeDot={{ r: 4, strokeWidth: 0, fill: "#6366f1" }} />
                     <Area type="monotone" dataKey="strain" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#bioStr)" activeDot={{ r: 4, strokeWidth: 0, fill: "#f59e0b" }} />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                   No telemetry yet
                 </div>
               )}
             </div>

             {/* Circadian & Neural Phase */}
             <div className="flex flex-col flex-1 p-4 pb-6 bg-muted/5">
                <div className="flex items-center justify-between gap-2 mb-4">
                   <div className="flex items-center gap-2">
                     <BrainCircuit className="h-3.5 w-3.5 text-indigo-400" />
                     <h4 className="text-[10px] font-mono uppercase font-black tracking-widest text-foreground">Circadian Engine</h4>
                   </div>
                   <button onClick={() => setEditingStats(true)} className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-colors border border-border/20 px-2 py-0.5">Log Sleep</button>
                </div>
                <div className="grid grid-cols-3 gap-6">
                   <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">Total Sleep</span>
                      {sleepTotal ? <span className="text-2xl font-extralight tabular-nums text-foreground">{sleepTotal}</span> : <span className="text-xl text-muted-foreground/30 font-extralight">—</span>}
                   </div>
                   <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">Deep Phase</span>
                      {sleepDeep ? <span className="text-2xl font-extralight tabular-nums text-emerald-500">{sleepDeep}</span> : <span className="text-xl text-muted-foreground/30 font-extralight">—</span>}
                   </div>
                   <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">REM Phase</span>
                      {sleepRem ? <span className="text-2xl font-extralight tabular-nums text-indigo-400">{sleepRem}</span> : <span className="text-xl text-muted-foreground/30 font-extralight">—</span>}
                   </div>
                </div>
             </div>

           </div>
          </div>
        </div>

        {/* COL 3: ENERGY INTAKE */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
             <SectionHead 
                title="Energy Architecture" 
                icon={Apple} 
                badge={<span className="text-[9px] font-mono text-muted-foreground">{intake.length} Logs</span>} 
                action={<button onClick={() => setAddingIntake(true)} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 stroke-[1.5]" /></button>}
             />

             <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide py-2">
                <div className="px-4 py-3 border-b border-border/10 mb-2">
                  <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-muted-foreground/60">Net Calories</span>
                  <div className="text-4xl font-extralight tracking-tighter tabular-nums leading-none mt-1 mb-4 text-amber-500">
                    {totals.cal.toLocaleString()}
                    <span className="text-[12px] text-muted-foreground/50 ml-1">/{macroGoals.cal}</span>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                           <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Calories</span>
                           <span className="text-[9px] font-mono font-bold">{Math.round((totals.cal / macroGoals.cal) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/30 relative">
                           <div className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-1000" style={{ width: `${Math.min((totals.cal / macroGoals.cal) * 100, 100)}%` }} />
                        </div>
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                           <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Protein (g)</span>
                           <span className="text-[9px] font-mono font-bold text-emerald-500">{totals.pro} / {macroGoals.pro}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/30 relative">
                           <div className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min((totals.pro / macroGoals.pro) * 100, 100)}%` }} />
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  {intake.map(n => (
                    <div key={n.id} className="group flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[11px] font-medium truncate">{n.name}</span>
                        <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest mt-0.5">{n.protein}g PRO</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-mono tabular-nums text-amber-500 font-bold">{n.calories} Kcal</span>
                         <button onClick={() => setIntake(prev => prev.filter(flow => flow.id !== n.id))} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-500 shrink-0 -mr-2"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                      </div>
                    </div>
                  ))}
                  {addingIntake && (
                    <div className="px-2 pt-2">
                       <InlineInput placeholder="Food (Name Cal Pro)..." onSubmit={(val) => {
                         if (val) {
                             const parts = val.trim().split(' ');
                             let c = 0, p = 0, name = val;
                             if (parts.length >= 3 && !isNaN(Number(parts[parts.length-1]))) {
                                p = Number(parts.pop());
                                c = Number(parts.pop());
                                name = parts.join(' ');
                             }
                             setIntake(prev => [...prev, { id: uid(), name, calories: c, protein: p }]);
                         }
                         setAddingIntake(false);
                       }} onCancel={() => setAddingIntake(false)} />
                    </div>
                  )}
                </div>

                {/* Hydration Matrix */}
                <div className="mt-4 px-4 pt-4 border-t border-border/10">
                   <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-cyan-500/80 flex items-center gap-1.5"><Droplets className="h-3 w-3" /> Hydration Level</span>
                      <span className="text-[10px] font-mono tabular-nums text-cyan-400">{hydration.toFixed(1)} <span className="text-muted-foreground/50">/ {waterGoal.toFixed(1)} L</span></span>
                   </div>
                   <div className="h-3 w-full border border-border/20 bg-background flex overflow-hidden">
                      {Array.from({length: 8}).map((_, i) => (
                        <button key={i} onClick={() => setHydration((i+1) * 0.5)} className="flex-1 border-r border-background/20 relative group hover:bg-cyan-500/20 transition-colors">
                           <div className={cn("absolute inset-0 transition-opacity", (hydration >= (i+1)*0.5) ? "bg-cyan-500/80" : "opacity-0")} />
                        </button>
                      ))}
                   </div>
                   <div className="flex justify-between mt-1 text-[8px] font-mono text-muted-foreground/40 px-1">
                      <span>0L</span><span>{waterGoal/2}L</span><span>{waterGoal}L</span>
                   </div>
                </div>

             </div>
          </div>

          {/* ─── OBJECTIVE FUEL PANEL ─── */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
                <Target className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> Objective Fuel
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">{avgProgress}% exec</span>
            </div>
            {topObjective ? (
              <div className="px-4 py-3 flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-foreground leading-tight">{topObjective.title}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-border/20">
                    <div className={cn("h-full transition-all duration-700", topObjective.status === "on-track" ? "bg-emerald-500/70" : "bg-amber-500/70")} style={{ width: `${topObjective.progress}%` }} />
                  </div>
                  <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{topObjective.progress}%</span>
                </div>
                <p className="text-[8px] font-mono text-muted-foreground/60 uppercase tracking-widest mt-1">
                  Your body performance directly fuels this mission.
                </p>
                {topObjective.keyResults.slice(0, 3).map(kr => (
                  <div key={kr.id} className="flex items-center gap-2">
                    <div className={cn("h-[4px] w-[4px] shrink-0", kr.status === "on-track" ? "bg-emerald-500" : kr.status === "at-risk" ? "bg-amber-500" : "bg-rose-500")} />
                    <span className="text-[9px] text-muted-foreground truncate flex-1">{kr.title}</span>
                    <span className="text-[8px] font-mono tabular-nums text-muted-foreground">{kr.progress}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 text-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">No active objectives</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── STATS EDIT MODAL ─── */}
      {editingStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingStats(false)} />
          <div className="relative bg-background border border-border/30 p-6 w-full max-w-sm flex flex-col gap-4">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest">Log Body Stats</h3>
            {[
              { label: "Body Weight (KG)", val: bodyWeight?.toString() ?? "", set: (v: string) => setBodyWeight(v ? parseFloat(v) : null) },
              { label: "Body Fat (%)", val: bodyFat?.toString() ?? "", set: (v: string) => setBodyFat(v ? parseFloat(v) : null) },
              { label: "HRV Baseline (ms)", val: hrv?.toString() ?? "", set: (v: string) => setHrv(v ? parseFloat(v) : null) },
              { label: "Total Sleep (e.g. 7h 30m)", val: sleepTotal, set: setSleepTotal },
              { label: "Deep Phase (e.g. 1h 45m)", val: sleepDeep, set: setSleepDeep },
              { label: "REM Phase (e.g. 2h 10m)", val: sleepRem, set: setSleepRem },
              { label: "Calorie Goal (kcal)", val: calGoal.toString(), set: (v: string) => setCalGoal(v ? parseInt(v) : 2800) },
              { label: "Protein Goal (g)", val: protGoal.toString(), set: (v: string) => setProtGoal(v ? parseInt(v) : 180) },
              { label: "Water Goal (L)", val: waterGoal.toString(), set: (v: string) => setWaterGoal(v ? parseFloat(v) : 4.0) },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{label}</label>
                <input
                  defaultValue={val}
                  onChange={e => set(e.target.value)}
                  className="bg-background border border-border/20 px-3 py-2 text-[11px] font-mono outline-none focus:border-foreground transition-colors"
                />
              </div>
            ))}
            <button
              onClick={() => setEditingStats(false)}
              className="mt-2 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest py-2 hover:bg-foreground/90 transition-colors"
            >
              Save Stats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BiometricsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs font-mono text-muted-foreground">Initializing Telemetry...</div>}>
      <BiometricsPageContent />
    </Suspense>
  );
}
