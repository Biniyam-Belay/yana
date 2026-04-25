"use client";

import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type TimerMode = "stopwatch" | "countdown";

export type TimerSessionRecord = {
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

interface TimerContextValue {
  // Core running state
  timerRunning: boolean;
  timerSeconds: number;
  timerMode: TimerMode;
  timerPresetMinutes: number;
  timerStartedAt: string | null;
  selectedTimerTarget: string;
  customTimerTarget: string;
  timerTargetError: string | null;
  timerSessions: TimerSessionRecord[];
  supabaseUserId: string | null;

  // Setters
  setTimerMode: (m: TimerMode) => void;
  setTimerPresetMinutes: (n: number) => void;
  setSelectedTimerTarget: (t: string) => void;
  setCustomTimerTarget: (t: string) => void;
  setTimerTargetError: (e: string | null) => void;
  setTimerSessions: React.Dispatch<React.SetStateAction<TimerSessionRecord[]>>;
  setTimerRunning: (v: boolean) => void;
  setTimerSeconds: React.Dispatch<React.SetStateAction<number>>;
  setTimerStartedAt: (v: string | null) => void;
  setSupabaseUserId: (v: string | null) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

const TIMER_STATE_KEY = "yana-timer-live-state-v2";
const TIMER_SESSIONS_KEY = "yana-focus-timer-sessions-v1";

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerMode, setTimerMode] = useState<TimerMode>("countdown");
  const [timerPresetMinutes, setTimerPresetMinutes] = useState(25);
  const [selectedTimerTarget, setSelectedTimerTarget] = useState("");
  const [customTimerTarget, setCustomTimerTarget] = useState("");
  const [timerTargetError, setTimerTargetError] = useState<string | null>(null);
  const [timerSessions, setTimerSessions] = useState<TimerSessionRecord[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // ── Hydrate from localStorage on mount ──────────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    try {
      const raw = localStorage.getItem(TIMER_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.timerMode) setTimerMode(saved.timerMode);
        if (typeof saved.timerPresetMinutes === "number") setTimerPresetMinutes(saved.timerPresetMinutes);
        if (saved.selectedTimerTarget) setSelectedTimerTarget(saved.selectedTimerTarget);
        if (saved.customTimerTarget) setCustomTimerTarget(saved.customTimerTarget);
        if (saved.timerStartedAt) setTimerStartedAt(saved.timerStartedAt);

        let restoredSeconds = typeof saved.timerSeconds === "number" ? saved.timerSeconds : 0;

        // If the timer was running when we left, fast-forward elapsed time
        if (saved.timerRunning && saved.timerStartedAt) {
          const elapsed = Math.floor((Date.now() - new Date(saved.timerStartedAt).getTime()) / 1000);
          const planned = saved.timerMode === "countdown" ? (saved.timerPresetMinutes ?? 25) * 60 : null;
          restoredSeconds = planned
            ? Math.min(restoredSeconds + elapsed, planned)
            : restoredSeconds + elapsed;

          // Only resume if countdown isn't already done
          const isDone = planned ? restoredSeconds >= planned : false;
          if (!isDone) setTimerRunning(true);
        }
        setTimerSeconds(restoredSeconds);
      }
    } catch {}

    // Load sessions
    try {
      const sessRaw = localStorage.getItem(TIMER_SESSIONS_KEY);
      if (sessRaw) {
        const parsed = JSON.parse(sessRaw);
        if (Array.isArray(parsed)) setTimerSessions(parsed.slice(0, 150));
      }
    } catch {}
  }, []);

  // ── Persist live-state on every meaningful change ───────────────────────
  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
      timerSeconds,
      timerRunning,
      timerMode,
      timerPresetMinutes,
      selectedTimerTarget,
      customTimerTarget,
      timerStartedAt,
    }));
  }, [timerSeconds, timerRunning, timerMode, timerPresetMinutes, selectedTimerTarget, customTimerTarget, timerStartedAt]);

  // ── Persist sessions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(TIMER_SESSIONS_KEY, JSON.stringify(timerSessions));
  }, [timerSessions]);

  // ── The interval — lives here, unaffected by navigation ─────────────────
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((s) => {
        const planned = timerMode === "countdown" ? timerPresetMinutes * 60 : null;
        const next = s + 1;
        if (planned) return Math.min(next, planned);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerMode, timerPresetMinutes]);

  // ── Auto-complete countdown ─────────────────────────────────────────────
  const plannedTimerSeconds = timerMode === "countdown" ? timerPresetMinutes * 60 : null;
  useEffect(() => {
    if (timerMode !== "countdown" || !timerRunning || !plannedTimerSeconds) return;
    if (timerSeconds < plannedTimerSeconds) return;
    setTimerRunning(false);
    setTimerStartedAt(null);
  }, [timerMode, timerRunning, timerSeconds, plannedTimerSeconds]);

  return (
    <TimerContext.Provider value={{
      timerRunning, timerSeconds, timerMode, timerPresetMinutes,
      timerStartedAt, selectedTimerTarget, customTimerTarget,
      timerTargetError, timerSessions, supabaseUserId,
      setTimerMode, setTimerPresetMinutes, setSelectedTimerTarget,
      setCustomTimerTarget, setTimerTargetError, setTimerSessions,
      setTimerRunning, setTimerSeconds, setTimerStartedAt, setSupabaseUserId,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}
