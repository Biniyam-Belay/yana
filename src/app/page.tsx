"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { Target, ChevronRight, Briefcase, Wallet, Heart, Sun, Moon, ArrowRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// Mock Data for the elegant visualizers
const generateSparkData = (points: number, volatility: number) => {
  return Array.from({ length: points }).map((_, i) => ({
    v: 50 + Math.random() * volatility + (i * Math.random() * 2),
  }));
};

export default function MarketingLandingPage() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Memoize dummy data for the elegant charts
  const sparkDataNorthStar = useMemo(() => generateSparkData(24, 15), []);
  const sparkDataProf = useMemo(() => generateSparkData(24, 25), []);

  useEffect(() => {
    setMounted(true);
    if (!loading && user) {
      router.replace("/overview");
    }
  }, [user, loading, router]);

  if (!mounted || loading || user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-foreground flex flex-col relative overflow-x-hidden font-sans">
      
      {/* Elegant Ambient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/5 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 blur-[120px] mix-blend-screen" />
      </div>

      {/* Floating Pill Nav */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <header className="w-full max-w-5xl md:max-w-3xl flex items-center justify-between px-6 py-3 bg-background/70 backdrop-blur-xl border border-white/10 dark:border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-foreground text-background rounded-full transition-transform hover:scale-105 cursor-default">
              <span className="font-bold text-[12px] tracking-tighter">Y</span>
            </div>
            <span className="text-[13px] font-bold tracking-widest text-foreground hidden sm:block">
              YANA
            </span>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5">
            <button
              title="Toggle theme"
              className="group relative flex h-8 w-8 items-center justify-center text-muted-foreground transition-all hover:text-foreground outline-none rounded-full bg-muted/30"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100" />
            </button>
            
            <div className="w-[1px] h-4 bg-border hidden sm:block" />

            <Link href="/login?mode=signin" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/login?mode=signup" className="bg-foreground text-background px-5 py-2 text-xs font-semibold rounded-full hover:bg-foreground/90 transition-all hover:scale-105 transform origin-center shadow-lg hover:shadow-xl">
              Get Started
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-40 pb-20 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        
        {/* Soft Badge */}
        <div className="inline-flex items-center gap-2.5 bg-muted/40 border border-border/50 px-4 py-1.5 mb-8 rounded-full backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inset-0 rounded-full bg-emerald-500 opacity-60" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium tracking-wide text-foreground/80">Open Beta Available Now</span>
        </div>

        {/* Hero Title - Elegant Sans Serif */}
        <h1 className="text-5xl md:text-7xl lg:text-[6.5rem] font-bold tracking-tight mb-8 max-w-5xl text-balance leading-[1.05]">
          Master your life&apos;s <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground">
            trajectory.
          </span>
        </h1>
        
        {/* Refined Subtitle */}
        <p className="max-w-xl md:max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed mb-10 font-normal">
          An exceptionally crafted platform integrating your goals, tasks, financial tracking, and daily habits. Designed for absolute focus and control.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md">
          <Link href="/login?mode=signup" className="group w-full sm:w-auto h-[48px] px-8 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-semibold rounded-full transition-all hover:-translate-y-0.5 shadow-lg dark:shadow-[0_4px_25px_rgba(255,255,255,0.1)]">
            Start Your Journey
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="#features" className="group w-full sm:w-auto h-[48px] px-8 flex items-center justify-center gap-2 border border-border/60 bg-background/50 backdrop-blur-sm text-sm font-medium rounded-full hover:bg-muted/30 transition-all font-sans">
            Explore Features
          </Link>
        </div>

        {/* Mock Graphic Frame (Linear/Vercel inspired UI preview) */}
        <div className="w-full max-w-6xl mt-24 relative rounded-2xl md:rounded-[2rem] border border-border/40 bg-background/30 backdrop-blur-sm shadow-2xl p-2 md:p-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          <div className="w-full aspect-[21/9] rounded-xl md:rounded-3xl bg-muted/20 border border-white/5 relative overflow-hidden flex flex-col shadow-inner">
            {/* Faux Mac UI Header */}
            <div className="h-12 border-b border-white/5 flex items-center px-6 gap-2 bg-background/20 backdrop-blur-xl">
              <div className="h-3 w-3 rounded-full bg-rose-500/50" />
              <div className="h-3 w-3 rounded-full bg-amber-500/50" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/50" />
            </div>
            {/* Faux Dashboard Lines */}
            <div className="flex-1 flex w-full">
              {/* Fake Sidebar */}
              <div className="w-48 xl:w-64 border-r border-white/5 hidden md:flex flex-col gap-3 p-6 opacity-30">
                <div className="h-4 w-24 bg-foreground rounded-full" />
                <div className="h-4 w-full bg-muted-foreground/30 rounded-full mt-4" />
                <div className="h-4 w-5/6 bg-muted-foreground/30 rounded-full" />
                <div className="h-4 w-4/6 bg-muted-foreground/30 rounded-full" />
              </div>
              {/* Fake Content Area */}
              <div className="flex-1 p-6 md:p-12 flex flex-col gap-6 opacity-30">
                <div className="h-8 w-48 bg-foreground rounded-lg" />
                <div className="flex gap-4">
                  <div className="h-32 flex-1 bg-muted-foreground/20 rounded-xl" />
                  <div className="h-32 flex-1 bg-muted-foreground/20 rounded-xl" />
                  <div className="h-32 flex-1 bg-muted-foreground/20 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Modules - Elegant Grid */}
      <section id="features" className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-32 pt-20 relative z-10">
        
        <div className="flex flex-col items-center mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">A unified operating system.</h2>
          <p className="text-muted-foreground text-base max-w-lg">
            Everything you need to orchestrate your professional growth, physical health, and financial security in one place.
          </p>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          
          {/* 1. NORTH STAR */}
          <div className="group relative rounded-3xl bg-muted/10 border border-border/40 p-8 md:p-12 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1 hover:bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20 shadow-sm transition-transform group-hover:scale-105">
                <Target className="h-6 w-6 stroke-[1.5]" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 tracking-tight">Strategic Planning</h3>
              <p className="text-muted-foreground leading-relaxed mb-8 text-[15px]">
                Set your long-term goals and track progress seamlessly. Break down life-scale objectives into actionable key results with a highly structured OKR system.
              </p>
              
              {/* Elegant Vis */}
              <div className="h-20 w-full opacity-60 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkDataNorthStar}>
                    <defs>
                      <linearGradient id="g-emb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fill="url(#g-emb)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 2. PROFESSIONAL */}
          <div className="group relative rounded-3xl bg-muted/10 border border-border/40 p-8 md:p-12 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-1 hover:bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20 shadow-sm transition-transform group-hover:scale-105">
                <Briefcase className="h-6 w-6 stroke-[1.5]" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 tracking-tight">Task Execution</h3>
              <p className="text-muted-foreground leading-relaxed mb-8 text-[15px]">
                Manage your daily tasks with a focus-driven workflow. Includes an integrated timer to enforce deep work and measure exactly how your time is spent.
              </p>
              
              <div className="flex gap-2 relative">
                <div className="h-10 w-full rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center px-4" />
                <div className="h-10 w-16 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-mono text-[10px] font-bold">START</div>
              </div>
            </div>
          </div>

          {/* 3. FINANCIAL */}
          <div className="group relative rounded-3xl bg-muted/10 border border-border/40 p-8 md:p-12 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/5 hover:-translate-y-1 hover:bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-8 border border-amber-500/20 shadow-sm transition-transform group-hover:scale-105">
                <Wallet className="h-6 w-6 stroke-[1.5]" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 tracking-tight">Financial Ledger</h3>
              <p className="text-muted-foreground leading-relaxed mb-8 text-[15px]">
                Keep a precise ledger of your net worth, track accounts, log transactions easily, and monitor your monthly burn rate to understand your true financial runway.
              </p>

              <div className="flex flex-col gap-3 mt-4 w-full">
                <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[65%]" />
                </div>
                <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full bg-amber-500/50 rounded-full w-[35%]" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. BIOMETRICS */}
          <div className="group relative rounded-3xl bg-muted/10 border border-border/40 p-8 md:p-12 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-rose-500/5 hover:-translate-y-1 hover:bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20 shadow-sm transition-transform group-hover:scale-105">
                <Heart className="h-6 w-6 stroke-[1.5]" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 tracking-tight">Biological Telemetry</h3>
              <p className="text-muted-foreground leading-relaxed mb-8 text-[15px]">
                Log your health metrics directly alongside your work. Track sleep quality, heart rate variability, weight changes, and daily nutrition targets effortlessly.
              </p>
              
              {/* Elegant Vis */}
              <div className="h-20 w-full opacity-60 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkDataProf}>
                    <defs>
                      <linearGradient id="g-ro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#f43f5e" strokeWidth={2} fill="url(#g-ro)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4 px-8 py-10 relative z-10 bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center">
            <span className="font-bold text-[10px] tracking-tighter">Y</span>
          </div>
          <span className="text-sm font-semibold tracking-wide text-foreground">YANA App</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span>Local First</span>
          <span className="h-1 w-1 bg-border rounded-full" />
          <span>Privacy Focused</span>
        </div>
      </footer>
    </div>
  );
}
