"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Wallet, Activity,
  ArrowUpRight, ArrowDownRight, Building2,
  Plus, Trash2, Check, X,
  Target, ShieldCheck,
  Gauge, ArrowRightLeft,
  Landmark, Smartphone, LineChart, Bitcoin,
  Clock,
  Radio, Orbit, GripVertical, CheckCircle2, Circle, Pencil, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  FinancialAccountRow,
  FinancialFlowRow,
} from "@/lib/supabase/types";

// ─── TYPES ───
type AccountType = "liquid" | "investment";
type FlowType = "income" | "expense";

interface Account { id: string; name: string; type: AccountType; balance: number; currency: string; health: number; iconType?: string; }
interface Flow { id: string; name: string; type: FlowType; amount: number; frequency: string; category: string; active: boolean; }
interface AccountDraft { name: string; balance: string; currency: string; health: string; iconType: string; }
interface FlowDraft { name: string; amount: string; frequency: string; category: string; }

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2, 11));

const formatCurrency = (val: number, cur: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: cur, maximumFractionDigits: 0
  }).format(val);
};

const ICON_OPTIONS = ["bank", "mobile", "stock", "crypto", "wallet"] as const;
const ACCOUNT_CURRENCIES = ["USD", "ETB", "EUR", "GBP"] as const;
const FLOW_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly"] as const;
const FINANCIAL_CACHE_KEY = "yana_financial_cache_v1";

const newAccountDraft = (): AccountDraft => ({
  name: "",
  balance: "0",
  currency: "USD",
  health: "100",
  iconType: "bank",
});

const newFlowDraft = (): FlowDraft => ({
  name: "",
  amount: "0",
  frequency: "monthly",
  category: "Uncategorized",
});

const parseNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const maskCurrency = (val: number, cur: string, hidden: boolean) => {
  if (!hidden) return formatCurrency(val, cur);
  return `${cur} ••••`;
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
            <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 truncate max-w-45">{topObjective.title}</span>
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
  return (
    <Suspense fallback={<div className="p-4 text-[10px] font-mono uppercase text-muted-foreground">Initializing...</div>}>
      <FinancialArchitectureContent />
    </Suspense>
  );
}

function FinancialArchitectureContent() {
  const AUTH_RESOLVE_TIMEOUT_MS = 3000;
  const DATA_LOAD_TIMEOUT_MS = 8000;

  const searchParams = useSearchParams();
  const { northStar, northStarKRs } = useNorthStar();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);
  const [supabaseInitDone, setSupabaseInitDone] = useState(false);
  const [supabaseInitError, setSupabaseInitError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [addingAcc, setAddingAcc] = useState<AccountType | null>(null);
  const [addingFlow, setAddingFlow] = useState<FlowType | null>(null);
  const [hideAmounts, setHideAmounts] = useState(false);

  const [accountDrafts, setAccountDrafts] = useState<Record<AccountType, AccountDraft>>({
    liquid: newAccountDraft(),
    investment: { ...newAccountDraft(), iconType: "stock" },
  });
  const [flowDrafts, setFlowDrafts] = useState<Record<FlowType, FlowDraft>>({
    income: newFlowDraft(),
    expense: newFlowDraft(),
  });

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const hasLocalCacheRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FINANCIAL_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { accounts?: Account[]; flows?: Flow[] };
      const cachedAccounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      const cachedFlows = Array.isArray(parsed.flows) ? parsed.flows : [];
      if (cachedAccounts.length > 0 || cachedFlows.length > 0) {
        setAccounts(cachedAccounts);
        setFlows(cachedFlows);
        hasLocalCacheRef.current = true;
        setIsReady(true);
      }
    } catch {
      // ignore malformed cache
    }
  }, []);

  useEffect(() => {
    try {
      supabaseRef.current = createSupabaseBrowserClient();
      setSupabaseAvailable(true);
      setSupabaseInitError(null);
    } catch (error) {
      setSupabaseAvailable(false);
      setSupabaseInitError(error instanceof Error ? error.message : "Unknown Supabase initialization error");
    } finally {
      setSupabaseInitDone(true);
    }
  }, []);

  useEffect(() => {
    if (!supabaseAvailable || !supabaseRef.current) return;

    let active = true;
    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      setAuthResolved(true);
      setSyncError((previous) => previous ?? "Auth check is taking longer than expected. Showing available data.");
    }, AUTH_RESOLVE_TIMEOUT_MS);

    const resolveAuth = async () => {
      try {
        const { data: sessionData } = await supabaseRef.current!.auth.getSession();
        if (!active) return;

        const sessionUserId = sessionData.session?.user?.id ?? null;
        setSupabaseUserId(sessionUserId);
        setAuthResolved(true);

        // Best-effort refresh in background; session already unblocks rendering.
        void supabaseRef.current!.auth.getUser().then((result: { data: { user: { id: string } | null } | null }) => {
          if (!active) return;
          const latestUserId = result.data?.user?.id ?? null;
          if (latestUserId) setSupabaseUserId(latestUserId);
        });
      } catch {
        if (!active) return;
        setSupabaseUserId(null);
        setAuthResolved(true);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    void resolveAuth();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [supabaseAvailable, AUTH_RESOLVE_TIMEOUT_MS]);

  useEffect(() => {
    if (!supabaseInitDone) return;

    if (supabaseAvailable && !authResolved) {
      return;
    }

    if (!supabaseAvailable || !supabaseRef.current) {
      setSyncError(
        supabaseInitError
          ? `Database client unavailable: ${supabaseInitError}`
          : "Database client unavailable: check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      );
      setIsReady(true);
      return;
    }

    if (!supabaseUserId) {
      if (hasLocalCacheRef.current) {
        setSyncError("Signed out from live sync. Showing locally cached financial data.");
      } else {
        setAccounts([]);
        setFlows([]);
        setSyncError("Sign in to load financial workspace from database.");
      }
      setIsReady(true);
      return;
    }

    const supabase = supabaseRef.current;
    setIsReady(false);
    let cancelled = false;
    const loadTimeout = window.setTimeout(() => {
      if (cancelled) return;
      setSyncError("Finance data load timed out. Please refresh or check network connectivity.");
      setIsReady(true);
    }, DATA_LOAD_TIMEOUT_MS);

    Promise.all([
      supabase
        .from("financial_accounts")
        .select("*")
        .eq("user_id", supabaseUserId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("financial_flows")
        .select("*")
        .eq("user_id", supabaseUserId)
        .order("sort_order", { ascending: true }),
    ])
      .then(([accRes, flowRes]) => {
        if (cancelled) return;
        window.clearTimeout(loadTimeout);

        if (accRes.error || flowRes.error) {
          setSyncError("Failed to load one or more finance datasets.");
        } else {
          setSyncError(null);
        }

        const accRows = (accRes.data ?? []) as FinancialAccountRow[];
        const flowRows = (flowRes.data ?? []) as FinancialFlowRow[];

        setAccounts(accRows.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          balance: row.balance,
          currency: row.currency,
          health: row.health,
          iconType: row.icon_type ?? undefined,
        })));

        setFlows(flowRows.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          amount: row.amount,
          frequency: row.frequency,
          category: row.category,
          active: row.active,
        })));

        hasLocalCacheRef.current = accRows.length > 0 || flowRows.length > 0;

        setIsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(loadTimeout);
        setSyncError("Unexpected error while loading financial data.");
        setIsReady(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
    };
  }, [supabaseInitDone, supabaseInitError, supabaseAvailable, supabaseUserId, authResolved, DATA_LOAD_TIMEOUT_MS]);

  useEffect(() => {
    if (!isReady) return;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          FINANCIAL_CACHE_KEY,
          JSON.stringify({ accounts, flows }),
        );
        hasLocalCacheRef.current = accounts.length > 0 || flows.length > 0;
      } catch {
        // ignore cache write failures
      }
    }
    if (!supabaseUserId || !supabaseRef.current) return;

    const supabase = supabaseRef.current;

    const sync = async () => {
      const accountPayload = accounts.map((acc, index) => ({
        id: acc.id,
        user_id: supabaseUserId,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        health: acc.health,
        icon_type: acc.iconType ?? null,
        sort_order: index,
      }));

      if (accountPayload.length > 0) {
        await supabase
          .from("financial_accounts")
          .upsert(accountPayload);
      }

      const flowPayload = flows.map((flow, index) => ({
        id: flow.id,
        user_id: supabaseUserId,
        name: flow.name,
        type: flow.type,
        amount: flow.amount,
        frequency: flow.frequency,
        category: flow.category,
        active: flow.active,
        sort_order: index,
      }));

      if (flowPayload.length > 0) {
        await supabase
          .from("financial_flows")
          .upsert(flowPayload);
      }

      const [existingAcc, existingFlows] = await Promise.all([
        supabase.from("financial_accounts").select("id").eq("user_id", supabaseUserId),
        supabase.from("financial_flows").select("id").eq("user_id", supabaseUserId),
      ]);

  const existingAccIds: string[] = (existingAcc.data ?? []).map((row: { id: string }) => row.id);
  const existingFlowIds: string[] = (existingFlows.data ?? []).map((row: { id: string }) => row.id);

      const localAccIds = new Set(accountPayload.map((row) => row.id));
      const localFlowIds = new Set(flowPayload.map((row) => row.id));

  const accToDelete = existingAccIds.filter((id: string) => !localAccIds.has(id));
  const flowsToDelete = existingFlowIds.filter((id: string) => !localFlowIds.has(id));

      if (accToDelete.length > 0) {
        await supabase.from("financial_accounts").delete().eq("user_id", supabaseUserId).in("id", accToDelete);
      }

      if (flowsToDelete.length > 0) {
        await supabase.from("financial_flows").delete().eq("user_id", supabaseUserId).in("id", flowsToDelete);
      }

      setSyncError(null);
    };

    void sync().catch(() => setSyncError("Failed to persist financial updates."));
  }, [accounts, flows, isReady, supabaseUserId]);

  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "log-transaction") {
      const flowType = (searchParams.get("type") as FlowType | null) ?? "income";
      setAddingFlow(flowType === "expense" ? "expense" : "income");
    }
  }, [searchParams]);

  const metrics = useMemo(() => {
    const liquidBase = accounts.filter(a => a.type === 'liquid').reduce((s, a) => s + (a.currency === 'USD' ? a.balance * 56 : a.balance), 0);
    const mrr = flows.filter(f => f.type === 'income' && f.active).reduce((s, f) => s + f.amount, 0);
    const burn = flows.filter(f => f.type === 'expense' && f.active).reduce((s, f) => s + f.amount, 0);
    const savingsRate = mrr > 0 ? ((mrr - burn) / mrr) * 100 : 0;
    const runway = burn > 0 ? (liquidBase / (burn * 56)) : 99;
    return { liquidBase, mrr, burn, savingsRate, runway };
  }, [accounts, flows]);

  const flowCategoryGraph = useMemo(() => {
    const rows = new Map<string, { category: string; income: number; expense: number; net: number }>();

    flows
      .filter((flow) => flow.active)
      .forEach((flow) => {
        const key = flow.category?.trim() || "Uncategorized";
        const existing = rows.get(key) ?? { category: key, income: 0, expense: 0, net: 0 };
        if (flow.type === "income") {
          existing.income += flow.amount;
          existing.net += flow.amount;
        } else {
          existing.expense += flow.amount;
          existing.net -= flow.amount;
        }
        rows.set(key, existing);
      });

    return Array.from(rows.values())
      .sort((a, b) => Math.max(b.income, b.expense) - Math.max(a.income, a.expense))
      .slice(0, 8);
  }, [flows]);

  const graphMax = useMemo(() => {
    const biggest = flowCategoryGraph.reduce((max, row) => Math.max(max, row.income, row.expense), 0);
    return biggest > 0 ? biggest : 1;
  }, [flowCategoryGraph]);

  const accountAllocation = useMemo(() => {
    const total = accounts.reduce((sum, account) => sum + Math.max(account.balance, 0), 0);
    return {
      total,
      rows: accounts
        .slice()
        .sort((a, b) => b.balance - a.balance)
        .map((account) => ({
          ...account,
          ratio: total > 0 ? (account.balance / total) * 100 : 0,
        })),
    };
  }, [accounts]);

  const activeIncomeCount = flows.filter((flow) => flow.type === "income" && flow.active).length;
  const activeExpenseCount = flows.filter((flow) => flow.type === "expense" && flow.active).length;

  const addFlowFromDraft = (type: FlowType) => {
    const draft = flowDrafts[type];
    const name = draft.name.trim();
    if (!name) {
      setSyncError(`Enter a ${type} name before adding.`);
      return;
    }

    setFlows((prev) => [
      ...prev,
      {
        id: uid(),
        type,
        name,
        amount: Math.max(0, parseNumber(draft.amount, 0)),
        frequency: draft.frequency,
        category: draft.category.trim() || "Uncategorized",
        active: true,
      },
    ]);

    setFlowDrafts((prev) => ({ ...prev, [type]: newFlowDraft() }));
    setAddingFlow(null);
    setSyncError(null);
  };

  if (!isReady) {
    return (
      <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">
        <div className="h-8 w-48 bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr_360px] gap-4 flex-1 min-h-0">
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
          <div className="h-full bg-muted/20 animate-pulse border border-border/20" />
        </div>
      </div>
    );
  }

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
          <span className="hidden items-center gap-2 md:flex"><ShieldCheck className="h-3 w-3 stroke-[1.5]" /> Operational</span>
          <span className="hidden items-center gap-2 lg:flex"><Activity className="h-3 w-3 stroke-[1.5]" /> Burn Rate: ${metrics.burn}/mo</span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors">
          <Radio className="h-3 w-3 stroke-2 animate-pulse" /> Uplink Active
        </button>
      </header>

      {/* ═══ NORTH STAR ALIGNMENT ═══ */}
      <NorthStarStrip />

      {syncError && (
        <div className="shrink-0 border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-amber-500">
          {syncError}
        </div>
      )}

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[400px_1fr_360px] gap-4 overflow-hidden">

        {/* ─── COLUMN 1: ALLOCATION NODES ─── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">
            <SectionHead
              title="Allocation Nodes"
              icon={Building2}
              action={
                <button
                  onClick={() => setHideAmounts((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 border border-border/30 text-[8px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  {hideAmounts ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {hideAmounts ? "Show" : "Hide"}
                </button>
              }
            />
            
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-hide py-2">
              {/* Core Financial Readout */}
              <div className="px-4 py-3 border-b border-border/10 mb-2">
                <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-muted-foreground/60">Net Liquidity (ETB Base)</span>
                <div className="text-4xl font-extralight tracking-tighter tabular-nums leading-none mt-1 mb-3">
                  {hideAmounts ? "••••••" : metrics.liquidBase.toLocaleString()}
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
                      <div key={acc.id} className="group px-4 py-3 border-b border-border/5 hover:bg-muted/10 transition-colors bg-background/50 object-contain shrink-0">
                        {editingAccountId === acc.id ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="col-span-2 text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Name</label>
                            <input
                              value={acc.name}
                              onChange={(event) => setAccounts((prev) => prev.map((item) => item.id === acc.id ? { ...item, name: event.target.value } : item))}
                              className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                            />

                            <label className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Balance</label>
                            <label className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Currency</label>
                            <input
                              type="number"
                              value={acc.balance}
                              onChange={(event) => setAccounts((prev) => prev.map((item) => item.id === acc.id ? { ...item, balance: parseNumber(event.target.value) } : item))}
                              className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                            />
                            <select
                              value={acc.currency}
                              onChange={(event) => setAccounts((prev) => prev.map((item) => item.id === acc.id ? { ...item, currency: event.target.value } : item))}
                              className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                            >
                              {ACCOUNT_CURRENCIES.map((currency) => (
                                <option key={currency} value={currency}>{currency}</option>
                              ))}
                            </select>

                            <label className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Health %</label>
                            <label className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Icon</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={acc.health}
                              onChange={(event) => setAccounts((prev) => prev.map((item) => item.id === acc.id ? { ...item, health: Math.max(0, Math.min(100, parseNumber(event.target.value, 100))) } : item))}
                              className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                            />
                            <select
                              value={acc.iconType ?? "wallet"}
                              onChange={(event) => setAccounts((prev) => prev.map((item) => item.id === acc.id ? { ...item, iconType: event.target.value } : item))}
                              className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                            >
                              {ICON_OPTIONS.map((icon) => (
                                <option key={icon} value={icon}>{icon}</option>
                              ))}
                            </select>

                            <div className="col-span-2 flex items-center justify-end gap-2 pt-1">
                              <button onClick={() => setEditingAccountId(null)} className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-border/20 hover:bg-muted/40">
                                Done
                              </button>
                              <button onClick={() => {
                                setAccounts((prev) => prev.filter((item) => item.id !== acc.id));
                                setEditingAccountId(null);
                              }} className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-rose-500/30 text-rose-500 hover:bg-rose-500/10">
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center justify-center group-hover:scale-105 transition-transform">
                                {getAccountIcon(acc.iconType)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h4 className="text-[11px] font-medium tracking-tight text-foreground/90 truncate">{acc.name}</h4>
                                <span className="text-[8px] font-mono text-muted-foreground uppercase">{acc.currency} NODE · health {acc.health}%</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-semibold tabular-nums tracking-tight">{maskCurrency(acc.balance, acc.currency, hideAmounts)}</span>
                              <div className="h-1 w-16 bg-muted/30 mt-1 ml-auto overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${acc.health}%` }} />
                              </div>
                            </div>
                            <button onClick={() => setEditingAccountId(acc.id)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {addingAcc === type && (
                      <div className="px-4 py-3 border-b border-border/5 bg-background/70 grid grid-cols-2 gap-2">
                        <input
                          placeholder="Channel name"
                          value={accountDrafts[type].name}
                          onChange={(event) => setAccountDrafts((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], name: event.target.value },
                          }))}
                          className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                        />
                        <input
                          placeholder="Balance"
                          type="number"
                          value={accountDrafts[type].balance}
                          onChange={(event) => setAccountDrafts((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], balance: event.target.value },
                          }))}
                          className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                        />
                        <select
                          value={accountDrafts[type].currency}
                          onChange={(event) => setAccountDrafts((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], currency: event.target.value },
                          }))}
                          className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                        >
                          {ACCOUNT_CURRENCIES.map((currency) => (
                            <option key={currency} value={currency}>{currency}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Health 0-100"
                          type="number"
                          value={accountDrafts[type].health}
                          onChange={(event) => setAccountDrafts((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], health: event.target.value },
                          }))}
                          className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                        />
                        <select
                          value={accountDrafts[type].iconType}
                          onChange={(event) => setAccountDrafts((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], iconType: event.target.value },
                          }))}
                          className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                        >
                          {ICON_OPTIONS.map((icon) => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                        <div className="col-span-2 flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              const draft = accountDrafts[type];
                              const name = draft.name.trim();
                              if (!name) {
                                return;
                              }
                              setAccounts((prev) => [
                                ...prev,
                                {
                                  id: uid(),
                                  name,
                                  type,
                                  balance: parseNumber(draft.balance, 0),
                                  currency: draft.currency,
                                  health: Math.max(0, Math.min(100, parseNumber(draft.health, 100))),
                                  iconType: draft.iconType,
                                },
                              ]);
                              setAccountDrafts((prev) => ({
                                ...prev,
                                [type]: {
                                  ...newAccountDraft(),
                                  iconType: type === "liquid" ? "bank" : "stock",
                                },
                              }));
                              setAddingAcc(null);
                            }}
                            className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                          >
                            <Check className="mr-1 inline h-3 w-3" /> Add Channel
                          </button>
                          <button onClick={() => setAddingAcc(null)} className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-border/20 hover:bg-muted/40">
                            <X className="mr-1 inline h-3 w-3" /> Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {accounts.filter(a => a.type === type).length === 0 && addingAcc !== type && (
                      <div className="px-4 py-3 border-b border-border/5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
                        No {type === "liquid" ? "fiat" : "investment"} nodes yet.
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
          
          <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm grow min-h-0 overflow-hidden relative">
            <SectionHead 
              title="Cashflow Intelligence" 
              icon={Orbit} 
              badge={<span className="text-[9px] font-mono text-muted-foreground uppercase">Live from active flows</span>} 
            />

            <div className="flex-1 p-4 flex flex-col relative">
              <div className="shrink-0 grid grid-cols-3 gap-2 border-b border-border/10 pb-3 mb-3">
                <div className="border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
                  <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Income Streams</p>
                  <p className="text-[13px] font-semibold text-emerald-500">{activeIncomeCount}</p>
                </div>
                <div className="border border-rose-500/20 bg-rose-500/5 px-2 py-1.5">
                  <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Expense Lines</p>
                  <p className="text-[13px] font-semibold text-rose-500">{activeExpenseCount}</p>
                </div>
                <div className="border border-indigo-500/20 bg-indigo-500/5 px-2 py-1.5">
                  <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Net Monthly</p>
                  <p className={cn("text-[13px] font-semibold", metrics.mrr - metrics.burn >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    ${Math.round(metrics.mrr - metrics.burn).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-45 overflow-y-auto pr-1">
                {flowCategoryGraph.length === 0 ? (
                  <div className="h-full flex items-center justify-center border border-border/20 bg-background/60 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
                    Add income and expense lines to render your live cashflow graph.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {flowCategoryGraph.map((row) => (
                      <div key={row.category} className="border border-border/20 bg-background/60 p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-foreground truncate">{row.category}</span>
                          <span className={cn("text-[10px] font-mono", row.net >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            Net {row.net >= 0 ? "+" : ""}${Math.round(row.net).toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-[8px] font-mono uppercase tracking-widest text-emerald-500">Income</span>
                            <div className="flex-1 h-2 bg-muted/20 overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(row.income / graphMax) * 100}%` }} />
                            </div>
                            <span className="w-16 text-right text-[9px] font-mono text-emerald-500">{hideAmounts ? "••••" : `$${Math.round(row.income)}`}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-14 text-[8px] font-mono uppercase tracking-widest text-rose-500">Expense</span>
                            <div className="flex-1 h-2 bg-muted/20 overflow-hidden">
                              <div className="h-full bg-rose-500" style={{ width: `${(row.expense / graphMax) * 100}%` }} />
                            </div>
                            <span className="w-16 text-right text-[9px] font-mono text-rose-500">{hideAmounts ? "••••" : `$${Math.round(row.expense)}`}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-border/10 pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Account Allocation</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{accounts.length} channels</span>
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {accountAllocation.rows.length === 0 ? (
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">No channels yet.</p>
                  ) : accountAllocation.rows.map((account) => (
                    <div key={account.id} className="flex items-center gap-2">
                      <div className="w-28 truncate text-[9px] font-mono uppercase tracking-widest text-foreground/80">{account.name}</div>
                      <div className="flex-1 h-1.5 bg-muted/20 overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${account.ratio}%` }} />
                      </div>
                      <div className="w-16 text-right text-[9px] font-mono text-muted-foreground">{account.ratio.toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
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
                    <div key={f.id} className="group px-4 py-2.5 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors">
                      {editingFlowId === f.id ? (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={f.name}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, name: event.target.value } : flow))}
                            className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                          />
                          <input
                            type="number"
                            value={f.amount}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, amount: parseNumber(event.target.value) } : flow))}
                            className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                          />
                          <input
                            value={f.category}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, category: event.target.value } : flow))}
                            className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                          />
                          <select
                            value={f.frequency}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, frequency: event.target.value } : flow))}
                            className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                          >
                            {FLOW_FREQUENCIES.map((frequency) => (
                              <option key={frequency} value={frequency}>{frequency}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={f.active}
                              onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, active: event.target.checked } : flow))}
                            />
                            Active
                          </label>
                          <div className="col-span-2 flex justify-end gap-2">
                            <button onClick={() => setEditingFlowId(null)} className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-border/20 hover:bg-muted/40">Done</button>
                            <button
                              onClick={() => {
                                setFlows((prev) => prev.filter((flow) => flow.id !== f.id));
                                setEditingFlowId(null);
                              }}
                              className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button onClick={() => setFlows(prev => prev.map(flow => flow.id === f.id ? { ...flow, active: !flow.active } : flow))} className="shrink-0">
                            {f.active ? <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-emerald-500/60" /> : <Circle className="h-3.5 w-3.5 stroke-[1.5] text-muted-foreground/40 hover:text-foreground transition-colors" />}
                          </button>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className={cn("text-[11px] font-medium truncate", !f.active && "text-muted-foreground/40 line-through decoration-muted-foreground/20")}>{f.name}</span>
                            <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{f.category} · {f.frequency}</span>
                          </div>
                          <span className={cn("text-[10px] font-mono tabular-nums", f.active ? "text-emerald-500 font-bold" : "text-muted-foreground opacity-50")}>{hideAmounts ? "••••" : `$${f.amount}`}</span>
                          <button onClick={() => setEditingFlowId(f.id)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"><Pencil className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {addingFlow === "income" && (
                    <form
                      className="px-4 py-3 border-b border-border/5 bg-background/70 grid grid-cols-2 gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addFlowFromDraft("income");
                      }}
                    >
                      <input
                        value={flowDrafts.income.name}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, income: { ...prev.income, name: event.target.value } }))}
                        placeholder="Income name"
                        className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                      />
                      <input
                        type="number"
                        value={flowDrafts.income.amount}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, income: { ...prev.income, amount: event.target.value } }))}
                        placeholder="Amount"
                        className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                      />
                      <input
                        value={flowDrafts.income.category}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, income: { ...prev.income, category: event.target.value } }))}
                        placeholder="Category"
                        className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                      />
                      <select
                        value={flowDrafts.income.frequency}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, income: { ...prev.income, frequency: event.target.value } }))}
                        className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                      >
                        {FLOW_FREQUENCIES.map((frequency) => (
                          <option key={frequency} value={frequency}>{frequency}</option>
                        ))}
                      </select>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button
                          type="submit"
                          className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                        >
                          <Check className="mr-1 inline h-3 w-3" /> Add Income
                        </button>
                        <button type="button" onClick={() => setAddingFlow(null)} className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-border/20 hover:bg-muted/40">
                          <X className="mr-1 inline h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  {flows.filter(f => f.type === "income").length === 0 && addingFlow !== "income" && (
                    <div className="px-4 py-3 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
                      No income streams configured.
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
                    <div key={f.id} className="group px-4 py-2.5 border-b border-border/5 last:border-0 hover:bg-muted/15 transition-colors">
                      {editingFlowId === f.id ? (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={f.name}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, name: event.target.value } : flow))}
                            className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                          />
                          <input
                            type="number"
                            value={f.amount}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, amount: parseNumber(event.target.value) } : flow))}
                            className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                          />
                          <input
                            value={f.category}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, category: event.target.value } : flow))}
                            className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                          />
                          <select
                            value={f.frequency}
                            onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, frequency: event.target.value } : flow))}
                            className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                          >
                            {FLOW_FREQUENCIES.map((frequency) => (
                              <option key={frequency} value={frequency}>{frequency}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={f.active}
                              onChange={(event) => setFlows((prev) => prev.map((flow) => flow.id === f.id ? { ...flow, active: event.target.checked } : flow))}
                            />
                            Active
                          </label>
                          <div className="col-span-2 flex justify-end gap-2">
                            <button onClick={() => setEditingFlowId(null)} className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-border/20 hover:bg-muted/40">Done</button>
                            <button
                              onClick={() => {
                                setFlows((prev) => prev.filter((flow) => flow.id !== f.id));
                                setEditingFlowId(null);
                              }}
                              className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button onClick={() => setFlows(prev => prev.map(flow => flow.id === f.id ? { ...flow, active: !flow.active } : flow))} className="shrink-0">
                            {f.active ? <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-rose-500/60" /> : <Circle className="h-3.5 w-3.5 stroke-[1.5] text-muted-foreground/40 hover:text-foreground transition-colors" />}
                          </button>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className={cn("text-[11px] font-medium truncate", !f.active && "text-muted-foreground/40 line-through decoration-muted-foreground/20")}>{f.name}</span>
                            <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">{f.category} · {f.frequency}</span>
                          </div>
                          <span className={cn("text-[10px] font-mono tabular-nums", f.active ? "text-rose-500 font-bold" : "text-muted-foreground opacity-50")}>{hideAmounts ? "••••" : `$${f.amount}`}</span>
                          <button onClick={() => setEditingFlowId(f.id)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"><Pencil className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {addingFlow === "expense" && (
                    <form
                      className="px-4 py-3 border-b border-border/5 bg-background/70 grid grid-cols-2 gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        addFlowFromDraft("expense");
                      }}
                    >
                      <input
                        value={flowDrafts.expense.name}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, expense: { ...prev.expense, name: event.target.value } }))}
                        placeholder="Expense name"
                        className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                      />
                      <input
                        type="number"
                        value={flowDrafts.expense.amount}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, expense: { ...prev.expense, amount: event.target.value } }))}
                        placeholder="Amount"
                        className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                      />
                      <input
                        value={flowDrafts.expense.category}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, expense: { ...prev.expense, category: event.target.value } }))}
                        placeholder="Category"
                        className="h-7 border border-border/20 bg-background px-2 text-[11px]"
                      />
                      <select
                        value={flowDrafts.expense.frequency}
                        onChange={(event) => setFlowDrafts((prev) => ({ ...prev, expense: { ...prev.expense, frequency: event.target.value } }))}
                        className="col-span-2 h-7 border border-border/20 bg-background px-2 text-[11px]"
                      >
                        {FLOW_FREQUENCIES.map((frequency) => (
                          <option key={frequency} value={frequency}>{frequency}</option>
                        ))}
                      </select>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button
                          type="submit"
                          className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                        >
                          <Check className="mr-1 inline h-3 w-3" /> Add Expense
                        </button>
                        <button type="button" onClick={() => setAddingFlow(null)} className="px-2 py-1 text-[9px] font-mono uppercase tracking-widest border border-border/20 hover:bg-muted/40">
                          <X className="mr-1 inline h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </form>
                  )}
                  {flows.filter(f => f.type === "expense").length === 0 && addingFlow !== "expense" && (
                    <div className="px-4 py-3 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60">
                      No burn lines configured.
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
              <span className="text-[9px] font-mono text-muted-foreground truncate max-w-30">{northStar.slice(0, 24)}…</span>
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
                  <div className={cn("h-1.25 w-1.25 shrink-0", kr.status === "on-track" ? "bg-emerald-500" : kr.status === "at-risk" ? "bg-amber-500" : "bg-rose-500")} />
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