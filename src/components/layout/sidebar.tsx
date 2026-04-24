"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { useAppStore } from "@/store";
import { useAuth } from "@/components/providers/auth-provider";
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Wallet,
  Heart,
  BookOpen,
  Search,
  Settings,
  PanelLeft,
  PanelLeftClose,
  Sun,
  Moon,
  Command,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/north-star", label: "North Star", icon: Target },
  { href: "/professional", label: "Professional", icon: Briefcase },
  { href: "/financial", label: "Financial", icon: Wallet },
  { href: "/biometrics", label: "Biometrics", icon: Heart },
  { href: "/vault", label: "Vault", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } = useAppStore();
  const { user, signOut } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Derive a display label from the user email
  const emailLabel = user?.email ?? "";
  const initials = emailLabel ? emailLabel.slice(0, 2).toUpperCase() : "??";
  const shortEmail = emailLabel.length > 22 ? emailLabel.slice(0, 20) + "…" : emailLabel;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-background border-r border-border/40 antialiased select-none",
        mounted && "transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-[52px]" : "w-60"
      )}
    >
      {/* ─── LOGO ─── */}
      <div
        className={cn(
          "shrink-0 flex items-center border-b border-border/30 h-[53px]",
          sidebarCollapsed ? "justify-center px-0" : "px-5"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center bg-foreground text-background shrink-0 shadow-[0_0_12px_rgba(0,0,0,0.1)] dark:shadow-[0_0_12px_rgba(255,255,255,0.05)] transition-transform duration-300 hover:scale-105 cursor-default">
            <span className="font-bold text-[10px] tracking-tighter font-mono">Y</span>
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-foreground leading-none">
                YANA
              </span>
              <span className="text-[7px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                OS // v0.1.0
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── COMMAND BAR / SEARCH ─── */}
      <div className={cn("shrink-0 border-b border-border/20", sidebarCollapsed ? "px-2 py-3" : "px-4 py-4")}>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          title={sidebarCollapsed ? "Search (⌘K)" : undefined}
          className={cn(
            "group flex w-full items-center border bg-muted/5 text-muted-foreground transition-all outline-none",
            "hover:bg-muted/10 hover:border-foreground/30 hover:text-foreground hover:shadow-[0_0_8px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_0_8px_rgba(255,255,255,0.02)]",
            sidebarCollapsed ? "justify-center p-2 border-border/20" : "justify-between px-3 py-2 border-border/20"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 stroke-[1.5] transition-transform duration-200 group-hover:scale-110" />
            {!sidebarCollapsed && (
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] opacity-80 group-hover:opacity-100 transition-opacity">Query...</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <kbd className="flex items-center gap-0.5 text-[8px] font-mono text-muted-foreground/60 border border-border/30 bg-background px-1 py-0.5 tracking-widest">
              <Command className="h-2 w-2 stroke-[1.5]" />K
            </kbd>
          )}
        </button>
      </div>

      {/* ─── NAV PORTAL ─── */}
      <nav className={cn(
        "flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-1", 
        sidebarCollapsed ? "px-2 py-4" : "px-3 py-4"
      )}>
        {!sidebarCollapsed && (
          <div className="px-3 pb-2 pt-1 border-b border-transparent">
            <span className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground/40 leading-none block">
              Core Modules
            </span>
          </div>
        )}
        
        {mainNav.map((item) => {
          const isActive = item.href === "/overview" ? pathname === "/overview" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "group flex items-center transition-all duration-200 relative overflow-hidden",
                sidebarCollapsed ? "justify-center h-10 w-full" : "px-4 py-2.5 w-full",
                isActive 
                  ? "bg-foreground/5 text-foreground" 
                  : "text-muted-foreground hover:bg-muted/5 hover:text-foreground"
              )}
            >
              <div 
                className={cn(
                  "absolute left-0 top-0 bottom-0 bg-foreground transition-all duration-300 ease-out",
                  isActive ? "w-[2px]" : "w-0 opacity-0"
                )} 
              />
              
              {/* Subtle hover gradient under the border */}
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className={cn("flex items-center gap-3", !sidebarCollapsed && "transition-transform duration-200 group-hover:translate-x-1")}>
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 stroke-[1.5] transition-all duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!sidebarCollapsed && (
                  <span className={cn(
                    "text-[10.5px] font-mono tracking-[0.1em] transition-all uppercase",
                    isActive ? "font-bold" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ─── FOOTER REGION ─── */}
      <div className="shrink-0 border-t border-border/30 bg-muted/5 flex flex-col">
        {/* Settings Module */}
        <Link
          href="/settings"
          title={sidebarCollapsed ? "Settings" : undefined}
          className={cn(
            "group flex items-center transition-all duration-200 relative border-b border-border/10",
            sidebarCollapsed ? "justify-center h-12 px-0" : "px-7 py-3",
            pathname === "/settings"
              ? "bg-foreground/5 text-foreground"
              : "text-muted-foreground hover:bg-muted/10 hover:text-foreground"
          )}
        >
          {pathname === "/settings" && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-foreground" />}
          <div className={cn("flex items-center gap-3", !sidebarCollapsed && "transition-transform duration-200 group-hover:translate-x-1")}>
            <Settings className={cn(
              "h-4 w-4 shrink-0 stroke-[1.5] transition-transform duration-500", 
              pathname === "/settings" ? "text-foreground" : "text-muted-foreground group-hover:rotate-90 group-hover:text-foreground"
            )} />
            {!sidebarCollapsed && (
              <span className={cn("text-[10.5px] font-mono tracking-[0.1em] uppercase", pathname === "/settings" ? "font-bold" : "font-medium")}>Settings</span>
            )}
          </div>
        </Link>

        {/* Identity Plate */}
        {user && (
          <div className={cn(
              "flex items-center gap-3 border-b border-border/10 transition-colors hover:bg-muted/10",
              sidebarCollapsed ? "flex-col justify-center px-0 py-3" : "py-3 px-6"
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-foreground text-background shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:shadow-[0_0_8px_rgba(255,255,255,0.05)] cursor-default transition-transform hover:scale-105">
              <span className="font-mono text-[9px] font-bold tracking-tighter">{initials}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-mono text-[9.5px] font-bold text-foreground tracking-widest uppercase">Operator</span>
                <span className="truncate font-mono text-[8px] text-muted-foreground/60">{shortEmail}</span>
              </div>
            )}
            <button
              onClick={signOut}
              title="Sign out"
              className={cn(
                "flex shrink-0 items-center justify-center text-muted-foreground transition-all hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20",
                sidebarCollapsed ? "h-8 w-8 mt-1" : "h-7 w-7"
              )}
            >
              <LogOut className="h-3 w-3 stroke-[1.5]" />
            </button>
          </div>
        )}

        {/* Tactical Controls */}
        <div className={cn(
            "flex items-center",
            sidebarCollapsed ? "flex-col gap-1 justify-center py-2" : "justify-between px-6 py-3"
          )}
        >
          <button
            title="Toggle environmental lighting"
            className={cn(
              "group flex items-center justify-center text-muted-foreground transition-all hover:text-foreground hover:bg-foreground/5",
              sidebarCollapsed ? "h-10 w-10" : "h-8 w-14 border border-border/30 bg-background"
            )}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-3.5 w-3.5 stroke-[1.5] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 group-hover:scale-110 group-hover:text-amber-500 dark:group-hover:text-foreground" />
            <Moon className="absolute h-3.5 w-3.5 stroke-[1.5] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 group-hover:scale-110 group-hover:text-indigo-400" />
            <span className="sr-only">Toggle theme</span>
          </button>

          <button
            title="Toggle sidebar portal"
            className={cn(
              "group flex items-center justify-center text-muted-foreground transition-all hover:text-foreground hover:bg-foreground/5",
              sidebarCollapsed ? "h-10 w-10 mt-1" : "h-8 w-14 border border-border/30 bg-background"
            )}
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5 stroke-[1.5] transition-transform duration-200 group-hover:scale-110" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5 stroke-[1.5] transition-transform duration-200 group-hover:-translate-x-1" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
