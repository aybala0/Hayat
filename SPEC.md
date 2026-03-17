# Hayat — Couple's Expense Splitter: Implementation Plan

## Deployment: 100% Vercel (free)

Everything — frontend and backend — lives in one repo deployed to a single Vercel project.
- React (Vite) frontend served as static files from `dist/`
- Backend logic runs as Vercel Serverless Functions in `api/`
- No Railway, no separate server, no session store needed

---

## Repository Structure

```
hayat/
├── .env                        # Local dev env vars (already exists)
├── .env.example
├── vercel.json                 # Vercel rewrites for SPA routing
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── SPEC.md
│
├── api/                        # Vercel Serverless Functions (backend)
│   ├── auth/
│   │   ├── google.ts           # GET  /api/auth/google   — start OAuth
│   │   ├── callback.ts         # GET  /api/auth/callback — finish OAuth, set cookie
│   │   ├── me.ts               # GET  /api/auth/me       — who am I?
│   │   └── logout.ts           # POST /api/auth/logout   — clear cookie
│   ├── expenses/
│   │   └── index.ts            # GET + POST /api/expenses
│   └── balance.ts              # GET  /api/balance
│
├── lib/                        # Shared server-side utilities (imported by api/)
│   ├── config.ts               # User names, emails, sheet ID
│   ├── sheets.ts               # Google Sheets read/write logic
│   ├── auth.ts                 # JWT sign/verify + cookie helpers
│   └── types.ts                # Shared TypeScript types
│
└── src/                        # React frontend
    ├── main.tsx
    ├── App.tsx
    ├── config.ts               # Client-side user config (names only)
    ├── api.ts                  # Typed fetch wrappers → /api/*
    ├── types.ts                # Client-side TypeScript types
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useBalance.ts
    │   └── useExpenses.ts
    └── components/
        ├── BalanceHeader.tsx
        ├── AddExpenseForm.tsx
        ├── SplitOptions.tsx
        ├── ExpenseList.tsx
        ├── TagFilter.tsx
        └── LoginScreen.tsx
```

---

## Config (`lib/config.ts` and `src/config.ts`)

```ts
export const USER_A_NAME  = "Aybala";
export const USER_A_EMAIL = "ibala.esmer@gmail.com";  // fill before deploy
export const USER_B_NAME  = "Erdem";
export const USER_B_EMAIL = "erdemyelmenoglu@gmail.com";  // fill before deploy
export const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID!;
```

---

## Authentication Flow

Serverless functions are stateless, so we use a **signed JWT stored as an httpOnly cookie** instead of a server-side session.

1. User opens the app → frontend calls `GET /api/auth/me`.
2. Not logged in (no valid cookie) → frontend shows `<LoginScreen>` with "Sign in with Google".
3. Button navigates to `GET /api/auth/google`.
4. Serverless function redirects to Google OAuth consent screen, requesting:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/spreadsheets`
5. Google redirects to `GET /api/auth/callback`.
6. Function exchanges code for `access_token` + `refresh_token`.
7. Validates email against `USER_A_EMAIL` / `USER_B_EMAIL` — returns 403 for others.
8. Signs a JWT containing `{ name, email, accessToken, refreshToken }` with `JWT_SECRET`.
9. Sets JWT as `httpOnly; Secure; SameSite=Lax` cookie, redirects to `/`.
10. Frontend calls `GET /api/auth/me` → cookie is read, JWT verified, returns `{ name, email }`.

No session store, no database. The JWT in the cookie IS the session.

---

## API Routes

### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/google` | Redirects to Google OAuth consent page |
| GET | `/api/auth/callback` | Receives OAuth code, sets JWT cookie, redirects to `/` |
| GET | `/api/auth/me` | Returns `{ name, email }` or 401 |
| POST | `/api/auth/logout` | Clears the JWT cookie |

### Expenses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/expenses` | Returns all rows from the sheet as JSON |
| POST | `/api/expenses` | Validates + appends a new expense row |

### Balance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/balance` | Computes balance for the logged-in user |

---

## Google Sheets Service (`lib/sheets.ts`)

Uses the `googleapis` npm package. The OAuth2 client is hydrated from `accessToken` / `refreshToken` stored in the JWT.

**Sheet columns (row 1 = header):**
```
A: Date | B: Description | C: Tag | D: Amount | E: Paid By | F: Aybala's Share | G: Erdem's Share | H: Notes
```

**`getExpenses(tokens)`** — reads all rows after the header, returns typed `Expense[]`.

**`appendExpense(tokens, expense)`** — appends one row with `valueInputOption: USER_ENTERED`.

**`computeBalance(tokens, userEmail)`** — reads all rows, applies:
```
balance = Σ(other_person_share where paid_by == me)
        − Σ(my_share where paid_by == other_person)
```
Positive = other person owes me. Negative = I owe other person.

---

## Split Options Logic

Shares are stored as **dollar amounts** (not percentages).

| Option | Paid By | Aybala's Share | Erdem's Share |
|--------|---------|----------------|---------------|
| 50/50 — I paid | currentUser | amount × 50% | amount × 50% |
| 50/50 — [other] paid | otherUser | amount × 50% | amount × 50% |
| I paid — [other] owes full | currentUser | $0 | amount × 100% (or reversed) |
| [other] paid — I owe full | otherUser | amount × 100% | $0 (or reversed) |
| Custom % | selected user | amount × X% | amount × (100−X)% |

Custom % inputs must sum to 100 (validated client-side and server-side).

---

## Frontend Components

### `<BalanceHeader>`
- Calls `GET /api/balance` on mount and after each successful expense POST.
- Shows: `"Erdem owes you $42.50"` / `"You owe Erdem $42.50"` / `"You're all square"`.
- Large, sticky at top of page.

### `<AddExpenseForm>`
- Fields: Description (text), Tag (dropdown), Amount (number), Split option.
- Split rendered by `<SplitOptions>` — labels derived from logged-in user.
- "Custom %" reveals two number inputs that must sum to 100.
- On submit: POST to `/api/expenses`, then refresh balance + expense list.
- Inline error message on failure (never silently fail).

### `<SplitOptions>`
- Props: `currentUserName`, `otherUserName`, `onSelect`.
- Renders 4 plain-language buttons + "Custom %" button.
- Highlights selected option.

### `<ExpenseList>`
- Calls `GET /api/expenses` on mount.
- Newest first (array reversed).
- Each row: date, description, tag emoji, amount, who paid, each person's share.
- Filtered in-memory by `<TagFilter>` selection.

### `<TagFilter>`
- Horizontal scrollable chip row.
- "All" chip + one per category tag.

### `<LoginScreen>`
- Centered card: app name + "Sign in with Google" button.
- Button is a plain `<a href="/api/auth/google">`.

---

## Category Tags

```ts
export const TAGS = [
  { label: "Food & Drinks",    emoji: "🌯" },
  { label: "Groceries",        emoji: "🛒" },
  { label: "Rent & Bills",     emoji: "🏠" },
  { label: "Transport",        emoji: "🚗" },
  { label: "Fun & Activities", emoji: "🎉" },
  { label: "Health",           emoji: "🏥" },
  { label: "Shopping",         emoji: "🛍️" },
  { label: "Travel",           emoji: "✈️" },
  { label: "Other",            emoji: "📦" },
];
```

Stored in the sheet as `"🍔 Food & Drinks"`.

---

## TypeScript Types

```ts
// lib/types.ts and src/types.ts (identical)

export type User = {
  name: string;
  email: string;
};

export type Expense = {
  date: string;
  description: string;
  tag: string;
  amount: number;
  paidBy: string;
  aylasShare: number;
  erdemsShare: number;
  notes: string;
};

export type Balance = {
  amount: number;          // absolute value in dollars
  direction: "owe" | "owed" | "square";
  otherName: string;
};

export type SplitOption =
  | "50/50-me"
  | "50/50-them"
  | "full-me"
  | "full-them"
  | "custom";
```

---

## Environment Variables

All set in Vercel dashboard (and in local `.env` for dev):

```
GOOGLE_SHEET_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...              # random 32+ char string, you generate this
APP_URL=https://hayat.vercel.app   # your actual Vercel URL
```

No `VITE_` prefixed vars needed — frontend and backend share the same origin.

---

## Vercel Configuration (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

This sends all non-`/api/*` requests to the React SPA. API routes are served by Vercel automatically from the `api/` folder.

---

## Google Cloud Console Setup (one-time, before deploy)

1. Create a project, enable the **Google Sheets API**.
2. Create **OAuth 2.0 credentials** (Web application type).
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback` (dev)
   - `https://hayat.vercel.app/api/auth/callback` (prod)
4. Copy Client ID and Secret to `.env` / Vercel dashboard.

---

## Implementation Order

1. **Scaffold** — `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `index.html`.
2. **Config** — `lib/config.ts`, `src/config.ts`, `.env.example`.
3. **Auth helpers** — `lib/auth.ts` (JWT sign/verify, cookie read/write).
4. **API: auth routes** — `api/auth/google.ts`, `callback.ts`, `me.ts`, `logout.ts`.
5. **Sheets service** — `lib/sheets.ts` (`getExpenses`, `appendExpense`, `computeBalance`).
6. **API: expenses + balance** — `api/expenses/index.ts`, `api/balance.ts`.
7. **Frontend: auth** — `useAuth` hook, `<LoginScreen>`, auth gate in `App.tsx`.
8. **Frontend: balance** — `useBalance` hook, `<BalanceHeader>`.
9. **Frontend: add expense** — `<AddExpenseForm>`, `<SplitOptions>`.
10. **Frontend: expense list** — `useExpenses` hook, `<ExpenseList>`, `<TagFilter>`.
11. **Polish** — mobile layout, loading states, error messages.
12. **Deploy** — push to GitHub, connect to Vercel, set env vars, smoke test.

---

## Open Questions (please answer before I start coding)

1. **Emails** — what are your and Erdem's Google account emails? Needed to hardcode in `config.ts` so the app knows which user is which after OAuth.
2. **Sheet header row** — does the Google Sheet already have a header row (`Date | Description | Tag | ...`), or should the app write it automatically on first use?
