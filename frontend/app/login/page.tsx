"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    localStorage.setItem("rag_user_id", trimmed);
    router.push("/dashboard");
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: "var(--ink)" }}
    >
      {/* Subtle radial glow behind the card */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="fade-up w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8 flex items-center gap-3">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--accent)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 20px var(--accent-glow)",
            }}
          >
            <FileText size={19} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              DocuMind
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 400 }}>
              PDF RAG Platform
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{ padding: "2rem", boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)" }}
        >
          <h1
            style={{
              fontSize: "1.375rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: "0.375rem",
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1.75rem" }}>
            Enter your workspace to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="username"
              style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Username
            </label>
            <input
              id="username"
              className="inp"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="your-workspace"
              style={{ marginBottom: "1.25rem", height: "2.625rem" }}
            />

            <button
              type="submit"
              disabled={!username.trim()}
              className="btn-accent"
              style={{
                width: "100%",
                height: "2.625rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              Continue
              <ArrowRight size={15} />
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          No account required — enter any name to begin.
        </p>
      </div>
    </main>
  );
}