# Ragora

Ragora is a premium AI knowledge SaaS for uploading documents, embedding their chunks with Mistral, storing vectors in Supabase pgvector, answering questions with Groq, and deploying branded website assistants.

## Folder Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/routes.py
│   │   ├── core/config.py
│   │   ├── models/schemas.py
│   │   ├── services/chunking.py
│   │   ├── services/db.py
│   │   ├── services/embeddings.py
│   │   ├── services/llm.py
│   │   ├── services/pdf.py
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/api.ts
│   ├── .env.example
│   └── package.json
└── supabase/schema.sql
```

## Features

- Premium SaaS landing page with hero, trusted-by logos, features, product showcase, testimonials, FAQ, final CTA, and footer
- Modern authentication UI for login, signup, Google, forgot password, reset password, and email OTP verification
- Backend authentication with password hashing, JWT access tokens, refresh-token sessions, Google ID-token verification, and workspace-scoped API access
- PDF upload with text extraction
- Semantic document chunking with `chunk_size=1100` and `overlap=160`
- Batched Mistral embeddings using `mistral-embed`
- Supabase PostgreSQL plus `pgvector` storage
- Candidate retrieval, lexical reranking, source-labeled context injection, and ready-document filtering
- Layered system/developer/memory prompts with workspace document awareness and recent chat memory
- Groq answers using `llama3-8b-8192` by default
- Chat history persisted in Supabase
- Streaming bot responses
- Per-user document list and delete document action
- Embeddable website chatbot widget per user
- Ready-made chatbot templates for customer care, HR, sales, support, and company FAQ
- Widget branding with colors, icon text, launcher shape, logo URL/data image, radius, and position
- Widget conversation history and visitor analytics

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [supabase/schema.sql](/Users/henilbhavsar/Documents/Codex/2026-05-06/you-are-a-senior-ai-engineer/supabase/schema.sql).
4. Copy your project URL and service role key.

The backend uses the service role key and applies `user_id` filters on every read, search, and delete operation.

If you already created the original tables, run [supabase/widget_upgrade.sql](/Users/henilbhavsar/Documents/Codex/2026-05-06/you-are-a-senior-ai-engineer/supabase/widget_upgrade.sql) to add the SaaS widget customization, branding, history, and analytics columns.

For the full Ragora auth system, also run [supabase/auth_upgrade.sql](/Users/henilbhavsar/Documents/Codex/2026-05-06/you-are-a-senior-ai-engineer/supabase/auth_upgrade.sql) to add users and refresh sessions.

If your project existed before the production RAG improvements, run [supabase/document_status_upgrade.sql](/Users/henilbhavsar/Documents/Codex/2026-05-06/you-are-a-senior-ai-engineer/supabase/document_status_upgrade.sql) to add document processing status, content-hash duplicate detection, and the improved retrieval function.

## Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill `backend/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MISTRAL_API_KEY=your-mistral-api-key
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama3-8b-8192
FRONTEND_ORIGIN=http://localhost:3000
ALLOWED_ORIGINS=*
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Fill `frontend/.env.local` if your backend is not on port 8000:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

Open `http://localhost:3000`.

## Ragora Frontend Architecture

The main app routes live in `frontend/app`:

- `/` premium marketing landing page
- `/login` returning user authentication
- `/signup` new workspace creation
- `/forgot-password` secure reset request UI
- `/reset-password` password update UI
- `/verify-email` OTP email verification UI
- `/dashboard` authenticated product dashboard

Reusable auth UI lives in `frontend/components/AuthPanel.tsx`. Auth client helpers live in `frontend/lib/auth.ts` and call the FastAPI auth endpoints for email login, signup, Google login, refresh-compatible session storage, password recovery UI, and email verification UI.

For Google login, create a Google OAuth web client and set the same client ID in `frontend/.env.local` as `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and in `backend/.env` as `GOOGLE_CLIENT_ID`. Set `JWT_SECRET` to a long random value before deploying.

## API Endpoints

- `POST /upload` multipart form data: `user_id`, `file`
- `POST /chat` JSON: `{ "user_id": "alice", "message": "Question?", "stream": true }`
- `GET /history?user_id=alice`
- `GET /documents?user_id=alice`
- `DELETE /documents/{document_id}?user_id=alice`
- `POST /widgets` create or update a user's website widget
- `GET /widgets?user_id=alice` get the user's widget and embed script
- `GET /widgets/{widget_id}/config` public widget config
- `POST /widgets/{widget_id}/chat` public widget chat endpoint
- `GET /widget.js` embeddable widget script
- `GET /analytics?user_id=alice` widget traffic, top questions, no-answer questions, token estimates, and latency
- `GET /widget-history?user_id=alice` recent embedded visitor conversations

## Website Widget

1. Log in to the dashboard.
2. Upload the PDFs that should power the chatbot.
3. Open the **Website widget** panel.
4. Set the title, welcome message, theme, and accent color.
5. Click **Save widget**.
6. Copy the generated script tag and paste it before `</body>` on the customer website.

Example:

```html
<script
  src="http://localhost:8000/widget/ragora-chat.js"
  data-key="w_example123"
  data-mode="search"
  data-shortcut="true"
  data-theme="auto"
  defer></script>
```

This automatically creates a fixed bottom-right chatbot button on the website.

If a website owner wants to use their own button instead, add `data-trigger-selector`:

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

The website never receives your Supabase, Mistral, or Groq keys. It only receives a public `widget_id`; the backend resolves that widget to the owner user's uploaded documents and runs RAG server-side.

For production, set `ALLOWED_ORIGINS` to a comma-separated allowlist:

```bash
ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

## RAG Prompt

The backend uses the required prompt template exactly:

```text
You are an AI assistant. Answer ONLY using the provided context. If the answer is not in the context, say 'I don't know.'

Context:
{context}

Question:
{question}
```

## Notes

- Embeddings are generated only during upload and stored in `document_chunks`.
- Query embeddings are generated per chat request.
- Retrieval is capped at top 5 chunks in the database function.
- LangChain is not used.
