"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Github, Loader2 } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  completeSupabaseRedirect,
  forgotPassword,
  loginWithEmail,
  loginWithGithub,
  loginWithGoogle,
  resetPassword,
  resetPasswordWithBackendToken,
  signupWithEmail,
} from "@/lib/auth";

type Mode = "login" | "signup" | "forgot" | "reset" | "verify";

type AuthPanelProps = {
  mode: Mode;
};

const modeCopy: Record<Mode, { title: string; description: string; cta: string }> = {
  login: {
    title: "Log in",
    description: "Welcome back. Your workspace, documents and widget are where you left them.",
    cta: "Log in",
  },
  signup: {
    title: "Create account",
    description: "One workspace, your documents, and a widget you can embed anywhere.",
    cta: "Create account",
  },
  forgot: {
    title: "Reset password",
    description: "Enter your email. If an account exists, a reset link is sent to it.",
    cta: "Send reset link",
  },
  reset: {
    title: "New password",
    description: "Choose a new password, at least 8 characters.",
    cta: "Update password",
  },
  verify: {
    title: "Confirm email",
    description: "Open the confirmation link from your inbox, then sign in.",
    cta: "Back to login",
  },
};

function LogoMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-base font-bold text-[#0C0E11]">
      H<span style={{ color: "#E8490F" }}>.</span>
    </span>
  );
}

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

  if (!password) return null;
  const labels = ["Too short", "Weak", "Okay", "Good", "Strong"];

  return (
    <div className="mt-3">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((step) => (
          <span key={step} className="h-1.5 rounded-full" style={{ background: step < score ? "#E8490F" : "var(--surface-3)" }} />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{labels[score]}. 8+ characters, with a capital, a number and a symbol, is strongest.</p>
    </div>
  );
}

function AuthProviderButton({ children, onSelect, disabled = false }: { children: ReactNode; onSelect: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="btn-ghost flex h-11 w-full items-center justify-center gap-2 font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

const STEPS = [
  { n: "01", title: "Upload documents", text: "PDF, TXT, Markdown or DOCX. Processing status is shown, never hidden." },
  { n: "02", title: "Test in the playground", text: "Ask real questions and check answers against your own sources." },
  { n: "03", title: "Embed the widget", text: "Copy one script tag. Visitors chat on your site, you see every conversation." },
];

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const copy = modeCopy[mode];
  const isAuthMode = mode === "login" || mode === "signup";
  const showPasswordField = mode === "login" || mode === "signup" || mode === "reset";

  useEffect(() => {
    if (mode !== "reset") return;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code && !window.location.hash.includes("access_token=")) return;
    void completeSupabaseRedirect(code).catch((error) => {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Reset link could not be verified." });
    });
  }, [mode]);

  async function handleOAuth(provider: "google" | "github") {
    setLoading(true);
    setNotice(null);
    try {
      if (provider === "google") await loginWithGoogle();
      else await loginWithGithub();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : `${provider} sign in failed.` });
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      if (mode === "login") {
        const session = await loginWithEmail(email, password);
        router.push(session.user.is_admin ? "/admin" : "/dashboard");
        return;
      }
      if (mode === "signup") {
        const result = await signupWithEmail(name, email, password);
        if ("needsEmailConfirmation" in result) {
          setNotice({ kind: "success", text: "Check your email and open the confirmation link, then sign in." });
          return;
        }
        router.push("/dashboard");
        return;
      }
      if (mode === "forgot") {
        const response = await forgotPassword(email);
        setNotice({ kind: "success", text: response.message });
        return;
      }
      if (mode === "reset") {
        const backendToken = new URLSearchParams(window.location.search).get("token");
        const response = backendToken
          ? await resetPasswordWithBackendToken(backendToken, password)
          : await resetPassword("manual-reset-token", password);
        setNotice({ kind: "success", text: response.message });
        window.setTimeout(() => router.push("/login"), 850);
        return;
      }
      if (mode === "verify") {
        router.push("/login");
      }
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Authentication failed. Check the details and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="premium-shell min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Left: brand panel, desktop only. Flat ink, no mesh, no gradient. */}
      <aside className="hidden flex-col justify-between border-r border-white/10 bg-[#0C0E11] px-10 py-10 lg:flex">
        <Link href="/" className="flex items-center gap-3 text-base font-bold text-white">
          <LogoMark />
          Ragora
        </Link>
        <div>
          <p className="rag3-eyebrow mb-4">Your documents, answering customers</p>
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
            Answers from your own documents. Nothing invented.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            When Ragora does not know, it says so. Sources, feedback and unanswered
            questions stay visible in the dashboard, so coverage improves instead of being guessed.
          </p>
          <ol className="mt-10 space-y-6">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-[#FF6B2C]">{step.n}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-400">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-slate-500">Built by Henil Bhavsar, AI Engineer.</p>
      </aside>

      {/* Right: form */}
      <div className="grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center justify-center gap-3 text-base font-bold text-white lg:hidden">
            <LogoMark />
            Ragora
          </Link>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="card p-5 sm:p-7"
          >
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-white">{copy.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">{copy.description}</p>
            </div>

            {isAuthMode && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <AuthProviderButton onSelect={() => handleOAuth("google")} disabled={loading}>
                    <GoogleIcon />
                    Google
                  </AuthProviderButton>
                  <AuthProviderButton onSelect={() => handleOAuth("github")} disabled={loading}>
                    <Github size={16} />
                    GitHub
                  </AuthProviderButton>
                </div>
                <div className="my-5 flex items-center gap-3 text-xs uppercase text-slate-500">
                  <span className="h-px flex-1 bg-white/10" />
                  or with email
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <label className="block">
                  <span className="field-label">Name</span>
                  <input className="inp h-11" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required />
                </label>
              )}

              {mode !== "reset" && mode !== "verify" && (
                <label className="block">
                  <span className="field-label">Email</span>
                  <input className="inp h-11" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@company.com" autoComplete="email" required />
                </label>
              )}

              {showPasswordField && (
                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-300">Password</span>
                    {mode === "login" && <Link className="text-xs font-semibold text-[#FF6B2C] hover:text-white" href="/forgot-password">Forgot?</Link>}
                  </div>
                  <span className="relative block">
                    <input
                      className="inp h-11 pr-11"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                  {(mode === "signup" || mode === "reset") && <PasswordStrength password={password} />}
                </label>
              )}

              {mode === "verify" && (
                <ol className="space-y-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-6 text-slate-300">
                  <li>1. Open the confirmation email in your inbox.</li>
                  <li>2. Tap the confirmation link.</li>
                  <li>3. Come back here and sign in.</li>
                </ol>
              )}

              <button type="submit" className="btn-accent flex h-11 w-full items-center justify-center gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.cta}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {notice && (
              <div className={`mt-4 ${notice.kind === "error" ? "notice-error" : "notice-success"}`} role={notice.kind === "error" ? "alert" : "status"}>
                {notice.text}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-400">
              {mode === "login" && (
                <>
                  <span>Need an account?</span>
                  <Link className="font-semibold text-[#FF6B2C] hover:text-white" href="/signup">Sign up</Link>
                </>
              )}
              {mode === "signup" && (
                <>
                  <span>Already registered?</span>
                  <Link className="font-semibold text-[#FF6B2C] hover:text-white" href="/login">Log in</Link>
                </>
              )}
              {(mode === "forgot" || mode === "reset" || mode === "verify") && <Link className="font-semibold text-[#FF6B2C] hover:text-white" href="/login">Back to login</Link>}
            </div>
          </motion.section>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            <Link href="/" className="hover:text-slate-300">Back to home</Link>
            <span className="mx-2" aria-hidden>·</span>
            <span>Your documents stay in your workspace.</span>
          </p>
          {mode === "signup" && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <CheckCircle2 size={13} className="text-[#5EC99A]" />
              Starter plan is free. No card asked for on this page.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
