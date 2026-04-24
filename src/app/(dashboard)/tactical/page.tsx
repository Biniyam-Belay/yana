import { redirect } from "next/navigation";

export default function TacticalPage() {
  redirect("/professional?view=calendar");
  return null;
}

/*

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, redirect } from "next/navigation";
import {
  ListChecks, Clock, Grid3X3, Plus, Trash2, CheckCircle2, Circle,
  X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Inbox,
  MoreHorizontal, Command, Check, Target, Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  TacticalMatrixItemRow,
  TacticalCommandRow,
  TacticalBlockRow,
  TacticalInboxItemRow,
  ProfessionalTaskRow,
} from "@/lib/supabase/types";

// ─── TYPES ───
type Quadrant = "q1" | "q2" | "q3" | "q4";
type CalendarView = "day" | "3day" | "week" | "month" | "year";

interface MatrixItem {
  id: string;
  quadrant: Quadrant;
  title: string;
  done: boolean;
}

interface CommandItem {
  id: string;
  title: string;
  done: boolean;
  timeEstimate?: number;
  objectiveId?: string; // linked north star objective
}

interface TimeBlock {
  id: string;
  dayOffset: number; // 0 = today, 1 = tomorrow, etc.
  startHr: number; 
  endHr: number; 
  title: string;
  type: "deep-work" | "meeting" | "admin" | "break";
}

interface InboxItem {
  id: string;
  title: string;
}

interface ExternalCalendarTask {
  id: string;
  sourceTaskId: string;
  title: string;
  source: "north-star" | "professional";
  dayOffset: number;
  done: boolean;
  objectiveId?: string | null;
}

interface CalendarRenderBlock extends TimeBlock {
  isExternal: boolean;
  source?: "north-star" | "professional";
  done?: boolean;
  sourceTaskId?: string;
  objectiveId?: string | null;
}

type ResizeState = {
  blockId: string;
  edge: "start" | "end";
};

interface ProfessionalOverlayTask {
  id: string;
  title: string;
  status: "backlog" | "todo" | "in-progress" | "review" | "done";
  dueDate: string | null;
  objectiveId?: string | null;
  sortOrder?: number;
  updatedAt?: string;
}

const PROF_TASK_KEY = "yana_professional_tasks";

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2, 11));

const quadColors = {
  q1: { bg: "bg-rose-500/10", border: "border-rose-500/20", label: "text-rose-500/80" },
  q2: { bg: "bg-amber-500/10", border: "border-amber-500/20", label: "text-amber-500/80" },
  q3: { bg: "bg-blue-500/10", border: "border-blue-500/20", label: "text-blue-500/80" },
  q4: { bg: "bg-muted/10", border: "border-border/20", label: "text-muted-foreground/60" },
};

const blockColors = {
  "deep-work": "bg-indigo-500/20 border-indigo-500/30 text-indigo-500",
  "meeting": "bg-amber-500/20 border-amber-500/30 text-amber-500",
  "admin": "bg-emerald-500/20 border-emerald-500/30 text-emerald-500",
  "break": "bg-muted border-border/40 text-muted-foreground",
};

const formatHourLabel = (hour: number) => {
  const safe = Math.max(0, Math.min(24, Number(hour.toFixed(2))));
  const h = Math.floor(safe);
  const m = Math.round((safe - h) * 60);
  const labelHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${labelHour}:${m.toString().padStart(2, "0")} ${suffix}`;
};

const clampHour = (hour: number) => Math.max(0, Math.min(24, hour));

const snapToSlot = (hour: number, slotSize: number) =>
  Number((Math.round(hour / slotSize) * slotSize).toFixed(2));

const buildTaskFingerprint = (title: string, dayOffset: number, objectiveId?: string | null) =>
  `${objectiveId ?? "none"}::${dayOffset}::${title.trim().toLowerCase()}`;

const normalizeProfessionalTask = (
  task: Partial<ProfessionalTaskRow> & {
    id: string;
    title: string;
    status: ProfessionalOverlayTask["status"];
    dueDate?: string | null;
    due_date?: string | null;
    objectiveId?: string | null;
    objective_id?: string | null;
    sortOrder?: number;
    sort_order?: number;
    updatedAt?: string;
    updated_at?: string;
  },
): ProfessionalOverlayTask => ({
  id: task.id,
  title: task.title,
  status: task.status,
  dueDate: task.due_date ?? task.dueDate ?? null,
  objectiveId: task.objective_id ?? task.objectiveId ?? null,
  sortOrder: task.sort_order ?? task.sortOrder,
  updatedAt: task.updated_at ?? task.updatedAt,
});

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
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 truncate max-w-[160px]">{topObjective.title}</span>
            <div className="w-16 h-1 bg-border/20">
              <div className="h-full bg-foreground/40 transition-all duration-500" style={{ width: `${topObjective.progress}%` }} />
            </div>
            <span className="text-[9px] font-mono text-foreground tabular-nums">{topObjective.progress}%</span>
          </div>
        )}
        <div className="flex items-center gap-2 border-l border-border/20 pl-4">
          <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Avg</span>
          <span className="text-[11px] font-mono font-bold text-foreground tabular-nums">{avgProgress}%</span>
        </div>
      </div>
    </div>
  );
}

function MatrixModal({ matrix, setMatrix, onClose, onPush }: { matrix: MatrixItem[]; setMatrix: any; onClose: () => void; onPush: (title: string) => void }) {
  const [addingQuad, setAddingQuad] = useState<Quadrant | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200">
      <div className="bg-background flex flex-col w-full h-full max-w-[1200px] max-h-[85vh] rounded-none border border-border/40 shadow-2xl overflow-hidden ring-1 ring-border/10">
        <div className="shrink-0 px-6 py-4 border-b border-border/20 bg-muted/5 flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-semibold">Priority Matrix</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground rounded-none transition-colors border border-transparent"><X className="h-4 w-4 stroke-[1.5]" /></button>
        </div>
        <div className="flex-1 min-h-0 p-4 grid grid-cols-2 grid-rows-2 gap-px bg-border/20">
          {([
            { key: "q1", title: "Do First" },
            { key: "q2", title: "Schedule" },
            { key: "q3", title: "Delegate" },
            { key: "q4", title: "Eliminate" },
          ] as const).map((quad) => (
            <div key={quad.key} className="flex flex-col bg-background min-h-0 border border-border/10">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-foreground">{quad.title}</span>
                <button onClick={() => setAddingQuad(quad.key as Quadrant)} className="p-1 text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 stroke-[2]" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {matrix.filter((m) => m.quadrant === quad.key).map((item) => (
                  <div key={item.id} className="group flex items-center gap-2 p-2 border border-border/20 bg-muted/10">
                    <button onClick={() => setMatrix((prev: MatrixItem[]) => prev.map(m => m.id === item.id ? { ...m, done: !m.done } : m))}>
                      {item.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <span className={cn("text-[11px] flex-1", item.done ? "line-through text-muted-foreground/50" : "text-foreground")}>{item.title}</span>
                    <button onClick={() => { onPush(item.title); setMatrix((prev: MatrixItem[]) => prev.filter(m => m.id !== item.id)); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-emerald-500"><Command className="h-3 w-3" /></button>
                    <button onClick={() => setMatrix((prev: MatrixItem[]) => prev.filter(m => m.id !== item.id))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                {addingQuad === quad.key && (
                  <InlineInput placeholder="Classification..." onSubmit={v => { setMatrix((prev: MatrixItem[]) => [...prev, { id: uid(), title: v, done: false, quadrant: quad.key as Quadrant }]); setAddingQuad(null); }} onCancel={() => setAddingQuad(null)} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TacticalPage() {
  redirect("/professional?view=calendar");
  const router = useRouter();
  const { northStar, objectives, avgProgress, setObjectives } = useNorthStar();
  const [focusedObjId, setFocusedObjId] = useState<string | null>(null);
  const focusedObj = objectives.find(o => o.id === focusedObjId) ?? null;

  const [matrix, setMatrix] = useState<MatrixItem[]>([]);
  const [matrixOpen, setMatrixOpen] = useState(false);
  
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [addingCmd, setAddingCmd] = useState(false);

  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [professionalOverlayTasks, setProfessionalOverlayTasks] = useState<ProfessionalOverlayTask[]>([]);
  const [addingInbox, setAddingInbox] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);

  const loadProfessionalTasksFromLocal = useCallback(() => {
    const sProf = localStorage.getItem(PROF_TASK_KEY);
    if (!sProf) {
      setProfessionalOverlayTasks([]);
      return;
    }

    try {
      const parsed = JSON.parse(sProf) as Array<{
        id: string;
        title: string;
        status: ProfessionalOverlayTask["status"];
        dueDate?: string | null;
        objectiveId?: string | null;
        sortOrder?: number;
        updatedAt?: string;
      }>;
      setProfessionalOverlayTasks(parsed.map((task) => normalizeProfessionalTask(task)));
    } catch {
      setProfessionalOverlayTasks([]);
    }
  }, []);

  const loadProfessionalTasksFromDb = useCallback(async () => {
    if (!supabaseRef.current || !supabaseUserId) return;
    const { data, error } = await supabaseRef.current
      .from("professional_tasks")
      .select("id, title, status, due_date, objective_id, sort_order, updated_at")
      .eq("user_id", supabaseUserId)
      .order("sort_order", { ascending: true });
    if (error || !data) return;
    const rows = data as Pick<ProfessionalTaskRow, "id" | "title" | "status" | "due_date" | "objective_id" | "sort_order" | "updated_at">[];
    setProfessionalOverlayTasks(rows.map((row) => normalizeProfessionalTask(row)));
  }, [supabaseUserId]);

  // Supabase initialization (optional)
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

  // Hydrate from Supabase or localStorage
  useEffect(() => {
    if (supabaseUserId && supabaseRef.current) {
      const supabase = supabaseRef.current;
      Promise.all([
        supabase
          .from("tactical_matrix_items")
          .select("*")
          .eq("user_id", supabaseUserId)
          .order("created_at", { ascending: true }),
        supabase
          .from("tactical_commands")
          .select("*")
          .eq("user_id", supabaseUserId)
          .order("created_at", { ascending: true }),
        supabase
          .from("tactical_blocks")
          .select("*")
          .eq("user_id", supabaseUserId)
          .order("day_offset", { ascending: true }),
        supabase
          .from("tactical_inbox_items")
          .select("*")
          .eq("user_id", supabaseUserId)
          .order("created_at", { ascending: true }),
      ]).then(([matrixRes, commandRes, blockRes, inboxRes]) => {
        const matrixRows = (matrixRes.data ?? []) as TacticalMatrixItemRow[];
        const commandRows = (commandRes.data ?? []) as TacticalCommandRow[];
        const blockRows = (blockRes.data ?? []) as TacticalBlockRow[];
        const inboxRows = (inboxRes.data ?? []) as TacticalInboxItemRow[];

        if (matrixRows.length > 0) {
          setMatrix(matrixRows.map((row) => ({
            id: row.id,
            quadrant: row.quadrant,
            title: row.title,
            done: row.done,
          })));
        }

        if (commandRows.length > 0) {
          setCommands(commandRows.map((row) => ({
            id: row.id,
            title: row.title,
            done: row.done,
            timeEstimate: row.time_estimate ?? undefined,
            objectiveId: row.objective_id ?? undefined,
          })));
        }

        if (blockRows.length > 0) {
          setBlocks(blockRows.map((row) => ({
            id: row.id,
            dayOffset: row.day_offset,
            startHr: row.start_hr,
            endHr: row.end_hr,
            title: row.title,
            type: row.type,
          })));
        }

        if (inboxRows.length > 0) {
          setInbox(inboxRows.map((row) => ({
            id: row.id,
            title: row.title,
          })));
        }

        setIsReady(true);
      });
      return;
    }

    const sMat = localStorage.getItem('yana_tac_matrix');
    const sCmd = localStorage.getItem('yana_tac_commands');
    const sBlk = localStorage.getItem('yana_tac_blocks');
    const sInb = localStorage.getItem('yana_tac_inbox');

    if (sMat) setMatrix(JSON.parse(sMat));
    if (sCmd) setCommands(JSON.parse(sCmd));
    if (sBlk) setBlocks(JSON.parse(sBlk));
    if (sInb) setInbox(JSON.parse(sInb));

    loadProfessionalTasksFromLocal();

    setIsReady(true);
  }, [supabaseUserId, loadProfessionalTasksFromLocal]);

  useEffect(() => {
    if (!supabaseUserId || !supabaseRef.current) return;
    void loadProfessionalTasksFromDb();
  }, [supabaseUserId, loadProfessionalTasksFromDb]);

  useEffect(() => {
    if (supabaseUserId || typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key === PROF_TASK_KEY) {
        loadProfessionalTasksFromLocal();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [supabaseUserId, loadProfessionalTasksFromLocal]);

  useEffect(() => {
    if (!supabaseUserId || !supabaseRef.current) return;
    const channel = supabaseRef.current
      .channel(`professional-tasks-${supabaseUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "professional_tasks",
          filter: `user_id=eq.${supabaseUserId}`,
        },
        () => {
          void loadProfessionalTasksFromDb();
        },
      )
      .subscribe();

    return () => {
      void supabaseRef.current?.removeChannel(channel);
    };
  }, [supabaseUserId, loadProfessionalTasksFromDb]);

  // Sync back to Supabase or localStorage
  useEffect(() => {
    if (!isReady) return;
    if (!supabaseUserId || !supabaseRef.current) {
      localStorage.setItem('yana_tac_matrix', JSON.stringify(matrix));
      localStorage.setItem('yana_tac_commands', JSON.stringify(commands));
      localStorage.setItem('yana_tac_blocks', JSON.stringify(blocks));
      localStorage.setItem('yana_tac_inbox', JSON.stringify(inbox));
      return;
    }

    const supabase = supabaseRef.current;

    const sync = async () => {
      if (matrix.length > 0) {
        await supabase
          .from("tactical_matrix_items")
          .upsert(matrix.map((item) => ({
            id: item.id,
            user_id: supabaseUserId,
            quadrant: item.quadrant,
            title: item.title,
            done: item.done,
          })));
      }

      if (commands.length > 0) {
        await supabase
          .from("tactical_commands")
          .upsert(commands.map((cmd) => ({
            id: cmd.id,
            user_id: supabaseUserId,
            title: cmd.title,
            done: cmd.done,
            time_estimate: cmd.timeEstimate ?? null,
            objective_id: cmd.objectiveId ?? null,
          })));
      }

      if (blocks.length > 0) {
        await supabase
          .from("tactical_blocks")
          .upsert(blocks.map((block) => ({
            id: block.id,
            user_id: supabaseUserId,
            day_offset: block.dayOffset,
            start_hr: block.startHr,
            end_hr: block.endHr,
            title: block.title,
            type: block.type,
          })));
      }

      if (inbox.length > 0) {
        await supabase
          .from("tactical_inbox_items")
          .upsert(inbox.map((item, index) => ({
            id: item.id,
            user_id: supabaseUserId,
            title: item.title,
            sort_order: index,
          })));
      }
    };

    void sync();
  }, [matrix, commands, blocks, inbox, isReady, supabaseUserId]);

  const [view, setView] = useState<CalendarView>("3day");
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [dragStart, setDragStart] = useState<{ dayOffset: number; hour: number } | null>(null);
  const [dragCurrentHour, setDragCurrentHour] = useState<number | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const dragMovedRef = useRef(false);

  // Keyboard Shortcuts for Views (Ctrl/Cmd + 1,2,3,4,5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch(e.key) {
          case "1": e.preventDefault(); setView("day"); break;
          case "2": e.preventDefault(); setView("3day"); break;
          case "3": e.preventDefault(); setView("week"); break;
          case "4": e.preventDefault(); setView("month"); break;
          case "5": e.preventDefault(); setView("year"); break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Timeblocks Configuration
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23
  const pxPerHour = 80;
  const slotSize = 0.5;
  const slots = Array.from({ length: 24 / slotSize }, (_, i) => Number((i * slotSize).toFixed(2)));
  const durationOptions = useMemo(
    () => Array.from({ length: 16 }, (_, i) => Number(((i + 1) * slotSize).toFixed(2))),
    [slotSize],
  );

  const totalMatrixDone = matrix.filter(m => m.done).length;
  const totalCmdDone = commands.filter(c => c.done).length;
  const deepWorkHrs = blocks.filter(b => b.type === "deep-work").reduce((s, b) => s + (b.endHr - b.startHr), 0);

  const monthSummary = useMemo(() => {
    const totalBlocks = blocks.length;
    const deepBlocks = blocks.filter((b) => b.type === "deep-work").length;
    return {
      totalBlocks,
      deepBlocks,
      totalHours: blocks.reduce((s, b) => s + (b.endHr - b.startHr), 0),
    };
  }, [blocks]);

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dateKeyForOffset = useCallback(
    (offset: number) => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    },
    [startOfToday],
  );

  const dateValueFromOffset = useCallback(
    (offset: number) => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    },
    [startOfToday],
  );

  const offsetFromDateValue = useCallback(
    (value: string) => {
      const d = new Date(`${value}T00:00:00`);
      if (Number.isNaN(d.getTime())) return 0;
      const diffMs = d.getTime() - startOfToday.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    },
    [startOfToday],
  );

  const dayOffsetFromDate = (rawDate: string | null | undefined) => {
    if (!rawDate) return null;
    const d = new Date(`${rawDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const diffMs = d.getTime() - startOfToday.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  };

  const externalCalendarTasks = useMemo<ExternalCalendarTask[]>(() => {
    const nsTasks: ExternalCalendarTask[] = objectives.flatMap((objective) =>
      objective.keyResults
        .map((kr) => {
          const offset = dayOffsetFromDate(kr.dueDate ?? null);
          if (offset === null) return null;
          return {
            id: `ns-${kr.id}`,
            sourceTaskId: kr.id,
            title: kr.title,
            source: "north-star" as const,
            dayOffset: offset,
            done: kr.progress >= 100,
            objectiveId: objective.id,
          } satisfies ExternalCalendarTask;
        })
        .filter(Boolean) as ExternalCalendarTask[],
    );

    const professionalTasks: ExternalCalendarTask[] = professionalOverlayTasks
      .map((task) => {
        const offset = dayOffsetFromDate(task.dueDate);
        if (offset === null) return null;
        return {
          id: `pro-${task.id}`,
          sourceTaskId: task.id,
          title: task.title,
          source: "professional" as const,
          dayOffset: offset,
          done: task.status === "done",
          objectiveId: task.objectiveId ?? null,
        } satisfies ExternalCalendarTask;
      })
      .filter(Boolean) as ExternalCalendarTask[];

    const professionalIds = new Set(professionalOverlayTasks.map((task) => task.id));
    const professionalFingerprints = new Set(
      professionalTasks.map((task) =>
        buildTaskFingerprint(task.title, task.dayOffset, task.objectiveId ?? null),
      ),
    );

    const dedupedNsTasks = nsTasks.filter((task) => {
      const sourceId = task.id.replace(/^ns-/, "");
      if (professionalIds.has(sourceId)) return false;
      const fp = buildTaskFingerprint(task.title, task.dayOffset, task.objectiveId ?? null);
      return !professionalFingerprints.has(fp);
    });

    return [...dedupedNsTasks, ...professionalTasks];
  }, [objectives, professionalOverlayTasks, startOfToday]);

  const externalCalendarBlocks = useMemo<CalendarRenderBlock[]>(() => {
    const grouped = new Map<number, ExternalCalendarTask[]>();
    for (const task of externalCalendarTasks) {
      const tasks = grouped.get(task.dayOffset) ?? [];
      tasks.push(task);
      grouped.set(task.dayOffset, tasks);
    }

    const blocksByDay: CalendarRenderBlock[] = [];
    for (const [dayOffset, dayTasks] of grouped.entries()) {
      dayTasks
        .sort((a, b) => {
          const aRef = professionalOverlayTasks.find((task) => `pro-${task.id}` === a.id);
          const bRef = professionalOverlayTasks.find((task) => `pro-${task.id}` === b.id);
          const aOrder = aRef?.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const bOrder = bRef?.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aUpdated = aRef?.updatedAt ? new Date(aRef.updatedAt).getTime() : 0;
          const bUpdated = bRef?.updatedAt ? new Date(bRef.updatedAt).getTime() : 0;
          if (aUpdated !== bUpdated) return bUpdated - aUpdated;
          return a.title.localeCompare(b.title);
        })
        .forEach((task, index) => {
          const startHr = 7 + (index % 13);
          blocksByDay.push({
            id: `ext-${task.id}`,
            dayOffset,
            startHr,
            endHr: Math.min(24, startHr + 1),
            title: task.title,
            type: task.source === "north-star" ? "deep-work" : "admin",
            isExternal: true,
            source: task.source,
            done: task.done,
            sourceTaskId: task.sourceTaskId,
            objectiveId: task.objectiveId ?? null,
          });
        });
    }

    return blocksByDay;
  }, [externalCalendarTasks, professionalOverlayTasks]);

  const calendarBlocks = useMemo<CalendarRenderBlock[]>(
    () => [
      ...blocks.map((block) => ({ ...block, isExternal: false })),
      ...externalCalendarBlocks,
    ],
    [blocks, externalCalendarBlocks],
  );

  const blocksByDate = useMemo(() => {
    const byDate = new Map<string, { total: number; deep: number; doneExternal: number }>();
    for (const block of calendarBlocks) {
      const key = dateKeyForOffset(block.dayOffset);
      const current = byDate.get(key) ?? { total: 0, deep: 0, doneExternal: 0 };
      current.total += 1;
      if (block.type === "deep-work") current.deep += 1;
      if (block.isExternal && block.done) current.doneExternal += 1;
      byDate.set(key, current);
    }
    return byDate;
  }, [calendarBlocks, dateKeyForOffset]);

  const monthAnchor = useMemo(() => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() + calendarOffset);
    d.setDate(1);
    return d;
  }, [startOfToday, calendarOffset]);

  const monthCells = useMemo(() => {
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndexMonday = (monthAnchor.getDay() + 6) % 7;
    const totalCells = Math.ceil((firstDayIndexMonday + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, idx) => {
      const dayNum = idx - firstDayIndexMonday + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        return { key: `empty-${idx}`, day: null as number | null, stats: null as { total: number; deep: number; doneExternal: number } | null };
      }

      const date = new Date(year, month, dayNum);
      const key = date.toISOString().slice(0, 10);
      return {
        key,
        day: dayNum,
        stats: blocksByDate.get(key) ?? { total: 0, deep: 0, doneExternal: 0 },
      };
    });
  }, [monthAnchor, blocksByDate]);

  const yearAnchor = useMemo(() => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() + calendarOffset);
    return d;
  }, [startOfToday, calendarOffset]);

  const yearMonthStats = useMemo(() => {
    const selectedYear = yearAnchor.getFullYear();
    const stats = Array.from({ length: 12 }, () => ({ total: 0, deep: 0 }));

    for (const [dateKey, value] of blocksByDate.entries()) {
      const date = new Date(`${dateKey}T00:00:00`);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== selectedYear) continue;
      const m = date.getMonth();
      stats[m].total += value.total;
      stats[m].deep += value.deep;
    }

    return stats;
  }, [blocksByDate, yearAnchor]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  const selectedBlockConflicts = useMemo(() => {
    if (!selectedBlock) return 0;
    return blocks.filter((block) =>
      block.id !== selectedBlock.id &&
      block.dayOffset === selectedBlock.dayOffset &&
      selectedBlock.startHr < block.endHr &&
      selectedBlock.endHr > block.startHr,
    ).length;
  }, [blocks, selectedBlock]);

  // Cross-module functions
  const scheduleFromInbox = (title: string, index: number) => {
    // Schedule a 1-hour admin block near current time
    const start = Math.max(6, Math.floor(currentHr));
    const nextId = uid();
    setBlocks(prev => [...prev, { id: nextId, dayOffset: 0, startHr: start, endHr: Math.min(24, start + 1), title, type: "admin" }]);
    setSelectedBlockId(nextId);
    setInbox(prev => prev.filter((_, i) => i !== index));
    // Keep the cursor close to the newly created window
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (start - 2) * pxPerHour); 
  };

  const pushCommandFromInbox = (title: string, index: number) => {
    setCommands(prev => [...prev, { id: uid(), title, done: false, timeEstimate: 15 }]);
  setInbox(prev => prev.filter((_, i) => i !== index));
  };

  const removeInboxItem = (index: number) => {
    setInbox((prev) => prev.filter((_, i) => i !== index));
  };

  const scheduleCommand = (cmd: CommandItem) => {
    const start = Math.max(7, Math.floor(currentHr));
    const duration = Math.max(0.5, (cmd.timeEstimate ?? 30) / 60);
    const nextId = uid();
    setBlocks((prev) => [
      ...prev,
      {
        id: nextId,
        dayOffset: 0,
        startHr: start,
        endHr: Math.min(24, Number((start + duration).toFixed(2))),
        title: cmd.title,
        type: cmd.objectiveId ? "deep-work" : "admin",
      },
    ]);
    setSelectedBlockId(nextId);
  };

  const pushObjectiveTasksToCommands = (objectiveId: string) => {
    const objective = objectives.find((o) => o.id === objectiveId);
    if (!objective) return;
    const existingTitles = new Set(commands.map((cmd) => cmd.title.toLowerCase()));
    const additions = objective.keyResults
      .filter((kr) => kr.progress < 100)
      .filter((kr) => !existingTitles.has(kr.title.toLowerCase()))
      .map((kr) => ({
        id: uid(),
        title: kr.title,
        done: false,
        timeEstimate: 30,
        objectiveId,
      }));
    if (additions.length > 0) {
      setCommands((prev) => [...prev, ...additions]);
    }
  };

  // Fake current time for timeline marking
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const currentHr = now.getHours() + (now.getMinutes() / 60);
  const visibleCommands = useMemo(
    () => (focusedObjId ? commands.filter((cmd) => cmd.objectiveId === focusedObjId) : commands),
    [commands, focusedObjId],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && (view === "day" || view === "3day" || view === "week")) {
      const target = Math.max(0, currentHr * pxPerHour - 8);
      scrollRef.current.scrollTop = target;
    }
  }, [view, calendarOffset]);

  // Derived properties for current view
  const daysCount = view === "day" ? 1 : view === "3day" ? 3 : view === "week" ? 7 : 0;
  const calendarStep =
    view === "day" ? 1 :
    view === "3day" ? 3 :
    view === "week" ? 7 :
    view === "month" ? 30 : 365;

  const beginDragBlock = (dayOffset: number, hour: number) => {
    dragMovedRef.current = false;
    setDragStart({ dayOffset, hour });
    setDragCurrentHour(hour);
  };

  const completeDragBlock = () => {
    if (resizing) return;
    if (!dragStart || dragCurrentHour === null) return;
    if (!dragMovedRef.current) {
      setDragStart(null);
      setDragCurrentHour(null);
      return;
    }
    const startHr = Math.min(dragStart.hour, dragCurrentHour);
    const endHr = Math.max(dragStart.hour, dragCurrentHour) + slotSize;

    if (endHr - startHr < slotSize) {
      setDragStart(null);
      setDragCurrentHour(null);
      return;
    }

    const title = focusedObj ? `Focus · ${focusedObj.title}` : "Scheduled Block";
    const type: TimeBlock["type"] = focusedObj ? "deep-work" : "admin";
    const nextId = uid();
    setBlocks((prev) => [
      ...prev,
      {
        id: nextId,
        dayOffset: dragStart.dayOffset,
        startHr: Number(startHr.toFixed(2)),
        endHr: Number(endHr.toFixed(2)),
        title,
        type,
      },
    ]);
    setSelectedBlockId(nextId);

    setDragStart(null);
    setDragCurrentHour(null);
    dragMovedRef.current = false;
  };

  useEffect(() => {
    if (!dragStart) return;
    const stop = () => completeDragBlock();
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, [dragStart, dragCurrentHour, resizing]);

  const beginResizeBlock = (blockId: string, edge: "start" | "end") => {
    setResizing({ blockId, edge });
  };

  useEffect(() => {
    if (!resizing || !scrollRef.current) return;

    const onMove = (event: MouseEvent) => {
      const container = scrollRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const relativeY = event.clientY - rect.top + container.scrollTop;
      const snapped = snapToSlot(clampHour(relativeY / pxPerHour), slotSize);

      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== resizing.blockId) return block;
          if (resizing.edge === "start") {
            const nextStart = Math.min(snapped, Number((block.endHr - slotSize).toFixed(2)));
            return { ...block, startHr: Math.max(0, nextStart) };
          }
          const nextEnd = Math.max(snapped, Number((block.startHr + slotSize).toFixed(2)));
          return { ...block, endHr: Math.min(24, nextEnd) };
        }),
      );
    };

    const onUp = () => {
      setResizing(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, pxPerHour, slotSize]);

  const updateSelectedBlock = (updates: Partial<TimeBlock>) => {
    if (!selectedBlockId) return;
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== selectedBlockId) return block;
        const next = { ...block, ...updates };
        if (next.endHr <= next.startHr) {
          next.endHr = Math.min(24, Number((next.startHr + slotSize).toFixed(2)));
        }
        return next;
      }),
    );
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlockId) return;
    setBlocks((prev) => prev.filter((block) => block.id !== selectedBlockId));
    setSelectedBlockId(null);
  };

  const openProfessionalTask = (block: CalendarRenderBlock) => {
    if (!block.isExternal || block.source !== "professional" || !block.sourceTaskId) return;
    const params = new URLSearchParams({
      action: "focus-task",
      taskId: block.sourceTaskId,
    });
    if (block.objectiveId) {
      params.set("objectiveId", block.objectiveId);
    }
    router.push(`/professional?${params.toString()}`);
  };

  const sendBlockToProfessional = (block: TimeBlock) => {
    const params = new URLSearchParams({
      action: "create-task",
      status: "todo",
      title: block.title,
      dueDate: dateValueFromOffset(block.dayOffset),
    });
    if (focusedObjId) {
      params.set("objectiveId", focusedObjId);
    }
    router.push(`/professional?${params.toString()}`);
  };
  
  const viewOptions = [
    { key: "day", label: "Day", num: 1 },
    { key: "3day", label: "3 Days", num: 2 },
    { key: "week", label: "Week", num: 3 },
    { key: "month", label: "Month", num: 4 },
    { key: "year", label: "Year", num: 5 },
  ];

  if (!isReady) {
    return (
      <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
        <div className="h-8 w-44 bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_320px] gap-4 flex-1 min-h-0">
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden">
        
  {/* ═══ STATUS BAR ═══ * /}
        <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
          <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
            <span className="flex items-center gap-2 text-foreground font-semibold"><CalendarIcon className="h-3 w-3 stroke-[1.5]" /> Tactical</span>
            <span className="flex items-center gap-2 hidden md:flex"><CheckCircle2 className="h-3 w-3 stroke-[1.5]" /> {totalMatrixDone + totalCmdDone} Tasks Done</span>
            <span className="flex items-center gap-2 hidden lg:flex"><Clock className="h-3 w-3 stroke-[1.5]" /> {deepWorkHrs}h Deep Work</span>
          </div>
          <button onClick={() => setMatrixOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors">
            <Grid3X3 className="h-3 w-3 stroke-[2]" /> Matrix
          </button>
        </header>

  {/* ═══ NORTH STAR ALIGNMENT STRIP ═══ * /}
        <NorthStarStrip />

  {/* ═══ MAIN LAYOUT ═══ * /}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 overflow-hidden">

          {/* ─── LEFT: MULTI-VIEW CALENDAR ─── * /}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden relative">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border/20 z-10 bg-background/95 backdrop-blur">
              <div className="flex flex-col">
                 <span className="text-xl font-bold tracking-tight">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                 <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1 text-emerald-600/80">Command Active</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View toggles * /}
                <div className="flex items-center rounded-xl p-1 border border-border/40 bg-muted/25 shadow-sm">
                  {viewOptions.map(opt => (
                    <button 
                      key={opt.key}
                      onClick={() => setView(opt.key as CalendarView)} 
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-all",
                        view === opt.key
                          ? "bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                          : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                      )}
                      title={`Ctrl + ${opt.num}`}
                    >
                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", view === opt.key ? "bg-background/70" : "bg-muted-foreground/40")} />
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 rounded-xl border border-border/40 bg-background/80 p-1.5 shadow-sm">
             <button onClick={() => setCalendarOffset((prev) => prev - calendarStep)} className="rounded-lg p-1.5 border border-border/40 hover:bg-muted/50 transition-colors text-muted-foreground"><ChevronLeft className="h-4 w-4 stroke-[1.5]" /></button>
             <button onClick={() => setCalendarOffset(0)} className="rounded-lg px-3 py-1.5 border border-indigo-500/30 bg-indigo-500/10 text-[9px] font-mono uppercase tracking-widest text-indigo-500 hover:bg-indigo-500/20 transition-colors">Today</button>
             <button onClick={() => setCalendarOffset((prev) => prev + calendarStep)} className="rounded-lg p-1.5 border border-border/40 hover:bg-muted/50 transition-colors text-muted-foreground"><ChevronRight className="h-4 w-4 stroke-[1.5]" /></button>
                </div>
              </div>
            </div>

            {/* View Renderers * /}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide relative bg-muted/5">
              
              {(view === "day" || view === "3day" || view === "week") && (
                <div className="flex relative h-full">
                  {/* Shared Hourly Left Axis * /}
                  <div className="w-[60px] shrink-0 border-r border-border/20 relative" style={{ height: hours.length * pxPerHour }}>
                    {hours.map((h) => (
                      <div key={`h-axis-${h}`} className="absolute w-full flex justify-end pr-2" style={{ top: h * pxPerHour - 8 }}>
                        <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
                          {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns * /}
                  <div className="flex-1 grid gap-0 relative" style={{ gridTemplateColumns: `repeat(${daysCount}, minmax(0, 1fr))`, height: hours.length * pxPerHour }}>
                    {/* Horizontal Grid lines spanning all columns * /}
                    <div className="absolute inset-0 pointer-events-none">
                       {hours.map((h) => (
                        <div key={`grid-${h}`} className="relative h-[80px]">
                          <div className="absolute top-0 w-full border-t border-border/10" />
                          <div className="absolute top-1/2 w-full border-t border-border/5 border-dashed" />
                        </div>
                      ))}
                    </div>

                    {/* Generate columns * /}
                    {Array.from({ length: daysCount }).map((_, colIndex) => {
                       const d = new Date(now);
                       d.setDate(d.getDate() + calendarOffset + colIndex);
                       const blockDayOffset = calendarOffset + colIndex;
                       const isToday = blockDayOffset === 0;

                       return (
                         <div key={`col-${colIndex}`} className={cn("relative border-r border-border/10 last:border-r-0 h-full", isToday && "bg-muted/10")}>
                           {isToday && (
                             <div className="absolute left-0 right-0 border-t-[1.5px] border-rose-500 z-20 flex items-center pointer-events-none" style={{ top: currentHr * pxPerHour }}>
                               <div className="absolute -left-[6px] h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                             </div>
                           )}

                           {/* Day Header (inside scroll area for simplicity, normally fixed) * /}
                           <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/20 px-2 py-2 flex flex-col items-center justify-center">
                              <span className={cn("text-[10px] font-mono uppercase tracking-widest", isToday ? "text-rose-500 font-bold" : "text-muted-foreground")}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                              <span className={cn("text-sm font-bold", isToday ? "text-rose-500" : "text-foreground")}>{d.getDate()}</span>
                           </div>

                           {/* Blocks for this day * /}
                           {calendarBlocks.filter((b) => b.dayOffset === blockDayOffset).map((block) => (
                             <div
                               key={block.id}
                               onClick={() => {
                                 if (!block.isExternal) {
                                   setSelectedBlockId(block.id);
                                 }
                               }}
                               className={cn(
                                 "absolute border-l-4 p-2 flex flex-col justify-start overflow-hidden group cursor-pointer transition-all backdrop-blur-md shadow-sm hover:shadow-md z-10",
                                 blockColors[block.type].replace("bg-", "bg-opacity-80 bg-").replace("border-", "border-"),
                                 block.type === "deep-work" ? "border-l-indigo-500" : block.type === "meeting" ? "border-l-amber-500" : block.type === "admin" ? "border-l-emerald-500" : "border-l-muted-foreground",
                                 block.isExternal && "border-dashed opacity-90",
                                 !block.isExternal && block.id === selectedBlockId && "ring-1 ring-foreground/40"
                               )}
                               style={{
                                 top: block.startHr * pxPerHour,
                                 height: (block.endHr - block.startHr) * pxPerHour,
                                 left: "2px",
                                 right: "8px",
                               }}
                             >
                               {!block.isExternal && (
                                 <>
                                   <button
                                     onMouseDown={(e) => {
                                       e.preventDefault();
                                       e.stopPropagation();
                                       setSelectedBlockId(block.id);
                                       beginResizeBlock(block.id, "start");
                                     }}
                                     className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-foreground/10"
                                     aria-label="Resize start"
                                   />
                                   <button
                                     onMouseDown={(e) => {
                                       e.preventDefault();
                                       e.stopPropagation();
                                       setSelectedBlockId(block.id);
                                       beginResizeBlock(block.id, "end");
                                     }}
                                     className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent hover:bg-foreground/10"
                                     aria-label="Resize end"
                                   />
                                 </>
                               )}
                               {block.isExternal && (
                                 <span className={cn("text-[8px] font-mono uppercase tracking-widest mb-1", block.source === "north-star" ? "text-indigo-500" : "text-emerald-500", block.done && "line-through opacity-60")}>
                                   {block.source === "north-star" ? "North Star" : "Professional"}
                                 </span>
                               )}
                               <span className="text-[10px] font-bold tracking-tight leading-none text-foreground truncate">{block.title}</span>
                               <div className="flex items-center gap-1.5 mt-1 opacity-80 overflow-hidden">
                                  <span className="text-[8px] font-mono uppercase tracking-widest truncate">{formatHourLabel(block.startHr)} - {formatHourLabel(block.endHr)}</span>
                               </div>
                               {block.isExternal && block.source === "professional" && (
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     openProfessionalTask(block);
                                   }}
                                   className="mt-1 self-start rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/20"
                                 >
                                   Open in Pro
                                 </button>
                               )}
                             </div>
                           ))}

                           {/* Drag-to-schedule slots * /}
                           {slots.map((slotHour, slotIndex) => {
                             const isDraggingThisDay = dragStart?.dayOffset === blockDayOffset;
                             const dragMin = dragStart && isDraggingThisDay && dragCurrentHour !== null ? Math.min(dragStart.hour, dragCurrentHour) : null;
                             const dragMax = dragStart && isDraggingThisDay && dragCurrentHour !== null ? Math.max(dragStart.hour, dragCurrentHour) : null;
                             const inRange = dragMin !== null && dragMax !== null && slotHour >= dragMin && slotHour <= dragMax;
                             return (
                               <div
                                 key={`slot-${colIndex}-${slotIndex}`}
                                 onMouseDown={(e) => {
                                   e.preventDefault();
                                   beginDragBlock(blockDayOffset, slotHour);
                                 }}
                                 onMouseEnter={() => {
                                   if (dragStart && dragStart.dayOffset === blockDayOffset) {
                                     if (slotHour !== dragStart.hour) {
                                       dragMovedRef.current = true;
                                     }
                                     setDragCurrentHour(slotHour);
                                   }
                                 }}
                                 className={cn("absolute w-full cursor-crosshair z-0 transition-colors", inRange ? "bg-foreground/10" : "hover:bg-foreground/2")}
                                 style={{ top: slotHour * pxPerHour, height: pxPerHour * slotSize }}
                               />
                             );
                           })}
                         </div>
                       )
                    })}
                  </div>
                </div>
              )}

              {/* Month View * /}
              {view === "month" && (
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Monthly Summary</span>
                      <span className="text-[10px] font-mono text-foreground">{monthSummary.totalBlocks} blocks</span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
                      <span>Deep Work: {monthSummary.deepBlocks}</span>
                      <span>Total: {monthSummary.totalHours.toFixed(1)}h</span>
                    </div>
                  </div>
                  <div className="mb-3 flex items-center justify-between border border-border/20 bg-background/70 px-3 py-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Month</span>
                    <span className="text-[11px] font-semibold text-foreground">{monthAnchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/20 flex-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                      <div key={d} className="bg-muted/10 p-2 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/20">{d}</div>
                    ))}
                    {monthCells.map((cell) => (
                      <div key={cell.key} className={cn("bg-background p-2 flex flex-col items-end border-t border-border/5", cell.day ? "hover:bg-muted/5 transition-colors" : "opacity-35")}>
                        <span className={cn("text-[10px] font-mono", cell.day ? "text-foreground" : "text-muted-foreground/40")}>{cell.day ?? ""}</span>
                        {cell.day && cell.stats && (
                          <div className="mt-auto w-full space-y-1">
                            <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground/80">
                              <span>tasks</span>
                              <span>{cell.stats.total}</span>
                            </div>
                            <div className="h-1 w-full bg-border/20">
                              <div className="h-full bg-indigo-500/60" style={{ width: `${Math.min(100, cell.stats.total * 18)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Year View * /}
              {view === "year" && (
                <div className="p-6 grid grid-cols-3 xl:grid-cols-4 gap-6 h-full overflow-y-auto content-start">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                    <div key={m} className="flex flex-col gap-2">
                       <span className="text-[12px] font-bold text-foreground border-b border-border/20 pb-1 flex items-center justify-between">
                         {m} {yearAnchor.getFullYear()}
                         <span className="text-[9px] font-mono text-muted-foreground">{yearMonthStats[i].total} blocks</span>
                       </span>
                       <div className="border border-border/20 bg-background/70 p-2">
                         <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground mb-1">
                           <span>Deep</span>
                           <span>{yearMonthStats[i].deep}</span>
                         </div>
                         <div className="h-1.5 w-full bg-border/20">
                           <div className="h-full bg-emerald-500/60" style={{ width: `${Math.min(100, yearMonthStats[i].deep * 10)}%` }} />
                         </div>
                         <div className="mt-2 text-[8px] font-mono uppercase tracking-widest text-muted-foreground/70">
                           Focus density: {yearMonthStats[i].total > 0 ? Math.round((yearMonthStats[i].deep / yearMonthStats[i].total) * 100) : 0}%
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* ─── RIGHT: MINI CALENDAR & LISTS ─── * /}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
            
            {/* Block Studio * /}
            <div className="flex flex-col border border-border/30 bg-background/75 backdrop-blur-sm shrink-0 overflow-hidden rounded-xl">
              <SectionHead
                title="Schedule Editor"
                icon={Clock}
                badge={<span className="text-[9px] font-mono text-muted-foreground">{blocks.length} planned</span>}
              />
              <div className="px-4 py-3 border-b border-border/10 bg-gradient-to-r from-indigo-500/5 via-background to-emerald-500/5 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border/20 bg-background/85 px-2.5 py-1.5">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Deep Work</span>
                  <p className="text-[12px] font-semibold text-foreground mt-0.5">{deepWorkHrs.toFixed(1)}h</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-background/85 px-2.5 py-1.5">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Start</span>
                  <p className="text-[12px] font-semibold text-foreground mt-0.5">{selectedBlock ? formatHourLabel(selectedBlock.startHr) : "—"}</p>
                </div>
                <div className="rounded-lg border border-border/20 bg-background/85 px-2.5 py-1.5">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Duration</span>
                  <p className="text-[12px] font-semibold text-foreground mt-0.5">{selectedBlock ? `${(selectedBlock.endHr - selectedBlock.startHr).toFixed(1)}h` : "—"}</p>
                </div>
              </div>
              <div className="p-3 space-y-3 bg-background/40">
                {selectedBlock ? (
                  <>
                    <div className="rounded-xl border border-border/20 bg-background/80 p-3 space-y-3 shadow-sm">
                      <div className="space-y-1">
                        <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Task / Block title</span>
                        <input
                          value={selectedBlock.title}
                          onChange={(e) => updateSelectedBlock({ title: e.target.value })}
                          className="w-full rounded-lg bg-background border border-border/40 px-3 py-2 text-[11px] font-medium text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Block type</span>
                          <select
                            value={selectedBlock.type}
                            onChange={(e) => updateSelectedBlock({ type: e.target.value as TimeBlock["type"] })}
                            className="w-full rounded-lg bg-background border border-border/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            <option value="deep-work">Deep Work</option>
                            <option value="meeting">Meeting</option>
                            <option value="admin">Admin</option>
                            <option value="break">Break</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Date</span>
                          <input
                            type="date"
                            value={dateValueFromOffset(selectedBlock.dayOffset)}
                            onChange={(e) => updateSelectedBlock({ dayOffset: offsetFromDateValue(e.target.value) })}
                            className="w-full rounded-lg bg-background border border-border/40 px-3 py-2 text-[10px] font-mono text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1 col-span-2">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Start time</span>
                          <select
                            value={selectedBlock.startHr}
                            onChange={(e) => {
                              const nextStart = Number(e.target.value);
                              updateSelectedBlock({
                                startHr: nextStart,
                                endHr: Math.max(Number((nextStart + slotSize).toFixed(2)), selectedBlock.endHr),
                              });
                            }}
                            className="w-full rounded-lg bg-background border border-border/40 px-3 py-2 text-[10px] font-mono text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            {slots.map((slot) => (
                              <option key={`start-${slot}`} value={slot}>{formatHourLabel(slot)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Duration</span>
                          <select
                            value={Number((selectedBlock.endHr - selectedBlock.startHr).toFixed(2))}
                            onChange={(e) => {
                              const duration = Number(e.target.value);
                              updateSelectedBlock({ endHr: Math.min(24, Number((selectedBlock.startHr + duration).toFixed(2))) });
                            }}
                            className="w-full rounded-lg bg-background border border-border/40 px-3 py-2 text-[10px] font-mono text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            {durationOptions.map((duration) => (
                              <option key={`dur-${duration}`} value={duration}>{duration.toFixed(1)}h</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => updateSelectedBlock({ startHr: Math.max(0, Number((selectedBlock.startHr - slotSize).toFixed(2))), endHr: Math.max(slotSize, Number((selectedBlock.endHr - slotSize).toFixed(2))) })}
                          className="rounded-lg border border-border/40 px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-muted/40"
                        >
                          Shift -30m
                        </button>
                        <button
                          onClick={() => updateSelectedBlock({ dayOffset: 0 })}
                          className="rounded-lg border border-indigo-500/30 px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest text-indigo-500 hover:bg-indigo-500/10"
                        >
                          Move Today
                        </button>
                        <button
                          onClick={() => updateSelectedBlock({ endHr: Math.min(24, Number((selectedBlock.endHr + slotSize).toFixed(2))) })}
                          className="rounded-lg border border-border/40 px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:bg-muted/40"
                        >
                          Extend +30m
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/20 bg-background/75 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
                        <span>Window</span>
                        <span>{formatHourLabel(selectedBlock.startHr)} → {formatHourLabel(selectedBlock.endHr)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-muted-foreground/80">
                        <span>Date</span>
                        <span>{new Date(`${dateValueFromOffset(selectedBlock.dayOffset)}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-muted-foreground/80">
                        <span>Conflicts</span>
                        <span className={cn(selectedBlockConflicts > 0 ? "text-amber-500" : "text-emerald-500")}>{selectedBlockConflicts}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
                        Block #{selectedBlock.id.slice(0, 8)} · drag top/bottom edge to resize
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => sendBlockToProfessional(selectedBlock)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10"
                        >
                          <Briefcase className="h-3 w-3 stroke-[1.5]" /> Send to Pro
                        </button>
                        <button
                          onClick={deleteSelectedBlock}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-widest text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3 w-3 stroke-[1.5]" /> Remove
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl px-3 py-5 text-center border border-dashed border-border/30 bg-background/40">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Drag in calendar to create a schedule</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">Then tweak date/time/type here with modern controls.</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Command List (Execution) * /}
            <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
              <SectionHead title="Command List" icon={ListChecks} badge={<span className="text-[9px] font-mono text-muted-foreground">{totalCmdDone}/{commands.length}</span>} action={
                 <button onClick={() => setAddingCmd(true)} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 stroke-[1.5]" /></button>
              } />
              
              <div className="shrink-0 h-[2px] w-full bg-border/20 mb-1">
                <div className="h-full bg-emerald-500/60 transition-all duration-500" style={{ width: `${commands.length > 0 ? (totalCmdDone / commands.length) * 100 : 0}%` }} />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                {focusedObjId && (
                  <div className="px-4 py-1.5 bg-muted/5 border-b border-border/10 flex items-center gap-2">
                    <Target className="h-3 w-3 text-muted-foreground stroke-[1.5]" />
                    <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground truncate">Focus: {focusedObj?.title}</span>
                  </div>
                )}
                {visibleCommands.map(cmd => {
                  const linkedObj = cmd.objectiveId ? objectives.find(o => o.id === cmd.objectiveId) : null;
                  return (
                    <div key={cmd.id} className="group flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors">
                      <button onClick={() => setCommands(prev => prev.map(c => c.id === cmd.id ? { ...c, done: !c.done } : c))} className="shrink-0">
                        {cmd.done ? <CheckCircle2 className="h-4 w-4 stroke-[1.5] text-emerald-500/60" /> : <Circle className="h-4 w-4 stroke-[1.5] text-muted-foreground/40 hover:text-foreground transition-colors" />}
                      </button>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn("text-[12px] font-semibold truncate", cmd.done ? "text-muted-foreground/40 line-through decoration-muted-foreground/20" : "text-foreground")}>{cmd.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cmd.timeEstimate && (
                            <span className="text-[9px] font-mono text-muted-foreground/60">{cmd.timeEstimate}m est.</span>
                          )}
                          {linkedObj && (
                            <span className="text-[8px] font-mono uppercase tracking-widest text-indigo-400/70 truncate max-w-30">↪ {linkedObj.title}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => scheduleCommand(cmd)} className="p-1 text-muted-foreground hover:text-emerald-500" title="Schedule now"><CalendarIcon className="h-3 w-3 stroke-[1.5]" /></button>
                        <button onClick={() => setCommands(prev => prev.filter(c => c.id !== cmd.id))} className="p-1 text-muted-foreground hover:text-rose-500" title="Delete"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                      </div>
                    </div>
                  );
                })}
                {visibleCommands.length === 0 && (
                  <div className="px-4 py-5 text-center text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{focusedObjId ? "No commands for focused objective" : "No commands yet"}</div>
                )}
                {addingCmd && (
                  <div className="px-2 pb-2">
                    <InlineInput 
                      placeholder={focusedObj ? `Task under: ${focusedObj.title.slice(0, 30)}...` : "Command item..."} 
                      onSubmit={v => { 
                        setCommands(prev => [...prev, { id: uid(), title: v, done: false, timeEstimate: 15, objectiveId: focusedObjId ?? undefined }]); 
                        setAddingCmd(false); 
                      }} 
                      onCancel={() => setAddingCmd(false)} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Objective Focus Panel * /}
            <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0 max-h-[45%] overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
                <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
                  <Target className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> Objective Focus
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">{objectives.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* "None" clear option * /}
                {focusedObjId && (
                  <button onClick={() => setFocusedObjId(null)} className="w-full flex items-center gap-2 px-4 py-2 text-left border-b border-border/10 text-muted-foreground hover:text-foreground transition-colors">
                    <span className="text-[9px] font-mono uppercase tracking-widest">× Clear Focus</span>
                  </button>
                )}
                {objectives.map(obj => (
                  <button key={obj.id} onClick={() => setFocusedObjId(obj.id === focusedObjId ? null : obj.id)}
                    className={cn("w-full flex flex-col gap-1 px-4 py-2.5 border-b border-border/10 last:border-0 text-left transition-all",
                      obj.id === focusedObjId ? "bg-foreground/5 border-l-2 border-l-foreground" : "hover:bg-muted/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[10px] font-semibold truncate max-w-45", obj.id === focusedObjId ? "text-foreground" : "text-muted-foreground")}>{obj.title}</span>
                      <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{obj.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-border/20">
                      <div className={cn("h-full transition-all", obj.status === "on-track" ? "bg-emerald-500/60" : obj.status === "at-risk" ? "bg-amber-500/60" : "bg-rose-500/60")} style={{ width: `${obj.progress}%` }} />
                    </div>
                    <div className="mt-0.5 flex justify-end">
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          pushObjectiveTasksToCommands(obj.id);
                        }}
                        className="text-[8px] font-mono uppercase tracking-widest text-indigo-500/80 hover:text-indigo-500"
                      >
                        Push KRs → Command
                      </span>
                    </div>
                  </button>
                ))}
                {objectives.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Set objectives in North Star</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0 h-1/3">
              <SectionHead title="Inbox / Staging" icon={Inbox} badge={<span className="text-[9px] font-mono text-muted-foreground">{inbox.length}</span>} action={
                 <button onClick={() => setAddingInbox(true)} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 stroke-[1.5]" /></button>
              } />
              <div className="flex-1 overflow-y-auto scrollbar-hide p-2 flex flex-col gap-1.5 bg-muted/5 z-0">
                {inbox.map((item, i) => (
            <div key={item.id} className="group flex items-center justify-between p-2 lg:p-2.5 border border-border/20 bg-background hover:border-border/40 transition-colors">
              <span className="text-[11px] font-medium text-foreground pr-2 leading-tight flex-1">{item.title}</span>
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
       <button onClick={() => pushCommandFromInbox(item.title, i)} title="Add to Commands" className="p-1 text-muted-foreground hover:text-foreground bg-muted/30"><ListChecks className="h-3 w-3 stroke-2" /></button>
       <button onClick={() => scheduleFromInbox(item.title, i)} title="Schedule on Calendar" className="p-1 text-muted-foreground hover:text-emerald-500 bg-muted/30"><CalendarIcon className="h-3 w-3 stroke-2" /></button>
       <button onClick={() => removeInboxItem(i)} title="Delete" className="p-1 text-muted-foreground hover:text-rose-500 bg-muted/30"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                     </div>
                  </div>
                ))}
                {addingInbox && (
            <InlineInput placeholder="Drop quick thought..." onSubmit={v => { setInbox(prev => [...prev, { id: uid(), title: v }]); setAddingInbox(false); }} onCancel={() => setAddingInbox(false)} />
                )}
                {inbox.length === 0 && <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block text-center mt-4">Inbox Empty</span>}
              </div>
            </div>

          </div>
        </div>
      </div>

  {/* MATRIX MODAL PORTAL * /}
      {matrixOpen && (
        <MatrixModal matrix={matrix} setMatrix={setMatrix} onClose={() => setMatrixOpen(false)} onPush={(title) => {
          setCommands(prev => [...prev, { id: uid(), title, done: false }]);
          setMatrixOpen(false);
        }} />
      )}
    </>
  );
}

*/
