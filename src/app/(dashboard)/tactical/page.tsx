"use client";

import { useState, useRef, useEffect } from "react";
import {
  ListChecks, Clock, Grid3X3, Plus, Trash2, CheckCircle2, Circle,
  X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Inbox,
  MoreHorizontal, Command, Check, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";

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

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── SEED DATA ───
const seedMatrix: MatrixItem[] = [
  { id: uid(), quadrant: "q1", title: "Fix production auth bug", done: false },
  { id: uid(), quadrant: "q1", title: "Finalize enterprise contract", done: true },
  { id: uid(), quadrant: "q2", title: "Design roadmap Q1", done: false },
  { id: uid(), quadrant: "q2", title: "Read system design book", done: false },
  { id: uid(), quadrant: "q3", title: "Reply to vendor emails", done: false },
  { id: uid(), quadrant: "q4", title: "Scroll X/Twitter", done: false },
];

const seedCommands: CommandItem[] = [
  { id: uid(), title: "Daily standup", done: true, timeEstimate: 15 },
  { id: uid(), title: "Review PR #412", done: false, timeEstimate: 30 },
  { id: uid(), title: "Draft Q4 OKRs", done: false, timeEstimate: 60 },
  { id: uid(), title: "Clear inbox", done: false, timeEstimate: 20 },
];

// Added dayOffsets for multi-day views.
const seedBlocks: TimeBlock[] = [
  { id: uid(), dayOffset: 0, startHr: 9, endHr: 10.5, title: "Deep Work: Sync Engine", type: "deep-work" },
  { id: uid(), dayOffset: 0, startHr: 11, endHr: 11.5, title: "Team Standup", type: "meeting" },
  { id: uid(), dayOffset: 0, startHr: 12, endHr: 13, title: "Lunch / Walk", type: "break" },
  { id: uid(), dayOffset: 0, startHr: 13.5, endHr: 15.5, title: "Deep Work: V2 UI", type: "deep-work" },
  { id: uid(), dayOffset: 0, startHr: 16, endHr: 17, title: "Admin & Emails", type: "admin" },
  
  // Dummy blocks for tomorrow / day 2
  { id: uid(), dayOffset: 1, startHr: 10, endHr: 11.5, title: "Client Demo", type: "meeting" },
  { id: uid(), dayOffset: 1, startHr: 13, endHr: 17, title: "Deep Work: Infrastructure", type: "deep-work" },
  { id: uid(), dayOffset: 2, startHr: 9, endHr: 12, title: "Weekly Planning", type: "admin" },
];

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

// ─── SHARED COMPONENTS ───

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

// ─── NORTH STAR STRIP ───
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

// ─── MODAL COMPONENT ───
function MatrixModal({ matrix, setMatrix, onClose, onPush }: { matrix: MatrixItem[], setMatrix: any, onClose: () => void, onPush: (title: string) => void }) {
  const [addingQuad, setAddingQuad] = useState<Quadrant | null>(null);

  // Focus trap map for accents
  const accents: Record<Quadrant, string> = {
    q1: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]",
    q2: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    q3: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)]",
    q4: "bg-muted-foreground shadow-[0_0_12px_rgba(156,163,175,0.4)]",
  };

  const textAccents: Record<Quadrant, string> = {
    q1: "text-rose-500",
    q2: "text-amber-500",
    q3: "text-blue-500",
    q4: "text-muted-foreground",
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200">
      <div className="bg-background flex flex-col w-full h-full max-w-[1400px] max-h-[85vh] rounded-none border border-border/40 shadow-2xl overflow-hidden ring-1 ring-border/10">
        
        {/* Sleek Brutalist Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border/20 bg-muted/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-none border border-border/30 bg-background flex items-center justify-center">
                <Grid3X3 className="h-4 w-4 text-foreground/80" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-mono uppercase tracking-widest text-foreground font-semibold leading-none">Priority Matrix</h2>
                <p className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.2em] uppercase mt-1">Axes Classification</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground rounded-none transition-colors border border-transparent"><X className="h-4 w-4 stroke-[1.5]" /></button>
          </div>
        </div>
        
        {/* Graph Area */}
        <div className="flex-1 min-h-0 p-4 lg:p-6 relative flex flex-col bg-muted/5">
          {/* Subtle Axis Labels */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground/50 z-20">High Importance</div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground/50 z-20">Low Importance</div>
          <div className="absolute left-[-20px] top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-mono uppercase tracking-[0.25em] text-muted-foreground/50 origin-center whitespace-nowrap z-20" style={{ transform: "translateY(-50%) rotate(-90deg) translateX(50%)" }}>High Urgency</div>
          
          <div className="flex-1 border border-border/20 rounded-none overflow-hidden relative shadow-sm bg-background">
            {/* Crosshairs */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border/20 z-0" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border/20 z-0" />

            <div className="grid grid-cols-2 grid-rows-2 h-full relative z-10 w-full gap-0">
              {([
                { key: "q1", title: "Do First", desc: "Urgent & Important", items: matrix.filter(m => m.quadrant === "q1") },
                { key: "q2", title: "Schedule", desc: "Not Urgent & Important", items: matrix.filter(m => m.quadrant === "q2") },
                { key: "q3", title: "Delegate", desc: "Urgent & Not Important", items: matrix.filter(m => m.quadrant === "q3") },
                { key: "q4", title: "Eliminate", desc: "Not Urgent & Not Important", items: matrix.filter(m => m.quadrant === "q4") },
              ] as const).map((quad) => (
                <div key={quad.key} className="flex flex-col p-4 xl:p-6 min-h-0 h-full group/quad hover:bg-muted/5 transition-colors border-b border-r border-border/10">
                  
                  {/* Quad Header */}
                  <div className="shrink-0 flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-none border border-border/20", accents[quad.key as Quadrant].replace("shadow-", ""))} />
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold tracking-tight text-foreground uppercase">{quad.title}</span>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground/50 tracking-widest uppercase ml-2 hidden 2xl:block">{quad.desc}</span>
                    </div>
                    <button onClick={() => setAddingQuad(quad.key as Quadrant)} className="p-1 text-muted-foreground/40 hover:text-foreground hover:bg-muted/40 rounded-none transition-all opacity-0 group-hover/quad:opacity-100 focus:opacity-100 border border-transparent">
                      <Plus className="h-3 w-3 stroke-[2]" />
                    </button>
                  </div>
                  
                  {/* Quad Items */}
                  <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-1.5">
                    {quad.items.map(item => (
                      <div key={item.id} className="group relative flex items-start gap-2.5 p-2 bg-muted/10 border border-border/10 rounded-none hover:bg-muted/30 transition-colors">
                        <button onClick={() => setMatrix((prev: MatrixItem[]) => prev.map(m => m.id === item.id ? { ...m, done: !m.done } : m))} className="mt-[3px] shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors">
                          {item.done ? <CheckCircle2 className={cn("h-3.5 w-3.5 stroke-[2]", textAccents[quad.key as Quadrant])} /> : <Circle className="h-3.5 w-3.5 stroke-[2]" />}
                        </button>
                        <span className={cn("text-[11px] font-medium tracking-tight leading-tight flex-1", item.done ? "text-muted-foreground/40 line-through decoration-muted-foreground/20" : "text-foreground")}>{item.title}</span>
                        
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 bg-background border border-border/20 p-0.5 absolute right-1.5 top-1.5 shadow-sm">
                          <button onClick={() => { onPush(item.title); setMatrix((prev: MatrixItem[]) => prev.filter(m => m.id !== item.id)); }} title="Push to Commands" className="p-1 text-muted-foreground hover:text-emerald-500 rounded-none hover:bg-muted/50 transition-colors border border-transparent">
                            <Command className="h-3 w-3 stroke-[1.5]" />
                          </button>
                          <button onClick={() => setMatrix((prev: MatrixItem[]) => prev.filter(m => m.id !== item.id))} title="Delete" className="p-1 text-muted-foreground hover:text-rose-500 rounded-none hover:bg-muted/50 transition-colors border border-transparent">
                            <Trash2 className="h-3 w-3 stroke-[1.5]" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {addingQuad === quad.key && (
                      <div className="mt-1">
                         <InlineInput placeholder="Classification..." onSubmit={v => { setMatrix((prev: MatrixItem[]) => [...prev, { id: uid(), title: v, done: false, quadrant: quad.key as Quadrant }]); setAddingQuad(null); }} onCancel={() => setAddingQuad(null)} />
                      </div>
                    )}
                    {quad.items.length === 0 && addingQuad !== quad.key && (
                       <div className="flex-1 flex items-center justify-center opacity-0 group-hover/quad:opacity-100 transition-opacity duration-500">
                          <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">Awaiting Payloads</span>
                       </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TacticalPage() {
  const { northStar, objectives, avgProgress, setObjectives } = useNorthStar();
  const [focusedObjId, setFocusedObjId] = useState<string | null>(null);
  const focusedObj = objectives.find(o => o.id === focusedObjId) ?? null;

  const [matrix, setMatrix] = useState<MatrixItem[]>(seedMatrix);
  const [matrixOpen, setMatrixOpen] = useState(false);
  
  const [commands, setCommands] = useState<CommandItem[]>(seedCommands);
  const [addingCmd, setAddingCmd] = useState(false);

  const [blocks, setBlocks] = useState<TimeBlock[]>(seedBlocks);
  const [inbox, setInbox] = useState<string[]>(["Draft email to investors", "Pay server invoices", "Schedule vet appointment"]);
  const [addingInbox, setAddingInbox] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const sMat = localStorage.getItem('yana_tac_matrix');
    const sCmd = localStorage.getItem('yana_tac_commands');
    const sBlk = localStorage.getItem('yana_tac_blocks');
    const sInb = localStorage.getItem('yana_tac_inbox');

    if (sMat) setMatrix(JSON.parse(sMat));
    if (sCmd) setCommands(JSON.parse(sCmd));
    if (sBlk) setBlocks(JSON.parse(sBlk));
    if (sInb) setInbox(JSON.parse(sInb));
    
    setIsReady(true);
  }, []);

  // Sync back to localStorage
  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem('yana_tac_matrix', JSON.stringify(matrix));
    localStorage.setItem('yana_tac_commands', JSON.stringify(commands));
    localStorage.setItem('yana_tac_blocks', JSON.stringify(blocks));
    localStorage.setItem('yana_tac_inbox', JSON.stringify(inbox));
  }, [matrix, commands, blocks, inbox, isReady]);

  const [view, setView] = useState<CalendarView>("day");

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

  const totalMatrixDone = matrix.filter(m => m.done).length;
  const totalCmdDone = commands.filter(c => c.done).length;
  const deepWorkHrs = blocks.filter(b => b.type === "deep-work").reduce((s, b) => s + (b.endHr - b.startHr), 0);

  // Cross-module functions
  const scheduleFromInbox = (title: string, index: number) => {
    // Schedule as a 1 hour admin block at 18:00 today for simplicity
    setBlocks(prev => [...prev, { id: uid(), dayOffset: 0, startHr: 18, endHr: 19, title, type: "admin" }]);
    setInbox(prev => prev.filter((_, i) => i !== index));
    // Provide a small scroll to 18:00
    if (scrollRef.current) scrollRef.current.scrollTop = 16 * pxPerHour; 
  };

  const pushCommandFromInbox = (title: string, index: number) => {
    setCommands(prev => [...prev, { id: uid(), title, done: false, timeEstimate: 15 }]);
    setInbox(prev => prev.filter((_, i) => i !== index));
  };

  // Fake current time for timeline marking
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const currentHr = now.getHours() + (now.getMinutes() / 60);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current && (view === "day" || view === "3day" || view === "week")) {
      scrollRef.current.scrollTop = 7.5 * pxPerHour; // Autoscroll to 7:30 AM
    }
  }, [view]);

  // Derived properties for current view
  const daysCount = view === "day" ? 1 : view === "3day" ? 3 : view === "week" ? 7 : 0;
  
  const viewOptions = [
    { key: "day", label: "Day", num: 1 },
    { key: "3day", label: "3 Days", num: 2 },
    { key: "week", label: "Week", num: 3 },
    { key: "month", label: "Month", num: 4 },
    { key: "year", label: "Year", num: 5 },
  ];

  return (
    <>
      <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden">
        
        {/* ═══ STATUS BAR ═══ */}
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

        {/* ═══ NORTH STAR ALIGNMENT STRIP ═══ */}
        <NorthStarStrip />

        {/* ═══ MAIN LAYOUT ═══ */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 overflow-hidden">

          {/* ─── LEFT: MULTI-VIEW CALENDAR ─── */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden relative">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border/20 z-10 bg-background/95 backdrop-blur">
              <div className="flex flex-col">
                 <span className="text-xl font-bold tracking-tight">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                 <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1 text-emerald-600/80">Command Active</span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* View toggles */}
                <div className="flex items-center p-0.5 border border-border/30 bg-background">
                  {viewOptions.map(opt => (
                    <button 
                      key={opt.key}
                      onClick={() => setView(opt.key as CalendarView)} 
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-colors rounded-none",
                        view === opt.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50"
                      )}
                      title={`Ctrl + ${opt.num}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-l border-border/20 pl-4">
                   <button className="p-1.5 border border-border/40 hover:bg-muted/50 transition-colors text-muted-foreground"><ChevronLeft className="h-4 w-4 stroke-[1.5]" /></button>
                   <button className="px-3 py-1.5 border border-border/40 text-[9px] font-mono uppercase tracking-widest text-foreground hover:bg-muted/50 transition-colors">Today</button>
                   <button className="p-1.5 border border-border/40 hover:bg-muted/50 transition-colors text-muted-foreground"><ChevronRight className="h-4 w-4 stroke-[1.5]" /></button>
                </div>
              </div>
            </div>

            {/* View Renderers */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide relative bg-muted/5">
              
              {(view === "day" || view === "3day" || view === "week") && (
                <div className="flex relative h-full">
                  {/* Shared Hourly Left Axis */}
                  <div className="w-[60px] shrink-0 border-r border-border/20 relative" style={{ height: hours.length * pxPerHour }}>
                    {hours.map((h) => (
                      <div key={`h-axis-${h}`} className="absolute w-full flex justify-end pr-2" style={{ top: h * pxPerHour - 8 }}>
                        <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums">
                          {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  <div className="flex-1 grid gap-0 relative" style={{ gridTemplateColumns: `repeat(${daysCount}, minmax(0, 1fr))`, height: hours.length * pxPerHour }}>
                    {/* Horizontal Grid lines spanning all columns */}
                    <div className="absolute inset-0 pointer-events-none">
                       {hours.map((h) => (
                        <div key={`grid-${h}`} className="relative h-[80px]">
                          <div className="absolute top-0 w-full border-t border-border/10" />
                          <div className="absolute top-1/2 w-full border-t border-border/5 border-dashed" />
                        </div>
                      ))}
                    </div>

                    {/* Current Time Line (Spanning all columns) */}
                    <div className="absolute w-full border-t-[1.5px] border-rose-500 z-20 flex items-center pointer-events-none" style={{ top: currentHr * pxPerHour }}>
                      <div className="absolute -left-[6px] h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    </div>

                    {/* Generate columns */}
                    {Array.from({ length: daysCount }).map((_, colIndex) => {
                       const d = new Date(now);
                       d.setDate(d.getDate() + colIndex);
                       const isToday = colIndex === 0;

                       return (
                         <div key={`col-${colIndex}`} className={cn("relative border-r border-border/10 last:border-r-0 h-full", isToday && "bg-muted/10")}>
                           {/* Day Header (inside scroll area for simplicity, normally fixed) */}
                           <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/20 px-2 py-2 flex flex-col items-center justify-center">
                              <span className={cn("text-[10px] font-mono uppercase tracking-widest", isToday ? "text-rose-500 font-bold" : "text-muted-foreground")}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                              <span className={cn("text-sm font-bold", isToday ? "text-rose-500" : "text-foreground")}>{d.getDate()}</span>
                           </div>

                           {/* Blocks for this day */}
                           {blocks.filter(b => b.dayOffset === colIndex).map(block => (
                             <div
                               key={block.id}
                               className={cn(
                                 "absolute border-l-4 p-2 flex flex-col justify-start overflow-hidden group cursor-pointer transition-all backdrop-blur-md shadow-sm hover:shadow-md z-10",
                                 blockColors[block.type].replace("bg-", "bg-opacity-80 bg-").replace("border-", "border-"),
                                 block.type === "deep-work" ? "border-l-indigo-500" : block.type === "meeting" ? "border-l-amber-500" : block.type === "admin" ? "border-l-emerald-500" : "border-l-muted-foreground"
                               )}
                               style={{
                                 top: block.startHr * pxPerHour,
                                 height: (block.endHr - block.startHr) * pxPerHour,
                                 left: "2px",
                                 right: "8px",
                               }}
                             >
                               <span className="text-[10px] font-bold tracking-tight leading-none text-foreground truncate">{block.title}</span>
                               <div className="flex items-center gap-1.5 mt-1 opacity-80 overflow-hidden">
                                  <span className="text-[8px] font-mono uppercase tracking-widest truncate">{block.startHr.toString().replace('.5', ':30')} - {block.endHr.toString().replace('.5', ':30')}</span>
                               </div>
                             </div>
                           ))}

                           {/* Empty Hover slots */}
                           {hours.map((h) => (
                             <div key={`h-hover-${h}`} className="absolute w-full h-[80px] opacity-0 hover:opacity-100 bg-foreground/[0.02] cursor-crosshair z-0 transition-opacity" style={{ top: h * pxPerHour }} />
                           ))}
                         </div>
                       )
                    })}
                  </div>
                </div>
              )}

              {/* Month View Placeholder */}
              {view === "month" && (
                <div className="p-6 h-full flex flex-col">
                  <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/20 flex-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                      <div key={d} className="bg-muted/10 p-2 text-center text-[10px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/20">{d}</div>
                    ))}
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div key={i} className="bg-background hover:bg-muted/5 transition-colors p-2 flex flex-col items-end">
                        <span className={cn("text-[10px] font-mono", i === 12 ? "bg-rose-500 text-background px-1.5 py-0.5 -mr-1 -mt-1 font-bold" : "text-muted-foreground")}>{i + 1 > 31 ? i - 30 : i + 1}</span>
                        {i === 12 && <div className="mt-auto w-full h-1 bg-indigo-500/50" />}
                        {i === 14 && <div className="mt-auto w-full h-1 bg-amber-500/50" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Year View Placeholder */}
              {view === "year" && (
                <div className="p-6 grid grid-cols-3 xl:grid-cols-4 gap-6 h-full overflow-y-auto content-start">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                    <div key={m} className="flex flex-col gap-2">
                       <span className="text-[12px] font-bold text-foreground border-b border-border/20 pb-1">{m} 2026</span>
                       <div className="grid grid-cols-7 gap-1">
                         {Array.from({ length: 31 }).map((_, j) => (
                           <div key={j} className={cn("aspect-square w-full flex items-center justify-center text-[8px] font-mono", (i===3 && j===12) ? "bg-rose-500 text-background font-bold rounded-sm" : "text-muted-foreground/60")}>
                             {j+1}
                           </div>
                         ))}
                       </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* ─── RIGHT: MINI CALENDAR & LISTS ─── */}
          <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
            
            {/* Command List (Execution) */}
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
                {commands.map(cmd => {
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
                            <span className="text-[8px] font-mono uppercase tracking-widest text-indigo-400/70 truncate max-w-[120px]">↪ {linkedObj.title}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setCommands(prev => prev.filter(c => c.id !== cmd.id))} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-500 shrink-0"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                    </div>
                  );
                })}
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

            {/* Objective Focus Panel */}
            <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0 max-h-[45%] overflow-hidden">
              <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
                <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
                  <Target className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> Objective Focus
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">{objectives.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* "None" clear option */}
                {focusedObjId && (
                  <button onClick={() => setFocusedObjId(null)} className="w-full flex items-center gap-2 px-4 py-2 text-left border-b border-border/10 text-muted-foreground hover:text-foreground transition-colors">
                    <span className="text-[9px] font-mono uppercase tracking-widest">× Clear Focus</span>
                  </button>
                )}
                {objectives.map(obj => (
                  <button key={obj.id} onClick={() => setFocusedObjId(obj.id === focusedObjId ? null : obj.id)}
                    className={cn("w-full flex flex-col gap-1 px-4 py-2.5 border-b border-border/10 last:border-0 text-left transition-all",
                      obj.id === focusedObjId ? "bg-foreground/5 border-l-[2px] border-l-foreground" : "hover:bg-muted/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[10px] font-semibold truncate max-w-[180px]", obj.id === focusedObjId ? "text-foreground" : "text-muted-foreground")}>{obj.title}</span>
                      <span className="text-[9px] font-mono tabular-nums text-muted-foreground">{obj.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-border/20">
                      <div className={cn("h-full transition-all", obj.status === "on-track" ? "bg-emerald-500/60" : obj.status === "at-risk" ? "bg-amber-500/60" : "bg-rose-500/60")} style={{ width: `${obj.progress}%` }} />
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
                  <div key={i} className="group flex items-center justify-between p-2 lg:p-2.5 border border-border/20 bg-background hover:border-border/40 transition-colors">
                     <span className="text-[11px] font-medium text-foreground pr-2 leading-tight flex-1">{item}</span>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => pushCommandFromInbox(item, i)} title="Add to Commands" className="p-1 text-muted-foreground hover:text-foreground bg-muted/30"><ListChecks className="h-3 w-3 stroke-[2]" /></button>
                        <button onClick={() => scheduleFromInbox(item, i)} title="Schedule on Calendar" className="p-1 text-muted-foreground hover:text-emerald-500 bg-muted/30"><CalendarIcon className="h-3 w-3 stroke-[2]" /></button>
                     </div>
                  </div>
                ))}
                {addingInbox && (
                  <InlineInput placeholder="Drop quick thought..." onSubmit={v => { setInbox(prev => [...prev, v]); setAddingInbox(false); }} onCancel={() => setAddingInbox(false)} />
                )}
                {inbox.length === 0 && <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block text-center mt-4">Inbox Empty</span>}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MATRIX MODAL PORTAL */}
      {matrixOpen && (
        <MatrixModal matrix={matrix} setMatrix={setMatrix} onClose={() => setMatrixOpen(false)} onPush={(title) => {
          setCommands(prev => [...prev, { id: uid(), title, done: false }]);
          setMatrixOpen(false);
        }} />
      )}
    </>
  );
}
