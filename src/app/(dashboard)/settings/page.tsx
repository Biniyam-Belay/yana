"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Settings, Clock, ShieldCheck, Database, SlidersHorizontal,
  User, Palette, Fingerprint, Trash2, Power, Check, AlertTriangle,
  Link, Activity, Target, Flag, RefreshCw, LogOut, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStar } from "@/store/north-star";
import { useAppStore } from "@/store";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SettingsTab = "General" | "North Star" | "Telemetry" | "Interface" | "Connectivity" | "Security" | "Danger Zone";

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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "bg-background border border-border/20 px-3 py-2 text-[11px] font-mono outline-none focus:border-foreground transition-colors w-full";
const INPUT_DISABLED = "bg-muted/10 border border-border/10 px-3 py-2 text-[11px] font-mono text-muted-foreground cursor-not-allowed w-full";

export default function SettingsPage() {
  const { northStar, northStarKRs, objectives, setNorthStar, avgProgress, northStarProgress } = useNorthStar();
  const { executionRate, focusQuality, systemHealth, stressCoefficient, alignmentScore, updateTelemetry } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  const supabase = useMemo(() => {
    try { return createSupabaseBrowserClient(); } catch { return null; }
  }, []);

  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [time, setTime] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── General ──
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── North Star ──
  const [editNS, setEditNS] = useState(northStar);
  useEffect(() => { setEditNS(northStar); }, [northStar]);

  // ── Security ──
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // ── Connectivity ──
  const [dbPing, setDbPing] = useState<"idle" | "checking" | "ok" | "err">("idle");

  // ── Danger Zone ──
  const [isWiping, setIsWiping] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load display name from user metadata on mount
  useEffect(() => {
    const saved = user?.user_metadata?.display_name ?? "";
    setDisplayName(saved);
  }, [user]);

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Handlers ──

  const handleSaveProfile = async () => {
    if (!supabase) { showToast("Supabase not configured", "err"); return; }
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
    setSavingProfile(false);
    error ? showToast(error.message, "err") : showToast("Profile updated successfully");
  };

  const handleSaveNorthStar = () => {
    setNorthStar(editNS);
    showToast("North Star mission updated");
  };

  const handleChangePassword = async () => {
    if (!supabase) { showToast("Supabase not configured", "err"); return; }
    if (newPw.length < 6) { showToast("Password must be at least 6 characters", "err"); return; }
    if (newPw !== confirmPw) { showToast("Passwords do not match", "err"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setChangingPw(false);
    if (error) { showToast(error.message, "err"); return; }
    showToast("Password updated successfully");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  };

  const handlePingDb = async () => {
    if (!supabase) { setDbPing("err"); return; }
    setDbPing("checking");
    try {
      const { error } = await supabase.auth.getSession();
      setDbPing(error ? "err" : "ok");
    } catch {
      setDbPing("err");
    }
    setTimeout(() => setDbPing("idle"), 4000);
  };

  const handleFactoryReset = async () => {
    if (wipeConfirm.toUpperCase() !== "WIPE") {
      showToast('Type "WIPE" to confirm', "err");
      return;
    }
    setIsWiping(true);

    // 1 — clear ALL app localStorage keys (nuclear clear to miss nothing)
    localStorage.clear();

    // 2 — delete from Supabase if authenticated
    if (supabase && user?.id) {
      const uid = user.id;
      const tables = [
        "tactical_matrix_items",
        "tactical_commands",
        "tactical_blocks",
        "tactical_inbox_items",
        "professional_tasks",
        "key_results",
        "objectives",
        "objective_key_results",
        "north_stars",
        "tasks",
        "time_blocks",
        "focus_timer_sessions",
        "financials",
        "financial_accounts",
        "financial_flows",
        "financial_buckets",
        "biometrics",
        "biometric_protocols",
        "biometric_intakes"
      ];
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", uid);
        if (error) console.error(`[Wipe] Failed deleting ${table}:`, error);
      }
    }

    showToast("All data wiped. Signing out…");
    setTimeout(() => signOut(), 1500);
  };

  return (
    <div className="flex h-full flex-col gap-4 min-h-0 antialiased font-sans select-none overflow-hidden bg-background text-foreground">

      {/* STATUS BAR */}
      <header className="shrink-0 flex items-center justify-between border-b border-border/30 pb-3">
        <div className="flex items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          <span className="flex items-center gap-2 text-foreground font-semibold">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute h-full w-full bg-slate-500 opacity-75" /><span className="relative h-1.5 w-1.5 bg-slate-500" /></span>
            System Preferences
          </span>
          <span className="flex items-center gap-2"><Clock className="h-3 w-3 stroke-[1.5]" /> {time}</span>
          <span className="hidden items-center gap-2 md:flex"><ShieldCheck className="h-3 w-3 stroke-[1.5]" /> {user ? "Authenticated" : "No Session"}</span>
          {user && <span className="hidden items-center gap-2 lg:flex text-foreground/60">{user.email}</span>}
        </div>
        <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors">
          <LogOut className="h-3 w-3 stroke-[2]" /> Sign Out
        </button>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 overflow-hidden">

        {/* SIDEBAR NAV */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">
          <SectionHead title="Root Parameters" icon={SlidersHorizontal} />
          <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-1 scrollbar-hide">
            {([
              { id: "General", icon: User },
              { id: "North Star", icon: Target },
              { id: "Telemetry", icon: Activity },
              { id: "Interface", icon: Palette },
              { id: "Connectivity", icon: Link },
              { id: "Security", icon: Fingerprint },
              { id: "Danger Zone", icon: AlertTriangle, danger: true },
            ] as { id: SettingsTab; icon: any; danger?: boolean }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-left relative w-full transition-all border",
                  activeTab === tab.id
                    ? tab.danger ? "bg-rose-500/10 border-rose-500/20 text-rose-500" : "bg-muted/10 border-border/20 text-foreground"
                    : "text-muted-foreground hover:bg-muted/5 border-transparent"
                )}
              >
                <tab.icon className={cn("h-3.5 w-3.5 stroke-[1.5]", activeTab === tab.id && tab.danger ? "text-rose-500" : "")} />
                <span className="text-[11px] font-mono uppercase tracking-widest font-semibold">{tab.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT PANEL */}
        <div className="flex flex-col border border-border/30 bg-background/60 backdrop-blur-sm min-h-0 overflow-hidden">
          <SectionHead title={`${activeTab} Config`} icon={Settings} />
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide bg-muted/5">

            {/* Toast */}
            {toast && (
              <div className={cn(
                "mb-6 flex items-center gap-3 px-4 py-3 border font-mono text-[10px] uppercase tracking-widest font-black animate-in slide-in-from-top-2",
                toast.type === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-500"
              )}>
                {toast.type === "ok" ? <Check className="h-3.5 w-3.5 stroke-[2]" /> : <AlertTriangle className="h-3.5 w-3.5 stroke-[2]" />}
                {toast.msg}
              </div>
            )}

            {/* ── GENERAL ── */}
            {activeTab === "General" && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1">Identity</h3>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-5">Your profile linked to this account.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Row label="Display Name">
                      <input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className={INPUT}
                      />
                    </Row>
                    <Row label="Email (read-only)">
                      <input readOnly value={user?.email ?? "—"} className={INPUT_DISABLED} />
                    </Row>
                  </div>
                  <Row label="">
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors disabled:opacity-40"
                      >
                        <Check className="h-3 w-3 stroke-[2]" />
                        {savingProfile ? "Saving…" : "Save Profile"}
                      </button>
                    </div>
                  </Row>
                </div>

                <div className="border-t border-border/10 pt-6">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-5">Account Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Row label="User ID">
                      <input readOnly value={user?.id ?? "—"} className={cn(INPUT_DISABLED, "text-[9px] tracking-widest")} />
                    </Row>
                    <Row label="Account Created">
                      <input readOnly value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"} className={INPUT_DISABLED} />
                    </Row>
                    <Row label="Last Sign In">
                      <input readOnly value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"} className={INPUT_DISABLED} />
                    </Row>
                    <Row label="Auth Provider">
                      <input readOnly value={user?.app_metadata?.provider ?? "email"} className={INPUT_DISABLED} />
                    </Row>
                  </div>
                </div>
              </div>
            )}

            {/* ── NORTH STAR ── */}
            {activeTab === "North Star" && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Mission KRs", val: `${northStarProgress}%`, sub: "avg completion" },
                    { label: "Objectives", val: `${objectives.length}`, sub: `${objectives.filter(o => o.status === "on-track").length} on track` },
                    { label: "Execution", val: `${avgProgress}%`, sub: "overall avg" },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col border border-border/20 p-4 bg-background">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60">{s.label}</span>
                      <span className="text-2xl font-extralight tabular-nums text-foreground">{s.val}</span>
                      <span className="text-[8px] font-mono text-muted-foreground/50">{s.sub}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/10 pt-6">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4"><Target className="h-4 w-4" /> Mission Statement</h3>
                  <textarea
                    value={editNS}
                    onChange={e => setEditNS(e.target.value)}
                    rows={3}
                    className="w-full bg-background border border-border/20 px-3 py-2 text-[12px] font-semibold text-foreground outline-none focus:border-foreground transition-colors resize-none tracking-tight"
                  />
                  <button
                    onClick={handleSaveNorthStar}
                    className="mt-3 flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-widest bg-foreground text-background px-4 py-2 hover:bg-foreground/90 transition-colors"
                  >
                    <Check className="h-3 w-3 stroke-[2]" /> Commit Mission
                  </button>
                </div>
                <div className="border-t border-border/10 pt-6">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4">Mission Key Results</h3>
                  {northStarKRs.length === 0 && <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">No KRs defined yet. Add them in the North Star page.</p>}
                  {northStarKRs.map(kr => (
                    <div key={kr.id} className="flex flex-col gap-2 p-4 border border-border/10 bg-background mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-foreground flex-1 pr-4">{kr.title}</span>
                        <span className="text-[11px] font-mono font-bold tabular-nums">{kr.progress}%</span>
                      </div>
                      <span className={cn("text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 self-start", kr.status === "on-track" ? "bg-emerald-500/20 text-emerald-500" : kr.status === "at-risk" ? "bg-amber-500/20 text-amber-500" : "bg-rose-500/20 text-rose-500")}>
                        {kr.status.replace("-", " ")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/10 pt-6">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4"><Flag className="h-3.5 w-3.5" /> Active Objectives</h3>
                  {objectives.length === 0 && <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">No objectives yet. Add them in the North Star page.</p>}
                  {objectives.map(obj => (
                    <div key={obj.id} className="flex items-center gap-4 p-3 border border-border/10 bg-background mb-2">
                      <div className={cn("h-2 w-2 shrink-0", obj.status === "on-track" ? "bg-emerald-500" : obj.status === "at-risk" ? "bg-amber-500" : "bg-rose-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-foreground truncate">{obj.title}</p>
                        <span className="text-[8px] font-mono text-muted-foreground uppercase">{obj.tier} · {obj.keyResults.length} KRs</span>
                      </div>
                      <span className="text-[10px] font-mono tabular-nums w-10 text-right">{obj.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TELEMETRY ── */}
            {activeTab === "Telemetry" && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-widest">Biological Machine State</h3>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-widest max-w-xl leading-relaxed">
                    Override matrix for Mission Velocity (Vm). Adjusting these streams changes layout desaturation rules, testing the Drift Protocol &amp; Critical Stasis filter.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "executionRate" as const, label: "Execution (E)", val: executionRate, color: "indigo" },
                    { key: "focusQuality" as const, label: "Focus (F)", val: focusQuality, color: "amber" },
                    { key: "systemHealth" as const, label: "Health (H)", val: systemHealth, color: "emerald" },
                    { key: "stressCoefficient" as const, label: "Tolerance (S)", val: stressCoefficient, color: "rose" },
                  ].map(({ key, label, val, color }) => (
                    <div key={key} className={`flex flex-col gap-3 p-4 bg-background border border-border/20 hover:border-${color}-500/30 transition-colors group`}>
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors font-semibold">{label}</span>
                        <span className={`text-${color}-400 font-bold`}>{(val * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.01" value={val}
                        onChange={e => updateTelemetry({ [key]: parseFloat(e.target.value) })}
                        className={`w-full h-1 bg-muted/30 appearance-none rounded-none cursor-ew-resize accent-${color}-500`}
                      />
                    </div>
                  ))}
                  <div className="flex flex-col gap-3 p-4 bg-background border border-border/20 hover:border-foreground/30 transition-colors md:col-span-2">
                    <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                      <span className="text-muted-foreground font-semibold">Alignment Score</span>
                      <span className="text-foreground font-bold">{(alignmentScore * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range" min="0" max="1" step="0.01" value={alignmentScore}
                      onChange={e => updateTelemetry({ alignmentScore: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-muted/30 appearance-none rounded-none cursor-ew-resize accent-foreground"
                    />
                    <span className="text-[8px] text-muted-foreground font-mono">Drop below 85% to trigger Drift monochromatic filter.</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── INTERFACE ── */}
            {activeTab === "Interface" && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1">Color Theme</h3>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-6">Changes apply immediately and persist across sessions.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {([
                      { val: "dark", label: "Deep Space", sub: "Dark mode", preview: "bg-zinc-950 border-zinc-800", dot: "bg-zinc-500" },
                      { val: "light", label: "High Contrast", sub: "Light mode", preview: "bg-stone-100 border-stone-200", dot: "bg-stone-400" },
                      { val: "system", label: "Auto", sub: "Follows OS", preview: "bg-gradient-to-br from-zinc-900 to-stone-100 border-border", dot: "bg-foreground" },
                    ] as { val: string; label: string; sub: string; preview: string; dot: string }[]).map(t => (
                      <button
                        key={t.val}
                        onClick={() => setTheme(t.val)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 border transition-all",
                          theme === t.val ? "border-foreground bg-muted/5" : "border-border/20 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className={cn("h-12 w-full border rounded-sm", t.preview)} />
                        <div className="text-center">
                          <p className="text-[10px] font-mono uppercase tracking-widest font-bold">{t.label}</p>
                          <p className="text-[8px] font-mono text-muted-foreground">{t.sub}</p>
                        </div>
                        {theme === t.val && <Check className="h-3 w-3 text-foreground stroke-[2]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── CONNECTIVITY ── */}
            {activeTab === "Connectivity" && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1">Database Uplink</h3>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-5">Real-time connection status to external systems.</p>
                  <div className="flex flex-col gap-3">
                    {/* Supabase — live test */}
                    <div className="flex justify-between items-center p-4 border border-border/20 bg-background">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-2.5 w-2.5 shrink-0",
                          dbPing === "ok" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" :
                          dbPing === "err" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                          dbPing === "checking" ? "bg-amber-400 animate-pulse" :
                          supabase ? "bg-emerald-500/60" : "bg-rose-500"
                        )} />
                        <div>
                          <p className="text-[11px] font-bold tracking-widest uppercase">Supabase Backend</p>
                          <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
                            {dbPing === "ok" ? "Ping successful — connection healthy" :
                             dbPing === "err" ? "Connection failed — check credentials" :
                             dbPing === "checking" ? "Pinging…" :
                             supabase ? "Client initialized" : "Not configured"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handlePingDb}
                        disabled={dbPing === "checking"}
                        className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest border border-border/20 px-3 py-1.5 hover:bg-muted/10 transition-colors disabled:opacity-40"
                      >
                        <RefreshCw className={cn("h-3 w-3", dbPing === "checking" && "animate-spin")} />
                        {dbPing === "checking" ? "Pinging" : "Ping"}
                      </button>
                    </div>

                    {/* Placeholders */}
                    {[
                      { name: "Alpha Vantage (Financial APIs)", status: "Pending Key", url: "API not configured", connected: false },
                      { name: "Health Data Bridge", status: "Disconnected", url: "No sync configured", connected: false },
                    ].map(sys => (
                      <div key={sys.name} className="flex justify-between items-center p-4 border border-border/20 bg-background opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="h-2.5 w-2.5 bg-muted-foreground/40" />
                          <div>
                            <p className="text-[11px] font-bold tracking-widest uppercase">{sys.name}</p>
                            <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{sys.url}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-widest border border-border/10 px-3 py-1 text-muted-foreground">Coming Soon</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/10 pt-6">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4">Environment Variables</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { label: "NEXT_PUBLIC_SUPABASE_URL", val: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "not set" },
                      { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", val: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "••••••••••••••••" : "not set" },
                    ].map(({ label, val }) => (
                      <Row key={label} label={label}>
                        <input readOnly value={val} className={cn(INPUT_DISABLED, "text-[9px] font-mono tracking-wider")} />
                      </Row>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SECURITY ── */}
            {activeTab === "Security" && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1">Change Password</h3>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-5">Update your Supabase authentication password.</p>
                  <div className="flex flex-col gap-4 max-w-sm">
                    <Row label="New Password">
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className={cn(INPUT, "pr-10")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </Row>
                    <Row label="Confirm New Password">
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className={INPUT}
                      />
                    </Row>
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPw || !newPw || !confirmPw}
                      className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[9px] font-mono uppercase tracking-widest hover:bg-foreground/90 transition-colors disabled:opacity-40 self-start mt-1"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {changingPw ? "Updating…" : "Update Password"}
                    </button>
                  </div>
                </div>

                <div className="border-t border-border/10 pt-6">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1">Session</h3>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-4">Terminate your current authenticated session.</p>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-4 py-2 border border-rose-500/40 text-rose-500 text-[9px] font-mono uppercase tracking-widest hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="h-3 w-3" /> Sign Out of YANA
                  </button>
                </div>
              </div>
            )}

            {/* ── DANGER ZONE ── */}
            {activeTab === "Danger Zone" && (
              <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
                <div className="border border-rose-500/30 bg-rose-500/5 p-6 relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-rose-500/10 rounded-full blur-[40px] pointer-events-none" />
                  <div className="flex items-center gap-3 mb-5 border-b border-rose-500/20 pb-4">
                    <AlertTriangle className="h-5 w-5 text-rose-500" />
                    <div>
                      <h3 className="text-[13px] font-black uppercase tracking-widest text-rose-500">Node Erase Protocol</h3>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-rose-500/60">Irreversible — clears all local cache + signs out</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-mono tracking-widest text-rose-500/80 leading-relaxed mb-6 max-w-lg">
                    This will permanently delete <strong>all your data</strong> — local cache AND Supabase records (biometrics, workouts, tasks, financials, focus sessions, north star). This action is <strong>irreversible</strong>. You will be signed out immediately.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Row label='Type "WIPE" to confirm'>
                      <input
                        value={wipeConfirm}
                        onChange={e => setWipeConfirm(e.target.value)}
                        placeholder="WIPE"
                        className="border border-rose-500/30 bg-background px-3 py-2 font-mono text-[11px] text-rose-500 uppercase tracking-widest outline-none focus:border-rose-500 transition-colors max-w-xs"
                      />
                    </Row>
                    <button
                      onClick={handleFactoryReset}
                      disabled={isWiping || wipeConfirm.toUpperCase() !== "WIPE"}
                      className="flex items-center justify-center gap-3 border border-rose-500 text-rose-500 font-mono font-black uppercase tracking-[0.2em] py-3 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isWiping ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Purging…</>
                      ) : (
                        <><Trash2 className="h-4 w-4" /> Initialize Core Wipe</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
