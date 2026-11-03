"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileStack,
  LogOut,
  MessageCircle,
  Rocket,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { DocumentList } from "@/components/DocumentList";
import { FileUpload } from "@/components/FileUpload";
import { WidgetEmbed } from "@/components/WidgetEmbed";
import { WidgetHistoryPanel } from "@/components/WidgetHistoryPanel";
import type { ChatMessage, DocumentItem, WidgetAnalytics, WidgetHistory } from "@/lib/api";
import { deleteDocument, getAnalytics, getDocuments, getHistory, getWidgetHistory, widgetHistoryExportUrl } from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth";

type View = "overview" | "builder" | "playground";

const NAV_ITEMS: { id: View; label: string; icon: typeof BarChart3; description: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart3, description: "Numbers, gaps, and live visitor conversations" },
  { id: "builder", label: "Builder", icon: Bot, description: "Design, preview, and publish your widget" },
  { id: "playground", label: "Playground", icon: MessageCircle, description: "Test answers against your own documents" },
];

const viewMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof BarChart3; label: string; value: string | number; detail: string }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.06]">
          <Icon size={16} style={{ color: "var(--accent-light)" }} />
        </div>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">{label}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [analytics, setAnalytics] = useState<WidgetAnalytics | null>(null);
  const [widgetHistory, setWidgetHistory] = useState<WidgetHistory | null>(null);
  const [activeView, setActiveView] = useState<View>("overview");
  const [isReady, setIsReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentView = NAV_ITEMS.find((n) => n.id === activeView) ?? NAV_ITEMS[0];

  useEffect(() => {
    const session = getSession();
    const stored = session?.user.workspace || localStorage.getItem("rag_user_id");
    if (!stored) { router.replace("/login"); return; }
    setUserId(stored);
    setIsAdmin(Boolean(session?.user.is_admin));
    setIsReady(true);
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    void refreshAll(userId);
  }, [userId]);

  async function refreshAll(uid = userId) {
    if (!uid) return;
    const [history, docs, stats, wh] = await Promise.allSettled([
      getHistory(uid), getDocuments(uid), getAnalytics(uid), getWidgetHistory(uid),
    ] as const);
    if (history.status === "fulfilled") setMessages(history.value);
    if (docs.status === "fulfilled") setDocuments(docs.value);
    if (stats.status === "fulfilled") setAnalytics(stats.value);
    if (wh.status === "fulfilled") setWidgetHistory(wh.value);
    const failed = [history, docs, stats, wh].filter((r) => r.status === "rejected");
    setLoadError(failed.length > 0 ? "Some dashboard data did not load. Your documents and settings are unchanged - try Refresh below." : null);
  }

  async function handleHistorySearch(query: string) {
    if (!userId) return;
    const wh = await getWidgetHistory(userId, { q: query || undefined, limit: 30 });
    setWidgetHistory(wh);
  }

  async function handleDeleteDocument(docId: string) {
    if (!userId) return;
    await deleteDocument(userId, docId);
    setDocuments((c) => c.filter((d) => d.id !== docId));
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!isReady || !userId) {
    return (
      <div className="premium-shell grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-sm space-y-3">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-40 w-full" />
          <p className="text-center text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const readyDocs = documents.filter((d) => (d.status ?? "ready") === "ready").length;
  const processingDocs = documents.filter((d) => d.status === "processing").length;
  const failedDocs = documents.filter((d) => d.status === "failed").length;
  const initials = userId.slice(0, 2).toUpperCase();

  const navButtons = NAV_ITEMS.map((item) => {
    const Icon = item.icon;
    const active = activeView === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActiveView(item.id)}
        aria-current={active ? "page" : undefined}
        className={`nav-item ${active ? "active" : ""}`}
      >
        <Icon size={15} />
        <span className="flex-1">
          <span className="block">{item.label}</span>
          <span className="mt-0.5 hidden text-[11px] font-normal leading-4 text-slate-500 xl:block">{item.description}</span>
        </span>
      </button>
    );
  });

  const sourcesBlock = (
    <div className="flex flex-col gap-3">
      <FileUpload userId={userId} onUploaded={() => refreshAll(userId)} />
      <DocumentList documents={documents} onDelete={handleDeleteDocument} />
    </div>
  );

  return (
    <div className="premium-shell flex h-screen overflow-hidden">
      {/* Sidebar: from lg up, so a laptop sees sources without scrolling past content. */}
      <aside className="hidden w-[280px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0C0E11] px-4 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-bold text-[#0C0E11]">
            H<span style={{ color: "#E8490F" }}>.</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Ragora</p>
            <p className="truncate text-xs text-slate-500" title={userId}>{userId}</p>
          </div>
        </div>

        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Console</p>
        <nav className="mb-6 flex flex-col gap-0.5" aria-label="Dashboard sections">{navButtons}</nav>

        {isAdmin && (
          <Link href="/admin" className="btn-ghost mb-6 flex h-10 items-center justify-center gap-2 font-semibold text-slate-200">
            <ShieldCheck size={15} />
            Admin panel
          </Link>
        )}

        <div className="flex-1">{sourcesBlock}</div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <button type="button" onClick={logout} className="nav-item">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0C0E11] px-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-[#0C0E11]">
              H<span style={{ color: "#E8490F" }}>.</span>
            </div>
            <p className="truncate text-sm font-bold text-white">Ragora</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin" className="rounded-lg border border-[#E8490F]/30 bg-[#E8490F]/10 px-3 py-1.5 text-xs font-semibold text-[#FF6B2C]">Admin</Link>
            )}
            <button type="button" onClick={logout} className="btn-ghost grid h-9 w-9 place-items-center p-0" aria-label="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Mobile tabs + sources, one place, not repeated in every view */}
        <div className="shrink-0 border-b border-white/10 bg-[#0C0E11] px-4 py-3 lg:hidden">
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1" role="tablist" aria-label="Dashboard sections">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveView(item.id)}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-semibold"
                  style={{ background: active ? "#fff" : "transparent", color: active ? "#0C0E11" : "var(--text-secondary)" }}
                >
                  <Icon size={13} />
                  {item.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm font-semibold text-slate-200"
          >
            <span className="flex items-center gap-2">
              <UploadCloud size={15} />
              Sources: {readyDocs} ready{processingDocs > 0 ? `, ${processingDocs} processing` : ""}{failedDocs > 0 ? `, ${failedDocs} failed` : ""}
            </span>
            <ChevronDown size={15} style={{ transform: showSources ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {showSources && <div className="mt-3">{sourcesBlock}</div>}
        </div>

        {/* Desktop top bar */}
        <header className="hidden h-[68px] shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#0C0E11] px-6 lg:flex">
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-400">
              <span className="text-slate-500">Ragora Console / </span>
              <span className="font-semibold text-slate-200">{currentView.label}</span>
            </p>
            <p className="truncate text-xs text-slate-500">{currentView.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => refreshAll(userId)} className="btn-ghost h-9 px-3 font-semibold">Refresh</button>
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.07] text-[10px] font-bold text-[#FF6B2C]">{initials}</span>
              {userId}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeView === "overview" && (
              <motion.div key="overview" {...viewMotion} transition={{ duration: 0.28, ease: "easeOut" }} className="p-4 sm:p-6">
                <div className="flex flex-col gap-6">
                  {loadError && <div className="notice-error" role="alert">{loadError}</div>}

                  <section className="card p-5 sm:p-6">
                    <p className="rag3-eyebrow mb-2">Ragora console</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your knowledge, in one place</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Upload sources, test answers, then publish the widget. The numbers below are
                      your real workspace numbers, not demo totals.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setActiveView("builder")} className="btn-accent inline-flex h-10 items-center gap-2 px-4">
                        <Rocket size={15} />
                        Open builder
                      </button>
                      <button type="button" onClick={() => setActiveView("playground")} className="btn-ghost inline-flex h-10 items-center gap-2 px-4 font-semibold text-white">
                        <MessageCircle size={15} />
                        Test answers
                      </button>
                    </div>
                  </section>

                  {/* Next steps: only real, checkable steps, no fake progress. */}
                  <section className="card p-5" aria-label="Next steps">
                    <h2 className="text-sm font-semibold text-white">Next steps</h2>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                      <li className="flex items-start gap-2.5 text-sm">
                        {documents.length > 0 ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#5EC99A]" /> : <FileStack size={17} className="mt-0.5 shrink-0 text-slate-500" />}
                        <span className="leading-5 text-slate-300">
                          <strong className="text-white">Upload a source</strong><br />
                          {documents.length > 0 ? `${readyDocs} of ${documents.length} ready.` : "No documents yet. Upload from the sidebar."}
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm">
                        {messages.length > 0 ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#5EC99A]" /> : <MessageCircle size={17} className="mt-0.5 shrink-0 text-slate-500" />}
                        <span className="leading-5 text-slate-300">
                          <strong className="text-white">Test in playground</strong><br />
                          {messages.length > 0 ? "Playground history exists." : "Ask a question and check the answer."}
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm">
                        <Bot size={17} className="mt-0.5 shrink-0 text-slate-500" />
                        <span className="leading-5 text-slate-300">
                          <strong className="text-white">Publish the widget</strong><br />
                          Copy the embed code from Builder and paste it on your site.
                        </span>
                      </li>
                    </ul>
                  </section>

                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace numbers">
                    <StatCard icon={FileStack} label="Sources" value={`${readyDocs} / ${documents.length}`} detail={processingDocs > 0 ? `${processingDocs} still processing.` : failedDocs > 0 ? `${failedDocs} failed - re-upload those files.` : "Ready sources answer widget questions."} />
                    <StatCard icon={MessageCircle} label="Visitor questions" value={analytics?.user_messages ?? 0} detail="Questions asked through the embedded widget." />
                    <StatCard icon={BarChart3} label="Unique visitors" value={analytics?.unique_visitors ?? 0} detail="Distinct visitors who chatted with the widget." />
                    <StatCard icon={CircleAlert} label="Unanswered" value={analytics?.unanswered_count ?? 0} detail={analytics && analytics.unanswered_count > 0 ? "These questions need a new source document." : "No unanswered questions in this period."} />
                  </section>

                  <section>
                    <h2 className="mb-3 text-base font-semibold text-white">Analytics</h2>
                    <AnalyticsPanel analytics={analytics} />
                  </section>

                  <section>
                    <h2 className="mb-1 text-base font-semibold text-white">Live sessions</h2>
                    <p className="mb-4 text-sm text-slate-500">Recent visitor conversations from your embedded widget.</p>
                    <WidgetHistoryPanel history={widgetHistory} onSearch={handleHistorySearch} exportCsvUrl={userId ? widgetHistoryExportUrl(userId, "csv") : undefined} exportJsonUrl={userId ? widgetHistoryExportUrl(userId, "json") : undefined} />
                  </section>
                </div>
              </motion.div>
            )}

            {activeView === "builder" && (
              <motion.div key="builder" {...viewMotion} transition={{ duration: 0.28, ease: "easeOut" }} className="p-4 sm:p-6">
                <div className="card mb-5 p-5">
                  <p className="rag3-eyebrow">Step 1 - Appearance · Step 2 - Behaviour · Step 3 - Publish</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Design a customer-facing assistant</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Tune brand, tone, instructions and install script in one place. The preview on
                    the right updates as you type, and saving does not change any embed code already on a site.
                  </p>
                </div>
                <WidgetEmbed userId={userId} />
              </motion.div>
            )}

            {activeView === "playground" && (
              <motion.div key="playground" {...viewMotion} transition={{ duration: 0.28, ease: "easeOut" }} className="flex min-h-[calc(100vh-68px)] flex-col lg:min-h-[calc(100vh-68px)]">
                <ChatInterface
                  userId={userId}
                  messages={messages}
                  documents={documents}
                  onMessagesChange={setMessages}
                  onRefreshHistory={() => refreshAll(userId)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
