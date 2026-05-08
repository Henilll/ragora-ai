"use client";

import { useEffect, useState } from "react";
import { Bot, Copy, Loader2, MessageCircle, Palette, Sparkles, SlidersHorizontal, UploadCloud, Check } from "lucide-react";
import type { WidgetConfig } from "@/lib/api";
import { getWidget, saveWidget } from "@/lib/api";

type Props = { userId: string };
type WidgetForm = Omit<WidgetConfig, "widget_id" | "embed_script">;

const DEFAULT_WIDGET = {
  title: "Ask AI",
  welcome_message: "Hi. Ask me anything from these documents.",
  theme: "dark" as const,
  accent_color: "#6366f1",
  secondary_color: "#0f172a",
  logo_url: "",
  icon_label: "AI",
  launcher_style: "pill" as const,
  border_radius: 14,
  launcher_label: "Chat with AI",
  input_placeholder: "Ask a question",
  position: "bottom-right" as const,
  bot_goal: "Answer visitor questions using the uploaded documents.",
  bot_role: "customer_support",
  tone: "professional",
  custom_instructions: "",
  fallback_message: "I do not know based on the provided documents.",
  collect_leads: false,
  is_enabled: true,
};

const TEMPLATES = [
  { name: "Customer Care", role: "customer_support", goal: "Help website visitors understand services, answer common questions, collect issue details, and guide them to the right next step.", welcome: "Hi. I can help with questions about our services, support, and next steps.", fallback: "I do not have that information yet. Please share your email or contact support.", color: "#6366f1" },
  { name: "HR Policies", role: "hr_policy_assistant", goal: "Help employees understand HR policies, benefits, leave rules, onboarding steps, and internal process guidance.", welcome: "Hi. Ask me about HR policies, benefits, leave, or onboarding.", fallback: "I cannot confirm that from the available policy information. Please contact HR.", color: "#8b5cf6" },
  { name: "Sales Assistant", role: "sales_assistant", goal: "Qualify leads, explain offerings, answer product questions, and encourage visitors to book a demo.", welcome: "Hi. I can help you find the right solution or book a demo.", fallback: "I do not have that detail yet. I can collect your contact details for the sales team.", color: "#0ea5e9" },
  { name: "Support Desk", role: "technical_support", goal: "Troubleshoot common product issues, ask clarifying questions, and escalate when the answer is not available.", welcome: "Hi. Tell me what is not working and I will help troubleshoot.", fallback: "I do not have a documented fix for that yet. Please share the error and contact details.", color: "#f59e0b" },
  { name: "Company FAQ", role: "internal_knowledge_base", goal: "Answer company, service, pricing, policy, and process FAQs.", welcome: "Hi. Ask me anything from this company's FAQ and documents.", fallback: "I do not know that from the available information yet.", color: "#10b981" },
];

function Section({ icon: Icon, title, description, children }: { icon: typeof Bot; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
        <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
          <Icon size={14} style={{ color: "var(--accent-light)" }} />
        </div>
        <div>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{title}</p>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>{children}</div>
    </div>
  );
}

function WidgetPreview({ form }: { form: WidgetForm }) {
  const isDark = form.theme === "dark";
  return (
    <div className="sticky top-5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Live preview</p>
          <p className="mt-1 text-xs text-slate-500">How your assistant will feel on-site</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${form.is_enabled ? "border border-teal-300/20 bg-teal-300/10 text-teal-100" : "border border-white/10 bg-white/5 text-slate-400"}`}>
          {form.is_enabled ? "Live" : "Paused"}
        </span>
      </div>
      <div className="relative min-h-[470px] overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_15%,rgba(45,212,191,0.14),transparent_14rem),radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.18),transparent_16rem),linear-gradient(180deg,rgba(15,23,42,0.86),rgba(2,6,23,0.96))] p-4">
        <div className="absolute left-5 top-5 h-2 w-28 rounded-full bg-white/10" />
        <div className="absolute left-5 top-10 h-2 w-40 rounded-full bg-white/5" />
        <div className="absolute bottom-5 right-5">
          <div
            className="mb-3 w-[280px] overflow-hidden rounded-xl border shadow-2xl"
            style={{
              borderColor: "rgba(255,255,255,0.14)",
              background: isDark ? "#080b14" : "#f8fafc",
              color: isDark ? "#f8fafc" : "#0f172a",
              borderRadius: form.border_radius,
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: form.secondary_color }}>
              <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg text-xs font-bold text-white" style={{ background: form.accent_color }}>
                {form.logo_url ? <img src={form.logo_url} alt="" className="h-full w-full object-cover" /> : form.icon_label}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{form.title || "Ask AI"}</p>
                <p className="text-[11px] text-white/55">Answers from your knowledge base</p>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="max-w-[88%] rounded-lg bg-white/[0.08] px-3 py-2 text-xs leading-5">
                {form.welcome_message || "Hi. Ask me anything from these documents."}
              </div>
              <div className="ml-auto max-w-[78%] rounded-lg px-3 py-2 text-xs leading-5 text-white" style={{ background: form.accent_color }}>
                Can you summarize the onboarding policy?
              </div>
              <div className="max-w-[92%] rounded-lg bg-white/[0.08] px-3 py-2 text-xs leading-5">
                Yes. I found the key onboarding steps and can cite the uploaded source document.
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-500">
                {form.input_placeholder || "Ask a question"}
              </div>
            </div>
          </div>
          <div
            className={`ml-auto flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-2xl ${form.launcher_style === "circle" ? "w-12 px-0" : ""}`}
            style={{ background: form.accent_color }}
          >
            <MessageCircle size={16} />
            {form.launcher_style === "pill" && (form.launcher_label || "Chat with AI")}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WidgetEmbed({ userId }: Props) {
  const [widget, setWidget] = useState<WidgetConfig | null>(null);
  const [form, setForm] = useState<WidgetForm>({ user_id: userId, ...DEFAULT_WIDGET });
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm((c) => ({ ...c, user_id: userId }));
    void loadWidget();
  }, [userId]);

  async function loadWidget() {
    const existing = await getWidget(userId);
    if (!existing) return;
    setWidget(existing);
    setForm({ user_id: userId, title: existing.title, welcome_message: existing.welcome_message, theme: existing.theme, accent_color: existing.accent_color, secondary_color: existing.secondary_color, logo_url: existing.logo_url, icon_label: existing.icon_label, launcher_style: existing.launcher_style, border_radius: existing.border_radius, launcher_label: existing.launcher_label, input_placeholder: existing.input_placeholder, position: existing.position, bot_goal: existing.bot_goal, bot_role: existing.bot_role, tone: existing.tone, custom_instructions: existing.custom_instructions, fallback_message: existing.fallback_message, collect_leads: existing.collect_leads, is_enabled: existing.is_enabled });
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveWidget(form);
      setWidget(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save widget");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyScript() {
    if (!widget?.embed_script) return;
    await navigator.clipboard.writeText(widget.embed_script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function applyTemplate(t: typeof TEMPLATES[number]) {
    setForm({ ...form, title: t.name, launcher_label: t.name === "Sales Assistant" ? "Talk to Sales" : "Ask AI", bot_role: t.role, bot_goal: t.goal, welcome_message: t.welcome, fallback_message: t.fallback, accent_color: t.color, icon_label: t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() });
  }

  function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setForm((c) => ({ ...c, logo_url: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <section className="glass rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-dim)", border: "1px solid rgba(99,102,241,0.2)", display: "grid", placeItems: "center" }}>
            <MessageCircle size={15} style={{ color: "var(--accent-light)" }} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">Chatbot Builder</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Configure appearance, behavior, launch state, and embed code.</p>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <div
            style={{
              width: 36,
              height: 20,
              borderRadius: 999,
              background: form.is_enabled ? "var(--accent)" : "var(--surface-3)",
              border: "1px solid var(--border-default)",
              position: "relative",
              transition: "background 0.15s",
              cursor: "pointer",
            }}
            onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: form.is_enabled ? 18 : 2,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.15s",
              }}
            />
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            {form.is_enabled ? "Live" : "Paused"}
          </span>
        </label>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Templates */}
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
                <Sparkles size={14} style={{ color: "var(--accent-light)" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Quick-start Templates</p>
                <p className="text-xs text-slate-500">Pick a role and tune details below.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => applyTemplate(t)}
                className="flex min-h-16 items-center gap-2 rounded-lg border px-3 py-3 text-left text-xs font-semibold transition hover:bg-white/[0.07]"
                style={{ borderColor: `${t.color}30`, background: `${t.color}10`, color: t.color }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <Section icon={Palette} title="Appearance" description="Brand, launcher, placement, and first impression.">
          {/* Logo */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div
              style={{ width: 48, height: 48, borderRadius: 8, background: form.accent_color || "var(--accent)", display: "grid", placeItems: "center", fontSize: "0.875rem", fontWeight: 700, color: "#fff", flexShrink: 0, cursor: "pointer", position: "relative", overflow: "hidden" }}
              onClick={() => {
                const inp = document.createElement("input");
                inp.type = "file"; inp.accept = "image/*";
                inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleLogoFile(f); };
                inp.click();
              }}
            >
              {form.logo_url ? <img src={form.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : form.icon_label}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <input className="inp" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="Logo URL or click preview to upload" />
              <input className="inp" value={form.icon_label} onChange={(e) => setForm({ ...form, icon_label: e.target.value.slice(0, 3).toUpperCase() })} placeholder="Icon letters (max 3)" />
            </div>
          </div>
          <input className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Widget title" />
          <input className="inp" value={form.launcher_label} onChange={(e) => setForm({ ...form, launcher_label: e.target.value })} placeholder="Launcher button label" />
          <input className="inp" value={form.input_placeholder} onChange={(e) => setForm({ ...form, input_placeholder: e.target.value })} placeholder="Input placeholder text" />
          <textarea className="inp" value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} rows={2} placeholder="Welcome message" style={{ resize: "none" }} />
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
            <select className="inp" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value as "dark" | "light" })}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
            <select className="inp" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as "bottom-right" | "bottom-left" })}>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
            <div style={{ position: "relative" }}>
              <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} aria-label="Accent color" style={{ width: 42, height: 42, padding: 4, borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--surface-0)", cursor: "pointer" }} />
            </div>
            <div style={{ position: "relative" }}>
              <input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} aria-label="Header color" style={{ width: 42, height: 42, padding: 4, borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--surface-0)", cursor: "pointer" }} />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <select className="inp" value={form.launcher_style} onChange={(e) => setForm({ ...form, launcher_style: e.target.value as "pill" | "circle" })}>
              <option value="pill">Pill Launcher</option>
              <option value="circle">Circle Launcher</option>
            </select>
            <input className="inp" type="number" min={6} max={28} value={form.border_radius} onChange={(e) => setForm({ ...form, border_radius: Number(e.target.value) })} placeholder="Border radius" />
          </div>
        </Section>

        {/* Behavior */}
        <Section icon={Bot} title="Behavior" description="Control how the assistant answers and escalates.">
          <select className="inp" value={form.bot_role} onChange={(e) => setForm({ ...form, bot_role: e.target.value })}>
            <option value="customer_support">Customer Care</option>
            <option value="hr_policy_assistant">HR Policy Assistant</option>
            <option value="sales_assistant">Sales Assistant</option>
            <option value="internal_knowledge_base">Internal Knowledge Base</option>
            <option value="technical_support">Technical Support</option>
          </select>
          <select className="inp" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="concise">Concise</option>
            <option value="empathetic">Empathetic</option>
          </select>
          <textarea className="inp" value={form.bot_goal} onChange={(e) => setForm({ ...form, bot_goal: e.target.value })} rows={3} placeholder="Business goal — what should this bot accomplish?" style={{ resize: "none" }} />
          <textarea className="inp" value={form.fallback_message} onChange={(e) => setForm({ ...form, fallback_message: e.target.value })} rows={2} placeholder="Message when no answer is found" style={{ resize: "none" }} />
        </Section>

        {/* Advanced */}
        <Section icon={SlidersHorizontal} title="Advanced" description="Extra guardrails and deployment settings.">
          <textarea className="inp" value={form.custom_instructions} onChange={(e) => setForm({ ...form, custom_instructions: e.target.value })} rows={6} placeholder="Custom system instructions. Example: Ask for contact details before answering pricing questions." style={{ resize: "none" }} />
          <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", padding: "0.625rem 0.75rem", borderRadius: 8, background: "var(--surface-0)", border: "1px solid var(--border-subtle)" }}>
            <input type="checkbox" checked={form.collect_leads} onChange={(e) => setForm({ ...form, collect_leads: e.target.checked })} style={{ accentColor: "var(--accent)" }} />
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>Collect lead / contact details when useful</span>
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-accent"
            style={{ height: "2.625rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
            {isSaving ? "Saving…" : "Save Chatbot"}
          </button>
          {error && <p style={{ fontSize: "0.75rem", color: "var(--danger)" }}>{error}</p>}
        </Section>

        {/* Embed code */}
        {widget?.embed_script && (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>Embed Code</p>
              <button
                type="button"
                onClick={copyScript}
                className="btn-ghost"
                style={{ height: "1.875rem", padding: "0 0.75rem", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem" }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre
              style={{
                overflowX: "auto",
                padding: "0.875rem",
                borderRadius: 8,
                background: "var(--surface-0)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.6875rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <code>{widget.embed_script}</code>
            </pre>
          </div>
        )}
      </div>
      <WidgetPreview form={form} />
      </div>
    </section>
  );
}
