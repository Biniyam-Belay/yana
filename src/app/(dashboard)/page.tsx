"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Clock, Play, Plus, CheckSquare, Square, History, ArrowUpRight, ArrowDownRight,
  Activity, Zap, Briefcase, Wallet, Target, TrendingUp,
  Flame, GitBranch, CalendarDays, Timer, Layers, FileText, Pause, RotateCcw,
  Cpu, Database, ChevronRight, Bookmark, Expand, X, Eye, EyeOff,
  Flag, Crosshair, CheckCircle2, Circle, AlertTriangle
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import { useAppStore } from "@/store";

// Work hours data keyed by range
const workHoursData: Record<string, { label: string; hours: number }[]> = {
  "5D": [
    { label: "Mon", hours: 8.5 }, { label: "Tue", hours: 7.2 }, { label: "Wed", hours: 9.1 },
    { label: "Thu", hours: 6.8 }, { label: "Fri", hours: 8.0 },
  ],
  "2W": [
    { label: "W1 M", hours: 8.5 }, { label: "W1 T", hours: 7.2 }, { label: "W1 W", hours: 9.1 },
    { label: "W1 Th", hours: 6.8 }, { label: "W1 F", hours: 8.0 },
    { label: "W2 M", hours: 7.5 }, { label: "W2 T", hours: 9.3 }, { label: "W2 W", hours: 8.7 },
    { label: "W2 Th", hours: 7.0 }, { label: "W2 F", hours: 6.5 },
  ],
  "1M": [
    { label: "Oct 1", hours: 7.2 }, { label: "Oct 5", hours: 8.5 }, { label: "Oct 10", hours: 9.3 },
    { label: "Oct 15", hours: 6.1 }, { label: "Oct 20", hours: 8.8 }, { label: "Oct 25", hours: 7.9 }, { label: "Oct 31", hours: 9.1 },
  ],
  "6M": [
    { label: "May", hours: 162 }, { label: "Jun", hours: 148 }, { label: "Jul", hours: 178 },
    { label: "Aug", hours: 183 }, { label: "Sep", hours: 165 }, { label: "Oct", hours: 191 },
  ],
  "1Y": [
    { label: "Nov", hours: 154 }, { label: "Dec", hours: 138 }, { label: "Jan", hours: 162 },
    { label: "Feb", hours: 148 }, { label: "Mar", hours: 171 }, { label: "Apr", hours: 159 },
    { label: "May", hours: 162 }, { label: "Jun", hours: 148 }, { label: "Jul", hours: 178 },
    { label: "Aug", hours: 183 }, { label: "Sep", hours: 165 }, { label: "Oct", hours: 191 },
  ],
};
const workRanges = ["5D", "2W", "1M", "6M", "1Y"] as const;
type WorkRange = typeof workRanges[number];

type TimerMode = "stopwatch" | "countdown";

type TimerSessionRecord = {
  id: string;
  target: string;
  seconds: number;
  mode: TimerMode;
  plannedSeconds: number | null;
  completed: boolean;
  startedAt: string;
  endedAt: string;
};

const miniSparkData = [
  { v: 20 }, { v: 35 }, { v: 28 }, { v: 45 }, { v: 38 }, { v: 60 }, { v: 52 }, { v: 70 },
];

// Full heatmap data: 7 rows (days) x 24 cols (approx 6 months)
const heatmapData = [
  [0, 1, 2, 0, 3, 1, 0, 2, 4, 0, 1, 2, 3, 0, 1, 2, 0, 4, 1, 0, 2, 3, 0, 1],
  [1, 3, 0, 4, 1, 2, 3, 0, 1, 2, 4, 0, 1, 2, 0, 3, 1, 0, 2, 4, 0, 1, 2, 3],
  [2, 0, 1, 2, 4, 0, 1, 2, 3, 0, 1, 2, 0, 4, 1, 0, 2, 3, 0, 1, 2, 0, 3, 1],
  [0, 2, 4, 1, 3, 0, 1, 2, 0, 4, 1, 0, 2, 3, 0, 1, 2, 0, 3, 1, 0, 2, 4, 0],
  [3, 4, 1, 0, 2, 3, 0, 1, 2, 0, 4, 1, 0, 2, 3, 0, 1, 2, 0, 3, 1, 0, 2, 4],
  [1, 2, 3, 4, 0, 1, 2, 0, 3, 1, 0, 2, 4, 0, 1, 2, 3, 0, 1, 2, 0, 4, 1, 0],
  [0, 1, 2, 3, 1, 0, 2, 4, 0, 1, 2, 3, 0, 1, 2, 0, 4, 1, 0, 2, 3, 0, 1, 2],
];
const heatColors = [
  "bg-emerald-500/0 border border-border/20",
  "bg-emerald-500/10",
  "bg-emerald-500/20",
  "bg-emerald-500/30",
  "bg-emerald-500/40",
];

const schedule = [
  { time: "09:00", title: "Daily Standup", dur: "15m", color: "bg-indigo-500", active: false },
  { time: "10:30", title: "Deep Work Block", dur: "2h", color: "bg-foreground", active: true },
  { time: "13:00", title: "Client Review Call", dur: "45m", color: "bg-amber-500", active: false },
  { time: "15:00", title: "Code Review Session", dur: "1h", color: "bg-emerald-500", active: false },
  { time: "17:00", title: "Sprint Planning", dur: "30m", color: "bg-rose-500", active: false },
];
const tasks = [
  { title: "Deploy auth microservice", priority: "critical", done: false },
  { title: "Review PR #412 — Auth tokens", priority: "high", done: false },
  { title: "Update API documentation", priority: "medium", done: false },
  { title: "Fix mobile responsive layout", priority: "high", done: true },
  { title: "Migrate user table schema", priority: "critical", done: true },
  { title: "Write integration test suite", priority: "medium", done: false },
  { title: "Optimize image pipeline", priority: "low", done: false },
];
const projects = [
  { name: "YANA Platform", progress: 72, tasks: 24, completed: 17, color: "bg-indigo-500" },
  { name: "E-Commerce Rebuild", progress: 45, tasks: 18, completed: 8, color: "bg-amber-500" },
  { name: "Client Portal v2", progress: 91, tasks: 12, completed: 11, color: "bg-emerald-500" },
  { name: "Mobile App MVP", progress: 15, tasks: 30, completed: 4, color: "bg-rose-500" },
];
const activityFeed = [
  { action: "Pushed 3 commits to", target: "yana/main", time: "2m", icon: GitBranch, color: "text-indigo-500" },
  { action: "Closed issue #89 on", target: "auth-service", time: "14m", icon: CheckSquare, color: "text-emerald-500" },
  { action: "Deployed to staging —", target: "e-commerce", time: "1h", icon: Layers, color: "text-amber-500" },
  { action: "Created document", target: "Q4 Roadmap", time: "2h", icon: FileText, color: "text-muted-foreground" },
  { action: "Tagged release", target: "v2.4.1", time: "3h", icon: Bookmark, color: "text-rose-500" },
];
const statusColor: Record<string, string> = { "on-track": "bg-emerald-500", "at-risk": "bg-amber-500", "behind": "bg-rose-500" };
const statusText: Record<string, string> = { "on-track": "text-emerald-500", "at-risk": "text-amber-500", "behind": "text-rose-500" };

function MiniSpark({ data, color, id }: { data: { v: number }[], color: string, id: string }) {
  return (
    <div className="h-7 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="linear" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp-${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionHead({ title, icon: Icon, iconColor, badge, onExpand }: { title: string, icon: any, iconColor?: string, badge?: React.ReactNode, onExpand?: () => void }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
      <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
        <Icon className={cn("h-3 w-3 stroke-[1.5]", iconColor || "text-muted-foreground")} /> {title}
      </span>
      <div className="flex items-center gap-2">
        {badge}
        {onExpand && (
          <button onClick={onExpand} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground" title="Expand">
            <Expand className="h-3 w-3 stroke-[1.5]" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function HUDPage() {
  const { northStar, northStarKRs, objectives, avgProgress, northStarProgress, topObjective } = useNorthStar();
  const { executionRate, focusQuality, systemHealth, stressCoefficient, alignmentScore } = useAppStore();

  // Mission Velocity Algorithm (Vm)
  const Vm = (executionRate * focusQuality) * (systemHealth * stressCoefficient);
  const isDrift = alignmentScore < 0.85 || Vm < 0.75;
  const isCriticalStasis = Vm < 0.40;

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [activeRange, setActiveRange] = useState<WorkRange>("1M");
  const [showBalances, setShowBalances] = useState(true);
  const [expandedObjectiveIds, setExpandedObjectiveIds] = useState<string[]>([]);

  // Focus Timer State
  const [timerMode, setTimerMode] = useState<TimerMode>("countdown");
  const [timerPresetMinutes, setTimerPresetMinutes] = useState(25);
  const [selectedTimerTarget, setSelectedTimerTarget] = useState("");
  const [customTimerTarget, setCustomTimerTarget] = useState("");
  const [timerSessions, setTimerSessions] = useState<TimerSessionRecord[]>([]);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const timerStorageKey = "yana-focus-timer-sessions-v1";
  const timerPresets = [15, 25, 50, 90] as const;

  const timerTargetOptions = useMemo(() => {
    const objectiveTargets = objectives.map((obj) => ({
      id: `objective:${obj.id}`,
      label: `Objective · ${obj.title}`,
    }));

    const krTargets = [...northStarKRs, ...objectives.flatMap((obj) => obj.keyResults)].map((kr) => ({
      id: `kr:${kr.id}`,
      label: `KR · ${kr.title}`,
    }));

    const seenObjectiveIds = new Set<string>();
    const uniqueObjectiveTargets = objectiveTargets.filter((target) => {
      if (seenObjectiveIds.has(target.id)) return false;
      seenObjectiveIds.add(target.id);
      return true;
    });

    const seenKrIds = new Set<string>();
    const uniqueKrTargets = krTargets.filter((target) => {
      if (seenKrIds.has(target.id)) return false;
      seenKrIds.add(target.id);
      return true;
    });

    return [
      { id: "general", label: "General Focus" },
      ...uniqueObjectiveTargets,
      ...uniqueKrTargets,
      { id: "custom", label: "Custom Target" },
    ];
  }, [objectives, northStarKRs]);

  const plannedTimerSeconds = timerMode === "countdown" ? timerPresetMinutes * 60 : null;
  const timerDisplaySeconds = timerMode === "countdown"
    ? Math.max((plannedTimerSeconds ?? 0) - timerSeconds, 0)
    : timerSeconds;

  const activeTimerTargetLabel = useMemo(() => {
    if (selectedTimerTarget === "custom") {
      return customTimerTarget.trim() || "Custom Focus";
    }
    return timerTargetOptions.find((target) => target.id === selectedTimerTarget)?.label
      ?? (topObjective ? `Objective · ${topObjective.title}` : "General Focus");
  }, [selectedTimerTarget, customTimerTarget, timerTargetOptions, topObjective]);

  const totalTrackedSeconds = useMemo(
    () => timerSessions.reduce((acc, session) => acc + session.seconds, 0),
    [timerSessions],
  );

  const formatTimerDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
    return `${s}s`;
  };

  const recordTimerSession = (completed = false, forcedSeconds?: number) => {
    const effectiveSeconds = typeof forcedSeconds === "number"
      ? forcedSeconds
      : (timerMode === "countdown" ? Math.min(timerSeconds, plannedTimerSeconds ?? timerSeconds) : timerSeconds);

    if (effectiveSeconds <= 0) return;

    const now = new Date().toISOString();
    const session: TimerSessionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      target: activeTimerTargetLabel,
      seconds: effectiveSeconds,
      mode: timerMode,
      plannedSeconds: plannedTimerSeconds,
      completed,
      startedAt: timerStartedAt ?? now,
      endedAt: now,
    };

    setTimerSessions((prev) => [session, ...prev].slice(0, 150));
  };

  const startOrPauseTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      return;
    }
    if (timerMode === "countdown" && plannedTimerSeconds && timerSeconds >= plannedTimerSeconds) {
      setTimerSeconds(0);
    }
    if (!timerStartedAt || timerSeconds === 0) {
      setTimerStartedAt(new Date().toISOString());
    }
    setTimerRunning(true);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerStartedAt(null);
  };

  const saveSessionAndReset = () => {
    recordTimerSession(timerMode === "countdown" && (plannedTimerSeconds ? timerSeconds >= plannedTimerSeconds : false));
    resetTimer();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((s) => {
          const next = s + 1;
          if (timerMode === "countdown" && plannedTimerSeconds) {
            return Math.min(next, plannedTimerSeconds);
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerMode, plannedTimerSeconds]);

  useEffect(() => {
    if (timerMode !== "countdown" || !timerRunning || !plannedTimerSeconds) return;
    if (timerSeconds < plannedTimerSeconds) return;

    setTimerRunning(false);
    recordTimerSession(true, plannedTimerSeconds);
    setTimerStartedAt(null);
  }, [timerMode, timerRunning, timerSeconds, plannedTimerSeconds]);

  const timerDisplay = useMemo(() => {
    const h = Math.floor(timerDisplaySeconds / 3600);
    const m = Math.floor((timerDisplaySeconds % 3600) / 60);
    const s = timerDisplaySeconds % 60;
    if (h > 0) return { main: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`, sec: `:${s.toString().padStart(2, '0')}` };
    return { main: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, sec: '' };
  }, [timerDisplaySeconds]);

  const timerCycleProgress = useMemo(() => {
    if (timerMode === "countdown" && plannedTimerSeconds) {
      return Math.min((timerSeconds / plannedTimerSeconds) * 100, 100);
    }
    return ((timerSeconds % 3600) / 3600) * 100;
  }, [timerMode, timerSeconds, plannedTimerSeconds]);

  useEffect(() => {
    if (selectedTimerTarget) return;
    if (topObjective) {
      setSelectedTimerTarget(`objective:${topObjective.id}`);
      return;
    }
    setSelectedTimerTarget("general");
  }, [selectedTimerTarget, topObjective]);

  useEffect(() => {
    const raw = localStorage.getItem(timerStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as TimerSessionRecord[];
      if (Array.isArray(parsed)) setTimerSessions(parsed);
    } catch {
      // ignore malformed local session cache
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(timerStorageKey, JSON.stringify(timerSessions));
  }, [timerSessions]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
      setDate(now.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpandedSection(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (expandedSection !== "Strategic Targets") return;
    if (objectives.length === 0) {
      setExpandedObjectiveIds([]);
      return;
    }
    setExpandedObjectiveIds((prev) => {
      if (prev.length > 0) return prev;
      return [objectives[0].id];
    });
  }, [expandedSection, objectives]);

  const toggleObjectiveExpanded = (objectiveId: string) => {
    setExpandedObjectiveIds((prev) => (
      prev.includes(objectiveId)
        ? prev.filter((id) => id !== objectiveId)
        : [...prev, objectiveId]
    ));
  };

  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-fab]')) setFabOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [fabOpen]);

  // Derived from North Star
  const onTrackCount = objectives.filter(o => o.status === "on-track").length;
  const atRiskCount = objectives.filter(o => o.status === "at-risk").length;
  const behindCount = objectives.filter(o => o.status === "behind").length;
  const totalKRs = objectives.reduce((acc, o) => acc + o.keyResults.length, 0) + northStarKRs.length;
  const allKRs = [
    ...northStarKRs,
    ...objectives.flatMap(o => o.keyResults),
  ];
  const highRiskKRs = allKRs.filter(kr => kr.status === "behind" || kr.status === "at-risk");
  
  // Derived Context for Modals (Real System Data)
  const activeSectionStats = useMemo(() => {
    if (!expandedSection) return null;
    
    if (expandedSection === "Full Schedule") {
      const activeIdx = schedule.findIndex(s => s.active);
      const nextUp = activeIdx !== -1 && activeIdx < schedule.length - 1 ? schedule[activeIdx + 1].title : "Rest Cycle";
      const completedCount = schedule.filter((s, i) => i < activeIdx || s.active).length;
      return {
        metric: ((completedCount / (schedule.length || 1)) * 100).toFixed(0) + "%",
        label: "Blocks Completed",
        constraint: `Next synchronization: ${nextUp}`,
        designation: "Gearbox Controller"
      };
    }
    
    if (expandedSection === "Work Hours Analysis") {
      const currentData = workHoursData[activeRange] || [];
      const totalHours = currentData.reduce((acc, d) => acc + d.hours, 0);
      const sorted = [...currentData].sort((a, b) => b.hours - a.hours);
      const peakHour = sorted.length > 0 ? sorted[0] : { label: "N/A" };
      return {
        metric: totalHours.toFixed(1) + "h",
        label: `Total ${activeRange} Load`,
        constraint: `Peak performance: ${peakHour.label} session`,
        designation: "Engine Production"
      };
    }
    
    if (expandedSection === "Global Execution Matrix") {
      return {
        metric: (Vm * 100).toFixed(1) + "%",
        label: "Sync Consistency",
        constraint: `Vector Drift Risk: ${(1 - alignmentScore).toFixed(4)}`,
        designation: "Operating Matrix"
      };
    }
    
    if (expandedSection === "Mission KR Registry" || expandedSection === "Strategic Targets") {
      return {
        metric: allKRs.length.toString(),
        label: "Telemetry Tracks",
        constraint: `Active Risk: ${highRiskKRs.length} unstable nodes`,
        designation: "Strategic Battery"
      };
    }
    
    return {
       metric: (alignmentScore * 100).toFixed(1) + "%",
       label: "Global Alignment",
       constraint: "Maintaining mission structural integrity.",
       designation: "Core Intelligence"
    };
  }, [expandedSection, schedule, workHoursData, activeRange, Vm, alignmentScore, allKRs, highRiskKRs]);

  const fabItems = [
    { label: "Engine Task", icon: CheckSquare, color: "bg-indigo-600 text-white shadow-[0_2px_12px_rgba(79,70,229,0.4)]" },
    { label: "Micro Block", icon: Timer, color: "bg-cyan-500 text-white shadow-[0_2px_12px_rgba(6,182,212,0.4)]" },
    { label: "Log Pulse", icon: Activity, color: "bg-violet-500 text-white shadow-[0_2px_12px_rgba(139,92,246,0.4)]" },
    { label: "Fuel Flow", icon: Wallet, color: "bg-emerald-500 text-white shadow-[0_2px_12px_rgba(16,185,129,0.4)]" },
    { label: "Strategy KR", icon: Flag, color: "bg-rose-500 text-white shadow-[0_2px_12px_rgba(244,63,94,0.4)]" },
    { label: "Macro Target", icon: Target, color: "bg-amber-500 text-white shadow-[0_2px_12px_rgba(245,158,11,0.4)]" },
  ];

  return (
    <div className="flex h-full flex-col gap-2.5 min-h-0 antialiased font-sans select-none overflow-hidden text-foreground">
      
      {/* ═══ STATUS BAR / MISSION CONTROL ═══ */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-1.5 relative">
        <div className="flex-1 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground min-w-0">
          
          {/* SYSTEM STATE */}
          <div className="flex items-center gap-4 border-r border-border/20 pr-4 shrink-0">
            <span className="flex items-center gap-2 text-foreground font-semibold">
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full bg-emerald-500 opacity-75" /><span className="relative h-1.5 w-1.5 bg-emerald-500" /></span>
              Online
            </span>
            <span onClick={() => setExpandedSection("Timer Control")} className="flex items-center gap-2 hidden xs:flex cursor-pointer hover:text-foreground transition-colors"><Clock className="h-3 w-3 stroke-[1.5]" /> {time}</span>
          </div>

          {/* ACTIVE MISSION (North Star) */}
          <div className="flex items-center gap-3 shrink-0 bg-foreground/[0.03] px-3 py-1.5 border border-border/10 relative overflow-hidden group">
            {/* Mission-fit background box */}
            <div className="absolute inset-0 bg-foreground/[0.02]" />
            {/* Structural baseline matching box width */}
            <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-foreground/20 transition-all duration-1000" />

            <Target className="h-3.5 w-3.5 text-foreground/70 shrink-0 relative z-10" />
            <div className="flex flex-col min-w-0 relative z-10">
              <span className="text-[7px] font-bold tracking-widest opacity-50 mb-0.5">MISSION · NORTH STAR</span>
              <p className="text-[10px] font-bold text-foreground truncate tracking-tight uppercase leading-none">{northStar}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 relative z-10 border-l border-border/20 pl-3 ml-2">
               <div className="flex flex-col items-end">
                 <span className="text-[7px] opacity-50 leading-none">PROGRESS</span>
                 <span className="text-[11px] font-bold tabular-nums text-foreground">{northStarProgress}%</span>
               </div>
            </div>
          </div>

          {/* PERFORMANCE METRICS & SYSTEM SPACER */}
          <div className="flex-1 flex items-center justify-end gap-4 px-2 min-w-0 shrink-0">
            <div className="h-4 w-px bg-border/20 mx-1 hidden lg:block" />
            
            {isCriticalStasis ? (
              <span className="flex items-center gap-2 hidden lg:flex text-rose-500 font-bold bg-rose-500/10 px-2 py-1 border border-rose-500/30 animate-pulse">
                <AlertTriangle className="h-3 w-3 stroke-[2]" /> CRITICAL — Vm {(Vm * 100).toFixed(0)}%
              </span>
            ) : isDrift ? (
               <span className="flex items-center gap-2 hidden lg:flex text-amber-500 font-bold bg-amber-500/10 px-2 py-1 border border-amber-500/30">
                 <Activity className="h-3 w-3 stroke-[2]" /> DRIFT — Vm {(Vm * 100).toFixed(0)}%
               </span>
            ) : (
              <span className="flex items-center gap-2 hidden lg:flex text-emerald-500/80 font-bold">
                 <Activity className="h-3 w-3 stroke-[1.5]" /> Vm {(Vm * 100).toFixed(0)}%
              </span>
            )}

            <div className="hidden xl:flex items-center gap-4 border-l border-border/20 pl-4">
              <div className="flex flex-col items-center">
                <span className="text-[7px] opacity-50">PRODUCTION</span>
                <span className="text-[11px] font-bold">{avgProgress}%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[7px] text-emerald-500/70">ON TRACK</span>
                <span className="text-[11px] font-bold text-emerald-500">{onTrackCount}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[7px] text-amber-500/70">AT RISK</span>
                <span className="text-[11px] font-bold text-amber-500">{atRiskCount}</span>
              </div>
              {behindCount > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-[7px] text-rose-500/70">BEHIND</span>
                  <span className="text-[11px] font-bold text-rose-500">{behindCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── FAB ─── */}
        <div className="relative ml-4 shrink-0" data-fab>
          <button 
            onClick={(e) => { e.stopPropagation(); setFabOpen(!fabOpen); }} 
            className={cn(
              "flex h-8 w-8 items-center justify-center bg-foreground text-background transition-all duration-500 hover:opacity-90",
              fabOpen && "bg-rose-500 text-white"
            )}
          >
            <Plus className={cn("h-4 w-4 stroke-[2] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]", fabOpen && "rotate-[135deg] scale-110")} />
          </button>
          
          {/* Dropdown items cascade downward */}
          <div className={cn(
            "absolute top-[calc(100%+8px)] right-0 flex flex-col gap-1.5 z-50 transition-all duration-300",
            fabOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            {fabItems.map((item, i) => (
              <button 
                key={i} 
                className={cn(
                  "group flex items-center justify-end gap-2.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  fabOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
                )}
                style={{ transitionDelay: fabOpen ? `${(i + 1) * 60}ms` : '0ms' }}
              >
                <span className={cn(
                  "text-[10px] font-mono uppercase tracking-widest text-muted-foreground group-hover:text-foreground whitespace-nowrap pr-1 transition-all duration-300",
                  fabOpen ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
                )}
                style={{ transitionDelay: fabOpen ? `${(i + 1) * 60 + 80}ms` : '0ms' }}
                >
                  {item.label}
                </span>
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-95", 
                  item.color
                )}>
                  <item.icon className="h-3.5 w-3.5 stroke-[1.5]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>



      {/* ═══ KPI ROW ═══ */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Progress", val: `${northStarProgress}%`, trend: `Mission`, up: true, sparkColor: "var(--color-emerald-500)", id: "rev" },
          { label: "Objectives", val: `${objectives.length}`, trend: `${onTrackCount} On Track`, up: true, sparkColor: "var(--color-indigo-500)", id: "obj" },
          { label: "Key Results", val: `${totalKRs}`, trend: `${highRiskKRs.length} At Risk`, up: highRiskKRs.length === 0, sparkColor: "var(--color-amber-500)", id: "kr" },
          { label: "Focus Hrs", val: "32.5h", trend: "+14%", up: true, sparkColor: "var(--color-amber-500)", id: "focus" },
          { label: "Exec Rate", val: `${avgProgress}%`, trend: "Overall Avg", up: avgProgress >= 50, sparkColor: "var(--color-emerald-500)", id: "streak" },
          { label: "Velocity", val: "84.2", trend: "+12%", up: true, sparkColor: "var(--color-indigo-500)", id: "vel" },
        ].map((kpi, i) => (
          <div key={i} className="group relative flex flex-col border border-border/30 p-3.5 bg-background/60 backdrop-blur-sm hover:border-border/60 hover:bg-muted/10 transition-all cursor-pointer overflow-hidden">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2.5">{kpi.label}</span>
            <div className="flex items-end justify-between gap-2">
              <span className="text-xl font-semibold tracking-tighter text-foreground leading-none tabular-nums">{kpi.val}</span>
              <MiniSpark data={miniSparkData} color={kpi.sparkColor} id={kpi.id} />
            </div>
            <span className={cn("text-[10px] font-semibold mt-2 flex items-center gap-1", kpi.up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {kpi.up ? <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> : <ArrowDownRight className="h-3 w-3 stroke-[2.5]" />}{kpi.trend}
            </span>
            <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-[2px] transition-all duration-300" style={{ backgroundColor: kpi.sparkColor }} />
          </div>
        ))}
      </div>

      {/* ═══ MAIN 4-COL ═══ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        
        {/* COL 1: SCHEDULE + ACTIVITY */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          
          {/* Schedule */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead title="Today" icon={CalendarDays} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-muted-foreground">{schedule.length}</span>} onExpand={() => setExpandedSection("Full Schedule")} />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {schedule.slice(0, 4).map((s, i) => (
                <div key={i} className={cn(
                  "flex items-stretch gap-0 border-b border-border/10 last:border-0 transition-colors cursor-pointer group shrink-0",
                  s.active && "bg-muted/15"
                )}>
                  <div className={cn("w-[3px] shrink-0 self-stretch", s.color)} />
                  <div className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground w-10 shrink-0 tabular-nums">{s.time}</span>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[12px] font-semibold text-foreground truncate leading-tight">{s.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.dur}</span>
                    </div>
                    {s.active && <span className="text-[8px] font-mono uppercase tracking-widest text-indigo-500 font-bold animate-pulse shrink-0">Now</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Activity Feed */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead title="Activity" icon={Zap} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-emerald-500/60">Live</span>} onExpand={() => setExpandedSection("Activity History")} />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {activityFeed.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer shrink-0">
                  <a.icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0 stroke-[1.5] text-muted-foreground")} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-foreground leading-tight truncate">
                      {a.action} <span className="font-semibold">{a.target}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{a.time} ago</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COL 2: VELOCITY + HEATMAP */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          
          {/* Work Hours Analysis Chart */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0">
            <SectionHead
              title="Work Hours"
              icon={TrendingUp}
              iconColor="text-blue-500 dark:text-emerald-500"
              badge={
                <span className="text-[10px] font-mono text-foreground font-bold">
                  {activeRange === "5D" || activeRange === "2W"
                    ? `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(1)}h`
                    : `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(0)}h`
                  }
                </span>
              }
              onExpand={() => setExpandedSection("Work Hours Analysis")}
            />

            {/* Total + Filters */}
            <div className="shrink-0 px-4 py-3 border-b border-border/20 space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Total Logged</span>
                  <span className="text-2xl font-semibold tracking-tighter text-foreground tabular-nums leading-none">
                    {activeRange === "5D" || activeRange === "2W"
                      ? `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(1)}h`
                      : `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(0)}h`
                    }
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Avg / Session</span>
                  <span className="text-[12px] font-mono font-semibold text-foreground tabular-nums">
                    {(workHoursData[activeRange].reduce((s, d) => s + d.hours, 0) / Math.max(workHoursData[activeRange].length, 1)).toFixed(1)}h
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {workRanges.map(r => (
                  <button
                    key={r}
                    onClick={() => setActiveRange(r)}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest border transition-all",
                      activeRange === r
                        ? "bg-foreground text-background border-foreground"
                        : "text-muted-foreground border-border/20 hover:text-foreground hover:border-border/50"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0 p-2 sm:p-3 pb-0">
              <div className="h-full border border-border/15 bg-background/35 px-1.5 py-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={workHoursData[activeRange]} margin={{ top: 10, right: 12, left: 10, bottom: 4 }}>
                  <defs>
                    <linearGradient id="workGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--work-line)" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="var(--work-line)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <style>{`:root { --work-line: #3b82f6; } .dark { --work-line: #10b981; }`}</style>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "var(--color-muted-foreground)", fontWeight: 500 }} dy={5} />
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 2" opacity={0.2} />
                  <RechartsTooltip
                    cursor={{ stroke: 'var(--work-line)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: "0", border: "1px solid var(--color-border)", backgroundColor: "var(--color-background)", boxShadow: "none", fontSize: "11px", fontFamily: "monospace", padding: "6px 10px" }}
                    formatter={(val: any) => [`${val}h`, 'Hours']}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="var(--work-line)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#workGrad)"
                    dot={{ r: 2.5, fill: "var(--work-line)", stroke: "var(--color-background)", strokeWidth: 2 }}
                    activeDot={{ r: 4, fill: "var(--work-line)", stroke: "var(--color-background)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Execution Heatmap — fluid, fills available width */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Execution" icon={Flame} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-muted-foreground">168d</span>} onExpand={() => setExpandedSection("Global Execution Matrix")} />
            <div className="px-4 py-4 flex flex-col gap-3">
              <div className="flex w-full gap-2">
                {/* Y-Axis Day Labels */}
                <div className="flex flex-col justify-between text-[8px] font-mono text-muted-foreground uppercase shrink-0 py-[13px]">
                  <span className="opacity-0">M</span>
                  <span>W</span>
                  <span className="opacity-0">T</span>
                  <span>S</span>
                  <span className="opacity-0">F</span>
                  <span>T</span>
                  <span className="opacity-0">S</span>
                </div>

                {/* Month labels + responsive grid */}
                <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                  {/* Month Labels */}
                  <div className="flex items-center text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
                    {['May','Jun','Jul','Aug','Sep','Oct'].map((m, i, arr) => (
                      <span key={m} style={{ width: `${100 / arr.length}%` }}>{m}</span>
                    ))}
                  </div>

                  {/* Grid — flex-1 columns, aspect-square cells, scales to container */}
                  <div className="flex gap-[2px] w-full">
                    {[...Array(24).keys()].map(colIdx => (
                      <div key={colIdx} className="flex flex-col gap-[2px] flex-1">
                        {heatmapData.map((row, rowIdx) => (
                          <div
                            key={rowIdx}
                            className={cn("w-full aspect-square cursor-pointer transition-colors hover:ring-1 hover:ring-emerald-500/40", heatColors[row[colIdx]])}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end w-full pt-2.5 border-t border-border/20">
                <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground mr-1.5">Less</span>
                <div className="flex items-center gap-1">
                  {heatColors.map((c, i) => (
                    <div key={i} className={cn("h-2 w-2", c)} />
                  ))}
                </div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground ml-1.5">More</span>
              </div>
            </div>
          </div>
        </div>

        {/* COL 3: FOCUS + TASKS */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          
          {/* Focus Timer */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0 overflow-hidden">
            <SectionHead title="Focus" icon={Timer} iconColor="text-muted-foreground" badge={undefined} onExpand={() => setExpandedSection("Timer Control")} />
            <div className="flex flex-col px-4 py-4 gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                <div className={cn("h-1.5 w-1.5", timerRunning ? "bg-emerald-500 animate-pulse" : "bg-indigo-500/50")} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest font-bold truncate">
                  {activeTimerTargetLabel}
                </span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">
                  {timerMode === "countdown" ? `${timerPresetMinutes}m Cycle` : "Stopwatch"}
                </span>
              </div>

              <div className="relative">
                <select
                  value={selectedTimerTarget}
                  onChange={(e) => setSelectedTimerTarget(e.target.value)}
                  className="w-full appearance-none bg-background/45 border border-border/20 px-2.5 py-2 pr-8 text-[10px] font-mono uppercase tracking-widest text-foreground outline-none transition-colors hover:border-border/40 focus:border-foreground/35"
                >
                  {timerTargetOptions.map((target) => (
                    <option key={target.id} value={target.id}>{target.label}</option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-foreground/80" />
              </div>

              <span className="text-4xl sm:text-5xl font-extralight tracking-tighter text-foreground tabular-nums font-mono leading-none">
                {timerDisplay.main}<span className={timerDisplay.sec ? "text-muted-foreground/30" : ""}>{timerDisplay.sec}</span>
              </span>

              <div className="h-1.5 w-full bg-muted/30 overflow-hidden">
                <div className={cn("h-full transition-all duration-500", timerRunning ? "bg-emerald-500/70" : "bg-indigo-500/40")} style={{ width: `${Math.max(timerCycleProgress, 3)}%` }} />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={startOrPauseTimer}
                  className={cn("flex-1 flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors py-2.5", 
                    timerRunning ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:opacity-90"
                  )}>
                  {timerRunning ? <Pause className="h-3 w-3 fill-current" /> : <Timer className="h-3 w-3" />} 
                  {timerRunning ? "Pause" : "Start"}
                </button>
                <button 
                  onClick={saveSessionAndReset}
                  className="flex items-center justify-center h-[34px] w-[34px] border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-all">
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5]" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                <span>Total Logged</span>
                <span className="text-foreground">{formatTimerDuration(totalTrackedSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Task Queue - mapped from North Star KRs */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead 
              title="Key Results" 
              icon={Crosshair}
              badge={
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-amber-500/80 font-bold">{highRiskKRs.length}</span>
                  <span className="text-[9px] font-mono text-muted-foreground/40">·</span>
                  <span className="text-[9px] font-mono text-emerald-500/80 font-bold">{allKRs.filter(k => k.status === "on-track").length}</span>
                </div>
              }
              onExpand={() => setExpandedSection("Mission KR Registry")}
            />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {/* North Star KRs section */}
              {northStarKRs.length > 0 && (
                <div className="px-4 py-1.5 bg-muted/5 border-b border-border/10">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/50">Mission KRs</span>
                </div>
              )}
              {northStarKRs.slice(0, 3).map((kr, i) => (
                <div key={kr.id} className="flex items-center gap-3 px-4 py-2 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer group shrink-0">
                  <div className={cn("h-[5px] w-[5px] shrink-0 rounded-none", statusColor[kr.status])} />
                  <span className={cn("text-[10px] font-medium truncate flex-1", kr.status === "behind" ? "text-rose-400/80" : "text-foreground")}>{kr.title}</span>
                  <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{kr.progress}%</span>
                </div>
              ))}
              {/* All objective KRs */}
              {topObjective && topObjective.keyResults.length > 0 && (
                <div className="px-4 py-1.5 bg-muted/5 border-b border-border/10">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/50 truncate">{topObjective.title}</span>
                </div>
              )}
              {(topObjective?.keyResults ?? []).slice(0, 4).map((kr, i) => (
                <div key={kr.id} className="flex items-center gap-3 px-4 py-2 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer group shrink-0">
                  <div className={cn("h-[5px] w-[5px] shrink-0", statusColor[kr.status])} />
                  <span className="text-[10px] font-medium truncate flex-1 text-foreground">{kr.title}</span>
                  <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{kr.progress}%</span>
                </div>
              ))}
              {allKRs.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-8">
                  <Crosshair className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">No Key Results Yet</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COL 4: PROJECTS + FINANCIALS */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          
          {/* Projects — now mapped from North Star Objectives */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead title="Objectives" icon={Flag} badge={<span className="text-[9px] font-mono text-muted-foreground">{objectives.length}</span>} onExpand={() => setExpandedSection("Strategic Targets")} />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {objectives.slice(0, 5).map((obj, i) => (
                <div key={obj.id} className="group px-4 py-3 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={cn("h-[6px] w-[6px] shrink-0", statusColor[obj.status])} />
                      <span className="text-[11px] font-semibold text-foreground tracking-tight truncate min-w-0">{obj.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-foreground font-bold tabular-nums ml-3 shrink-0">{obj.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-muted/30 mb-2 overflow-hidden">
                    <div className={cn("h-full transition-all duration-500", statusColor[obj.status])} style={{ width: `${obj.progress}%`, opacity: 0.6 }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[8px] font-mono uppercase tracking-widest", statusText[obj.status])}>{obj.status.replace("-", " ")}</span>
                    <span className="text-[8px] font-mono text-muted-foreground">{obj.tier} · {obj.keyResults.length} KRs</span>
                  </div>
                </div>
              ))}
              {objectives.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-8">
                  <Target className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">No Objectives Set</span>
                </div>
              )}
            </div>
          </div>

          {/* Financials */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
                <Wallet className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> Financials
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setExpandedSection("Financial Ledger")}
                  className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground" title="Expand">
                  <Expand className="h-3 w-3 stroke-[1.5]" />
                </button>
                <button
                  onClick={() => setShowBalances(!showBalances)}
                  className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
                  title={showBalances ? 'Hide balances' : 'Show balances'}
                >
                  {showBalances ? <Eye className="h-3 w-3 stroke-[1.5]" /> : <EyeOff className="h-3 w-3 stroke-[1.5]" />}
                </button>
              </div>
            </div>
            {/* Total balance hero */}
            <div className="px-4 pt-3 pb-2 border-b border-border/20">
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Total Balance</span>
              <div className="flex items-end gap-2 mt-0.5">
                <span className="text-2xl font-semibold tracking-tighter text-foreground tabular-nums">{showBalances ? '$62,450' : '••••••'}</span>
                <span className="text-[10px] font-mono text-emerald-500/60 mb-0.5">{showBalances ? '≈ ETB 3.56M' : '••••'}</span>
              </div>
            </div>
            {/* Currency rows */}
            <div className="flex flex-col gap-0">
              {[
                { label: "Monthly Income", val: "+$8,200", color: "text-emerald-500/70" },
                { label: "Monthly Expense", val: "-$3,100", color: "text-rose-500/70" },
                { label: "ETB Account", val: "ETB 1.24M", color: "text-amber-500/70" },
                { label: "EUR Reserve", val: "€18,400", color: "text-indigo-500/70" },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-border/10 last:border-0">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{f.label}</span>
                  <span className={cn("text-[12px] font-mono font-bold tabular-nums", f.color)}>{showBalances ? f.val : '••••'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODAL LAYER ═══ */}
      {expandedSection && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-4 lg:p-10 xl:p-12">
           {/* Backdrop */}
           <div 
             className="absolute inset-0 bg-background/75 backdrop-blur-xl animate-in fade-in duration-300"
             onClick={() => setExpandedSection(null)}
           />
           
           {/* Modal Body */}
           <div className="relative w-full max-w-5xl h-[88vh] max-h-[900px] bg-background/95 border border-border/30 shadow-[0_28px_110px_rgba(0,0,0,0.45)] flex flex-col animate-in zoom-in-95 fade-in duration-300 overflow-hidden text-foreground rounded-2xl">
               <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.07),transparent_35%)]" />
               <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />

               <div className="relative flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/15 bg-muted/10">
                 <div className="flex flex-col gap-1">
                   <h2 className="text-[12px] font-mono uppercase tracking-[0.24em] font-bold">{expandedSection}</h2>
                   <span className="text-[9px] font-mono text-muted-foreground/70 uppercase">Deep System Telemetry / Live Stream</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="hidden sm:inline-flex text-[8px] font-mono uppercase tracking-[0.22em] text-indigo-500 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1">Live Session</span>
                   <button 
                   onClick={() => setExpandedSection(null)}
                   className="h-9 w-9 flex items-center justify-center border border-border/30 text-muted-foreground hover:text-foreground transition-all hover:bg-muted/30 hover:border-foreground/30 active:scale-95"
                   aria-label="Close modal"
                   title="Close"
                   >
                     <X className="h-4 w-4" />
                   </button>
                 </div>
               </div>
               
               <div className="relative flex-1 overflow-hidden p-4 sm:p-6 md:p-8">
                  {/* REAL CONTENT RENDERING */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7 h-full overflow-hidden">
                     <div className="lg:col-span-2 flex flex-col gap-5 overflow-hidden">
                        <div className="flex flex-col gap-1 mb-2 shrink-0">
                          <span className="text-[9px] font-mono text-indigo-500 uppercase font-black tracking-widest">Active Data Stream</span>
                          <h3 className="text-xl font-bold tracking-tight text-foreground">{expandedSection}</h3>
                        </div>
                        
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 sm:pr-2 scrollbar-hide">
                          {expandedSection === "Full Schedule" && (
                            <div className="space-y-1.5">
                              {schedule.map((s, i) => (
                                <div key={i} className="flex items-center gap-4 p-3.5 border border-border/15 bg-background/55 group hover:border-foreground/25 hover:bg-muted/20 transition-all shrink-0">
                                  <span className="text-xs font-mono text-muted-foreground w-16 tabular-nums">{s.time}</span>
                                  <div className={cn("w-1 h-10 shrink-0", s.color)} />
                                  <div className="flex flex-col flex-1">
                                    <span className="text-sm font-semibold">{s.title}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-0.5">{s.dur}</span>
                                  </div>
                                  {s.active && <span className="text-[9px] font-mono text-indigo-500 font-bold border border-indigo-500/30 px-2 py-1 animate-pulse">ONGOING</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {expandedSection === "Activity History" && (
                            <div className="space-y-2">
                              {activityFeed.map((a, i) => (
                                <div key={i} className="flex items-start gap-4 p-3.5 border border-border/15 bg-background/55 group hover:border-foreground/25 hover:bg-muted/20 transition-all shrink-0">
                                  <div className="h-9 w-9 flex items-center justify-center bg-muted/10 shrink-0">
                                    <a.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-foreground">{a.action} <span className="font-bold border-b border-border/20">{a.target}</span></span>
                                    <span className="text-[9px] text-muted-foreground font-mono mt-1.5 uppercase tracking-widest">{a.time} ago · VECTOR RECORDED</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {expandedSection === "Work Hours Analysis" && (
                            <div className="h-full w-full border border-border/15 bg-background/55 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden">
                              <div className="grid grid-cols-2 gap-3 shrink-0">
                                <div className="border border-border/15 bg-background/40 p-3">
                                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Session Total</span>
                                  <p className="text-2xl font-light tabular-nums mt-1">
                                    {activeRange === "5D" || activeRange === "2W"
                                      ? `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(1)}h`
                                      : `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(0)}h`
                                    }
                                  </p>
                                </div>
                                <div className="border border-border/15 bg-background/40 p-3">
                                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Peak Slot</span>
                                  <p className="text-sm font-semibold mt-2 truncate">
                                    {[...workHoursData[activeRange]].sort((a, b) => b.hours - a.hours)[0]?.label ?? "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-1 min-h-0 border border-border/10 bg-background/35 p-2 sm:p-3">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={workHoursData[activeRange]} margin={{ top: 10, right: 12, left: 10, bottom: 4 }}>
                                    <defs>
                                      <linearGradient id="workGradModal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--work-line)" stopOpacity={0.3}/>
                                        <stop offset="100%" stopColor="var(--work-line)" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} dy={5} />
                                    <YAxis hide={true} />
                                    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.1} />
                                    <RechartsTooltip contentStyle={{ borderRadius: "0", border: "1px solid var(--color-border)", backgroundColor: "var(--color-background)" }} />
                                    <Area type="monotone" dataKey="hours" stroke="var(--work-line)" strokeWidth={3} fillOpacity={1} fill="url(#workGradModal)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="shrink-0 flex flex-wrap gap-y-2 justify-between items-center p-3 bg-muted/5 border border-border/10 text-[10px] font-mono opacity-70">
                                <span>Engine Load: {(executionRate * 100).toFixed(0)}%</span>
                                <span>Output Efficiency: {(Vm * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}

                          {expandedSection === "Global Execution Matrix" && (
                            <div className="flex flex-col h-full gap-6 p-6 border border-border/15 bg-background/55">
                              <div className="flex gap-[3px] w-full flex-1 min-h-0">
                                {[...Array(32).keys()].map(colIdx => (
                                  <div key={colIdx} className="flex flex-col gap-[3px] flex-1">
                                    {heatmapData.map((row, rowIdx) => (
                                      <div key={rowIdx} className={cn("w-full aspect-square transition-all hover:scale-110", heatColors[Math.floor(Math.random() * 5)])} />
                                    ))}
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 shrink-0">
                                <span>Past 224 Operating Cycles</span>
                                <span>Nominal Stability: {(Vm * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          )}

                          {expandedSection === "Mission KR Registry" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {allKRs.map((kr, i) => (
                                <div key={kr.id} className="p-4 border border-border/15 bg-background/55 flex flex-col gap-4 group hover:border-foreground/25 hover:bg-muted/20 shrink-0">
                                   <div className="flex items-start justify-between">
                                      <div className="flex flex-col gap-1">
                                         <span className={cn("text-[9px] font-mono uppercase tracking-widest", statusText[kr.status])}>{kr.status}</span>
                                         <span className="text-sm font-bold text-foreground leading-tight">{kr.title}</span>
                                      </div>
                                      <span className="text-xl font-light tabular-nums">{kr.progress}%</span>
                                   </div>
                                   <div className="h-1 w-full bg-muted/10 rounded-full overflow-hidden">
                                      <div className={cn("h-full transition-all duration-1000", statusColor[kr.status])} style={{ width: `${kr.progress}%`, opacity: 0.6 }} />
                                   </div>
                                </div>
                              ))}
                            </div>
                          )}

                          
                               {expandedSection === "Timer Control" && (
                            <div className="h-full p-4 sm:p-6 border border-border/15 bg-background/55 overflow-y-auto">
                              <div className="min-h-full flex flex-col justify-center gap-6 sm:gap-8 max-w-3xl mx-auto">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn("h-2.5 w-2.5", timerRunning ? "bg-emerald-500 animate-pulse" : "bg-indigo-500/50")} />
                                    <span className="text-[11px] sm:text-[12px] font-mono text-muted-foreground uppercase tracking-[0.2em] font-bold truncate max-w-[36ch]">
                                      {activeTimerTargetLabel}
                                    </span>
                                  </div>
                                  <span className={cn("text-[10px] font-mono uppercase tracking-widest border px-2.5 py-1", timerRunning ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-indigo-500 border-indigo-500/30 bg-indigo-500/10")}>
                                    {timerRunning ? "Session Active" : "Standby"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="border border-border/15 bg-background/40 p-3">
                                    <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Track Target</span>
                                    <div className="relative mt-2">
                                      <select
                                        value={selectedTimerTarget}
                                        onChange={(e) => setSelectedTimerTarget(e.target.value)}
                                        className="w-full appearance-none bg-background/55 border border-border/20 px-2.5 py-2 pr-8 text-[10px] font-mono uppercase tracking-widest text-foreground outline-none transition-colors hover:border-border/40 focus:border-foreground/35"
                                      >
                                        {timerTargetOptions.map((target) => (
                                          <option key={target.id} value={target.id}>{target.label}</option>
                                        ))}
                                      </select>
                                      <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-foreground/80" />
                                    </div>
                                    {selectedTimerTarget === "custom" && (
                                      <input
                                        value={customTimerTarget}
                                        onChange={(e) => setCustomTimerTarget(e.target.value)}
                                        placeholder="Type custom target"
                                        className="mt-2 w-full bg-background/60 border border-border/20 px-2.5 py-2 text-[11px] outline-none focus:border-foreground/35"
                                      />
                                    )}
                                  </div>

                                  <div className="border border-border/15 bg-background/40 p-3">
                                    <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Timer Mode</span>
                                    <div className="mt-2 flex items-center gap-2">
                                      <button
                                        onClick={() => { setTimerMode("countdown"); resetTimer(); }}
                                        className={cn("px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border", timerMode === "countdown" ? "bg-foreground text-background border-foreground" : "border-border/25 text-muted-foreground hover:text-foreground")}
                                      >
                                        Countdown
                                      </button>
                                      <button
                                        onClick={() => { setTimerMode("stopwatch"); resetTimer(); }}
                                        className={cn("px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest border", timerMode === "stopwatch" ? "bg-foreground text-background border-foreground" : "border-border/25 text-muted-foreground hover:text-foreground")}
                                      >
                                        Stopwatch
                                      </button>
                                    </div>
                                    {timerMode === "countdown" && (
                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {timerPresets.map((preset) => (
                                          <button
                                            key={preset}
                                            onClick={() => { setTimerPresetMinutes(preset); resetTimer(); }}
                                            className={cn("px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest border", timerPresetMinutes === preset ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-500" : "border-border/20 text-muted-foreground hover:text-foreground")}
                                          >
                                            {preset}m
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="border border-border/15 bg-background/40 px-4 py-6 sm:px-8 sm:py-8">
                                  <div className="flex items-end justify-center text-center leading-none">
                                    <span className="text-[clamp(2.8rem,12vw,6.5rem)] font-extralight tracking-tighter text-foreground tabular-nums font-mono">
                                      {timerDisplay.main}
                                    </span>
                                    {timerDisplay.sec && <span className="text-[clamp(1.2rem,5vw,2.5rem)] opacity-25 mb-2 font-mono">{timerDisplay.sec}</span>}
                                  </div>
                                  <div className="mt-6 h-2 w-full bg-muted/30 overflow-hidden">
                                    <div className={cn("h-full transition-all duration-500", timerRunning ? "bg-emerald-500/70" : "bg-indigo-500/40")} style={{ width: `${Math.max(timerCycleProgress, 2)}%` }} />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                                    <span>{timerMode === "countdown" ? "Cycle Progress" : "Hour Ring"}</span>
                                    <span>{timerCycleProgress.toFixed(0)}%</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 w-full">
                                  <button 
                                    onClick={startOrPauseTimer}
                                    className={cn("h-14 flex items-center justify-center gap-3 text-sm font-mono font-bold uppercase tracking-[0.2em] transition-all", 
                                      timerRunning ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:opacity-90"
                                    )}>
                                    {timerRunning ? <Pause className="h-5 w-5 fill-current" /> : <Timer className="h-5 w-5" />} 
                                    {timerRunning ? "Pause Cycle" : "Ignite Engine"}
                                  </button>
                                  <button
                                    onClick={resetTimer}
                                    className="h-14 sm:w-14 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-all flex items-center justify-center gap-2 px-4 sm:px-0"
                                  >
                                    <RotateCcw className="h-5 w-5 stroke-[1.5]" />
                                    <span className="text-[10px] font-mono uppercase tracking-wider sm:hidden">Reset</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                                  <button
                                    onClick={saveSessionAndReset}
                                    className="h-11 border border-emerald-500/35 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono uppercase tracking-[0.2em] font-bold hover:bg-emerald-500/15 transition-colors"
                                  >
                                    Log Session
                                  </button>
                                  <button
                                    onClick={() => setTimerSessions([])}
                                    className="h-11 px-4 border border-border/35 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors"
                                  >
                                    Clear Log
                                  </button>
                                </div>

                                <div className="border border-border/15 bg-background/35 p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Recent Sessions</span>
                                    <span className="text-[10px] font-mono text-foreground">{formatTimerDuration(totalTrackedSeconds)}</span>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto scrollbar-hide space-y-2 pr-1">
                                    {timerSessions.length === 0 && (
                                      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">No sessions logged yet</p>
                                    )}
                                    {timerSessions.slice(0, 12).map((session) => (
                                      <div key={session.id} className="border border-border/12 bg-background/45 px-3 py-2.5 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-semibold truncate">{session.target}</p>
                                          <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                                            {new Date(session.endedAt).toLocaleDateString()} · {session.mode}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-[10px] font-mono tabular-nums">{formatTimerDuration(session.seconds)}</p>
                                          <p className={cn("text-[8px] font-mono uppercase tracking-widest", session.completed ? "text-emerald-500" : "text-amber-500")}>
                                            {session.completed ? "completed" : "partial"}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                  {expandedSection === "Strategic Targets" && (
                    <div className="grid grid-cols-1 gap-4 sm:gap-5 pr-1.5 sm:pr-2 pb-4">
                               {(objectives || []).map((obj) => (
                      <div key={obj.id} className="p-4 sm:p-5 border border-border/15 bg-background/55 flex flex-col gap-4 group hover:border-foreground/25 hover:bg-muted/20 shrink-0">
                        <button
                          onClick={() => toggleObjectiveExpanded(obj.id)}
                          className="w-full flex items-start justify-between text-left cursor-pointer"
                          aria-expanded={expandedObjectiveIds.includes(obj.id)}
                        >
                          <div className="flex flex-col gap-2 min-w-0 pr-4">
                                          <div className="flex items-center gap-3">
                                            <div className={cn("h-2 w-2", (statusColor as any)[obj.status])} />
                                            <span className={cn("text-[10px] font-mono uppercase tracking-widest", (statusText as any)[obj.status])}>{obj.status}</span>
                                          </div>
                            <span className="text-lg sm:text-xl font-bold text-foreground tracking-tight break-words">{obj.title}</span>
                                       </div>
                          <div className="flex flex-col items-end shrink-0">
                                          <ChevronRight className={cn("h-4 w-4 text-muted-foreground mb-1 transition-transform", expandedObjectiveIds.includes(obj.id) && "rotate-90")} />
                                          <span className="text-3xl font-light tabular-nums">{obj.progress}%</span>
                                          <span className="text-[9px] font-mono text-muted-foreground uppercase mt-1">{obj.tier} Level</span>
                                       </div>
                        </button>
                        <div className="h-1 w-full bg-muted/20 overflow-hidden -mt-1">
                          <div className={cn("h-full opacity-60", (statusColor as any)[obj.status])} style={{ width: `${obj.progress}%` }} />
                        </div>
                        {expandedObjectiveIds.includes(obj.id) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 animate-in fade-in duration-200">
                                       {(obj.keyResults || []).map(kr => (
                            <div key={kr.id} className="p-3 bg-background/40 border border-border/10 flex flex-col gap-2 shrink-0">
                              <span className="text-[10px] font-bold text-foreground leading-tight line-clamp-2">{kr.title}</span>
                                             <div className="flex justify-between items-center">
                                                <div className="h-0.5 flex-1 bg-muted/10 mr-3">
                                                   <div className={cn("h-full", (statusColor as any)[kr.status])} style={{ width: `${kr.progress}%` }} />
                                                </div>
                                                <span className="text-[9px] font-mono opacity-60">{kr.progress}%</span>
                                             </div>
                              <span className={cn("text-[8px] font-mono uppercase tracking-widest", (statusText as any)[kr.status])}>{kr.status.replace("-", " ")}</span>
                                          </div>
                                       ))}
                                    </div>
                )}
                                 </div>
                               ))}
                             </div>
                          )}

                          {expandedSection === "Financial Ledger" && (
                            <div className="flex flex-col gap-8 h-full overflow-hidden">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                       <div className="p-8 border border-border/15 bg-background/55 flex flex-col shrink-0">
                                     <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">Current Availability</span>
                                     <span className="text-5xl font-extralight tracking-tighter text-foreground leading-none tabular-nums">$62,450.00</span>
                                     <span className="text-[12px] font-mono text-emerald-500 mt-4 uppercase tracking-[0.2em]">ETB Equivalent: 3.56M</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 shrink-0">
                                     {[
                                        { l: "Monthly Net Yield", v: "+$8,200", c: "text-emerald-500" },
                                        { l: "Operating Expense", v: "-$3,100", c: "text-rose-500" },
                                        { l: "Tax Reserve", v: "-$1,240", c: "text-amber-500" }
                                     ].map(m => (
                           <div key={m.l} className="flex items-center justify-between p-4 bg-background/55 border border-border/15">
                                           <span className="text-[10px] font-mono text-muted-foreground uppercase">{m.l}</span>
                                           <span className={cn("text-sm font-bold tabular-nums", m.c)}>{m.v}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                     <div className="flex-1 border border-border/15 bg-background/55 p-6 flex items-center justify-center text-muted-foreground/30 font-mono text-[9px] uppercase tracking-[0.4em]">
                                  TRANSACTION LOG HISTORY :: [RESTRICTED ACCESS]
                               </div>
                            </div>
                          )}
                        </div>
                     </div>
                     
                     {/* ═══ CONTEXTUAL SYSTEM INTEGRITY REPORT ═══ */}
         <div className="flex flex-col gap-4 min-h-0 overflow-y-auto scrollbar-hide pr-1">
                <div className="flex flex-col gap-6 border border-border/15 bg-background/55 p-5 sm:p-6 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-5">
                              <Database className="h-24 w-24" />
                           </div>
                           <div className="relative z-10 flex flex-col h-full">
                              <span className="text-[9px] font-mono text-indigo-500 uppercase font-black tracking-[0.2em] mb-4">Integrity Vector</span>
                              
                              <div className="flex-1 flex flex-col gap-8">
                                 {/* Module Designation */}
                                 <div className="flex items-center gap-3">
                                    <div className="h-10 w-1 pt-1 bg-foreground/10 shrink-0" />
                                    <div className="flex flex-col">
                                       <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">DESIGNATION</span>
                                       <span className="text-[14px] font-bold tracking-tight text-foreground uppercase">
                                          {activeSectionStats?.designation || "Core Processor"}
                                       </span>
                                    </div>
                                 </div>

                                 {/* Primary Metric Delta */}
                                 <div className="flex flex-col">
                                    <div className="flex items-baseline gap-2">
                                       <span className="text-3xl font-light tracking-tighter tabular-nums">
                                          {activeSectionStats?.metric}
                                       </span>
                                       <span className={cn("text-[10px] font-mono font-bold", isDrift ? "text-rose-500" : "text-emerald-500")}>
                                          {isDrift ? "ꜜ" : "ꜛ"} {((Vm) * 100).toFixed(0)}%
                                       </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase mt-1">{activeSectionStats?.label}</span>
                                 </div>

                                 {/* Module-Specific Integrity Analysis */}
                                 <div className="space-y-4">
                                    <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-[0.2em] block border-b border-border/10 pb-2">Subsystem Integrity Matrix</span>
                                    <div className="grid grid-cols-2 gap-4">
                                       {(expandedSection === "Full Schedule" ? [
                                          { l: "Efficiency", v: (alignmentScore * 100).toFixed(0), c: "bg-indigo-500" },
                                          { l: "Density", v: (focusQuality * 100).toFixed(0), c: "bg-emerald-500" },
                                          { l: "Switching", v: (stressCoefficient * 100).toFixed(0), c: "bg-amber-500" },
                                          { l: "Hydration", v: "88", c: "bg-cyan-500" }
                                       ] : expandedSection === "Work Hours Analysis" ? [
                                          { l: "Production", v: (Vm * 100).toFixed(0), c: "bg-emerald-500" },
                                          { l: "Burn", v: (stressCoefficient * 100).toFixed(0), c: "bg-rose-500" },
                                          { l: "Capacity", v: (systemHealth * 100).toFixed(0), c: "bg-indigo-500" },
                                          { l: "Recovery", v: "65", c: "bg-cyan-500" }
                                       ] : [
                                          { l: "Mission", v: (alignmentScore * 100).toFixed(0), c: "bg-indigo-500" },
                                          { l: "Capacity", v: (systemHealth * 100).toFixed(0), c: "bg-emerald-500" },
                                          { l: "Effort", v: (executionRate * 100).toFixed(0), c: "bg-amber-500" },
                                          { l: "Sync", v: (Vm * 100).toFixed(0), c: "bg-cyan-500" }
                                       ]).map(m => (
                                          <div key={m.l} className="flex flex-col gap-1.5">
                                             <div className="flex justify-between items-center text-[8px] font-mono uppercase text-muted-foreground">
                                                <span>{m.l}</span>
                                                <span className="font-bold text-foreground">{m.v}%</span>
                                             </div>
                                             <div className="h-0.8 w-full bg-muted/10">
                                                <div className={cn("h-full opacity-60", m.c)} style={{ width: `${m.v}%` }} />
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>

                    <button onClick={() => setExpandedSection(null)} className="mt-10 px-6 py-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-[0.3em] font-black hover:opacity-90 transition-all shadow-[0_12px_38px_rgba(0,0,0,0.35)] active:scale-95">
                                 Terminate Review
                              </button>
                           </div>
                        </div>

                <div className="flex flex-col gap-3 p-5 bg-background/55 border border-border/15">
                           <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Active Operating Logic</span>
                           <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                              {activeSectionStats?.constraint}
                           </p>
                           <div className="grid grid-cols-2 gap-3 mt-2">
                              <div className="flex flex-col p-3 border border-border/10 bg-background/40">
                                 <span className="text-[7px] text-muted-foreground uppercase mb-1">State</span>
                                 <span className={cn("text-[10px] font-bold uppercase", Vm > 0.5 ? "text-emerald-500" : "text-rose-500")}>
                                    {isCriticalStasis ? "STASIS" : isDrift ? "DRIFT" : "NOMINAL"}
                                 </span>
                              </div>
                              <div className="flex flex-col p-3 border border-border/10 bg-background/40">
                                 <span className="text-[7px] text-muted-foreground uppercase mb-1">Drift Risk</span>
                                 <span className="text-[10px] font-bold text-foreground">{(1 - alignmentScore).toFixed(3)} <span className="opacity-30">/ Σ</span></span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}
