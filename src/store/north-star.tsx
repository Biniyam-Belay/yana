"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  NorthStarRow,
  KeyResultRow,
  ObjectiveRow,
  ObjectiveKeyResultRow,
} from "@/lib/supabase/types";

// ─── TYPES ───
export type Status = "on-track" | "at-risk" | "behind";
export type Tier = "Decade" | "Year" | "Quarter" | "Month";

export interface KeyResult {
  id: string;
  title: string;
  progress: number;
  status: Status;
  color?: string | null;
  dueDate?: string | null;
}

export interface Objective {
  id: string;
  tier: Tier;
  title: string;
  progress: number;
  status: Status;
  keyResults: KeyResult[];
  keyResultId?: string | null;
  color?: string | null;
  dueDate?: string | null;
}

export interface NorthStarState {
  northStar: string;
  northStarKRs: KeyResult[];
  objectives: Objective[];
}

// ─── DEFAULT DATA ───
const defaultState: NorthStarState = {
  northStar: "",
  northStarKRs: [],
  objectives: [],
};

// ─── CONTEXT ───
interface NorthStarContextValue extends NorthStarState {
  setNorthStar: (v: string) => void;
  setNorthStarKRs: React.Dispatch<React.SetStateAction<KeyResult[]>>;
  setObjectives: React.Dispatch<React.SetStateAction<Objective[]>>;
  deleteNorthStar: () => Promise<void>;
  isReady: boolean;
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
  const [northStarId, setNorthStarId] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);

  // Track whether we're currently hydrating to prevent premature persists
  const isHydratingRef = useRef(false);
  // Track if this is the very first persist after hydration (skip it to avoid wipe)
  const hydratedRef = useRef(false);

  const calcCompletionProgress = useCallback((items: { progress: number }[]) => {
    if (items.length === 0) return 0;
    const completed = items.filter((i) => i.progress >= 100).length;
    return Math.round((completed / items.length) * 100);
  }, []);

  const calculateStatus = useCallback((progress: number, dueDate?: string | null): Status => {
    if (progress >= 100) return "on-track";

    if (!dueDate) {
      if (progress >= 80) return "on-track";
      if (progress >= 40) return "at-risk";
      return "behind";
    }

    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 0) return "behind"; // Past due
    if (diffDays <= 7 && progress < 80) return "at-risk";
    if (diffDays <= 14 && progress < 40) return "at-risk";

    if (progress >= 80) return "on-track";
    if (progress >= 40 && diffDays > 7) return "on-track";
    if (progress < 40 && diffDays > 14) return "on-track";

    return "behind";
  }, []);

  const statusFromProgress = useCallback((progress: number): Status => {
    return calculateStatus(progress, null);
  }, [calculateStatus]);

  // Initialize Supabase client (optional)
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

  // ─── HYDRATE: load from Supabase or localStorage ───
  useEffect(() => {
    // Mark that hydration is in progress — persists must not fire during this
    isHydratingRef.current = true;
    hydratedRef.current = false;

    if (supabaseUserId && supabaseRef.current) {
      const supabase = supabaseRef.current;
      supabase
        .from("north_stars")
        .select("*")
        .eq("user_id", supabaseUserId)
        .eq("is_active", true)
        .maybeSingle()
        .then(async ({ data, error }: { data: any, error: any }) => {
          if (error) {
            console.warn("Supabase north_star fetch failed", error.message);
            isHydratingRef.current = false;
            hydratedRef.current = true;
            setIsReady(true);
            return;
          }

          let northStarRow = data as NorthStarRow | null;
          if (!northStarRow) {
            const created = await supabase
              ?.from("north_stars")
              .insert({
                user_id: supabaseUserId,
                mission_statement: defaultState.northStar,
                is_active: true,
              })
              .select("*")
              .single();
            northStarRow = (created?.data as NorthStarRow) ?? null;
          }

          if (!northStarRow) {
            isHydratingRef.current = false;
            hydratedRef.current = true;
            setIsReady(true);
            return;
          }

          setNorthStarId(northStarRow.id);
          setNorthStarText(northStarRow.mission_statement || defaultState.northStar);

          const [krResult, objResult, objKrResult] = await Promise.all([
            supabase
              .from("key_results")
              .select("*")
              .eq("user_id", supabaseUserId)
              .eq("north_star_id", northStarRow.id)
              .order("created_at", { ascending: true }),
            supabase
              .from("objectives")
              .select("*")
              .eq("user_id", supabaseUserId)
              .eq("north_star_id", northStarRow.id)
              .order("created_at", { ascending: true }),
            supabase
              .from("objective_key_results")
              .select("*")
              .eq("user_id", supabaseUserId)
              .order("created_at", { ascending: true }),
          ]);

          const krRows = (krResult.data ?? []) as KeyResultRow[];
          const objRows = (objResult.data ?? []) as ObjectiveRow[];
          const objKrRows = (objKrResult.data ?? []) as ObjectiveKeyResultRow[];

          const objKrMap = objKrRows.reduce<Record<string, ObjectiveKeyResultRow[]>>((acc, row) => {
            acc[row.objective_id] = acc[row.objective_id] || [];
            acc[row.objective_id].push(row);
            return acc;
          }, {});

          // Set all data in one synchronous pass to avoid intermediate re-renders
          setNorthStarKRs(
            krRows.map((kr) => ({
              id: kr.id,
              title: kr.title,
              progress: Number(kr.progress),
              status: kr.status,
              color: kr.color ?? null,
              dueDate: kr.due_date ?? null,
            }))
          );

          setObjectives(
            objRows.map((obj) => ({
              id: obj.id,
              tier: obj.tier,
              title: obj.title,
              progress: Number(obj.progress),
              status: obj.status,
              keyResultId: obj.key_result_id ?? null,
              color: obj.color ?? null,
              dueDate: obj.due_date ?? null,
              keyResults: (objKrMap[obj.id] ?? []).map((kr) => ({
                id: kr.id,
                title: kr.title,
                progress: Number(kr.progress),
                status: kr.status,
                color: kr.color ?? null,
                dueDate: kr.due_date ?? null,
              })),
            }))
          );

          // Hydration complete — allow persists now
          isHydratingRef.current = false;
          hydratedRef.current = true;
          setIsReady(true);
        });
      return;
    }

    // Fallback: localStorage
    const stored = localStorage.getItem(NS_KEY);
    if (stored) {
      try {
        const parsed: NorthStarState = JSON.parse(stored);
        setNorthStarText(parsed.northStar || defaultState.northStar);
        setNorthStarKRs(parsed.northStarKRs || defaultState.northStarKRs);
        setObjectives(parsed.objectives || defaultState.objectives);
      } catch {}
    }
    isHydratingRef.current = false;
    hydratedRef.current = true;
    setIsReady(true);
  }, [supabaseUserId]);

  // ─── PERSIST: sync state to Supabase or localStorage ───
  // Uses a debounce ref so rapid state changes don't trigger multiple writes.
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Never persist during hydration or before hydration has completed at least once
    if (isHydratingRef.current || !hydratedRef.current) return;
    if (!isReady) return;

    if (!supabaseUserId) {
      localStorage.setItem(NS_KEY, JSON.stringify({ northStar, northStarKRs, objectives }));
      return;
    }

    if (!supabaseRef.current) return;

    // Debounce: cancel previous pending sync and schedule a new one
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    // Capture stable references for async closure
    const capturedNorthStar = northStar;
    const capturedKRs = northStarKRs;
    const capturedObjectives = objectives;
    const capturedNorthStarId = northStarId;
    const capturedUserId = supabaseUserId;
    const capturedSupabase = supabaseRef.current;

    syncTimerRef.current = setTimeout(async () => {
      let resolvedNorthStarId = capturedNorthStarId;
      if (!resolvedNorthStarId) {
        const created = await capturedSupabase
          .from("north_stars")
          .insert({
            user_id: capturedUserId,
            mission_statement: capturedNorthStar,
            is_active: true,
          })
          .select("*")
          .single();
        resolvedNorthStarId = (created?.data as NorthStarRow | undefined)?.id ?? null;
        if (resolvedNorthStarId) setNorthStarId(resolvedNorthStarId);
      }

      if (!resolvedNorthStarId) return;

      // Upsert the north star mission statement
      await capturedSupabase
        .from("north_stars")
        .upsert({
          id: resolvedNorthStarId,
          user_id: capturedUserId,
          mission_statement: capturedNorthStar,
          is_active: true,
        });

      // ── Sync Key Results ──
      if (capturedKRs.length > 0) {
        await capturedSupabase
          .from("key_results")
          .upsert(
            capturedKRs.map((kr) => ({
              id: kr.id,
              user_id: capturedUserId,
              north_star_id: resolvedNorthStarId,
              title: kr.title,
              progress: kr.progress,
              status: kr.status,
              color: kr.color ?? null,
              due_date: kr.dueDate ?? null,  // persisted now
            }))
          );
      }

      // Delete KRs that no longer exist
      const krIds = capturedKRs.map((kr) => kr.id);
      if (krIds.length > 0) {
        await capturedSupabase
          .from("key_results")
          .delete()
          .eq("user_id", capturedUserId)
          .eq("north_star_id", resolvedNorthStarId)
          .not("id", "in", `(${krIds.join(",")})`);
      } else {
        // Only delete all KRs if we deliberately have none
        await capturedSupabase
          .from("key_results")
          .delete()
          .eq("user_id", capturedUserId)
          .eq("north_star_id", resolvedNorthStarId);
      }

      // ── Sync Objectives ──
      if (capturedObjectives.length > 0) {
        await capturedSupabase
          .from("objectives")
          .upsert(
            capturedObjectives.map((obj) => ({
              id: obj.id,
              user_id: capturedUserId,
              north_star_id: resolvedNorthStarId,
              key_result_id: obj.keyResultId ?? null,
              tier: obj.tier,
              title: obj.title,
              progress: obj.progress,
              status: obj.status,
              color: obj.color ?? null,
              due_date: obj.dueDate ?? null,
            }))
          );
      }

      // Delete objectives that no longer exist
      const objectiveIds = capturedObjectives.map((obj) => obj.id);
      if (objectiveIds.length > 0) {
        await capturedSupabase
          .from("objectives")
          .delete()
          .eq("user_id", capturedUserId)
          .eq("north_star_id", resolvedNorthStarId)
          .not("id", "in", `(${objectiveIds.join(",")})`);
      } else {
        await capturedSupabase
          .from("objectives")
          .delete()
          .eq("user_id", capturedUserId)
          .eq("north_star_id", resolvedNorthStarId);
      }

      // ── Sync Objective Key Results ──
      const objectiveKrs = capturedObjectives.flatMap((obj) =>
        obj.keyResults.map((kr) => ({
          id: kr.id,
          user_id: capturedUserId,
          objective_id: obj.id,
          title: kr.title,
          progress: kr.progress,
          status: kr.status,
          color: kr.color ?? null,
          due_date: kr.dueDate ?? null,
        }))
      );

      if (objectiveKrs.length > 0) {
        await capturedSupabase.from("objective_key_results").upsert(objectiveKrs);
      }

      const objectiveKrIds = objectiveKrs.map((kr) => kr.id);
      // Delete removed milestones per-objective to avoid wiping unrelated objectives
      for (const obj of capturedObjectives) {
        const thisObjKrIds = obj.keyResults.map((kr) => kr.id);
        if (thisObjKrIds.length > 0) {
          await capturedSupabase
            .from("objective_key_results")
            .delete()
            .eq("user_id", capturedUserId)
            .eq("objective_id", obj.id)
            .not("id", "in", `(${thisObjKrIds.join(",")})`);
        }
        // If an objective has zero milestones, don't delete anything — user may not have added any yet
      }
    }, 600); // 600ms debounce — batches rapid state changes into one write

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [northStar, northStarKRs, objectives, isReady, northStarId, supabaseUserId]);

  // ─── DERIVED CALCULATIONS ───
  // Recalculate objective progress+status whenever any keyResult's progress changes.
  // Hash only the progress values to avoid triggering on color/dueDate changes.
  const keyResultsHash = objectives
    .flatMap((obj) => obj.keyResults.map((kr) => `${obj.id}:${kr.id}:${kr.progress}`))
    .sort()  // sort to make hash order-stable
    .join("|");

  useEffect(() => {
    if (!isReady) return;
    setObjectives((prev) => {
      let changed = false;
      const next = prev.map((obj) => {
        const nextProgress = calcCompletionProgress(obj.keyResults);
        const nextStatus = calculateStatus(nextProgress, obj.dueDate);
        if (nextProgress === obj.progress && nextStatus === obj.status) return obj;
        changed = true;
        return { ...obj, progress: nextProgress, status: nextStatus };
      });
      return changed ? next : prev;
    });
  // keyResultsHash is a stable primitive dep — no infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, keyResultsHash, calcCompletionProgress, calculateStatus]);

  // Recalculate north star KR progress from linked objectives
  useEffect(() => {
    if (!isReady) return;
    setNorthStarKRs((prev) => {
      let changed = false;
      const next = prev.map((kr) => {
        const linkedObjectives = objectives.filter((obj) => obj.keyResultId === kr.id);
        const nextProgress = linkedObjectives.length
          ? Math.round(linkedObjectives.reduce((s, o) => s + o.progress, 0) / linkedObjectives.length)
          : kr.progress; // preserve existing progress if no linked objectives
        const nextStatus = statusFromProgress(nextProgress);
        if (nextProgress === kr.progress && nextStatus === kr.status) return kr;
        changed = true;
        return { ...kr, progress: nextProgress, status: nextStatus };
      });
      return changed ? next : prev;
    });
  }, [isReady, objectives, statusFromProgress]);

  const setNorthStar = useCallback((v: string) => setNorthStarText(v), []);
  const deleteNorthStar = useCallback(async () => {
    setNorthStarText("");
    setNorthStarKRs([]);
    setObjectives([]);

    if (!supabaseUserId || !supabaseRef.current) {
      localStorage.removeItem(NS_KEY);
      setNorthStarId(null);
      return;
    }

    if (northStarId) {
      await supabaseRef.current
        .from("north_stars")
        .delete()
        .eq("user_id", supabaseUserId)
        .eq("id", northStarId);
    }

    setNorthStarId(null);
  }, [northStarId, supabaseUserId]);

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
      deleteNorthStar,
      isReady,
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
