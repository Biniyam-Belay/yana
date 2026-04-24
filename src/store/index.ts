import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AppState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;

  // Biological Machine Variables
  executionRate: number;    // E
  focusQuality: number;     // F
  systemHealth: number;     // H
  stressCoefficient: number; // S
  alignmentScore: number;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  updateTelemetry: (params: Partial<{
    executionRate: number;
    focusQuality: number;
    systemHealth: number;
    stressCoefficient: number;
    alignmentScore: number;
  }>) => void;
}

// Read persisted values synchronously so the very first render has the
// correct state — eliminating the collapse/expand flash on reload.
function getPersistedPrefs(): Partial<AppState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("yana_ui_prefs");
    return raw ? (JSON.parse(raw) as Partial<AppState>) : {};
  } catch {
    return {};
  }
}

const saved = getPersistedPrefs();

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: saved.sidebarCollapsed ?? false,
      commandPaletteOpen: false,

      // Telemetry — load persisted values or fall back to defaults
      executionRate:     saved.executionRate     ?? 0.9,
      focusQuality:      saved.focusQuality      ?? 0.85,
      systemHealth:      saved.systemHealth      ?? 0.92,
      stressCoefficient: saved.stressCoefficient ?? 1.0,
      alignmentScore:    saved.alignmentScore    ?? 0.88,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      updateTelemetry: (params) => set((state) => ({ ...state, ...params })),
    }),
    {
      name: "yana_ui_prefs",
      storage: createJSONStorage(() => localStorage),
      // Only persist UI prefs — commandPaletteOpen is ephemeral
      partialize: (state) => ({
        sidebarCollapsed:  state.sidebarCollapsed,
        executionRate:     state.executionRate,
        focusQuality:      state.focusQuality,
        systemHealth:      state.systemHealth,
        stressCoefficient: state.stressCoefficient,
        alignmentScore:    state.alignmentScore,
      }),
    }
  )
);
