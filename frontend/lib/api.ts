export type ChatRole = "user" | "bot";

export type ChatMessage = {
  id?: string;
  user_id: string;
  message: string;
  role: ChatRole;
  timestamp?: string;
};

export type DocumentItem = {
  id: string;
  user_id: string;
  file_name: string;
  file_hash?: string;
  status?: "processing" | "ready" | "failed";
  chunk_count: number;
  created_at: string;
};

export type WidgetConfig = {
  widget_id: string;
  user_id: string;
  title: string;
  welcome_message: string;
  theme: "dark" | "light";
  accent_color: string;
  secondary_color: string;
  logo_url: string;
  icon_label: string;
  launcher_style: "pill" | "circle";
  border_radius: number;
  launcher_label: string;
  input_placeholder: string;
  position: "bottom-right" | "bottom-left";
  bot_goal: string;
  bot_role: string;
  tone: string;
  custom_instructions: string;
  fallback_message: string;
  collect_leads: boolean;
  is_enabled: boolean;
  embed_script?: string;
};

export type WidgetAnalytics = {
  total_messages: number;
  user_messages: number;
  bot_messages: number;
  unique_visitors: number;
  unanswered_count: number;
  total_tokens: number;
  average_latency_ms: number;
  top_questions: Array<{ question: string; count: number }>;
  unanswered_questions: Array<{ question: string; timestamp: string }>;
  daily_messages: Array<{ date: string; count: number }>;
};

export type WidgetHistory = {
  conversations: Array<{
    visitor_id: string;
    last_seen: string;
    message_count: number;
    last_message: string;
    messages: Array<{ role: "user" | "bot"; message: string; timestamp: string; had_answer?: boolean | null }>;
  }>;
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    return text || `Request failed with ${response.status}`;
  }
  return text || `Request failed with ${response.status}`;
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  return response.json() as Promise<T>;
}

export function getHistory(userId: string) {
  return jsonRequest<ChatMessage[]>(`/history?user_id=${encodeURIComponent(userId)}`);
}

export function getDocuments(userId: string) {
  return jsonRequest<DocumentItem[]>(`/documents?user_id=${encodeURIComponent(userId)}`);
}

export function getWidget(userId: string) {
  return jsonRequest<WidgetConfig | null>(`/widgets?user_id=${encodeURIComponent(userId)}`);
}

export function saveWidget(config: Omit<WidgetConfig, "widget_id" | "embed_script">) {
  return jsonRequest<WidgetConfig>("/widgets", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export function getAnalytics(userId: string) {
  return jsonRequest<WidgetAnalytics>(`/analytics?user_id=${encodeURIComponent(userId)}`);
}

export function getWidgetHistory(userId: string) {
  return jsonRequest<WidgetHistory>(`/widget-history?user_id=${encodeURIComponent(userId)}`);
}

export async function uploadPdf(userId: string, file: File) {
  const token = getAccessToken();
  const body = new FormData();
  body.append("user_id", userId);
  body.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  return response.json() as Promise<{ document_id: string; file_name: string; chunk_count: number }>;
}

export async function deleteDocument(userId: string, documentId: string) {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/documents/${documentId}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : undefined },
  );
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
}

export async function streamChat(
  userId: string,
  message: string,
  onToken: (token: string) => void,
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ user_id: userId, message, stream: true }),
  });

  if (!response.ok || !response.body) {
    throw new Error(await errorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const eventLine = event.split("\n").find((line) => line.startsWith("event: "));
      const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      const data = dataLine.slice(6);
      if (data === "[DONE]") return;
      if (eventLine?.slice(7) === "error") {
        try {
          throw new Error(JSON.parse(data));
        } catch (err) {
          if (err instanceof Error) throw err;
          throw new Error(data);
        }
      }
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed === "string") onToken(parsed);
      } catch {
        onToken(data);
      }
    }
  }
}
import { getAccessToken } from "@/lib/auth";
