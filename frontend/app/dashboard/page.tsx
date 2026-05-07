"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Bot, LogOut, MessageCircle, FileText, ChevronRight } from "lucide-react";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { ChatInterface } from "@/components/ChatInterface";
import { DocumentList } from "@/components/DocumentList";
import { FileUpload } from "@/components/FileUpload";
// import { HistorySidebar } from "@/components/HistorySidebar";
import { WidgetEmbed } from "@/components/WidgetEmbed";
import { WidgetHistoryPanel } from "@/components/WidgetHistoryPanel";
import type { ChatMessage, DocumentItem, WidgetAnalytics, WidgetHistory } from "@/lib/api";
import { deleteDocument, getAnalytics, getDocuments, getHistory, getWidgetHistory } from "@/lib/api";

type View = "overview" | "builder" | "playground";

const NAV_ITEMS: { id: View; label: string; icon: typeof BarChart3; description: string }[] = [
  { id: "overview", label: "Overview", icon: BarChart3, description: "Analytics & live sessions" },
  { id: "builder", label: "Builder", icon: Bot, description: "Configure your chatbot" },
  { id: "playground", label: "Playground", icon: MessageCircle, description: "Test document Q&A" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [analytics, setAnalytics] = useState<WidgetAnalytics | null>(null);
  const [widgetHistory, setWidgetHistory] = useState<WidgetHistory | null>(null);
  const [activeView, setActiveView] = useState<View>("overview");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rag_user_id");
    if (!stored) { router.replace("/login"); return; }
    setUserId(stored);
    setIsReady(true);
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    void refreshAll(userId);
  }, [userId]);

  async function refreshAll(uid = userId) {
    if (!uid) return;
    const [history, docs, stats, wh] = await Promise.all([
      getHistory(uid), getDocuments(uid), getAnalytics(uid), getWidgetHistory(uid),
    ]);
    setMessages(history); setDocuments(docs); setAnalytics(stats); setWidgetHistory(wh);
  }

  async function handleDeleteDocument(docId: string) {
    if (!userId) return;
    await deleteDocument(userId, docId);
    setDocuments((c) => c.filter((d) => d.id !== docId));
  }

  function logout() {
    localStorage.removeItem("rag_user_id");
    router.replace("/login");
  }

  if (!isReady || !userId) return <div style={{ minHeight: "100vh", background: "var(--ink)" }} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--ink)", overflow: "hidden" }}>

      {/* ── Left rail: Chat history (lg+) ── */}
      {/* <HistorySidebar messages={messages} /> */}

      {/* ── Document sidebar (xl+) ── */}
      <div
        className="hidden xl:flex"
        style={{
          width: 272,
          flexShrink: 0,
          flexDirection: "column",
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--surface-0)",
          padding: "1.25rem 1rem",
          gap: "0",
          overflowY: "auto",
          height: "100vh",
        }}
      >
        {/* Workspace header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "grid", placeItems: "center", boxShadow: "0 0 12px var(--accent-glow)" }}>
              <FileText size={15} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userId}
              </p>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>Workspace</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className="nav-item"
                style={active ? { background: "var(--accent-dim)", color: "var(--accent-light)", marginBottom: "0.25rem" } : { marginBottom: "0.25rem" }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {active && <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.6 }} />}
              </button>
            );
          })}
        </div>

        <div className="divider" style={{ marginBottom: "1.25rem" }} />

        {/* Documents */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <FileUpload userId={userId} onUploaded={() => refreshAll(userId)} />
          <DocumentList documents={documents} onDelete={handleDeleteDocument} />
        </div>

        {/* Logout */}
        <div className="divider" style={{ margin: "1rem 0 0.875rem" }} />
        <button
          type="button"
          onClick={logout}
          className="nav-item"
          style={{ color: "var(--text-tertiary)" }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Top bar */}
        <header
          style={{
            padding: "0 1.5rem",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--surface-0)",
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", fontWeight: 500 }}>DocuMind</p>
            <ChevronRight size={12} style={{ color: "var(--text-tertiary)" }} />
            <p style={{ fontSize: "0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>
              {NAV_ITEMS.find((n) => n.id === activeView)?.label}
            </p>
          </div>

          {/* Tab switcher (mobile/tablet, always visible) */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 10,
              padding: "3px",
              gap: 2,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  style={{
                    height: 32,
                    padding: "0 0.75rem",
                    borderRadius: 7,
                    border: "none",
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "#fff" : "var(--text-tertiary)",
                    fontSize: "0.8125rem",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    transition: "background 0.15s, color 0.15s",
                    boxShadow: active ? "0 1px 8px var(--accent-glow)" : "none",
                  }}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              className="hidden md:flex"
              style={{ alignItems: "center", gap: "0.5rem" }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-default)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "var(--accent-light)",
                }}
              >
                {userId.slice(0, 2).toUpperCase()}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>{userId}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="btn-ghost"
              style={{ height: 32, width: 32, padding: 0, display: "grid", placeItems: "center" }}
              aria-label="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {/* Overview */}
          {activeView === "overview" && (
            <div style={{ padding: "1.5rem" }}>
              {/* Mobile-only: upload/docs */}
              <div className="xl:hidden" style={{ marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="card" style={{ padding: "1.125rem" }}>
                  <FileUpload userId={userId} onUploaded={() => refreshAll(userId)} />
                  <DocumentList documents={documents} onDelete={handleDeleteDocument} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Section label */}
                <div>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Analytics</h2>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "0.125rem" }}>
                    Performance metrics for your embedded chatbots
                  </p>
                </div>
                <AnalyticsPanel analytics={analytics} />

                <div style={{ marginTop: "0.5rem" }}>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: "0.125rem" }}>Live Sessions</h2>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginBottom: "1rem" }}>
                    Real-time visitor conversations from your embedded widget
                  </p>
                  <WidgetHistoryPanel history={widgetHistory} />
                </div>
              </div>
            </div>
          )}

          {/* Builder */}
          {activeView === "builder" && (
            <div style={{ padding: "1.5rem" }}>
              {/* Mobile-only docs */}
              <div className="xl:hidden" style={{ marginBottom: "1.25rem" }}>
                <div className="card" style={{ padding: "1.125rem" }}>
                  <FileUpload userId={userId} onUploaded={() => refreshAll(userId)} />
                  <DocumentList documents={documents} onDelete={handleDeleteDocument} />
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Widget Builder</h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "0.125rem" }}>
                  Customize and embed your AI chatbot in any website
                </p>
              </div>
              <WidgetEmbed userId={userId} />
            </div>
          )}

          {/* Playground */}
          {activeView === "playground" && (
            <div style={{ height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
              <ChatInterface
                userId={userId}
                messages={messages}
                onMessagesChange={setMessages}
                onRefreshHistory={() => refreshAll(userId)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}