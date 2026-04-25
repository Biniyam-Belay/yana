"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Target, Crosshair, Flag, ArrowUpRight, Plus,
  Flame, TrendingUp, Trash2, Search,
  Milestone, Star, Eye, X, Check, ChevronDown,
  CalendarDays, Palette, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, ResponsiveContainer, CartesianGrid,
  Tooltip as RechartsTooltip, ReferenceLine
} from "recharts";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import type { Status, Tier } from "@/store/north-star";




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

// ─── FORMAT ───
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtFull = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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

// ─── PORTAL HOOK: flicker-free, viewport-aware floating panel ───────────────
import { useLayoutEffect } from "react";

function useFloatingPortal(
  triggerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  panelW = 268,
  panelH = 320,
) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // useLayoutEffect fires synchronously before the browser paints — no flash at (0,0)
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setCoords(null);
      return;
    }

    const compute = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const GAP = 6;

      // Horizontal: prefer align-left, flip left if overflowing right
      let left = r.left;
      if (left + panelW + 8 > vw) left = Math.max(8, vw - panelW - 8);

      // Vertical: prefer below, flip above if not enough room below
      let top: number;
      if (r.bottom + GAP + panelH > vh && r.top - GAP - panelH > 0) {
        // Open upward
        top = r.top - GAP - panelH;
      } else {
        // Open downward
        top = r.bottom + GAP;
      }

      setCoords({ top, left });
    };

    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, triggerRef, panelW, panelH]);

  return { coords, mounted };
}

// ─── AMAZING COLOR PICKER ───
const PALETTE_ROWS = [
  { label: "Slate",  colors: ["#f8fafc","#94a3b8","#64748b","#334155","#0f172a"] },
  { label: "Vivid",  colors: ["#f43f5e","#ec4899","#a855f7","#6366f1","#3b82f6"] },
  { label: "Neon",   colors: ["#fb923c","#facc15","#4ade80","#34d399","#22d3ee"] },
  { label: "Muted",  colors: ["#fda4af","#c4b5fd","#93c5fd","#6ee7b7","#fcd34d"] },
];

function ColorPicker({ value, onChange, label = "Color" }: { value: string; onChange: (c: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { coords, mounted } = useFloatingPortal(triggerRef as React.RefObject<HTMLElement>, open, 268, 285);

  // sync hex input when value changes externally
  useEffect(() => { setHex(value); }, [value]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const commitHex = (raw: string) => {
    const clean = raw.startsWith("#") ? raw : "#" + raw;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) { onChange(clean); setHex(clean); }
  };

  const panel = open && coords !== null && mounted ? createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top: coords!.top, left: coords!.left, zIndex: 9999, width: 268 }}
      className="bg-background/95 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Live preview strip */}
      <div className="h-10 w-full relative" style={{ backgroundColor: value }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/20" />
        <div className="absolute bottom-2 left-3 flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold tracking-widest uppercase" style={{ color: parseInt(value.slice(1,3),16)*0.299 + parseInt(value.slice(3,5),16)*0.587 + parseInt(value.slice(5,7),16)*0.114 > 150 ? '#000' : '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
            {label}
          </span>
        </div>
        <button onClick={() => setOpen(false)} className="absolute top-2 right-2 p-0.5 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all">
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Palette rows */}
        {PALETTE_ROWS.map(row => (
          <div key={row.label} className="flex flex-col gap-1">
            <span className="text-[7px] font-mono uppercase tracking-[0.18em] text-muted-foreground/50">{row.label}</span>
            <div className="flex gap-1.5">
              {row.colors.map(c => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setHex(c); setOpen(false); }}
                  title={c}
                  className="relative flex-1 h-7 rounded-lg border-2 transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    borderColor: value === c ? 'rgba(255,255,255,0.9)' : 'transparent',
                    boxShadow: value === c ? `0 0 0 2px ${c}, 0 0 0 4px rgba(255,255,255,0.3)` : 'inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  {value === c && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-3 w-3" style={{ color: parseInt(c.slice(1,3),16)*0.299 + parseInt(c.slice(3,5),16)*0.587 + parseInt(c.slice(5,7),16)*0.114 > 150 ? '#000' : '#fff' }} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Divider */}
        <div className="h-px bg-border/30" />

        {/* Hex input + native picker */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={value}
              onChange={e => { onChange(e.target.value); setHex(e.target.value); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Pick any color"
            />
            <div
              className="h-8 w-8 rounded-lg border border-border/40 shadow-inner cursor-pointer shrink-0 flex items-center justify-center relative overflow-hidden"
              style={{ backgroundColor: value }}
            >
              <div className="absolute inset-0" style={{ background: 'conic-gradient(from 0deg, #f43f5e, #f97316, #facc15, #4ade80, #22d3ee, #6366f1, #a855f7, #f43f5e)', opacity: 0.7 }} />
              <Palette className="h-3.5 w-3.5 text-white drop-shadow relative z-10" />
            </div>
          </div>
          <div className="flex flex-1 items-center bg-muted/40 border border-border/30 rounded-lg px-2 gap-2">
            <span className="text-[10px] font-mono text-muted-foreground select-none">#</span>
            <input
              type="text"
              value={hex.replace('#', '')}
              onChange={e => setHex('#' + e.target.value)}
              onBlur={e => commitHex('#' + e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitHex('#' + (e.target as HTMLInputElement).value); }}
              maxLength={6}
              spellCheck={false}
              className="flex-1 bg-transparent text-[11px] font-mono text-foreground outline-none uppercase tracking-widest py-1.5"
              placeholder="64748b"
            />
            <div className="h-4 w-4 rounded-[4px] shrink-0 border border-border/40" style={{ backgroundColor: value }} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative flex items-center gap-2">
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className="group flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        title={label}
      >
        <span
          className="h-4 w-4 rounded-[4px] border border-border/40 shadow-sm transition-all duration-150 group-hover:scale-110 group-hover:shadow-md"
          style={{ backgroundColor: value, boxShadow: `0 0 0 2px ${value}22` }}
        />
        <Palette className="h-2.5 w-2.5 opacity-60" />
      </button>
      {panel}
    </div>
  );
}

// ─── CUSTOM DATE PICKER ───
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function DatePicker({ value, onChange, label = "Due date", placeholder = "No date" }: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? now.getMonth());
  const { coords, mounted } = useFloatingPortal(triggerRef as React.RefObject<HTMLElement>, open, 236, 290);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const select = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const todayStr = today();
  const isTodayDay = (day: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` === todayStr;
  const isSelected = (day: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` === value;

  const calPanel = open && coords !== null && mounted ? createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top: coords!.top, left: coords!.left, zIndex: 9999, width: 236 }}
      className="bg-background/95 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl p-3 overflow-hidden"
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-all">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <span key={d} className="text-center text-[8px] font-mono uppercase tracking-widest text-muted-foreground/50 py-0.5">{d}</span>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => (
          day === null ? <span key={i} /> : (
            <button
              key={i}
              onClick={() => select(day)}
              className={cn(
                "h-7 w-7 text-[10px] font-mono rounded-lg transition-all mx-auto flex items-center justify-center",
                isSelected(day)
                  ? "bg-foreground text-background font-bold shadow-sm"
                  : isTodayDay(day)
                    ? "bg-muted/80 text-foreground ring-1 ring-border/60 font-semibold"
                    : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {day}
            </button>
          )
        ))}
      </div>
      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-border/20 flex items-center gap-2">
        <button
          onClick={() => { onChange(todayStr); setOpen(false); }}
          className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/40"
        >
          Today
        </button>
        {value && (
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="ml-auto text-[8px] font-mono uppercase tracking-widest text-rose-500/60 hover:text-rose-500 transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10"
          >
            Clear
          </button>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "group flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest transition-colors",
          value ? "text-foreground/80 hover:text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        title={label}
      >
        <CalendarDays className="h-3 w-3 opacity-60" />
        <span>{value ? fmtFull(value) : placeholder}</span>
      </button>
      {value && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="text-muted-foreground/50 hover:text-rose-500 transition-colors"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
      {calPanel}
    </div>
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

  // Burndown date range
  const [sprintStart, setSprintStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // start of current week
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [sprintEnd, setSprintEnd] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (13 - d.getDay())); // 2 weeks from start of week
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

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

  // ─── Real-time burndown derived from date range + live completion ───
  const burndownData = useMemo(() => {
    if (!sprintStart || !sprintEnd) return [];
    const start = new Date(sprintStart + "T00:00:00");
    const end = new Date(sprintEnd + "T00:00:00");
    const nowMs = Date.now();
    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) return [];

    // Total work units = number of milestones across all objectives
    const allMilestones = objs.flatMap(o => o.keyResults);
    const totalWork = allMilestones.length;
    const doneWork = allMilestones.filter(kr => kr.progress >= 100).length;
    // Remaining work
    const remaining = totalWork - doneWork;

    // Build day-by-day points capped to today
    const dayMs = 1000 * 60 * 60 * 24;
    const totalDays = Math.round(totalMs / dayMs);
    const cappedDays = Math.min(totalDays, Math.round((nowMs - start.getTime()) / dayMs));

    // Ideal burndown slope: totalWork → 0 over totalDays
    const points: { label: string; planned: number; actual: number | null; isToday?: boolean }[] = [];
    const step = Math.max(1, Math.floor(totalDays / 10)); // sample ~10 points

    for (let d = 0; d <= totalDays; d += step) {
      const date = new Date(start.getTime() + d * dayMs);
      const label = fmt(date);
      const planned = totalWork > 0 ? Math.max(0, Math.round(totalWork * (1 - d / totalDays))) : 0;
      const isPast = d <= cappedDays;
      // Actual remaining: interpolate linearly between start (totalWork) and now (remaining)
      const actual: number | null = isPast
        ? Math.max(0, Math.round(totalWork - (doneWork * (d / Math.max(cappedDays, 1)))))  
        : null;
      const isT = Math.abs(d - cappedDays) < step / 2;
      points.push({ label, planned, actual, isToday: isT });
    }
    // Always include the end point
    if (totalDays % step !== 0) {
      const isPastEnd = cappedDays >= totalDays;
      points.push({
        label: fmt(end),
        planned: 0,
        actual: isPastEnd ? remaining : null,
        isToday: false,
      });
    }
    return points;
  }, [sprintStart, sprintEnd, objs]);

  // ─── Helpers

  const deleteObj = (id: string) => setObjs(prev => prev.filter(o => o.id !== id));
  const deleteNorthStarKR = (id: string) => {
    setNorthStarKRs(prev => prev.filter(k => k.id !== id));
    setObjs(prev => prev.map(o => o.keyResultId === id ? { ...o, keyResultId: null } : o));
  };
  const addObj = (title: string) => {
    // keyResultId is optional — allow objectives without a linked KR
    const linkedKrId = addObjLinkId ?? northStarKRs[0]?.id ?? null;
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
      <header className="shrink-0 flex items-center justify-between pb-6 px-2">
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
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] xl:grid-cols-[340px_1fr_340px] gap-6 xl:gap-8 overflow-hidden px-2 pb-2">

        {/* ─── COL 1: NORTH STAR + MILESTONES ─── */}
        <div className="flex flex-col gap-6 xl:gap-8 min-h-0 overflow-hidden">

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
                    <div key={kr.id} className="group flex flex-col gap-2 p-2.5 rounded-xl border border-transparent hover:border-border/10 hover:bg-muted/5 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <ColorPicker
                          value={kr.color ?? "#64748b"}
                          onChange={(c) => setNorthStarKRs(prev => prev.map(k => k.id === kr.id ? { ...k, color: c } : k))}
                        />
                        <button
                          onDoubleClick={() => { setEditingNorthStarKRId(kr.id); setEditDraft(kr.title); }}
                          className="text-left text-[11.5px] font-medium text-foreground leading-tight flex-1"
                        >
                          {kr.title}
                        </button>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DatePicker
                            value={kr.dueDate ?? ""}
                            onChange={(v) => setNorthStarKRs(prev => prev.map(k => k.id === kr.id ? { ...k, dueDate: v || null } : k))}
                            placeholder="Due date"
                          />
                        </div>
                        <button onClick={() => deleteNorthStarKR(kr.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-rose-500"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                      </div>
                      <div className="flex items-center gap-2 pl-[22px]">
                        <div className="flex-1 h-[2.5px] bg-border/20 rounded-full overflow-hidden"><div className={cn("h-full rounded-full", statusColor[kr.status])} style={{ width: `${kr.progress}%`, opacity: 0.8, backgroundColor: kr.color ?? undefined }} /></div>
                        <span className="text-[10px] font-mono tabular-nums font-bold text-muted-foreground/80">{kr.progress}%</span>
                        {kr.dueDate && (
                          <span className={cn(
                            "text-[8px] font-mono uppercase tracking-widest border px-1.5 py-0.5 rounded-md",
                            new Date(kr.dueDate).getTime() < Date.now() && kr.progress < 100
                              ? "text-rose-500 border-rose-500/30 bg-rose-500/10"
                              : "text-muted-foreground border-border/20 bg-muted/10"
                          )}>
                            {new Date(kr.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <span className="text-[8px] font-mono text-muted-foreground/50 border border-border/10 rounded-md px-1.5 py-0.5 bg-background">
                          {objs.filter((o) => o.keyResultId === kr.id).filter((o) => o.progress >= 100).length}/
                          {objs.filter((o) => o.keyResultId === kr.id).length} objs
                        </span>
                      </div>
                    </div>
                  )
                ))}
                {northStar && addingNorthStarKR ? (
                  <div className="bg-background border border-border/20 shadow-sm rounded-xl p-3 flex flex-col gap-3 mt-1">
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
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <ColorPicker
                          value={addNorthStarKRColor}
                          onChange={setAddNorthStarKRColor}
                          label="Color"
                        />
                        <DatePicker
                          value={addNorthStarKRDueDate}
                          onChange={setAddNorthStarKRDueDate}
                          placeholder="Due date"
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground/45 uppercase tracking-widest">New KR</span>
                    </div>
                  </div>
                ) : northStar ? (
                  <button
                    onClick={() => {
                      setAddingNorthStarKR(true);
                      setAddNorthStarKRColor("#64748b");
                      setAddNorthStarKRDueDate("");
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 mt-2 border border-dashed border-border/30 rounded-xl text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 hover:border-border/50 transition-all shrink-0"
                  >
                    <Plus className="h-3 w-3 stroke-[2]" /> Add Key Result
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
              badge={<span className="text-[9px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-md border border-border/20 shadow-sm">{completedMilestonesCount}/{aggregatedMilestones.length}</span>} 
            />
            <div ref={nextUpScrollRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide p-3 gap-2 bg-muted/5">
              {aggregatedMilestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
                  <Milestone className="h-6 w-6 stroke-[1.5] text-muted-foreground/30" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">No milestones</span>
                </div>
              ) : aggregatedMilestones.map(m => (
                <div key={m.id} className="group flex flex-col gap-2 px-3.5 py-3 rounded-xl border border-border/15 bg-background shadow-sm hover:border-border/30 hover:shadow-md transition-all cursor-pointer shrink-0">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleNextUpMilestone(m.objId, m.id, m.progress)}
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 rounded-[4px] border-[1.5px] transition-all flex items-center justify-center",
                        m.progress >= 100
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-muted-foreground/30 hover:border-foreground/50 bg-transparent",
                      )}
                      aria-label={m.progress >= 100 ? "Mark milestone incomplete" : "Mark milestone complete"}
                    >
                      {m.progress >= 100 && <Check className="h-3 w-3 text-background stroke-3" />}
                    </button>
                    <div className="flex flex-col flex-1 min-w-0 pr-2">
                      <span
                        className={cn("text-[12.5px] font-medium truncate w-full text-left leading-tight", m.progress >= 100 ? "text-muted-foreground/50 line-through decoration-muted-foreground/20" : "text-foreground")}
                      >
                        {m.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-7">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: m.objColor ?? "#64748b" }} />
                    <span className="text-[9.5px] font-medium text-muted-foreground/75 truncate flex-1 leading-none">{m.objTitle}</span>
                    <span className="text-[8px] font-mono border border-border/40 px-1.5 py-0.5 rounded text-muted-foreground/60 bg-muted/20">{m.objTier}</span>
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
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">{completedObjectives}/{totalObjs}</span>
                <span className="text-[8px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/20">{filteredObjs.length} shown</span>
              </div>
            }
          />

          {/* ── Compact Filter Bar ── */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/10 shrink-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-muted/25 border border-border/20 rounded-lg px-2 h-7">
              <Search className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <input
                value={objectiveQuery}
                onChange={(e) => setObjectiveQuery(e.target.value)}
                placeholder="Search…"
                className="flex-1 min-w-0 bg-transparent text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 outline-none"
              />
              {objectiveQuery && (
                <button onClick={() => setObjectiveQuery("")} className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {tierList.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTier(activeTier === t ? null : t)}
                  className={cn(
                    "px-1.5 h-7 text-[8px] font-mono uppercase tracking-widest rounded-md border transition-all",
                    activeTier === t
                      ? "border-foreground/50 bg-foreground text-background"
                      : "border-border/25 text-muted-foreground hover:text-foreground hover:border-border/50",
                  )}
                >
                  {t[0]}
                </button>
              ))}
            </div>
            <select
              value={objectiveSort}
              onChange={(e) => setObjectiveSort(e.target.value as typeof objectiveSort)}
              className="h-7 bg-transparent border border-border/20 rounded-lg px-1.5 text-[9px] font-mono text-muted-foreground outline-none shrink-0"
            >
              <option value="progress-desc">↓ %</option>
              <option value="progress-asc">↑ %</option>
              <option value="tier">Tier</option>
              <option value="az">A–Z</option>
            </select>
            <select
              value={objectiveStatus}
              onChange={(e) => setObjectiveStatus(e.target.value as "all" | Status)}
              className="h-7 bg-transparent border border-border/20 rounded-lg px-1.5 text-[9px] font-mono text-muted-foreground outline-none shrink-0"
            >
              <option value="all">All</option>
              <option value="on-track">✓</option>
              <option value="at-risk">⚠</option>
              <option value="behind">✕</option>
            </select>
          </div>

          {/* ── Status strip ── */}
          <div className="flex items-center gap-0 px-3 py-1.5 border-b border-border/5 shrink-0">
            {[
              { label: "On track", count: objectiveStatusCounts["on-track"], bg: "bg-emerald-500" },
              { label: "At risk",  count: objectiveStatusCounts["at-risk"],  bg: "bg-amber-500"  },
              { label: "Behind",   count: objectiveStatusCounts.behind,      bg: "bg-rose-500"   },
            ].map(({ label, count, bg }) => (
              <div key={label} className="flex items-center gap-1.5 mr-4">
                <span className={cn("h-1.5 w-1.5 rounded-full", bg)} />
                <span className="text-[8px] font-mono text-muted-foreground/55 uppercase tracking-widest">
                  {label} <span className="text-foreground/60 font-bold">{count}</span>
                </span>
              </div>
            ))}
          </div>

          {/* ── Objective list ── */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col p-3 bg-muted/5">
            {filteredObjs.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-8">
                <Target className="h-6 w-6 stroke-[1.5] text-muted-foreground/20" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/35">No objectives match</span>
              </div>
            )}

            {filteredObjs.map((obj, idx) => {
              const isExpanded = expandedObj === obj.id;
              const isOverdue = obj.dueDate && new Date(obj.dueDate) < new Date() && obj.progress < 100;
              const completedKRs = obj.keyResults.filter(k => k.progress >= 100).length;
              const STATUS_DOT = { "on-track": "bg-emerald-500", "at-risk": "bg-amber-500", "behind": "bg-rose-500" }[obj.status];
              const TIER_COLOR = {
                Decade:  "text-violet-400 bg-violet-500/10 border-violet-500/20",
                Year:    "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                Quarter: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                Month:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              }[obj.tier];

              return (
                <div
                  key={obj.id}
                  className={cn(
                    "group/obj flex flex-col transition-all duration-300 shrink-0 overflow-hidden",
                    idx > 0 && "border-t border-border/10",
                    isExpanded ? "bg-background border-border/20 shadow-sm" : "hover:bg-muted/10",
                  )}
                >
                  {/* Compact header row */}
                  <div className="flex items-center gap-0 cursor-pointer" onClick={() => toggleObjectiveExpanded(obj.id)}>
                    <div
                      className="w-1 self-stretch shrink-0 transition-all duration-300"
                      style={{ backgroundColor: obj.color ?? "#64748b", opacity: isExpanded ? 1 : 0.6 }}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3.5">
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT)} />
                      {editingObjectiveId === obj.id ? (
                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
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
                          className="text-left text-[12px] font-medium text-foreground leading-tight flex-1 min-w-0 truncate"
                        >
                          {obj.title}
                        </button>
                      )}
                      <span className={cn("shrink-0 text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-md border", TIER_COLOR)}>{obj.tier[0]}</span>
                      {obj.dueDate && (
                        <span className={cn(
                          "shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded border",
                          isOverdue ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : "text-muted-foreground/55 border-border/20"
                        )}>
                          {new Date(obj.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                      <span className={cn(
                        "shrink-0 text-[12px] font-mono font-bold tabular-nums w-9 text-right tracking-tight",
                        obj.progress >= 100 ? "text-emerald-500" : obj.progress >= 50 ? "text-foreground" : "text-muted-foreground/80"
                      )}>{obj.progress}%</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-300 ml-1", isExpanded ? "rotate-180 text-foreground" : "text-muted-foreground/40")} />
                    </div>
                  </div>

                  {/* Thin progress bar */}
                  <div className="h-[2px] bg-border/5 mx-5 mb-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${obj.progress}%`, backgroundColor: obj.color ?? "#64748b" }} />
                  </div>

                  {/* Expanded drawer */}
                  {isExpanded && (
                    <div className="flex flex-col border-t border-border/10 bg-muted/5 px-2 pb-2">
                      {/* Drawer toolbar */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border/8" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/55">
                            {completedKRs}/{obj.keyResults.length} milestones
                          </span>
                          {obj.keyResults.length > 0 && (
                            <>
                              <button onClick={() => setObjectiveMilestoneState(obj.id, true)} className="text-[8px] font-mono uppercase tracking-widest text-emerald-500/70 hover:text-emerald-500 transition-colors">All done</button>
                              <button onClick={() => setObjectiveMilestoneState(obj.id, false)} className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors">Reset</button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <ColorPicker value={obj.color ?? "#64748b"} onChange={(c) => setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, color: c } : o))} label="Color" />
                          <span className="h-3 w-px bg-border/30" />
                          <DatePicker value={obj.dueDate ?? ""} onChange={(v) => setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, dueDate: v || null } : o))} placeholder="Due date" />
                          <span className="h-3 w-px bg-border/30" />
                          <button onClick={() => deleteObj(obj.id)} className="text-muted-foreground/35 hover:text-rose-500 transition-colors p-0.5"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                        </div>
                      </div>

                      {/* Milestone rows */}
                      <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {obj.keyResults.map((kr) => {
                          const krDone = kr.progress >= 100;
                          const krOverdue = kr.dueDate && new Date(kr.dueDate) < new Date() && !krDone;
                          return (
                            <div key={kr.id} className="group/kr flex items-center gap-2.5 px-3 py-2 border-b border-border/5 last:border-0 hover:bg-muted/10 transition-colors">
                              <button
                                onClick={() => setObjs(prev => prev.map(o => o.id === obj.id ? {
                                  ...o,
                                  keyResults: o.keyResults.map(k => k.id === kr.id ? { ...k, progress: krDone ? 0 : 100, status: krDone ? "behind" : "on-track" } : k),
                                } : o))}
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 rounded-[3px] border transition-all flex items-center justify-center",
                                  krDone ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/25 hover:border-muted-foreground/60 bg-transparent",
                                )}
                              >
                                {krDone && <Check className="h-2 w-2 text-background stroke-[3]" />}
                              </button>
                              {editingObjectiveKR?.objId === obj.id && editingObjectiveKR?.krId === kr.id ? (
                                <div className="flex-1 min-w-0">
                                  <InlineInput
                                    placeholder="Milestone title..."
                                    initialValue={editDraft || kr.title}
                                    onSubmit={(val) => { setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, keyResults: o.keyResults.map(k => k.id === kr.id ? { ...k, title: val } : k) } : o)); setEditingObjectiveKR(null); setEditDraft(""); }}
                                    onCancel={() => { setEditingObjectiveKR(null); setEditDraft(""); }}
                                  />
                                </div>
                              ) : (
                                <button
                                  onDoubleClick={() => { setEditingObjectiveKR({ objId: obj.id, krId: kr.id }); setEditDraft(kr.title); }}
                                  className={cn("text-left text-[11px] flex-1 min-w-0 truncate leading-tight", krDone ? "text-muted-foreground/35 line-through" : "text-foreground/80")}
                                >
                                  {kr.title}
                                </button>
                              )}
                              {kr.dueDate && (
                                <span className={cn(
                                  "shrink-0 text-[7px] font-mono px-1 py-0.5 rounded border",
                                  krOverdue ? "text-rose-400 border-rose-500/25 bg-rose-500/8" : "text-muted-foreground/45 border-border/15"
                                )}>
                                  {new Date(kr.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 opacity-0 group-hover/kr:opacity-100 transition-opacity shrink-0">
                                <DatePicker
                                  value={kr.dueDate ?? ""}
                                  onChange={(v) => setObjs(prev => prev.map(o => o.id === obj.id ? { ...o, keyResults: o.keyResults.map(k => k.id === kr.id ? { ...k, dueDate: v || null } : k) } : o))}
                                  placeholder="Due date"
                                />
                                <button onClick={() => deleteKRFromObj(obj.id, kr.id)} className="p-0.5 text-muted-foreground/35 hover:text-rose-500 transition-colors">
                                  <Trash2 className="h-2.5 w-2.5 stroke-[1.5]" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add milestone */}
                        {addingKR === obj.id ? (
                          <div className="px-5 py-3 flex flex-col gap-2 bg-muted/10">
                            <InlineInput placeholder="New milestone..." onSubmit={val => addKRToObj(obj.id, val)} onCancel={() => { setAddingKR(null); setAddKrDueDate(""); }} />
                            <DatePicker value={addKrDueDate} onChange={setAddKrDueDate} placeholder="Due date" />
                          </div>
                        ) : (
                          <button onClick={() => setAddingKR(obj.id)} className="flex items-center gap-1.5 px-5 py-3 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 hover:text-foreground transition-colors hover:bg-muted/10">
                            <Plus className="h-3 w-3 stroke-2" /> Add milestone
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Objective */}
            {addingObj ? (
              <div className="border border-border/20 bg-background rounded-xl p-4 shrink-0 shadow-sm mt-1">
                <div className="flex items-center gap-2 mb-3">
                  {tierList.map(t => (
                    <button key={t} onClick={() => setAddObjTier(t)} className={cn(
                      "px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest rounded-md border transition-all",
                      addObjTier === t ? "bg-foreground text-background border-foreground shadow-sm" : "border-border/25 text-muted-foreground hover:text-foreground"
                    )}>{t}</button>
                  ))}
                  <div className="ml-auto flex items-center gap-3">
                    <ColorPicker value={addObjColor} onChange={setAddObjColor} label="Color" />
                    <DatePicker value={addObjDueDate} onChange={setAddObjDueDate} placeholder="Due date" />
                  </div>
                </div>
                {northStarKRs.length > 0 && (
                  <select
                    value={addObjLinkId ?? ""}
                    onChange={(e) => setAddObjLinkId(e.target.value || null)}
                    className="w-full text-[10px] font-mono bg-muted/10 border border-border/25 rounded-md px-2.5 py-1.5 text-foreground outline-none mb-3"
                  >
                    <option value="">No linked KR</option>
                    {northStarKRs.map((kr) => (<option key={kr.id} value={kr.id}>{kr.title}</option>))}
                  </select>
                )}
                <InlineInput placeholder="Objective title..." onSubmit={addObj} onCancel={() => setAddingObj(false)} />
              </div>
            ) : (
              <button
                onClick={() => setAddingObj(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-1 border border-dashed border-border/30 rounded-xl text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 hover:border-border/50 transition-all shrink-0"
              >
                <Plus className="h-3.5 w-3.5 stroke-2" /> New Objective
              </button>
            )}
          </div>
        </div>

        {/* ─── COL 3: BURNDOWN + STATUS ─── */}
        <div className="flex flex-col gap-6 xl:gap-8 min-h-0 overflow-hidden">

          {/* Burndown */}
          <div className="flex flex-col border border-border/20 bg-background/60 backdrop-blur-xl flex-1 min-h-0 rounded-2xl shadow-sm overflow-hidden">
            <SectionHead
              title="Burndown"
              icon={TrendingUp}
              badge={
                <span className="text-[9px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded tabular-nums">
                  {objs.flatMap(o => o.keyResults).filter(k => k.progress >= 100).length}
                  /{objs.flatMap(o => o.keyResults).length} done
                </span>
              }
            />
            {/* Sprint date range pickers */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border/10 bg-muted/5">
              <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">From</span>
              <DatePicker value={sprintStart} onChange={setSprintStart} placeholder="Start date" />
              <span className="text-[8px] font-mono text-muted-foreground/40">/</span>
              <DatePicker value={sprintEnd} onChange={setSprintEnd} placeholder="End date" />
            </div>
            <div className="flex-1 min-h-0 p-3 pb-0">
              {burndownData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={burndownData} margin={{ top: 10, right: 12, left: -14, bottom: 4 }}>
                    <defs>
                      <linearGradient id="burnPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="var(--color-muted-foreground)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="burnActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "var(--color-muted-foreground)", fontWeight: 500 }} dy={5} interval="preserveStartEnd" />
                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 2" opacity={0.15} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-background)", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", fontSize: "10px", fontFamily: "monospace", padding: "8px 12px" }}
                      formatter={((value: any, name: any) => [value === null ? "—" : `${value} remaining`, name === "planned" ? "Ideal" : "Actual"]) as any}
                      labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    />
                    <Area type="monotone" dataKey="planned" stroke="var(--color-muted-foreground)" strokeWidth={1.5} strokeDasharray="4 3" fillOpacity={1} fill="url(#burnPlanned)" dot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#burnActual)" dot={{ r: 2.5, fill: "#6366f1", stroke: "var(--color-background)", strokeWidth: 2 }} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <TrendingUp className="h-6 w-6 stroke-[1.5] text-muted-foreground/20" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">
                    Set a date range to track burndown
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border/20">
              <span className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-muted-foreground"><div className="w-3 h-[2px] border-t border-dashed border-muted-foreground" /> Ideal</span>
              <span className="flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-muted-foreground"><div className="w-3 h-[2px] rounded" style={{ backgroundColor: "#6366f1", opacity: 0.7 }} /> Actual</span>
              <span className="ml-auto text-[8px] font-mono text-muted-foreground/50 tabular-nums">milestones remaining</span>
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
