"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Target,
  Briefcase,
  ListChecks,
  Wallet,
  Heart,
  BookOpen,
  Plus,
  FileText,
  DollarSign,
  Dumbbell,
} from "lucide-react";

const navigationCommands = [
  { label: "HUD — Dashboard", href: "/", icon: LayoutDashboard },
  { label: "North Star — Strategic Goals", href: "/north-star", icon: Target },
  {
    label: "Professional — Business & Work",
    href: "/professional",
    icon: Briefcase,
  },
  {
    label: "Tactical — Daily Execution",
    href: "/tactical",
    icon: ListChecks,
  },
  {
    label: "Financial — Capital & Assets",
    href: "/financial",
    icon: Wallet,
  },
  {
    label: "Biometrics — Health & Protocol",
    href: "/biometrics",
    icon: Heart,
  },
  { label: "Vault — Knowledge Base", href: "/vault", icon: BookOpen },
];

const quickActions = [
  { label: "Create Task", icon: Plus, action: "create-task" },
  { label: "Log Transaction", icon: DollarSign, action: "log-transaction" },
  { label: "Log Workout", icon: Dumbbell, action: "log-workout" },
  { label: "New Vault Entry", icon: FileText, action: "new-vault-entry" },
];

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setCommandPaletteOpen]);

  const handleNavigation = (href: string) => {
    router.push(href);
    setCommandPaletteOpen(false);
  };

  const handleAction = (action: string) => {
    // Placeholder — will route to specific creation flows
    console.log("Quick action:", action);
    setCommandPaletteOpen(false);
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationCommands.map((cmd) => (
            <CommandItem
              key={cmd.href}
              value={cmd.label}
              onSelect={() => handleNavigation(cmd.href)}
            >
              <cmd.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {quickActions.map((cmd) => (
            <CommandItem
              key={cmd.action}
              value={cmd.label}
              onSelect={() => handleAction(cmd.action)}
            >
              <cmd.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
