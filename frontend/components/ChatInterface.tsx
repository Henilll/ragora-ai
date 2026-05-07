"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, SendHorizonal, Bot, User } from "lucide-react";
import type { ChatMessage } from "@/lib/api";
import { streamChat } from "@/lib/api";

type Props = {
  userId: string;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  onRefreshHistory: () => Promise<void>;
};

export function ChatInterface({ userId, messages, onMessagesChange, onRefreshHistory }: Props) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = {
      user_id: userId,
      message: question,
      role: "user",
      timestamp: new Date().toISOString(),
    };
    const botMessage: ChatMessage = {
      user_id: userId,
      message: "",
      role: "bot",
      timestamp: new Date().toISOString(),
    };

    onMessagesChange([...messages, userMessage, botMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    let streamed = "";
    try {
      await streamChat(userId, question, (token) => {
        streamed += token;
        onMessagesChange([...messages, userMessage, { ...botMessage, message: streamed }]);
      });
      await onRefreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat request failed");
      onMessagesChange([...messages, userMessage, { ...botMessage, message: "I couldn't complete that request." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          padding: "1.125rem 1.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface-1)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--accent-dim)",
              border: "1px solid rgba(99,102,241,0.2)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Bot size={15} style={{ color: "var(--accent-light)" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Playground</p>
            <p style={{ fontSize: "0.6875rem", color: "var(--text-tertiary)" }}>Answers scoped to your uploaded documents</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.length === 0 ? (
            <div
              className="card"
              style={{ padding: "2rem", textAlign: "center" }}
            >
              <Bot size={26} style={{ color: "var(--text-tertiary)", margin: "0 auto 0.75rem" }} />
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                Ask anything from your documents
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
                Upload a PDF in the left sidebar to get started.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id ?? `${message.role}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                  gap: "0.625rem",
                  alignItems: "flex-start",
                }}
              >
                {message.role === "bot" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "var(--surface-3)",
                      border: "1px solid var(--border-default)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Bot size={13} style={{ color: "var(--accent-light)" }} />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "0.75rem 1rem",
                    borderRadius: message.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    fontSize: "0.875rem",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    ...(message.role === "user"
                      ? {
                          background: "var(--accent)",
                          color: "#fff",
                          boxShadow: "0 4px 14px var(--accent-glow)",
                        }
                      : {
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                        }),
                  }}
                >
                  {message.message || (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-tertiary)" }}>
                      <Loader2 size={13} className="animate-spin" />
                      Thinking…
                    </span>
                  )}
                </div>
                {message.role === "user" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "var(--surface-3)",
                      border: "1px solid var(--border-default)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <User size={13} style={{ color: "var(--text-secondary)" }} />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--surface-1)",
          flexShrink: 0,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: "0.625rem", alignItems: "flex-end" }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="Ask a question from your documents…"
            className="inp"
            style={{
              flex: 1,
              resize: "none",
              minHeight: "2.625rem",
              maxHeight: "9rem",
              paddingTop: "0.625rem",
              paddingBottom: "0.625rem",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-accent"
            aria-label="Send"
            style={{ width: "2.625rem", height: "2.625rem", flexShrink: 0, display: "grid", placeItems: "center", padding: 0 }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
          </button>
        </form>
        {error && (
          <p style={{ maxWidth: 720, margin: "0.5rem auto 0", fontSize: "0.75rem", color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}