import { create } from "zustand";

interface AppState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  
  // Biological Machine Variables
  executionRate: number; // E
  focusQuality: number;  // F
  systemHealth: number;  // H
  stressCoefficient: number; // S
  alignmentScore: number;
  
  // Computed Vm internally available or just calculated from state
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Real-time telemetry updates
  updateTelemetry: (params: Partial<{ executionRate: number; focusQuality: number; systemHealth: number; stressCoefficient: number; alignmentScore: number }>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  
  executionRate: 0.9,
  focusQuality: 0.85,
  systemHealth: 0.92,
  stressCoefficient: 1.0,
  alignmentScore: 0.88,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  
  updateTelemetry: (params) => set((state) => ({ ...state, ...params })),
}));
