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
  AreaChart, Area, XAxis, ResponsiveContainer, CartesianGrid,
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

  const [fabOpen, setFabOpen] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [activeRange, setActiveRange] = useState<WorkRange>("1M");
  const [showBalances, setShowBalances] = useState(true);

  // Focus Timer State
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const timerDisplay = useMemo(() => {
    const h = Math.floor(timerSeconds / 3600);
    const m = Math.floor((timerSeconds % 3600) / 60);
    const s = timerSeconds % 60;
    if (h > 0) return { main: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`, sec: `:${s.toString().padStart(2, '0')}` };
    return { main: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, sec: '' };
  }, [timerSeconds]);

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

  const fabItems = [
    { label: "Task", icon: CheckSquare, color: "bg-indigo-500 text-white shadow-[0_2px_12px_rgba(99,102,241,0.3)]" },
    { label: "Objective", icon: Target, color: "bg-amber-500 text-white shadow-[0_2px_12px_rgba(245,158,11,0.3)]" },
    { label: "Finance", icon: Wallet, color: "bg-emerald-500 text-white shadow-[0_2px_12px_rgba(16,185,129,0.3)]" },
  ];

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden">
      
      {/* ═══ STATUS BAR ═══ */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full bg-emerald-500 opacity-75" /><span className="relative h-1.5 w-1.5 bg-emerald-500" /></span>
            Online
          </span>
          <span className="flex items-center gap-2"><Clock className="h-3 w-3 stroke-[1.5]" /> {time}</span>
          <span className="flex items-center gap-2 hidden md:flex"><CalendarDays className="h-3 w-3 stroke-[1.5]" /> {date}</span>
          
          <div className="h-4 w-px bg-border/40 mx-2 hidden lg:block" />
          
          {isCriticalStasis ? (
            <span className="flex items-center gap-2 hidden lg:flex text-rose-500 font-bold bg-rose-500/10 px-2.5 py-1 border border-rose-500/30 animate-pulse">
              <AlertTriangle className="h-3 w-3 stroke-[2]" /> CRITICAL STASIS — Vm {(Vm * 100).toFixed(1)}% — RECALIBRATE OUTPUT
            </span>
          ) : isDrift ? (
             <span className="flex items-center gap-2 hidden lg:flex text-amber-500 font-bold bg-amber-500/10 px-2.5 py-1 border border-amber-500/30">
               <Activity className="h-3 w-3 stroke-[2]" /> DRIFT PROTOCOL ACTIVE — Vm {(Vm * 100).toFixed(1)}%
             </span>
          ) : (
            <span className="flex items-center gap-2 hidden lg:flex text-emerald-500/80">
               <Activity className="h-3 w-3 stroke-[1.5]" /> Vm {(Vm * 100).toFixed(1)}% — Nominal
            </span>
          )}
        </div>

        {/* ─── FAB in top-right, opens downward ─── */}
        <div className="relative" data-fab>
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

      {/* ═══ NORTH STAR MISSION BANNER ═══ */}
      <div className="shrink-0 flex items-center gap-4 px-4 py-3 border border-border/20 bg-muted/5 relative overflow-hidden">
        {/* Progress fill background */}
        <div className="absolute inset-y-0 left-0 bg-foreground/3 transition-all duration-1000" style={{ width: `${northStarProgress}%` }} />
        <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0">
          <Target className="h-4 w-4 text-muted-foreground stroke-[1.5] shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">Mission · North Star</span>
            <p className="text-[11px] font-semibold text-foreground truncate mt-0.5 tracking-tight">{northStar}</p>
          </div>
        </div>
        <div className="relative z-10 shrink-0 flex items-center gap-6 border-l border-border/20 pl-6">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Mission</span>
            <span className="text-[18px] font-extralight tabular-nums text-foreground leading-none">{northStarProgress}<span className="text-[9px] text-muted-foreground ml-0.5">%</span></span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Execution</span>
            <span className="text-[18px] font-extralight tabular-nums text-foreground leading-none">{avgProgress}<span className="text-[9px] text-muted-foreground ml-0.5">%</span></span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-500/60">On Track</span>
            <span className="text-[18px] font-extralight tabular-nums text-emerald-500 leading-none">{onTrackCount}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-mono uppercase tracking-widest text-amber-500/60">At Risk</span>
            <span className="text-[18px] font-extralight tabular-nums text-amber-500 leading-none">{atRiskCount}</span>
          </div>
          {behindCount > 0 && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] font-mono uppercase tracking-widest text-rose-500/60">Behind</span>
              <span className="text-[18px] font-extralight tabular-nums text-rose-500 leading-none">{behindCount}</span>
            </div>
          )}
        </div>
      </div>

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
            <SectionHead title="Today" icon={CalendarDays} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-muted-foreground">{schedule.length}</span>} onExpand={() => {}} />
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
            <SectionHead title="Activity" icon={Zap} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-emerald-500/60">Live</span>} onExpand={() => {}} />
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
            />

            {/* Total + Filters */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/20">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold tracking-tighter text-foreground tabular-nums leading-none">
                  {activeRange === "5D" || activeRange === "2W"
                    ? `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(1)}h`
                    : `${workHoursData[activeRange].reduce((s, d) => s + d.hours, 0).toFixed(0)}h`
                  }
                </span>
              </div>
              <div className="flex items-center gap-1">
                {workRanges.map(r => (
                  <button
                    key={r}
                    onClick={() => setActiveRange(r)}
                    className={cn(
                      "px-2 py-1 text-[10px] font-mono uppercase tracking-widest transition-all",
                      activeRange === r
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0 p-2 pb-0">
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

          {/* Execution Heatmap — fluid, fills available width */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Execution" icon={Flame} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-muted-foreground">168d</span>} />
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
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Focus" icon={Timer} iconColor="text-muted-foreground" badge={undefined} onExpand={undefined} />
            <div className="flex flex-col px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("h-1.5 w-1.5", timerRunning ? "bg-emerald-500 animate-pulse" : "bg-indigo-500/50")} />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest font-bold truncate">
                  {topObjective ? topObjective.title : "No Objective"}
                </span>
              </div>
              <span className="text-5xl font-extralight tracking-tighter text-foreground tabular-nums font-mono leading-none">
                {timerDisplay.main}<span className={timerDisplay.sec ? "text-muted-foreground/30" : ""}>{timerDisplay.sec}</span>
              </span>
              <div className="flex items-center gap-2 mt-4">
                <button 
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={cn("flex-1 flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors py-2.5", 
                    timerRunning ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:opacity-90"
                  )}>
                  {timerRunning ? <Pause className="h-3 w-3 fill-current" /> : <Timer className="h-3 w-3" />} 
                  {timerRunning ? "Pause" : "Start"}
                </button>
                <button 
                  onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}
                  className="flex items-center justify-center h-[34px] w-[34px] border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-all">
                  <RotateCcw className="h-3.5 w-3.5 stroke-[1.5]" />
                </button>
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
              onExpand={() => {}}
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
            <SectionHead title="Objectives" icon={Flag} badge={<span className="text-[9px] font-mono text-muted-foreground">{objectives.length}</span>} onExpand={() => {}} />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {objectives.slice(0, 5).map((obj, i) => (
                <div key={obj.id} className="group px-4 py-3 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-[6px] w-[6px] shrink-0", statusColor[obj.status])} />
                      <span className="text-[11px] font-semibold text-foreground tracking-tight truncate max-w-[140px]">{obj.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-foreground font-bold tabular-nums">{obj.progress}%</span>
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
              <button
                onClick={() => setShowBalances(!showBalances)}
                className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
                title={showBalances ? 'Hide balances' : 'Show balances'}
              >
                {showBalances ? <Eye className="h-3 w-3 stroke-[1.5]" /> : <EyeOff className="h-3 w-3 stroke-[1.5]" />}
              </button>
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
    </div>
  );
}
