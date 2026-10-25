# 💸 ExpenseFlow — AI-Powered Expense Tracker

A modern, web-based **personal expense tracker** that eliminates the friction of manual data entry. Type a natural-language sentence like _"$15 lunch and $40 fuel"_ and ExpenseFlow's AI engine parses it into structured transactions — complete with amounts, descriptions, categories, and confidence scores — ready for your review before saving.

---

## ✨ Key Features

### 🗣️ Natural Language Expense Capture
- Type one sentence with multiple expenses — AI extracts them all
- Powered by **Groq LLM** (Llama 3.3 70B) for accurate, fast parsing
- Confidence scores per transaction; low-confidence items flagged for review
- **No auto-save** — mandatory user confirmation before affecting totals

### 📸 Receipt Upload (OCR)
- Upload a receipt photo or capture via camera
- Client-side **Tesseract.js** OCR extracts text from the image
- Rule-based parser identifies totals, merchant names, and categories
- Preview dialog for confirmation before saving

### 📒 Expense Ledger
- Chronological list grouped by day (Today, Yesterday, weekday name, date)
- Full CRUD — add (batch), edit, and delete expenses
- Filter by time period (week, month, etc.) and category
- Real-time totals and category breakdown on the dashboard

### 📊 Analytics Dashboard
- **Pie chart** — category spending mix
- **Bar chart** — daily spending trends
- Period toggles (week / month)
- Averages, top categories, and spending insights

### 🤖 AI Spending Assistant (Chat)
- Conversational interface to ask questions about your spending
- _"How much did I spend on food this month?"_
- Context-aware: backend injects aggregated expense data into the LLM prompt
- Streaming markdown responses

### 🔐 Authentication & Cloud Storage
- Email/password sign-up and sign-in via **Supabase Auth**
- Expenses stored in **PostgreSQL** (Supabase), scoped per user
- Secured REST API with bearer token authentication

### 🏷️ Eight Expense Categories
`food` · `transport` · `shopping` · `entertainment` · `utilities` · `health` · `travel` · `other`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  React + Vite + TypeScript + shadcn-ui + Tailwind               │
│                                                                 │
│  Pages: Home (Ledger) │ Analytics │ Chat │ Auth                 │
│                                                                 │
│  Client capabilities:                                           │
│    • Expense input & preview UI                                 │
│    • Receipt OCR (Tesseract.js)                                 │
│    • Rule-based parser (receipt path)                           │
│    • React Query + hooks for API state                          │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ Bearer token (JWT)          │
                ▼                             ▼
┌───────────────────────────┐    ┌──────────────────────────────┐
│   Express API Server      │    │   Groq API                   │
│   (Node.js, port 8787)    │───▶│   llama-3.3-70b-versatile    │
│                           │    │   • /parse-expenses          │
│   Endpoints:              │    │   • /chat-expenses (stream)  │
│   • GET/POST/PATCH/DELETE │    └──────────────────────────────┘
│     /api/expenses         │
│   • POST /api/parse-expenses│
│   • POST /api/chat-expenses │
│   • GET /api/health       │
└───────────────┬───────────┘
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌──────────────────┐
│  Supabase    │  │  PostgreSQL      │
│  Auth        │  │  (via Prisma ORM)│
│  (JWT verify)│  │  expenses table  │
└──────────────┘  └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **Styling** | Tailwind CSS |
| **Animations** | Framer Motion |
| **Routing** | React Router v6 |
| **State/Data** | TanStack React Query |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **OCR** | Tesseract.js (client-side) |
| **Markdown** | react-markdown (chat responses) |
| **Backend** | Node.js, Express |
| **ORM** | Prisma |
| **Database** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth |
| **AI / LLM** | Groq (Llama 3.3 70B) |
| **Forms** | React Hook Form + Zod validation |
| **Testing** | Vitest, Testing Library |

---

## 📂 Project Structure

```
ExpenseFlow/
├── src/                        # Frontend source
│   ├── pages/
│   │   ├── Index.tsx           # Main hub — capture, preview, ledger, stats
│   │   ├── Auth.tsx            # Login & registration
│   │   ├── Analytics.tsx       # Charts & spending insights
│   │   └── Chat.tsx            # AI spending assistant
│   ├── components/
│   │   ├── ExpenseInput.tsx    # NL text input + receipt upload
│   │   ├── ExpensePreview.tsx  # Review & edit before save
│   │   ├── ExpenseLedger.tsx   # Saved expense list
│   │   ├── StatsCards.tsx      # Dashboard summary cards
│   │   ├── CategoryBreakdown.tsx
│   │   ├── ExpenseFilters.tsx
│   │   ├── EditExpenseDialog.tsx
│   │   ├── ReceiptPreviewDialog.tsx
│   │   └── ui/                 # shadcn/ui base components
│   ├── contexts/
│   │   └── AuthContext.tsx     # Supabase session state
│   ├── hooks/
│   │   └── useExpenses.ts     # CRUD against /api/expenses
│   ├── lib/
│   │   ├── aiExpenseParser.ts  # Client → API parse call
│   │   ├── expenseParser.ts   # Rule-based parser (receipts)
│   │   └── receiptOcr.ts      # Tesseract OCR wrapper
│   ├── types/
│   │   └── expense.ts         # TypeScript types & category enum
│   └── integrations/
│       └── supabase/          # Supabase client config
├── server/
│   └── index.mjs              # Express API — all routes, auth, Groq proxy
├── prisma/
│   └── schema.prisma          # Expense data model
├── PROJECT_OVERVIEW.md         # Full system overview & architecture
├── GETTING_STARTED.md          # Code tour & reading guide
├── prd.md                      # Product Requirements Document
└── public/                     # Static assets
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+) & **npm**
- A **Supabase** project (for PostgreSQL + Auth)
- A **Groq** API key (free tier available at [console.groq.com](https://console.groq.com))

### Installation

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd ExpenseFlow

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase, database, and Groq credentials

# 4. Generate Prisma client
npm run prisma:generate

# 5. Run database migrations
npx prisma migrate deploy

# 6. Start both frontend and backend
npm run dev:all
```

This starts:
- **Frontend** at `http://localhost:5173` (Vite dev server)
- **Backend API** at `http://localhost:8787` (Express server)

You can also run them separately:
```sh
npm run dev          # Frontend only
npm run dev:server   # Backend only (with --watch for auto-reload)
```

### Environment Variables

Copy `.env.example` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL (frontend) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/public key (frontend) |
| `VITE_API_BASE_URL` | ✅ | Backend API URL (e.g. `http://localhost:8787`) |
| `SUPABASE_URL` | ✅ | Supabase project URL (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server) |
| `GROQ_API_KEY` | ✅ | Groq API key for LLM parsing & chat |
| `DATABASE_URL` | ✅ | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | ✅ | PostgreSQL direct connection string |
| `PORT` | ❌ | API server port (default: `8787`) |

---

## 🔄 Core Workflows

### Primary Flow — Natural Language Capture

```
Open app → Sign in → Home dashboard
    → Tap "Add expense"
    → Enter natural-language sentence
    → AI parses into structured transactions
    → User reviews preview (edit / remove / confirm)
    → Expenses saved to database
    → Ledger and totals update
```

### Receipt Capture Flow

```
Add expense → Upload receipt image
    → Client-side OCR extracts text
    → Rule-based parser finds total, merchant, category
    → Receipt preview dialog for confirmation
    → Save to ledger
```

### AI Chat Flow

```
Open Chat → Ask a spending question
    → Backend loads user's expense aggregates
    → Injected into system prompt → Groq streaming response
    → Client renders markdown answer
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/expenses` | ✅ | Fetch user's expenses (with filters) |
| `POST` | `/api/expenses` | ✅ | Create new expense(s) |
| `PATCH` | `/api/expenses/:id` | ✅ | Update an expense |
| `DELETE` | `/api/expenses/:id` | ✅ | Delete an expense |
| `POST` | `/api/parse-expenses` | ❌ | AI-parse natural language into transactions |
| `POST` | `/api/chat-expenses` | ✅ | AI spending assistant (streaming) |
| `GET` | `/api/health` | ❌ | Health check |

---

## 🧪 Testing

```sh
npm test              # Run all tests once
npm run test:watch    # Re-run on file changes
```

---

## 🗄️ Data Model

Each **Expense** record contains:

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (Supabase Auth user) |
| `amount` | Decimal(10,2) | Transaction amount |
| `description` | String | Expense description |
| `category` | Enum | One of 8 categories |
| `confidence` | Decimal(3,2) | AI parsing confidence (0–1) |
| `date` | Timestamptz | Transaction date |
| `created_at` | Timestamptz | Record creation time |
| `updated_at` | Timestamptz | Last update time |

---

## 🌐 Deployment

### Frontend (Static SPA)

Deploy to **Vercel**, **Netlify**, or any static host:

```sh
npm run build    # Output: dist/
```

Set the `VITE_*` environment variables in your hosting platform.

### Backend (Node.js)

Deploy to **Render**, **Railway**, or any Node.js host:

- **Build Command:** `npm ci && npm run prisma:generate`
- **Start Command:** `node server/index.mjs`
- Set all server-side environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `DATABASE_URL`, `DIRECT_URL`)

---

## 📄 Documentation

| Document | Description |
|---|---|
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | Full system overview, architecture, security model |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Code tour & recommended reading path for new contributors |
| [prd.md](prd.md) | Product Requirements — objectives, KPIs, user journeys, risks |

---

## 📜 License

This project is private and not licensed for public distribution.
