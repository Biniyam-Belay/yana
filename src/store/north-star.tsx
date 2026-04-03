"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── TYPES ───
export type Status = "on-track" | "at-risk" | "behind";
export type Tier = "Decade" | "Year" | "Quarter" | "Month";

export interface KeyResult {
  id: string;
  title: string;
  progress: number;
  status: Status;
}

export interface Objective {
  id: string;
  tier: Tier;
  title: string;
  progress: number;
  status: Status;
  keyResults: KeyResult[];
}

export interface NorthStarState {
  northStar: string;
  northStarKRs: KeyResult[];
  objectives: Objective[];
}

// ─── DEFAULT DATA ───
const uid = () => Math.random().toString(36).slice(2, 9);

const defaultState: NorthStarState = {
  northStar: "Build a self-sustaining product ecosystem generating $50K MRR",
  northStarKRs: [
    { id: uid(), title: "Launch 3 revenue-generating SaaS products", progress: 67, status: "on-track" },
    { id: uid(), title: "Reach 500 paying subscribers across platforms", progress: 24, status: "at-risk" },
    { id: uid(), title: "Establish $10K/mo passive income stream", progress: 12, status: "behind" },
  ],
  objectives: [
    { id: uid(), tier: "Quarter", title: "Ship YANA v2.0 with full command center", progress: 72, status: "on-track", keyResults: [
      { id: uid(), title: "Complete dashboard UI redesign", progress: 90, status: "on-track" },
      { id: uid(), title: "Implement real-time sync engine", progress: 60, status: "at-risk" },
      { id: uid(), title: "Deploy to production cluster", progress: 40, status: "on-track" },
    ]},
    { id: uid(), tier: "Quarter", title: "Close 3 enterprise pilot contracts", progress: 33, status: "at-risk", keyResults: [
      { id: uid(), title: "Identify 10 potential enterprise leads", progress: 70, status: "on-track" },
      { id: uid(), title: "Complete enterprise feature set", progress: 20, status: "behind" },
    ]},
    { id: uid(), tier: "Month", title: "Complete auth microservice migration", progress: 85, status: "on-track", keyResults: [] },
    { id: uid(), tier: "Month", title: "Launch landing page + waitlist funnel", progress: 55, status: "on-track", keyResults: [] },
    { id: uid(), tier: "Year", title: "Establish technical blog with 50 articles", progress: 18, status: "at-risk", keyResults: [] },
  ],
};

// ─── CONTEXT ───
interface NorthStarContextValue extends NorthStarState {
  setNorthStar: (v: string) => void;
  setNorthStarKRs: React.Dispatch<React.SetStateAction<KeyResult[]>>;
  setObjectives: React.Dispatch<React.SetStateAction<Objective[]>>;
  /** Derived: avg progress of all objectives */
  avgProgress: number;
  /** Derived: composite north star progress */
  northStarProgress: number;
  /** Most relevant objective (highest progress, on-track) */
  topObjective: Objective | null;
}

const NorthStarContext = createContext<NorthStarContextValue | null>(null);

const NS_KEY = "yana_northstar";

export function NorthStarProvider({ children }: { children: React.ReactNode }) {
  const [northStar, setNorthStarText] = useState(defaultState.northStar);
  const [northStarKRs, setNorthStarKRs] = useState<KeyResult[]>(defaultState.northStarKRs);
  const [objectives, setObjectives] = useState<Objective[]>(defaultState.objectives);
  const [isReady, setIsReady] = useState(false);

  // Hydrate
  useEffect(() => {
    const stored = localStorage.getItem(NS_KEY);
    if (stored) {
      try {
        const parsed: NorthStarState = JSON.parse(stored);
        setNorthStarText(parsed.northStar || defaultState.northStar);
        setNorthStarKRs(parsed.northStarKRs || defaultState.northStarKRs);
        setObjectives(parsed.objectives || defaultState.objectives);
      } catch {}
    }
    setIsReady(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(NS_KEY, JSON.stringify({ northStar, northStarKRs, objectives }));
  }, [northStar, northStarKRs, objectives, isReady]);

  const setNorthStar = useCallback((v: string) => setNorthStarText(v), []);

  // Derived
  const avgProgress = objectives.length
    ? Math.round(objectives.reduce((s, o) => s + o.progress, 0) / objectives.length)
    : 0;
  const northStarProgress = northStarKRs.length
    ? Math.round(northStarKRs.reduce((s, k) => s + k.progress, 0) / northStarKRs.length)
    : 0;
  const topObjective = objectives.filter(o => o.status === "on-track").sort((a, b) => b.progress - a.progress)[0] ?? objectives[0] ?? null;

  return (
    <NorthStarContext.Provider value={{
      northStar, northStarKRs, objectives,
      setNorthStar, setNorthStarKRs, setObjectives,
      avgProgress, northStarProgress, topObjective,
    }}>
      {children}
    </NorthStarContext.Provider>
  );
}

export function useNorthStar() {
  const ctx = useContext(NorthStarContext);
  if (!ctx) throw new Error("useNorthStar must be used inside NorthStarProvider");
  return ctx;
}
