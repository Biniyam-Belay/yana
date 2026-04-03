"use client";

import { useState, useRef, useEffect } from "react";
import {
  Briefcase, Plus, Trash2, Edit3, Check, X, ChevronDown,
  Clock, Calendar, User, Tag, GripVertical, ArrowUpRight,
  Circle, CheckCircle2, AlertCircle, Layers, GitBranch,
  Timer, TrendingUp, Zap, BarChart3, Columns3, ListChecks,
  ChevronRight, Expand, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TYPES ───
type Priority = "critical" | "high" | "medium" | "low";
type TaskStatus = "backlog" | "todo" | "in-progress" | "review" | "done";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  project: string;
  assignee?: string;
  dueDate?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: number;
  completed: number;
}

const uid = () => Math.random().toString(36).slice(2, 9);
const priorityColor: Record<Priority, string> = { critical: "bg-rose-500", high: "bg-amber-500", medium: "bg-indigo-500", low: "bg-muted-foreground/40" };
const priorityLabel: Record<Priority, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const priorities: Priority[] = ["critical", "high", "medium", "low"];

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "text-muted-foreground" },
  { key: "todo", label: "To Do", color: "text-indigo-500/60" },
  { key: "in-progress", label: "In Progress", color: "text-amber-500/60" },
  { key: "review", label: "Review", color: "text-blue-500/60" },
  { key: "done", label: "Done", color: "text-emerald-500/60" },
];

const projectColors = ["bg-indigo-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-blue-500", "bg-violet-500"];

// ─── SEED DATA ───
const seedProjects: Project[] = [
  { id: uid(), name: "YANA Platform", description: "Core product development", color: "bg-indigo-500", tasks: 24, completed: 17 },
  { id: uid(), name: "E-Commerce", description: "Storefront rebuild", color: "bg-amber-500", tasks: 18, completed: 8 },
  { id: uid(), name: "Client Portal", description: "Customer-facing dashboard", color: "bg-emerald-500", tasks: 12, completed: 11 },
  { id: uid(), name: "Mobile App", description: "iOS & Android MVP", color: "bg-rose-500", tasks: 30, completed: 4 },
];

const seedTasks: Task[] = [
  { id: uid(), title: "Design system audit & tokens", status: "done", priority: "high", project: "YANA Platform" },
  { id: uid(), title: "Implement auth microservice", status: "in-progress", priority: "critical", project: "YANA Platform" },
  { id: uid(), title: "Real-time sync engine", status: "in-progress", priority: "high", project: "YANA Platform" },
  { id: uid(), title: "API documentation v2", status: "review", priority: "medium", project: "YANA Platform" },
  { id: uid(), title: "Payment gateway integration", status: "todo", priority: "critical", project: "E-Commerce" },
  { id: uid(), title: "Product listing page redesign", status: "in-progress", priority: "high", project: "E-Commerce" },
  { id: uid(), title: "Cart persistence layer", status: "backlog", priority: "medium", project: "E-Commerce" },
  { id: uid(), title: "User role management", status: "review", priority: "high", project: "Client Portal" },
  { id: uid(), title: "Analytics dashboard", status: "todo", priority: "medium", project: "Client Portal" },
  { id: uid(), title: "Onboarding flow wireframes", status: "backlog", priority: "low", project: "Mobile App" },
  { id: uid(), title: "Push notification service", status: "todo", priority: "high", project: "Mobile App" },
  { id: uid(), title: "Offline data sync", status: "backlog", priority: "critical", project: "Mobile App" },
];

const dailyOutput = [
  { d: "Mon", hrs: 7.5 }, { d: "Tue", hrs: 8.2 }, { d: "Wed", hrs: 6.8 },
  { d: "Thu", hrs: 9.1 }, { d: "Fri", hrs: 7.0 },
];

// ─── SHARED COMPONENTS ───

function SectionHead({ title, icon: Icon, badge, action }: { title: string; icon: any; badge?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
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
    <div className="flex items-center gap-1.5 px-4 py-2">
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onCancel(); }} placeholder={placeholder}
        className="flex-1 bg-transparent text-[11px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40" />
      <button onClick={submit} className="p-0.5 text-emerald-500/70 hover:text-emerald-500 transition-colors"><Check className="h-3 w-3 stroke-[2]" /></button>
      <button onClick={onCancel} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"><X className="h-3 w-3 stroke-[2]" /></button>
    </div>
  );
}

// ─── PAGE ───

export default function ProfessionalPage() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState<TaskStatus | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [projDraft, setProjDraft] = useState({ name: "", desc: "" });
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Filter
  const filtered = filterProject ? tasks.filter(t => t.project === filterProject) : tasks;

  // Stats
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const inProgressTasks = tasks.filter(t => t.status === "in-progress").length;
  const throughput = doneTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}%` : "0%";

  // Helpers
  const cyclePriority = (p: Priority): Priority => priorities[(priorities.indexOf(p) + 1) % 4];
  const moveTask = (id: string, to: TaskStatus) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status: to } : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));
  const addTask = (title: string, status: TaskStatus) => {
    setTasks(prev => [...prev, { id: uid(), title, status, priority: "medium", project: filterProject || "YANA Platform" }]);
    setAddingTask(null);
  };

  const colIdx = (s: TaskStatus) => columns.findIndex(c => c.key === s);
  const moveLeft = (id: string, cur: TaskStatus) => { const i = colIdx(cur); if (i > 0) moveTask(id, columns[i - 1].key); };
  const moveRight = (id: string, cur: TaskStatus) => { const i = colIdx(cur); if (i < columns.length - 1) moveTask(id, columns[i + 1].key); };

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden">

      {/* ═══ STATUS BAR ═══ */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold"><Briefcase className="h-3 w-3 stroke-[1.5]" /> Professional</span>
          <span className="flex items-center gap-2"><Layers className="h-3 w-3 stroke-[1.5]" /> {totalTasks} Tasks</span>
          <span className="flex items-center gap-2 hidden md:flex"><CheckCircle2 className="h-3 w-3 stroke-[1.5]" /> {doneTasks} Done</span>
          <span className="flex items-center gap-2 hidden lg:flex"><Zap className="h-3 w-3 stroke-[1.5]" /> {throughput} Throughput</span>
        </div>
      </header>

      {/* ═══ KPI ROW ═══ */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "In Progress", val: inProgressTasks, sub: "active tasks", accent: "text-amber-500/60" },
          { label: "In Review", val: tasks.filter(t => t.status === "review").length, sub: "awaiting", accent: "text-blue-500/60" },
          { label: "Completed", val: doneTasks, sub: `of ${totalTasks}`, accent: "text-emerald-500/60" },
          { label: "Velocity", val: "18", sub: "tasks/week", accent: "text-indigo-500/60" },
        ].map((kpi, i) => (
          <div key={i} className="flex flex-col border border-border/30 p-3.5 bg-background/60 backdrop-blur-sm">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{kpi.label}</span>
            <div className="flex items-end justify-between">
              <span className="text-xl font-semibold tracking-tighter text-foreground leading-none tabular-nums">{kpi.val}</span>
              <span className={cn("text-[10px] font-mono tabular-nums", kpi.accent)}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-4 overflow-hidden">

        {/* ─── COL 1: PROJECTS ─── */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">
          <SectionHead title="Projects" icon={Briefcase} badge={<span className="text-[9px] font-mono text-muted-foreground">{projects.length}</span>} action={
            <button onClick={() => setAddingProject(true)} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 stroke-[1.5]" /></button>
          } />
          
          {/* Project filter "All" */}
          <button onClick={() => setFilterProject(null)} className={cn("shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/10 transition-colors", !filterProject ? "bg-foreground text-background" : "hover:bg-muted/10")}>
            <span className="text-[11px] font-semibold tracking-tight">All Projects</span>
            <span className={cn("text-[9px] font-mono", !filterProject ? "text-background/70" : "text-muted-foreground")}>{tasks.length} tasks</span>
          </button>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {projects.map(p => {
              const projTasks = tasks.filter(t => t.project === p.name);
              const projDone = projTasks.filter(t => t.status === "done").length;
              const progress = projTasks.length > 0 ? Math.round((projDone / projTasks.length) * 100) : 0;
              const isActive = filterProject === p.name;
              return (
                <div key={p.id} className={cn("group border-b border-border/10 last:border-0 transition-colors", isActive ? "bg-muted/10" : "")}>
                  <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer" onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)}>
                    <div className={cn("h-2 w-2 shrink-0", p.color)} />
                    <div className="flex flex-col flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); setFilterProject(isActive ? null : p.name); }}>
                      <span className={cn("text-[11px] font-semibold tracking-tight truncate", isActive ? "text-foreground" : "text-foreground hover:text-foreground/80")}>{p.name}</span>
                      <span className="text-[9px] font-mono text-muted-foreground/60 truncate">{p.description}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold tabular-nums text-foreground shrink-0">{progress}%</span>
                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform shrink-0", expandedProject === p.id && "rotate-180")} />
                  </div>
                  {expandedProject === p.id && (
                    <div className="px-4 pb-3 border-t border-border/10 bg-muted/5 py-2">
                      <div className="h-[2px] w-full bg-border/20 mb-2"><div className={cn("h-full transition-all duration-500", p.color)} style={{ width: `${progress}%` }} /></div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                        <span>{projDone}/{projTasks.length} done</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setProjects(prev => prev.filter(pr => pr.id !== p.id))} className="text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-1"><Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /> Drop</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {addingProject ? (
              <div className="px-4 py-3 border-b border-border/10 flex flex-col gap-2">
                <input value={projDraft.name} onChange={e => setProjDraft(d => ({ ...d, name: e.target.value }))} placeholder="Project name..." className="bg-transparent text-[11px] font-semibold text-foreground outline-none placeholder:text-muted-foreground/40" autoFocus />
                <input value={projDraft.desc} onChange={e => setProjDraft(d => ({ ...d, desc: e.target.value }))} placeholder="Description..." className="bg-transparent text-[10px] text-muted-foreground outline-none placeholder:text-muted-foreground/30" />
                <div className="flex items-center gap-1.5 justify-end mt-1">
                  <button onClick={() => {
                    if (projDraft.name.trim()) {
                      setProjects(prev => [...prev, { id: uid(), name: projDraft.name.trim(), description: projDraft.desc.trim() || "New project", color: projectColors[prev.length % projectColors.length], tasks: 0, completed: 0 }]);
                      setProjDraft({ name: "", desc: "" });
                      setAddingProject(false);
                    }
                  }} className="px-2 py-1 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest">Create</button>
                  <button onClick={() => { setAddingProject(false); setProjDraft({ name: "", desc: "" }); }} className="px-2 py-1 border border-border/40 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingProject(true)} className="shrink-0 flex items-center gap-1.5 px-4 py-3 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors w-full">
                <Plus className="h-2.5 w-2.5 stroke-[2]" /> New Project
              </button>
            )}
          </div>
        </div>

        {/* ─── COL 2: KANBAN / LIST ─── */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">

          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
            <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
              <Columns3 className="h-3 w-3 stroke-[1.5] text-muted-foreground" />
              {filterProject ? filterProject : "All Tasks"}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setView("kanban")} className={cn("px-2 py-1 text-[9px] font-mono uppercase tracking-widest transition-all", view === "kanban" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>Board</button>
              <button onClick={() => setView("list")} className={cn("px-2 py-1 text-[9px] font-mono uppercase tracking-widest transition-all", view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>List</button>
            </div>
          </div>

          {/* Board / List */}
          {view === "kanban" ? (
            /* ── KANBAN ── */
            <div className="flex-1 min-h-0 flex gap-0 overflow-x-auto scrollbar-hide">
              {columns.map(col => {
                const colTasks = filtered.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className="flex flex-col flex-1 min-w-[160px] border-r border-border/10 last:border-0 min-h-0">
                    {/* Column header */}
                    <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border/10">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                        {col.label}
                        <span className={cn("text-[9px] tabular-nums font-bold", col.color)}>{colTasks.length}</span>
                      </span>
                      <button onClick={() => setAddingTask(col.key)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"><Plus className="h-3 w-3 stroke-[1.5]" /></button>
                    </div>

                    {/* Tasks */}
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-2 py-2 flex flex-col gap-1.5">
                      {colTasks.map(task => (
                        <div key={task.id} className="group border border-border/20 bg-background/80 p-2.5 hover:border-border/40 transition-all cursor-pointer">
                          <div className="flex items-start gap-2">
                            <button onClick={() => cyclePriority(task.priority) && setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: cyclePriority(t.priority) } : t))} title={priorityLabel[task.priority]}>
                              <div className={cn("h-[5px] w-[5px] mt-1 shrink-0", priorityColor[task.priority])} />
                            </button>
                            <span className="text-[11px] font-medium text-foreground leading-tight flex-1">{task.title}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[8px] font-mono text-muted-foreground/60 uppercase tracking-widest truncate">{task.project}</span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {colIdx(task.status) > 0 && <button onClick={() => moveLeft(task.id, task.status)} className="p-0.5 text-muted-foreground hover:text-foreground"><ChevronRight className="h-3 w-3 rotate-180 stroke-[1.5]" /></button>}
                              {colIdx(task.status) < columns.length - 1 && <button onClick={() => moveRight(task.id, task.status)} className="p-0.5 text-muted-foreground hover:text-foreground"><ChevronRight className="h-3 w-3 stroke-[1.5]" /></button>}
                              <button onClick={() => deleteTask(task.id)} className="p-0.5 text-muted-foreground hover:text-rose-500"><Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {addingTask === col.key && (
                        <InlineInput placeholder="Task title..." onSubmit={v => addTask(v, col.key)} onCancel={() => setAddingTask(null)} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── LIST VIEW ── */
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
              {/* Header */}
              <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-border/20 text-[8px] font-mono uppercase tracking-widest text-muted-foreground">
                <span className="w-3"></span>
                <span className="flex-1">Task</span>
                <span className="w-24 hidden md:block">Project</span>
                <span className="w-20">Status</span>
                <span className="w-8"></span>
              </div>
              {filtered.map(task => (
                <div key={task.id} className="group flex items-center gap-3 px-4 py-2.5 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer">
                  <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: cyclePriority(t.priority) } : t))}>
                    <div className={cn("h-[5px] w-[5px] shrink-0", priorityColor[task.priority])} />
                  </button>
                  <span className="text-[11px] font-medium text-foreground truncate flex-1">{task.title}</span>
                  <span className="text-[9px] font-mono text-muted-foreground/60 w-24 truncate hidden md:block">{task.project}</span>
                  <span className="w-20">
                    <select
                      value={task.status}
                      onChange={e => moveTask(task.id, e.target.value as TaskStatus)}
                      className="bg-transparent text-[9px] font-mono uppercase tracking-widest text-muted-foreground outline-none cursor-pointer"
                    >
                      {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </span>
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-rose-500 transition-all"><Trash2 className="h-2.5 w-2.5 stroke-[1.5]" /></button>
                </div>
              ))}
              <button onClick={() => setAddingTask("backlog")} className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/15 transition-colors w-full border-t border-border/10">
                <Plus className="h-2.5 w-2.5 stroke-[2]" /> Add Task
              </button>
              {addingTask === "backlog" && view === "list" && (
                <InlineInput placeholder="Task title..." onSubmit={v => addTask(v, "backlog")} onCancel={() => setAddingTask(null)} />
              )}
            </div>
          )}
        </div>

        {/* ─── COL 3: ANALYTICS & WIDGETS ─── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">

          {/* Pipeline Summary (Ultra Compact) */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Pipeline" icon={Layers} />
            <div className="flex px-4 py-3 gap-1">
              {columns.map((col, i) => {
                const count = tasks.filter(t => t.status === col.key).length;
                const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col gap-1.5" style={{ width: `${pct}%`, minWidth: count > 0 ? '12px' : '0' }}>
                    <div className={cn("h-1.5 w-full bg-border/40", count > 0 && "bg-foreground/50")} />
                    {count > 0 && <span className="text-[8px] font-mono text-muted-foreground truncate" title={`${col.label}: ${count}`}>{count}</span>}
                  </div>
                );
              })}
            </div>
            {/* Extended Status bar instead of list */}
            <div className="grid grid-cols-2 gap-px bg-border/20 border-t border-border/20">
              {columns.slice(1).map((col) => {
                 const count = tasks.filter(t => t.status === col.key).length;
                 return (
                   <div key={col.key} className="bg-background/80 px-3 py-2 flex items-center justify-between">
                     <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">{col.label}</span>
                     <span className="text-[9px] font-mono font-bold text-foreground">{count}</span>
                   </div>
                 );
              })}
            </div>
          </div>

          {/* Blocked / Critical Items */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead title="Critical Focus" icon={AlertCircle} badge={<span className="text-[9px] font-mono text-rose-500/60 font-bold">{tasks.filter(t => t.priority === "critical" && t.status !== "done").length}</span>} />
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-1">
              {tasks.filter(t => t.priority === "critical" && t.status !== "done").map(task => (
                <div key={task.id} className="flex flex-col gap-1 px-4 py-2 border-b border-border/10 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => setFilterProject(task.project)}>
                  <div className="flex items-start gap-1.5">
                    <div className="h-[4px] w-[4px] mt-1.5 shrink-0 bg-rose-500 rounded-full" />
                    <span className="text-[10px] font-semibold text-foreground leading-snug">{task.title}</span>
                  </div>
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 ml-3">{task.project}</span>
                </div>
              ))}
              {tasks.filter(t => t.priority === "critical" && t.status !== "done").length === 0 && (
                <div className="px-4 py-6 text-center text-[9px] font-mono text-muted-foreground">No critical focus items</div>
              )}
            </div>
          </div>

          {/* Weekly Output (Compact) */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <SectionHead title="Weekly Output" icon={Timer} badge={
              <span className="text-[9px] font-mono text-emerald-500/80 font-bold tabular-nums">{dailyOutput.reduce((s, d) => s + d.hrs, 0).toFixed(1)}h</span>
            } />
            <div className="flex justify-between items-end px-4 py-3 gap-1 h-14">
              {dailyOutput.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group" title={`${d.hrs}h`}>
                  <div className="w-full flex-1 bg-border/20 relative flex items-end">
                    <div className="w-full bg-foreground/20 group-hover:bg-foreground/40 transition-colors" style={{ height: `${(d.hrs / 10) * 100}%` }} />
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground">{d.d.charAt(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
