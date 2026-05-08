<div align="center">

<br />

```
██████╗  █████╗  ██████╗  ██████╗ ██████╗  █████╗
██╔══██╗██╔══██╗██╔════╝ ██╔═══██╗██╔══██╗██╔══██╗
██████╔╝███████║██║  ███╗██║   ██║██████╔╝███████║
██╔══██╗██╔══██║██║   ██║██║   ██║██╔══██╗██╔══██║
██║  ██║██║  ██║╚██████╔╝╚██████╔╝██║  ██║██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
```

**AI Knowledge OS — Turn documents into trusted, deployable AI assistants.**

<br />

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ragora--ai.vercel.app-4F6FFF?style=for-the-badge&logo=vercel&logoColor=white)](https://ragora-ai.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-22C97A?style=for-the-badge)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-F5A623?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-white?style=for-the-badge&logo=next.js&logoColor=black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

<br />

> Upload documents. Embed with Mistral. Retrieve with pgvector. Answer with Groq.  
> Deploy a branded AI chatbot to any website in minutes.

<br />

</div>

---

## What is Ragora?

Ragora is a **production-ready AI knowledge SaaS** that converts private documents into grounded, source-aware AI assistants. It handles the full RAG pipeline — ingestion, chunking, embedding, retrieval, and response generation — behind a polished multi-tenant product surface with auth, analytics, admin controls, and an embeddable website widget.

No LangChain. No wrapper bloat. Just clean architecture you own.

```
PDF / Doc upload  ──▶  Smart chunking  ──▶  Mistral embeddings
                                                    │
                                                    ▼
User question  ──▶  Query embedding  ──▶  pgvector retrieval
                                                    │
                                                    ▼
                              Lexical reranking  ──▶  Groq LLM  ──▶  Streamed answer
```

---

## Features

### 🧠 RAG Pipeline
- PDF text extraction and smart semantic chunking (`chunk_size=1100`, `overlap=160`)
- Batched Mistral `mistral-embed` vector generation stored in Supabase `pgvector`
- Top-5 candidate retrieval with lexical reranking and source-labeled context injection
- Content-hash duplicate detection — re-uploading the same doc is a no-op
- Document processing status tracking with ready-document filtering at query time

### 🔐 Authentication & Security
- Email/password login with bcrypt hashing and JWT access tokens
- Refresh-token rotation with persistent sessions
- Google OAuth via ID-token verification
- Email OTP verification flow
- Workspace-scoped API access — every read, search, and delete is `user_id` filtered at the DB layer

### 🎛️ Admin Console
- Rotating provider API key pools for Groq and Mistral
- Weighted random key selection with usage/failure tracking
- Per-key last-use, last-error, and call count metrics
- Fallback to `.env` keys when no admin-managed key exists
- User management and system health view

### 🌐 Embeddable Widget
- One `<script>` tag deploys a fully branded chatbot to any website
- Custom colors, launcher shape, logo, welcome message, border radius, and position
- Visitor analytics: top questions, unanswered topics, latency, token estimates
- Widget conversation history separate from dashboard chat history
- CORS origin allowlist for production lockdown

### 💅 Frontend
- Premium SaaS landing page — hero, trusted-by logos, features, showcase, testimonials, FAQ, CTA
- Dashboard with document management, chat interface, widget builder, and analytics
- Streaming bot responses
- Full auth UI: login, signup, Google, forgot/reset password, OTP verification

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+ |
| **Embeddings** | Mistral AI (`mistral-embed`) |
| **LLM** | Groq (`llama3-8b-8192` default) |
| **Database** | Supabase PostgreSQL + `pgvector` |
| **Auth** | JWT, bcrypt, Google OAuth |
| **Deployment** | Vercel (frontend), any ASGI host (backend) |

---

## Project Structure

```
ragora/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py          # All API endpoints
│   │   ├── core/
│   │   │   └── config.py          # Env config and settings
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── chunking.py        # Semantic document chunking
│   │   │   ├── db.py              # Supabase client and queries
│   │   │   ├── embeddings.py      # Mistral embedding service
│   │   │   ├── llm.py             # Groq LLM + streaming
│   │   │   └── pdf.py             # PDF text extraction
│   │   └── main.py                # FastAPI app entry point
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/page.tsx     # Authenticated product dashboard
│   │   ├── login/page.tsx         # Auth pages
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Marketing landing page
│   ├── components/
│   │   └── AuthPanel.tsx          # Reusable auth UI component
│   ├── lib/
│   │   ├── api.ts                 # API client helpers
│   │   └── auth.ts                # Auth session management
│   ├── .env.example
│   └── package.json
│
└── supabase/
    ├── schema.sql                 # Base schema — run first
    ├── widget_upgrade.sql         # Widget branding + analytics
    ├── auth_upgrade.sql           # Users + refresh sessions
    ├── document_status_upgrade.sql # Processing status + deduplication
    └── admin_upgrade.sql          # Admin panel + key rotation
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- API keys: [Mistral](https://mistral.ai), [Groq](https://console.groq.com), [Google OAuth](https://console.cloud.google.com) (optional)

---

### 1. Supabase Setup

1. Create a new Supabase project.
2. Open the **SQL editor** and run the migration files in order:

```sql
-- Required: base schema
\i supabase/schema.sql

-- Required: auth tables
\i supabase/auth_upgrade.sql

-- Optional but recommended: document processing status + dedup
\i supabase/document_status_upgrade.sql

-- Optional: widget branding + visitor analytics
\i supabase/widget_upgrade.sql

-- Optional: admin console + rotating API key pools
\i supabase/admin_upgrade.sql
```

3. Copy your **Project URL** and **Service Role Key** from Project Settings → API.

---

### 2. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

MISTRAL_API_KEY=your-mistral-api-key
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama3-8b-8192

FRONTEND_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=*

JWT_SECRET=replace-with-a-long-random-secret-min-32-chars
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
ADMIN_EMAILS=you@yourcompany.com
KEY_ROTATION_CACHE_SECONDS=30
```

Start the API server:

```bash
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

Fill in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Start the dev server:

```bash
npm run dev
# App available at http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload a PDF (`user_id`, `file` multipart) |
| `POST` | `/chat` | Ask a question (`user_id`, `message`, `stream`) |
| `GET` | `/history` | Fetch chat history for a user |
| `GET` | `/documents` | List uploaded documents |
| `DELETE` | `/documents/{id}` | Delete a document and its chunks |
| `POST` | `/widgets` | Create or update a website widget |
| `GET` | `/widgets` | Get widget config and embed script |
| `GET` | `/widgets/{id}/config` | Public widget configuration |
| `POST` | `/widgets/{id}/chat` | Public widget chat endpoint |
| `GET` | `/widget.js` | Embeddable widget script |
| `GET` | `/analytics` | Widget traffic, top questions, latency |
| `GET` | `/widget-history` | Visitor conversation history |

All user-scoped endpoints require `?user_id=` or a `user_id` field in the body. Production deployments should use JWT Bearer tokens.

---

## Embedding the Widget

After uploading your documents and configuring your widget in the dashboard, paste this before `</body>` on any website:

```html
<script
  src="https://your-api-domain.com/widget.js"
  data-key="w_your_widget_id"
  data-theme="auto"
  data-shortcut="true"
  defer>
</script>
```

**Custom trigger button** — use your own button instead of the default launcher:

```html
<button class="ask-ai-btn">Ask AI ✦</button>

<script
  src="https://your-api-domain.com/widget.js"
  data-key="w_your_widget_id"
  data-trigger-selector=".ask-ai-btn"
  data-theme="auto"
  defer>
</script>
```

> **Security note:** The widget only exposes a public `widget_id`. All Supabase, Mistral, and Groq credentials remain server-side. The website never sees your keys.

---

## RAG Prompt Template

The backend uses this exact prompt structure for grounded, hallucination-resistant responses:

```
You are an AI assistant. Answer ONLY using the provided context.
If the answer is not in the context, say "I don't know."

Context:
{context}

Question:
{question}
```

---

## Deployment

### Backend (any ASGI host)

```bash
# Gunicorn + Uvicorn workers
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Set production environment variables and lock down CORS:

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
JWT_SECRET=<64-char random secret>
```

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

Set `NEXT_PUBLIC_API_BASE_URL` to your deployed backend URL in Vercel's environment settings.

---

## Chatbot Templates

Ragora ships with ready-made system prompt templates for common use cases:

| Template | Use Case |
|---|---|
| **Customer Care** | Support deflection, FAQ automation |
| **HR Assistant** | Policy lookup, onboarding Q&A |
| **Sales Enablement** | Product knowledge, objection handling |
| **Technical Support** | Docs-grounded troubleshooting |
| **Company FAQ** | Internal knowledge base |

Templates can be selected in the dashboard widget builder.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

```bash
# Fork and clone
git clone https://github.com/your-username/ragora.git

# Create a feature branch
git checkout -b feat/your-feature-name

# Make your changes, then submit a PR to main
```

Please keep PRs focused — one feature or fix per PR.

---

## License

[MIT](./LICENSE) © 2026 Ragora Inc.

---

<div align="center">

Built with precision by the Ragora team.

[ragora-ai.vercel.app](https://ragora-ai.vercel.app) · [Report a Bug](https://github.com/your-username/ragora/issues) · [Request a Feature](https://github.com/your-username/ragora/issues)

</div>
