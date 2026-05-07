# PDF RAG Assistant

A lightweight production-ready RAG web app for uploading PDFs, embedding their chunks with Mistral, storing vectors in Supabase pgvector, and answering questions with Groq.

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

- Username-based login stored in the browser
- PDF upload with text extraction
- Chunking with `chunk_size=800` and `overlap=50`
- Batched Mistral embeddings using `mistral-embed`
- Supabase PostgreSQL plus `pgvector` storage
- Top 5 cosine similarity retrieval filtered by `user_id`
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
```

Open `http://localhost:3000`.

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
