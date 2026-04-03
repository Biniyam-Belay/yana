"use client";

import { useState, useRef, useEffect } from "react";
import {
  Target, Crosshair, Flag, ChevronRight, ArrowUpRight, Plus,
  CheckCircle2, Circle, Flame, TrendingUp, Trash2, Edit3,
  Milestone, Expand, Star, Eye, X, Check, ChevronDown
} from "lucide-react";
import {
  AreaChart, Area, XAxis, ResponsiveContainer, CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import type { Status, Tier, Objective, KeyResult } from "@/store/north-star";


interface MilestoneItem {
  id: string;
  title: string;
  date: string;
  done: boolean;
}

const statusColor: Record<Status, string> = { "on-track": "bg-emerald-500", "at-risk": "bg-amber-500", "behind": "bg-rose-500" };
const statusLabel: Record<Status, string> = { "on-track": "On Track", "at-risk": "At Risk", "behind": "Behind" };
const statuses: Status[] = ["on-track", "at-risk", "behind"];
const tierList: Tier[] = ["Decade", "Year", "Quarter", "Month"];
const tierHorizons: Record<Tier, string> = { Decade: "2026–2036", Year: "2026", Quarter: "Q4 2026", Month: "Oct 2026" };

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── SEED DATA ───
const seedObjectives: Objective[] = [
  { id: uid(), tier: "Quarter", title: "Ship YANA v2.0 with full command center", progress: 72, status: "on-track", keyResults: [
    { id: uid(), title: "Complete dashboard UI redesign", progress: 90, status: "on-track" },
    { id: uid(), title: "Implement real-time sync engine", progress: 60, status: "at-risk" },
    { id: uid(), title: "Deploy to production cluster", progress: 40, status: "on-track" },
  ]},
  { id: uid(), tier: "Quarter", title: "Close 3 enterprise pilot contracts", progress: 33, status: "at-risk", keyResults: [
    { id: uid(), title: "Identify 10 potential enterprise leads", progress: 70, status: "on-track" },
    { id: uid(), title: "Complete enterprise feature set", progress: 20, status: "behind" },
  ]},
  { id: uid(), tier: "Month", title: "Complete auth microservice migration", progress: 85, status: "on-track", keyResults: [] },
  { id: uid(), tier: "Month", title: "Launch landing page + waitlist funnel", progress: 55, status: "on-track", keyResults: [] },
  { id: uid(), tier: "Year", title: "Establish technical blog with 50 articles", progress: 18, status: "at-risk", keyResults: [] },
];

const seedMilestones: MilestoneItem[] = [
  { id: uid(), title: "MVP Feature Freeze", date: "Oct 15", done: true },
  { id: uid(), title: "Beta Launch", date: "Oct 22", done: false },
  { id: uid(), title: "Enterprise Pilot Start", date: "Nov 1", done: false },
  { id: uid(), title: "Public Launch", date: "Nov 15", done: false },
];

const burndownData = [
  { w: "W1", planned: 18, actual: 18 }, { w: "W2", planned: 15, actual: 16 },
  { w: "W3", planned: 12, actual: 14 }, { w: "W4", planned: 9, actual: 12 },
  { w: "W5", planned: 6, actual: 9 }, { w: "W6", planned: 3, actual: 7 },
  { w: "W7", planned: 0, actual: 5 },
];

// ─── COMPONENTS ───

function SectionHead({ title, icon: Icon, badge, action }: { title: string; icon: any; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
        <Icon className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> {title}
      </span>
      <div className="flex items-center gap-2">
        {badge}
        {action}
      </div>
    </div>
  );
}

function InlineInput({ placeholder, onSubmit, onCancel, autoFocus = true }: { placeholder: string; onSubmit: (val: string) => void; onCancel: () => void; autoFocus?: boolean }) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { autoFocus && ref.current?.focus(); }, [autoFocus]);
  const submit = () => { if (val.trim()) { onSubmit(val.trim()); setVal(""); } };
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/10">
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[11px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
      />
      <button onClick={submit} className="p-0.5 text-emerald-500/70 hover:text-emerald-500 transition-colors"><Check className="h-3 w-3 stroke-[2]" /></button>
      <button onClick={onCancel} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"><X className="h-3 w-3 stroke-[2]" /></button>
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors border-t border-border/10 w-full">
      <Plus className="h-2.5 w-2.5 stroke-[2]" /> {label}
    </button>
  );
}

function StatusDot({ status, onClick }: { status: Status; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`Status: ${statusLabel[status]}. Click to cycle.`}
      className={cn("h-[6px] w-[6px] shrink-0 cursor-pointer transition-all hover:scale-150", statusColor[status])}
    />
  );
}

// ─── PAGE ───

export default function NorthStarPage() {
  // ─── Global shared state via context
  const {
    northStar, setNorthStar,
    northStarKRs, setNorthStarKRs,
    objectives: objs, setObjectives: setObjs,
    avgProgress, northStarProgress,
  } = useNorthStar();

  const [editingNorthStar, setEditingNorthStar] = useState(false);
  const [northStarDraft, setNorthStarDraft] = useState(northStar);
  const [addingNorthStarKR, setAddingNorthStarKR] = useState(false);

  // Objectives local UI state
  const [activeTier, setActiveTier] = useState<Tier | null>(null);
  const [addingObj, setAddingObj] = useState(false);
  const [addObjTier, setAddObjTier] = useState<Tier>("Month");
  const [expandedObj, setExpandedObj] = useState<string | null>(null);
  const [addingKR, setAddingKR] = useState<string | null>(null);

  // Milestones (local only – not global)
  const [milestones, setMilestones] = useState<MilestoneItem[]>(seedMilestones);
  const [addingMilestone, setAddingMilestone] = useState(false);

  // ─── Derived
  const filteredObjs = activeTier ? objs.filter(o => o.tier === activeTier) : objs;
  const tierStats = tierList.map(t => {
    const items = objs.filter(o => o.tier === t);
    return { tier: t, total: items.length, avgProgress: items.length ? Math.round(items.reduce((s, o) => s + o.progress, 0) / items.length) : 0 };
  });
  const totalObjs = objs.length;

  // ─── Helpers
  const cycleStatus = (s: Status): Status => statuses[(statuses.indexOf(s) + 1) % 3];
  const deleteObj = (id: string) => setObjs(prev => prev.filter(o => o.id !== id));
  const addObj = (title: string) => {
    setObjs(prev => [...prev, { id: uid(), tier: addObjTier, title, progress: 0, status: "on-track", keyResults: [] }]);
    setAddingObj(false);
  };
  const addKRToObj = (objId: string, title: string) => {
    setObjs(prev => prev.map(o => o.id === objId ? { ...o, keyResults: [...o.keyResults, { id: uid(), title, progress: 0, status: "on-track" }] } : o));
    setAddingKR(null);
  };
  const deleteKRFromObj = (objId: string, krId: string) => {
    setObjs(prev => prev.map(o => o.id === objId ? { ...o, keyResults: o.keyResults.filter(k => k.id !== krId) } : o));
  };

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden">

      {/* ═══ STATUS BAR ═══ */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <Target className="h-3 w-3 stroke-[1.5]" /> North Star
          </span>
          <span className="flex items-center gap-2"><Crosshair className="h-3 w-3 stroke-[1.5]" /> {totalObjs} Objectives</span>
          <span className="flex items-center gap-2 hidden md:flex"><Flame className="h-3 w-3 stroke-[1.5]" /> {avgProgress}% Avg</span>
        </div>
      </header>

      {/* ═══ TIER ROW ═══ */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tierStats.map(ts => (
          <button
            key={ts.tier}
            onClick={() => setActiveTier(activeTier === ts.tier ? null : ts.tier)}
            className={cn(
              "group relative flex flex-col border p-3.5 bg-background/60 backdrop-blur-sm transition-all cursor-pointer overflow-hidden text-left",
              activeTier === ts.tier ? "border-foreground/40 bg-muted/15" : "border-border/30 hover:border-border/60 hover:bg-muted/10"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{ts.tier}</span>
              <span className="text-[8px] font-mono text-muted-foreground/50">{tierHorizons[ts.tier]}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-xl font-semibold tracking-tighter text-foreground leading-none tabular-nums">{ts.total}</span>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{ts.avgProgress}% avg</span>
            </div>
            <div className="h-[2px] w-full bg-border/20 mt-2.5"><div className="h-full bg-foreground/30 transition-all duration-500" style={{ width: `${ts.avgProgress}%` }} /></div>
          </button>
        ))}
      </div>

      {/* ═══ MAIN 3-COL ═══ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">

        {/* ─── COL 1: NORTH STAR + MILESTONES ─── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

          {/* The North Star */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="The North Star" icon={Star} action={
              <button onClick={() => { setEditingNorthStar(true); setNorthStarDraft(northStar); }} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground" title="Edit">
                <Edit3 className="h-3 w-3 stroke-[1.5]" />
              </button>
            } />
            <div className="px-4 py-4 flex flex-col gap-3">
              {editingNorthStar ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={northStarDraft}
                    onChange={e => setNorthStarDraft(e.target.value)}
                    className="bg-transparent text-[13px] font-semibold text-foreground leading-snug tracking-tight outline-none border border-border/40 px-2 py-1.5 resize-none h-16"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => { setNorthStar(northStarDraft); setEditingNorthStar(false); }} className="px-2 py-1 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest">Save</button>
                    <button onClick={() => setEditingNorthStar(false)} className="px-2 py-1 border border-border/40 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] font-semibold text-foreground leading-snug tracking-tight cursor-pointer hover:text-foreground/80 transition-colors" onClick={() => { setEditingNorthStar(true); setNorthStarDraft(northStar); }}>
                  {northStar}
                </p>
              )}

              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[3px] bg-border/20"><div className="h-full bg-foreground/50 transition-all duration-500" style={{ width: `${northStarProgress}%` }} /></div>
                <span className="text-[11px] font-mono font-bold tabular-nums text-foreground">{northStarProgress}%</span>
              </div>

              {/* Key Results */}
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Key Results</span>
                {northStarKRs.map(kr => (
                  <div key={kr.id} className="group flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <StatusDot status={kr.status} onClick={() => setNorthStarKRs(prev => prev.map(k => k.id === kr.id ? { ...k, status: cycleStatus(k.status) } : k))} />
                      <span className="text-[11px] text-foreground leading-tight flex-1">{kr.title}</span>
                      <button onClick={() => setNorthStarKRs(prev => prev.filter(k => k.id !== kr.id))} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-rose-500"><Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /></button>
                    </div>
                    <div className="flex items-center gap-2 ml-3.5">
                      <div className="flex-1 h-[2px] bg-border/20"><div className={cn("h-full", statusColor[kr.status])} style={{ width: `${kr.progress}%`, opacity: 0.5 }} /></div>
                      <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{kr.progress}%</span>
                    </div>
                  </div>
                ))}
                {addingNorthStarKR ? (
                  <InlineInput
                    placeholder="Key result title..."
                    onSubmit={val => { setNorthStarKRs(prev => [...prev, { id: uid(), title: val, progress: 0, status: "on-track" }]); setAddingNorthStarKR(false); }}
                    onCancel={() => setAddingNorthStarKR(false)}
                  />
                ) : (
                  <button onClick={() => setAddingNorthStarKR(true)} className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mt-1">
                    <Plus className="h-2.5 w-2.5 stroke-[2]" /> Add Key Result
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead title="Milestones" icon={Milestone} badge={<span className="text-[9px] font-mono text-muted-foreground">{milestones.filter(m => m.done).length}/{milestones.length}</span>} />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {milestones.map(m => (
                <div key={m.id} className="group flex items-center gap-3 px-4 py-2.5 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer shrink-0">
                  <button onClick={() => setMilestones(prev => prev.map(ms => ms.id === m.id ? { ...ms, done: !ms.done } : ms))}>
                    {m.done
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/50 shrink-0 stroke-[1.5]" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 stroke-[1.5] hover:text-foreground transition-colors" />
                    }
                  </button>
                  <span className={cn("text-[11px] font-medium truncate flex-1", m.done && "text-muted-foreground/50 line-through decoration-muted-foreground/20")}>{m.title}</span>
                  <span className="text-[9px] font-mono text-muted-foreground tabular-nums shrink-0">{m.date}</span>
                  <button onClick={() => setMilestones(prev => prev.filter(ms => ms.id !== m.id))} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-rose-500"><Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /></button>
                </div>
              ))}
              {addingMilestone ? (
                <InlineInput
                  placeholder="Milestone title..."
                  onSubmit={val => { setMilestones(prev => [...prev, { id: uid(), title: val, date: "TBD", done: false }]); setAddingMilestone(false); }}
                  onCancel={() => setAddingMilestone(false)}
                />
              ) : (
                <AddButton onClick={() => setAddingMilestone(true)} label="Add Milestone" />
              )}
            </div>
          </div>
        </div>

        {/* ─── COL 2: OBJECTIVES LIST ─── */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">
          <SectionHead
            title="Objectives"
            icon={Flag}
            badge={
              <div className="flex items-center gap-2">
                {activeTier && (
                  <button onClick={() => setActiveTier(null)} className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Clear ×</button>
                )}
                <span className="text-[9px] font-mono text-muted-foreground">{filteredObjs.length}</span>
              </div>
            }
          />
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {filteredObjs.map(obj => (
              <div key={obj.id} className="border-b border-border/10 last:border-0">
                {/* Objective row */}
                <div className="group flex items-start gap-2.5 px-4 py-3 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => setExpandedObj(expandedObj === obj.id ? null : obj.id)}>
                  <StatusDot status={obj.status} onClick={() => setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, status: cycleStatus(o.status) } : o))} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[12px] font-semibold text-foreground tracking-tight leading-tight">{obj.title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">{obj.tier}</span>
                      <span className="text-[8px] font-mono text-muted-foreground/30">·</span>
                      <span className="text-[8px] font-mono text-muted-foreground">{obj.keyResults.length} KRs</span>
                    </div>
                    <div className="h-[2px] w-full bg-border/20 overflow-hidden mt-2">
                      <div className={cn("h-full transition-all duration-500", statusColor[obj.status])} style={{ width: `${obj.progress}%`, opacity: 0.5 }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono font-bold tabular-nums text-foreground">{obj.progress}%</span>
                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", expandedObj === obj.id && "rotate-180")} />
                  </div>
                </div>

                {/* Expanded: Key Results */}
                {expandedObj === obj.id && (
                  <div className="bg-muted/5 border-t border-border/10">
                    {obj.keyResults.map(kr => (
                      <div key={kr.id} className="group/kr flex items-center gap-2.5 px-6 py-2 border-b border-border/5 last:border-0">
                        <StatusDot status={kr.status} onClick={() => setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, keyResults: o.keyResults.map(k => k.id === kr.id ? { ...k, status: cycleStatus(k.status) } : k) } : o))} />
                        <span className="text-[10px] text-foreground flex-1 truncate">{kr.title}</span>
                        <span className="text-[9px] font-mono text-muted-foreground tabular-nums">{kr.progress}%</span>
                        <button onClick={() => deleteKRFromObj(obj.id, kr.id)} className="opacity-0 group-hover/kr:opacity-100 p-0.5 text-muted-foreground hover:text-rose-500 transition-all"><Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /></button>
                      </div>
                    ))}
                    {addingKR === obj.id ? (
                      <div className="px-2">
                        <InlineInput
                          placeholder="Key result..."
                          onSubmit={val => addKRToObj(obj.id, val)}
                          onCancel={() => setAddingKR(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-6 py-2">
                        <button onClick={() => setAddingKR(obj.id)} className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                          <Plus className="h-2.5 w-2.5 stroke-[2]" /> Add KR
                        </button>
                        <button onClick={() => deleteObj(obj.id)} className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-muted-foreground hover:text-rose-500 transition-colors">
                          <Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Objective */}
            {addingObj ? (
              <div className="px-4 py-3 border-b border-border/10">
                {/* Tier selector */}
                <div className="flex items-center gap-1 mb-2">
                  {tierList.map(t => (
                    <button key={t} onClick={() => setAddObjTier(t)} className={cn("px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest transition-all", addObjTier === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{t}</button>
                  ))}
                </div>
                <InlineInput placeholder="Objective title..." onSubmit={addObj} onCancel={() => setAddingObj(false)} />
              </div>
            ) : (
              <AddButton onClick={() => setAddingObj(true)} label="Add Objective" />
            )}
          </div>
        </div>

        {/* ─── COL 3: BURNDOWN + STATUS ─── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

          {/* Burndown */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0">
            <SectionHead title="Burndown" icon={TrendingUp} badge={<span className="text-[9px] font-mono text-muted-foreground">Q4</span>} />
            <div className="flex-1 min-h-0 p-2 pb-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burndownData} margin={{ top: 10, right: 12, left: 10, bottom: 4 }}>
                  <defs>
                    <linearGradient id="burnPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="burnActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-rose-500)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--color-rose-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="w" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)", fontWeight: 500 }} dy={5} />
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 2" opacity={0.2} />
                  <RechartsTooltip contentStyle={{ borderRadius: "0", border: "1px solid var(--color-border)", backgroundColor: "var(--color-background)", boxShadow: "none", fontSize: "11px", fontFamily: "monospace", padding: "6px 10px" }} />
                  <Area type="monotone" dataKey="planned" stroke="var(--color-muted-foreground)" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#burnPlanned)" dot={false} />
                  <Area type="monotone" dataKey="actual" stroke="var(--color-rose-500)" strokeWidth={2} fillOpacity={1} fill="url(#burnActual)" dot={{ r: 2, fill: "var(--color-rose-500)", stroke: "var(--color-background)", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border/20">
              <span className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-muted-foreground"><div className="w-3 h-[2px] border-t border-dashed border-muted-foreground" /> Planned</span>
              <span className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-muted-foreground"><div className="w-3 h-[2px] bg-rose-500/60" /> Actual</span>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Status" icon={Eye} />
            <div className="flex flex-col">
              {([
                { label: "On Track", status: "on-track" as Status, color: "bg-emerald-500/50", text: "text-emerald-500/70" },
                { label: "At Risk", status: "at-risk" as Status, color: "bg-amber-500/50", text: "text-amber-500/70" },
                { label: "Behind", status: "behind" as Status, color: "bg-rose-500/50", text: "text-rose-500/70" },
              ] as const).map((s, i) => {
                const count = objs.filter(o => o.status === s.status).length;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/10 last:border-0">
                    <div className={cn("h-[6px] w-[6px] shrink-0", s.color)} />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex-1">{s.label}</span>
                    <span className={cn("text-[12px] font-mono font-bold tabular-nums", s.text)}>{count}</span>
                    <div className="w-16 h-[2px] bg-border/20"><div className={cn("h-full", s.color)} style={{ width: `${totalObjs ? (count / totalObjs) * 100 : 0}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alignment */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Alignment" icon={Crosshair} />
            <div className="px-4 py-4 flex items-center gap-4">
              <div className="flex flex-col flex-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">North Star ↔ Execution</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl font-semibold tracking-tighter text-foreground tabular-nums leading-none">{northStarProgress > 0 && avgProgress > 0 ? Math.round((Math.min(northStarProgress, avgProgress) / Math.max(northStarProgress, avgProgress)) * 100) : 0}%</span>
                  <span className="text-[10px] font-mono text-emerald-500/60 mb-1 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3 stroke-[2]" />+8%</span>
                </div>
              </div>
              <div className="h-12 w-px bg-border/30" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Drift</span>
                <span className="text-2xl font-semibold tracking-tighter text-muted-foreground tabular-nums leading-none mt-1">3.2d</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
