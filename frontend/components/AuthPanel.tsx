"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  forgotPassword,
  loginWithEmail,
  loginWithGoogle,
  resetPassword,
  signupWithEmail,
  verifyEmail,
  type AuthProvider,
} from "@/lib/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type Mode = "login" | "signup" | "forgot" | "reset" | "verify";

type AuthPanelProps = {
  mode: Mode;
};

const modeCopy: Record<Mode, { eyebrow: string; title: string; description: string; cta: string }> = {
  login: {
    eyebrow: "Welcome back",
    title: "Sign in to Ragora",
    description: "Continue to your AI knowledge workspace with secure JWT session handling.",
    cta: "Sign in",
  },
  signup: {
    eyebrow: "Start free",
    title: "Create your Ragora workspace",
    description: "Launch a trusted AI assistant for docs, teams, and customer-facing workflows.",
    cta: "Create account",
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Reset your password",
    description: "Enter your email and we will send a secure reset link with a short-lived token.",
    cta: "Send reset link",
  },
  reset: {
    eyebrow: "New credentials",
    title: "Choose a stronger password",
    description: "Use a unique password. Sessions are rotated after every successful reset.",
    cta: "Update password",
  },
  verify: {
    eyebrow: "Verify email",
    title: "Enter your verification code",
    description: "We sent a six-digit OTP to your inbox. The code expires in 10 minutes.",
    cta: "Verify workspace",
  },
};

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

function AuthProviderButton({
  provider,
  children,
  onSelect,
  disabled = false,
}: {
  provider: AuthProvider;
  children: ReactNode;
  onSelect: (provider: AuthProvider) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(provider)}
      disabled={disabled}
      className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.075] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("founder@ragora.ai");
  const [name, setName] = useState("Henil Bhavsar");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const copy = modeCopy[mode];
  const isAuthMode = mode === "login" || mode === "signup";

  useEffect(() => {
    if (!isAuthMode || !googleClientId) return;

    const existing = document.querySelector<HTMLScriptElement>("script[src='https://accounts.google.com/gsi/client']");
    const initialize = () => {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setMessage("Google did not return an identity token.");
            return;
          }
          setLoading(true);
          setMessage(null);
          try {
            await loginWithGoogle(response.credential);
            router.push("/dashboard");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Google sign in failed.");
          } finally {
            setLoading(false);
          }
        },
      });
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
        window.google?.accounts.id.renderButton(googleButtonRef.current, {
          theme: "filled_black",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: mode === "signup" ? "signup_with" : "continue_with",
          width: googleButtonRef.current.offsetWidth || 240,
        });
      }
    };

    if (existing) {
      initialize();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initialize;
    document.head.appendChild(script);
  }, [googleClientId, isAuthMode, mode, router]);

  function handleProvider(provider: AuthProvider) {
    if (!googleClientId || !window.google?.accounts.id) {
      setMessage("Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local and GOOGLE_CLIENT_ID in backend/.env to enable Google login.");
      return;
    }
    window.google.accounts.id.prompt();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        router.push("/dashboard");
        return;
      }
      if (mode === "signup") {
        await signupWithEmail(name, email, password);
        router.push("/verify-email");
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
      setLoading(false);
      if (mode === "verify") {
        if (otp.replace(/\D/g, "").length < 6) {
          setMessage("Enter the full six-digit verification code.");
          return;
        }
        const response = await verifyEmail(otp);
        setMessage(response.message);
        window.setTimeout(() => router.push("/dashboard"), 600);
        return;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="premium-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="mesh-line absolute inset-0 opacity-60" />
      <div aria-hidden className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />

      <Link href="/" className="absolute left-5 top-5 z-10 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-950">
          <Sparkles size={16} />
        </span>
        Ragora
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="glass relative z-10 grid w-full max-w-5xl overflow-hidden rounded-xl lg:grid-cols-[0.92fr_1fr]"
      >
        <aside className="hidden border-r border-white/10 bg-white/[0.035] p-8 lg:block">
          <div className="mb-20 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold text-teal-100">
            <ShieldCheck size={14} />
            SOC 2-ready auth architecture
          </div>
          <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white">
            Knowledge assistants your buyers can trust before the first demo.
          </h2>
          <div className="mt-8 space-y-3">
            {["JWT access tokens with refresh rotation", "Email OTP verification and reset tokens", "Google OAuth with backend token verification"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-teal-300" />
                {item}
              </div>
            ))}
          </div>
          <div className="float-slow mt-12 rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
              <LockKeyhole size={14} />
              Session preview
            </div>
            <div className="space-y-2 font-mono text-xs text-slate-300">
              <p>access: rg_access_••••••••</p>
              <p>refresh: rotated every login</p>
              <p>claims: workspace, role, plan</p>
            </div>
          </div>
        </aside>

        <div className="p-5 sm:p-8">
          <div className="mb-7">
            <p className="mb-2 text-xs font-semibold uppercase text-violet-200">{copy.eyebrow}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{copy.description}</p>
          </div>

          {isAuthMode && (
            <>
              <div className="grid gap-3">
                <div className="min-h-11 overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
                  {googleClientId ? (
                    <div ref={googleButtonRef} className="flex min-h-11 w-full items-center justify-center" />
                  ) : (
                    <AuthProviderButton provider="google" onSelect={handleProvider}>
                      <GoogleIcon />
                      Continue with Google
                    </AuthProviderButton>
                  )}
                </div>
              </div>
              <div className="my-6 flex items-center gap-3 text-xs uppercase text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Full name</span>
                <input className="auth-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ada Lovelace" />
              </label>
            )}

            {mode !== "reset" && mode !== "verify" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
                <input className="auth-input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@company.com" required />
              </label>
            )}

            {(mode === "login" || mode === "signup" || mode === "reset") && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Password</span>
                <input className="auth-input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••••••" required />
                {(mode === "signup" || mode === "reset") && <PasswordStrength password={password} />}
              </label>
            )}

            {mode === "verify" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Verification code</span>
                <input className="auth-input text-center font-mono text-lg tracking-[0.45em]" value={otp} onChange={(event) => setOtp(event.target.value.slice(0, 6))} placeholder="123456" inputMode="numeric" />
              </label>
            )}

            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white font-semibold text-slate-950 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.cta}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-lg border border-teal-300/20 bg-teal-300/10 px-4 py-3 text-sm text-teal-100">
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            {mode === "login" && <Link className="hover:text-white" href="/forgot-password">Forgot password?</Link>}
            {mode === "login" && <Link className="hover:text-white" href="/signup">Create an account</Link>}
            {mode === "signup" && <Link className="hover:text-white" href="/login">Already have an account?</Link>}
            {(mode === "forgot" || mode === "reset" || mode === "verify") && <Link className="hover:text-white" href="/login">Back to login</Link>}
          </div>
        </div>
      </motion.section>
    </main>
  );
}
