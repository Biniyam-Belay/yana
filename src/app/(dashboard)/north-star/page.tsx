"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Target, Crosshair, Flag, ArrowUpRight, Plus,
  Flame, TrendingUp, Trash2,
  Milestone, Star, Eye, X, Check, ChevronDown
} from "lucide-react";
import {
  AreaChart, Area, XAxis, ResponsiveContainer, CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import type { Status, Tier } from "@/store/north-star";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NorthStarMilestoneRow } from "@/lib/supabase/types";


interface MilestoneItem {
  id: string;
  title: string;
  dueDate: string | null;
  done: boolean;
}

const statusColor: Record<Status, string> = { "on-track": "bg-emerald-500", "at-risk": "bg-amber-500", "behind": "bg-rose-500" };
const statusPillColor: Record<Status, string> = {
  "on-track": "border-emerald-500/40 text-emerald-500/80",
  "at-risk": "border-amber-500/40 text-amber-500/80",
  "behind": "border-rose-500/40 text-rose-500/80",
};
const statusText: Record<Status, string> = {
  "on-track": "On track",
  "at-risk": "At risk",
  "behind": "Behind",
};
const tierList: Tier[] = ["Decade", "Year", "Quarter", "Month"];
const tierRank: Record<Tier, number> = { Decade: 0, Year: 1, Quarter: 2, Month: 3 };
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2, 11));

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

function InlineInput({ placeholder, onSubmit, onCancel, autoFocus = true, initialValue = "" }: { placeholder: string; onSubmit: (val: string) => void; onCancel: () => void; autoFocus?: boolean; initialValue?: string }) {
  const [val, setVal] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { autoFocus && ref.current?.focus(); }, [autoFocus]);
  useEffect(() => { setVal(initialValue); }, [initialValue]);
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

function useAnimatedNumber(target: number, stiffness = 0.18) {
  const [value, setValue] = useState(target);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef(target);
  const valueRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
    if (frameRef.current !== null) return;

    const tick = () => {
      const current = valueRef.current;
      const dest = targetRef.current;
      const delta = dest - current;

      if (Math.abs(delta) < 0.5) {
        const snap = Math.round(dest);
        valueRef.current = snap;
        setValue(snap);
        frameRef.current = null;
        return;
      }

      const next = current + delta * stiffness;
      valueRef.current = next;
      setValue(Math.round(next));
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = null;
    };
  }, [target, stiffness]);

  return value;
}

// ─── PAGE ───

export default function NorthStarPage() {
  // ─── Global shared state via context
  const {
    northStar, setNorthStar,
    northStarKRs, setNorthStarKRs,
    objectives: objs, setObjectives: setObjs,
    avgProgress, northStarProgress, isReady,
  } = useNorthStar();

  const [addingNorthStar, setAddingNorthStar] = useState(false);
  const [northStarDraft, setNorthStarDraft] = useState(northStar);
  const [addingNorthStarKR, setAddingNorthStarKR] = useState(false);
  const [addNorthStarKRColor, setAddNorthStarKRColor] = useState<string>("#64748b");
  const [addNorthStarKRDueDate, setAddNorthStarKRDueDate] = useState<string>("");
  const [editingNorthStarKRId, setEditingNorthStarKRId] = useState<string | null>(null);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [editingObjectiveKR, setEditingObjectiveKR] = useState<{ objId: string; krId: string } | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // Objectives local UI state
  const [activeTier, setActiveTier] = useState<Tier | null>(null);
  const [addingObj, setAddingObj] = useState(false);
  const [addObjTier, setAddObjTier] = useState<Tier>("Month");
  const [addObjLinkId, setAddObjLinkId] = useState<string | null>(null);
  const [addObjColor, setAddObjColor] = useState<string>("#64748b");
  const [addObjDueDate, setAddObjDueDate] = useState<string>("");
  const [objectiveQuery, setObjectiveQuery] = useState("");
  const [objectiveStatus, setObjectiveStatus] = useState<"all" | Status>("all");
  const [objectiveSort, setObjectiveSort] = useState<"progress-desc" | "progress-asc" | "az" | "tier">("progress-desc");
  const [expandedObj, setExpandedObj] = useState<string | null>(null);
  const [addingKR, setAddingKR] = useState<string | null>(null);
  const [addKrDueDate, setAddKrDueDate] = useState<string>("");
  const nextUpScrollRef = useRef<HTMLDivElement>(null);

  // Aggregate Objective Milestones
  const aggregatedMilestones = useMemo(() => {
    return objs.flatMap((obj) =>
      obj.keyResults.map((kr) => ({
        ...kr,
        objId: obj.id,
        objTitle: obj.title,
        objColor: obj.color,
        objTier: obj.tier,
      }))
    ).sort((a, b) => {
      const aDone = a.progress >= 100 ? 1 : 0;
      const bDone = b.progress >= 100 ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;

      return a.title.localeCompare(b.title);
    });
  }, [objs]);
  const completedMilestonesCount = useMemo(() => aggregatedMilestones.filter((m) => m.progress >= 100).length, [aggregatedMilestones]);

  // ─── Derived
  const totalObjs = objs.length;
  const completedObjectives = useMemo(() => objs.filter((o) => o.progress >= 100).length, [objs]);
  const objectiveStatusCounts = useMemo(
    () => ({
      all: objs.length,
      "on-track": objs.filter((o) => o.status === "on-track").length,
      "at-risk": objs.filter((o) => o.status === "at-risk").length,
      behind: objs.filter((o) => o.status === "behind").length,
    }),
    [objs],
  );
  const mainKrTitleById = useMemo(
    () => Object.fromEntries(northStarKRs.map((kr) => [kr.id, kr.title])),
    [northStarKRs],
  );
  const filteredObjs = useMemo(() => {
    const query = objectiveQuery.trim().toLowerCase();
    const byTier = activeTier ? objs.filter((o) => o.tier === activeTier) : objs;
    const byStatus = objectiveStatus === "all" ? byTier : byTier.filter((o) => o.status === objectiveStatus);
    const byQuery = query
      ? byStatus.filter((o) => {
          const linkedKR = o.keyResultId ? mainKrTitleById[o.keyResultId] ?? "" : "";
          return [o.title, linkedKR, o.tier].join(" ").toLowerCase().includes(query);
        })
      : byStatus;

    const sorted = [...byQuery];
    sorted.sort((a, b) => {
      if (objectiveSort === "progress-asc") return a.progress - b.progress;
      if (objectiveSort === "progress-desc") return b.progress - a.progress;
      if (objectiveSort === "az") return a.title.localeCompare(b.title);
      return tierRank[a.tier] - tierRank[b.tier] || b.progress - a.progress;
    });
    return sorted;
  }, [activeTier, mainKrTitleById, objs, objectiveQuery, objectiveSort, objectiveStatus]);
  const alignmentScore = useMemo(() => {
    if (objs.length === 0 && northStarKRs.length === 0) return 0;

    const krBaseProgress = new Map<string, number>();

    const objectivesByKr = objs.reduce<Map<string, typeof objs>>((acc, obj) => {
      if (!obj.keyResultId) return acc;
      const list = acc.get(obj.keyResultId) ?? [];
      list.push(obj);
      acc.set(obj.keyResultId, list);
      return acc;
    }, new Map());

    northStarKRs.forEach((kr) => {
      const linked = objectivesByKr.get(kr.id) ?? [];
      if (linked.length > 0) {
        const avg = Math.round(linked.reduce((sum, obj) => sum + obj.progress, 0) / linked.length);
        krBaseProgress.set(kr.id, avg);
      } else {
        krBaseProgress.set(kr.id, kr.progress);
      }
    });

    const linkedObjectives = objs.filter((o) => !!o.keyResultId && krBaseProgress.has(o.keyResultId));
    const orphanObjectives = objs.length - linkedObjectives.length;

    const linkageScore = objs.length > 0
      ? Math.round((linkedObjectives.length / objs.length) * 100)
      : 100;

    const coherenceScore = linkedObjectives.length > 0
      ? Math.round(
          linkedObjectives.reduce((sum, obj) => {
            const baseline = krBaseProgress.get(obj.keyResultId!) ?? 0;
            return sum + Math.max(0, 100 - Math.abs(obj.progress - baseline));
          }, 0) / linkedObjectives.length,
        )
      : (objs.length > 0 ? 0 : 100);

    const overdueOpenCount = objs.filter((o) => {
      if (!o.dueDate) return false;
      return new Date(o.dueDate).getTime() < Date.now() && o.progress < 100;
    }).length;

    const orphanPenalty = objs.length > 0 ? Math.round((orphanObjectives / objs.length) * 15) : 0;
    const overduePenalty = objs.length > 0 ? Math.round((overdueOpenCount / objs.length) * 25) : 0;

    const structuralScore = Math.max(
      0,
      Math.min(100, Math.round((coherenceScore * 0.65) + (linkageScore * 0.35) - orphanPenalty - overduePenalty)),
    );

    // Progress traction gate: great structure cannot claim near-perfect alignment if execution is very low.
    const tractionScore = Math.max(0, Math.min(100, Math.round((northStarProgress * 0.7) + (avgProgress * 0.3))));

    // Heavily weight traction so low NS progress doesn't show "100% aligned".
    const blendedScore = Math.round((structuralScore * 0.25) + (tractionScore * 0.75));

    // Hard cap alignment based on traction envelope.
    const tractionCap = Math.min(100, tractionScore + 15);

    return Math.max(0, Math.min(blendedScore, tractionCap));
  }, [objs, northStarKRs, northStarProgress, avgProgress]);
  const animatedAlignmentScore = useAnimatedNumber(alignmentScore);
  const animatedAlignmentDrift = useAnimatedNumber(Math.max(0, 100 - alignmentScore));
  const alignmentStatus = alignmentScore >= 80 ? "Aligned" : alignmentScore >= 55 ? "Drifting" : "Unstable";
  const statusSummary = northStarProgress >= 80
    ? "Momentum strong. Keep pressure on execution."
    : northStarProgress >= 50
      ? "Progress visible. Watch the at-risk lanes."
      : "North Star needs traction—add KRs and objectives.";
  const alignmentNote = alignmentScore >= 80
    ? "Execution rhythm matches strategic intent."
    : alignmentScore >= 55
      ? "Execution lag detected—tighten KR focus."
      : "Strategic drift high. Reconnect objectives to KRs.";

  const burndownData = useMemo(() => {
    if (!totalObjs && northStarKRs.length === 0) return [];
    const weeks = 6;
    const plannedStart = 100;
    const plannedStep = plannedStart / (weeks - 1);
    const actualEnd = Math.max(0, 100 - avgProgress);
    const actualStep = (plannedStart - actualEnd) / (weeks - 1 || 1);
    return Array.from({ length: weeks }, (_, i) => ({
      w: `W${i + 1}`,
      planned: Math.max(0, Math.round(plannedStart - plannedStep * i)),
      actual: Math.max(actualEnd, Math.round(plannedStart - actualStep * i)),
    }));
  }, [avgProgress, totalObjs, northStarKRs.length]);

  // ─── Helpers

  const deleteObj = (id: string) => setObjs(prev => prev.filter(o => o.id !== id));
  const deleteNorthStarKR = (id: string) => {
    setNorthStarKRs(prev => prev.filter(k => k.id !== id));
    setObjs(prev => prev.map(o => o.keyResultId === id ? { ...o, keyResultId: null } : o));
  };
  const addObj = (title: string) => {
    const linkedKrId = addObjLinkId ?? northStarKRs[0]?.id ?? null;
    if (!linkedKrId) return;
    setObjs(prev => [...prev, {
      id: uid(),
      tier: addObjTier,
      title,
      progress: 0,
      status: "behind",
      keyResults: [],
      keyResultId: linkedKrId,
      color: addObjColor,
      dueDate: addObjDueDate || null,
    }]);
    setAddingObj(false);
    setAddObjDueDate("");
  };
  const addKRToObj = (objId: string, title: string) => {
    setObjs(prev => prev.map(o => o.id === objId ? {
      ...o,
      keyResults: [...o.keyResults, { id: uid(), title, progress: 0, status: "behind", color: "#64748b", dueDate: addKrDueDate || null }],
    } : o));
    setAddingKR(null);
    setAddKrDueDate("");
  };
  const deleteKRFromObj = (objId: string, krId: string) => {
    setObjs(prev => prev.map(o => o.id === objId ? { ...o, keyResults: o.keyResults.filter(k => k.id !== krId) } : o));
  };
  const setObjectiveMilestoneState = (objId: string, done: boolean) => {
    setObjs((prev) => prev.map((o) => o.id === objId
      ? {
          ...o,
          keyResults: o.keyResults.map((k) => ({
            ...k,
            progress: done ? 100 : 0,
            status: done ? "on-track" : "behind",
          })),
        }
      : o));
  };

  const toggleObjectiveExpanded = (objId: string) => {
    setExpandedObj((prev) => (prev === objId ? null : objId));
  };

  const toggleNextUpMilestone = (objId: string, krId: string, currentProgress: number) => {
    const container = nextUpScrollRef.current;
    const previousTop = container?.scrollTop ?? 0;

    const isDone = currentProgress >= 100;
    setObjs((prev) => prev.map((o) => o.id === objId ? {
      ...o,
      keyResults: o.keyResults.map((k) => k.id === krId ? {
        ...k,
        progress: isDone ? 0 : 100,
        status: isDone ? "behind" : "on-track",
      } : k),
    } : o));

    requestAnimationFrame(() => {
      if (nextUpScrollRef.current) {
        nextUpScrollRef.current.scrollTop = previousTop;
      }
    });
  };

  useEffect(() => {
    setNorthStarDraft(northStar);
  }, [northStar]);

  useEffect(() => {
    if (!addingObj) return;
    if (addObjLinkId || northStarKRs.length === 0) return;
    setAddObjLinkId(northStarKRs[0].id);
  }, [addingObj, addObjLinkId, northStarKRs]);

  if (!isReady) {
    return (
      <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
        <div className="h-8 w-48 bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 flex-1 min-h-0">
          <div className="flex flex-col gap-4">
            <div className="h-48 bg-muted/20 animate-pulse border border-border/20" />
            <div className="h-40 bg-muted/20 animate-pulse border border-border/20" />
          </div>
          <div className="h-full bg-muted/10 animate-pulse border border-border/20" />
          <div className="flex flex-col gap-4">
            <div className="h-32 bg-muted/20 animate-pulse border border-border/20" />
            <div className="h-48 bg-muted/20 animate-pulse border border-border/20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden">

      {/* ═══ STATUS BAR ═══ */}
      <header className="shrink-0 flex items-center justify-between pb-4">
        <div className="flex items-center gap-6 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center justify-center p-2 bg-background border border-border/40 rounded-xl shadow-sm">
            <Target className="h-4 w-4 stroke-[1.5] text-foreground" />
          </span>
          <span className="flex items-center gap-2 font-semibold text-foreground tracking-widest text-[11px]">
            North Star
          </span>
          <div className="h-4 w-px bg-border/40 mx-1" />
          <span className="hidden md:flex items-center gap-2">
            <Crosshair className="h-3 w-3 stroke-[1.5] text-muted-foreground/60" /> {totalObjs} Objectives
          </span>
          <span className="hidden md:flex md:items-center md:gap-2">
            <Flame className="h-3 w-3 stroke-[1.5] text-muted-foreground/60" /> <span className="text-foreground font-bold">{avgProgress}%</span> Avg Progress
          </span>
        </div>
      </header>

      {/* ═══ MAIN 3-COL ═══ */}
  <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[322px_1fr_322px] xl:grid-cols-[368px_1fr_368px] gap-6 overflow-hidden">

        {/* ─── COL 1: NORTH STAR + MILESTONES ─── */}
        <div className="flex flex-col gap-6 min-h-0 overflow-hidden">

          {/* The North Star */}
          <div className="flex flex-col border border-border/20 bg-background/60 backdrop-blur-xl shrink-0 rounded-2xl shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] pointer-events-none" />
            <SectionHead title="The North Star" icon={Star} />
            <div className="px-5 py-5 flex flex-col gap-4 relative z-10">
              {northStar ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] font-semibold text-foreground leading-snug tracking-tight">
                    {northStar}
                  </p>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    Edit in Settings → North Star
                  </span>
                </div>
              ) : addingNorthStar ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={northStarDraft}
                    onChange={e => setNorthStarDraft(e.target.value)}
                    className="bg-transparent text-[13px] font-semibold text-foreground leading-snug tracking-tight outline-none border border-border/40 px-2 py-1.5 resize-none h-16"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => { setNorthStar(northStarDraft.trim()); setAddingNorthStar(false); }} className="px-2 py-1 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest">Save</button>
                    <button onClick={() => { setAddingNorthStar(false); setNorthStarDraft(""); }} className="px-2 py-1 border border-border/40 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingNorthStar(true); setNorthStarDraft(""); }}
                  className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3 stroke-[2]" /> Add North Star
                </button>
              )}

              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-[3px] bg-border/20"><div className="h-full bg-foreground/50 transition-all duration-500" style={{ width: `${northStarProgress}%` }} /></div>
                <span className="text-[11px] font-mono font-bold tabular-nums text-foreground">{northStarProgress}%</span>
              </div>

              {/* Key Results */}
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Key Results</span>
                {!northStar && (
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                    Add your North Star to unlock key results.
                  </div>
                )}
                {northStarKRs.map((kr) => (
                  editingNorthStarKRId === kr.id ? (
                    <InlineInput
                      key={kr.id}
                      placeholder="Key result title..."
                      initialValue={editDraft || kr.title}
                      onSubmit={(val) => {
                        setNorthStarKRs(prev => prev.map(k => k.id === kr.id ? { ...k, title: val } : k));
                        setEditingNorthStarKRId(null);
                        setEditDraft("");
                      }}
                      onCancel={() => { setEditingNorthStarKRId(null); setEditDraft(""); }}
                    />
                  ) : (
                    <div key={kr.id} className="group flex flex-col gap-1.5">
                      <div className="flex items-start gap-2">
                        <input
                          type="color"
                          value={kr.color ?? "#64748b"}
                          onChange={(e) => setNorthStarKRs(prev => prev.map(k => k.id === kr.id ? { ...k, color: e.target.value } : k))}
                          className="h-4 w-4 rounded border border-border/30 bg-transparent p-0.5"
                          title="Key result color"
                        />
                        <button
                          onDoubleClick={() => { setEditingNorthStarKRId(kr.id); setEditDraft(kr.title); }}
                          className="text-left text-[11px] text-foreground leading-tight flex-1"
                        >
                          {kr.title}
                        </button>
                        <input
                          type="date"
                          value={kr.dueDate ?? ""}
                          onChange={(e) => setNorthStarKRs(prev => prev.map(k => k.id === kr.id ? { ...k, dueDate: e.target.value || null } : k))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono text-muted-foreground bg-transparent border border-border/30 px-1 py-0.5 rounded outline-none"
                          title="Key result due date"
                        />
                        <button onClick={() => deleteNorthStarKR(kr.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-rose-500"><Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /></button>
                      </div>
                      <div className="flex items-center gap-2 ml-3.5">
                        <div className="flex-1 h-[2px] bg-border/20"><div className={cn("h-full", statusColor[kr.status])} style={{ width: `${kr.progress}%`, opacity: 0.5, backgroundColor: kr.color ?? undefined }} /></div>
                        <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{kr.progress}%</span>
                        {kr.dueDate && (
                          <span className={cn(
                            "text-[8px] font-mono uppercase tracking-widest border px-1 py-0.5 rounded",
                            new Date(kr.dueDate).getTime() < Date.now() && kr.progress < 100
                              ? "text-rose-500 border-rose-500/30 bg-rose-500/10"
                              : "text-muted-foreground border-border/40 bg-muted/20"
                          )}>
                            {new Date(kr.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {objs.filter((o) => o.keyResultId === kr.id).filter((o) => o.progress >= 100).length}/
                          {objs.filter((o) => o.keyResultId === kr.id).length} objectives
                        </span>
                      </div>
                    </div>
                  )
                ))}
                {northStar && addingNorthStarKR ? (
                  <div className="bg-background border border-emerald-500/30 rounded-lg p-1.5 flex flex-col gap-2">
                    <InlineInput
                      placeholder="Key result title..."
                      onSubmit={val => {
                        setNorthStarKRs(prev => [...prev, {
                          id: uid(),
                          title: val,
                          progress: 0,
                          status: "behind",
                          color: addNorthStarKRColor,
                          dueDate: addNorthStarKRDueDate || null,
                        }]);
                        setAddingNorthStarKR(false);
                        setAddNorthStarKRDueDate("");
                        setAddNorthStarKRColor("#64748b");
                      }}
                      onCancel={() => {
                        setAddingNorthStarKR(false);
                        setAddNorthStarKRDueDate("");
                        setAddNorthStarKRColor("#64748b");
                      }}
                    />
                    <div className="flex items-center gap-4 px-2 pb-1">
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Color</label>
                        <input
                          type="color"
                          value={addNorthStarKRColor}
                          onChange={(e) => setAddNorthStarKRColor(e.target.value)}
                          className="h-5 w-5 rounded cursor-pointer border border-border/30 bg-transparent p-0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Due Date</label>
                        <input
                          type="date"
                          value={addNorthStarKRDueDate}
                          onChange={(e) => setAddNorthStarKRDueDate(e.target.value)}
                          className="text-[9px] font-mono bg-muted/20 border border-border/30 rounded px-1.5 py-0.5 text-foreground outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : northStar ? (
                  <button
                    onClick={() => {
                      setAddingNorthStarKR(true);
                      setAddNorthStarKRColor("#64748b");
                      setAddNorthStarKRDueDate("");
                    }}
                    className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <Plus className="h-2.5 w-2.5 stroke-[2]" /> Add Key Result
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Milestones (Aggregated from Objectives) */}
          <div className="flex flex-col border border-border/20 bg-background/60 backdrop-blur-xl flex-1 min-h-0 overflow-hidden rounded-2xl shadow-sm">
            <SectionHead 
              title="Next Up" 
              icon={Milestone} 
              badge={<span className="text-[9px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{completedMilestonesCount}/{aggregatedMilestones.length}</span>} 
            />
            <div ref={nextUpScrollRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide py-2">
              {aggregatedMilestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
                  <Milestone className="h-6 w-6 stroke-[1.5] text-muted-foreground/30" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">No milestones</span>
                </div>
              ) : aggregatedMilestones.map(m => (
                <div key={m.id} className="group flex flex-col gap-1.5 px-4 py-3 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleNextUpMilestone(m.objId, m.id, m.progress)}
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 rounded-[4px] border-[1.5px] transition-all flex items-center justify-center",
                        m.progress >= 100
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-muted-foreground/30 hover:border-foreground/50 bg-transparent",
                      )}
                      aria-label={m.progress >= 100 ? "Mark milestone incomplete" : "Mark milestone complete"}
                    >
                      {m.progress >= 100 && <Check className="h-2.5 w-2.5 text-background stroke-3" />}
                    </button>
                    <span
                      className={cn("text-[12px] font-medium truncate flex-1 text-left leading-tight", m.progress >= 100 ? "text-muted-foreground/50 line-through decoration-muted-foreground/20" : "text-foreground")}
                    >
                      {m.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ backgroundColor: m.objColor ?? "#64748b" }} />
                    <span className="text-[9px] font-medium text-muted-foreground/70 truncate flex-1">{m.objTitle}</span>
                    <span className="text-[8px] font-mono border border-border/40 px-1 py-0.5 rounded text-muted-foreground/60 bg-muted/20">{m.objTier}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── COL 2: OBJECTIVES LIST ─── */}
        <div className="flex flex-col border border-border/20 bg-background/60 backdrop-blur-xl min-h-0 overflow-hidden rounded-2xl shadow-sm">
          <SectionHead
            title="Objectives"
            icon={Flag}
            badge={
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground bg-emerald-500/10 text-emerald-500/80 px-1.5 py-0.5 rounded">{completedObjectives}/{totalObjs}</span>
                {activeTier && (
                  <button onClick={() => setActiveTier(null)} className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors bg-muted/40 px-1.5 py-0.5 rounded">Clear ×</button>
                )}
                <span className="text-[9px] font-mono text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded border border-border/30">{filteredObjs.length}</span>
              </div>
            }
          />
          <div className="flex flex-col gap-2 px-4 py-2 border-b border-border/10">
            <div className="flex items-center gap-2">
              <input
                value={objectiveQuery}
                onChange={(e) => setObjectiveQuery(e.target.value)}
                placeholder="Search objectives, tier, linked KR..."
                className="h-7 flex-1 min-w-0 bg-transparent border border-border/30 px-2 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
              <select
                value={objectiveStatus}
                onChange={(e) => setObjectiveStatus(e.target.value as "all" | Status)}
                className="h-7 bg-transparent border border-border/30 px-2 text-[9px] font-mono text-muted-foreground"
              >
                <option value="all">All statuses</option>
                <option value="on-track">On track</option>
                <option value="at-risk">At risk</option>
                <option value="behind">Behind</option>
              </select>
              <select
                value={objectiveSort}
                onChange={(e) => setObjectiveSort(e.target.value as "progress-desc" | "progress-asc" | "az" | "tier")}
                className="h-7 bg-transparent border border-border/30 px-2 text-[9px] font-mono text-muted-foreground"
              >
                <option value="progress-desc">Progress ↓</option>
                <option value="progress-asc">Progress ↑</option>
                <option value="tier">Tier</option>
                <option value="az">A → Z</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              {tierList.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTier(activeTier === t ? null : t)}
                  className={cn(
                    "px-2 py-1 text-[8px] font-mono uppercase tracking-widest border transition-colors",
                    activeTier === t
                      ? "border-foreground/40 text-foreground bg-muted/20"
                      : "border-border/30 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-muted-foreground/80">
                <span className="border border-emerald-500/30 px-1.5 py-0.5">On track {objectiveStatusCounts["on-track"]}</span>
                <span className="border border-amber-500/30 px-1.5 py-0.5">At risk {objectiveStatusCounts["at-risk"]}</span>
                <span className="border border-rose-500/30 px-1.5 py-0.5">Behind {objectiveStatusCounts.behind}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-3 space-y-3 bg-muted/5">
            {filteredObjs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center border border-dashed border-border/40 bg-background rounded-xl">
                <Target className="h-6 w-6 stroke-[1.5] text-muted-foreground/30" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">No objectives match</span>
              </div>
            )}
            {filteredObjs.map(obj => (
              <div key={obj.id} className={cn(
                "flex flex-col bg-background rounded-xl transition-all duration-200 overflow-hidden",
                expandedObj === obj.id ? "border border-border/50 shadow-md" : "border border-border/20 shadow-sm hover:border-border/40 hover:shadow-md"
              )}>
                {/* Objective row (Card Header) */}
                <div 
                  className="group flex flex-col p-4 cursor-pointer relative" 
                  onClick={() => toggleObjectiveExpanded(obj.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-[3px] border border-border/40 shadow-sm"
                        style={{ backgroundColor: obj.color ?? "#64748b" }}
                      />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80 shrink-0">{obj.tier}</span>
                      <span className={cn("text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0", statusPillColor[obj.status])}>{statusText[obj.status]}</span>
                      {obj.keyResultId && (
                        <span className="text-[9px] font-mono text-muted-foreground/50 truncate hidden sm:block">
                          → {mainKrTitleById[obj.keyResultId]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[13px] font-mono font-bold tabular-nums text-foreground">{obj.progress}%</span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedObj === obj.id && "rotate-180")} />
                    </div>
                  </div>

                  {editingObjectiveId === obj.id ? (
                    <div className="my-1 py-1 pr-6" onClick={(e) => e.stopPropagation()}>
                      <InlineInput
                        placeholder="Objective title..."
                        initialValue={editDraft || obj.title}
                        onSubmit={(val) => { setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, title: val } : o)); setEditingObjectiveId(null); setEditDraft(""); }}
                        onCancel={() => { setEditingObjectiveId(null); setEditDraft(""); }}
                      />
                    </div>
                  ) : (
                    <button
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingObjectiveId(obj.id); setEditDraft(obj.title); }}
                      className="text-left text-[14px] font-semibold text-foreground tracking-tight leading-snug pr-8 break-words"
                    >
                      {obj.title}
                    </button>
                  )}

                  <div className="flex items-center gap-4 mt-4">
                    <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden flex-1 relative">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", statusColor[obj.status])}
                        style={{ width: `${obj.progress}%`, backgroundColor: obj.color ?? undefined }}
                      />
                    </div>
                    {obj.dueDate && (
                      <span className={cn("text-[9px] font-mono tracking-widest shrink-0 border px-1.5 py-0.5 rounded", 
                        new Date(obj.dueDate) < new Date() && obj.progress < 100 ? "text-rose-500 border-rose-500/30 bg-rose-500/10" : "text-muted-foreground border-border/40"
                      )}>
                        DUE: {new Date(obj.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">{obj.keyResults.length} Milestones</span>
                  </div>
                </div>

                {/* Expanded: Key Results */}
                {expandedObj === obj.id && (
                  <div className="flex flex-col bg-muted/5 border-t border-border/10 p-4 pt-3 gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/80 font-bold">Execution Plan</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setObjectiveMilestoneState(obj.id, true)}
                          className="text-[9px] font-mono uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded-md text-emerald-600 transition-colors hover:bg-emerald-500/20"
                        >
                          Complete all
                        </button>
                        <button
                          onClick={() => setObjectiveMilestoneState(obj.id, false)}
                          className="text-[9px] font-mono uppercase tracking-widest border border-border/40 bg-background px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {obj.keyResults.map(kr => (
                        <div key={kr.id} className="group/kr flex items-center gap-3 bg-background border border-border/20 rounded-lg p-2 transition-all hover:border-border/40 hover:shadow-sm">
                          {editingObjectiveKR?.objId === obj.id && editingObjectiveKR?.krId === kr.id ? (
                            <div className="flex-1 min-w-0 pb-0.5">
                              <InlineInput
                                placeholder="Milestone title..."
                                initialValue={editDraft || kr.title}
                                onSubmit={(val) => {
                                  setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, keyResults: o.keyResults.map(k => k.id === kr.id ? { ...k, title: val } : k) } : o));
                                  setEditingObjectiveKR(null);
                                  setEditDraft("");
                                }}
                                onCancel={() => { setEditingObjectiveKR(null); setEditDraft(""); }}
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  const isDone = kr.progress >= 100;
                                  setObjs(prev => prev.map(o => o.id === obj.id ? {
                                    ...o,
                                    keyResults: o.keyResults.map(k => k.id === kr.id ? {
                                      ...k,
                                      progress: isDone ? 0 : 100,
                                      status: isDone ? "behind" : "on-track",
                                    } : k),
                                  } : o));
                                }}
                                className={cn(
                                  "h-4 w-4 shrink-0 rounded-[4px] border-[1.5px] transition-all flex items-center justify-center",
                                  kr.progress >= 100
                                    ? "border-emerald-500 bg-emerald-500"
                                    : "border-muted-foreground/30 hover:border-muted-foreground/60 bg-transparent",
                                )}
                                aria-label={kr.progress >= 100 ? "Mark milestone incomplete" : "Mark milestone complete"}
                              >
                                {kr.progress >= 100 && <Check className="h-3 w-3 text-background stroke-[3]" />}
                              </button>
                              
                              <button
                                onDoubleClick={() => { setEditingObjectiveKR({ objId: obj.id, krId: kr.id }); setEditDraft(kr.title); }}
                                className={cn(
                                  "text-left text-[12px] flex-1 truncate transition-colors font-medium",
                                  kr.progress >= 100 ? "text-muted-foreground/60 line-through decoration-muted-foreground/30" : "text-foreground/90"
                                )}
                              >
                                {kr.title}
                              </button>

                              <div className="flex items-center gap-2 opacity-0 group-hover/kr:opacity-100 transition-opacity">
                                <input
                                  type="date"
                                  value={kr.dueDate ?? ""}
                                  onChange={(e) => {
                                    setObjs(prev => prev.map(o => o.id === obj.id ? {
                                      ...o,
                                      keyResults: o.keyResults.map(k => k.id === kr.id ? { ...k, dueDate: e.target.value || null } : k)
                                    } : o));
                                  }}
                                  className="text-[9px] font-mono text-muted-foreground bg-transparent border border-border/30 px-1 py-0.5 rounded outline-none"
                                />
                                <button onClick={() => deleteKRFromObj(obj.id, kr.id)} className="p-1.5 text-muted-foreground hover:text-rose-500 transition-all rounded-md hover:bg-rose-500/10">
                                  <Trash2 className="h-3 w-3 stroke-[1.5]" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      
                      {addingKR === obj.id ? (
                        <div className="bg-background border border-emerald-500/30 rounded-lg p-1.5 flex flex-col gap-2">
                          <InlineInput
                            placeholder="New milestone..."
                            onSubmit={val => addKRToObj(obj.id, val)}
                            onCancel={() => { setAddingKR(null); setAddKrDueDate(""); }}
                          />
                          <div className="flex items-center gap-2 px-2 pb-1">
                            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Due Date</label>
                            <input
                              type="date"
                              value={addKrDueDate}
                              onChange={(e) => setAddKrDueDate(e.target.value)}
                              className="text-[9px] font-mono bg-muted/20 border border-border/30 rounded px-1.5 py-0.5 text-foreground outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setAddingKR(obj.id)} 
                          className="flex items-center gap-2 mt-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors p-2 border border-dashed border-border/40 rounded-lg justify-center hover:bg-muted/50"
                        >
                          <Plus className="h-3 w-3 stroke-2" /> Add Milestone
                        </button>
                      )}
                    </div>
                    
                    {/* Settings row for the expanded card */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/5">
                      <div className="flex items-center gap-3">
                        <label className="group flex items-center gap-2 cursor-pointer">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="color"
                              value={obj.color ?? "#64748b"}
                              onChange={(e) => setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, color: e.target.value } : o))}
                              className="h-5 w-5 rounded cursor-pointer opacity-0 absolute inset-0 z-10"
                            />
                            <div className="h-4 w-4 rounded-sm border border-border/40 shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: obj.color ?? "#64748b" }} />
                          </div>
                          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Color</span>
                        </label>
                        <div className="h-3 w-px bg-border/40" />
                        <label className="group flex items-center gap-2 cursor-pointer">
                          <input
                            type="date"
                            value={obj.dueDate ?? ""}
                            onChange={(e) => setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, dueDate: e.target.value || null } : o))}
                            className="text-[9px] font-mono text-muted-foreground bg-transparent border border-border/30 px-1 py-0.5 rounded outline-none"
                          />
                        </label>
                      </div>
                      <button onClick={() => deleteObj(obj.id)} className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-rose-500 transition-colors px-2 py-1 rounded hover:bg-rose-500/10">
                        <Trash2 className="h-3 w-3 stroke-[1.5]" /> Delete Objective
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ))}

            {/* Add Objective */}
            {addingObj ? (
              <div className="bg-background border border-emerald-500/30 rounded-xl p-4 shadow-sm mt-2 mb-4">
                {/* Tier selector */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Tier:</span>
                  <div className="flex items-center bg-muted/30 rounded-md p-0.5">
                    {tierList.map(t => (
                      <button 
                        key={t} 
                        onClick={() => setAddObjTier(t)} 
                        className={cn(
                          "px-2 py-1 text-[9px] font-mono uppercase tracking-widest rounded transition-all", 
                          addObjTier === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Linked KR</label>
                    <select
                      value={addObjLinkId ?? ""}
                      onChange={(e) => setAddObjLinkId(e.target.value || null)}
                      className="text-[10px] font-mono bg-muted/20 border border-border/30 rounded-md px-2 py-1 text-foreground outline-none"
                    >
                      {northStarKRs.map((kr) => (
                        <option key={kr.id} value={kr.id}>{kr.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Color</label>
                    <input
                      type="color"
                      value={addObjColor}
                      onChange={(e) => setAddObjColor(e.target.value)}
                      className="h-6 w-6 rounded cursor-pointer border border-border/30 bg-transparent p-0 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Due Date</label>
                    <input
                      type="date"
                      value={addObjDueDate}
                      onChange={(e) => setAddObjDueDate(e.target.value)}
                      className="text-[10px] font-mono bg-muted/20 border border-border/30 rounded-md px-2 py-1 text-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-border/10">
                  <InlineInput placeholder="Objective title..." onSubmit={addObj} onCancel={() => setAddingObj(false)} />
                </div>
              </div>
            ) : (
              northStarKRs.length > 0 ? (
                <button 
                  onClick={() => setAddingObj(true)} 
                  className="w-full flex items-center justify-center gap-2 p-3 mt-2 mb-4 border border-dashed border-border/40 rounded-xl text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-muted/20 transition-all"
                >
                  <Plus className="h-3 w-3 stroke-2" /> New Objective
                </button>
              ) : (
                <div className="flex items-center justify-center p-4 mt-2 mb-4 border border-dashed border-border/40 rounded-xl text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                  Add a main KR first to create objectives
                </div>
              )
            )}
          </div>
        </div>

        {/* ─── COL 3: BURNDOWN + STATUS ─── */}
        <div className="flex flex-col gap-6 min-h-0 overflow-hidden">

          {/* Burndown */}
          <div className="flex flex-col border border-border/20 bg-background/60 backdrop-blur-xl flex-1 min-h-0 rounded-2xl shadow-sm overflow-hidden">
            <SectionHead title="Burndown" icon={TrendingUp} badge={<span className="text-[9px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">Q4</span>} />
            <div className="flex-1 min-h-0 p-3 pb-0">
              {burndownData.length > 0 ? (
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
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  No burndown data yet
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border/20">
              <span className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-muted-foreground"><div className="w-3 h-[2px] border-t border-dashed border-muted-foreground" /> Planned</span>
              <span className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-muted-foreground"><div className="w-3 h-[2px] bg-rose-500/60" /> Actual</span>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="flex flex-col border border-border/20 bg-background/60 backdrop-blur-xl shrink-0 rounded-2xl shadow-sm overflow-hidden">
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
                <div className="px-4 py-3 text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-t border-border/10">
                  {statusSummary}
                </div>
            </div>
          </div>

          {/* Alignment */}
          <div className="flex flex-col border border-border/20 bg-background/60 backdrop-blur-xl shrink-0 rounded-2xl shadow-sm overflow-hidden">
            <SectionHead title="Alignment" icon={Crosshair} />
            <div className="px-5 py-5 flex items-center gap-5">
              <div className="flex flex-col flex-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">North Star ↔ Execution</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl font-semibold tracking-tighter text-foreground tabular-nums leading-none">{animatedAlignmentScore}%</span>
                  <span className={cn("text-[10px] font-mono mb-1 flex items-center gap-0.5", alignmentScore >= 80 ? "text-emerald-500/70" : alignmentScore >= 55 ? "text-amber-500/70" : "text-rose-500/70")}>
                    <ArrowUpRight className="h-3 w-3 stroke-[2]" /> {alignmentStatus}
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-2">{alignmentNote}</span>
              </div>
              <div className="h-12 w-px bg-border/30" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Drift</span>
                <span className="text-2xl font-semibold tracking-tighter text-muted-foreground tabular-nums leading-none mt-1">{animatedAlignmentDrift}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
