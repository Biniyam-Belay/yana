"use client";

import { Sidebar } from "./sidebar";
import { CommandPalette } from "@/components/command-palette";
import { NorthStarProvider } from "@/store/north-star";
import { TimerProvider } from "@/store/timer";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { executionRate, focusQuality, systemHealth, stressCoefficient, alignmentScore } = useAppStore();
  
  // Mission Velocity Algorithm (Vm)
  const Vm = (executionRate * focusQuality) * (systemHealth * stressCoefficient);
  
  // Drift Protocol Logic
  const isDrift = alignmentScore < 0.85 || Vm < 0.75;
  const isCriticalStasis = Vm < 0.40;

  return (
    <NorthStarProvider>
      <TimerProvider>
        {/* Container wraps everything to apply global biological machine state filters */}
        <div className={cn(
          "flex h-screen overflow-hidden transition-all duration-[2000ms] ease-in-out relative",
          isCriticalStasis ? "grayscale-[80%] sepia-[20%] hue-rotate-[-10deg] contrast-125" :
          isDrift ? "saturate-50 contrast-110" : ""
        )}>


          <Sidebar />
          <main className="flex-1 overflow-y-auto transition-transform duration-1000">
            <div className="h-full px-4 pt-3 pb-4 lg:px-6 lg:pt-4 lg:pb-6">{children}</div>
          </main>
          
          <CommandPalette />
        </div>
      </TimerProvider>
    </NorthStarProvider>
  );
}
