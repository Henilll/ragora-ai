"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  FileSearch,
  Globe2,
  Linkedin,
  LockKeyhole,
  Mail,
  Menu,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

const developer = {
  name: "Henil Bhavsar",
  linkedin: "https://www.linkedin.com/in/henil-bhavsar-18b45b311/",
  email: "henilbhavsar164@gmail.com",
};

function LogoMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-white text-base font-bold text-[#16130F]">
        H<span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-[#E8490F]" />
      </span>
      <span className="text-base font-semibold tracking-tight text-[#F2EFE7]">Ragora</span>
    </span>
  );
}

function DemoWidget() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(
    "Hi. I answer from the sample documents on this page. Try a question below, or ask about files, embedding, or security."
  );
  const [sources, setSources] = useState(["Sample: Ragora product notes"]);

  function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    let next = "I don't have enough information in the sample documents to answer that confidently. Try asking about files, embedding, or security, or contact the workspace owner for pricing and plans.";
    let nextSources = ["Sample: Ragora product notes"];
    if (lower.includes("file") || lower.includes("upload") || lower.includes("pdf") || lower.includes("docx") || lower.includes("txt")) {
      next = "You can upload PDF, TXT, Markdown, and DOCX files. Ragora chunks them, embeds them, and answers from those documents only, with sources cited like [S1].";
      nextSources = ["[S1] Upload guide", "[S2] Supported formats"];
    } else if (lower.includes("embed") || lower.includes("website") || lower.includes("widget")) {
      next = "Yes. Build your widget in the builder, pick a title, colours, and welcome message, then paste one script tag on your site. No code change is needed when you update the widget later.";
      nextSources = ["[S1] Widget builder", "[S2] Embed guide"];
    } else if (lower.includes("security") || lower.includes("safe") || lower.includes("rate") || lower.includes("domain")) {
      next = "Widgets can be restricted to allowed domains, and chat is rate limited per visitor and per widget. Sign-in uses JWT with refresh rotation, and provider error detail is never sent to visitors.";
      nextSources = ["[S1] Security notes", "[S2] Widget settings"];
    } else if (lower.includes("remember") || lower.includes("memory") || lower.includes("follow")) {
      next = "Yes. The widget remembers the last few messages in your conversation, so follow-ups like 'tell me more' work. Facts still come from your documents, not from memory alone.";
      nextSources = ["[S1] Widget memory"];
    } else if (lower.includes("feedback") || lower.includes("regenerat")) {
      next = "Visitors can mark an answer Helpful or Not helpful, and ask for a regenerated answer. Owners see those votes in analytics, next to unanswered questions.";
      nextSources = ["[S1] Analytics", "[S2] Feedback"];
    }
    setAnswer(next);
    setSources(nextSources);
    setQuestion("");
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#FFFEFA] p-0 text-[#16130F] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-lg bg-[#16130F] text-base font-bold text-white">
            H<span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-[#E8490F]" />
          </span>
          <div>
            <p className="text-sm font-semibold">Ask Ragora</p>
            <p className="text-xs text-black/60">Answers from sample documents</p>
          </div>
        </div>
        <span className="rounded-full bg-[#E8490F]/10 px-3 py-1 text-xs font-semibold text-[#E8490F]">Live demo</span>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="rounded-xl bg-[#F2EFE7] p-4 text-sm leading-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-black/50">Ragora</p>
          <p>{answer}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sources.map((source) => (
              <span key={source} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs">{source}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["What files can I upload?", "How do I embed it?", "Is it secure?"].map((chip) => (
            <button key={chip} type="button" onClick={() => ask(chip)} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium hover:border-[#E8490F] hover:text-[#E8490F]">
              {chip}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about Ragora..."
            aria-label="Ask the demo widget a question"
            className="h-11 flex-1 rounded-lg border border-black/15 bg-white px-3 text-sm text-[#16130F] outline-none placeholder:text-black/40 focus:border-[#E8490F]"
          />
          <button type="submit" className="h-11 rounded-lg bg-[#E8490F] px-4 text-sm font-semibold text-white hover:bg-[#FF6B2C]">
            Send
          </button>
        </form>
        <p className="text-xs leading-5 text-black/50">
          This demo runs in your browser only, from sample notes. Your real widget answers from your own documents, and says so when it does not know.
        </p>
      </div>
    </div>
  );
}

const steps = [
  {
    number: "01",
    title: "Upload your documents",
    text: "Drop in PDF, TXT, Markdown, or DOCX files. Ragora chunks and embeds them, and shows processing, then ready, then failed, never a silent stuck state.",
  },
  {
    number: "02",
    title: "Build the widget once",
    text: "Set the title, welcome message, suggested questions, colours, logo, allowed domains, and chat model. Save, and every embed updates at once.",
  },
  {
    number: "03",
    title: "Embed it, then learn from it",
    text: "Paste one script tag on your site. Visitors get cited answers, follow-ups work, and you see unanswered questions and feedback in analytics.",
  },
];

const features = [
  {
    icon: FileSearch,
    title: "Grounded, not guessed",
    text: "Answers come from retrieved chunks first, with [S1] sources. When no source supports an answer, the widget uses your fallback message instead of inventing one.",
  },
  {
    icon: MessageSquareText,
    title: "Widget memory that works",
    text: "The last few visitor messages are part of the prompt, so 'tell me more' and 'what about the second one' stay on topic.",
  },
  {
    icon: Bot,
    title: "Feedback and regenerate, built in",
    text: "Visitors mark answers Helpful or Not helpful and ask for a regenerated answer. Owners see the votes next to unanswered questions.",
  },
  {
    icon: ShieldCheck,
    title: "Abuse controls, not just auth",
    text: "Per-visitor and per-widget rate limits, optional domain allowlist, message size caps, and a disable switch that actually hides the widget.",
  },
  {
    icon: BarChart3,
    title: "Analytics you can act on",
    text: "Questions, visitors, unanswered topics, latency, token estimates, and feedback, with history search and CSV or JSON export.",
  },
  {
    icon: Zap,
    title: "Fast, and honest about failure",
    text: "Streaming answers, background uploads, model fallback when a model name fails, and generic errors to visitors with full detail in server logs only.",
  },
];

const faqs = [
  ["What does Ragora do?", "Ragora turns your documents into a website chatbot. Visitors ask questions, Ragora retrieves the relevant chunks, and answers with sources, in your brand colours."],
  ["What files can I upload?", "PDF, TXT, Markdown, and DOCX, up to 20 MB and 200 pages for PDFs by default. Uploads run in the background and show processing, ready, or failed."],
  ["What happens when Ragora does not know an answer?", "It uses your fallback message, for example 'I do not know based on the provided documents.' It does not invent prices, dates, policies, or document contents."],
  ["Can I embed it on my website?", "Yes. The builder gives you one script tag. Changing the title, colours, or questions in the builder updates every embed, with no code change on your site."],
  ["Is it secure for a customer site?", "Sign-in uses JWT with refresh rotation and email verification. Widgets add rate limits, an optional domain allowlist, and a disable switch. Provider keys are stored for the backend only, never sent to visitors."],
  ["Do I need to write code to use it?", "No. Upload, build, and embed are all in the dashboard. Developers can also use the same chat and widget APIs if they want to."],
];

const pricing = [
  {
    name: "Starter",
    price: "Free",
    note: "To try Ragora on one site",
    points: ["1 widget", "PDF, TXT, Markdown, DOCX uploads", "Suggested questions and welcome message", "Basic analytics"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Growth",
    price: "Custom",
    note: "For teams that need more volume",
    points: ["Everything in Starter", "Widget memory and feedback", "Domain allowlist and rate limits", "History search and export", "Model choice per widget"],
    cta: "Contact us",
    featured: true,
  },
  {
    name: "Business",
    price: "Custom",
    note: "For high-traffic sites and support teams",
    points: ["Everything in Growth", "Priority support", "Custom limits and retention", "Onboarding help for your first widget"],
    cta: "Contact us",
    featured: false,
  },
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#0C0E11] text-[#F2EFE7]">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0C0E11]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Ragora home"><LogoMark /></Link>
          <div className="hidden items-center gap-7 text-sm text-[#B0ABA0] md:flex">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-[#B0ABA0] hover:text-white sm:block">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-[#E8490F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#FF6B2C]">Start free</Link>
            <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-white/10 p-2 md:hidden">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm">
              <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
              <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
            </div>
          </div>
        )}
      </nav>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#B0ABA0]">
              <span className="h-2 w-2 rounded-full bg-[#E8490F]" /> RAG chatbot platform, built for real sites
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Your documents, answering customers.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#B0ABA0]">
              Upload your PDFs and docs, embed one chatbot on your site, and give visitors cited answers from your own knowledge, not guesses. When Ragora does not know, it says so.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#E8490F] px-6 font-semibold text-white hover:bg-[#FF6B2C]">
                Start free <ArrowRight size={18} />
              </Link>
              <a href="#how" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 px-6 font-semibold text-white hover:bg-white/5">
                See how it works
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm">
              <div><p className="font-semibold text-white">250+ live users</p><p className="text-[#76716A]">On Ragora today</p></div>
              <div><p className="font-semibold text-white">PDF, TXT, MD, DOCX</p><p className="text-[#76716A]">Upload formats</p></div>
              <div><p className="font-semibold text-white">Sources cited</p><p className="text-[#76716A]">On every grounded answer</p></div>
            </div>
            <p className="mt-6 text-sm text-[#76716A]">
              For support, sales, operations, and founder-led teams that need fast, accurate answers from private knowledge.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <DemoWidget />
            <p className="mt-4 text-center text-xs text-[#76716A]">Try it above. Your real widget looks the same, with your documents, colours, and logo.</p>
          </motion.div>
        </div>
      </section>

      <section id="how" style={{ scrollMarginTop: 84 }} className="border-y border-white/10 bg-[#12151A] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#76716A]">How it works</p>
          <h2 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Three steps, no code, no fake demo.</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-xl border border-white/10 bg-[#0C0E11] p-6">
                <p className="text-sm font-semibold text-[#E8490F]">{step.number}</p>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#B0ABA0]">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" style={{ scrollMarginTop: 84 }} className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#76716A]">Features</p>
        <h2 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Built for answers you can trust, and questions you can fix.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-xl border border-white/10 bg-[#12151A] p-6">
                <div className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-[#E8490F]/12 text-[#FF6B2C]"><Icon size={20} /></div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#B0ABA0]">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#12151A] px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#76716A]">Dashboard</p>
            <h2 className="text-4xl font-semibold tracking-tight">See what visitors ask, and what you are missing.</h2>
            <p className="mt-4 max-w-lg leading-7 text-[#B0ABA0]">
              Analytics shows top questions, unanswered topics, feedback votes, and latency, so you know which document to add next. History search and export make follow-up easy.
            </p>
            <div className="mt-8 space-y-3">
              {["Top questions and unanswered topics", "Helpful and Not helpful votes", "History search, CSV and JSON export", "Widget builder with live preview"].map((item) => (
                <p key={item} className="flex items-start gap-2 text-sm"><Check size={18} className="mt-0.5 shrink-0 text-[#FF6B2C]" /> {item}</p>
              ))}
            </div>
            <Link href="/dashboard" className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-4 font-semibold hover:bg-white/5">
              Open dashboard <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0C0E11] p-5">
            <p className="mb-4 text-sm font-semibold">Sample workspace, last 30 days</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Questions", "1,240"],
                ["Unique visitors", "312"],
                ["Unanswered", "18"],
                ["Helpful votes", "96"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-[#12151A] p-4">
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-[#76716A]">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#76716A]">Sample data, shown so you can see the layout. Your dashboard shows your real numbers, with no invented totals.</p>
            <div className="mt-5 rounded-lg border border-white/10 bg-[#12151A] p-4 text-sm">
              <p className="font-semibold">Unanswered question to fix next</p>
              <p className="mt-1 text-[#B0ABA0]">“Do you offer installation?” - add that page to your documents, and the next visitor gets a cited answer.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" style={{ scrollMarginTop: 84 }} className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#76716A]">Pricing</p>
        <h2 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Start free. Pay for volume when you need it.</h2>
        <p className="mt-4 max-w-xl text-[#B0ABA0]">Growth and Business pricing is set with the workspace owner, not invented on this page. Contact us for a quote for your traffic and limits.</p>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {pricing.map((tier) => (
            <article key={tier.name} className={`rounded-xl border p-6 ${tier.featured ? "border-[#E8490F] bg-[#12151A]" : "border-white/10 bg-[#12151A]"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                {tier.featured && <span className="rounded-full bg-[#E8490F]/12 px-3 py-1 text-xs font-semibold text-[#FF6B2C]">Most popular</span>}
              </div>
              <p className="mt-4 text-4xl font-semibold">{tier.price}</p>
              <p className="mt-2 text-sm text-[#76716A]">{tier.note}</p>
              <ul className="mt-6 space-y-3">
                {tier.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm"><Check size={18} className="mt-0.5 shrink-0 text-[#FF6B2C]" /> {point}</li>
                ))}
              </ul>
              <Link href={tier.cta === "Start free" ? "/signup" : `mailto:${developer.email}`} className={`mt-8 flex h-11 items-center justify-center rounded-lg font-semibold ${tier.featured ? "bg-[#E8490F] text-white hover:bg-[#FF6B2C]" : "border border-white/15 hover:bg-white/5"}`}>
                {tier.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#12151A] px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#76716A]">Used in production</p>
            <p className="text-4xl font-semibold tracking-tight">250+ live users, one honest widget.</p>
          </div>
          <article className="rounded-xl border border-white/10 bg-[#0C0E11] p-6">
            <p className="text-base leading-7 text-[#F2EFE7]">“Ragora made our help center feel alive in one afternoon. The quality bar feels like a product we would happily pay for.”</p>
            <a href="https://www.linkedin.com/in/yug04/" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 font-semibold hover:text-[#FF6B2C]">
              <Linkedin size={16} /> Yug Khatri
            </a>
            <p className="text-sm text-[#76716A]">Uses Ragora on his portfolio site</p>
          </article>
        </div>
      </section>

      <section id="faq" style={{ scrollMarginTop: 84 }} className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
        <h2 className="mb-8 text-center text-4xl font-semibold tracking-tight">Questions, answered honestly.</h2>
        <div className="space-y-3">
          {faqs.map(([question, answer], index) => (
            <button key={question} type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="w-full rounded-xl border border-white/10 bg-[#12151A] p-5 text-left">
              <span className="flex items-center justify-between gap-4 text-base font-semibold">
                {question}
                <ChevronDown className={`h-4 w-4 shrink-0 transition ${openFaq === index ? "rotate-180" : ""}`} />
              </span>
              {openFaq === index && <span className="mt-3 block text-sm leading-6 text-[#B0ABA0]">{answer}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-[#12151A] p-8 text-center sm:p-14">
          <Globe2 className="mx-auto mb-5 h-10 w-10 text-[#FF6B2C]" />
          <h2 className="text-4xl font-semibold tracking-tight">Give visitors answers from your own documents.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#B0ABA0]">Upload, build, embed. If Ragora does not know, it will say so, and you will see exactly what to add next.</p>
          <Link href="/signup" className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-[#E8490F] px-6 font-semibold text-white hover:bg-[#FF6B2C]">
            Start free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <LogoMark />
            <p className="mt-5 max-w-md text-sm leading-7 text-[#B0ABA0]">
              Ragora turns documents into a website chatbot with cited answers, widget memory, feedback, and analytics for support, sales, and operations teams.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={developer.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/5">
                <Linkedin size={16} /> LinkedIn
              </a>
              <a href={`mailto:${developer.email}`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/5">
                <Mail size={16} /> Contact
              </a>
            </div>
            <p className="mt-8 text-sm text-[#76716A]">Built by {developer.name}, AI Engineer.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="mb-4 text-sm font-semibold">Product</p>
              <div className="space-y-3 text-sm text-[#76716A]">
                <Link href="/dashboard" className="block hover:text-white">Dashboard</Link>
                <a href="#features" className="block hover:text-white">Features</a>
                <a href="#pricing" className="block hover:text-white">Pricing</a>
                <Link href="/signup" className="block hover:text-white">Start free</Link>
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-semibold">Resources</p>
              <div className="space-y-3 text-sm text-[#76716A]">
                <a href="https://github.com/Henilll" target="_blank" rel="noreferrer" className="block hover:text-white">GitHub</a>
                <a href={developer.linkedin} target="_blank" rel="noreferrer" className="block hover:text-white">LinkedIn</a>
                <a href={`mailto:${developer.email}`} className="block hover:text-white">Contact</a>
              </div>
            </div>
            <div>
              <p className="mb-4 text-sm font-semibold">Company</p>
              <div className="space-y-3 text-sm text-[#76716A]">
                <a href="#faq" className="block hover:text-white">FAQ</a>
                <a href="#how" className="block hover:text-white">How it works</a>
                <a href="#features" className="block hover:text-white">Features</a>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-[#76716A] sm:flex-row">
          <p>© 2026 Ragora. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href={developer.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-white"><Linkedin size={16} /></a>
            <a href={`mailto:${developer.email}`} aria-label="Email" className="hover:text-white"><Mail size={16} /></a>
            <LockKeyhole size={16} />
            <Upload size={16} />
            <Sparkles size={16} />
          </div>
        </div>
      </footer>
    </main>
  );
}
