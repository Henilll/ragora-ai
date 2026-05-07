import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF RAG Assistant",
  description: "Ask questions over your uploaded PDFs with Mistral, Groq, and Supabase pgvector.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
