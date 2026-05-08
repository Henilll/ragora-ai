"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  completeSupabaseRedirect,
  forgotPassword,
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
  signupWithEmail,
} from "@/lib/auth";

type Mode = "login" | "signup" | "forgot" | "reset" | "verify";

type AuthPanelProps = {
  mode: Mode;
};

const modeCopy: Record<Mode, { eyebrow: string; title: string; description: string; cta: string }> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to your workspace",
    description: "Manage documents, answers, widgets, analytics, and provider keys from one secure console.",
    cta: "Sign in",
  },
  signup: {
    eyebrow: "Start your workspace",
    title: "Build a trusted AI support layer",
    description: "Upload docs, tune your assistant, and deploy a branded website chatbot in minutes.",
    cta: "Create workspace",
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Reset your password",
    description: "Enter your email and Supabase Auth will send a secure reset link.",
    cta: "Send reset link",
  },
  reset: {
    eyebrow: "New credentials",
    title: "Choose a stronger password",
    description: "Use a unique password. Sessions are rotated after every successful reset.",
    cta: "Update password",
  },
  verify: {
    eyebrow: "Check inbox",
    title: "Confirm your email",
    description: "Supabase Auth sent a confirmation link. Open it to finish creating your workspace.",
    cta: "Back to sign in",
  },
};

const proofPoints = [
  { label: "Answer quality", value: "RAG", icon: Database },
  { label: "Widget deploy", value: "1 script", icon: MessageCircle },
  { label: "Ops control", value: "Admin", icon: ShieldCheck },
];

const trustItems = [
  "Workspace-scoped document retrieval",
  "JWT sessions with refresh rotation",
  "Provider key failover and analytics",
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-.8 2.3-1.8 3v2.5h2.9c1.7-1.6 2.7-3.9 2.7-6.7 0-.6-.1-1.1-.2-1.6H12z" />
      <path fill="#34A853" d="M6.4 14.3l-.7.5-2.3 1.8C4.9 19.7 8.1 22 12 22c2.4 0 4.5-.8 6-2.2l-2.9-2.5c-.8.5-1.8.9-3.1.9-2.3 0-4.3-1.6-5-3.7z" />
      <path fill="#4A90E2" d="M3.4 7.4C2.5 9 2.5 11.5 3.4 13.1l3.6-2.8c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6z" />
      <path fill="#FBBC05" d="M12 5.8c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.5 3 14.4 2 12 2 8.1 2 4.9 4.3 3.4 7.4L7 10.2c.7-2.1 2.7-4.4 5-4.4z" />
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => {
    return [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
  }, [password]);

  const label = ["Too short", "Basic", "Good", "Strong", "Excellent"][score];
  const colors = ["bg-slate-700", "bg-rose-400", "bg-amber-300", "bg-teal-300", "bg-violet-300"];

  if (!password) return null;

  return (
    <div className="mt-3">
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1.5 rounded-full ${step < score ? colors[score] : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">Password strength: {label}</p>
    </div>
  );
}

function AuthProviderButton({ children, onSelect, disabled = false }: { children: ReactNode; onSelect: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] text-sm font-semibold text-slate-100 shadow-[0_16px_50px_rgba(0,0,0,0.18)] transition hover:border-white/20 hover:bg-white/[0.075] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const copy = modeCopy[mode];
  const isAuthMode = mode === "login" || mode === "signup";

  useEffect(() => {
    if (mode !== "reset") return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code && !window.location.hash.includes("access_token=")) return;
    void completeSupabaseRedirect(code).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Reset link could not be verified.");
    });
  }, [mode]);

  async function handleGoogle() {
    setLoading(true);
    setMessage(null);
    try {
      await loginWithGoogle();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sign in failed.");
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const session = await loginWithEmail(email, password);
        router.push(session.user.is_admin ? "/admin" : "/dashboard");
        return;
      }
      if (mode === "signup") {
        const result = await signupWithEmail(name, email, password);
        if ("needsEmailConfirmation" in result) {
          setMessage("Check your email and open the Supabase confirmation link to finish signup.");
          return;
        }
        router.push("/dashboard");
        return;
      }
      if (mode === "forgot") {
        const response = await forgotPassword(email);
        setMessage(response.message);
        return;
      }
      if (mode === "reset") {
        const response = await resetPassword("manual-reset-token", password);
        setMessage(response.message);
        window.setTimeout(() => router.push("/login"), 850);
        return;
      }
      if (mode === "verify") {
        router.push("/login");
        return;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="premium-shell relative flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-6 sm:px-6">
      <div aria-hidden className="mesh-line absolute inset-0 opacity-40" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      <div className="absolute left-5 top-5 z-20">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-950 shadow-[0_20px_60px_rgba(255,255,255,0.12)]">
            <Sparkles size={16} />
          </span>
          Ragora
        </Link>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-xl border border-white/10 bg-slate-950/72 shadow-[0_32px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl lg:min-h-[640px] lg:grid-cols-[1.02fr_0.98fr]"
      >
        <aside className="relative hidden border-r border-white/10 bg-[radial-gradient(circle_at_25%_15%,rgba(45,212,191,0.12),transparent_18rem),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-7 lg:flex lg:flex-col">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-100">
              <ShieldCheck size={14} />
              Production-ready RAG SaaS
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-400">v1 console</div>
          </div>

          <div className="mt-11">
            <p className="mb-3 text-xs font-semibold uppercase text-violet-200">Ragora operating system</p>
            <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
              Turn your documents into a governed customer-facing AI assistant.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              One console for source coverage, answer testing, widget design, provider failover, and visitor analytics.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            {proofPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <Icon className="mb-3 h-4 w-4 text-violet-200" />
                  <p className="text-lg font-semibold text-white">{point.value}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{point.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-auto">
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-950">
                    <BarChart3 size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Live readiness</p>
                    <p className="text-xs text-slate-500">Docs, widget, keys, auth</p>
                  </div>
                </div>
                <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2 py-1 text-[11px] font-semibold text-teal-100">Healthy</span>
              </div>
              <div className="space-y-2">
                {trustItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-semibold text-slate-300">
                <LockKeyhole size={13} className="text-violet-200" />
                {copy.eyebrow}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">{copy.description}</p>
            </div>

            {isAuthMode && (
              <>
                <AuthProviderButton onSelect={handleGoogle} disabled={loading}>
                  <GoogleIcon />
                  Continue with Google
                </AuthProviderButton>
                <div className="my-6 flex items-center gap-3 text-xs uppercase text-slate-500">
                  <span className="h-px flex-1 bg-white/10" />
                  or continue with email
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Full name</span>
                  <input className="auth-input h-12" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
                </label>
              )}

              {mode !== "reset" && mode !== "verify" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Work email</span>
                  <input className="auth-input h-12" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@company.com" autoComplete="email" required />
                </label>
              )}

              {(mode === "login" || mode === "signup" || mode === "reset") && (
                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="block text-sm font-medium text-slate-300">Password</span>
                    {mode === "login" && <Link className="text-xs font-semibold text-violet-200 hover:text-white" href="/forgot-password">Forgot?</Link>}
                  </div>
                  <input className="auth-input h-12" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Enter your password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
                  {(mode === "signup" || mode === "reset") && <PasswordStrength password={password} />}
                </label>
              )}

              {mode === "verify" && (
                <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-300">
                  Open the confirmation link from Supabase Auth. After confirmation, sign in with your email/password or Google.
                </div>
              )}

              <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white font-semibold text-slate-950 shadow-[0_18px_60px_rgba(255,255,255,0.12)] transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.cta}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {message && (
              <div className="mt-4 rounded-lg border border-teal-300/20 bg-teal-300/10 px-4 py-3 text-sm text-teal-100">
                {message}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-400">
              {mode === "login" && (
                <>
                  <span>New to Ragora?</span>
                  <Link className="font-semibold text-violet-200 hover:text-white" href="/signup">Create workspace</Link>
                </>
              )}
              {mode === "signup" && (
                <>
                  <span>Already have an account?</span>
                  <Link className="font-semibold text-violet-200 hover:text-white" href="/login">Sign in</Link>
                </>
              )}
              {(mode === "forgot" || mode === "reset" || mode === "verify") && <Link className="font-semibold text-violet-200 hover:text-white" href="/login">Back to login</Link>}
            </div>

            <div className="mt-8 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              {["No credit card", "Secure sessions", "Admin controls"].map((item) => (
                <div key={item} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-teal-300" />
                {item}
              </div>
            ))}
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
