"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  Activity, ArrowLeft, Bot, CheckCircle2, Database, KeyRound,
  Loader2, Plus, RefreshCw, ShieldCheck, Sparkles, ToggleLeft,
  ToggleRight, Trash2, Users, AlertTriangle, Cpu, Clock, TrendingUp,
  TrendingDown, Zap, BarChart2, Settings, Bell, LogOut, ChevronRight,
  ArrowUpRight, ArrowDownRight, Globe, FileText, MessageSquare, Server,
  Layers, HardDrive, Wifi, WifiOff, CheckCircle, XCircle, Eye,
} from "lucide-react";

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockOverview = {
  users: 1284, admins: 5, documents: 3460, ready_documents: 3201,
  processing_documents: 47, failed_documents: 12, chunks: 128_430,
  chats: 9_847, widgets: 34, live_widgets: 28, widget_messages: 47_320,
  api_keys: 12, enabled_api_keys: 9,
};

const mockKeys = [
  { id: "1", service: "groq", name: "Production Key A", key_value: "gsk_•••••••••••••••••••••••rX9a", weight: 5, is_enabled: true, usage_count: 14_201, failure_count: 3, last_error: null },
  { id: "2", service: "groq", name: "Production Key B", key_value: "gsk_•••••••••••••••••••••••mT2f", weight: 3, is_enabled: true, usage_count: 8_972, failure_count: 0, last_error: null },
  { id: "3", service: "groq", name: "Backup Key", key_value: "gsk_•••••••••••••••••••••••aK7z", weight: 1, is_enabled: false, usage_count: 201, failure_count: 12, last_error: "Rate limit exceeded on 2025-05-07" },
  { id: "4", service: "mistral", name: "Embed Key Primary", key_value: "mis_•••••••••••••••••••••••bJ4q", weight: 8, is_enabled: true, usage_count: 22_103, failure_count: 1, last_error: null },
  { id: "5", service: "mistral", name: "Embed Key Secondary", key_value: "mis_•••••••••••••••••••••••cL8w", weight: 4, is_enabled: true, usage_count: 11_067, failure_count: 0, last_error: null },
];

const mockUsers = [
  { id: "1", name: "Arjun Sharma", email: "arjun@acme.io", workspace: "Acme Corp", provider: "google", email_verified: true, is_admin: true, last_sign_in_at: "2025-05-09T06:12:00Z", source: "oauth" },
  { id: "2", name: "Priya Patel", email: "priya@nexus.ai", workspace: "Nexus AI", provider: "email", email_verified: true, is_admin: false, last_sign_in_at: "2025-05-08T22:45:00Z", source: "auth" },
  { id: "3", name: "Rahul Mehta", email: "rahul@devstudio.in", workspace: "DevStudio", provider: "github", email_verified: true, is_admin: false, last_sign_in_at: "2025-05-08T18:30:00Z", source: "oauth" },
  { id: "4", name: "Sneha Iyer", email: "sneha@fintech.com", workspace: "FinTech Ltd", provider: "email", email_verified: false, is_admin: false, last_sign_in_at: "2025-05-07T11:20:00Z", source: "auth" },
  { id: "5", name: "Vikram Nair", email: "vikram@cloudops.io", workspace: "CloudOps", provider: "google", email_verified: true, is_admin: true, last_sign_in_at: "2025-05-09T04:50:00Z", source: "oauth" },
  { id: "6", name: "Ananya Das", email: "ananya@startup.xyz", workspace: "Startup XYZ", provider: "email", email_verified: true, is_admin: false, last_sign_in_at: "2025-05-06T09:00:00Z", source: "auth" },
  { id: "7", name: "Karthik Raj", email: "karthik@logicware.in", workspace: "Logicware", provider: "github", email_verified: true, is_admin: false, last_sign_in_at: "2025-05-05T14:15:00Z", source: "oauth" },
  { id: "8", name: "Meera Krishnan", email: "meera@databyte.io", workspace: "DataByte", provider: "google", email_verified: true, is_admin: false, last_sign_in_at: "2025-05-09T01:22:00Z", source: "oauth" },
];

const msgVolumeData = [
  { day: "Apr 3", widget: 1_420, playground: 540 },
  { day: "Apr 6", widget: 1_670, playground: 620 },
  { day: "Apr 9", widget: 1_310, playground: 480 },
  { day: "Apr 12", widget: 1_890, playground: 710 },
  { day: "Apr 15", widget: 2_240, playground: 830 },
  { day: "Apr 18", widget: 1_980, playground: 760 },
  { day: "Apr 21", widget: 2_100, playground: 890 },
  { day: "Apr 24", widget: 2_450, playground: 940 },
  { day: "Apr 27", widget: 2_880, playground: 1_010 },
  { day: "Apr 30", widget: 3_020, playground: 1_140 },
  { day: "May 3", widget: 3_400, playground: 1_280 },
  { day: "May 6", widget: 3_750, playground: 1_390 },
  { day: "May 9", widget: 4_120, playground: 1_520 },
];

const userGrowthData = [
  { month: "Nov", users: 342 },
  { month: "Dec", users: 490 },
  { month: "Jan", users: 650 },
  { month: "Feb", users: 820 },
  { month: "Mar", users: 1_040 },
  { month: "Apr", users: 1_190 },
  { month: "May", users: 1_284 },
];

const docStatusData = [
  { name: "Ready", value: 3201, color: "#2dd4bf" },
  { name: "Processing", value: 47, color: "#a78bfa" },
  { name: "Failed", value: 12, color: "#f87171" },
  { name: "Pending", value: 200, color: "#94a3b8" },
];

const keyUsageData = [
  { name: "Prod A", usage: 14201, fails: 3 },
  { name: "Prod B", usage: 8972, fails: 0 },
  { name: "Embed P", usage: 22103, fails: 1 },
  { name: "Embed S", usage: 11067, fails: 0 },
  { name: "Backup", usage: 201, fails: 12 },
];

const activityFeed = [
  { id: 1, type: "key_added", msg: "New Groq key 'Prod Key C' added", time: "2 min ago", color: "text-violet-300", icon: KeyRound },
  { id: 2, type: "doc_failed", msg: "Document 'Q4 Report.pdf' failed to process", time: "14 min ago", color: "text-rose-300", icon: AlertTriangle },
  { id: 3, type: "user_joined", msg: "New user meera@databyte.io signed up via Google", time: "28 min ago", color: "text-teal-300", icon: Users },
  { id: 4, type: "key_toggled", msg: "Groq 'Backup Key' disabled by admin", time: "1 hr ago", color: "text-amber-300", icon: ToggleLeft },
  { id: 5, type: "widget_live", msg: "Widget 'Support Bot v3' went live", time: "2 hr ago", color: "text-teal-300", icon: Zap },
  { id: 6, type: "doc_ready", msg: "47 documents indexed successfully", time: "3 hr ago", color: "text-teal-300", icon: CheckCircle },
  { id: 7, type: "admin_granted", msg: "Admin access granted to vikram@cloudops.io", time: "5 hr ago", color: "text-violet-300", icon: ShieldCheck },
  { id: 8, type: "rate_limit", msg: "Groq Backup Key hit rate limit (x12)", time: "6 hr ago", color: "text-rose-300", icon: AlertTriangle },
];

const systemHealth = [
  { label: "API Gateway", status: "operational", latency: "42ms", uptime: "99.98%" },
  { label: "Embedding Service", status: "operational", latency: "118ms", uptime: "99.95%" },
  { label: "Vector Store", status: "operational", latency: "9ms", uptime: "100%" },
  { label: "Document Pipeline", status: "degraded", latency: "820ms", uptime: "97.4%" },
  { label: "Auth Service", status: "operational", latency: "31ms", uptime: "99.99%" },
  { label: "Widget CDN", status: "operational", latency: "15ms", uptime: "100%" },
];

// ─── Styled helpers ───────────────────────────────────────────────────────────

const TABS = ["Overview", "Analytics", "API Keys", "Users", "System"];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const glassCard = "rounded-xl border border-white/10 bg-white/[0.045] backdrop-blur";
const glassCardDark = "rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Metric({ icon: Icon, label, value, trend, trendLabel, accent = "teal" }) {
  const up = trend > 0;
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className={cn(glassCard, "p-4 shadow-[0_16px_48px_rgba(0,0,0,0.28)] group")}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-950">
          <Icon size={16} />
        </div>
        {trend !== undefined && (
          <span className={cn(
            "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            up
              ? "border border-teal-300/20 bg-teal-300/10 text-teal-200"
              : "border border-rose-300/20 bg-rose-300/10 text-rose-200"
          )}>
            {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
        {trend === undefined && (
          <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2.5 py-1 text-[10px] font-bold text-teal-100 tracking-wider uppercase">Live</span>
        )}
      </div>
      <p className="text-2xl font-bold text-white leading-none">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      {trendLabel && <p className="mt-1 text-[11px] text-slate-600">{trendLabel}</p>}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, badge }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white">
          <Icon size={15} />
        </div>
        <div>
          <p className="font-semibold text-white">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl text-xs">
      <p className="mb-1 font-semibold text-slate-300">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold text-white">{p.value?.toLocaleString()}</span></p>
      ))}
    </div>
  );
};

// ─── Tab views ────────────────────────────────────────────────────────────────

function OverviewTab({ overview, keys, users, loading }) {
  if (loading) return <Spinner />;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Metric icon={Users} label="Total Users" value={overview.users} trend={12} trendLabel="vs last month" />
        <Metric icon={FileText} label="Documents" value={`${overview.ready_documents}/${overview.documents}`} />
        <Metric icon={Sparkles} label="Chunks indexed" value={overview.chunks} trend={8} />
        <Metric icon={MessageSquare} label="Widget Messages" value={overview.widget_messages} trend={23} />
        <Metric icon={Bot} label="Live Widgets" value={`${overview.live_widgets}/${overview.widgets}`} />
        <Metric icon={KeyRound} label="Active Keys" value={`${overview.enabled_api_keys}/${overview.api_keys}`} />
        <Metric icon={Bot} label="Playground Chats" value={overview.chats} trend={5} />
        <Metric icon={Activity} label="Processing Docs" value={overview.processing_documents} />
        <Metric icon={AlertTriangle} label="Failed Docs" value={overview.failed_documents} trend={-18} />
        <Metric icon={ShieldCheck} label="Admins" value={overview.admins} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={TrendingUp} title="Message volume — last 5 weeks" subtitle="Widget + playground breakdown" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={msgVolumeData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="widget" name="Widget" stroke="#2dd4bf" fill="url(#gradW)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="playground" name="Playground" stroke="#a78bfa" fill="url(#gradP)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-400" />Widget</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" />Playground</span>
          </div>
        </div>

        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={Database} title="Document status" />
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={docStatusData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {docStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {docStatusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}
                </span>
                <span className="font-semibold text-slate-200">{d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ActivityFeedPanel />
        <SystemHealthPanel />
      </div>
    </div>
  );
}

function ActivityFeedPanel() {
  return (
    <div className={cn(glassCard, "p-5")}>
      <SectionTitle icon={Bell} title="Activity feed" subtitle="Real-time system events" badge={
        <span className="flex items-center gap-1.5 rounded-full border border-teal-300/20 bg-teal-300/10 px-2.5 py-1 text-[10px] font-bold text-teal-100 tracking-wider uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />Live
        </span>
      } />
      <div className="space-y-1">
        {activityFeed.map((ev, i) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/[0.035] transition-colors"
          >
            <div className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/5", ev.color)}>
              <ev.icon size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-200 leading-snug">{ev.msg}</p>
              <p className="mt-0.5 text-xs text-slate-600">{ev.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SystemHealthPanel() {
  return (
    <div className={cn(glassCard, "p-5")}>
      <SectionTitle icon={Server} title="System health" subtitle="Service status & latency" badge={
        <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2.5 py-1 text-[10px] font-bold text-teal-100 tracking-wider uppercase">5/6 OK</span>
      } />
      <div className="space-y-2">
        {systemHealth.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
            <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md", s.status === "operational" ? "bg-teal-300/10 text-teal-300" : "bg-amber-300/10 text-amber-300")}>
              {s.status === "operational" ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200">{s.label}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-500">{s.latency}</span>
              <span className={cn("text-[11px] font-semibold", s.status === "operational" ? "text-teal-300" : "text-amber-300")}>
                {s.uptime}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-2">
        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={TrendingUp} title="User growth" subtitle="Monthly cumulative signups" />
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={userGrowthData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradU" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="users" name="Users" stroke="#a78bfa" fill="url(#gradU)" strokeWidth={2} dot={{ fill: "#a78bfa", r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={BarChart2} title="API key usage vs failures" subtitle="All keys, all time" />
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={keyUsageData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="usage" name="Requests" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fails" name="Failures" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-400" />Requests</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" />Failures</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={MessageSquare} title="Full message volume — detailed" subtitle="Daily widget + playground messages over 5 weeks" />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={msgVolumeData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="widget" name="Widget" stroke="#2dd4bf" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="playground" name="Playground" stroke="#a78bfa" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={Database} title="Storage breakdown" />
          <div className="space-y-3 mt-1">
            {[
              { label: "Vector embeddings", value: 68, color: "#2dd4bf", size: "2.4 GB" },
              { label: "Raw documents", value: 21, color: "#a78bfa", size: "740 MB" },
              { label: "Chat history", value: 8, color: "#60a5fa", size: "280 MB" },
              { label: "System & logs", value: 3, color: "#94a3b8", size: "108 MB" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="text-slate-300 font-semibold">{item.size}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between">
            <span className="text-xs text-slate-500">Total used</span>
            <span className="text-sm font-bold text-white">3.53 GB / 10 GB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiKeysTab({ keys, setKeys }) {
  const [form, setForm] = useState({ service: "groq", name: "", key_value: "", weight: 1, is_enabled: true });
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => ({
    groq: keys.filter((k) => k.service === "groq"),
    mistral: keys.filter((k) => k.service === "mistral"),
  }), [keys]);

  function toggle(id) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, is_enabled: !k.is_enabled } : k));
  }
  function remove(id) {
    setKeys(prev => prev.filter(k => k.id !== id));
  }
  function changeWeight(id, weight) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, weight } : k));
  }
  function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setKeys(prev => [...prev, { id: Date.now().toString(), ...form, usage_count: 0, failure_count: 0, last_error: null }]);
      setForm({ service: "groq", name: "", key_value: "", weight: 1, is_enabled: true });
      setSaving(false);
    }, 800);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <form onSubmit={handleCreate} className={cn(glassCard, "h-fit p-5")}>
        <SectionTitle icon={Plus} title="Add provider key" subtitle="Keys rotate randomly with weight-based load split." />
        <div className="space-y-3">
          <select className="auth-input w-full h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-400" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
            <option value="groq">Groq LLM</option>
            <option value="mistral">Mistral Embeddings</option>
          </select>
          <input className="w-full h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-400" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Production key 1" required />
          <input className="w-full h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-400 font-mono" value={form.key_value} onChange={e => setForm({ ...form, key_value: e.target.value })} placeholder="Paste API key" required />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">Rotation weight: {form.weight}</span>
            <input type="range" min={1} max={20} value={form.weight} onChange={e => setForm({ ...form, weight: Number(e.target.value) })} className="w-full accent-violet-400" />
          </label>
          <label className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm text-slate-300 cursor-pointer hover:bg-white/[0.055] transition-colors">
            <input type="checkbox" checked={form.is_enabled} onChange={e => setForm({ ...form, is_enabled: e.target.checked })} className="accent-violet-400 h-3.5 w-3.5" />
            Enable immediately
          </label>
          <button disabled={saving} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white font-semibold text-slate-950 hover:bg-violet-100 disabled:opacity-60 transition-colors text-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={15} />}
            Save key
          </button>
        </div>
      </form>

      <div className="space-y-5">
        {(["groq", "mistral"]).map((service) => (
          <div key={service} className={cn(glassCard, "p-5")}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold capitalize text-white">{service} key pool</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {service === "groq" ? "Answer generation & streaming." : "Document & query embeddings."}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                {grouped[service].filter(k => k.is_enabled).length} / {grouped[service].length} enabled
              </span>
            </div>
            <div className="space-y-2">
              {grouped[service].length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">No keys yet. Will fall back to environment key.</div>
              ) : (
                grouped[service].map((key) => (
                  <motion.div
                    key={key.id}
                    layout
                    className="grid gap-3 rounded-lg border border-white/[0.07] bg-slate-950/50 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white text-sm">{key.name}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", key.is_enabled ? "border border-teal-300/20 bg-teal-300/10 text-teal-200" : "border border-white/10 bg-white/5 text-slate-500")}>
                          {key.is_enabled ? "Enabled" : "Disabled"}
                        </span>
                        {key.failure_count > 5 && <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-2 py-0.5 text-[10px] font-bold text-rose-200 uppercase tracking-wider">High failures</span>}
                      </div>
                      <p className="font-mono text-xs text-slate-600">{key.key_value}</p>
                      {key.last_error && <p className="mt-1.5 text-xs text-rose-300 line-clamp-1">{key.last_error}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-center">
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider">Uses</p>
                        <p className="text-sm font-bold text-slate-200">{key.usage_count.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-center">
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider">Fails</p>
                        <p className={cn("text-sm font-bold", key.failure_count > 5 ? "text-rose-300" : "text-slate-200")}>{key.failure_count}</p>
                      </div>
                      <select value={key.weight} onChange={e => changeWeight(key.id, Number(e.target.value))} className="h-9 rounded-lg border border-white/10 bg-slate-950 px-2 text-xs text-slate-200">
                        {[1, 2, 3, 5, 8, 13, 20].map(w => <option key={w} value={w}>w{w}</option>)}
                      </select>
                      <button onClick={() => toggle(key.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-200 hover:bg-white/[0.08] transition-colors">
                        {key.is_enabled ? <ToggleRight size={17} className="text-teal-300" /> : <ToggleLeft size={17} />}
                      </button>
                      <button onClick={() => remove(key.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-300/20 bg-rose-300/10 text-rose-200 hover:bg-rose-300/20 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab({ users }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || (filter === "admin" && u.is_admin) || (filter === "unverified" && !u.email_verified);
      return matchSearch && matchFilter;
    });
  }, [users, search, filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users…"
          className="h-10 flex-1 min-w-[200px] rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        {["all", "admin", "unverified"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn("h-10 rounded-lg border px-4 text-sm font-semibold capitalize transition-colors", filter === f ? "border-violet-400/30 bg-violet-400/10 text-violet-200" : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]")}>
            {f}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">{users.length} users</span>
          <span className="rounded-lg border border-teal-300/20 bg-teal-300/10 px-3 py-2 text-xs text-teal-200">{users.filter(u => u.email_verified).length} verified</span>
          <span className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-xs text-violet-200">{users.filter(u => u.is_admin).length} admins</span>
        </div>
      </div>

      <div className={cn(glassCard, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["User", "Workspace", "Provider", "Status", "Role", "Last seen", "Source"].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.025] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-300/10 text-[11px] font-bold text-violet-200">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">{user.name}</p>
                        <p className="text-[11px] text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{user.workspace}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400 capitalize">{user.provider}</span>
                  </td>
                  <td className="px-4 py-3">
                    {user.email_verified
                      ? <span className="flex items-center gap-1 text-[10px] font-bold text-teal-300"><CheckCircle size={11} />Verified</span>
                      : <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300"><AlertTriangle size={11} />Unverified</span>}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_admin
                      ? <span className="flex items-center gap-1 text-[10px] font-bold text-violet-300"><ShieldCheck size={11} />Admin</span>
                      : <span className="text-[10px] text-slate-600">User</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">{user.source || "auth"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SystemTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Cpu, label: "CPU usage", value: "34%", sub: "4-core", color: "text-teal-300" },
          { icon: HardDrive, label: "Memory", value: "61%", sub: "4.9 / 8 GB", color: "text-violet-300" },
          { icon: HardDrive, label: "Disk", value: "35%", sub: "3.5 / 10 GB", color: "text-blue-300" },
          { icon: Wifi, label: "Network I/O", value: "1.2 Mbps", sub: "↑ 420 KB/s", color: "text-teal-300" },
        ].map(m => (
          <div key={m.label} className={cn(glassCard, "p-4")}>
            <div className="flex items-center gap-2 mb-3">
              <m.icon size={15} className={m.color} />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{m.label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{m.value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={Server} title="Service status" subtitle="All microservices" />
          <div className="space-y-2">
            {systemHealth.map(s => (
              <div key={s.label} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-3">
                <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", s.status === "operational" ? "bg-teal-300/10 text-teal-300" : "bg-amber-300/10 text-amber-300")}>
                  {s.status === "operational" ? <Wifi size={13} /> : <WifiOff size={13} />}
                </div>
                <p className="flex-1 text-sm text-slate-200">{s.label}</p>
                <span className="text-xs text-slate-500">{s.latency}</span>
                <span className={cn("min-w-[52px] text-right text-xs font-bold", s.status === "operational" ? "text-teal-300" : "text-amber-300")}>{s.uptime}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", s.status === "operational" ? "border border-teal-300/20 bg-teal-300/10 text-teal-200" : "border border-amber-300/20 bg-amber-300/10 text-amber-200")}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={cn(glassCard, "p-5")}>
          <SectionTitle icon={Settings} title="Environment config" subtitle="Active runtime variables" />
          <div className="space-y-1.5">
            {[
              { key: "NEXT_PUBLIC_ENV", val: "production" },
              { key: "SUPABASE_URL", val: "https://•••.supabase.co" },
              { key: "GROQ_API_KEY", val: "gsk_••••••••••••••••" },
              { key: "MISTRAL_API_KEY", val: "mis_••••••••••••••••" },
              { key: "VECTOR_STORE", val: "pgvector@supabase" },
              { key: "EMBED_MODEL", val: "mistral-embed" },
              { key: "LLM_MODEL", val: "llama-3.1-70b-versatile" },
              { key: "MAX_CHUNK_SIZE", val: "512 tokens" },
            ].map(({ key, val }) => (
              <div key={key} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/[0.03] font-mono text-xs">
                <span className="text-violet-300/80 min-w-[200px]">{key}</span>
                <span className="text-slate-400">=</span>
                <span className="text-slate-300">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ActivityFeedPanel />
    </div>
  );
}

function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [overview] = useState(mockOverview);
  const [keys, setKeys] = useState(mockKeys);
  const [users] = useState(mockUsers);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }

  return (
    <main className="min-h-screen bg-[#090c14] px-4 py-6 sm:px-6">
      {/* Mesh background */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-[30%] left-[20%] h-[700px] w-[700px] rounded-full bg-violet-950/40 blur-[120px]" />
        <div className="absolute -bottom-[20%] right-[10%] h-[500px] w-[500px] rounded-full bg-teal-950/30 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M0%200h40v40H0z%22%20fill%3D%22none%22/%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%220.8%22%20fill%3D%22rgba(255%2C255%2C255%2C0.04)%22/%3E%3C/svg%3E')] opacity-60" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* ── Header ── */}
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-xl sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-teal-400 text-white shadow-[0_0_40px_rgba(167,139,250,0.3)]">
              <ShieldCheck size={19} />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#090c14] bg-teal-400" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-white">Ragora Admin</p>
              <p className="text-xs text-slate-500">API key rotation · system load · users · operations</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-400">
              admin@ragora.io
            </span>
            <button onClick={refresh} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors">
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-slate-950 hover:bg-violet-100 transition-colors">
              <ArrowLeft size={13} />
              Dashboard
            </button>
          </div>
        </header>

        {/* ── Tab bar ── */}
        <nav className="mb-6 flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 backdrop-blur">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative h-9 flex-1 rounded-lg text-sm font-semibold transition-all",
                activeTab === tab
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg border border-white/10 bg-white/[0.08]"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              )}
              <span className="relative">{tab}</span>
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "Overview" && <OverviewTab overview={overview} keys={keys} users={users} loading={loading} />}
            {activeTab === "Analytics" && <AnalyticsTab />}
            {activeTab === "API Keys" && <ApiKeysTab keys={keys} setKeys={setKeys} />}
            {activeTab === "Users" && <UsersTab users={users} />}
            {activeTab === "System" && <SystemTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
