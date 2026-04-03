"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Wallet, TrendingUp, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Building2,
  Plus, Trash2, Check, X, BarChart3, Zap,
  Target, ShieldCheck, PieChart, Info,
  Gauge, Search, Filter, MoreVertical, ArrowRightLeft,
  Landmark, Smartphone, LineChart, Bitcoin,
  Database, Fingerprint, Lock, Globe, Clock,
  Cpu, Layers, Radio, Orbit, Sparkles, GripVertical, CheckCircle2, ChevronRight, Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";

// ─── TYPES ───
type AccountType = "liquid" | "investment";
type FlowType = "income" | "expense";

interface Account { id: string; name: string; type: AccountType; balance: number; currency: string; health: number; iconType?: string; }
interface Flow { id: string; name: string; type: FlowType; amount: number; frequency: string; category: string; active: boolean; }
interface Bucket { id: string; name: string; target: number; current: number; priority: "high"|"medium"|"low"; }

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── MOCK DATA ───
const INITIAL_ACCOUNTS: Account[] = [
  { id: uid(), name: "Chase Operating", type: "liquid", balance: 14500, currency: "USD", health: 85, iconType: "bank" },
  { id: uid(), name: "CBE Reserve", type: "liquid", balance: 850000, currency: "ETB", health: 92, iconType: "bank" },
  { id: uid(), name: "Telebirr Cash", type: "liquid", balance: 45000, currency: "ETB", health: 40, iconType: "mobile" },
  { id: uid(), name: "Vanguard ETF", type: "investment", balance: 32000, currency: "USD", health: 70, iconType: "stock" },
  { id: uid(), name: "Cold Storage", type: "investment", balance: 18500, currency: "USD", health: 99, iconType: "crypto" },
];

const INITIAL_FLOWS: Flow[] = [
  { id: uid(), name: "Client Retainers", type: "income", amount: 6500, frequency: "monthly", category: "B2B", active: true },
  { id: uid(), name: "SaaS Royalties", type: "income", amount: 1200, frequency: "monthly", category: "Passive", active: true },
  { id: uid(), name: "Server Infrastructure", type: "expense", amount: 450, frequency: "monthly", category: "DevOps", active: true },
  { id: uid(), name: "Office Leasing", type: "expense", amount: 1200, frequency: "monthly", category: "Ops", active: true },
  { id: uid(), name: "Legal Retainer", type: "expense", amount: 800, frequency: "monthly", category: "Compliance", active: false },
];

const INITIAL_BUCKETS: Bucket[] = [
  { id: uid(), name: "Emergency Fund", target: 500000, current: 400000, priority: "high" },
  { id: uid(), name: "Q3 Tax Liability", target: 120000, current: 85000, priority: "high" },
  { id: uid(), name: "New Equipment", target: 200000, current: 45000, priority: "medium" },
];

const PROJECTION_DATA = [
  { month: 'Apr', income: 4500, expense: 2100 },
  { month: 'May', income: 5200, expense: 2800 },
  { month: 'Jun', income: 4800, expense: 2300 },
  { month: 'Jul', income: 6100, expense: 2900 },
  { month: 'Aug', income: 7500, expense: 3100 },
  { month: 'Sep', income: 8200, expense: 3800 },
];

const formatCurrency = (val: number, cur: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: cur, maximumFractionDigits: 0
  }).format(val);
};

const generateSmoothCurve = (points: { x: number, y: number }[]) => {
  if (points.length === 0) return '';
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const cpX = (p1.x + p2.x) / 2;
    path += ` C ${cpX},${p1.y} ${cpX},${p2.y} ${p2.x},${p2.y}`;
  }
  return path;
};

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
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 truncate max-w-[180px]">{topObjective.title}</span>
            <div className="w-16 h-1 bg-border/20">
              <div className="h-full bg-foreground/40 transition-all duration-500" style={{ width: `${topObjective.progress}%` }} />
            </div>
            <span className="text-[9px] font-mono text-foreground tabular-nums">{topObjective.progress}%</span>
          </div>
        )}
        <div className="flex items-center gap-2 border-l border-border/20 pl-4">
          <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Exec</span>
          <span className="text-[11px] font-mono font-bold text-emerald-500 tabular-nums">{avgProgress}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED UI COMPONENTS (Match Tactical/Overview) ───

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

export default function FinancialArchitecture() {
  const { northStar, northStarKRs, objectives } = useNorthStar();
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [flows, setFlows] = useState<Flow[]>(INITIAL_FLOWS);
  const [buckets, setBuckets] = useState<Bucket[]>(INITIAL_BUCKETS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedAcc = localStorage.getItem("yana_fin_accounts");
    const storedFlows = localStorage.getItem("yana_fin_flows");
    const storedBuckets = localStorage.getItem("yana_fin_buckets");

    if (storedAcc) setAccounts(JSON.parse(storedAcc));
    if (storedFlows) setFlows(JSON.parse(storedFlows));
    if (storedBuckets) setBuckets(JSON.parse(storedBuckets));
    
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem("yana_fin_accounts", JSON.stringify(accounts));
    localStorage.setItem("yana_fin_flows", JSON.stringify(flows));
    localStorage.setItem("yana_fin_buckets", JSON.stringify(buckets));
  }, [accounts, flows, buckets, isReady]);

  const [addingAcc, setAddingAcc] = useState<AccountType | null>(null);
  const [addingFlow, setAddingFlow] = useState<FlowType | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
      setDate(now.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    const liquidBase = accounts.filter(a => a.type === 'liquid').reduce((s, a) => s + (a.currency === 'USD' ? a.balance * 56 : a.balance), 0);
    const mrr = flows.filter(f => f.type === 'income' && f.active).reduce((s, f) => s + f.amount, 0);
    const burn = flows.filter(f => f.type === 'expense' && f.active).reduce((s, f) => s + f.amount, 0);
    const savingsRate = mrr > 0 ? ((mrr - burn) / mrr) * 100 : 0;
    const runway = burn > 0 ? (liquidBase / (burn * 56)) : 99;
    return { liquidBase, mrr, burn, savingsRate, runway };
  }, [accounts, flows]);

  // Graph Calculations
  const gWidth = 800;
  const gHeight = 220;
  const maxValRaw = Math.max(...PROJECTION_DATA.flatMap(d => [d.income, d.expense]));
  const maxVal = maxValRaw * 1.15; // 15% headroom above max point to prevent stroke clipping

  const incomePoints = PROJECTION_DATA.map((d, i) => ({
    x: i * (gWidth / (PROJECTION_DATA.length - 1)),
    y: gHeight - ((d.income / maxVal) * gHeight)
  }));
  const expensePoints = PROJECTION_DATA.map((d, i) => ({
    x: i * (gWidth / (PROJECTION_DATA.length - 1)),
    y: gHeight - ((d.expense / maxVal) * gHeight)
  }));

  const incomeCurve = generateSmoothCurve(incomePoints);
  const expenseCurve = generateSmoothCurve(expensePoints);

  const getAccountIcon = (type?: string) => {
    switch (type) {
      case "bank": return <Landmark className="h-3.5 w-3.5 text-muted-foreground" />;
      case "mobile": return <Smartphone className="h-3.5 w-3.5 text-emerald-500" />;
      case "stock": return <LineChart className="h-3.5 w-3.5 text-indigo-500" />;
      case "crypto": return <Bitcoin className="h-3.5 w-3.5 text-amber-500" />;
      default: return <Wallet className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
      
      {/* ═══ STATUS BAR ═══ */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full bg-emerald-500 opacity-75" /><span className="relative h-1.5 w-1.5 bg-emerald-500" /></span>
            Capital OS
          </span>
          <span className="flex items-center gap-2"><Clock className="h-3 w-3 stroke-[1.5]" /> {time}</span>
          <span className="flex items-center gap-2 hidden md:flex"><ShieldCheck className="h-3 w-3 stroke-[1.5]" /> Operational</span>
          <span className="flex items-center gap-2 hidden lg:flex"><Activity className="h-3 w-3 stroke-[1.5]" /> Burn Rate: ${metrics.burn}/mo</span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors">
          <Radio className="h-3 w-3 stroke-[2] animate-pulse" /> Uplink Active
        </button>
      </header>

      {/* ═══ NORTH STAR ALIGNMENT ═══ */}
      <NorthStarStrip />

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[400px_1fr_360px] gap-4 overflow-hidden">

        {/* ─── COLUMN 1: ALLOCATION NODES ─── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">
            <SectionHead title="Allocation Nodes" icon={Building2} />
            
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide py-2">
              {/* Core Financial Readout */}
              <div className="px-4 py-3 border-b border-border/10 mb-2">
                <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-muted-foreground/60">Net Liquidity (ETB Base)</span>
                <div className="text-4xl font-extralight tracking-tighter tabular-nums leading-none mt-1 mb-3">
                  {metrics.liquidBase.toLocaleString()}
                </div>
                <div className="flex gap-6 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">Retention</span>
                    <span className="text-[12px] font-semibold flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-emerald-500" />
                      {metrics.savingsRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">Runway</span>
                    <span className="text-[12px] font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3 text-indigo-400" />
                      {metrics.runway.toFixed(1)} Mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Types */}
              {(['liquid', 'investment'] as AccountType[]).map((type) => (
                <div key={type} className="mb-2">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/5 border-b border-border/10">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                      <GripVertical className="h-3 w-3" /> {type === 'liquid' ? "Fiat Channels" : "Capital Exposure"}
                    </span>
                    <button onClick={() => setAddingAcc(type)} className="p-0.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex flex-col">
                    {accounts.filter(a => a.type === type).map((acc) => (
                      <div key={acc.id} className="group px-4 py-3 border-b border-border/5 hover:bg-muted/10 transition-colors flex justify-between items-center bg-background/50 object-contain shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                            {getAccountIcon(acc.iconType)}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-[11px] font-medium tracking-tight text-foreground/90">{acc.name}</h4>
                            <span className="text-[8px] font-mono text-muted-foreground uppercase">{acc.currency} NODE</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold tabular-nums tracking-tight">{formatCurrency(acc.balance, acc.currency)}</span>
                          <div className="h-1 w-12 bg-muted/30 mt-1 ml-auto overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${acc.health}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {addingAcc === type && (
                      <div className="px-2 py-2">
                        <InlineInput placeholder={`Inject ${type} node (Name Amount)...`} onSubmit={(val) => {
                          if (val) {
                            const parts = val.trim().split(' ');
                            let amount = 0;
                            let name = val;
                            if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
                              amount = Number(parts.pop());
                              name = parts.join(' ');
                            }
                            setAccounts(prev => [...prev, { id: uid(), name, type, balance: amount, currency: "USD", health: 100, iconType: type === 'liquid' ? 'bank' : 'stock' }]);
                          }
                          setAddingAcc(null);
                        }} onCancel={() => setAddingAcc(null)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── COLUMN 2: FORECAST & BUCKETS ─── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-[2] min-h-0 overflow-hidden relative">
            <SectionHead 
              title="Forecast Matrix" 
              icon={Orbit} 
              badge={<span className="text-[9px] font-mono text-muted-foreground uppercase">6 Months Forward</span>} 
            />

            <div className="flex-1 p-4 flex flex-col relative">
              {/* Clean Legend */}
              <div className="shrink-0 flex items-center gap-4 border-b border-border/10 pb-2 mb-2">
                 <div className="flex items-center gap-1.5"><div className="h-2 w-2 bg-emerald-500 rounded-none border border-emerald-500/20" /><span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Inbound</span></div>
                 <div className="flex items-center gap-1.5"><div className="h-2 w-2 bg-rose-500 rounded-none border border-rose-500/20" /><span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Burn</span></div>
              </div>

              <div className="flex-1 w-full relative min-h-[160px]">
                <svg viewBox={`0 0 ${gWidth} ${gHeight}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  {/* Areas */}
                  <path d={`${incomeCurve} L ${gWidth},${gHeight} L 0,${gHeight} Z`} fill="url(#incomeFill)" />
                  <path d={`${expenseCurve} L ${gWidth},${gHeight} L 0,${gHeight} Z`} fill="url(#expFill)" />
                  {/* Lines */}
                  <path d={incomeCurve} fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
                  <path d={expenseCurve} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="text-rose-500" />
                </svg>

                {/* Minimal Hover Points Overlay */}
                <div className="absolute inset-0 z-10 grid" style={{ gridTemplateColumns: `repeat(${PROJECTION_DATA.length}, minmax(0, 1fr))` }}>
                  {PROJECTION_DATA.map((d, i) => (
                    <div 
                      key={d.month} 
                      className="relative h-full flex justify-center group/point cursor-crosshair"
                      onMouseEnter={() => setHoveredMonth(i)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      <div className="w-[1px] h-full bg-foreground/10 opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none" />
                      
                      <div
                        className="absolute w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background opacity-0 transition-opacity duration-150 pointer-events-none z-20"
                        style={{
                          top: `calc(${((maxVal - d.income) / maxVal) * 100}% - 4px)`,
                          opacity: hoveredMonth === i ? 1 : 0,
                        }}
                      />
                      <div
                        className="absolute w-2 h-2 rounded-full bg-rose-500 ring-2 ring-background opacity-0 transition-opacity duration-150 pointer-events-none z-20"
                        style={{
                          top: `calc(${((maxVal - d.expense) / maxVal) * 100}% - 4px)`,
                          opacity: hoveredMonth === i ? 1 : 0,
                        }}
                      />
                      
                      {hoveredMonth === i && (
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background font-mono px-3 py-1.5 flex gap-3 text-[10px] whitespace-nowrap pointer-events-none z-40 transform -translate-y-2">
                           <span className="text-emerald-400 font-bold">+${d.income}</span>
                           <span className="text-rose-400 font-bold">-${d.expense}</span>
                         </div>
                      )}
                      <span className={cn(
                        "absolute -bottom-5 text-[9px] font-mono uppercase tracking-widest transition-opacity duration-200",
                        hoveredMonth === i ? "opacity-100 text-foreground font-bold" : "opacity-40 text-muted-foreground"
                      )}>{d.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead 
              title="Capital Buckets" 
              icon={Target} 
              badge={<span className="text-[9px] font-mono text-muted-foreground">{buckets.length} Active</span>} 
            />
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide">
              {buckets.map(b => {
                const progress = (b.current / b.target) * 100;
                return (
                  <div key={b.id} className="group p-3 border border-border/10 bg-background hover:bg-muted/10 transition-colors">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-[11px] font-semibold tracking-tight text-foreground truncate">{b.name}</span>
                      <span className="text-[10px] font-mono font-bold text-indigo-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/30 relative overflow-hidden mb-1.5">
                      <div className="absolute inset-y-0 left-0 bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                      <span>{formatCurrency(b.current, "ETB")} Base</span>
                      <span>Target: {formatCurrency(b.target, "ETB")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── COLUMN 3: PIPELINE NETWORK ─── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm flex-1 min-h-0 overflow-hidden">
            <SectionHead title="Execution Pipeline" icon={ArrowRightLeft} />
            
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide">
              {/* Revenue Streams */}
              <div className="border-b border-border/10">
                <div className="px-4 py-2.5 bg-muted/5 flex justify-between items-center">
                   <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-500 flex items-center gap-2"><ArrowUpRight className="h-3 w-3" /> Revenue Matrix</span>
                   <button onClick={() => setAddingFlow("income")} className="p-0.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"><Plus className="h-3 w-3" /></button>
                </div>
                <div className="flex flex-col pb-1">
                  {flows.filter(f => f.type === 'income').map(f => (
                    <div key={f.id} className="group flex items-center gap-3 px-4 py-2.5 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors">
                      <button onClick={() => setFlows(prev => prev.map(flow => flow.id === f.id ? { ...flow, active: !flow.active } : flow))} className="shrink-0">
                        {f.active ? <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-emerald-500/60" /> : <Circle className="h-3.5 w-3.5 stroke-[1.5] text-muted-foreground/40 hover:text-foreground transition-colors" />}
                      </button>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn("text-[11px] font-medium truncate", !f.active && "text-muted-foreground/40 line-through decoration-muted-foreground/20")}>{f.name}</span>
                        <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{f.category}</span>
                      </div>
                      <span className={cn("text-[10px] font-mono tabular-nums", f.active ? "text-emerald-500 font-bold" : "text-muted-foreground opacity-50")}>${f.amount}</span>
                      <button onClick={() => setFlows(prev => prev.filter(flow => flow.id !== f.id))} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-500 shrink-0 -mr-2"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                    </div>
                  ))}
                  {addingFlow === "income" && (
                    <div className="px-2 pt-2">
                      <InlineInput placeholder="Stream (Name Amount)..." onSubmit={(val) => {
                        if (val) {
                          const parts = val.trim().split(' ');
                          let amount = 0, name = val;
                          if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
                            amount = Number(parts.pop());
                            name = parts.join(' ');
                          }
                          setFlows(prev => [...prev, { id: uid(), name, type: "income", amount, frequency: "monthly", category: "Uncategorized", active: true }]);
                        }
                        setAddingFlow(null);
                      }} onCancel={() => setAddingFlow(null)} />
                    </div>
                  )}
                </div>
              </div>

              {/* Burn Matrix */}
              <div>
                <div className="px-4 py-2.5 bg-muted/5 flex justify-between items-center border-b border-border/5">
                   <span className="text-[9px] font-mono uppercase tracking-widest text-rose-500 flex items-center gap-2"><ArrowDownRight className="h-3 w-3" /> Burn Matrix</span>
                   <button onClick={() => setAddingFlow("expense")} className="p-0.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all"><Plus className="h-3 w-3" /></button>
                </div>
                <div className="flex flex-col pb-1">
                  {flows.filter(f => f.type === 'expense').map(f => (
                    <div key={f.id} className="group flex items-center gap-3 px-4 py-2.5 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors">
                      <button onClick={() => setFlows(prev => prev.map(flow => flow.id === f.id ? { ...flow, active: !flow.active } : flow))} className="shrink-0">
                        {f.active ? <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-rose-500/60" /> : <Circle className="h-3.5 w-3.5 stroke-[1.5] text-muted-foreground/40 hover:text-foreground transition-colors" />}
                      </button>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={cn("text-[11px] font-medium truncate", !f.active && "text-muted-foreground/40 line-through decoration-muted-foreground/20")}>{f.name}</span>
                        <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{f.category}</span>
                      </div>
                      <span className={cn("text-[10px] font-mono tabular-nums", f.active ? "text-rose-500 font-bold" : "text-muted-foreground opacity-50")}>${f.amount}</span>
                      <button onClick={() => setFlows(prev => prev.filter(flow => flow.id !== f.id))} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-rose-500 shrink-0 -mr-2"><Trash2 className="h-3 w-3 stroke-[1.5]" /></button>
                    </div>
                  ))}
                  {addingFlow === "expense" && (
                    <div className="px-2 pt-2">
                      <InlineInput placeholder="Burn (Name Amount)..." onSubmit={(val) => {
                        if (val) {
                          const parts = val.trim().split(' ');
                          let amount = 0, name = val;
                          if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
                            amount = Number(parts.pop());
                            name = parts.join(' ');
                          }
                          setFlows(prev => [...prev, { id: uid(), name, type: "expense", amount, frequency: "monthly", category: "Uncategorized", active: true }]);
                        }
                        setAddingFlow(null);
                      }} onCancel={() => setAddingFlow(null)} />
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* ─── MISSION FINANCE PANEL ─── */}
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm shrink-0">
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border/20">
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground font-semibold flex items-center gap-2">
                <Target className="h-3 w-3 stroke-[1.5] text-muted-foreground" /> Mission Finance
              </span>
              <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[120px]">{northStar.slice(0, 24)}…</span>
            </div>
            <div className="flex flex-col">
              {/* MRR vs North Star Target */}
              <div className="px-4 py-3 border-b border-border/10">
                <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">Monthly Recurring Revenue</span>
                <div className="flex items-end justify-between mt-1 mb-2">
                  <span className="text-[20px] font-extralight tabular-nums text-foreground">${metrics.mrr.toLocaleString()}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">of $50K target</span>
                </div>
                <div className="h-1.5 w-full bg-border/20">
                  <div 
                    className={cn("h-full transition-all duration-1000", metrics.mrr >= 50000 ? "bg-emerald-500" : metrics.mrr >= 25000 ? "bg-amber-500" : "bg-indigo-500/60")}
                    style={{ width: `${Math.min((metrics.mrr / 50000) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] font-mono text-muted-foreground">{((metrics.mrr / 50000) * 100).toFixed(1)}% to goal</span>
                  <span className="text-[8px] font-mono text-emerald-500/60">{metrics.mrr >= 50000 ? '✔ Achieved' : `$${(50000 - metrics.mrr).toLocaleString()} remaining`}</span>
                </div>
              </div>
              {/* North Star KRs mapped as financial targets */}
              {northStarKRs.map(kr => (
                <div key={kr.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 last:border-0">
                  <div className={cn("h-[5px] w-[5px] shrink-0", kr.status === "on-track" ? "bg-emerald-500" : kr.status === "at-risk" ? "bg-amber-500" : "bg-rose-500")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-medium text-foreground truncate">{kr.title}</p>
                    <div className="h-1 w-full bg-border/15 mt-1">
                      <div className={cn("h-full transition-all", kr.status === "on-track" ? "bg-emerald-500/50" : "bg-amber-500/50")} style={{ width: `${kr.progress}%` }} />
                    </div>
                  </div>
                  <span className="text-[9px] font-mono tabular-nums text-muted-foreground shrink-0">{kr.progress}%</span>
                </div>
              ))}
              {northStarKRs.length === 0 && (
                <div className="px-4 py-4 text-center">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">No KRs — set in North Star</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}