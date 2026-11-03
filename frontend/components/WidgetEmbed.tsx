"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, Copy, Loader2, MessageCircle, Palette, Sparkles, SlidersHorizontal, UploadCloud, X } from "lucide-react";
import type { WidgetConfig } from "@/lib/api";
import { API_BASE_URL, checkApiHealth, getWidget, saveWidget, uploadWidgetLogo } from "@/lib/api";

type Props = { userId: string };
type WidgetForm = Omit<WidgetConfig, "widget_id" | "embed_script">;

const DEFAULT_WIDGET = {
  title: "Ask AI",
  welcome_message: "Hi. Ask me anything from these documents.",
  suggested_questions: [] as string[],
  allowed_domains: [] as string[],
  chat_model: "",
  theme: "dark" as const,
  accent_color: "#E8490F",
  secondary_color: "#161513",
  logo_url: "",
  icon_label: "AI",
  company_name: "",
  company_site: "",
  company_email: "",
  launcher_style: "pill" as const,
  launcher_circle_size: 60,
  launcher_pill_size: 56,
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
  { name: "Customer Care", role: "customer_support", goal: "Help website visitors understand services, answer common questions, collect issue details, and guide them to the right next step.", welcome: "Hi. I can help with questions about our services, support, and next steps.", fallback: "I do not have that information yet. Please share your email or contact support.", color: "#E8490F" },
  { name: "HR Policies", role: "hr_policy_assistant", goal: "Help employees understand HR policies, benefits, leave rules, onboarding steps, and internal process guidance.", welcome: "Hi. Ask me about HR policies, benefits, leave, or onboarding.", fallback: "I cannot confirm that from the available policy information. Please contact HR.", color: "#A16207" },
  { name: "Sales Assistant", role: "sales_assistant", goal: "Qualify leads, explain offerings, answer product questions, and encourage visitors to book a demo.", welcome: "Hi. I can help you find the right solution or book a demo.", fallback: "I do not have that detail yet. I can collect your contact details for the sales team.", color: "#0F766E" },
  { name: "Support Desk", role: "technical_support", goal: "Troubleshoot common product issues, ask clarifying questions, and escalate when the answer is not available.", welcome: "Hi. Tell me what is not working and I will help troubleshoot.", fallback: "I do not have a documented fix for that yet. Please share the error and contact details.", color: "#D97706" },
  { name: "Company FAQ", role: "internal_knowledge_base", goal: "Answer company, service, pricing, policy, and process FAQs.", welcome: "Hi. Ask me anything from this company's FAQ and documents.", fallback: "I do not know that from the available information yet.", color: "#2E9E6B" },
];

const PRESET_LOGOS = [
  { label: "Spark", initials: "AI", bg: "#0C0E11", fg: "#ffffff", shape: "spark" },
  { label: "Support", initials: "S", bg: "#0F766E", fg: "#ffffff", shape: "chat" },
  { label: "Growth", initials: "G", bg: "#2E9E6B", fg: "#052e1a", shape: "bolt" },
  { label: "Trust", initials: "T", bg: "#D97706", fg: "#241200", shape: "shield" },
  { label: "Docs", initials: "D", bg: "#A16207", fg: "#ffffff", shape: "doc" },
];

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const MAX_LOGO_BYTES = 1_000_000;

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function readableTextColor(background: string) {
  if (!isHexColor(background)) return "#ffffff";
  const hex = background.slice(1);
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const transform = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
  return luminance > 0.52 ? "#061014" : "#ffffff";
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const color = isHexColor(value) ? value : "#E8490F";
  return (
    <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-white/10 bg-slate-950/35 px-2">
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{ width: 30, height: 30, padding: 2, borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--surface-0)", cursor: "pointer" }}
      />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
          onBlur={(e) => {
            if (!isHexColor(e.target.value)) onChange(color);
          }}
          className="w-24 bg-transparent font-mono text-xs text-slate-100 outline-none"
          spellCheck={false}
        />
      </div>
    </label>
  );
}

function LogoMark({ form, className }: { form: WidgetForm; className?: string }) {
  const [failedUrl, setFailedUrl] = useState("");
  const logoUrl = form.logo_url.trim();
  const showImage = logoUrl && failedUrl !== logoUrl;
  return showImage ? (
    <img src={logoUrl} alt="" className={className ?? "h-full w-full object-contain bg-white p-1"} onError={() => setFailedUrl(logoUrl)} />
  ) : (
    <>{form.icon_label || "AI"}</>
  );
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${window.btoa(svg)}`;
}

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
  const accentText = readableTextColor(form.accent_color);
  const headerText = readableTextColor(form.secondary_color);
  const circleSize = clampNumber(form.launcher_circle_size ?? DEFAULT_WIDGET.launcher_circle_size, 44, 96);
  const pillSize = clampNumber(form.launcher_pill_size ?? DEFAULT_WIDGET.launcher_pill_size, 44, 80);
  const activeLauncherSize = form.launcher_style === "circle" ? circleSize : pillSize;
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [demoState, setDemoState] = useState<"idle" | "typing" | "streaming" | "done">("idle");
  const [demoWords, setDemoWords] = useState(0);
  const DEMO_ANSWER = "Onboarding takes 3 steps: complete your profile, verify your documents, and book your first session. Most teams finish in one working day.";
  const demoTokens = DEMO_ANSWER.split(" ");
  useEffect(() => {
    if (demoState !== "streaming") return;
    if (demoWords >= demoTokens.length) { setDemoState("done"); return; }
    const t = setTimeout(() => setDemoWords((n) => n + 1), 55);
    return () => clearTimeout(t);
  }, [demoState, demoWords, demoTokens.length]);
  function playDemo() {
    setDemoWords(0);
    setDemoState("typing");
    setTimeout(() => setDemoState("streaming"), 650);
  }
  function resetDemo() { setDemoState("idle"); setDemoWords(0); }
  // Theme-aware preview colours. This fixes the old bug where the backdrop
  // was always a dark gradient, even when the owner picked Light theme.
  const siteBg = isDark ? "#0C0E11" : "#EDE9E0";
  const siteText = isDark ? "#F2EFE7" : "#161513";
  const siteMuted = isDark ? "#76716A" : "#8A857B";
  const panelBg = isDark ? "#0D0F14" : "#FFFEFA";
  const panelText = isDark ? "#F2EFE7" : "#161513";
  const botBubble = isDark ? "#1D222A" : "#FFFFFF";
  const botBorder = isDark ? "rgba(255,255,255,0.11)" : "#E3DED2";
  const isMobile = previewMode === "mobile";
  const chips = (form.suggested_questions || []).filter((q) => q.trim()).slice(0, 4);
  return (
    <div className="sticky top-5 overflow-hidden rounded-xl border border-white/10 bg-[#12151A] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Live preview</p>
          <p className="mt-1 text-xs text-slate-500">How your assistant will feel on-site</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${form.is_enabled ? "border border-white/10 bg-white/5 text-slate-300" : "border border-white/10 bg-white/5 text-slate-400"}`}>
          {form.is_enabled ? "Live" : "Paused"}
        </span>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1" role="group" aria-label="Preview size">
          {(["desktop", "mobile"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setPreviewMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${previewMode === m ? "bg-white text-slate-950" : "text-slate-400"}`}>
              {m === "desktop" ? "Desktop" : "Mobile"}
            </button>
          ))}
        </div>
        {demoState === "idle" || demoState === "done" ? (
          <button type="button" onClick={playDemo} className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "#E8490F" }}>
            {demoState === "done" ? "Replay streaming demo" : "Play streaming demo"}
          </button>
        ) : (
          <button type="button" onClick={resetDemo} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">Reset demo</button>
        )}
      </div>
      <div className="relative overflow-hidden rounded-xl border border-white/10 p-4" style={{ background: siteBg, minHeight: isMobile ? 520 : 470 }}>
        {/* Fake host site chrome, so the preview reads as a real page, not a floating card */}
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#D8D2C4" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#D8D2C4" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#D8D2C4" }} />
          <span className="ml-1 truncate rounded-md px-2 py-1 font-mono text-[11px]" style={{ background: isDark ? "#1D222A" : "#FFFFFF", color: siteMuted, border: `1px solid ${botBorder}` }}>
            {form.company_site ? form.company_site.replace(/^https?:\/\//, "") : "your-website.com"}
          </span>
        </div>
        <div className="mb-4">
          <div className="h-2.5 w-40 rounded-full" style={{ background: isDark ? "#262C36" : "#D8D2C4" }} />
          <div className="mt-2 h-2 w-56 rounded-full" style={{ background: isDark ? "#1D222A" : "#E3DED2" }} />
          <p className="mt-2 text-xs" style={{ color: siteMuted }}>{form.company_name || "Your business"} - homepage</p>
        </div>
        <div className={`flex ${form.position === "bottom-left" ? "justify-start" : "justify-end"}`}>
          <div
            className="overflow-hidden border shadow-2xl"
            style={{
              width: isMobile ? "100%" : 300,
              borderColor: botBorder,
              background: panelBg,
              color: panelText,
              borderRadius: isMobile ? "18px 18px 0 0" : form.border_radius,
            }}
          >
            {isMobile && <div className="mx-auto mt-2 h-1 w-9 rounded-full" style={{ background: isDark ? "#262C36" : "#D8D2C4" }} />}
            <div style={{ height: 4, background: form.accent_color }} />
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: form.secondary_color, color: headerText }}>
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg text-xs font-bold" style={{ background: form.logo_url ? "#ffffff" : form.accent_color, color: accentText }}>
                <LogoMark form={form} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{form.title || "Ask AI"}</p>
                <p className="text-[11px] opacity-65">{form.company_name ? `${form.company_name} - Answers from your documents` : "Answers from your documents"}</p>
              </div>
              <span className="ml-auto flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide opacity-75"><span className="h-1.5 w-1.5 rounded-full" style={{ background: "#5EC99A" }} />Online</span>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2">
                <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg text-[11px] font-bold" style={{ background: form.logo_url ? "#ffffff" : form.accent_color, color: accentText }}>
                  <LogoMark form={form} />
                </div>
                <div className="flex-1 rounded-lg px-3 py-2 text-xs leading-5" style={{ background: botBubble, border: `1px solid ${botBorder}`, borderLeft: `3px solid ${form.accent_color}` }}>
                  {form.welcome_message || "Hi. Ask me anything from these documents."}
                </div>
              </div>
              {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((q) => (
                    <span key={q} className="rounded-full px-2.5 py-1 text-[11px] leading-4" style={{ border: `1px solid ${botBorder}`, background: botBubble }}>{q}</span>
                  ))}
                </div>
              )}
              <div className="ml-auto max-w-[78%] rounded-lg px-3 py-2 text-xs leading-5" style={{ background: form.accent_color, color: accentText }}>
                Can you summarize the onboarding policy?
              </div>
              {demoState === "typing" && (
                <div className="max-w-[92%] rounded-lg px-3 py-2 text-xs leading-5" style={{ background: botBubble, border: `1px solid ${botBorder}`, borderLeft: `3px solid ${form.accent_color}` }}>
                  <span className="inline-flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: form.accent_color }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: form.accent_color, animationDelay: "0.15s" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: form.accent_color, animationDelay: "0.3s" }} /></span>
                </div>
              )}
              {(demoState === "streaming" || demoState === "done") && (
                <div className="max-w-[92%] rounded-lg px-3 py-2 text-xs leading-5" style={{ background: botBubble, border: `1px solid ${botBorder}`, borderLeft: `3px solid ${form.accent_color}` }}>
                  {demoTokens.slice(0, demoWords).join(" ")}{demoState === "streaming" && <span className="ml-0.5 inline-block h-3 w-[2px] align-middle" style={{ background: form.accent_color }} />}
                  {demoState === "done" && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full px-2 py-0.5 font-mono text-[10px]" style={{ border: `1px solid ${botBorder}` }}>Sources (1) - onboarding-policy.pdf</span>
                    </div>
                  )}
                </div>
              )}
              {demoState === "done" && (
                <div className="flex flex-wrap gap-1.5">
                  {["Explain this in simpler terms", "What are the next steps?"].map((q) => (
                    <span key={q} className="rounded-full px-2.5 py-1 text-[11px]" style={{ border: `1px solid ${form.accent_color}`, color: form.accent_color }}>{q}</span>
                  ))}
                </div>
              )}
              {demoState === "idle" && (
                <div className="max-w-[92%] rounded-lg px-3 py-2 text-xs leading-5" style={{ background: botBubble, border: `1px solid ${botBorder}`, borderLeft: `3px solid ${form.accent_color}` }}>
                  Yes. I found the key onboarding steps and can cite the uploaded source document.
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wide opacity-60">Sources (1) - onboarding-policy.pdf</div>
                </div>
              )}
              <div className="rounded-lg px-3 py-2 text-xs" style={{ border: `1px solid ${botBorder}`, color: siteMuted }}>
                {form.input_placeholder || "Ask a question"}
              </div>
            </div>
            <div className="flex items-center justify-center px-3 pb-2.5 pt-2" style={{ borderTop: `1px solid ${botBorder}` }}>
              <div className="inline-flex min-h-7 items-center gap-1.5 text-[11px] leading-none opacity-70">
                <span className="grid h-5 w-5 place-items-center rounded-md text-[11px] font-black text-white" style={{ background: form.accent_color, color: accentText }}>R</span>
                <span>Powered by Ragora</span>
              </div>
            </div>
          </div>
        </div>
        {!isMobile && (
          <div
            className="ml-auto mt-3 flex items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-2xl"
            style={{
              background: form.accent_color,
              color: accentText,
              height: activeLauncherSize,
              minWidth: form.launcher_style === "circle" ? activeLauncherSize : Math.max(148, pillSize * 2.7),
              width: form.launcher_style === "circle" ? activeLauncherSize : undefined,
              paddingInline: form.launcher_style === "circle" ? 0 : Math.max(16, Math.round(pillSize * 0.34)),
            }}
          >
            <span
              className="grid place-items-center overflow-hidden rounded-full"
              style={{
                width: Math.max(30, Math.round(activeLauncherSize * 0.62)),
                height: Math.max(30, Math.round(activeLauncherSize * 0.62)),
                background: form.logo_url ? "#ffffff" : "rgba(255,255,255,0.38)",
              }}
            >
              {form.logo_url ? <LogoMark form={form} /> : <MessageCircle size={Math.max(16, Math.round(activeLauncherSize * 0.3))} />}
            </span>
            {form.launcher_style === "pill" && (form.launcher_label || "Chat with AI")}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">The streaming demo types a real sample answer in the preview. It does not call your backend - it only shows how streaming will feel on a live site. On a live site the widget now plays a soft sound on send and on a new answer, with a Sound on/off icon button in the chat header that remembers the visitor&apos;s choice. Bot answers also carry the brand avatar, and a welcome message with &gt; lines no longer shows the &gt; characters.</p>
    </div>
  );
}

function BuilderChecklist({ form, widget }: { form: WidgetForm; widget: WidgetConfig | null }) {
  const items = [
    { label: "Widget title set", done: Boolean(form.title.trim()) },
    { label: "Welcome message set", done: Boolean(form.welcome_message.trim()) },
    { label: "At least 1 suggested question", done: (form.suggested_questions || []).filter((q) => q.trim()).length > 0 },
    { label: "Company email set, for fallback routing", done: Boolean(form.company_email.trim()) },
    { label: "Fallback message set", done: Boolean(form.fallback_message.trim()) },
    { label: "Accent and header are valid colours", done: isHexColor(form.accent_color) && isHexColor(form.secondary_color) },
    { label: "Widget saved at least once", done: Boolean(widget?.embed_script) },
  ];
  const done = items.filter((i) => i.done).length;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Before you publish</p>
        <span className="font-mono text-xs text-slate-400">{done} / {items.length}</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ background: "#E8490F", width: `${Math.round((done / items.length) * 100)}%` }} />
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-xs text-slate-300">
            <span className={item.done ? "text-[#5EC99A]" : "text-slate-500"}>{item.done ? "✓" : "○"}</span>
            <span className={item.done ? "" : "text-slate-400"}>{item.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        {done === items.length
          ? "Ready to publish. Copy the embed code and test it on a live page."
          : "Finish the items above, then Save Chatbot. Suggested questions are optional, but they are the first thing visitors tap."}
      </p>
    </div>
  );
}

function TestGuide() {
  const tests = [
    "Open the live widget and tap a suggested question. It should stream word by word, not appear all at once.",
    "Ask a question from an uploaded document. Sources should appear under the answer.",
    "While an answer streams, press Stop. The partial answer should stay, with a Retry option.",
    "Reload the page. Your conversation should come back.",
    "Shrink to phone width. The panel should become a bottom sheet, not cover the whole page.",
    "Ask about price or a demo with lead capture on. A lead card should appear after the answer.",
    "Check sound: send a message (soft blip) and wait for the answer (soft chime). Tap Sound in the chat header to mute - reload and it should stay muted.",
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <p className="mb-2 text-sm font-semibold text-white">Test it in 2 minutes</p>
      <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-5 text-slate-400">
        {tests.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
    </div>
  );
}

export function WidgetEmbed({ userId }: Props) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [widget, setWidget] = useState<WidgetConfig | null>(null);
  const [form, setForm] = useState<WidgetForm>({ user_id: userId, ...DEFAULT_WIDGET });
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [backendCheck, setBackendCheck] = useState<string | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const isDirty = savedSnapshot !== null && JSON.stringify(form) !== savedSnapshot;

  useEffect(() => {
    setForm((c) => ({ ...c, user_id: userId }));
    void loadWidget();
  }, [userId]);

  async function loadWidget() {
    const existing = await getWidget(userId);
    if (!existing) return;
    setWidget(existing);
    const loaded = { user_id: userId, title: existing.title, welcome_message: existing.welcome_message, suggested_questions: existing.suggested_questions ?? [], allowed_domains: existing.allowed_domains ?? [], chat_model: existing.chat_model ?? "", theme: existing.theme, accent_color: existing.accent_color, secondary_color: existing.secondary_color, logo_url: existing.logo_url, icon_label: existing.icon_label, company_name: existing.company_name || "", company_site: existing.company_site || "", company_email: existing.company_email || "", launcher_style: existing.launcher_style, launcher_circle_size: existing.launcher_circle_size ?? DEFAULT_WIDGET.launcher_circle_size, launcher_pill_size: existing.launcher_pill_size ?? DEFAULT_WIDGET.launcher_pill_size, border_radius: existing.border_radius, launcher_label: existing.launcher_label, input_placeholder: existing.input_placeholder, position: existing.position, bot_goal: existing.bot_goal, bot_role: existing.bot_role, tone: existing.tone, custom_instructions: existing.custom_instructions, fallback_message: existing.fallback_message, collect_leads: existing.collect_leads, is_enabled: existing.is_enabled };
    setForm(loaded);
    setSavedSnapshot(JSON.stringify(loaded));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Give the widget a title first, in Step 1. It shows at the top of the chat window.");
      setStep(1);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const fallback =
        form.company_email && !form.fallback_message.includes(form.company_email)
          ? `I do not know based on the provided documents. Please contact ${form.company_email} for help.`
          : form.fallback_message;
      const saved = await saveWidget({
        ...form,
        suggested_questions: (form.suggested_questions || []).map((q) => q.trim()).filter(Boolean).map((q) => q.slice(0, 140)).slice(0, 4),
        allowed_domains: (form.allowed_domains || []).map((d) => d.trim().toLowerCase()).filter(Boolean).slice(0, 20),
        chat_model: (form.chat_model || "").trim(),
        logo_url: form.logo_url.trim(),
        accent_color: isHexColor(form.accent_color) ? form.accent_color : DEFAULT_WIDGET.accent_color,
        secondary_color: isHexColor(form.secondary_color) ? form.secondary_color : DEFAULT_WIDGET.secondary_color,
        launcher_circle_size: clampNumber(Number(form.launcher_circle_size), 44, 96),
        launcher_pill_size: clampNumber(Number(form.launcher_pill_size), 44, 80),
        border_radius: clampNumber(Number(form.border_radius), 6, 28),
        fallback_message: fallback,
      });
      setWidget(saved);
      const nextForm = { ...form, fallback_message: saved.fallback_message, suggested_questions: saved.suggested_questions ?? [], allowed_domains: saved.allowed_domains ?? [], chat_model: saved.chat_model ?? "" };
      setForm(nextForm);
      setSavedSnapshot(JSON.stringify(nextForm));
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
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

  async function handleLogoFile(file: File) {
    setError(null);
    const logoExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    const logoExtOk = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(logoExt);
    if (!LOGO_TYPES.includes(file.type) && !logoExtOk) {
      setError("Upload a PNG, JPG, WebP, SVG, or GIF logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be 1 MB or smaller.");
      return;
    }

    setIsLogoUploading(true);
    try {
      const response = await uploadWidgetLogo(file);
      setForm((c) => ({ ...c, logo_url: response.logo_url }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logo upload failed.";
      // If the API cannot be reached at all, a small file (like an SVG logo)
      // can still be stored directly in the widget config as a data URL, so
      // the owner is not blocked by a backend URL problem. Larger files are
      // not stored this way, or every visitor would download a huge config.
      if (message.includes("could not reach the API") && file.size <= 100_000) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not read the logo file."));
            reader.readAsDataURL(file);
          });
          setForm((c) => ({ ...c, logo_url: dataUrl }));
          setError("API unreachable, so this logo is stored directly in the widget config (works for small files like SVG). Save the widget to keep it, and fix the backend URL for larger uploads.");
        } catch {
          setError(message);
        }
      } else {
        setError(message);
      }
    } finally {
      setIsLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  function presetSvg(preset: typeof PRESET_LOGOS[number]) {
    const icon =
      preset.shape === "chat"
        ? '<path d="M30 22h52a10 10 0 0 1 10 10v26a10 10 0 0 1-10 10H51L32 82v-14h-2a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>'
        : preset.shape === "bolt"
          ? '<path d="M58 12 28 58h24l-8 34 32-48H52l6-32Z" fill="currentColor"/>'
          : preset.shape === "shield"
            ? '<path d="M56 12 24 24v24c0 22 14 38 32 44 18-6 32-22 32-44V24L56 12Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/><path d="m42 52 10 10 22-24" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
            : preset.shape === "doc"
              ? '<path d="M32 16h34l18 18v54H32V16Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/><path d="M66 16v20h18M44 52h28M44 66h28" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>'
              : '<path d="m56 12 8 28 28 8-28 8-8 28-8-28-28-8 28-8 8-28Z" fill="currentColor"/>';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112"><rect width="112" height="112" rx="28" fill="${preset.bg}"/><g color="${preset.fg}">${icon}</g></svg>`;
  }

  function selectPresetLogo(preset: typeof PRESET_LOGOS[number]) {
    setError(null);
    setForm((c) => ({
      ...c,
      logo_url: svgDataUrl(presetSvg(preset)),
      icon_label: preset.initials,
      accent_color: preset.bg,
    }));
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#171B21] p-4 sm:p-6">
      {/* Top bar: status and Save are always visible, never buried at the bottom. */}
      <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-dim)", border: "1px solid rgba(232,73,15,0.25)", display: "grid", placeItems: "center" }}>
            <MessageCircle size={15} style={{ color: "var(--accent-light)" }} />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">Chatbot Builder</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
              {form.is_enabled ? "Live on your site" : "Paused - visitors will not see it"}
              {isDirty ? " · Unsaved changes" : savedAt ? ` · Saved at ${savedAt}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <div
              style={{ width: 36, height: 20, borderRadius: 999, background: form.is_enabled ? "var(--accent)" : "var(--surface-3)", border: "1px solid var(--border-default)", position: "relative", transition: "background 0.15s", cursor: "pointer" }}
              onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}
              role="switch"
              aria-checked={form.is_enabled}
              aria-label="Widget enabled"
            >
              <div style={{ position: "absolute", top: 2, left: form.is_enabled ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>{form.is_enabled ? "Live" : "Paused"}</span>
          </label>
          <button type="button" onClick={handleSave} disabled={isSaving} className="btn-accent inline-flex h-10 items-center gap-2 px-4">
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
            {isSaving ? "Saving…" : isDirty ? "Save changes" : "Save"}
          </button>
        </div>
      </div>
      {error && <div className="notice-error mb-5" role="alert">{error}</div>}
      {/* Steps, like Chatbase / Fin / Botpress: Look, Behaviour, Publish. */}
      <nav className="mb-5 flex gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1" aria-label="Builder steps">
        {([{ n: 1, label: "Look", hint: "Logo, colours, launcher" }, { n: 2, label: "Behaviour", hint: "Role, tone, fallback" }, { n: 3, label: "Publish", hint: "Checklist, embed code" }] as const).map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            aria-current={step === s.n ? "step" : undefined}
            className="flex-1 rounded-md px-3 py-2 text-left"
            style={{ background: step === s.n ? "#fff" : "transparent", color: step === s.n ? "#0C0E11" : "var(--text-secondary)" }}
          >
            <span className="block text-xs font-bold">Step {s.n} - {s.label}</span>
            <span className="mt-0.5 hidden text-[11px] sm:block" style={{ color: step === s.n ? "#4b5563" : "var(--text-tertiary)" }}>{s.hint}</span>
          </button>
        ))}
      </nav>
      {/* Mobile: Edit / Preview switch, so the preview is not a long scroll away. */}
      <div className="mb-5 flex gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 xl:hidden" aria-label="Edit or preview">
        {(["edit", "preview"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setMobileView(v)} className="flex-1 rounded-md py-2 text-xs font-semibold capitalize" style={{ background: mobileView === v ? "#fff" : "transparent", color: mobileView === v ? "#0C0E11" : "var(--text-secondary)" }}>
            {v === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className={`flex-col gap-3 ${mobileView === "preview" ? "hidden xl:flex" : "flex"}`}>
        {step === 1 && (<>
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
          <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleLogoFile(file);
              }}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="group relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 text-sm font-bold text-white"
                style={{ background: form.logo_url ? "#ffffff" : (form.accent_color || "var(--accent)") }}
                onClick={() => logoInputRef.current?.click()}
                aria-label="Upload widget logo"
              >
                <LogoMark form={form} />
                <span className="absolute inset-0 hidden place-items-center bg-black/55 text-white group-hover:grid">
                  {isLogoUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isLogoUploading}
                    className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white transition disabled:opacity-60" style={{ background: "#E8490F" }}
                  >
                    {isLogoUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                    {isLogoUploading ? "Uploading" : "Upload logo"}
                  </button>
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logo_url: "" })}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
                    >
                      <X size={13} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Stored in Supabase Storage. PNG, JPG, WebP, SVG, or GIF up to 1 MB.</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-500">
                  <span className="break-all">Backend API: {API_BASE_URL}</span>
                  <button
                    type="button"
                    disabled={isCheckingBackend}
                    onClick={async () => {
                      setIsCheckingBackend(true);
                      setBackendCheck(null);
                      const ok = await checkApiHealth();
                      setBackendCheck(ok ? "Backend reachable." : `Backend unreachable at ${API_BASE_URL}. Check NEXT_PUBLIC_API_BASE_URL in Vercel and redeploy.`);
                      setIsCheckingBackend(false);
                    }}
                    className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 disabled:opacity-60"
                  >
                    {isCheckingBackend ? "Checking..." : "Test connection"}
                  </button>
                  {backendCheck && <span>{backendCheck}</span>}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_140px]">
              <input className="inp" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} onBlur={(e) => setForm({ ...form, logo_url: e.target.value.trim() })} placeholder="Logo URL" />
              <input className="inp" value={form.icon_label} onChange={(e) => setForm({ ...form, icon_label: e.target.value.slice(0, 3).toUpperCase() })} placeholder="Icon letters" />
            </div>
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Built-in logos</p>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_LOGOS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => selectPresetLogo(preset)}
                    disabled={isLogoUploading}
                    className="grid h-12 place-items-center rounded-lg border border-white/10 text-xs font-bold transition hover:-translate-y-0.5 disabled:opacity-50"
                    style={{ background: preset.bg, color: preset.fg }}
                    aria-label={`Use ${preset.label} logo`}
                    title={preset.label}
                  >
                    {preset.initials}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="inp" aria-label="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Company name" />
            <input className="inp" aria-label="Company support email" value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} type="email" placeholder="Company support email" />
          </div>
          <input className="inp" aria-label="Company website" value={form.company_site} onChange={(e) => setForm({ ...form, company_site: e.target.value })} placeholder="Company website (optional)" />
          <div>
            <label className="text-xs font-semibold text-slate-300">Allowed domains for this widget (optional)</label>
            <textarea className="inp mt-2" aria-label="Allowed domains, one per line" value={(form.allowed_domains || []).join("\n")} onChange={(e) => setForm({ ...form, allowed_domains: e.target.value.split("\n") })} rows={2} placeholder={"example.com\nshop.example.com"} style={{ resize: "none" }} />
            <p className="mt-1 text-xs leading-5 text-slate-500">Leave blank to allow any site (current behaviour). When set, widget chat is rejected from other origins. Subdomains of a listed domain are allowed.</p>
            <label className="mt-3 block text-xs font-semibold text-slate-300">Chat model (optional, blank = default)</label>
            <select className="inp mt-2" aria-label="Chat model" value={form.chat_model || ""} onChange={(e) => setForm({ ...form, chat_model: e.target.value })}>
              <option value="">Default (backend setting)</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (fast)</option>
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (stronger)</option>
            </select>
            <p className="mt-1 text-xs leading-5 text-slate-500">If the chosen model fails, the backend tries its fallback model once before giving up.</p>
          </div>
          <input className="inp" aria-label="Widget title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Widget title" />
          <input className="inp" aria-label="Launcher button label" value={form.launcher_label} onChange={(e) => setForm({ ...form, launcher_label: e.target.value })} placeholder="Launcher button label" />
          <input className="inp" aria-label="Input placeholder text" value={form.input_placeholder} onChange={(e) => setForm({ ...form, input_placeholder: e.target.value })} placeholder="Input placeholder text" />
          <textarea className="inp" aria-label="Welcome message" value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} rows={2} placeholder="Welcome message" style={{ resize: "none" }} />
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300">Suggested questions</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, suggested_questions: ["What services do you offer?", "How do I get started?", "How can I contact support?"] })}
                className="text-xs font-semibold text-[#FF6B2C] hover:text-white"
              >
                Use examples
              </button>
            </div>
            <textarea
              className="inp"
              aria-label="Suggested questions, one per line"
              value={(form.suggested_questions || []).join("\n")}
              onChange={(e) => setForm({ ...form, suggested_questions: e.target.value.split("\n") })}
              rows={4}
              placeholder={"One question per line, up to 4.\nExample: What is your return policy?"}
              style={{ resize: "none" }}
            />
            <p className="mt-1 text-xs text-slate-500">
              These show as chips under the welcome message on the visitor&apos;s site. Leave blank to use Ragora&apos;s generic chips. Only the first 4 lines are saved.
              {(form.suggested_questions || []).filter((q) => q.trim()).length > 4 && (
                <span className="text-amber-300"> Only the first 4 will show.</span>
              )}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <select className="inp" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value as "dark" | "light" })}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
            <select className="inp" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as "bottom-right" | "bottom-left" })}>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <ColorControl label="Accent" value={form.accent_color} onChange={(accent_color) => setForm({ ...form, accent_color })} />
            <ColorControl label="Header" value={form.secondary_color} onChange={(secondary_color) => setForm({ ...form, secondary_color })} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <select className="inp" value={form.launcher_style} onChange={(e) => setForm({ ...form, launcher_style: e.target.value as "pill" | "circle" })}>
              <option value="pill">Pill Launcher</option>
              <option value="circle">Circle Launcher</option>
            </select>
            <input className="inp" type="number" min={6} max={28} value={form.border_radius} onChange={(e) => setForm({ ...form, border_radius: Number(e.target.value) })} placeholder="Border radius" />
          </div>
          <div className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/35 p-3 md:grid-cols-2">
            <label className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Circle size</span>
                <span className="font-mono text-slate-500">{form.launcher_circle_size}px</span>
              </div>
              <input
                type="range"
                min={44}
                max={96}
                value={form.launcher_circle_size}
                onChange={(e) => setForm({ ...form, launcher_circle_size: Number(e.target.value) })}
                className="w-full" style={{ accentColor: "var(--accent)" }}
              />
            </label>
            <label className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Pill height</span>
                <span className="font-mono text-slate-500">{form.launcher_pill_size}px</span>
              </div>
              <input
                type="range"
                min={44}
                max={80}
                value={form.launcher_pill_size}
                onChange={(e) => setForm({ ...form, launcher_pill_size: Number(e.target.value) })}
                className="w-full" style={{ accentColor: "var(--accent)" }}
              />
            </label>
          </div>
        </Section>

        </>)}
        {step === 2 && (<>
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
        </Section>

        </>)}
        {step === 3 && (<>
          <BuilderChecklist form={form} widget={widget} />
          <TestGuide />
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
          {!widget?.embed_script && (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-white">Embed code appears after the first save</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Save from the top bar, then come back to Step 3. Paste the script once, just before &lt;/body&gt;, on every page where the widget should appear.</p>
            </div>
          )}
        </>)}
      </div>
      <div className={`flex-col gap-4 xl:sticky xl:top-4 xl:self-start ${mobileView === "edit" ? "hidden xl:flex" : "flex"}`}>
        <WidgetPreview form={form} />
      </div>
      </div>
    </section>
  );
}
