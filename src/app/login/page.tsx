"use client";

import { useMemo, useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const modeParam = new URLSearchParams(window.location.search).get("mode");
      if (modeParam === "signup" || modeParam === "signin") {
        setMode(modeParam);
      }
    }
  }, []);

  const reset = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) { setError(signUpError.message); return; }
        setSuccess("Account created! Check your email to confirm, then sign in below.");
        reset("signin");
        return;
      }

      // Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); return; }
      await supabase.auth.getSession();
      router.replace("/overview");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 font-sans relative overflow-hidden text-foreground">
      
      {/* Elegant Ambient Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/5 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative w-full max-w-[400px] z-10 flex flex-col items-center">
        
        {/* Back Link */}
        <Link href="/" className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 w-full">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to homepage
        </Link>
        
        {/* Logo & Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center bg-foreground text-background rounded-2xl shadow-xl mb-6">
            <span className="font-bold text-xl tracking-tighter">Y</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" 
              ? "Enter your credentials to access your command center." 
              : "Sign up to begin mastering your life's trajectory."}
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-3xl border border-border/40 bg-background/50 p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Tab switcher */}
          <div className="flex rounded-full bg-muted/40 p-1 mb-8">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => reset(m)}
                className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all ${
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Alerts */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
                {success}
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground/80">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30 transition-all placeholder:text-muted-foreground/50"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground/80">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30 transition-all placeholder:text-muted-foreground/50"
                placeholder="••••••••"
              />
            </div>

            {/* Confirm password (sign up only) */}
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground/80">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30 transition-all placeholder:text-muted-foreground/50"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-foreground text-background py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-md"
            >
              {loading
                ? mode === "signin" ? "Authenticating..." : "Creating Account..."
                : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}