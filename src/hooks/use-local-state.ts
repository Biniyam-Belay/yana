/**
 * useLocalState — useState that syncs with localStorage.
 * Falls back gracefully if localStorage is unavailable.
 */
"use client";
import { useState, useEffect, useCallback } from "react";

export function useLocalState<T>(key: string, defaultValue: T) {
  const [state, setStateRaw] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        setStateRaw(JSON.parse(raw) as T);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [key]);

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key]
  );

  return [state, setState, hydrated] as const;
}
