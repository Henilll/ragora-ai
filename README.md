<div align="center">

<!-- BANNER -->
<img src="https://your-banner-image-url.com/ragora-banner.png" alt="Ragora AI Banner" width="100%" style="border-radius: 12px;" />

<br />

# ⚡ Ragora AI

### *The Intelligent RAG Platform — Chat with Your Knowledge, Instantly.*

<p align="center">
  <a href="https://ragora-ai.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/Live%20Demo-ragora--ai.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/Status-Production%20Ready-22c55e?style=for-the-badge" />
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Pinecone-Vector%20DB-00B388?style=flat-square" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel" />
</p>

<br />

**Ragora AI** is a production-grade, SaaS-level Retrieval-Augmented Generation (RAG) platform that lets you upload documents, connect data sources, and chat with your knowledge base in real-time — powered by cutting-edge LLMs and semantic vector search.

<br />

[🚀 Live Demo](https://ragora-ai.vercel.app/) · [📖 Docs](#) · [🐛 Report Bug](https://github.com/YOUR_USERNAME/ragora-ai/issues) · [✨ Request Feature](https://github.com/YOUR_USERNAME/ragora-ai/issues)

</div>

---

## 📸 Screenshots

<div align="center">

| Dashboard | Chat Interface | Knowledge Base |
|-----------|---------------|----------------|
| ![Dashboard](https://placehold.co/380x220/0f172a/6366f1?text=Dashboard) | ![Chat](https://placehold.co/380x220/0f172a/6366f1?text=AI+Chat) | ![KB](https://placehold.co/380x220/0f172a/6366f1?text=Knowledge+Base) |

</div>

---

## 🌟 Why Ragora AI?

> **Stop hallucinations. Start grounded answers.**
> Ragora AI combines the fluency of large language models with the precision of your own data — giving you accurate, source-cited responses every time.

```
User Question ──► Embedding ──► Vector Search ──► Context Injection ──► LLM ──► Cited Answer
```

---

## ✨ Features

<details open>
<summary><strong>🧠 Core AI Features</strong></summary>

| Feature | Description |
|--------|-------------|
| 🔍 **Semantic Search** | Deep vector similarity search across your entire knowledge base |
| 💬 **RAG Chat** | GPT-4o powered chat with context retrieved from your documents |
| 📎 **Multi-format Upload** | PDF, DOCX, TXT, Markdown, CSV — all supported |
| 🌐 **URL Ingestion** | Scrape and index any public webpage automatically |
| 🧩 **Smart Chunking** | Intelligent document splitting with overlap for better recall |
| 📊 **Source Citations** | Every answer links back to its exact source chunk |

</details>

<details>
<summary><strong>⚙️ Platform Features</strong></summary>

| Feature | Description |
|--------|-------------|
| 🗂️ **Multi-Project Support** | Organize knowledge bases across separate projects |
| 🔐 **Auth & Access Control** | Secure user auth with role-based permissions |
| 📈 **Usage Analytics** | Track queries, embeddings, and model token usage |
| 🔌 **REST API** | Full API access to integrate RAG into your own products |
| 🎨 **Clean Modern UI** | Polished, minimal dashboard built with Tailwind + shadcn/ui |
| ☁️ **Edge-Deployed** | Runs on Vercel Edge for sub-100ms response initiation |

</details>

---
=======
Ragora is a production-ready AI knowledge SaaS for uploading PDFs, indexing them with Mistral embeddings, answering questions with Groq, and deploying a branded website chatbot widget.

It includes a Next.js dashboard, FastAPI backend, Supabase Postgres/pgvector storage, Supabase Auth bridging, admin API-key rotation, widget analytics, visitor chat history, and Supabase Storage-backed widget logo uploads.

## Features

- Secure email and Google auth with Supabase Auth plus backend JWT sessions.
- Bootstrap/admin login support for backend-created admin users.
- Admin panel for users, system metrics, and Groq/Mistral API-key pools.
- Health/load-aware API-key rotation with retries, failure tracking, and environment-key fallback.
- PDF upload, duplicate detection, processing status, chunking, and pgvector search.
- RAG answers scoped to uploaded documents and recent workspace memory.
- Streaming chat responses for dashboard and embedded website widgets.
- Widget builder with templates, branding, colors, tone, fallback behavior, lead collection, and embed script.
- Widget logo upload via authenticated backend endpoint and Supabase Storage.
- Widget visitor analytics, unanswered questions, and conversation history.

## Tech Stack

- Frontend: Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion, Lucide icons.
- Backend: FastAPI, httpx, custom JWT sessions, PDF text extraction.
- Database: Supabase Postgres with pgvector.
- Auth: Supabase Auth for browser login, backend JWT for API authorization.
- Storage: Supabase Storage for widget logo assets.
- AI: Mistral embeddings and Groq chat completions.

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/config.py
│   │   ├── models/schemas.py
│   │   ├── services/
│   │   ├── static/widget.js
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── .env.example
│   └── package.json
└── supabase/
    ├── schema.sql
    ├── auth_upgrade.sql
    ├── document_status_upgrade.sql
    ├── widget_upgrade.sql
    └── admin_upgrade.sql
```

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. If upgrading an older database, also run:
   - `supabase/auth_upgrade.sql`
   - `supabase/document_status_upgrade.sql`
   - `supabase/widget_upgrade.sql`
   - `supabase/admin_upgrade.sql`
5. Copy your project URL, anon key, and service role key.

The backend uses the service role key and enforces workspace filtering server-side. The browser never receives the service role key, Groq key, or Mistral key.

Widget logos are uploaded to the `ragora-widget-assets` Supabase Storage bucket by the backend. The backend creates the bucket automatically on first logo upload when the service role key has Storage permissions.
>>>>>>> e94134f (Updated project)

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **AI / LLM** | OpenAI GPT-4o, `text-embedding-3-large` |
| **Vector DB** | Pinecone / pgvector (PostgreSQL) |
| **Database** | Supabase (PostgreSQL) + Drizzle ORM |
| **Auth** | Clerk / NextAuth.js |
| **File Storage** | Supabase Storage / AWS S3 |
| **Deployment** | Vercel (Edge Runtime) |
| **Observability** | Langfuse / Helicone |

</div>

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          RAGORA AI                              │
├────────────────────┬────────────────────┬───────────────────────┤
│   CLIENT (Next.js) │   API ROUTES       │   SERVICES            │
│                    │                    │                        │
│  ┌──────────────┐  │  ┌──────────────┐  │  ┌────────────────┐   │
│  │  Chat UI     │──┼─►│ /api/chat    │──┼─►│ OpenAI GPT-4o  │   │
│  └──────────────┘  │  └──────────────┘  │  └────────────────┘   │
│                    │                    │                        │
│  ┌──────────────┐  │  ┌──────────────┐  │  ┌────────────────┐   │
│  │  Upload UI   │──┼─►│ /api/ingest  │──┼─►│ Embeddings API │   │
│  └──────────────┘  │  └──────────────┘  │  └────────────────┘   │
│                    │                    │           │             │
│  ┌──────────────┐  │  ┌──────────────┐  │  ┌───────▼────────┐   │
│  │  Dashboard   │──┼─►│ /api/query   │──┼─►│ Vector DB      │   │
│  └──────────────┘  │  └──────────────┘  │  │ (Pinecone)     │   │
│                    │                    │  └────────────────┘   │
└────────────────────┴────────────────────┴───────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Supabase (Postgres) │
                    │  Auth, Metadata, Logs│
                    └─────────────────────┘
```

---

## 📁 Folder Structure

```bash
<<<<<<< HEAD
ragora-ai/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup)
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── chat/                 # Chat interface
│   │   ├── knowledge/            # Knowledge base management
│   │   └── settings/             # User & project settings
│   └── api/                      # API Route Handlers
│       ├── chat/route.ts          # Streaming chat endpoint
│       ├── ingest/route.ts        # Document ingestion
│       └── query/route.ts         # Vector similarity query
│
├── components/                   # Shared UI components
│   ├── ui/                       # shadcn/ui base components
│   ├── chat/                     # Chat-specific components
│   └── upload/                   # File upload components
│
├── lib/                          # Core business logic
│   ├── ai/                       # LLM + embedding utilities
│   │   ├── embeddings.ts         # Text → vector embedding
│   │   ├── chunker.ts            # Smart document chunking
│   │   └── retriever.ts          # Vector similarity search
│   ├── db/                       # Drizzle ORM schema + queries
│   └── utils.ts                  # Shared utilities
│
├── hooks/                        # React custom hooks
├── types/                        # TypeScript type definitions
├── public/                       # Static assets
├── .env.local                    # Local env variables
└── drizzle.config.ts             # Drizzle ORM config
=======
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MISTRAL_API_KEY=your-mistral-api-key
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama3-8b-8192
FRONTEND_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=*
JWT_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_MINUTES=45
REFRESH_TOKEN_DAYS=30
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
ADMIN_EMAILS=founder@yourcompany.com
BOOTSTRAP_ADMIN_EMAIL=support.ragora@gmail.com
BOOTSTRAP_ADMIN_PASSWORD=RAGORA#@2026
KEY_ROTATION_CACHE_SECONDS=30
WIDGET_ASSET_BUCKET=ragora-widget-assets
>>>>>>> e94134f (Updated project)
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- **Node.js** `>= 18.x`
- **npm / pnpm** (pnpm recommended)
- A **Supabase** project (free tier works)
- An **OpenAI** API key
- A **Pinecone** account (or pgvector on Supabase)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/ragora-ai.git
cd ragora-ai

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env.local
 HEAD

# 4. Push database schema
pnpm db:push

# 5. Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following keys:

```env
# ─── App ────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── OpenAI ─────────────────────────────────
OPENAI_API_KEY=sk-...

# ─── Supabase ───────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── Database ───────────────────────────────
DATABASE_URL=postgresql://...

# ─── Vector Database (Pinecone) ─────────────
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=ragora-index

# ─── Auth (Clerk / NextAuth) ─────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# ─── File Storage ───────────────────────────
STORAGE_BUCKET=ragora-files
```

> **⚠️ Never commit your `.env.local` to version control.**

---

## 🖥️ Running Locally

```bash
# Development server with hot reload
pnpm dev

# Production build
pnpm build
pnpm start

# Type checking
pnpm typecheck

# Lint
pnpm lint

# Database migrations
pnpm db:push        # Push schema to DB
pnpm db:studio      # Open Drizzle Studio (DB GUI)
=======
```

Fill `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run the app:

```bash
npm run dev
>>>>>>> e94134f (Updated project)
```

---

 HEAD
## 🐳 Docker Setup

```dockerfile
# Dockerfile is included in the repo
docker build -t ragora-ai .
docker run -p 3000:3000 --env-file .env.local ragora-ai
```

Or with Docker Compose:

```bash
docker-compose up --build
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ragora
      POSTGRES_USER: ragora
      POSTGRES_PASSWORD: secret
```

---

## 🔌 API Reference

All endpoints require a valid Bearer token.

### Chat Completion (Streaming)

```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "What does our refund policy say?" }
  ],
  "projectId": "proj_abc123"
}
```

**Response**: `text/event-stream` — streamed tokens with source citations.

---

### Ingest Document

```http
POST /api/ingest
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
projectId: proj_abc123
```

```json
{
  "success": true,
  "chunks": 42,
  "documentId": "doc_xyz789"
}
```

---

### Query Vector Store

```http
POST /api/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "refund policy",
  "projectId": "proj_abc123",
  "topK": 5
}
```

```json
{
  "results": [
    {
      "id": "chunk_001",
      "score": 0.94,
      "text": "Refunds are processed within 5-7 business days...",
      "source": "refund-policy.pdf",
      "page": 3
    }
  ]
}
```

---

## 🔑 Authentication Flow

```
User ──► Clerk Auth ──► JWT Token ──► Middleware Validation ──► Protected Route
                                              │
                                    ┌─────────▼──────────┐
                                    │  Supabase RLS       │
                                    │  (Row Level Security)│
                                    └─────────────────────┘
```

- Email/password + OAuth (Google, GitHub)
- JWT sessions managed by Clerk
- All DB queries filtered by `user_id` via Supabase RLS
- API routes protected with middleware token validation

---

## 🗃️ Database Schema Overview

```sql
-- Projects
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  url         TEXT,
  status      TEXT DEFAULT 'processing',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings (with pgvector)
CREATE TABLE embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536),
  metadata    JSONB
);

-- Messages
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id),
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  citations   JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🤖 AI / RAG Pipeline

```
                 ┌──────────────────────────────────┐
                 │         INGESTION PIPELINE        │
                 │                                  │
  Document ──►  │  Parse → Chunk → Embed → Store   │──► Vector DB
                 └──────────────────────────────────┘

                 ┌──────────────────────────────────┐
                 │         RETRIEVAL PIPELINE        │
                 │                                  │
  User Query ──►│  Embed → Search → Rank → Inject  │──► LLM ──► Answer
                 └──────────────────────────────────┘
```

**Key configurations:**

| Parameter | Value |
|-----------|-------|
| Embedding Model | `text-embedding-3-large` (3072 dims) |
| LLM | `gpt-4o` |
| Chunk Size | `512 tokens` |
| Chunk Overlap | `64 tokens` |
| Top-K Retrieval | `5 chunks` |
| Similarity Metric | Cosine Similarity |
| Similarity Threshold | `0.75` |

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ragora-ai)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all environment variables in your Vercel project dashboard under **Settings → Environment Variables**.

### Other Platforms

| Platform | Guide |
|----------|-------|
| Railway | `railway up` — add env vars in dashboard |
| Render | Connect GitHub repo, set env vars |
| AWS Amplify | `amplify push` with Amplify CLI |
| Docker | See [Docker Setup](#-docker-setup) |

---

## ⚡ Performance Optimizations

- **Edge Runtime** — Chat streaming runs on Vercel Edge for minimal cold starts
- **Vector Indexing** — HNSW index on embeddings for sub-10ms similarity search
- **Streaming** — Token-by-token streaming via Vercel AI SDK `useChat`
- **Caching** — Embedding results cached in Redis for repeated queries
- **Lazy Loading** — Heavy components split via Next.js dynamic imports
- **Image Optimization** — All assets served via Next.js `<Image>` with WebP

---

## 🔒 Security Features

- 🔐 All API routes validated with signed JWTs
- 🛡️ Row Level Security (RLS) enforced at the database layer
- 🧹 Input sanitized before embedding/LLM injection
- 🚫 Rate limiting on all API endpoints (Upstash Redis)
- 📁 File uploads virus-scanned and type-validated
- 🔍 No raw SQL — all queries via Drizzle ORM parameterized statements
- 🌐 HTTPS-only with HSTS headers via Vercel

---

## 🗺️ Roadmap

| Status | Feature |
|--------|---------|
| ✅ | Document upload (PDF, DOCX, TXT) |
| ✅ | Streaming RAG chat |
| ✅ | Source citations in responses |
| ✅ | Multi-project support |
| 🚧 | URL / sitemap ingestion |
| 🚧 | Slack & Notion integration |
| 🚧 | Custom LLM model selection (Claude, Gemini) |
| 📋 | Shareable public chat links |
| 📋 | Team workspaces & collaboration |
| 📋 | Fine-tuned embedding models |
| 📋 | Zapier / n8n webhook triggers |
| 📋 | White-label & embeddable widget |

---

## ❓ FAQ

<details>
<summary><strong>What file types does Ragora AI support?</strong></summary>

Currently: **PDF, DOCX, TXT, Markdown (.md), CSV**. Web URL ingestion is in progress.

</details>

<details>
<summary><strong>How accurate are the answers?</strong></summary>

Ragora uses top-K semantic retrieval with a similarity threshold. Answers are grounded strictly in your documents — the LLM will not hallucinate content outside the retrieved context.

</details>

<details>
<summary><strong>Is my data private?</strong></summary>

Yes. Each user's knowledge base is isolated by project ID and protected by Supabase Row Level Security. Your documents are never shared or used to train any model.

</details>

<details>
<summary><strong>What's the token/cost per query?</strong></summary>

Roughly **~2,000–4,000 tokens** per RAG query (retrieval context + response). At GPT-4o pricing, that's approximately **$0.002–$0.006** per query.

</details>

<details>
<summary><strong>Can I self-host Ragora AI?</strong></summary>

Yes! Clone the repo, configure your own OpenAI + Supabase + Pinecone credentials, and deploy anywhere Node.js runs.

</details>

---

## 🤝 Contributing

Contributions are what make the open-source community thrive. Any contributions you make are **greatly appreciated**.

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/amazing-feature

# 3. Commit your changes
git commit -m "feat: add amazing feature"

# 4. Push to the branch
git push origin feature/amazing-feature

# 5. Open a Pull Request
```

Please read our [Contributing Guide](CONTRIBUTING.md) and follow the [Conventional Commits](https://www.conventionalcommits.org/) spec.

> **Good first issues** are tagged with `good-first-issue` 💪

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

## 👤 Author

<div align="center">

<img src="https://github.com/YOUR_USERNAME.png" width="80" style="border-radius:50%" />

**Your Name**

[![GitHub](https://img.shields.io/badge/GitHub-YOUR_USERNAME-181717?style=flat-square&logo=github)](https://github.com/YOUR_USERNAME)
[![Twitter](https://img.shields.io/badge/Twitter-@YOUR_HANDLE-1DA1F2?style=flat-square&logo=twitter)](https://twitter.com/YOUR_HANDLE)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/YOUR_PROFILE)
[![Email](https://img.shields.io/badge/Email-hello@ragora.ai-EA4335?style=flat-square&logo=gmail)](mailto:hello@ragora.ai)

</div>

---

## 💬 Support & Contact

- 🐛 **Bug Reports** → [GitHub Issues](https://github.com/YOUR_USERNAME/ragora-ai/issues)
- 💡 **Feature Requests** → [GitHub Discussions](https://github.com/YOUR_USERNAME/ragora-ai/discussions)
- 📧 **Business Inquiries** → hello@ragora.ai
- 🌐 **Website** → [ragora-ai.vercel.app](https://ragora-ai.vercel.app/)

---

## ⭐ Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=YOUR_USERNAME/ragora-ai&type=Date)](https://star-history.com/#Henilll/ragora-ai&Date)

</div>

---

<div align="center">

**Built with ❤️ using Next.js, OpenAI & Supabase**

<br />

<sub>If Ragora AI helped you, give it a ⭐ — it means the world!</sub>

<br />

[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-Upvote%20Us-DA552F?style=for-the-badge&logo=producthunt)](https://www.producthunt.com/)
&nbsp;
[![Twitter Follow](https://img.shields.io/badge/Follow%20on%20Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/YOUR_HANDLE)

<br /><br />

*© 2025 Ragora AI. All rights reserved.*

</div>
=======
## Auth Notes

Ragora uses Supabase Auth in the browser and then bridges the Supabase access token into a backend JWT session through `POST /auth/supabase`.

Email login also supports backend-created users. This is important for the bootstrap admin:

```text
email: support.ragora@gmail.com
password: RAGORA#@2026
```

Set your own `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `ADMIN_EMAILS` before production.

## Admin Panel

Open `/admin` after signing in as an admin.

Admins can:

- View users, documents, widget counts, chat counts, and key health.
- Add Groq and Mistral keys.
- Enable/disable provider keys.
- Adjust rotation weights.
- Delete compromised or exhausted keys.

Key selection is load-aware:

- Prefers lower-use and lower-failure keys.
- Respects configured weight.
- Tracks local in-flight usage to avoid overloading one key during bursts.
- Retries alternate keys when one fails.
- Falls back to `.env` keys when the managed pool is unavailable.

## Widget Builder

After login, open Dashboard → Builder.

You can configure:

- Widget title, welcome message, and launcher label.
- Dark/light theme.
- Accent and header colors.
- Launcher shape and position.
- Bot role, goal, tone, custom instructions, and fallback message.
- Lead collection.
- Logo upload.

Logo uploads are saved through `POST /widgets/logo` to Supabase Storage. The widget record stores only the final public `logo_url`, keeping the database small and stable.

## Embed Script

After saving the widget, copy the generated script:

```html
<script
  src="http://localhost:8000/widget/ragora-chat.js"
  data-key="w_example123"
  data-mode="search"
  data-shortcut="true"
  data-theme="auto"
  defer></script>
```

For a custom trigger button:

```html
<button class="ask-ai-trigger">Ask AI</button>

<script
  src="http://localhost:8000/widget/ragora-chat.js"
  data-key="w_example123"
  data-trigger-selector=".ask-ai-trigger"
  data-shortcut="true"
  data-theme="auto"
  defer></script>
```

## Core API Endpoints

- `POST /auth/supabase` bridge Supabase Auth to backend JWT.
- `POST /auth/login` backend email login.
- `GET /auth/me` current backend user.
- `POST /upload` upload and index a PDF.
- `GET /documents` list workspace documents.
- `DELETE /documents/{document_id}` delete a document and its chunks.
- `POST /chat` ask dashboard chatbot.
- `GET /history` dashboard chat history.
- `POST /widgets` create/update widget config.
- `POST /widgets/logo` upload widget logo.
- `GET /widgets` get workspace widget.
- `GET /widgets/{widget_id}/config` public widget config.
- `POST /widgets/{widget_id}/chat` public widget chat.
- `GET /analytics` widget analytics.
- `GET /widget-history` visitor conversation history.
- `GET /admin/overview` admin metrics.
- `GET /admin/users` admin user list.
- `GET/POST/PATCH/DELETE /admin/api-keys` provider key pool management.

## Production Checklist

- Replace `JWT_SECRET` with a long random secret.
- Replace bootstrap admin credentials.
- Set `ADMIN_EMAILS` to trusted admin emails only.
- Configure Supabase Auth redirect URLs:
  - `http://localhost:3000/auth/callback` for local dev.
  - `https://your-domain.com/auth/callback` for production.
- Set `ALLOWED_ORIGINS` to your frontend and customer domains.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, and `MISTRAL_API_KEY` server-only.
- Use multiple Groq/Mistral keys in `/admin` for reliable production traffic.
- Monitor failed documents, unanswered widget questions, and provider key failures in `/admin`.

## Verification

```bash
cd frontend
npm run build
```

```bash
cd ..
python3 -m compileall backend/app
```

Both should pass before deployment.
 e94134f (Updated project)
