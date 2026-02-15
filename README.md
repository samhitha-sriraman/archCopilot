# ArchCopilot

ArchCopilot is a small portfolio project that converts natural-language product specs into system design artifacts:

1. Services breakdown
2. DB schema draft (SQL DDL)
3. OpenAPI YAML
4. Mermaid sequence diagram
5. Deterministic risk report

## Tech Stack

- Backend: FastAPI (Python 3.12), SQLAlchemy, SQLite
- Frontend: Next.js (App Router) + Tailwind CSS
- No auth, no RAG, no Docker Compose

## Project Structure

- `/Users/akilavallisriraman/codexprojects/architechtautopilot/backend` - FastAPI API
- `/Users/akilavallisriraman/codexprojects/architechtautopilot/frontend` - Next.js UI

## Backend Setup

```bash
cd /Users/akilavallisriraman/codexprojects/architechtautopilot/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` in `backend`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Run backend:

```bash
uvicorn app.main:app --reload --port 8000
```

## Frontend Setup

```bash
cd /Users/akilavallisriraman/codexprojects/architechtautopilot/frontend
npm install
```

Optional env (`frontend/.env.local`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Run frontend:

```bash
npm run dev
```

Open `http://localhost:3000/new`.

## API Endpoints

- `POST /generate` body: `{ design_id?: string, spec: string }`
- `GET /designs`
- `GET /designs/{design_id}/versions`
- `GET /design_versions/{version_id}`
- `GET /design_versions/{version_id}/diff?other=...`
- `GET /examples`

## Persistence

SQLite tables:

- `designs`
- `design_versions` (`spec_text`, `output_json`, `created_at`, `version_num`)

## Risk Rules (Deterministic)

- Missing pagination on list endpoints => scalability risk
- Synchronous chain length > 4 => latency risk
- Single DB with no replica mention => SPOF risk
- Payments/webhooks mentioned without idempotency => high risk

## Example Specs

Five example specs are provided in:

- `/Users/akilavallisriraman/codexprojects/architechtautopilot/backend/app/example_specs.py`
- `/Users/akilavallisriraman/codexprojects/architechtautopilot/frontend/lib/examples.ts`
