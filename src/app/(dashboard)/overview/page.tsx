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
import { useLocalState } from "@/hooks/use-local-state";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { FocusTimerSessionRow } from "@/lib/supabase/types";

const PROF_TASK_KEY = "yana_professional_tasks";

type ProfessionalExecutionTask = {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  objectiveId?: string | null;
  updatedAt?: string | null;
};

// Work hours data keyed by range
const workHoursData: Record<string, { label: string; hours: number }[]> = {};
const workRanges = ["5D", "2W", "1M", "6M", "1Y"] as const;
type WorkRange = typeof workRanges[number];

type TimerMode = "stopwatch" | "countdown";

type TimerSessionRecord = {
  id: string;
  target: string;
  targetKind: "general" | "objective" | "kr" | "custom" | "project" | "task";
  targetId: string | null;
  seconds: number;
  mode: TimerMode;
  plannedSeconds: number | null;
  completed: boolean;
  startedAt: string;
  endedAt: string;
};

const miniSparkData: { v: number }[] = [];

// Full heatmap data: 7 rows (days) x 24 cols (approx 6 months)
const heatmapData: number[][] = [];
const heatColors = [
  "bg-emerald-500/0 border border-border/20",
  "bg-emerald-500/10",
  "bg-emerald-500/20",
  "bg-emerald-500/30",
  "bg-emerald-500/40",
];

const schedule: { time: string; title: string; dur: string; color: string; active: boolean }[] = [];
const activityFeed: { action: string; target: string; time: string; icon: any; color: string }[] = [];
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
  const { northStar, northStarKRs, objectives, avgProgress, northStarProgress, topObjective, isReady: northStarReady } = useNorthStar();
  const { executionRate, focusQuality, systemHealth, stressCoefficient, alignmentScore } = useAppStore();

  // Mission Velocity Algorithm (Vm)
  const Vm = (executionRate * focusQuality) * (systemHealth * stressCoefficient);
  const isDrift = alignmentScore < 0.85 || Vm < 0.75;
  const isCriticalStasis = Vm < 0.40;

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [activeRange, setActiveRange] = useLocalState<WorkRange>("yana_pref_range", "1M");
  const [showBalances, setShowBalances] = useLocalState<boolean>("yana_pref_balances", true);
  const [expandedObjectiveIds, setExpandedObjectiveIds] = useState<string[]>([]);
  const [timerReady, setTimerReady] = useState(false);
  const [introAnimations, setIntroAnimations] = useState(false);

  // Focus Timer State
  const [timerMode, setTimerMode] = useState<TimerMode>("countdown");
  const [timerPresetMinutes, setTimerPresetMinutes] = useState(25);
  const [selectedTimerTarget, setSelectedTimerTarget] = useState("");
  const [customTimerTarget, setCustomTimerTarget] = useState("");
  const [timerTargetError, setTimerTargetError] = useState<string | null>(null);
  const [timerSessions, setTimerSessions] = useState<TimerSessionRecord[]>([]);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [executionTasks, setExecutionTasks] = useState<ProfessionalExecutionTask[]>([]);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);

  const timerStorageKey = "yana-focus-timer-sessions-v1";
  const timerPresets = [15, 25, 50, 90] as const;

  const timerTargetOptions = useMemo(() => {
    const projectTargets = objectives.map((obj) => ({
      id: `project:${obj.id}`,
      label: `Project · ${obj.title}`,
    }));

    const taskTargets = [
      ...executionTasks
        .filter((task) => task.status !== "done")
        .map((task) => ({
          id: `task:${task.id}`,
          label: `Task · ${task.title}`,
        })),
      ...objectives.flatMap((objective) =>
        objective.keyResults
          .filter((keyResult) => keyResult.progress < 100)
          .map((keyResult) => ({
            id: `task:${keyResult.id}`,
            label: `Task · ${keyResult.title}`,
          })),
      ),
    ];

    const objectiveTargets = objectives.map((obj) => ({
      id: `objective:${obj.id}`,
      label: `Objective · ${obj.title}`,
    }));

    const krTargets = [...northStarKRs, ...objectives.flatMap((obj) => obj.keyResults)].map((kr) => ({
      id: `kr:${kr.id}`,
      label: `KR · ${kr.title}`,
    }));

    const uniqueById = <T extends { id: string }>(items: T[]) => {
      const seen = new Set<string>();
      return items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };

    return [
      ...uniqueById(projectTargets),
      ...uniqueById(taskTargets),
      ...uniqueById(objectiveTargets),
      ...uniqueById(krTargets),
      { id: "custom", label: "Custom Target" },
    ];
  }, [objectives, northStarKRs, executionTasks]);

  const activeWorkHours = useMemo(() => workHoursData[activeRange] ?? [], [activeRange]);
  const totalTrackedSeconds = useMemo(
    () => timerSessions.reduce((acc, session) => acc + session.seconds, 0),
    [timerSessions],
  );
  const onTrackCount = objectives.filter((o) => o.status === "on-track").length;
  const atRiskCount = objectives.filter((o) => o.status === "at-risk").length;
  const behindCount = objectives.filter((o) => o.status === "behind").length;
  const totalKRs = objectives.reduce((acc, o) => acc + o.keyResults.length, 0) + northStarKRs.length;
  const allKRs = [
    ...northStarKRs,
    ...objectives.flatMap((o) => o.keyResults),
  ];
  const objectiveTasks = useMemo(
    () => objectives.flatMap((objective) => objective.keyResults.map((milestone) => ({ ...milestone, objectiveTitle: objective.title }))),
    [objectives],
  );
  const objectiveNameById = useMemo(
    () => Object.fromEntries(objectives.map((objective) => [objective.id, objective.title])),
    [objectives],
  );
  const professionalTasks = useMemo(() => {
    const merged = new Map<string, {
      id: string;
      title: string;
      progress: number;
      status: string;
      dueDate?: string | null;
      objectiveTitle: string;
      objectiveId?: string | null;
      updatedAt?: string | null;
    }>();

    objectiveTasks.forEach((task) => {
      merged.set(task.id, {
        id: task.id,
        title: task.title,
        progress: task.progress,
        status: task.status,
        dueDate: task.dueDate,
        objectiveTitle: task.objectiveTitle,
        objectiveId: null,
        updatedAt: null,
      });
    });

    executionTasks.forEach((task) => {
      const existing = merged.get(task.id);
      const objectiveTitle = task.objectiveId ? objectiveNameById[task.objectiveId] ?? "Unlinked" : "Unlinked";
      merged.set(task.id, {
        id: task.id,
        title: task.title,
        progress: task.status === "done" ? 100 : existing?.progress ?? 0,
        status: task.status,
        dueDate: task.dueDate ?? existing?.dueDate ?? null,
        objectiveTitle,
        objectiveId: task.objectiveId ?? null,
        updatedAt: task.updatedAt ?? null,
      });
    });

    return Array.from(merged.values());
  }, [objectiveTasks, executionTasks, objectiveNameById]);
  const professionalDoneCount = professionalTasks.filter((task) => task.progress >= 100).length;
  const professionalOpenCount = professionalTasks.length - professionalDoneCount;
  const professionalOverdueCount = professionalTasks.filter((task) => {
    if (!task.dueDate || task.progress >= 100) return false;
    return new Date(`${task.dueDate}T23:59:59`).getTime() < Date.now();
  }).length;
  const professionalDueSoonCount = professionalTasks.filter((task) => {
    if (!task.dueDate || task.progress >= 100) return false;
    const dueAt = new Date(`${task.dueDate}T23:59:59`).getTime();
    const days = (dueAt - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  }).length;
  const professionalCompletionRate = professionalTasks.length > 0
    ? Math.round((professionalDoneCount / professionalTasks.length) * 100)
    : 0;
  const todayProfessionalTasks = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return professionalTasks
      .filter((task) => !!task.dueDate)
      .map((task) => ({
        ...task,
        dueAt: new Date(`${task.dueDate}T12:00:00`),
      }))
      .filter((task) => !Number.isNaN(task.dueAt.getTime()))
      .filter((task) => task.dueAt >= startToday && task.dueAt <= endToday)
      .sort((a, b) => {
        if (a.progress >= 100 && b.progress < 100) return 1;
        if (a.progress < 100 && b.progress >= 100) return -1;
        const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bUpdated - aUpdated;
      });
  }, [professionalTasks]);
  const taskQueueItems = useMemo(() => {
    return [...professionalTasks]
      .filter((task) => task.progress < 100)
      .sort((a, b) => {
        const aDue = a.dueDate ? new Date(`${a.dueDate}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.dueDate ? new Date(`${b.dueDate}T12:00:00`).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue;
      })
      .slice(0, 10);
  }, [professionalTasks]);
  const highRiskKRs = allKRs.filter((kr) => kr.status === "behind" || kr.status === "at-risk");
  const totalWorkHours = activeWorkHours.reduce((s, d) => s + d.hours, 0);
  const avgWorkHours = activeWorkHours.length > 0 ? totalWorkHours / activeWorkHours.length : 0;
  const focusHours = (totalTrackedSeconds / 3600).toFixed(1);
  const velocityScore = objectives.length > 0
    ? Math.round((onTrackCount / Math.max(objectives.length, 1)) * 100)
    : 0;
  const financialRows: { label: string; val: string; color: string }[] = [];
  const totalBalance = null as string | null;
  const totalBalanceNote = null as string | null;
  const heatmapDays = heatmapData.length ? heatmapData.length * 24 : 0;
  const heatmapCycles = heatmapData.length ? heatmapData.length * 32 : 0;
  const overviewReady = northStarReady && timerReady;

  const readExecutionTasksFromLocal = () => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(PROF_TASK_KEY);
    if (!raw) {
      setExecutionTasks([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        title: string;
        status: string;
        dueDate?: string;
        objectiveId?: string | null;
        updatedAt?: string;
      }>;

      setExecutionTasks(
        parsed.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate ?? null,
          objectiveId: task.objectiveId ?? null,
          updatedAt: task.updatedAt ?? null,
        })),
      );
    } catch {
      setExecutionTasks([]);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "yana_overview_intro_seen";
    const seen = sessionStorage.getItem(key);
    if (seen) {
      setIntroAnimations(false);
      return;
    }
    sessionStorage.setItem(key, "1");
    setIntroAnimations(true);
  }, []);

  const plannedTimerSeconds = timerMode === "countdown" ? timerPresetMinutes * 60 : null;
  const timerDisplaySeconds = timerMode === "countdown"
    ? Math.max((plannedTimerSeconds ?? 0) - timerSeconds, 0)
    : timerSeconds;

  const activeTimerTargetLabel = useMemo(() => {
    if (selectedTimerTarget === "custom") {
      return customTimerTarget.trim() || "Custom Focus";
    }
    return timerTargetOptions.find((target) => target.id === selectedTimerTarget)?.label
      ?? "Select project or task";
  }, [selectedTimerTarget, customTimerTarget, timerTargetOptions]);

  const isTimerTargetSelected = useMemo(() => {
    if (!selectedTimerTarget) return false;
    if (selectedTimerTarget === "custom") return customTimerTarget.trim().length > 1;
    return timerTargetOptions.some((target) => target.id === selectedTimerTarget);
  }, [selectedTimerTarget, customTimerTarget, timerTargetOptions]);

  const getTargetKindForSession = () => {
    if (selectedTimerTarget.startsWith("project:")) return "project" as const;
    if (selectedTimerTarget.startsWith("task:")) return "task" as const;
    if (selectedTimerTarget.startsWith("objective:")) return "objective" as const;
    if (selectedTimerTarget.startsWith("kr:")) return "kr" as const;
    if (selectedTimerTarget === "custom") return "custom" as const;
    return "general" as const;
  };

  const timerAllocations = useMemo(() => {
    const totals = new Map<string, { label: string; seconds: number; sessions: number }>();
    timerSessions.forEach((session) => {
      const key = `${session.targetKind}:${session.targetId ?? session.target}`;
      const existing = totals.get(key);
      if (existing) {
        existing.seconds += session.seconds;
        existing.sessions += 1;
        return;
      }
      totals.set(key, { label: session.target, seconds: session.seconds, sessions: 1 });
    });

    return Array.from(totals.values()).sort((a, b) => b.seconds - a.seconds);
  }, [timerSessions]);

  const topTimerAllocations = useMemo(() => timerAllocations.slice(0, 3), [timerAllocations]);

  const inferKindFromLabel = (label: string, fallback: TimerSessionRecord["targetKind"]) => {
    if (label.startsWith("Project ·")) return "project" as const;
    if (label.startsWith("Task ·")) return "task" as const;
    return fallback;
  };

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
    const targetKind = getTargetKindForSession();
    const targetId = selectedTimerTarget.includes(":") ? selectedTimerTarget.split(":")[1] ?? null : null;
    const session: TimerSessionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      target: activeTimerTargetLabel,
      targetKind,
      targetId,
      seconds: effectiveSeconds,
      mode: timerMode,
      plannedSeconds: plannedTimerSeconds,
      completed,
      startedAt: timerStartedAt ?? now,
      endedAt: now,
    };

    setTimerSessions((prev) => [session, ...prev].slice(0, 150));

    if (!supabaseUserId || !supabaseRef.current) return;

    supabaseRef.current
      .from("focus_timer_sessions")
      .insert({
        user_id: supabaseUserId,
        target_kind: selectedTimerTarget.startsWith("project:")
          ? "objective"
          : selectedTimerTarget.startsWith("task:")
            ? "kr"
            : selectedTimerTarget.startsWith("objective:")
          ? "objective"
          : selectedTimerTarget.startsWith("kr:")
            ? "kr"
            : selectedTimerTarget === "custom"
              ? "custom"
              : "general",
        target_id: targetId,
        target_label: activeTimerTargetLabel,
        mode: timerMode,
        planned_seconds: plannedTimerSeconds,
        seconds: effectiveSeconds,
        completed,
        started_at: session.startedAt,
        ended_at: session.endedAt,
      })
      .then(({ error }: { error: any }) => {
        if (error) console.warn("Supabase timer insert failed", error.message);
      });
  };

  const startOrPauseTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
      return;
    }

    if (!isTimerTargetSelected) {
      setTimerTargetError("Select a project/task (or add custom target) before starting.");
      return;
    }

    setTimerTargetError(null);

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
    if (selectedTimerTarget && selectedTimerTarget !== "custom") {
      const exists = timerTargetOptions.some((target) => target.id === selectedTimerTarget);
      if (!exists) setSelectedTimerTarget("");
    }
  }, [selectedTimerTarget, timerTargetOptions]);

  useEffect(() => {
    try {
      supabaseRef.current = createSupabaseBrowserClient();
      setSupabaseAvailable(true);
    } catch {
      setSupabaseAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    readExecutionTasksFromLocal();

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== PROF_TASK_KEY) return;
      readExecutionTasksFromLocal();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        readExecutionTasksFromLocal();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", readExecutionTasksFromLocal);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", readExecutionTasksFromLocal);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
    if (!supabaseUserId || !supabaseRef.current) return;

    supabaseRef.current
      .from("professional_tasks")
      .select("id, title, status, due_date, objective_id, updated_at")
      .eq("user_id", supabaseUserId)
      .then(({ data, error }: { data: any, error: any }) => {
        if (error || !data) return;

        setExecutionTasks(
          data.map((task: any) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.due_date,
            objectiveId: task.objective_id,
            updatedAt: task.updated_at,
          })),
        );
      });

    supabaseRef.current
      .from("focus_timer_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(150)
      .then(({ data, error }: { data: any, error: any }) => {
        if (error) {
          console.warn("Supabase timer fetch failed", error.message);
          setTimerReady(true);
          return;
        }
        const rows = (data ?? []) as FocusTimerSessionRow[];
        const mapped = rows.map((row) => ({
          id: row.id,
          target: row.target_label,
          targetKind: inferKindFromLabel(row.target_label, row.target_kind),
          targetId: row.target_id,
          seconds: row.seconds,
          mode: row.mode,
          plannedSeconds: row.planned_seconds,
          completed: row.completed,
          startedAt: row.started_at,
          endedAt: row.ended_at,
        }));
        setTimerSessions(mapped);
        setTimerReady(true);
      });
  }, [supabaseUserId]);

  useEffect(() => {
    if (supabaseUserId) return;
    const raw = localStorage.getItem(timerStorageKey);
    if (!raw) {
      setTimerReady(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Array<Partial<TimerSessionRecord>>;
      if (Array.isArray(parsed)) {
        setTimerSessions(
          parsed
            .filter((session): session is Partial<TimerSessionRecord> & Pick<TimerSessionRecord, "id" | "target" | "seconds" | "mode" | "completed" | "startedAt" | "endedAt"> =>
              !!session.id &&
              !!session.target &&
              typeof session.seconds === "number" &&
              !!session.mode &&
              typeof session.completed === "boolean" &&
              !!session.startedAt &&
              !!session.endedAt,
            )
            .map((session) => ({
              id: session.id,
              target: session.target,
              targetKind: inferKindFromLabel(session.target, session.targetKind ?? "custom"),
              targetId: session.targetId ?? null,
              seconds: session.seconds,
              mode: session.mode,
              plannedSeconds: session.plannedSeconds ?? null,
              completed: session.completed,
              startedAt: session.startedAt,
              endedAt: session.endedAt,
            })),
        );
      }
    } catch {
      // ignore malformed local session cache
    }
    setTimerReady(true);
  }, [supabaseUserId]);

  useEffect(() => {
    if (supabaseUserId) return;
    localStorage.setItem(timerStorageKey, JSON.stringify(timerSessions));
  }, [timerSessions, supabaseUserId]);

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
      const totalHours = activeWorkHours.reduce((acc, d) => acc + d.hours, 0);
      const sorted = [...activeWorkHours].sort((a, b) => b.hours - a.hours);
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
  }, [expandedSection, schedule, activeWorkHours, activeRange, Vm, alignmentScore, allKRs, highRiskKRs]);

  const timerCompletionRate = useMemo(() => {
    if (timerSessions.length === 0) return 0;
    const completed = timerSessions.filter((session) => session.completed).length;
    return Math.round((completed / timerSessions.length) * 100);
  }, [timerSessions]);

  const latestTimerSession = timerSessions[0] ?? null;

  const modalHubCards = useMemo(() => {
    if (expandedSection === "Timer Control") {
      return [
        {
          label: "Logged Focus",
          value: formatTimerDuration(totalTrackedSeconds),
          tone: "text-indigo-500",
          sub: `${timerSessions.length} sessions`,
        },
        {
          label: "Completion",
          value: `${timerCompletionRate}%`,
          tone: timerCompletionRate >= 65 ? "text-emerald-500" : "text-amber-500",
          sub: "cycle finish rate",
        },
        {
          label: "Active Targets",
          value: `${timerAllocations.length}`,
          tone: "text-cyan-500",
          sub: "tracked entities",
        },
        {
          label: "Today Tasks",
          value: `${todayProfessionalTasks.length}`,
          tone: todayProfessionalTasks.length > 0 ? "text-amber-500" : "text-muted-foreground",
          sub: "due today",
        },
      ];
    }

    return [
      {
        label: "Alignment",
        value: `${Math.round(alignmentScore * 100)}%`,
        tone: alignmentScore >= 0.85 ? "text-emerald-500" : "text-amber-500",
        sub: "mission coherence",
      },
      {
        label: "Velocity",
        value: `${Math.round(Vm * 100)}%`,
        tone: Vm >= 0.75 ? "text-emerald-500" : Vm >= 0.4 ? "text-amber-500" : "text-rose-500",
        sub: "execution momentum",
      },
      {
        label: "At Risk KRs",
        value: `${highRiskKRs.length}`,
        tone: highRiskKRs.length === 0 ? "text-emerald-500" : "text-rose-500",
        sub: "needs attention",
      },
      {
        label: "Open Tasks",
        value: `${taskQueueItems.length}`,
        tone: taskQueueItems.length > 0 ? "text-amber-500" : "text-emerald-500",
        sub: "execution queue",
      },
    ];
  }, [
    expandedSection,
    alignmentScore,
    Vm,
    highRiskKRs.length,
    taskQueueItems.length,
    totalTrackedSeconds,
    timerSessions.length,
    timerCompletionRate,
    timerAllocations.length,
    todayProfessionalTasks.length,
  ]);

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
              <span className="relative flex h-1.5 w-1.5">
                <span className={cn("absolute h-full w-full bg-emerald-500 opacity-75", introAnimations && "animate-ping")} />
                <span className="relative h-1.5 w-1.5 bg-emerald-500" />
              </span>
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
              <span className={cn(
                "flex items-center gap-2 hidden lg:flex text-rose-500 font-bold bg-rose-500/10 px-2 py-1 border border-rose-500/30",
                introAnimations && "animate-pulse"
              )}>
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
                <span className="text-[7px] text-indigo-500/70">PRO TASKS</span>
                <span className="text-[11px] font-bold text-indigo-500">{professionalTasks.length}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[7px] text-emerald-500/70">PRO DONE</span>
                <span className="text-[11px] font-bold text-emerald-500">{professionalDoneCount}</span>
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
          { label: "Key Results", val: `${totalKRs}`, trend: `${highRiskKRs.length} At Risk`, up: highRiskKRs.length === 0, sparkColor: "var(--color-amber-500)", id: "kr" },
          { label: "Focus Hrs", val: `${focusHours}h`, trend: `${timerSessions.length} sessions`, up: totalTrackedSeconds > 0, sparkColor: "var(--color-amber-500)", id: "focus" },
          { label: "Pro Open", val: `${professionalOpenCount}`, trend: `${professionalDueSoonCount} due soon`, up: professionalDueSoonCount === 0, sparkColor: "var(--color-amber-500)", id: "pro-open" },
          { label: "Pro Sync", val: `${professionalCompletionRate}%`, trend: professionalOverdueCount > 0 ? `${professionalOverdueCount} overdue` : "No overdue", up: professionalOverdueCount === 0, sparkColor: "var(--color-emerald-500)", id: "pro-sync" },
        ].map((kpi, i) => (
          <div key={i} className="group relative flex flex-col border border-border/30 p-3.5 bg-background/60 backdrop-blur-sm hover:border-border/60 hover:bg-muted/10 transition-all cursor-pointer overflow-hidden">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2.5">{kpi.label}</span>
            <div className="flex items-end justify-between gap-2">
              <span className="text-xl font-semibold tracking-tighter text-foreground leading-none tabular-nums">{kpi.val}</span>
              {miniSparkData.length > 0 ? (
                <MiniSpark data={miniSparkData} color={kpi.sparkColor} id={kpi.id} />
              ) : (
                <div className="h-7 w-20 border border-border/20 bg-muted/10" />
              )}
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
          
          {/* Today Tasks */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead
              title="Today"
              icon={CalendarDays}
              iconColor="text-muted-foreground"
              badge={<span className="text-[9px] font-mono text-muted-foreground">{todayProfessionalTasks.length}</span>}
              onExpand={() => setExpandedSection("Nearby Task Window")}
            />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {todayProfessionalTasks.slice(0, 10).map((task) => {
                const isDone = task.progress >= 100;

                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-2 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer group shrink-0">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-none",
                        isDone ? "bg-emerald-500/80" : "bg-amber-500/80",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-medium truncate text-foreground">{task.title}</span>
                      <span className="block text-[8px] font-mono uppercase tracking-widest text-muted-foreground/70 truncate">{task.objectiveTitle}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-mono tabular-nums text-muted-foreground">{task.dueAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      <span className={cn("block text-[8px] font-mono uppercase tracking-widest", isDone ? "text-emerald-500/80" : "text-amber-500/80")}>{isDone ? "Done" : "Today"}</span>
                    </div>
                  </div>
                );
              })}

              {todayProfessionalTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-8">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">No tasks due today</span>
                  <span className="mt-1 text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Set a due date to today in Professional to surface tasks here</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Activity Feed */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead title="Activity" icon={Zap} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-emerald-500/60">Live</span>} onExpand={() => setExpandedSection("Activity History")} />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {activityFeed.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-8">
                  <Zap className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">No activity yet</span>
                </div>
              )}
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
                    ? `${totalWorkHours.toFixed(1)}h`
                    : `${totalWorkHours.toFixed(0)}h`
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
                      ? `${totalWorkHours.toFixed(1)}h`
                      : `${totalWorkHours.toFixed(0)}h`
                    }
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Avg / Session</span>
                  <span className="text-[12px] font-mono font-semibold text-foreground tabular-nums">
                    {avgWorkHours.toFixed(1)}h
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
              {activeWorkHours.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeWorkHours} margin={{ top: 10, right: 12, left: 10, bottom: 4 }}>
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
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  No work hours yet
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Execution Heatmap — fluid, fills available width */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Execution" icon={Flame} iconColor="text-muted-foreground" badge={<span className="text-[9px] font-mono text-muted-foreground">{heatmapDays ? `${heatmapDays}d` : "—"}</span>} onExpand={() => setExpandedSection("Global Execution Matrix")} />
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
                  {heatmapData.length > 0 ? (
                    <>
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
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      No execution history yet
                    </div>
                  )}
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
              <div className="relative">
                <select
                  value={selectedTimerTarget}
                  onChange={(e) => {
                    setSelectedTimerTarget(e.target.value);
                    if (timerTargetError) setTimerTargetError(null);
                  }}
                  className="w-full appearance-none bg-background/45 border border-border/20 px-2.5 py-2 pr-8 text-[10px] font-mono uppercase tracking-widest text-foreground outline-none transition-colors hover:border-border/40 focus:border-foreground/35"
                >
                  <option value="">Select Project / Task…</option>
                  {timerTargetOptions.map((target) => (
                    <option key={target.id} value={target.id}>{target.label}</option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-foreground/80" />
              </div>
              {timerTargetError && (
                <span className="text-[9px] font-mono uppercase tracking-widest text-rose-500/80">{timerTargetError}</span>
              )}

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

          {/* Task Queue */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead 
              title="Task Queue" 
              icon={CheckSquare}
              badge={
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-foreground font-bold">{taskQueueItems.length}</span>
                </div>
              }
              onExpand={() => setExpandedSection("Mission KR Registry")}
            />
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {taskQueueItems.map((task) => {
                const hasDueDate = !!task.dueDate;
                const dueAt = hasDueDate ? new Date(`${task.dueDate}T23:59:59`) : null;
                const isOverdue = !!dueAt && dueAt.getTime() < Date.now();

                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-2 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors cursor-pointer group shrink-0">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-none",
                        isOverdue ? "bg-rose-500/80" : "bg-indigo-500/70",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className={cn("block text-[10px] font-medium truncate", isOverdue ? "text-rose-400/80" : "text-foreground")}>{task.title}</span>
                      <span className="block text-[8px] font-mono uppercase tracking-widest text-muted-foreground/70 truncate">{task.objectiveTitle}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn("block text-[9px] font-mono tabular-nums", isOverdue ? "text-rose-500/80" : "text-muted-foreground")}>
                        {hasDueDate ? dueAt?.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due"}
                      </span>
                      <span className={cn("block text-[8px] font-mono uppercase tracking-widest", isOverdue ? "text-rose-500/80" : "text-muted-foreground")}>{isOverdue ? "Overdue" : hasDueDate ? "Planned" : "Unscheduled"}</span>
                    </div>
                  </div>
                );
              })}
              {taskQueueItems.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 py-8">
                  <CheckSquare className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">No open tasks</span>
                  <span className="mt-1 text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Create tasks in Professional to surface them here</span>
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
                <span className="text-2xl font-semibold tracking-tighter text-foreground tabular-nums">
                  {showBalances ? (totalBalance ?? "—") : "••••••"}
                </span>
                <span className="text-[10px] font-mono text-emerald-500/60 mb-0.5">
                  {showBalances ? (totalBalanceNote ?? "—") : "••••"}
                </span>
              </div>
            </div>
            {/* Currency rows */}
            <div className="flex flex-col gap-0">
              {financialRows.length === 0 && (
                <div className="px-4 py-6 text-center text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                  No financial data yet
                </div>
              )}
              {financialRows.map((f, i) => (
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
                              {schedule.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                  No schedule yet
                                </div>
                              )}
                              {schedule.map((s, i) => (
                                <div key={i} className="flex items-center gap-4 p-3.5 border border-border/15 bg-background/55 group hover:border-foreground/25 hover:bg-muted/20 transition-all shrink-0">
                                  <span className="text-xs font-mono text-muted-foreground w-16 tabular-nums">{s.time}</span>
                                  <div className={cn("w-1 h-10 shrink-0", s.color)} />
                                  <div className="flex flex-col flex-1">
                                    <span className="text-sm font-semibold">{s.title}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-0.5">{s.dur}</span>
                                  </div>
                                  {s.active && (
                                    <span className={cn(
                                      "text-[9px] font-mono text-indigo-500 font-bold border border-indigo-500/30 px-2 py-1",
                                      introAnimations && "animate-pulse"
                                    )}>
                                      ONGOING
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {expandedSection === "Activity History" && (
                            <div className="space-y-2">
                              {activityFeed.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                  No activity yet
                                </div>
                              )}
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
                                      ? `${totalWorkHours.toFixed(1)}h`
                                      : `${totalWorkHours.toFixed(0)}h`
                                    }
                                  </p>
                                </div>
                                <div className="border border-border/15 bg-background/40 p-3">
                                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Peak Slot</span>
                                  <p className="text-sm font-semibold mt-2 truncate">
                                    {[...activeWorkHours].sort((a, b) => b.hours - a.hours)[0]?.label ?? "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-1 min-h-0 border border-border/10 bg-background/35 p-2 sm:p-3">
                                {activeWorkHours.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={activeWorkHours} margin={{ top: 10, right: 12, left: 10, bottom: 4 }}>
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
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                    No work hours yet
                                  </div>
                                )}
                              </div>
                              <div className="shrink-0 flex flex-wrap gap-y-2 justify-between items-center p-3 bg-muted/5 border border-border/10 text-[10px] font-mono opacity-70">
                                <span>Engine Load: {(executionRate * 100).toFixed(0)}%</span>
                                <span>Output Efficiency: {(Vm * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}

                          {expandedSection === "Global Execution Matrix" && (
                            <div className="flex flex-col h-full gap-6 p-6 border border-border/15 bg-background/55">
                              {heatmapData.length > 0 ? (
                                <div className="flex gap-[3px] w-full flex-1 min-h-0">
                                  {[...Array(32).keys()].map(colIdx => (
                                    <div key={colIdx} className="flex flex-col gap-[3px] flex-1">
                                      {heatmapData.map((row, rowIdx) => (
                                        <div key={rowIdx} className={cn("w-full aspect-square transition-all hover:scale-110", heatColors[row[colIdx] ?? 0])} />
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-1 items-center justify-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                  No execution history yet
                                </div>
                              )}
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
                                        onChange={(e) => {
                                          setSelectedTimerTarget(e.target.value);
                                          if (timerTargetError) setTimerTargetError(null);
                                        }}
                                        className="w-full appearance-none bg-background/55 border border-border/20 px-2.5 py-2 pr-8 text-[10px] font-mono uppercase tracking-widest text-foreground outline-none transition-colors hover:border-border/40 focus:border-foreground/35"
                                      >
                                        <option value="">Select Project / Task…</option>
                                        {timerTargetOptions.map((target) => (
                                          <option key={target.id} value={target.id}>{target.label}</option>
                                        ))}
                                      </select>
                                      <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-muted-foreground/80" />
                                    </div>
                                    {timerTargetError && (
                                      <p className="mt-2 text-[9px] font-mono uppercase tracking-widest text-rose-500/80">{timerTargetError}</p>
                                    )}
                                    {selectedTimerTarget === "custom" && (
                                      <input
                                        value={customTimerTarget}
                                        onChange={(e) => {
                                          setCustomTimerTarget(e.target.value);
                                          if (timerTargetError) setTimerTargetError(null);
                                        }}
                                        placeholder="Type custom target"
                                        className="mt-2 w-full bg-background/60 border border-border/20 px-2.5 py-2 text-[11px] outline-none focus:border-foreground/35"
                                      />
                                    )}
                                    <div className="mt-3 border-t border-border/15 pt-2.5 space-y-1">
                                      <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
                                        <span>Top Allocation</span>
                                        <span>{timerAllocations.length} Targets</span>
                                      </div>
                                      {topTimerAllocations.length === 0 ? (
                                        <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70">No tracked targets yet</p>
                                      ) : (
                                        topTimerAllocations.map((allocation) => (
                                          <div key={`modal-target-${allocation.label}`} className="flex items-center justify-between text-[9px] font-mono">
                                            <span className="truncate pr-2 text-muted-foreground">{allocation.label}</span>
                                            <span className="tabular-nums text-foreground">{formatTimerDuration(allocation.seconds)}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
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
                                  <div className="mb-3 space-y-1 border-b border-border/15 pb-3">
                                    <span className="block text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Time Allocation</span>
                                    {topTimerAllocations.length === 0 ? (
                                      <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70">No tracked targets yet</p>
                                    ) : (
                                      topTimerAllocations.map((allocation) => (
                                        <div key={allocation.label} className="flex items-center justify-between text-[9px] font-mono">
                                          <span className="truncate pr-2 text-muted-foreground">{allocation.label}</span>
                                          <span className="tabular-nums text-foreground">{formatTimerDuration(allocation.seconds)}</span>
                                        </div>
                                      ))
                                    )}
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
                       <div className="p-8 border border-border/15 bg-background/55 flex flex-col items-center justify-center gap-3 shrink-0">
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Total Balance</span>
                                  <span className="text-5xl font-extralight tracking-tighter text-foreground leading-none tabular-nums">
                                    {showBalances ? (totalBalance ?? '—') : '••••••'}
                                  </span>
                                  <span className="text-[11px] font-mono text-muted-foreground/50 mt-1">
                                    {showBalances ? (totalBalanceNote ?? 'No financial data yet') : '••••'}
                                  </span>
                               </div>
                               <div className="grid grid-cols-1 gap-2 shrink-0">
                                 {financialRows.length === 0 ? (
                                   <div className="flex flex-col items-center justify-center p-8 border border-border/15 bg-background/55 gap-2">
                                     <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">No accounts connected yet</span>
                                     <span className="text-[9px] font-mono text-muted-foreground/50">Add accounts in the Financial page to see data here</span>
                                   </div>
                                 ) : (
                                   financialRows.map(f => (
                                     <div key={f.label} className="flex items-center justify-between p-4 bg-background/55 border border-border/15">
                                       <span className="text-[10px] font-mono text-muted-foreground uppercase">{f.label}</span>
                                       <span className={cn('text-sm font-bold tabular-nums', f.color)}>{showBalances ? f.val : '••••'}</span>
                                     </div>
                                   ))
                                 )}
                               </div>
                               </div>
                     <div className="flex-1 border border-border/15 bg-background/55 p-6 flex items-center justify-center text-muted-foreground/30 font-mono text-[9px] uppercase tracking-[0.4em]">
                                  TRANSACTION LOG HISTORY :: [RESTRICTED ACCESS]
                               </div>
                            </div>
                          )}
                        </div>
                     </div>
                     
              {/* ═══ CONTEXTUAL INTELLIGENCE HUB ═══ */}
              <aside className="flex flex-col gap-4 min-h-0 overflow-y-auto scrollbar-hide pr-1">
                <div className="relative overflow-hidden border border-border/15 bg-background/55 p-5 sm:p-6">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-500/40 to-transparent" />
                  <div className="pointer-events-none absolute -right-10 -top-10 opacity-10">
                    <Database className="h-24 w-24" />
                  </div>

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-mono uppercase tracking-[0.22em] text-indigo-500">Intelligence Hub</span>
                      <span className="text-[13px] font-semibold uppercase tracking-wider">{activeSectionStats?.designation || "Core Processor"}</span>
                    </div>
                    <span className={cn("text-[8px] font-mono uppercase tracking-widest border px-2 py-1", isCriticalStasis ? "border-rose-500/30 text-rose-500" : isDrift ? "border-amber-500/30 text-amber-500" : "border-emerald-500/30 text-emerald-500")}>{isCriticalStasis ? "Stasis" : isDrift ? "Drift" : "Nominal"}</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    {modalHubCards.map((card) => (
                      <div key={`hub-card-${card.label}`} className="border border-border/12 bg-background/40 px-3 py-2.5">
                        <span className="block text-[7px] font-mono uppercase tracking-widest text-muted-foreground">{card.label}</span>
                        <span className={cn("mt-1 block text-[14px] font-semibold tabular-nums", card.tone)}>{card.value}</span>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-muted-foreground/70">{card.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-border/15 bg-background/55 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Target Allocation</span>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/70">Top 4</span>
                  </div>
                  <div className="space-y-2.5">
                    {topTimerAllocations.slice(0, 4).length === 0 ? (
                      <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70">No allocation data yet</p>
                    ) : (
                      topTimerAllocations.slice(0, 4).map((allocation) => {
                        const pct = totalTrackedSeconds > 0 ? Math.round((allocation.seconds / totalTrackedSeconds) * 100) : 0;
                        return (
                          <div key={`hub-allocation-${allocation.label}`} className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] font-mono">
                              <span className="truncate pr-2 text-muted-foreground">{allocation.label}</span>
                              <span className="tabular-nums text-foreground">{formatTimerDuration(allocation.seconds)}</span>
                            </div>
                            <div className="h-1 bg-muted/25">
                              <div className="h-full bg-indigo-500/70" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border border-border/15 bg-background/55 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Execution Pulse</span>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/70">Live</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                      <span className="text-muted-foreground">Primary Metric</span>
                      <span className="text-foreground">{activeSectionStats?.metric}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                      <span className="text-muted-foreground">Drift Risk</span>
                      <span className="text-foreground">{(1 - alignmentScore).toFixed(3)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                      <span className="text-muted-foreground">Last Session</span>
                      <span className="text-foreground truncate max-w-[48%] text-right">{latestTimerSession ? formatTimerDuration(latestTimerSession.seconds) : "—"}</span>
                    </div>
                  </div>
                  <p className="mt-3 border-t border-border/15 pt-3 text-[10px] leading-relaxed text-muted-foreground/85 italic">
                    {activeSectionStats?.constraint}
                  </p>
                </div>

                <button onClick={() => setExpandedSection(null)} className="mt-1 border border-border/30 bg-foreground px-5 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-background transition-all hover:opacity-90 active:scale-[0.99]">
                  Terminate Review
                </button>
              </aside>
                  </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}
