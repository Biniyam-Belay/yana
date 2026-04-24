"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Layers,
  GitBranch,
  Timer,
  Zap,
  Columns3,
  MoreHorizontal,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfessionalTaskRow, TacticalBlockRow } from "@/lib/supabase/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

type Priority = "critical" | "high" | "medium" | "low";
type TaskStatus = "backlog" | "todo" | "in-progress" | "review" | "done";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  objectiveId?: string | null;
  projectId?: string | null;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  updatedAt?: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  dueDate?: string | null;
  tier?: string;
}

interface ScheduleBlock {
  id: string;
  dayOffset: number;
  startHr: number;
  endHr: number;
  title: string;
  type: "deep-work" | "meeting" | "admin" | "break";
  taskId?: string | null;
  objectiveId?: string | null;
}

interface CalendarRenderBlock extends ScheduleBlock {
  readonlySource?: "task";
}

type CalendarSelection =
  | { kind: "schedule"; id: string }
  | { kind: "task"; taskId: string };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const priorityPill: Record<Priority, string> = {
  critical: "border-rose-500/35 text-rose-500/90 bg-rose-500/10",
  high: "border-amber-500/35 text-amber-500/90 bg-amber-500/10",
  medium: "border-indigo-500/35 text-indigo-500/90 bg-indigo-500/10",
  low: "border-border/40 text-muted-foreground bg-muted/20",
};

const priorityLabel: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorities: Priority[] = ["critical", "high", "medium", "low"];

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "text-muted-foreground" },
  { key: "todo", label: "To Do", color: "text-indigo-500/70" },
  { key: "in-progress", label: "In Progress", color: "text-amber-500/70" },
  { key: "review", label: "Review", color: "text-blue-500/70" },
  { key: "done", label: "Done", color: "text-emerald-500/70" },
];

const projectColors = ["#6366f1", "#f59e0b", "#10b981", "#f43f5e", "#0ea5e9", "#8b5cf6"];

const calendarBlockColors: Record<ScheduleBlock["type"], string> = {
  "deep-work": "bg-indigo-500/20 border-indigo-500/30 text-indigo-500",
  meeting: "bg-amber-500/20 border-amber-500/30 text-amber-500",
  admin: "bg-emerald-500/20 border-emerald-500/30 text-emerald-500",
  break: "bg-muted border-border/40 text-muted-foreground",
};

const formatHourLabel = (hour: number) => {
  const safe = Math.max(0, Math.min(24, Number(hour.toFixed(2))));
  const h = Math.floor(safe);
  const m = Math.round((safe - h) * 60);
  const labelHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${labelHour}:${m.toString().padStart(2, "0")} ${suffix}`;
};

const snapToHalfHour = (hour: number) => Number((Math.round(hour * 2) / 2).toFixed(2));

const isTaskStatus = (value: string | null): value is TaskStatus =>
  value === "backlog" || value === "todo" || value === "in-progress" || value === "review" || value === "done";

function formatDate(date?: string | null) {
  if (!date) return "No due";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No due";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(date?: string | null) {
  if (!date) return false;
  const due = new Date(`${date}T23:59:59`);
  return due.getTime() < Date.now();
}

function SectionHead({
  title,
  icon: Icon,
  badge,
  action,
}: {
  title: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border/20 px-4 py-2.5">
      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-foreground font-mono">
        <Icon className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> {title}
      </span>
      <div className="flex items-center gap-2">{badge}{action}</div>
    </div>
  );
}

function InlineInput({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const submit = () => {
    if (val.trim()) {
      onSubmit(val.trim());
      setVal("");
    }
  };
  return (
    <div className="flex items-center gap-1.5 px-4 py-2">
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[11px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
      />
      <button onClick={submit} className="p-0.5 text-emerald-500/70 transition-colors hover:text-emerald-500">
        <Check className="h-3 w-3 stroke-2" />
      </button>
      <button onClick={onCancel} className="p-0.5 text-muted-foreground transition-colors hover:text-foreground">
        <X className="h-3 w-3 stroke-2" />
      </button>
    </div>
  );
}

export default function ProfessionalPage() {
  return (
    <Suspense fallback={<div className="p-4 text-[10px] font-mono uppercase text-muted-foreground">Initializing...</div>}>
      <ProfessionalPageContent />
    </Suspense>
  );
}

function ProfessionalPageContent() {
  const searchParams = useSearchParams();
  const { objectives, setObjectives, isReady: northStarReady } = useNorthStar();
  const actionParam = searchParams.get("action");
  const focusTaskIdParam = searchParams.get("taskId");
  const objectiveIdParam = searchParams.get("objectiveId");
  const statusParam = searchParams.get("status");
  const titleParam = searchParams.get("title");
  const dueDateParam = searchParams.get("dueDate");
  const shouldCreateTask = actionParam === "create-task";

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const initialViewParam = searchParams.get("view");
  const [view, setView] = useState<"kanban" | "list" | "calendar">(initialViewParam === "calendar" ? "calendar" : "kanban");
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState<TaskStatus | null>(shouldCreateTask ? "todo" : null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(null);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [calendarBlocks, setCalendarBlocks] = useState<ScheduleBlock[]>([]);
  const [calendarBlocksHydrated, setCalendarBlocksHydrated] = useState(false);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [calendarSpan, setCalendarSpan] = useState<1 | 3 | 7>(3);
  const [calendarSelection, setCalendarSelection] = useState<CalendarSelection | null>(null);
  const [dragStart, setDragStart] = useState<{ dayOffset: number; hour: number } | null>(null);
  const [dragCurrentHour, setDragCurrentHour] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{ blockId: string; edge: "start" | "end" } | null>(null);
  const [moving, setMoving] = useState<{ blockId: string; duration: number; pointerOffset: number } | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [tasksHydrated, setTasksHydrated] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const deepLinkCreateHandledRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let isActive = true;

    if (!supabase) {
      setSupabaseUserId(null);
      setAuthChecked(true);
      return;
    }

    const resolveUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isActive) return;

      if (error || !data?.user) {
        setSupabaseUserId(null);
        setAuthChecked(true);
        return;
      }

      setSupabaseUserId(data.user.id);
      setAuthChecked(true);
    };

    void resolveUser();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  useEffect(() => {
    setIsReady(false);
    setTasksHydrated(false);
    setCalendarBlocksHydrated(false);
  }, [supabaseUserId, northStarReady]);

  const projects = useMemo<Project[]>(
    () =>
      objectives.map((objective, objectiveIndex) => ({
        id: objective.id,
        name: objective.title,
        color: objective.color ?? projectColors[objectiveIndex % projectColors.length],
        dueDate: objective.dueDate ?? null,
        tier: objective.tier,
      })),
    [objectives],
  );

  const projectById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project])),
    [projects],
  );

  const objectiveNameById = useMemo(() => Object.fromEntries(objectives.map((o) => [o.id, o.title])), [objectives]);

  const baseTasksFromObjectives = useMemo<Task[]>(() => {
    return objectives.flatMap((objective) =>
      objective.keyResults.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: "",
        status: milestone.progress >= 100 ? "done" : "todo",
        priority: "medium",
        objectiveId: objective.id,
        projectId: objective.id,
        assignee: "",
        dueDate: milestone.dueDate ?? objective.dueDate ?? "",
        tags: [objective.title],
      })),
    );
  }, [objectives]);

  useEffect(() => {
    if (!northStarReady || !authChecked) return;

    if (!supabaseUserId || !supabase) {
      setTasks([]);
      setTasksHydrated(true);
      setIsReady(true);
      return;
    }

    let cancelled = false;

    const loadTasks = async () => {
      const { data } = await supabase
        .from("professional_tasks")
        .select("*")
        .eq("user_id", supabaseUserId)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

        const rows = (data ?? []) as ProfessionalTaskRow[];
        setTasks(
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description ?? "",
            status: row.status,
            priority: row.priority,
            objectiveId: row.objective_id,
              projectId: row.objective_id ?? row.project_id,
            assignee: row.assignee ?? "",
            dueDate: row.due_date ?? "",
            tags: row.tags ?? [],
            updatedAt: row.updated_at,
          })),
        );
        setTasksHydrated(true);
        setIsReady(true);
    };

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [supabaseUserId, northStarReady, supabase, authChecked]);

  useEffect(() => {
    if (!northStarReady || !tasksHydrated) return;

    setTasks((previous) => {
      const objectiveTaskIds = new Set(baseTasksFromObjectives.map((task) => task.id));
      const previousById = new Map(previous.map((task) => [task.id, task]));
      const standaloneTasks = previous.filter((task) => !objectiveTaskIds.has(task.id));

      const mergedObjectiveTasks = baseTasksFromObjectives.map((baseTask) => {
        const existing = previousById.get(baseTask.id);
        if (!existing) return baseTask;

        return {
          ...existing,
          id: baseTask.id,
          title: baseTask.title,
          objectiveId: baseTask.objectiveId,
          projectId: baseTask.projectId,
          dueDate: baseTask.dueDate || existing.dueDate || "",
          tags: baseTask.tags,
          status: existing.status,
        };
      });

      return [...standaloneTasks, ...mergedObjectiveTasks];
    });
  }, [baseTasksFromObjectives, northStarReady, tasksHydrated]);

  useEffect(() => {
    if (!isReady || !tasksHydrated) return;
    if (!supabaseUserId || !supabase) return;

    const sync = async () => {
      const payload = tasks.map((task, index) => ({
        id: task.id,
        user_id: supabaseUserId,
        objective_id: task.objectiveId ?? task.projectId ?? null,
        project_id: null,
        title: task.title,
        description: task.description?.trim() ? task.description.trim() : null,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee?.trim() ? task.assignee.trim() : null,
        due_date: task.dueDate?.trim() ? task.dueDate : null,
        tags: task.tags ?? [],
        sort_order: index,
      }));

      if (payload.length > 0) {
        const { error } = await supabase.from("professional_tasks").upsert(payload);
        if (error) console.error("[professional_tasks] upsert failed:", error, payload);
      }

      const existing = await supabase.from("professional_tasks").select("id").eq("user_id", supabaseUserId);
      const existingIds = (existing.data ?? []).map((row: { id: string }) => row.id);
      const localIds = new Set(payload.map((row) => row.id));
      const toDelete = existingIds.filter((id: string) => !localIds.has(id));

      if (toDelete.length > 0) {
        await supabase.from("professional_tasks").delete().eq("user_id", supabaseUserId).in("id", toDelete);
      }
    };

    void sync();
  }, [tasks, isReady, supabaseUserId, supabase, tasksHydrated]);

  useEffect(() => {
    if (!isReady) return;

    if (!supabaseUserId || !supabase) {
      setCalendarBlocks([]);
      setCalendarBlocksHydrated(true);
      return;
    }

    supabase
      .from("tactical_blocks")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("day_offset", { ascending: true })
      .then(({ data }: { data: any }) => {
        const rows = (data ?? []) as TacticalBlockRow[];
        setCalendarBlocks(
          rows.map((row) => ({
            id: row.id,
            dayOffset: row.day_offset,
            startHr: row.start_hr,
            endHr: row.end_hr,
            title: row.title,
            type: row.type,
            taskId: row.task_id,
            objectiveId: row.objective_id,
          })),
        );
        setCalendarBlocksHydrated(true);
      });
  }, [isReady, supabaseUserId, supabase]);

  useEffect(() => {
    if (!isReady || !calendarBlocksHydrated) return;
    if (!supabaseUserId || !supabase) return;

    const sync = async () => {
      const payload = calendarBlocks.map((block, index) => ({
        id: block.id,
        user_id: supabaseUserId,
        day_offset: block.dayOffset,
        start_hr: block.startHr,
        end_hr: block.endHr,
        title: block.title,
        type: block.type,
        task_id: block.taskId ?? null,
        objective_id: block.objectiveId ?? null,
        sort_order: index,
      }));

      if (payload.length > 0) {
        const { error } = await supabase.from("tactical_blocks").upsert(payload);
        if (error) console.error("[tactical_blocks] upsert failed:", error, payload);
      }

      const existing = await supabase.from("tactical_blocks").select("id").eq("user_id", supabaseUserId);
      const existingIds = (existing.data ?? []).map((row: { id: string }) => row.id);
      const localIds = new Set(payload.map((row) => row.id));
      const toDelete = existingIds.filter((id: string) => !localIds.has(id));

      if (toDelete.length > 0) {
        await supabase.from("tactical_blocks").delete().eq("user_id", supabaseUserId).in("id", toDelete);
      }
    };

    void sync();
  }, [calendarBlocks, isReady, calendarBlocksHydrated, supabaseUserId, supabase]);

  useEffect(() => {
    if (!isReady) return;

    if (objectiveIdParam) {
      setFilterProject(objectiveIdParam);
      setExpandedProject(objectiveIdParam);
      setActiveObjectiveId(objectiveIdParam);
    }

    if (focusTaskIdParam) {
      setHighlightedTaskId(focusTaskIdParam);
      setView("list");
    }

    if (actionParam === "create-task" && isTaskStatus(statusParam)) {
      setAddingTask(statusParam);
    }
  }, [isReady, actionParam, focusTaskIdParam, objectiveIdParam, statusParam]);

  useEffect(() => {
    if (!highlightedTaskId) return;
    const el = document.getElementById(`pro-task-${highlightedTaskId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setHighlightedTaskId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [highlightedTaskId, view, tasks.length]);

  const activeFilterProject = filterProject && projectById[filterProject] ? filterProject : null;
  const filtered = activeFilterProject ? tasks.filter((task) => task.projectId === activeFilterProject) : tasks;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length;
  const throughput = totalTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}%` : "0%";
  const linkedTasks = tasks.filter((task) => !!task.objectiveId).length;
  const unlinkedTasks = totalTasks - linkedTasks;
  const linkedCompletion =
    linkedTasks > 0
      ? Math.round((tasks.filter((task) => !!task.objectiveId && task.status === "done").length / linkedTasks) * 100)
      : 0;

  const syncMilestoneFromTask = (taskId: string, patch: Partial<Task>) => {
    setObjectives((previous) =>
      previous.map((objective) => {
        const milestoneExists = objective.keyResults.some((milestone) => milestone.id === taskId);
        if (!milestoneExists) return objective;

        return {
          ...objective,
          keyResults: objective.keyResults.map((milestone) => {
            if (milestone.id !== taskId) return milestone;
            const nextProgress =
              patch.status !== undefined
                ? patch.status === "done"
                  ? 100
                  : milestone.progress >= 100
                    ? 0
                    : milestone.progress
                : milestone.progress;

            return {
              ...milestone,
              title: patch.title ?? milestone.title,
              dueDate: patch.dueDate !== undefined ? patch.dueDate || null : milestone.dueDate,
              progress: nextProgress,
            };
          }),
        };
      }),
    );
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task)));
    if (patch.title !== undefined || patch.dueDate !== undefined || patch.status !== undefined) {
      syncMilestoneFromTask(id, patch);
    }
  };

  const moveTask = (id: string, to: TaskStatus) => {
    updateTask(id, { status: to });
  };

  const deleteTask = (id: string) => setTasks((prev) => prev.filter((task) => task.id !== id));

  const removeMilestoneTask = (id: string) => {
    setObjectives((previous) =>
      previous.map((objective) => ({
        ...objective,
        keyResults: objective.keyResults.filter((milestone) => milestone.id !== id),
      })),
    );
    setTasks((previous) => previous.filter((task) => task.id !== id));
  };

  const linkTaskToObjective = (taskId: string, newObjectiveId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setObjectives((prev) => 
      prev.map(obj => {
        if (obj.id === newObjectiveId) {
          return {
            ...obj,
            keyResults: [
              ...obj.keyResults,
              {
                id: taskId,
                title: task.title,
                progress: task.status === "done" ? 100 : 0,
                status: "on-track",
                color: obj.color ?? null,
                dueDate: task.dueDate || obj.dueDate || null,
              }
            ]
          }
        }
        return obj;
      })
    );

    const objTitle = objectives.find(o => o.id === newObjectiveId)?.title;
    const newTags = task.tags ? [...task.tags.filter(t => t !== objTitle), objTitle].filter(Boolean) as string[] : (objTitle ? [objTitle] : []);

    updateTask(taskId, {
      objectiveId: newObjectiveId,
      projectId: newObjectiveId,
      tags: newTags
    });
  };

  const addTask = (
    title: string,
    status: TaskStatus,
    options?: {
      objectiveId?: string | null;
      dueDate?: string;
    },
  ) => {
    const targetObjectiveId = options?.objectiveId ?? activeFilterProject ?? activeObjectiveId ?? null;

    const taskId = uid();
    const targetObjective = targetObjectiveId ? objectives.find((objective) => objective.id === targetObjectiveId) : null;

    if (targetObjectiveId && targetObjective) {
      setObjectives((previous) =>
        previous.map((objective) =>
          objective.id === targetObjectiveId
            ? {
                ...objective,
                keyResults: [
                  ...objective.keyResults,
                  {
                    id: taskId,
                    title,
                    progress: status === "done" ? 100 : 0,
                    status: "on-track",
                    color: objective.color ?? null,
                    dueDate: objective.dueDate ?? null,
                  },
                ],
              }
            : objective,
        ),
      );
    }

    setTasks((previous) => [
      ...previous,
      {
        id: taskId,
        title,
        description: "",
        status,
        priority: "medium",
        objectiveId: targetObjectiveId,
        projectId: targetObjectiveId,
        assignee: "",
        dueDate: options?.dueDate ?? targetObjective?.dueDate ?? "",
        tags: targetObjective ? [targetObjective.title] : [],
        updatedAt: new Date().toISOString(),
      },
    ]);
    setAddingTask(null);
    return taskId;
  };

  useEffect(() => {
    if (!isReady || actionParam !== "create-task" || !titleParam || deepLinkCreateHandledRef.current) return;

    const targetObjectiveId = objectiveIdParam ?? activeFilterProject ?? activeObjectiveId ?? null;
    const targetObjective = targetObjectiveId ? objectives.find((objective) => objective.id === targetObjectiveId) : null;
    const status: TaskStatus = isTaskStatus(statusParam) ? statusParam : "todo";
    const taskId = uid();

    if (targetObjectiveId && targetObjective) {
      setObjectives((previous) =>
        previous.map((objective) =>
          objective.id === targetObjectiveId
            ? {
                ...objective,
                keyResults: [
                  ...objective.keyResults,
                  {
                    id: taskId,
                    title: titleParam,
                    progress: status === "done" ? 100 : 0,
                    status: "on-track",
                    color: objective.color ?? null,
                    dueDate: dueDateParam || objective.dueDate || null,
                  },
                ],
              }
            : objective,
        ),
      );
    }

    setTasks((previous) => [
      ...previous,
      {
        id: taskId,
        title: titleParam,
        description: "",
        status,
        priority: "medium",
        objectiveId: targetObjectiveId,
        projectId: targetObjectiveId,
        assignee: "",
        dueDate: dueDateParam || targetObjective?.dueDate || "",
        tags: targetObjective ? [targetObjective.title] : [],
        updatedAt: new Date().toISOString(),
      },
    ]);

    setHighlightedTaskId(taskId);
    setFilterProject(targetObjectiveId);
    setExpandedProject(targetObjectiveId);
    deepLinkCreateHandledRef.current = true;
  }, [
    isReady,
    actionParam,
    titleParam,
    dueDateParam,
    statusParam,
    objectiveIdParam,
    activeFilterProject,
    activeObjectiveId,
    objectives,
    setObjectives,
  ]);

  const sortDoneLatestFirst = (taskList: Task[]) =>
    [...taskList].sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
    );

  const weeklyOutput = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - idx));
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        label: date.toLocaleDateString(undefined, { weekday: "short" }),
        done: 0,
      };
    });

    const byDay = new Map(days.map((day) => [day.key, day]));

    tasks.forEach((task) => {
      if (task.status !== "done") return;
      const stamp = new Date(task.updatedAt ?? Date.now()).toISOString().slice(0, 10);
      const bucket = byDay.get(stamp);
      if (bucket) bucket.done += 1;
    });

    return days;
  }, [tasks]);

  const weeklyDoneTotal = useMemo(
    () => weeklyOutput.reduce((sum, day) => sum + day.done, 0),
    [weeklyOutput],
  );

  const maxDailyDone = useMemo(
    () => Math.max(1, ...weeklyOutput.map((day) => day.done)),
    [weeklyOutput],
  );

  const todayDone = weeklyOutput[weeklyOutput.length - 1]?.done ?? 0;
  const bestDay = useMemo(
    () => weeklyOutput.reduce((best, day) => (day.done > best.done ? day : best), weeklyOutput[0] ?? { key: "", label: "-", done: 0 }),
    [weeklyOutput],
  );

  const onDragStartTask = (id: string) => setDraggingTaskId(id);
  const onDragEndTask = () => {
    setDraggingTaskId(null);
    setDragOverStatus(null);
  };

  const onDropToColumn = (status: TaskStatus) => {
    if (!draggingTaskId) return;
    moveTask(draggingTaskId, status);
    setDraggingTaskId(null);
    setDragOverStatus(null);
  };

  const pxPerHour = 72;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const slots = Array.from({ length: 48 }, (_, i) => Number((i * 0.5).toFixed(2)));

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const taskBlocks = useMemo<CalendarRenderBlock[]>(() => {
    const occupiedByTask = new Set(calendarBlocks.map((block) => block.taskId).filter(Boolean));
    const dayCounter = new Map<number, number>();
    return filtered
      .filter((task) => task.dueDate)
      .filter((task) => !occupiedByTask.has(task.id))
      .map((task) => {
        const due = new Date(`${task.dueDate}T00:00:00`);
        if (Number.isNaN(due.getTime())) return null;
        const dayOffset = Math.round((due.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
        const count = dayCounter.get(dayOffset) ?? 0;
        dayCounter.set(dayOffset, count + 1);
        const startHr = Math.min(20, 9 + (count % 10));
        return {
          id: `task-${task.id}`,
          dayOffset,
          startHr,
          endHr: startHr + 1,
          title: task.title,
          type: task.status === "in-progress" ? "deep-work" : "admin",
          taskId: task.id,
          objectiveId: task.objectiveId ?? null,
          readonlySource: "task" as const,
        };
      })
      .filter(Boolean) as CalendarRenderBlock[];
  }, [filtered, calendarBlocks, startOfToday]);

  const scheduleBlocks = useMemo<CalendarRenderBlock[]>(
    () => calendarBlocks.map((block) => ({ ...block })),
    [calendarBlocks],
  );

  const renderBlocks = useMemo(() => [...scheduleBlocks, ...taskBlocks], [scheduleBlocks, taskBlocks]);
  const selectedSchedule = useMemo(() => {
    if (calendarSelection?.kind !== "schedule") return null;
    return calendarBlocks.find((block) => block.id === calendarSelection.id) ?? null;
  }, [calendarBlocks, calendarSelection]);

  const selectedTask = useMemo(() => {
    if (calendarSelection?.kind !== "task") return null;
    return filtered.find((task) => task.id === calendarSelection.taskId) ?? null;
  }, [calendarSelection, filtered]);

  const selectedTaskBlock = useMemo(() => {
    if (!selectedTask) return null;
    return taskBlocks.find((block) => block.taskId === selectedTask.id) ?? null;
  }, [selectedTask, taskBlocks]);

  useEffect(() => {
    if (!calendarSelection) return;
    if (calendarSelection.kind === "schedule") {
      if (!calendarBlocks.some((block) => block.id === calendarSelection.id)) {
        setCalendarSelection(null);
      }
      return;
    }
    if (!filtered.some((task) => task.id === calendarSelection.taskId)) {
      setCalendarSelection(null);
    }
  }, [calendarSelection, calendarBlocks, filtered]);

  const dayValueFromOffset = (offset: number) => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  const beginDragSchedule = (dayOffset: number, hour: number) => {
    dragMovedRef.current = false;
    setCalendarSelection(null);
    setDragStart({ dayOffset, hour });
    setDragCurrentHour(hour);
  };

  const completeDragSchedule = () => {
    if (!dragStart || dragCurrentHour === null) return;
    if (!dragMovedRef.current) {
      setDragStart(null);
      setDragCurrentHour(null);
      return;
    }
  const startHr = Math.min(dragStart.hour, dragCurrentHour);
  const endHr = Math.max(dragStart.hour, dragCurrentHour) + 0.5;
    const id = uid();
  const dayOffset = dragStart.dayOffset;
  const newTaskId = addTask("Scheduled task", "todo", { dueDate: dayValueFromOffset(dayOffset) });
    
    setCalendarBlocks((prev) => [
      ...prev,
      {
        id,
  dayOffset,
        startHr,
        endHr,
        title: "Scheduled task",
        type: "deep-work",
        taskId: newTaskId,
      },
    ]);
    setCalendarSelection({ kind: "schedule", id });
    setDragStart(null);
    setDragCurrentHour(null);
  };

  useEffect(() => {
    if (!dragStart) return;
    const stop = () => completeDragSchedule();
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, [dragStart, dragCurrentHour]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHr = now.getHours() + now.getMinutes() / 60;

  useEffect(() => {
    if (!moving || !scrollRef.current || !calendarGridRef.current) return;

    const onMove = (event: MouseEvent) => {
      const container = scrollRef.current;
      const grid = calendarGridRef.current;
      if (!container || !grid) return;

      const rect = container.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      const relativeY = event.clientY - rect.top + container.scrollTop;
      const pointerHr = Math.max(0, Math.min(24, relativeY / pxPerHour));
      const relativeX = event.clientX - gridRect.left;
      const colWidth = gridRect.width / Math.max(1, calendarSpan);
      const colIndex = Math.max(0, Math.min(calendarSpan - 1, Math.floor(relativeX / colWidth)));
      const dayOffset = calendarOffset + colIndex;
      const rawStart = pointerHr - moving.pointerOffset;
      const clampedStart = Math.max(0, Math.min(24 - moving.duration, snapToHalfHour(rawStart)));

      setCalendarBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== moving.blockId) return block;
          return {
            ...block,
            dayOffset,
            startHr: clampedStart,
            endHr: Number((clampedStart + moving.duration).toFixed(2)),
          };
        }),
      );
    };

    const onUp = () => setMoving(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [moving, calendarOffset, calendarSpan]);

  useEffect(() => {
    if (!resizing || !scrollRef.current) return;
    const onMove = (event: MouseEvent) => {
      const container = scrollRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const relativeY = event.clientY - rect.top + container.scrollTop;
      const snapped = snapToHalfHour(Math.max(0, Math.min(24, relativeY / pxPerHour)));

      setCalendarBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== resizing.blockId) return block;
          if (resizing.edge === "start") {
            return { ...block, startHr: Math.min(snapped, block.endHr - 0.5) };
          }
          return { ...block, endHr: Math.max(snapped, block.startHr + 0.5) };
        }),
      );
    };

    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  const updateSelectedSchedule = (patch: Partial<ScheduleBlock>) => {
    if (!selectedSchedule) return;
    setCalendarBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== selectedSchedule.id) return block;
        const next = { ...block, ...patch };
        if (next.endHr <= next.startHr) next.endHr = Number((next.startHr + 0.5).toFixed(2));
        return next;
      }),
    );
  };

  const deleteSelectedSchedule = () => {
    if (!selectedSchedule) return;
    setCalendarBlocks((prev) => prev.filter((block) => block.id !== selectedSchedule.id));
    setCalendarSelection(null);
  };

  const duplicateSelectedSchedule = () => {
    if (!selectedSchedule) return;
    const duration = Number((selectedSchedule.endHr - selectedSchedule.startHr).toFixed(2));
    const nextStart = Math.max(0, Math.min(24 - duration, selectedSchedule.startHr + 0.5));
    const id = uid();
    setCalendarBlocks((prev) => [
      ...prev,
      {
        ...selectedSchedule,
        id,
        startHr: nextStart,
        endHr: Number((nextStart + duration).toFixed(2)),
      },
    ]);
    setCalendarSelection({ kind: "schedule", id });
  };

  const deleteSelectedTask = () => {
    if (!selectedTask) return;
    removeMilestoneTask(selectedTask.id);
    setCalendarBlocks((prev) => prev.filter((block) => block.taskId !== selectedTask.id));
    setCalendarSelection(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT")) return;
      
      if ((e.key === "Backspace" || e.key === "Delete") && calendarSelection) {
        if (calendarSelection.kind === "schedule" && selectedSchedule) {
          e.preventDefault();
          setCalendarBlocks((prev) => prev.filter((block) => block.id !== selectedSchedule.id));
          setCalendarSelection(null);
        } else if (calendarSelection.kind === "task" && selectedTask) {
          e.preventDefault();
          removeMilestoneTask(selectedTask.id);
          setCalendarBlocks((prev) => prev.filter((block) => block.taskId !== selectedTask.id));
          setCalendarSelection(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [calendarSelection, selectedSchedule, selectedTask]);

  const createScheduleFromSelectedTask = () => {
    if (!selectedTask || !selectedTaskBlock) return;
    const existing = calendarBlocks.find((block) => block.taskId === selectedTask.id);
    if (existing) {
      setCalendarSelection({ kind: "schedule", id: existing.id });
      return;
    }
    const id = uid();
    setCalendarBlocks((prev) => [
      ...prev,
      {
        id,
        title: selectedTask.title,
        dayOffset: selectedTaskBlock.dayOffset,
        startHr: selectedTaskBlock.startHr,
        endHr: selectedTaskBlock.endHr,
        type: selectedTask.status === "in-progress" ? "deep-work" : "admin",
        taskId: selectedTask.id,
        objectiveId: selectedTask.projectId ?? selectedTask.objectiveId ?? null,
      },
    ]);
    setCalendarSelection({ kind: "schedule", id });
  };

  return (
    <div className="flex h-full min-h-0 select-none flex-col gap-4 overflow-hidden font-sans antialiased">
      <header className="flex shrink-0 items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Briefcase className="h-3 w-3 stroke-[1.5]" /> Professional
          </span>
          <span className="flex items-center gap-2">
            <Layers className="h-3 w-3 stroke-[1.5]" /> {totalTasks} Tasks
          </span>
          <span className="hidden items-center gap-2 md:flex">
            <CheckCircle2 className="h-3 w-3 stroke-[1.5]" /> {doneTasks} Done
          </span>
          <span className="hidden items-center gap-2 md:flex">
            <GitBranch className="h-3 w-3 stroke-[1.5]" /> {linkedTasks} Linked
          </span>
          <span className={cn("hidden items-center gap-2 lg:flex", unlinkedTasks > 0 ? "text-amber-500/80" : "text-muted-foreground")}>
            <AlertCircle className="h-3 w-3 stroke-[1.5]" /> {unlinkedTasks} Unlinked
          </span>
          <span className="hidden items-center gap-2 lg:flex">
            <Zap className="h-3 w-3 stroke-[1.5]" /> {throughput} Throughput
          </span>
        </div>
      </header>

      <div className={cn("grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4", view === "calendar" && "hidden") }>
        {[
          { label: "In Progress", val: inProgressTasks, sub: "active tasks", accent: "text-amber-500/60" },
          { label: "In Review", val: tasks.filter((task) => task.status === "review").length, sub: "awaiting", accent: "text-blue-500/60" },
          { label: "Completed", val: doneTasks, sub: `of ${totalTasks}`, accent: "text-emerald-500/60" },
          { label: "NS Sync", val: `${linkedCompletion}%`, sub: `${linkedTasks} linked`, accent: "text-indigo-500/60" },
        ].map((kpi, i) => (
          <div key={i} className="flex flex-col border border-border/30 bg-background/60 p-2.5 backdrop-blur-sm">
            <span className="mb-1 text-[8px] uppercase tracking-widest text-muted-foreground font-mono">{kpi.label}</span>
            <div className="flex items-end justify-between">
              <span className="text-lg font-semibold leading-none tracking-tighter text-foreground tabular-nums">{kpi.val}</span>
              <span className={cn("text-[9px] text-muted-foreground tabular-nums font-mono", kpi.accent)}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={cn(
        "grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden transition-all duration-500 ease-out",
        view === "calendar" ? "lg:grid-cols-1" : "lg:grid-cols-[300px_1fr_280px]",
      )}>
        <div className={cn(
          "flex min-h-0 flex-col overflow-hidden border border-border/30 bg-background/60 backdrop-blur-sm transition-all duration-500",
          view === "calendar" && "hidden",
        )}>
          <SectionHead
            title="Projects"
            icon={Briefcase}
            badge={<span className="text-[9px] text-muted-foreground font-mono">{projects.length}</span>}
          />

          <button
            onClick={() => setFilterProject(null)}
            className={cn(
              "flex shrink-0 items-center justify-between border-b border-border/10 px-4 py-2.5 transition-colors",
              !activeFilterProject ? "bg-foreground text-background" : "hover:bg-muted/10",
            )}
          >
            <span className="text-[11px] font-semibold tracking-tight">All Projects</span>
            <span className={cn("text-[9px] font-mono", !activeFilterProject ? "text-background/70" : "text-muted-foreground")}>{tasks.length} tasks</span>
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
            {projects.map((project) => {
              const projectTasks = tasks.filter((task) => task.projectId === project.id);
              const completed = projectTasks.filter((task) => task.status === "done").length;
              const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
              const isActive = activeFilterProject === project.id;

              return (
                <div
                  key={project.id}
                  className={cn(
                    "group border-b border-border/10 last:border-0 transition-colors",
                    isActive && "border-l-2 border-l-foreground bg-foreground/5",
                  )}
                >
                  <div
                    className="flex cursor-pointer items-center gap-2.5 px-4 py-3"
                    onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                  >
                    <div className="h-2 w-2 shrink-0" style={{ backgroundColor: project.color }} />
                    <div
                      className="flex min-w-0 flex-1 flex-col"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterProject(isActive ? null : project.id);
                      }}
                    >
                      <span className="truncate text-[11px] font-semibold tracking-tight text-foreground">{project.name}</span>
                      <span className="truncate text-[9px] text-muted-foreground/65 font-mono">{project.tier} objective</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-foreground tabular-nums font-mono">{progress}%</span>
                    <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", expandedProject === project.id && "rotate-180")} />
                  </div>

                  {expandedProject === project.id && (
                    <div className="border-t border-border/10 bg-muted/5 px-4 py-2 pb-3">
                      <div className="mb-2 h-0.5 w-full bg-border/20">
                        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                      </div>
                      <div className="mb-2 flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                        <span>{completed}/{projectTasks.length} done</span>
                        <span className={cn("rounded border px-1.5 py-0.5", isOverdue(project.dueDate) ? "border-rose-500/30 text-rose-500/85" : "border-border/35")}>
                          {formatDate(project.dueDate)}
                        </span>
                      </div>
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/70 font-mono">Objective-managed in North Star</p>
                    </div>
                  )}
                </div>
              );
            })}
            {objectives.length === 0 && (
              <p className="border-t border-border/10 px-4 py-3 text-[9px] text-amber-500/80 font-mono">Create objectives in North Star to populate projects here.</p>
            )}
          </div>
        </div>

        <div className={cn(
          "flex min-h-0 flex-col overflow-hidden border border-border/30 bg-background/60 backdrop-blur-sm transition-all duration-500 ease-out",
          view === "calendar" && "animate-in fade-in slide-in-from-bottom-1 duration-500",
        )}>
          <div className="flex shrink-0 items-center justify-between border-b border-border/20 px-4 py-2.5">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-foreground font-mono">
              <Columns3 className="h-3 w-3 stroke-[1.5] text-muted-foreground" />
              {activeFilterProject ? projectById[activeFilterProject]?.name ?? "Filtered" : "All Tasks"}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-md border border-border/40 bg-muted/20 p-0.5">
                <button onClick={() => setView("kanban")} className={cn("px-2.5 py-1 text-[9px] uppercase tracking-widest transition-all font-mono rounded", view === "kanban" ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground")}>Board</button>
                <button onClick={() => setView("list")} className={cn("px-2.5 py-1 text-[9px] uppercase tracking-widest transition-all font-mono rounded", view === "list" ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground")}>List</button>
                <button onClick={() => setView("calendar")} className={cn("px-2.5 py-1 text-[9px] uppercase tracking-widest transition-all font-mono rounded", view === "calendar" ? "bg-background text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground")}>Calendar</button>
              </div>
              
              {view === "calendar" && (
                <div className="flex items-center gap-1 border-l border-border/20 pl-3">
                  {[1, 3, 7].map((span) => (
                    <button
                      key={span}
                      onClick={() => setCalendarSpan(span as 1 | 3 | 7)}
                      className={cn(
                        "rounded px-2 py-1 text-[9px] font-mono uppercase tracking-widest",
                        calendarSpan === span ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/40",
                      )}
                    >
                      {span === 1 ? "1d" : `${span}d`}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => setCalendarOffset((p) => p - calendarSpan)} className="rounded border border-border/30 p-1 text-muted-foreground hover:bg-muted/40"><ChevronLeft className="h-3 w-3" /></button>
                    <button onClick={() => setCalendarOffset(0)} className="rounded border border-indigo-500/30 px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-indigo-500">Today</button>
                    <button onClick={() => setCalendarOffset((p) => p + calendarSpan)} className="rounded border border-border/30 p-1 text-muted-foreground hover:bg-muted/40"><ChevronRight className="h-3 w-3" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {view === "kanban" ? (
            <div className="flex min-h-0 flex-1 gap-0 overflow-x-auto scrollbar-hide">
              {columns.map((col) => {
                const colTasksRaw = filtered.filter((task) => task.status === col.key);
                const colTasks = col.key === "done" ? sortDoneLatestFirst(colTasksRaw) : colTasksRaw;
                return (
                  <div
                    key={col.key}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverStatus(col.key);
                    }}
                    onDrop={() => onDropToColumn(col.key)}
                    onDragLeave={() => setDragOverStatus((prev) => (prev === col.key ? null : prev))}
                    className={cn(
                      "flex min-h-0 min-w-52 flex-1 flex-col border-r border-border/10 last:border-0",
                      dragOverStatus === col.key && "bg-foreground/5",
                    )}
                  >
                    <div className="flex shrink-0 items-center justify-between border-b border-border/10 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground font-mono">
                        {col.label}
                        <span className={cn("text-[9px] font-bold tabular-nums", col.color)}>{colTasks.length}</span>
                      </span>
                      <button onClick={() => setAddingTask(col.key)} className="p-0.5 text-muted-foreground transition-colors hover:text-foreground">
                        <Plus className="h-3 w-3 stroke-[1.5]" />
                      </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 py-2 scrollbar-hide">
                      {colTasks.map((task) => {
                        const project = task.projectId ? projectById[task.projectId] : null;
                        const isMenuOpen = openTaskMenuId === task.id;
                        return (
                          <div
                            key={task.id}
                            id={`pro-task-${task.id}`}
                            draggable
                            onDragStart={() => onDragStartTask(task.id)}
                            onDragEnd={onDragEndTask}
                            className={cn(
                              "group relative cursor-grab border border-border/20 bg-background/80 p-2.5 transition-all active:cursor-grabbing",
                              draggingTaskId === task.id ? "opacity-50" : "hover:border-border/40",
                              isMenuOpen && "border-foreground/25 bg-foreground/3",
                              highlightedTaskId === task.id && "ring-2 ring-indigo-500/50 border-indigo-500/40 bg-indigo-500/5",
                            )}
                          >
                            <DropdownMenu open={isMenuOpen} onOpenChange={(open) => {
                              setOpenTaskMenuId(open ? task.id : null);
                            }}>
                              <DropdownMenuTrigger className="absolute right-2 top-2 z-10 rounded border border-transparent bg-background/50 p-1 text-muted-foreground opacity-0 transition-all hover:border-border/40 hover:bg-background/80 hover:text-foreground group-hover:opacity-100 data-popup-open:opacity-100 data-popup-open:bg-background/80">
                                <MoreHorizontal className="h-3 w-3" />
                              </DropdownMenuTrigger>
                              
                                <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="w-48 p-1 font-mono">
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="text-[10px] uppercase tracking-widest text-muted-foreground">Move</DropdownMenuSubTrigger>
                                    
                                      <DropdownMenuSubContent className="p-1 font-mono">
                                        {columns.map((st) => (
                                          <DropdownMenuItem
                                            key={st.key}
                                            onClick={() => moveTask(task.id, st.key)}
                                            className={cn("flex items-center justify-between text-[9px] uppercase tracking-widest", task.status === st.key ? "text-foreground" : "text-muted-foreground")}
                                          >
                                            {st.label}
                                            {task.status === st.key && <span>✓</span>}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    
                                  </DropdownMenuSub>

                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="text-[10px] uppercase tracking-widest text-muted-foreground">Priority</DropdownMenuSubTrigger>
                                    
                                      <DropdownMenuSubContent className="p-1 font-mono">
                                        {priorities.map((p) => (
                                          <DropdownMenuItem
                                            key={p}
                                            onClick={() => updateTask(task.id, { priority: p })}
                                            className={cn("flex items-center justify-between text-[9px] uppercase tracking-widest", task.priority === p ? "text-foreground" : "text-muted-foreground")}
                                          >
                                            {priorityLabel[p]}
                                            {task.priority === p && <span>✓</span>}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    
                                  </DropdownMenuSub>

                                  {!task.objectiveId && objectives.length > 0 && (
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger className="text-[10px] uppercase tracking-widest text-muted-foreground">Link Project</DropdownMenuSubTrigger>
                                      
                                        <DropdownMenuSubContent className="max-h-75 overflow-y-auto p-1 font-mono">
                                          {objectives.map((obj) => (
                                            <DropdownMenuItem
                                              key={obj.id}
                                              onClick={() => linkTaskToObjective(task.id, obj.id)}
                                              className="flex flex-col items-start gap-0.5 text-[9px] uppercase tracking-widest text-muted-foreground"
                                            >
                                              <span className="truncate">{obj.title}</span>
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      
                                    </DropdownMenuSub>
                                  )}

                                  <DropdownMenuSeparator className="my-1 bg-border/20" />
                                  
                                  <div className="px-2 py-1.5">
                                    <label className="mb-1 block text-[9px] uppercase tracking-widest text-muted-foreground/80">Due date</label>
                                    <input
                                      type="date"
                                      value={task.dueDate ?? ""}
                                      onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                                      className="w-full border border-border/30 bg-transparent px-1.5 py-1 text-[9px] uppercase tracking-widest text-muted-foreground outline-none font-mono"
                                    />
                                  </div>

                                  <div className="px-2 py-1.5">
                                    <label className="mb-1 block text-[9px] uppercase tracking-widest text-muted-foreground/80">Assignee</label>
                                    <input
                                      value={task.assignee ?? ""}
                                      onChange={(e) => updateTask(task.id, { assignee: e.target.value })}
                                      placeholder="Unassigned..."
                                      className="w-full border border-border/30 bg-transparent px-1.5 py-1 text-[9px] uppercase tracking-widest text-muted-foreground outline-none placeholder:text-muted-foreground/45 font-mono"
                                    />
                                  </div>

                                  <DropdownMenuSeparator className="my-1 bg-border/20" />

                                  <DropdownMenuItem
                                    onClick={() => removeMilestoneTask(task.id)}
                                    className="text-[10px] uppercase tracking-widest text-rose-500/90 focus:bg-rose-500/10 focus:text-rose-500"
                                  >
                                    Remove Task
                                  </DropdownMenuItem>

                                </DropdownMenuContent>
                              
                            </DropdownMenu>

                            <div className="mb-2 flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="block text-[11px] font-semibold leading-tight text-foreground">{task.title}</span>
                                {task.description && (
                                  <span className="mt-1 block text-[9px] leading-snug text-muted-foreground">{task.description}</span>
                                )}
                              </div>
                            </div>

                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                              <span className={cn("rounded border px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-mono", priorityPill[task.priority])}>
                                {priorityLabel[task.priority]}
                              </span>
                              <span className={cn("rounded border px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-mono", task.projectId ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500/80" : "border-amber-500/30 bg-amber-500/10 text-amber-500/80")}>
                                {task.projectId ? "Linked" : "Unlinked"}
                              </span>
                            </div>

                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[8px] uppercase tracking-widest text-muted-foreground font-mono">
                              <span className="truncate">{project?.name ?? "No project"}</span>
                              <span className={cn("flex items-center gap-1", isOverdue(task.dueDate) && task.status !== "done" && "text-rose-500/80")}>
                                <Calendar className="h-2.5 w-2.5" /> {formatDate(task.dueDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-2.5 w-2.5" /> {task.assignee?.trim() ? task.assignee : "Unassigned"}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {addingTask === col.key && (
                        <InlineInput placeholder="Task title..." onSubmit={(value) => addTask(value, col.key)} onCancel={() => setAddingTask(null)} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : view === "calendar" ? (
            <div className={cn(
              "grid min-h-0 flex-1 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              "grid-cols-[minmax(0,1fr)_340px]"
            )}>
              <div ref={scrollRef} className="relative overflow-y-auto overflow-x-hidden scrollbar-hide border-r border-border/10">
                <div className="sticky top-0 z-[60] flex items-center justify-between border-b border-border/20 bg-background/95 px-3 py-2 backdrop-blur">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-500 font-semibold tracking-widest uppercase">
                    SCHEDULE GRID
                  </div>
                </div>

                <div className="flex" style={{ minHeight: hours.length * pxPerHour }}>
                  <div className="w-14 shrink-0 border-r border-border/10 relative" style={{ height: hours.length * pxPerHour }}>
                    {hours.map((h) => (
                      <div key={h} className="absolute right-2 text-[9px] font-mono text-muted-foreground/60" style={{ top: h * pxPerHour - 6 }}>
                        {formatHourLabel(h).replace(":00", "")}
                      </div>
                    ))}
                  </div>

                  <div ref={calendarGridRef} className="grid flex-1" style={{ gridTemplateColumns: `repeat(${calendarSpan}, minmax(0, 1fr))`, height: hours.length * pxPerHour }}>
                    {Array.from({ length: calendarSpan }).map((_, colIndex) => {
                      const dayOffset = calendarOffset + colIndex;
                      const date = new Date(startOfToday);
                      date.setDate(date.getDate() + dayOffset);
                      const isToday = dayOffset === 0;
                      return (
                        <div key={dayOffset} className={cn("relative border-r border-border/10 last:border-r-0", isToday && "bg-rose-500/5") }>
                          <div className="sticky top-9 z-10 border-b border-border/10 bg-background/90 px-2 py-1 text-center backdrop-blur">
                            <p className={cn("text-[9px] font-mono uppercase tracking-widest", isToday ? "text-rose-500" : "text-muted-foreground")}>{date.toLocaleDateString(undefined, { weekday: "short" })}</p>
                            <p className={cn("text-[12px] font-semibold", isToday ? "text-rose-500" : "text-foreground")}>{date.getDate()}</p>
                          </div>

                          {isToday && (
                            <div className="absolute left-0 right-0 z-20 border-t border-rose-500 pointer-events-none" style={{ top: currentHr * pxPerHour }}>
                              <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                            </div>
                          )}

                          {hours.map((h) => (
                            <div key={`line-${dayOffset}-${h}`} className="h-18 border-b border-border/5" />
                          ))}

                          {renderBlocks.filter((block) => block.dayOffset === dayOffset).map((block) => {
                            const isSelected = (!block.readonlySource && calendarSelection?.kind === "schedule" && calendarSelection.id === block.id) || (block.readonlySource && calendarSelection?.kind === "task" && calendarSelection.taskId === block.taskId);
                            return (
                            <div
                              key={block.id}
                              onMouseDown={(e) => {
                                if (block.readonlySource || resizing) return;
                                e.preventDefault();
                                const container = scrollRef.current;
                                if (!container) return;
                                const rect = container.getBoundingClientRect();
                                const pointerHr = Math.max(0, Math.min(24, (e.clientY - rect.top + container.scrollTop) / pxPerHour));
                                setMoving({
                                  blockId: block.id,
                                  duration: Number((block.endHr - block.startHr).toFixed(2)),
                                  pointerOffset: pointerHr - block.startHr,
                                });
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (block.readonlySource && block.taskId) {
                                  setCalendarSelection({ kind: "task", taskId: block.taskId });
                                  return;
                                }
                                setCalendarSelection({ kind: "schedule", id: block.id });
                              }}
                              className={cn(
                                "group absolute left-1 right-1 border-l-4 px-2 py-1.5 shadow-sm transition-all duration-200",
                                calendarBlockColors[block.type],
                                isSelected && "ring-2 ring-indigo-500/50 shadow-md scale-[1.01] z-40",
                                !isSelected && "hover:scale-[1.01] hover:shadow z-20",
                                block.readonlySource && "cursor-pointer opacity-80 hover:opacity-100",
                                !block.readonlySource && "cursor-grab active:cursor-grabbing",
                              )}
                              style={{ top: block.startHr * pxPerHour, height: (block.endHr - block.startHr) * pxPerHour }}
                            >
                              {isSelected && (
                                <div className="absolute -top-7 right-0 flex items-center gap-1 rounded-md border border-border/40 bg-background/95 px-1 py-1 shadow-lg backdrop-blur z-50 pointer-events-auto cursor-default">
                                  {!block.readonlySource && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        duplicateSelectedSchedule();
                                      }}
                                      className="rounded p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                                      title="Duplicate"
                                    >
                                      <Zap className="h-3 w-3" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (block.readonlySource === "task" && block.taskId) {
                                        removeMilestoneTask(block.taskId);
                                        setCalendarBlocks((prev) => prev.filter((b) => b.taskId !== block.taskId));
                                        setCalendarSelection(null);
                                      } else {
                                        setCalendarBlocks((prev) => prev.filter((b) => b.id !== block.id));
                                        setCalendarSelection(null);
                                      }
                                    }}
                                    className="rounded p-1 text-rose-500/70 hover:bg-rose-500/20 hover:text-rose-500 transition-colors"
                                    title="Delete (Del)"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}

                              {!block.readonlySource && (
                                <>
                                  <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setResizing({ blockId: block.id, edge: "start" }); }} className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize" />
                                  <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setResizing({ blockId: block.id, edge: "end" }); }} className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize" />
                                </>
                              )}
                              <p className="truncate text-[10px] font-semibold text-foreground">{block.title}</p>
                              <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">{formatHourLabel(block.startHr)} - {formatHourLabel(block.endHr)}</p>
                              {block.readonlySource && <p className="text-[7px] font-mono uppercase tracking-widest text-emerald-500 mt-0.5">Task due block</p>}
                            </div>
                          )})}

                          {slots.map((slot, idx) => {
                            const inDrag = dragStart?.dayOffset === dayOffset && dragCurrentHour !== null;
                            const min = inDrag ? Math.min(dragStart!.hour, dragCurrentHour!) : null;
                            const max = inDrag ? Math.max(dragStart!.hour, dragCurrentHour!) : null;
                            const active = min !== null && max !== null && slot >= min && slot <= max;
                            return (
                              <div
                                key={`slot-${dayOffset}-${idx}`}
                                onMouseDown={(e) => { e.preventDefault(); beginDragSchedule(dayOffset, slot); }}
                                onMouseEnter={() => {
                                  if (dragStart?.dayOffset === dayOffset) {
                                    if (slot !== dragStart.hour) dragMovedRef.current = true;
                                    setDragCurrentHour(slot);
                                  }
                                }}
                                className={cn("absolute left-0 right-0 cursor-crosshair", active ? "bg-foreground/10" : "hover:bg-foreground/5")}
                                style={{ top: slot * pxPerHour, height: pxPerHour * 0.5 }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={cn(
                "flex min-h-0 flex-col bg-card/60 backdrop-blur-xl transition-all duration-700 shadow-2xl overflow-hidden",
                "border-l border-border/20 w-[340px]"
              )}>
                <SectionHead title={(selectedSchedule || selectedTask) ? "Editor" : "Overview"} icon={Layers} badge={<span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">{(selectedSchedule || selectedTask) ? "Active" : "Stats"}</span>} />
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide flex flex-col justify-between w-[340px]">
                  {selectedSchedule ? (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                      {/* Header Segment */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                           <Clock className="h-3 w-3" /> Scheduled Block
                        </div>
                        <input 
                          value={selectedSchedule.title} 
                          onChange={(e) => updateSelectedSchedule({ title: e.target.value })} 
                          placeholder="Block title" 
                          className="w-full bg-transparent text-base font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30 transition-all focus:bg-muted/10 p-1.5 -ml-1.5 rounded-lg border border-transparent focus:border-border/30" 
                        />
                      </div>

                      {/* Scheduling Grid */}
                      <div className="rounded-xl bg-muted/20 border border-border/20 p-3 space-y-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Date</span>
                          <div className="relative isolate">
                            <input 
                              type="date" 
                              value={dayValueFromOffset(selectedSchedule.dayOffset)} 
                              onChange={(e) => {
                                const d = new Date(`${e.target.value}T00:00:00`);
                                if (Number.isNaN(d.getTime())) return;
                                updateSelectedSchedule({ dayOffset: Math.round((d.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)) });
                              }}
                              className="flex h-[30px] w-full items-center justify-between text-foreground uppercase tracking-widest bg-background/50 hover:bg-background outline-none border border-border/30 pl-8 pr-2 rounded text-[11px] font-bold transition-colors cursor-pointer dark:opacity-90 dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0" 
                            />
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none -z-10" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div className="flex flex-col gap-1">
                            <span className="uppercase tracking-widest text-muted-foreground/70 font-mono">Start</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-[30px] w-full items-center justify-between bg-background/50 hover:bg-background outline-none border border-border/30 px-2 rounded text-xs font-medium transition-colors text-foreground">
                                <span>{formatHourLabel(selectedSchedule.startHr)}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="max-h-[220px] w-[140px] overflow-y-auto p-1 scrollbar-hide border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl z-50">
                                {slots.map((slot) => (
                                  <DropdownMenuItem 
                                    key={`s-${slot}`} 
                                    onClick={() => updateSelectedSchedule({ startHr: slot })}
                                    className={cn("text-xs py-1.5 px-2 cursor-pointer transition-colors focus:bg-indigo-500/10 focus:text-indigo-500", selectedSchedule.startHr === slot && "bg-indigo-500/10 text-indigo-500 font-bold")}
                                  >
                                    <Clock className={cn("mr-2 h-3 w-3", selectedSchedule.startHr === slot ? "opacity-100" : "opacity-30")} /> 
                                    {formatHourLabel(slot)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="uppercase tracking-widest text-muted-foreground/70 font-mono">End</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-[30px] w-full items-center justify-between bg-background/50 hover:bg-background outline-none border border-border/30 px-2 rounded text-xs font-medium transition-colors text-foreground">
                                <span>{formatHourLabel(selectedSchedule.endHr)}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-[220px] w-[140px] overflow-y-auto p-1 scrollbar-hide border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl z-50">
                                {slots.filter((slot) => slot > selectedSchedule.startHr).map((slot) => (
                                  <DropdownMenuItem 
                                    key={`e-${slot}`} 
                                    onClick={() => updateSelectedSchedule({ endHr: slot })}
                                    className={cn("text-xs py-1.5 px-2 cursor-pointer transition-colors focus:bg-indigo-500/10 focus:text-indigo-500", selectedSchedule.endHr === slot && "bg-indigo-500/10 text-indigo-500 font-bold")}
                                  >
                                    <Clock className={cn("mr-2 h-3 w-3", selectedSchedule.endHr === slot ? "opacity-100" : "opacity-30")} /> 
                                    {formatHourLabel(slot)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Type</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-[30px] w-full items-center justify-between bg-background/50 hover:bg-background outline-none border border-border/30 px-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors text-foreground">
                              <span>{selectedSchedule.type.replace("-", " ")}</span>
                              <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[140px] p-1 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl z-50">
                              {["deep-work", "meeting", "admin", "break"].map((type) => (
                                <DropdownMenuItem 
                                  key={type} 
                                  onClick={() => updateSelectedSchedule({ type: type as ScheduleBlock["type"] })}
                                  className={cn("text-[10px] font-bold uppercase tracking-widest py-2 px-2 cursor-pointer transition-colors focus:bg-indigo-500/10 focus:text-indigo-500", selectedSchedule.type === type && "bg-indigo-500/10 text-indigo-500")}
                                >
                                  {type.replace("-", " ")}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Project</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="flex h-[30px] w-full items-center justify-between bg-background/50 hover:bg-background outline-none border border-border/30 px-2.5 rounded text-[10px] uppercase font-bold tracking-widest transition-colors text-indigo-500 truncate">
                              <span className="truncate pr-2">{selectedSchedule.objectiveId ? projects.find(p => p.id === selectedSchedule.objectiveId)?.name : "No Project"}</span>
                              <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50 shrink-0" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[150px] p-1 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl z-50">
                              <DropdownMenuItem 
                                onClick={() => updateSelectedSchedule({ objectiveId: null, taskId: null })}
                                className={cn("text-[10px] uppercase font-bold tracking-widest py-2 px-2 cursor-pointer transition-colors focus:bg-indigo-500/10 focus:text-indigo-500", !selectedSchedule.objectiveId && "bg-indigo-500/10 text-indigo-500")}
                              >
                                No Project
                              </DropdownMenuItem>
                              {projects.map((proj) => (
                                <DropdownMenuItem 
                                  key={proj.id} 
                                  onClick={() => updateSelectedSchedule({ objectiveId: proj.id, taskId: null })}
                                  className={cn("text-[10px] uppercase font-bold tracking-widest py-2 px-2 cursor-pointer transition-colors focus:bg-indigo-500/10 focus:text-indigo-500 truncate", selectedSchedule.objectiveId === proj.id && "bg-indigo-500/10 text-indigo-500")}
                                >
                                  {proj.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-auto pt-3 border-t border-border/10 grid grid-cols-2 gap-2">
                        <button
                          onClick={duplicateSelectedSchedule}
                          className="group flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-muted/20 py-2.5 text-[10px] font-semibold text-foreground hover:bg-muted/40 hover:shadow-sm transition-all uppercase tracking-widest"
                        >
                          <Zap className="h-3 w-3 text-muted-foreground group-hover:text-amber-500 transition-colors" /> Duplicate
                        </button>
                        <button
                          onClick={() => {
                            if (selectedSchedule.taskId) return;
                            const newTaskId = addTask(selectedSchedule.title, "todo", {
                              objectiveId: selectedSchedule.objectiveId ?? null,
                              dueDate: dayValueFromOffset(selectedSchedule.dayOffset),
                            });
                            updateSelectedSchedule({ taskId: newTaskId });
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-lg border py-2.5 text-[10px] uppercase tracking-widest font-semibold transition-all",
                            selectedSchedule.taskId ? "opacity-50 pointer-events-none border-border/30 bg-muted/10 text-muted-foreground" : "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-1.5"><Plus className="h-3 w-3" /> Taskify</div>
                        </button>
                        <button onClick={deleteSelectedSchedule} className="col-span-2 group flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 py-2.5 text-[10px] uppercase tracking-widest font-semibold hover:bg-rose-500/10 hover:shadow-sm transition-all focus:ring-2 focus:ring-rose-500/40">
                          <Trash2 className="h-3 w-3 group-hover:scale-110 transition-transform" /> Delete Block
                        </button>
                      </div>
                    </div>
                  ) : selectedTask ? (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                      {/* Header Segment */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          <span className="flex items-center gap-2"><Timer className="h-3 w-3" /> Task Due Block</span>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold">
                            {selectedTaskBlock ? `${formatHourLabel(selectedTaskBlock.startHr)} - ${formatHourLabel(selectedTaskBlock.endHr)}` : "All Day"}
                          </span>
                        </div>
                        <input
                          value={selectedTask.title}
                          onChange={(e) => updateTask(selectedTask.id, { title: e.target.value })}
                          placeholder="Task title"
                          className="w-full bg-transparent text-base font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/30 transition-all focus:bg-muted/10 p-1.5 -ml-1.5 rounded-lg border border-transparent focus:border-border/30"
                        />
                        <textarea
                          value={selectedTask.description ?? ""}
                          onChange={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                          rows={2}
                          placeholder="Add notes..."
                          className="w-full resize-none bg-transparent text-[11px] leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/30 transition-all focus:bg-muted/10 p-1.5 -ml-1.5 rounded-lg border border-transparent focus:border-border/30"
                        />
                      </div>

                      {/* Properties Grid */}
                      <div className="rounded-xl bg-muted/20 border border-border/20 p-3 space-y-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Due Date</span>
                          <div className="relative isolate">
                            <input
                              type="date"
                              value={selectedTask.dueDate ?? ""}
                              onChange={(e) => updateTask(selectedTask.id, { dueDate: e.target.value })}
                              className="flex h-[30px] w-full items-center justify-between text-foreground uppercase tracking-widest bg-background/50 hover:bg-background outline-none border border-border/30 pl-8 pr-2 rounded text-[11px] font-bold transition-colors cursor-pointer dark:opacity-90 dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none -z-10" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div className="flex flex-col gap-1">
                            <span className="uppercase tracking-widest text-muted-foreground/70 font-mono">Status</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-[30px] w-full items-center justify-between bg-background/50 hover:bg-background outline-none border border-border/30 px-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors text-foreground">
                                <span>{columns.find(c => c.key === selectedTask.status)?.label ?? selectedTask.status}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-[140px] p-1 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl z-50">
                                {columns.map((column) => (
                                  <DropdownMenuItem 
                                    key={column.key} 
                                    onClick={() => updateTask(selectedTask.id, { status: column.key })}
                                    className={cn("text-[10px] font-bold uppercase tracking-widest py-2 px-2 cursor-pointer transition-colors focus:bg-emerald-500/10 focus:text-emerald-500", selectedTask.status === column.key && "bg-emerald-500/10 text-emerald-500")}
                                  >
                                    {column.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="uppercase tracking-widest text-muted-foreground/70 font-mono">Priority</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-[30px] w-full items-center justify-between bg-background/50 hover:bg-background outline-none border border-border/30 px-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors text-foreground">
                                <span>{priorityLabel[selectedTask.priority] ?? selectedTask.priority}</span>
                                <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[120px] p-1 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl z-50">
                                {priorities.map((priority) => (
                                  <DropdownMenuItem 
                                    key={priority} 
                                    onClick={() => updateTask(selectedTask.id, { priority: priority as Priority })}
                                    className={cn("text-[10px] font-bold uppercase tracking-widest py-2 px-2 cursor-pointer transition-colors focus:bg-emerald-500/10 focus:text-emerald-500", selectedTask.priority === priority && "bg-emerald-500/10 text-emerald-500")}
                                  >
                                    {priorityLabel[priority]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Project</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex h-[32px] w-full items-center justify-between bg-background/50 hover:bg-background outline-none border border-border/30 px-3 rounded-lg text-xs uppercase font-bold tracking-widest transition-colors text-emerald-600 dark:text-emerald-400 truncate">
                            <span className="truncate pr-2">{selectedTask.projectId ? projects.find(p => p.id === selectedTask.projectId)?.name : "No Project"}</span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground opacity-50 shrink-0" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[200px] p-1 border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-xl z-50">
                            <DropdownMenuItem 
                              onClick={() => updateTask(selectedTask.id, { projectId: null, objectiveId: null })}
                              className={cn("text-[10px] uppercase font-bold tracking-widest py-2 px-2 cursor-pointer transition-colors focus:bg-emerald-500/10 focus:text-emerald-500", !selectedTask.projectId && "bg-emerald-500/10 text-emerald-500")}
                            >
                              No Project
                            </DropdownMenuItem>
                            {projects.map((proj) => (
                              <DropdownMenuItem 
                                key={proj.id} 
                                onClick={() => linkTaskToObjective(selectedTask.id, proj.id)}
                                className={cn("text-[10px] uppercase font-bold tracking-widest py-2 px-2 cursor-pointer transition-colors focus:bg-emerald-500/10 focus:text-emerald-500 truncate", selectedTask.projectId === proj.id && "bg-emerald-500/10 text-emerald-500")}
                              >
                                {proj.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-auto pt-3 border-t border-border/10 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setView("list");
                            setHighlightedTaskId(selectedTask.id);
                          }}
                          className="group flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-muted/20 py-2.5 text-[10px] font-semibold text-foreground hover:bg-muted/40 hover:shadow-sm transition-all uppercase tracking-widest"
                        >
                          <Columns3 className="h-3 w-3 text-muted-foreground group-hover:text-indigo-400 transition-colors" /> In List
                        </button>
                        <button
                          onClick={createScheduleFromSelectedTask}
                          className="group flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 py-2.5 text-[10px] font-semibold hover:bg-indigo-500/20 hover:shadow-sm transition-all uppercase tracking-widest"
                        >
                          <Clock className="h-3 w-3 group-hover:scale-110 transition-transform" /> Schedule it
                        </button>
                        <button
                          onClick={deleteSelectedTask}
                          className="col-span-2 group flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 py-2.5 text-[10px] font-semibold hover:bg-rose-500/10 hover:shadow-sm transition-all focus:ring-2 focus:ring-rose-500/40 uppercase tracking-widest"
                        >
                          <Trash2 className="h-3 w-3 group-hover:scale-110 transition-transform" /> Delete task
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-700">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 mb-2 border-b border-border/20 pb-2">Status Overview</div>
                      
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/10 p-3">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Done</span>
                          <span className="text-lg font-bold tabular-nums">{tasks.filter(t => t.status === "done").length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/10 p-3">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-indigo-500" /> In Progress</span>
                          <span className="text-lg font-bold tabular-nums">{tasks.filter(t => t.status === "in-progress").length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/10 p-3">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-amber-500" /> In Review</span>
                          <span className="text-lg font-bold tabular-nums">{tasks.filter(t => t.status === "review").length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/10 p-3">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4 text-rose-500" /> Backlog</span>
                          <span className="text-lg font-bold tabular-nums">{tasks.filter(t => t.status === "backlog").length}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/20 bg-muted/10 p-3">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-2"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /> Todo</span>
                          <span className="text-lg font-bold tabular-nums">{tasks.filter(t => t.status === "todo").length}</span>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-col items-center justify-center opacity-50 p-4 text-center">
                        <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest leading-relaxed">
                          Click on a block to edit<br/>or drag to create
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid shrink-0 grid-cols-[2fr_1.2fr_0.9fr_1.2fr_1.2fr_0.9fr_40px] items-center gap-2 border-b border-border/20 px-4 py-2 text-[8px] uppercase tracking-widest text-muted-foreground font-mono">
                <span>Task</span>
                <span>Project</span>
                <span>Priority</span>
                <span>Due</span>
                <span>Assignee</span>
                <span>Status</span>
                <span></span>
              </div>

              {filtered.map((task) => {
                const project = task.projectId ? projectById[task.projectId] : null;
                const isMenuOpen = openTaskMenuId === task.id;
                return (
                  <div
                    key={task.id}
                    id={`pro-task-${task.id}`}
                    className={cn(
                      "relative border-b border-border/10 px-4 py-2.5 text-[10px] transition-colors hover:bg-muted/10",
                      isMenuOpen && "bg-foreground/3",
                      highlightedTaskId === task.id && "bg-indigo-500/5 ring-1 ring-indigo-500/40",
                    )}
                  >
                    <div className="grid grid-cols-[2fr_1.2fr_0.9fr_1.2fr_1.2fr_0.9fr_40px] items-center gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-foreground">{task.title}</p>
                        {task.description && <p className="truncate text-[9px] text-muted-foreground">{task.description}</p>}
                      </div>
                      <span className="truncate text-[9px] text-muted-foreground font-mono">{project?.name ?? "No project"}</span>
                      <span className={cn("text-[8px] uppercase tracking-widest font-mono", priorityPill[task.priority])}>{priorityLabel[task.priority]}</span>
                      <span className={cn("text-[9px] text-muted-foreground font-mono", isOverdue(task.dueDate) && task.status !== "done" && "text-rose-500/80")}>{formatDate(task.dueDate)}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">{task.assignee?.trim() ? task.assignee : "Unassigned"}</span>
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{columns.find((column) => column.key === task.status)?.label ?? task.status}</span>
                      
                      <DropdownMenu open={isMenuOpen} onOpenChange={(open) => {
                        setOpenTaskMenuId(open ? task.id : null);
                      }}>
                        <DropdownMenuTrigger className="p-0.5 text-muted-foreground transition-colors hover:text-foreground data-popup-open:text-foreground">
                          <MoreHorizontal className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        
                          <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="w-48 p-1 font-mono">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-[10px] uppercase tracking-widest text-muted-foreground">Move</DropdownMenuSubTrigger>
                              
                                <DropdownMenuSubContent className="p-1 font-mono">
                                  {columns.map((st) => (
                                    <DropdownMenuItem
                                      key={st.key}
                                      onClick={() => moveTask(task.id, st.key)}
                                      className={cn("flex items-center justify-between text-[9px] uppercase tracking-widest", task.status === st.key ? "text-foreground" : "text-muted-foreground")}
                                    >
                                      {st.label}
                                      {task.status === st.key && <span>✓</span>}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              
                            </DropdownMenuSub>

                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-[10px] uppercase tracking-widest text-muted-foreground">Priority</DropdownMenuSubTrigger>
                              
                                <DropdownMenuSubContent className="p-1 font-mono">
                                  {priorities.map((p) => (
                                    <DropdownMenuItem
                                      key={p}
                                      onClick={() => updateTask(task.id, { priority: p })}
                                      className={cn("flex items-center justify-between text-[9px] uppercase tracking-widest", task.priority === p ? "text-foreground" : "text-muted-foreground")}
                                    >
                                      {priorityLabel[p]}
                                      {task.priority === p && <span>✓</span>}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              
                            </DropdownMenuSub>

                            {!task.objectiveId && objectives.length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-[10px] uppercase tracking-widest text-muted-foreground">Link Project</DropdownMenuSubTrigger>
                                
                                  <DropdownMenuSubContent className="max-h-75 overflow-y-auto p-1 font-mono">
                                    {objectives.map((obj) => (
                                      <DropdownMenuItem
                                        key={obj.id}
                                        onClick={() => linkTaskToObjective(task.id, obj.id)}
                                        className="flex flex-col items-start gap-0.5 text-[9px] uppercase tracking-widest text-muted-foreground"
                                      >
                                        <span className="truncate">{obj.title}</span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                
                              </DropdownMenuSub>
                            )}

                            <DropdownMenuSeparator className="my-1 bg-border/20" />
                            
                            <div className="px-2 py-1.5">
                              <label className="mb-1 block text-[9px] uppercase tracking-widest text-muted-foreground/80">Due date</label>
                              <input
                                type="date"
                                value={task.dueDate ?? ""}
                                onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                                className="w-full border border-border/30 bg-transparent px-1.5 py-1 text-[9px] uppercase tracking-widest text-muted-foreground outline-none font-mono"
                              />
                            </div>

                            <div className="px-2 py-1.5">
                              <label className="mb-1 block text-[9px] uppercase tracking-widest text-muted-foreground/80">Assignee</label>
                              <input
                                value={task.assignee ?? ""}
                                onChange={(e) => updateTask(task.id, { assignee: e.target.value })}
                                placeholder="Unassigned..."
                                className="w-full border border-border/30 bg-transparent px-1.5 py-1 text-[9px] uppercase tracking-widest text-muted-foreground outline-none placeholder:text-muted-foreground/45 font-mono"
                              />
                            </div>

                            <DropdownMenuSeparator className="my-1 bg-border/20" />

                            <DropdownMenuItem
                              onClick={() => removeMilestoneTask(task.id)}
                              className="text-[10px] uppercase tracking-widest text-rose-500/90 focus:bg-rose-500/10 focus:text-rose-500"
                            >
                              Remove Task
                            </DropdownMenuItem>

                          </DropdownMenuContent>
                        
                      </DropdownMenu>

                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setAddingTask("backlog")}
                className="flex w-full shrink-0 items-center gap-1.5 border-t border-border/10 px-4 py-2.5 text-[9px] uppercase tracking-widest text-muted-foreground transition-colors font-mono hover:bg-muted/15 hover:text-foreground"
              >
                <Plus className="h-2.5 w-2.5 stroke-2" /> Add Task
              </button>
              {addingTask === "backlog" && view === "list" && (
                <InlineInput placeholder="Task title..." onSubmit={(value) => addTask(value, "backlog")} onCancel={() => setAddingTask(null)} />
              )}
            </div>
          )}
        </div>

        <div className={cn(
          "flex min-h-0 flex-col gap-4 overflow-hidden transition-all duration-500",
          view === "calendar" && "hidden",
        )}>
          <div className="flex shrink-0 flex-col border border-border/30 bg-background/60 backdrop-blur-sm">
            <SectionHead title="Pipeline" icon={Layers} />
            <div className="flex gap-1 px-4 py-3">
              {columns.map((column, i) => {
                const count = tasks.filter((task) => task.status === column.key).length;
                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col gap-1.5" style={{ width: `${pct}%`, minWidth: count > 0 ? "12px" : "0" }}>
                    <div className={cn("h-1.5 w-full bg-border/40", count > 0 && "bg-foreground/50")} />
                    {count > 0 && <span className="truncate text-[8px] text-muted-foreground font-mono" title={`${column.label}: ${count}`}>{count}</span>}
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-border/20 bg-border/20">
              {columns.slice(1).map((column) => {
                const count = tasks.filter((task) => task.status === column.key).length;
                return (
                  <div key={column.key} className="flex items-center justify-between bg-background/80 px-3 py-2">
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-mono">{column.label}</span>
                    <span className="text-[9px] font-bold text-foreground font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/30 bg-background/60 backdrop-blur-sm">
            <SectionHead
              title="Critical Focus"
              icon={AlertCircle}
              badge={<span className="text-[9px] font-bold text-rose-500/65 font-mono">{tasks.filter((task) => task.priority === "critical" && task.status !== "done").length}</span>}
            />
            <div className="min-h-0 flex-1 overflow-y-auto py-1 scrollbar-hide">
              {tasks
                .filter((task) => task.priority === "critical" && task.status !== "done")
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex cursor-pointer flex-col gap-1 border-b border-border/10 px-4 py-2 transition-colors last:border-0 hover:bg-muted/10"
                    onClick={() => setFilterProject(task.projectId ?? null)}
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500" />
                      <span className="text-[10px] font-semibold leading-snug text-foreground">{task.title}</span>
                    </div>
                    <span className="ml-3 text-[8px] uppercase tracking-widest text-muted-foreground/65 font-mono">
                      {task.projectId ? projectById[task.projectId]?.name ?? "No project" : "No project"}
                    </span>
                  </div>
                ))}
              {tasks.filter((task) => task.priority === "critical" && task.status !== "done").length === 0 && (
                <div className="px-4 py-6 text-center text-[9px] text-muted-foreground font-mono">No critical focus items</div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col border border-border/30 bg-background/60 backdrop-blur-sm">
            <SectionHead
              title="Weekly Output"
              icon={Timer}
              badge={<span className="text-[9px] font-bold text-emerald-500/80 tabular-nums font-mono">{weeklyDoneTotal} done</span>}
            />
            <div className="px-4 py-2 text-[8px] uppercase tracking-widest text-muted-foreground font-mono border-b border-border/10">
              Today {todayDone} · Peak {bestDay?.label ?? "-"} {bestDay?.done ?? 0}
            </div>
            <div className="flex h-16 items-end justify-between gap-1 px-4 py-3">
              {weeklyOutput.map((day, i) => (
                <div key={i} className="group flex flex-1 flex-col items-center gap-1.5" title={`${day.done} completed`}>
                  <div className="relative flex w-full flex-1 items-end bg-border/20">
                    <div className="w-full bg-foreground/20 transition-colors group-hover:bg-foreground/40" style={{ height: `${Math.max(6, (day.done / maxDailyDone) * 100)}%` }} />
                  </div>
                  <span className="text-[8px] text-muted-foreground font-mono">{day.label.charAt(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
