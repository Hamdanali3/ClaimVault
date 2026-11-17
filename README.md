# ClaimVault — Post-Purchase Warranty, Return-Window & Subscription Ledger

**ClaimVault** is a production-grade MERN + AI application (`MongoDB`, `Express.js`, `React 19 + TypeScript + Tailwind CSS`, `Node.js`) designed to eliminate post-purchase financial leakage from expired return windows, lost thermal receipts, unclaimed hardware warranties, and forgotten subscription auto-renewals.

---

## Architecture Overview

```text
ClaimVault/
├── shared/                       # @claimvault/shared — Zod DTOs, schemas, 100+ merchant rules KB
├── server/                       # Node.js + Express + TypeScript + Mongoose + PDFKit + Sharp
│   ├── src/
│   │   ├── config/               # Zod env schema, Atlas + embedded MongoDB fallback, storage
│   │   ├── controllers/          # auth, vault ($facet), ingestion, claimDossier, household, verify
│   │   ├── middlewares/          # JWT + Argon2id auth, household RBAC, rate limiter, errorHandler
│   │   ├── models/               # User, Household, MerchantProfile, VaultItem, AuditLog
│   │   ├── queues/               # BullMQ Redis worker + deterministic in-process scheduler fallback
│   │   ├── routes/v1/            # REST /api/v1 routers
│   │   ├── seed/                 # Demo household & receipt proof image generator
│   │   └── services/
│   │       ├── ai/               # ocrPreprocessor (sharp/pdf-parse), structuredExtractor, policyResolver
│   │       ├── crypto/           # SHA-256 file/text hashing & Node 24 Argon2id password hashing
│   │       ├── notifications/    # T-7d / T-48h / T-12h deadline sweeper, Email & WhatsApp webhooks
│   │       └── pdf/              # PDFKit Claim Dossier generator with embedded proof image
│   └── tests/                    # Vitest + Supertest integration suite
└── client/                       # React 19 + Vite + Tailwind CSS v4 + Zustand + Vaul + Sonner + cmdk
    ├── public/                   # PWA manifest + offline proof service worker (sw.js)
    └── src/
        ├── components/atoms/     # ConfidencePill, TabularPrice, CountdownBadge, HotkeyHint, StagePill
        ├── components/molecules/ # BoundingBoxOverlay, ProofInspector, UrgentDeadlineCard, VaultItemRow
        ├── components/organisms/ # TopLedgerHeader, GlobalDropzone, MixedInitiativeDrawer, ItemDetailDrawer, CommandPalette
        ├── hooks/                # useGlobalClipboardPaste, useKeyboardShortcuts
        ├── pages/                # ActionNeededView, VaultLedgerView, SavedMoneyAnalyticsView
        ├── services/             # Axios silent refresh interceptor + IndexedDB offline proof cache
        └── store/                # Zustand store with optimistic mutations & task velocity tracking
```

---

## Key Engineering Features

1. **60-Second Visit 1 → 20-Second Visit 2+ Velocity Engine:**
   - **Global Viewport Paste & Drop (`useGlobalClipboardPaste`):** Press `Ctrl+V`/`Cmd+V` with copied WhatsApp/SMS text or an image anywhere on the page, or drag and drop a receipt file onto the viewport.
   - **Merchant Fingerprint Memory (`merchant_profiles`):** Compound unique index `{ householdId: 1, normalizedMerchantName: 1 }` learns return windows, warranty durations, currencies, and alert channels upon first confirmation.
   - **Mixed-Initiative Confidence Routing:** When `overallConfidence >= 0.92` and `merchantMemoryApplied === true`, items auto-commit immediately with a 6-second floating Undo/Edit toast (`sonner`). Any field below `0.90` opens the spring-physics slide-over inspection drawer (`vaul`) with that field focused in amber alongside the **Receipt Proof Viewer**.
2. **Bret Victor Receipt Proof Bounding Boxes:**
   - Hovering or focusing any extracted field (`Merchant`, `Amount`, `Purchase Date`, `Order #`, `Serial #`) highlights its normalized `[x1, y1, x2, y2]` coordinates on the original receipt proof image.
3. **3-Stage Hybrid Multimodal Extraction Pipeline:**
   - **Stage 1 (`ocrPreprocessor.ts`):** `sharp` EXIF auto-rotation, adaptive thermal contrast normalization, WebP compression, `pdf-parse` PDF text extraction, and cryptographic `SHA-256` hashing (duplicate upload guard).
   - **Stage 2 (`structuredExtractor.ts`):** Supports live Gemini (`gemini-2.5-flash`) or OpenAI (`gpt-4o-mini`) strict JSON schema extraction (`temperature: 0`), plus local Tesseract OCR and deterministic regex/heuristic parsing so the entire application runs smoothly even without external API keys.
   - **Stage 3 (`policyResolver.ts`):** Leap-year-safe UTC date math resolving policy precedence: `MerchantProfile Memory` → `Explicit Receipt Terms` → `100+ Built-In Pakistani & Global Merchant Rules`.
4. **MongoDB `$facet` Dashboard & Production Indexes:**
   - Single-roundtrip `$facet` aggregation pipeline returning urgent deadlines (`<14d`), active ledger items, resolved savings, and Visit 1 vs. Visit 2 velocity metrics.
   - Compound indexes on `{ status, dates.returnDeadline, dates.warrantyExpiryDate, dates.nextRenewalDate }`, `{ householdId, status, dates.returnDeadline }`, `{ householdId, proofFiles.sha256Hash }`, sparse unique `publicVerificationToken`, and full-text search index across titles, merchants, serials, orders, and OCR text.
5. **1-Click Warranty Claim Dossier PDF & Public Resale Certificate:**
   - `GET /api/v1/vault/:id/claim-dossier.pdf` streams a printable PDFKit claim dossier embedding the original receipt image and SHA-256 digest.
   - `GET /api/v1/verify/:token` renders a privacy-preserving public Resale Trust Certificate (`/verify/:token`).

---

## Quick Start (Local Development)

### Prerequisites
- Node.js `>= 20` (tested on Node `24.16.0`)
- npm `>= 10`

### 1. Install & Build Shared Types
```bash
npm install
npm run build --workspace=shared
```

### 2. Optional Environment Configuration
Copy `.env.example` to `.env` if you want to connect MongoDB Atlas, Redis/BullMQ, Gemini, or OpenAI:
```bash
cp .env.example .env
```
> **Zero-Config Local Mode:** When `MONGODB_URI` is left blank, the server automatically starts a local embedded MongoDB engine (`mongodb-memory-server` persisted to `server/.mongodb-local`) and seeds the 4 interactive demo records (`Anker Prime 67W Charger`, `Cursor Pro Annual Plan Trial`, `Lenovo Legion Slim 5 Laptop`, `Sony WH-1000XM5 Headphones`) along with learned `Daraz Mall` and `PakLap Lahore` merchant profiles.

### 3. Run Both API & Frontend
```bash
npm run dev
```
- **Web App:** `http://localhost:5173`
- **REST API:** `http://localhost:4000/api/v1`
- **Health Check:** `http://localhost:4000/api/health`

### 4. Run Tests & Production Build
```bash
npm run typecheck
npm test
npm run build
```

---

## Core REST Endpoints (`/api/v1`)

| Method & Path | Purpose |
| :--- | :--- |
| `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `GET /me` | Argon2id authentication + JWT access/refresh token rotation + Household isolation |
| `POST /api/v1/ingest/extract` | Multipart file / pasted text SHA-256 hash, duplicate detection, AI extraction, Merchant Memory match |
| `GET /api/v1/vault/dashboard` | Single `$facet` aggregation payload (Urgent, Active, Resolved, KPIs, Merchant Profiles) |
| `PATCH /api/v1/vault/:id/confirm` | Commits user edits & upserts `MerchantProfile` memory (`usageCount + 1`) |
| `POST /api/v1/vault/:id/resolve` (alias `/outcome`) | Logs refund/warranty/cancellation savings and cancels pending reminder alerts |
| `POST /api/v1/vault/:id/restore` | 5-second `Undo` restore back to `ACTIVE` |
| `GET /api/v1/vault/:id/claim-dossier.pdf` (alias `/claim-pdf`) | Streams standardized PDFKit Warranty / Return Claim Dossier |
| `GET /api/v1/verify/:token` | Public Resale Trust Certificate (private buyer PII redacted) |
