# Obscura

**AI-powered flashcard and diagram study tool for medical and educational content.**

Upload a PDF or image, and Obscura automatically generates flashcards and interactive diagram labelling exercises. Study with spaced repetition, share sets publicly, and fork content from other users.

---

## Features

- **PDF → Flashcards**: Embedded PDF text is sent to Claude for high-yield Q&A generation; scanned pages fall back to Claude vision
- **Diagram labelling**: OCR detects label text and pixel-precise boxes, then one Claude vision call filters and assembles the diagram labels
- **Study sessions**: Flashcard and diagram quiz modes with per-card grading (correct / close / wrong)
- **Public library**: Browse and search sets shared by other users; star sets you like, fork them to your account
- **Sharing**: Shareable links for any set
- **User profiles**: Display name, sets created, cards studied

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+ |
| Database & Auth | Supabase (Postgres + RLS + Auth + Storage) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| OCR | PaddleOCR 3.x (PP-OCRv5) |
| PDF processing | PyMuPDF |

---

## Architecture

### Diagram label pipeline

1. OCR runs on the original image, returning recognized text, confidence, and pixel-level polygon boxes
2. Boxes are normalized to compact `%`-based structured data
3. A **single Claude API call** receives the image plus the OCR JSON and returns the diagram-label region mappings
4. Region boxes are merged into final labels, preserving OCR spatial precision
5. Fallback: if OCR finds no regions, the same single Claude call localizes labels from the full image directly

### Study scoring

Answers are graded with a fuzzy matcher:

- **Correct** — exact match (case/punctuation insensitive)
- **Close** — Levenshtein distance ≤ 2, or one string contains the other, or character overlap ≥ 80%
- **Wrong** — anything else
- **Empty** — no answer provided

---

## Project Structure

```
obscura/               ← Next.js frontend
  src/
    app/               ← App Router pages & layouts
    components/        ← UI components (cards, study, upload, layout, ui)
    lib/               ← Supabase client, scoring, utils
    types/             ← Shared TypeScript types

backend/               ← FastAPI backend
  routers/
    generate.py        ← /generate/labels and /generate/flashcards
    sets.py            ← CRUD for study sets
    cards.py           ← CRUD for cards
    upload.py          ← PDF page extraction
    sessions.py        ← Study session tracking
    results.py         ← Per-session results
    explore.py         ← Public library search, star, fork
    profile.py         ← User profile
    image.py           ← Image proxy
  lib/
    auth.py            ← JWT verification via Supabase
  main.py              ← FastAPI app, CORS, PaddleOCR preload
  requirements.txt
```

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)

### 1. Supabase

Create a project and run the SQL migrations in `supabase/migrations/` (or set up the schema manually — tables: `sets`, `cards`, `sessions`, `session_results`, `set_stars`).

Enable **Row Level Security** on all tables and configure the Storage bucket for diagram images.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

PaddleOCR models (~15 MB) are downloaded automatically on first start and cached in `~/.paddlex`.

### 3. Frontend

```bash
cd obscura
npm install
```

Create `obscura/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

The app is available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `ANTHROPIC_PRIMARY_MODEL` | Primary generation model (default: `claude-sonnet-4-6`) |
| `OPENAI_API_KEY` | Independent key used only when the Anthropic primary fails |
| `OPENAI_FALLBACK_MODEL` | OpenAI retry model (default: `gpt-5-mini`; blank disables fallback) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS for server-side ops) |

### Frontend (`obscura/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |

---

## License

MIT
