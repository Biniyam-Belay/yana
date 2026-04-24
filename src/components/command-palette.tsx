"use client";

import { useEffect, useState } from "react";
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
  Wallet,
  Heart,
  BookOpen,
  Plus,
  FileText,
  DollarSign,
  Dumbbell,
  CheckSquare,
} from "lucide-react";
import { useNorthStar } from "@/store/north-star";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navigationCommands = [
  { label: "HUD — Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "North Star — Strategic Goals", href: "/north-star", icon: Target },
  {
    label: "Professional — Business & Work",
    href: "/professional",
    icon: Briefcase,
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
  const { objectives } = useNorthStar();
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string }[]>([]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    
    async function fetchTasks() {
      // Load from local storage as baseline
      try {
        const local = localStorage.getItem("yana_professional_tasks");
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) setTasks(parsed);
        }
      } catch (e) {}

      // Try syncing with Supabase
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userRecord } = await supabase.auth.getUser();
        if (userRecord?.user) {
          const { data } = await supabase
            .from("professional_tasks")
            .select("id, title, status");
          if (data && data.length > 0) {
            // Merge or overwrite (Supabase is source of truth here if active)
            setTasks(data);
          }
        }
      } catch (e) {}
    }
    
    fetchTasks();
  }, [commandPaletteOpen]);

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
    switch (action) {
      case "create-task":
        router.push("/professional?action=create-task");
        break;
      case "log-transaction":
        router.push("/financial?action=log-transaction&type=income");
        break;
      case "log-workout":
        router.push("/biometrics?action=log-workout");
        break;
      case "new-vault-entry":
        router.push("/vault?action=new-entry");
        break;
      default:
        break;
    }
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
              value={`Create ${cmd.label}`} // Helps search matching
              onSelect={() => handleAction(cmd.action)}
            >
              <cmd.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {objectives && objectives.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects & Objectives">
              {objectives.map((obj) => (
                <CommandItem
                  key={obj.id}
                  value={`Project Objective ${obj.title}`}
                  onSelect={() => handleNavigation("/north-star")}
                >
                  <Target className="mr-2 h-4 w-4 text-emerald-500" />
                  <span>{obj.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {tasks && tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks (Active)">
              {tasks.filter((t: any) => t.status !== "done").slice(0, 15).map((t: any) => (
                <CommandItem
                  key={t.id}
                  value={`Task ${t.title}`}
                  onSelect={() => handleNavigation("/professional")}
                >
                  <CheckSquare className="mr-2 h-4 w-4 text-amber-500" />
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
