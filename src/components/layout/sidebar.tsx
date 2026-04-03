"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/theme-provider";
import { useAppStore } from "@/store";
import {
  LayoutDashboard,
  Target,
  Briefcase,
  ListChecks,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/north-star", label: "North Star", icon: Target },
  { href: "/professional", label: "Professional", icon: Briefcase },
  { href: "/tactical", label: "Tactical", icon: ListChecks },
  { href: "/financial", label: "Financial", icon: Wallet },
  { href: "/biometrics", label: "Biometrics", icon: Heart },
  { href: "/vault", label: "Vault", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } =
    useAppStore();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-background border-r border-border/40 transition-all duration-300 ease-in-out antialiased select-none",
        sidebarCollapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* ─── LOGO ─── */}
      <div
        className={cn(
          "shrink-0 flex items-center border-b border-border/30 h-[53px]",
          sidebarCollapsed ? "justify-center px-0" : "px-4"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center bg-foreground text-background shrink-0">
            <span className="font-bold text-[11px] tracking-tighter font-mono">Y</span>
          </div>
          {!sidebarCollapsed && (
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-foreground">
              YANA
            </span>
          )}
        </div>
      </div>

      {/* ─── SEARCH ─── */}
      <div className={cn("shrink-0 border-b border-border/30", sidebarCollapsed ? "px-2 py-2" : "px-3 py-2.5")}>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          title={sidebarCollapsed ? "Search (⌘K)" : undefined}
          className={cn(
            "flex w-full items-center border border-border/30 bg-transparent text-muted-foreground transition-all hover:border-border/60 hover:text-foreground",
            sidebarCollapsed ? "justify-center p-1.5" : "justify-between px-2.5 py-1.5"
          )}
        >
          <div className="flex items-center gap-2">
            <Search className="h-3 w-3 shrink-0 stroke-[1.5]" />
            {!sidebarCollapsed && (
              <span className="text-[10px] font-mono uppercase tracking-widest">Search</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <kbd className="flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/50">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          )}
        </button>
      </div>

      {/* ─── NAV ─── */}
      <nav className={cn("flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-0.5", sidebarCollapsed ? "px-2 py-3" : "px-3 py-3")}>
        {mainNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-2.5 py-2 transition-all duration-150 relative",
                sidebarCollapsed ? "justify-center px-0" : "px-2.5",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator — left edge stripe */}
              {isActive && (
                <div className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-foreground",
                  sidebarCollapsed && "left-0"
                )} />
              )}
              <item.icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0 stroke-[1.5] transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!sidebarCollapsed && (
                <span className={cn(
                  "text-[11px] font-mono uppercase tracking-[0.1em]",
                  isActive ? "font-semibold" : "font-medium"
                )}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── FOOTER ─── */}
      <div className="shrink-0 border-t border-border/30">
        {/* Settings */}
        <Link
          href="/settings"
          title={sidebarCollapsed ? "Settings" : undefined}
          className={cn(
            "group flex items-center gap-2.5 py-2 transition-all relative border-b border-border/20",
            sidebarCollapsed ? "justify-center px-0" : "px-3.5",
            pathname === "/settings"
              ? "text-foreground bg-muted/5"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {pathname === "/settings" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-foreground" />
          )}
          <Settings className={cn("h-3.5 w-3.5 shrink-0 stroke-[1.5]", pathname === "/settings" ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
          {!sidebarCollapsed && (
            <span className={cn("text-[11px] font-mono uppercase tracking-[0.1em]", pathname === "/settings" ? "font-semibold" : "font-medium")}>Settings</span>
          )}
        </Link>

        {/* Theme + Collapse */}
        <div
          className={cn(
            "flex items-center py-2",
            sidebarCollapsed ? "flex-col gap-2 px-0 justify-center" : "justify-between px-4"
          )}
        >
          <button
            title="Toggle theme"
            className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-3.5 w-3.5 stroke-[1.5] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 stroke-[1.5] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>

          <button
            title="Toggle sidebar"
            className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5 stroke-[1.5]" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5 stroke-[1.5]" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
