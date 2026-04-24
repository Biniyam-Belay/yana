"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Search, Tag, FolderOpen, Database, Lock, Clock, Plus, Filter, MoreVertical, Archive, ShieldCheck, FileText, Blocks, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: string[] = [];

const MOCK_DATA: Record<string, number> = {};

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

export default function VaultPage() {
  return (
    <Suspense fallback={<div className="p-4 text-[10px] font-mono uppercase text-muted-foreground">Initializing...</div>}>
      <VaultPageContent />
    </Suspense>
  );
}

function VaultPageContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [entryDraft, setEntryDraft] = useState("");
  const [draftEntries, setDraftEntries] = useState<{ id: string; title: string }[]>([]);
  
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
    };
    tick();
    const clockInt = setInterval(tick, 1000);
    return () => clearInterval(clockInt);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "new-entry") {
      setAddingEntry(true);
    }
  }, [searchParams]);

  const visibleCategories = CATEGORIES.filter(cat => 
    (!activeTag || activeTag === cat) &&
    cat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
      
      {/* ═══ STATUS BAR ═══ */}
  <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full bg-cyan-500 opacity-75" /><span className="relative h-1.5 w-1.5 bg-cyan-500" /></span>
            Data Vault
          </span>
          <span className="flex items-center gap-2"><Clock className="h-3 w-3 stroke-[1.5]" /> {time}</span>
          <span className="flex items-center gap-2 hidden md:flex"><ShieldCheck className="h-3 w-3 stroke-[1.5]" /> Encrypted</span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors">
          <Lock className="h-3 w-3 stroke-[2]" /> Core Locked
        </button>
      </header>

      {/* ═══ MAIN LAYOUT (Keeps Original Structure) ═══ */}
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        
        {/* PARAMS / SEARCH HEADER */}
  <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/5 border-b border-border/10">
              <Search className="h-4 w-4 text-muted-foreground stroke-[1.5]" />
              <input 
                type="text"
                placeholder="Query vault index parameters..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[11px] font-mono tracking-widest text-foreground outline-none placeholder:text-muted-foreground/40 uppercase font-medium"
              />
              <div className="flex items-center gap-2 border-l border-border/20 pl-3">
                 <span className="text-[9px] font-mono uppercase text-muted-foreground/60 tracking-widest">Filter</span>
                 <button className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"><Filter className="h-4 w-4 stroke-[1.5]" /></button>
              </div>
           </div>

           {addingEntry && (
             <div className="flex items-center gap-2 px-4 py-2 border-b border-border/10 bg-background/60">
               <FileText className="h-3.5 w-3.5 text-muted-foreground" />
               <input
                 value={entryDraft}
                 onChange={(e) => setEntryDraft(e.target.value)}
                 placeholder="Draft new vault entry..."
                 className="flex-1 bg-transparent text-[11px] font-mono tracking-widest text-foreground outline-none placeholder:text-muted-foreground/50 uppercase font-medium"
               />
               <button
                 onClick={() => {
                   if (!entryDraft.trim()) return;
                   setDraftEntries((prev) => [...prev, { id: crypto.randomUUID(), title: entryDraft.trim() }]);
                   setEntryDraft("");
                   setAddingEntry(false);
                 }}
                 className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500/10"
               >
                 Save
               </button>
               <button
                 onClick={() => { setAddingEntry(false); setEntryDraft(""); }}
                 className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-muted-foreground border border-border/30 hover:text-foreground"
               >
                 Cancel
               </button>
             </div>
           )}

           {/* TAGS ROW */}
           <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
             <button 
                onClick={() => setActiveTag(null)}
                className={cn(
                  "shrink-0 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest transition-colors flex items-center gap-1.5",
                  activeTag === null 
                    ? "bg-foreground text-background" 
                    : "bg-muted/10 border border-border/20 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3 w-3 stroke-[2]" /> All Indexed
              </button>
             {CATEGORIES.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveTag(cat)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.2em] transition-colors flex items-center gap-1.5",
                    activeTag === cat 
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50" 
                      : "bg-muted/10 border border-border/20 text-muted-foreground hover:border-cyan-500/30 hover:text-cyan-400"
                  )}
                >
                  <Tag className="h-3 w-3 stroke-[2]" /> {cat}
                </button>
             ))}
           </div>
        </div>

        {/* VAULT GRID */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
        <SectionHead 
              title="Knowledge Structures" 
              icon={Archive} 
              badge={<span className="text-[9px] font-mono uppercase text-muted-foreground tabular-nums text-cyan-500/80">{visibleCategories.length} Active Partitions</span>} 
          action={<button onClick={() => setAddingEntry(true)} className="p-1 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3 stroke-[1.5]" /></button>}
           />
           
           <div className="flex-1 overflow-y-auto p-4 scrollbar-hide bg-muted/5 z-0 relative">
              
              {/* Subtle Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
            {draftEntries.map((entry) => (
             <div
               key={entry.id}
               className="group flex flex-col p-4 bg-background border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-300 cursor-pointer relative overflow-hidden"
             >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="h-8 w-8 border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-emerald-500/80" />
                </div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-500/70 border border-emerald-500/20 px-2 py-0.5 uppercase">Draft</span>
              </div>
              <div className="flex flex-col relative z-10 mt-2">
                <h4 className="text-[13px] font-bold tracking-tight text-foreground truncate">{entry.title}</h4>
                <span className="text-[9px] font-mono text-emerald-500/70 uppercase tracking-widest mt-1">New Entry</span>
              </div>
             </div>
            ))}
            {visibleCategories.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                No vault categories yet
              </div>
            )}
            {visibleCategories.map((cat) => {
                   const entriesCount = MOCK_DATA[cat as keyof typeof MOCK_DATA] || 0;
                   return (
                     <div 
                        key={cat} 
                        className="group flex flex-col p-4 bg-background border border-border/20 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                     >
                       {/* Hover Glow */}
                       <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                       <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="h-8 w-8 border border-border/20 bg-muted/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                             <FolderOpen className="h-4 w-4 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                          </div>
                          <span className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground/50 border border-border/10 px-2 py-0.5 uppercase">Node</span>
                       </div>
                       
                       <div className="flex flex-col relative z-10 mt-2">
                          <h4 className="text-[14px] font-bold tracking-tight text-foreground truncate">{cat}</h4>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                             {entriesCount} {entriesCount === 1 ? 'Entry' : 'Entries'}
                          </span>
                       </div>

                       {/* Progress Bar styled indicator */}
                       <div className="mt-4 h-1 w-full bg-muted/20 relative z-10 overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-cyan-500/60 transition-transform duration-700 ease-out -translate-x-full group-hover:translate-x-0" style={{ width: '100%' }} />
                       </div>
                     </div>
                   );
                 })}
              </div>

              {visibleCategories.length === 0 && (
                <div className="w-full py-16 flex flex-col items-center justify-center relative z-10">
                   <Database className="h-8 w-8 text-muted-foreground/20 mb-4" />
                   <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">0 Indexes Found for Query</span>
                </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}
