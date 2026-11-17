# ClaimVault — Industrial MERN Stack & AI Implementation Plan + Master Build Prompt

**Prepared For:** Hamdan Ali (BSSE, Air University Islamabad — Roll No. 233120)

**Target Role:** [WAMO Labs — Fresh Graduates (MERN, Python, AI/ML)](https://www.wamolabs.com/careers/cmixnvbsw005wxd0lwqfojr6i#apply) | [WAMO Labs Official Website](https://www.wamolabs.com/)

**Companion Scope Document:** [ClaimVault Market Gap Analysis & Technical Scope Document (Google Doc)](https://docs.google.com/document/d/1lJLhplEpPDedYCb9_YpiyVxEiTM7rsGIvgOt6UsJbqY/edit)

**Architecture Stack:** MongoDB Atlas, Express.js, React 19 (Vite + TypeScript + Tailwind CSS), Node.js, BullMQ/Cron Workers, Multimodal Vision OCR + Structured LLM Extraction

## 1. Executive Product Thesis & Research Foundation

**ClaimVault** solves a daily consumer and household financial leakage problem: people lose hundreds of dollars every year to faded thermal receipts, missed 7-to-30-day return windows, unclaimed 1-year hardware warranties, and forgotten auto-renewing subscriptions. According to the [Appriss Retail and Deloitte Returns Study cited by SureBright](https://www.surebright.com/research/americas-extended-warranty-market-2025-trends-in-purchase-behavior-fraud-risks-and-porch-piracy), consumers returned \$685 billion in merchandise in 2024 (13.21% of total retail sales), while [Stanford and NBER subscription inertia research by Liran Einav, Ben Klopack, and Neale Mahoney](https://nmahoney.people.stanford.edu/sites/g/files/sbiybj23976/files/media/file/subscriptions.pdf) proves that nearly 90% of consumers underestimate recurring subscription spend by over 3x and that active renewal prompts cut excess "inattention revenue" by 45% to 48% ([NBER Digest](https://www.nber.org/digest/202310/consumer-inattention-and-subscription-renewals)).

Rather than building another manual expense spreadsheet that users abandon within two weeks due to the collection barrier identified in [Ian Li, Anind Dey, and Jodi Forlizzi's Stage-Based Personal Informatics Model (*CHI 2010*)](https://quantifiedself.com/blog/a-stage-based-model-of-personal-informatics-systems/) and [Daniel Epstein, James Fogarty, and Sean Munson's Lived Informatics Model (*UbiComp 2015*)](https://www.hcde.washington.edu/news/article/2025-10-15/professor-sean-munson-and-collaborators-recognized-10-year-impact-award), ClaimVault acts as an invisible **Sludge-Elimination Engine** ([Richard Thaler, *Science* 2018](https://www.researchgate.net/publication/326830386_Nudge_not_sludge); [Cass Sunstein, *Behavioural Public Policy* 2020](https://www.cambridge.org/core/journals/behavioural-public-policy/article/sludge-audits/12A7E338984CE8807CC1E078EC4F13A7)) that automates the **Anticipation** and **Monitoring** phases of household cognitive labor ([Allison Daminger, *American Sociological Review* 2019](https://www.researchgate.net/publication/334358256_The_Cognitive_Dimension_of_Household_Labor)).

## 2. World's Top 20 UI/UX Designers & HCI Pioneers: Applied Design Architecture

To guarantee **zero AI-slop aesthetic**, **zero visual clutter**, and **industrial-grade craft**, every screen, transition, and interaction in ClaimVault is governed by concrete rules derived from 20 world-leading UI/UX designers and HCI pioneers:

| \# | Designer / Pioneer | Core Philosophy & Reference | Exact Implementation Rule in ClaimVault | 
| ----- | ----- | ----- | ----- | 
| 1 | **Emil Kowalski** (Linear / Vercel, creator of `sonner` & `vaul`) | [Restrained Spring Physics & Felt Quality](https://emilkowal.ski/) ([Micro-Interaction Analysis](https://aiskill.market/blog/emil-kowalski-micro-interactions)) | Use spring-based physics (`stiffness: 380, damping: 30`) instead of linear CSS durations; drawers (`vaul`) and toast undo pills (`sonner`) respond with physical momentum and sub-180ms settle times. | 
| 2 | **Rauno Freiberg** (Vercel Design Engineer) | [Invisible Details & Tactile Craft](https://detail.design/resource) | Implement subtle `1px` inner hairline borders, optical icon alignment, tabular numerals (`font-variant-numeric: tabular-nums`) on all countdown timers and currency amounts, and sound-optional tactile feedback. | 
| 3 | **Paco Coursey** (Linear / Vercel, creator of `cmdk`) | [Keyboard-First Zero-Flicker Speed](https://detail.design/resource) | Global `Cmd+K` / `/` Command Palette (`cmdk`) lets returning users jump to any receipt, copy a serial number, or export a warranty PDF in 2 keystrokes with zero page reloads. | 
| 4 | **Karri Saarinen** (Co-Founder & CEO, Linear) | [Opinionated Minimalism & High-Signal Craft](https://www.ceo-watch.com/karri-saarinen-linear-ceo.html) ([Linear Craft Principles](https://medium.com/design-bootcamp/crafting-excellence-how-linears-ceo-builds-products-that-stand-out-5527c113fe03)) | Reduce scope on every view: no decorative charts, no marketing banners inside the app, and high-contrast monochrome surfaces where color is reserved strictly for deadline urgency (Amber = `<7 days`, Crimson = `<48 hours`, Emerald = `Protected`). | 
| 5 | **Guillermo Rauch** (Founder & CEO, Vercel) | [Optimistic UI & Complexity on Demand](https://sequoiacap.com/podcast/training-data-guillermo-rauch) ([Vercel DX Analysis](https://medium.com/@takafumi.endo/how-vercel-simplifies-deployment-for-developers-beaabe0ada32)) | Mutate UI state optimistically in `<16ms` upon click while background workers persist to MongoDB; hide advanced OCR raw JSON and SHA-256 hashes behind an expandable "Proof Inspector" drawer. | 
| 6 | **Don Norman** (Co-Founder, Nielsen Norman Group) | [Signifiers, Affordances & Conceptual Models](https://www.nngroup.com/articles/) | Design receipt cards to look and behave like tangible warranty certificates with clear action signifiers ("Claim Warranty PDF", "Mark Returned") rather than abstract database rows. | 
| 7 | **Jakob Nielsen** (Co-Founder, Nielsen Norman Group) | [10 Usability Heuristics & Jakob's Law](https://www.nngroup.com/articles/) ([Usability Heuristics Guide](https://www.shopify.com/partners/blog/usability-heuristics)) | Enforce *Recognition Rather Than Recall* and *Visibility of System Status*: show real-time stage pills (` Hashing File` → `Reading Receipt` → `Dates Verified`) and provide an instant 5-second `Undo` on every destructive or state-changing action. | 
| 8 | **Steve Krug** (Usability Pioneer, *Don't Make Me Think*) | [Self-Evident Navigation & Zero Cognitive Friction](https://cdn.bookey.app/files/pdf/book/en/mobile-first.pdf) | Limit primary navigation to 3 self-evident tabs: **Action Needed** (expiring soon), **Vault** (all active assets & bills), and **Saved Money** (completed claims & cancelled trials). | 
| 9 | **Luke Wroblewski** (Author of *Web Form Design* & *Mobile First*) | [Aggressive Input Reduction & Camera-First Capture](https://www.lukew.com/ff/) ([Web Form Design](https://rosenfeldmedia.com/books/web-form-design/)) | Eliminate multi-field blank forms; replace manual typing with camera/clipboard capture and inline 1-tap chips for editing only uncertain fields. | 
| 10 | **Alan Cooper** (Pioneer of Goal-Directed Design, *About Face*) | [Goal-Directed Personas & Posture Design](https://api.jovenestalento.edu.sv/85175VP/001841200926/pub/about-face__the-essentials-of-interaction__design.pdf) | Design for a **sovereign, transient utility posture**: users open ClaimVault to complete a specific task (save a receipt or download a claim packet) and leave immediately—never trap them in endless feeds. | 
| 11 | **Bret Victor** (Dynamicland / Former Apple Human Interface Designer) | [Direct Manipulation & Immediate Connection](https://worrydream.com/) ([Interaction Design Analysis](https://worrydream.com/ABriefRantOnTheFutureOfInteractionDesign/)) | Side-by-side Receipt Proof Viewer: hovering over an extracted field (e.g., `Warranty Expiry: 16 Nov 2027` or `Serial #`) highlights the exact bounding box on the original receipt image. | 
| 12 | **Edward Tufte** (Information Design Pioneer) | [Maximizing the Data-Ink Ratio](https://www.smashingmagazine.com/2026/08/rethinking-data-visualisation-ux-approach-dashboards/) | Strip away gridlines, drop shadows, circular gauges, and ornamental widgets; every pixel on the dashboard encodes either currency at risk, time remaining, or proof verification status. | 
| 13 | **Brad Frost** (Creator of *Atomic Design*) | [Role-Based Tokens & Atomic Component Hierarchy](https://uxdesign.cc/design-md-the-one-standard-file-carries-your-visual-identity-for-humans-and-agents-9058d5b39d9b) | Construct the React frontend strictly from semantic tokens (`surface.canvas`, `status.urgent`, `text.tabular`) through Atoms (`ConfidenceBadge`, `CountdownPill`), Molecules (`ReceiptRow`), and Organisms (`MixedInitiativeDropzone`). | 
| 14 | **Dan Mall** (Founder, Design System University & *Design That Scales*) | [Pragmatic Component Governance](https://designsystem.university/books/design-that-scales) ([Dan Mall Reference](https://danmall.com/)) | Keep the component library lean (under 18 core primitives) so every screen shares identical spacing, focus rings, and keyboard accessibility. | 
| 15 | **Julie Zhuo** (Former VP of Product Design, Facebook) | [Diagnose with Data, Treat with Design & Crisp Value](https://lg.substack.com/p/the-looking-glass-what-ai-wont-change) ([Product Design Playbook](https://blog.uxtweak.com/how-to-design-a-product/)) | Make the first-time empty state immediately functional: allow a first-time visitor to drop a receipt or test a 1-click live sample receipt *before* forcing account registration. | 
| 16 | **Jared Spool** (Founder, UIE) | [Bridging the Knowledge Gap in Intuitive Design](https://ui-patterns.com/talks/videos/the-curious-properties-of-intuitive-web-pages-jared-spool) | Bridge the gap between current knowledge and target knowledge by pre-filling localized defaults (e.g., standard 7-day Daraz return policy or 12-month electronics warranty) with clear source tooltips. | 
| 17 | **Andy Matuschak** (HCI Researcher, Evergreen Systems) | [High-Density Contextual Inspection](https://notes.andymatuschak.org/zC19qWHvd5Ln8mauXu5HDoP) | Use stacked slide-over drawers rather than full-page context switches so users never lose their scroll position in the Vault while inspecting a receipt or claim PDF. | 
| 18 | **Larry Tesler** (Xerox PARC / Apple, *Tesler's Law*) | [Law of Conservation of Complexity](https://lawsofux.com/) ([Tesler's Law Guide](https://www.ux-guidelines.com/teslers-law.html)) | Shift 100% of irreducible complexity (date math across leap years, currency normalization, warranty policy lookup, OCR noise cleanup) onto the Node.js backend so the user faces a 1-click confirmation. | 
| 19 | **Paul Fitts** (*Fitts's Law* of Target Acquisition) | [Target Size & Cursor Proximity Optimization](https://lawsofux.com/) ([UX Laws Reference](https://www.uxtoast.com/ux-laws/)) | Place primary confirmation and claim-export buttons directly adjacent to the dropzone cursor position with a minimum touch/click target height of `44px`. | 
| 20 | **Andy Cockburn, Joey Scarr, & Carl Gutwin** (HCI Spatial Memory Researchers) | [Power Law of Practice & Novice-to-Expert Transition](https://www.emerald.com/fthci/article/6/1/i/1324737/Supporting-and-Exploiting-Spatial-Memory-in-User) ([Blur Transition Paper](https://www.csse.canterbury.ac.nz/andrew.cockburn/papers/blur.pdf)) | Keep spatial button coordinates invariant across sessions and use **Ephemeral Adaptation** (auto-confirming known merchants) to compress task time from 60 seconds on Visit 1 to 20 seconds on Visit 2+. | 

## 3. The "60-Second First Visit → 20-Second Repeat Visit" Velocity Engine

A core engineering requirement of ClaimVault is **Adaptive Task Compression**: when a new user performs an action for the first time, the guided flow takes **\~50–60 seconds**; when the same user returns a second time, the system uses **Merchant Fingerprint Memory**, **Ephemeral Adaptation** ([Cockburn, Scarr, & Gutwin, 2013](https://www.emerald.com/fthci/article/6/1/i/1324737/Supporting-and-Exploiting-Spatial-Memory-in-User)), and **Mixed-Initiative Confidence Routing** ([Eric Horvitz, *CHI 1999*](https://erichorvitz.com/chi99horvitz.pdf)) to cut that exact workflow to **15–25 seconds (1–2 clicks)**.

### 3.1 Quantitative Time-Motion Breakdown (First-Time vs. Returning User)

| Interaction Step | First-Time User (Visit 1: Novice Mode) | Time | Returning User (Visit 2+: Express Memory Mode) | Time | HCI / Engineering Mechanism | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **1. Launch & Input Trigger** | Reads empty-state prompt, clicks **"Upload Receipt / Paste Order"**, browses file picker, selects image/PDF. | `15s` | Presses `Ctrl+V` / `Cmd+V` anywhere on viewport (or drops image anywhere on screen / clicks pinned **"1-Tap Paste"** button). | `3s` | Global `paste` & `dragover` window listeners ([Luke Wroblewski Input Reduction](https://www.lukew.com/ff/)). | 
| **2. AI Extraction & Policy Lookup** | Multimodal OCR extracts Merchant, Item, Price, Purchase Date, and Serial #. Backend queries default policy. | `8s` | Parallel SHA-256 check + Merchant Fingerprint hit (`merchant_profiles` collection) loads known store rules in `<50ms` while OCR extracts item/price. | `4s` | Compound MongoDB index on `{ householdId: 1, normalizedMerchantName: 1 }`. | 
| **3. Field Verification & Policy Selection** | Reviews 5 extracted fields; manually selects Return Window (`14 Days`), Warranty (`12 Months`), and Alert Channel (`WhatsApp + Email`). | `28s` | **Auto-Applied from Merchant Memory**: Return Window, Warranty Term, Currency (`PKR`), Category, and Alert Channel are pre-verified (`98% confidence`). Only Price & Item Title are shown in a compact banner. | `8s` | [Eric Horvitz Mixed-Initiative UI](https://erichorvitz.com/chi99horvitz.pdf) + [Madrian & Shea Optimal Defaults](https://www.nber.org/system/files/working_papers/w11074/w11074.pdf). | 
| **4. Commit & Schedule Alerts** | Clicks **"Confirm & Save to Vault"**, Then clicks **"Enable Reminders"** in confirmation modal. | `9s` | **1-Click Optimistic Commit** (or automatic 5-second countdown commit with inline `Undo` pill). Zero secondary modals. | `5s` | [Emil Kowalski `sonner` Undo Pattern](https://emilkowal.ski/) + [Guillermo Rauch Optimistic UI](https://sequoiacap.com/podcast/training-data-guillermo-rauch). | 
| **Total Task Duration** | **5 Clicks + 3 Dropdown Selections** | **`60s`** | **1 to 2 Clicks (Zero Dropdowns)** | **`20s`** | **66.7% Time Reduction via Power Law of Practice** ([Cockburn et al., 2013](https://www.emerald.com/fthci/article/6/1/i/1324737/Supporting-and-Exploiting-Spatial-Memory-in-User)). | 

### 3.2 Five Concrete UX Accelerators Built into ClaimVault

1. **Merchant Fingerprint Auto-Completion (`merchant_profiles` Collection):**

   * The first time a user saves a receipt from `"Nayatel"`, `"Daraz Mall"`, `"Apple Store"`, or `"Hafeez Center Laptop Zone"`, MongoDB upserts a `MerchantProfile` document storing that user's chosen `defaultReturnDays`, `defaultWarrantyMonths`, `defaultCategory`, `defaultCurrency`, and `preferredAlertChannels`.

   * On the second visit from the same merchant, the backend attaches `merchantMemoryMatched: true` and skips the configuration step entirely—presenting a single **"Save to Vault (14d Return · 1yr Warranty)"** primary button.

2. **Global Viewport Paste & Drop (`Zero-Modal Ingestion`):**

   * Users never have to hunt for an "Add New" button. Pressing `Ctrl+V` (with a copied WhatsApp order message, SMS text, or screenshot in the clipboard) or dragging a file anywhere onto the window immediately triggers the extraction pipeline inline at the top of the Vault.

3. **High-Confidence Optimistic Auto-Save (`Confidence >= 0.92`):**

   * Following [Eric Horvitz's Mixed-Initiative uncertainty threshold (*CHI 1999*)](https://erichorvitz.com/chi99horvitz.pdf), if all core fields (`merchantName`, `title`, `purchasePrice`, `purchaseDate`) have extraction confidence `>= 0.92` and match an existing `MerchantProfile`, the item is saved **immediately** upon upload with a 6-second floating toast: `"Saved Samsung 27" Monitor (PKR 64,500) · Warranty until 16 Nov 2027 [Edit] [Undo]"`. Total clicks after paste: **zero** (or 1 click to upload).

4. **Spatial Invariance & Ephemeral Highlighting:**

   * Following [Joey Scarr, Andy Cockburn, and Carl Gutwin's *Dips and Ceilings* research](https://www.csse.canterbury.ac.nz/andrew.cockburn/papers/blur.pdf), primary action buttons never shift coordinates based on variable text lengths. On repeat visits, the user's most frequent action on an expiring card (`"Download Claim PDF"` for physical items, `"Log Cancellation"` for subscriptions) fades in with a subtle highlight border while secondary actions remain visually recessed.

5. **1-Click "Repeat Last Action" & Inline Shortcut Badges:**

   * Hovering any button gently reveals its single-key hotkey (`N` for New Receipt, `C` for Claim PDF, `R` for Mark Returned, `/` for Search) after a `400ms` delay—teaching keyboard shortcuts organically without intrusive onboarding tooltips.

## 4. Zero-AI-Tone Visual Identity & Human Microcopy Rules

To ensure the application looks like a crafted financial utility built by senior product engineers (like Linear, Stripe, or Wise) rather than an AI template, the following strict visual and copy rules apply:

### 4.1 Visual Anti-Patterns (Strictly Forbidden)

* **NO** purple/indigo/neon-cyan gradients, glowing blobs, sparkle icons (`✨`), robot avatars, or glassmorphism blur cards.

* **NO** marketing hero fluff ("Unlock the Future of AI-Powered Receipt Intelligence", "Seamlessly Empower Your Journey").

* **NO** chat-interface wrappers: the user should never have to "chat with a bot" to log a receipt. AI works invisibly inside the ingestion pipeline ([Mark Weiser's Calm Technology, 1991](https://graphics.stanford.edu/courses/cs428-03-spring/Papers/readings/General/Weiser_SciAm91.htm)).

### 4.2 Color Tokens & Typography ("Archival Paper & Swiss Ledger" Aesthetic)

* **Background Surfaces:** Warm Archival Paper (`#FAF9F6`) for main canvas; Crisp Card White (`#FFFFFF`) with `1px solid #E6E4DD` borders; Recessed Slate (`#F3F1EC`) for secondary wells.

* **Typography:**

  * **Headings & UI Labels:** `Inter` or `Plus Jakarta Sans` (tight tracking `-0.02em`, semi-bold `600`).

  * **Numbers, Dates, Serials & Hashes:** `JetBrains Mono` with `font-variant-numeric: tabular-nums` so columns of prices, countdowns, and SHA-256 hashes align to the exact pixel.

* **Semantic Status Palette (WCAG AAA Contrast):**

  * **Ink Primary:** `#141413` | **Ink Muted:** `#615F59`

  * **Urgent Action (`<48h` Left):** Background `#FEF2F2`, Border `#FECACA`, Text `#991B1B`

  * **Upcoming Window (`<7d` Left):** Background `#FFFBEB`, Border `#FDE68A`, Text `#92400E`

  * **Protected / Verified:** Background `#ECFDF5`, Border `#A7F3D0`, Text `#065F46`

### 4.3 Microcopy Replacement Table (Zero AI Tone)

| Context | Forbidden "AI Tone" Copy | Required Human, Utilitarian Copy | 
| ----- | ----- | ----- | 
| **Empty Dropzone** | *"✨ Let our Magical AI Assistant analyze your receipts seamlessly!"* | **"Drop a receipt photo, PDF, or paste an order message (`Ctrl+V`)."** | 
| **Extraction Progress** | *"🤖 AI is thinking and hallucination-checking your data..."* | **"Reading store name, serial number, and return dates..."** | 
| **Low-Confidence Field** | *"⚠️ AI Confidence Score Low (0.64). Please validate entity."* | **"Check purchase date — thermal ink was faded on the receipt."** | 
| **Deadline Alert Banner** | *"🚀 Proactive Insight: Optimize your financial wellness today!"* | **"Return window for Anker 65W Charger closes in 36 hours (PKR 8,400)."** | 
| **Claim Button** | *"✨ Generate AI Smart Warranty Synthesis"* | **"Download Warranty Claim PDF"** | 

## 5. Complete Backend Architecture (Node.js + Express.js + MongoDB Atlas)

This backend architecture is specifically engineered to demonstrate senior-level full-stack and database mastery for the [WAMO Labs MERN Stack evaluation](https://www.wamolabs.com/careers/cmixnvbsw005wxd0lwqfojr6i#apply).

### 5.1 Production Monorepo Directory Structure

```
claimvault/
├── client/                          # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── atoms/               # ConfidencePill, TabularPrice, CountdownBadge, HotkeyHint
│   │   │   ├── molecules/           # VaultItemRow, UrgentDeadlineCard, BoundingBoxOverlay
│   │   │   └── organisms/           # GlobalDropzone, MixedInitiativeDrawer, CommandPalette
│   │   ├── hooks/                   # useGlobalClipboardPaste, useOptimisticVault, useMerchantMemory
│   │   ├── pages/                   # ActionNeededView, VaultLedgerView, SavedMoneyAnalyticsView
│   │   ├── services/                # Axios API client with silent refresh-token interceptor
│   │   └── store/                   # Zustand + IndexedDB offline proof cache
├── server/                          # Node.js 22 + Express.js + TypeScript
│   ├── src/
│   │   ├── config/                  # DB connection pool, Redis/BullMQ, S3/Cloudinary, Env Zod schema
│   │   ├── controllers/             # auth, vaultItem, ingestion, claimDossier, household, analytics
│   │   ├── middlewares/             # jwtAuth, householdRbac, rateLimiter, zodValidator, errorHandler
│   │   ├── models/                  # User.ts, Household.ts, VaultItem.ts, MerchantProfile.ts, AuditLog.ts
│   │   ├── services/
│   │   │   ├── ai/                  # ocrPreprocessor.ts, structuredExtractor.ts, policyResolver.ts
│   │   │   ├── crypto/              # sha256FileHasher.ts (tamper-proof receipt verification)
│   │   │   ├── pdf/                 # claimPacketBuilder.ts (PDFKit standardized claim generator)
│   │   │   └── notifications/       # deadlineScheduler.ts, emailDispatcher.ts, whatsappWebhook.ts
│   │   ├── queues/                  # BullMQ workers for async OCR & T-7d / T-48h / T-12h alerts
│   │   └── routes/                  # v1 API routers
└── shared/                          # Shared Zod schemas & TypeScript interfaces across client/server

```

### 5.2 Complete MongoDB Schemas & Index Specifications

1. **`users` Collection:**

   * Fields: `_id`, `fullName`, `email` (unique index), `passwordHash` (Argon2id), `defaultCurrency` (`'PKR' | 'USD'`), `timezone` (`'Asia/Karachi'`), `activeHouseholdId`, `refreshTokens: [{ tokenHash, expiresAt, deviceInfo }]`.

2. **`households` Collection (Shared Domestic Cognitive Labor per [Daminger, 2019](https://www.allisondaminger.com/research)):**

   * Fields: `_id`, `name`, `planTier` (`'FREE' | 'PRO_HOUSEHOLD' | 'SMB_TEAM'`), `inboundForwardingAlias` (e.g., `hamdan.vault@claimvault.app`), `members: [{ userId, role: 'OWNER' | 'EDITOR' | 'VIEWER', joinedAt }]`.

3. **`merchant_profiles` Collection (Powers the 20-Second Repeat-User Flow):**

   * Fields: `_id`, `householdId`, `normalizedMerchantName` (lowercase trimmed, e.g., `'daraz'`, `'nayatel'`, `'apple'`), `displayName`, `defaultCategory`, `defaultCurrency`, `defaultReturnWindowDays` (Number), `defaultWarrantyMonths` (Number), `defaultBillingCycle` (`'NONE' | 'MONTHLY' | 'YEARLY'`), `usageCount` (Number), `lastUsedAt` (Date).

   * **Compound Unique Index:** `{ householdId: 1, normalizedMerchantName: 1 }` — guarantees `<5ms` lookup during ingestion so repeat uploads from the same store auto-fill all policy rules.

4. **`vault_items` Collection (Core Polymorphic Ledger):**

   * Fields:

     * `householdId` (`ObjectId`, indexed), `createdBy` (`ObjectId`)

     * `kind`: `'PHYSICAL_ASSET' | 'SUBSCRIPTION' | 'UTILITY_BILL'`

     * `title` (String), `merchantName` (String), `normalizedMerchantName` (String), `category` (String)

     * `financials`: `{ amount: Number, currency: String, paymentMethod: String }`

     * `identifiers`: `{ orderNumber: String, serialNumber: String, imei: String, modelCode: String }`

     * `dates`: `{ purchaseDate: Date, returnDeadline: Date, warrantyExpiryDate: Date, nextRenewalDate: Date, cancelByDate: Date }`

     * `proofFiles`: `[{ fileUrl: String, mimeType: String, sha256Hash: String, fileSizeBytes: Number, uploadedAt: Date }]`

     * `aiMetadata`: `{ overallConfidence: Number, fieldConfidence: Map<String, Number>, boundingBoxes: Object, rawOcrText: String, merchantMemoryApplied: Boolean }`

     * `status`: `'ACTIVE' | 'RETURN_INITIATED' | 'RETURNED_REFUNDED' | 'WARRANTY_CLAIMED' | 'SUBSCRIPTION_CANCELLED' | 'EXPIRED'`

     * `outcome`: `{ moneySavedOrRecovered: Number, resolvedAt: Date, resolutionNotes: String }`

     * `publicVerificationToken`: `String` (sparse unique index for generating verifiable resale certificates per [EconStor Circular Economy Study](https://www.econstor.eu/bitstream/10419/344012/1/1984356933.pdf)).

   * **Production Compound Indexes:**

     * **Deadline Sweeper Index:** `{ status: 1, "dates.returnDeadline": 1, "dates.warrantyExpiryDate": 1, "dates.nextRenewalDate": 1 }`

     * **Household Dashboard Sort Index:** `{ householdId: 1, status: 1, "dates.returnDeadline": 1 }`

     * **Full-Text Search Index:** `{ title: "text", merchantName: "text", "identifiers.serialNumber": "text", "identifiers.orderNumber": "text", "aiMetadata.rawOcrText": "text" }`

### 5.3 Core Backend API Endpoints (`REST /api/v1`)

| Method & Endpoint | Purpose | Key Engineering & Security Details | 
| ----- | ----- | ----- | 
| `POST /api/v1/ingest/extract` | Accepts image, PDF, or raw pasted text; returns structured extraction + Merchant Memory match. | Computes SHA-256 hash (`crypto.createHash('sha256')`) to block duplicate receipt uploads; queries `merchant_profiles` in parallel with AI Vision extraction; if `overallConfidence >= 0.92` and `merchantMemoryApplied === true`, auto-creates the `VaultItem` in `'ACTIVE'` state for 1-click/0-click velocity. | 
| `GET /api/v1/vault/dashboard` | Single-roundtrip payload for **Action Needed**, **Vault Ledger**, and **ROI Metrics**. | Uses MongoDB `$facet` aggregation pipeline to return: (1) items expiring within 14 days sorted by urgency, (2) active protected items, and (3) cumulative `moneySavedOrRecovered` vs. `totalProtectedValue` in a single query. | 
| `PATCH /api/v1/vault/:id/confirm` | Commits user edits from the Mixed-Initiative drawer & updates `merchant_profiles`. | Runs inside a Mongoose session; updates the item AND upserts `merchant_profiles` (`$inc: { usageCount: 1 }`) so the next upload from that merchant is 3x faster. | 
| `POST /api/v1/vault/:id/outcome` | Marks an item as `'RETURNED_REFUNDED'`, `'WARRANTY_CLAIMED'`, or `'SUBSCRIPTION_CANCELLED'`. | Credits `outcome.moneySavedOrRecovered` and cancels pending BullMQ reminder jobs for that item. | 
| `GET /api/v1/vault/:id/claim-pdf` | Generates a downloadable **1-Click Warranty/Return Claim Dossier PDF**. | Streams a clean PDF containing Merchant, Purchase Date, Order/Serial #, Defect Description, embedded original receipt image, and SHA-256 integrity timestamp ([Paul Curwell Warranty Fraud Prevention](https://paulcurwell.com/2025/09/09/the-25-billion-question-how-much-are-you-losing-to-warranty-fraud/)). | 
| `GET /api/v1/verify/:token` | Public read-only **Resale Trust Certificate** page. | Allows a second-hand buyer on OLX/Facebook Marketplace to verify the original purchase date, receipt hash, and remaining official warranty without exposing private buyer details. | 

## 6. Complete AI & Multimodal OCR Pipeline Specification

ClaimVault uses AI strictly as a **deterministic background parser and policy engine**—never as a chat gimmick.

### 6.1 Three-Stage Hybrid AI Pipeline

1. **Stage 1 — Image Pre-Processing & Cryptographic Hashing (`ocrPreprocessor.ts`):**

   * Uses `sharp` on Node.js to auto-rotate EXIF orientation, deskew tilted phone camera shots, apply adaptive contrast normalization for faded BPA/BPS thermal paper receipts, and compress to WebP while computing the raw file's `SHA-256` digest.

2. **Stage 2 — Multimodal Structured Extraction (`structuredExtractor.ts`):**

   * **Primary Model:** Gemini 2.5 Flash / OpenAI `gpt-4o-mini` with **Strict Structured Outputs (JSON Schema enforcement)** and `temperature: 0.0`.

   * **Fallback Local/Hybrid Pipeline:** `tesseract.js` / PaddleOCR text extraction piped into a lightweight structured LLM call when processing text-only PDFs or pasted WhatsApp/SMS strings.

   * **Enforced Output Schema (`ExtractionResultSchema`):**

     ```
     {
       "kind": "PHYSICAL_ASSET | SUBSCRIPTION | UTILITY_BILL",
       "merchantName": "string",
       "title": "string (concise human-readable item name, e.g., 'Logitech MX Master 3S Mouse')",
       "purchasePrice": 24500,
       "currency": "PKR",
       "purchaseDateISO": "2026-11-16",
       "identifiers": {
         "orderNumber": "string | null",
         "serialNumber": "string | null",
         "modelCode": "string | null"
       },
       "explicitReturnDaysOnReceipt": 14,
       "explicitWarrantyMonthsOnReceipt": 12,
       "billingCycle": "NONE | MONTHLY | YEARLY",
       "fieldConfidence": {
         "merchantName": 0.99,
         "title": 0.96,
         "purchasePrice": 0.98,
         "purchaseDateISO": 0.95,
         "serialNumber": 0.88
       },
       "boundingBoxes": {
         "purchasePrice": [0.42, 0.71, 0.58, 0.75],
         "purchaseDateISO": [0.12, 0.18, 0.34, 0.22]
       }
     }
     
     ```

3. **Stage 3 — Deterministic Policy & Date Resolver (`policyResolver.ts`):**

   * **Precedence Hierarchy:**

     1. **User's Historical `MerchantProfile`** (highest priority for returning users—enables the 20-second repeat workflow).

     2. **Explicit Policy Printed on Receipt** (`explicitReturnDaysOnReceipt` / `explicitWarrantyMonthsOnReceipt`).

     3. **Built-In Merchant Rules Knowledge Base** (pre-seeded JSON dictionary of 100+ global and Pakistani merchants: Daraz Mall = 14-day return, Apple = 14-day return / 12-month warranty, Steam = 14-day refund window, SaaS trials = 7/14/30-day auto-renewal).

   * **Confidence Routing ([Eric Horvitz Mixed-Initiative Principle](https://erichorvitz.com/chi99horvitz.pdf)):**

     * Any field with `fieldConfidence >= 0.90` renders as a locked, verified green badge.

     * Any field with `fieldConfidence < 0.90` (such as a smudged date on a thermal receipt) is highlighted in amber and focused automatically so the user can fix it in 1 tap.

## 7. Super Ultra Master Prompt (Copy-Paste into Antigravity IDE / Cursor / Claude Code)

Copy and paste the prompt block below directly into your AI IDE or coding agent to build the complete, production-ready **ClaimVault** MERN application:

```
# ROLE & ARCHITECTURAL MANDATE
You are a Principal Full-Stack MERN Architect (30+ years of distributed systems and database engineering experience) collaborating with an elite HCI & Product Design Engineering team modeled on the craft of Emil Kowalski, Rauno Freiberg, Paco Coursey, Karri Saarinen (Linear), Guillermo Rauch (Vercel), Don Norman, Jakob Nielsen, Luke Wroblewski, Bret Victor, and Edward Tufte, and grounded in the behavioral economics and personal informatics research of Richard Thaler, Cass Sunstein, Allison Daminger, Liran Einav, Neale Mahoney, Ian Li, Anind Dey, Daniel Epstein, and Eric Horvitz.

Your task is to build **ClaimVault** — a production-grade, revenue-ready MERN Stack application (MongoDB, Express.js, React 19 + TypeScript + Tailwind CSS, Node.js) that eliminates post-purchase financial leakage from expired return windows, unclaimed product warranties, and forgotten subscription auto-renewals.

---

## 1. STRICT UI/UX, ZERO-AI-TONE & VELOCITY REQUIREMENTS

### A. Visual Identity ("Archival Paper & Swiss Financial Ledger")
1. **Zero AI Slop:** NEVER use purple/indigo/cyan gradients, glowing neon borders, sparkle emojis (`✨`), robot icons, chat-bot bubbles, or marketing buzzwords ("Unleash AI Power", "Seamless Synergy").
2. **Color Tokens:**
   - Canvas Background: `#FAF9F6` (Warm Archival Paper)
   - Elevated Card Surface: `#FFFFFF` with `1px solid #E6E4DD` hairline border
   - Subtle Well / Table Header: `#F3F1EC`
   - Primary Ink: `#141413` | Secondary Ink: `#615F59`
   - Urgent Status (`<48h` remaining): Fill `#FEF2F2`, Border `#FECACA`, Text `#991B1B`
   - Warning Status (`<7d` remaining): Fill `#FFFBEB`, Border `#FDE68A`, Text `#92400E`
   - Protected / Verified Status: Fill `#ECFDF5`, Border `#A7F3D0`, Text `#065F46`
3. **Typography:**
   - UI & Headings: `Inter` or `Plus Jakarta Sans`, tracking `-0.02em`.
   - All Currency Amounts, Dates, Countdown Timers, Serial Numbers, and SHA-256 Hashes MUST use `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
4. **Motion & Micro-Interactions (Emil Kowalski / Rauno Freiberg / Paco Coursey Standard):**
   - Use spring physics (`stiffness: 380, damping: 30`) for drawers and modals; transitions must settle in `<180ms`.
   - Include a global `Cmd+K` / `/` Command Palette for instant search, filtering, serial-number copy, and 1-click PDF claim export.

### B. The "60-Second First Visit -> 20-Second Repeat Visit (1-2 Clicks)" Velocity Engine
You MUST implement the **Power Law of Practice & Ephemeral Adaptation** workflow:
1. **Global Viewport Paste & Drop (`useGlobalClipboardPaste`):**
   - Listening on `window` for `paste` (`Ctrl+V` / `Cmd+V`) and `drop` events anywhere on the screen. A returning user can paste an order text/screenshot or drop a receipt image anywhere on the dashboard without opening a modal first.
2. **Merchant Fingerprint Memory (`merchant_profiles` Collection):**
   - On Visit 1 (~60s), when a user uploads a receipt from a store (e.g., "Daraz", "Nayatel", "Apple", "Local Laptop Shop") and confirms the Return Window (`14 days`), Warranty (`12 months`), Currency (`PKR` or `USD`), and Category, the backend automatically upserts a `MerchantProfile` document for that household + normalized merchant name.
   - On Visit 2+ (~20s), when the user uploads or pastes another receipt from that same merchant, the backend matches the `MerchantProfile` in `<5ms`, pre-applies the exact return/warranty policy and currency, and sets `merchantMemoryApplied: true`.
3. **Mixed-Initiative Optimistic Auto-Save (Eric Horvitz Principle):**
   - If `overallConfidence >= 0.92` AND `merchantMemoryApplied === true`, automatically save the item to the Vault immediately and display a floating toast pill:
     `"Saved [Item Title] ([Currency] [Amount]) · Return by [Date] · [Edit] [Undo (6s)]"`
   - If any field has confidence `< 0.90` (e.g., faded thermal date), open the slide-over inspection drawer with ONLY the low-confidence field focused in amber for 1-tap correction, alongside a side-by-side Receipt Proof Viewer that highlights the bounding box on the receipt image.

---

## 2. COMPLETE BACKEND & DATABASE SPECIFICATION (NODE.JS + EXPRESS + MONGODB)

Implement a clean modular backend in `server/` with TypeScript, Express, Mongoose, and Zod validation:

1. **Database Models & Indexes:**
   - `User`: `_id`, `fullName`, `email`, `passwordHash`, `defaultCurrency` (`'PKR' | 'USD'`), `timezone` (`'Asia/Karachi'`).
   - `Household`: `_id`, `name`, `planTier` (`'FREE' | 'PRO_HOUSEHOLD' | 'SMB_TEAM'`), `members: [{ userId, role }]`.
   - `MerchantProfile`: `_id`, `householdId`, `normalizedMerchantName`, `displayName`, `defaultCategory`, `defaultCurrency`, `defaultReturnWindowDays`, `defaultWarrantyMonths`, `defaultBillingCycle`, `usageCount`, `lastUsedAt`.
     - Compound Unique Index: `{ householdId: 1, normalizedMerchantName: 1 }`.
   - `VaultItem`:
     - `householdId`, `kind` (`'PHYSICAL_ASSET' | 'SUBSCRIPTION' | 'UTILITY_BILL'`), `title`, `merchantName`, `normalizedMerchantName`, `category`
     - `financials`: `{ amount: Number, currency: String }`
     - `identifiers`: `{ orderNumber: String, serialNumber: String, modelCode: String }`
     - `dates`: `{ purchaseDate: Date, returnDeadline: Date, warrantyExpiryDate: Date, nextRenewalDate: Date }`
     - `proofFiles`: `[{ fileUrl: String, mimeType: String, sha256Hash: String, uploadedAt: Date }]`
     - `aiMetadata`: `{ overallConfidence: Number, fieldConfidence: Object, boundingBoxes: Object, merchantMemoryApplied: Boolean, rawOcrText: String }`
     - `status`: `'ACTIVE' | 'RETURNED_REFUNDED' | 'WARRANTY_CLAIMED' | 'SUBSCRIPTION_CANCELLED' | 'EXPIRED'`
     - `outcome`: `{ moneySavedOrRecovered: Number, resolvedAt: Date, notes: String }`
     - `publicVerificationToken`: `String` (unique sparse index)
     - Compound Indexes:
       1. `{ status: 1, "dates.returnDeadline": 1, "dates.warrantyExpiryDate": 1, "dates.nextRenewalDate": 1 }`
       2. `{ householdId: 1, status: 1, "dates.returnDeadline": 1 }`
       3. Full-text index on `title`, `merchantName`, `identifiers.serialNumber`, `identifiers.orderNumber`, `aiMetadata.rawOcrText`.

2. **Core API Routes (`/api/v1`):**
   - `POST /api/v1/ingest/extract`: Computes SHA-256 hash of uploaded receipt/text, checks for duplicate receipt hash, runs the AI structured extraction service + `MerchantProfile` lookup in parallel, calculates exact `returnDeadline`, `warrantyExpiryDate`, and `nextRenewalDate`, and returns (or auto-commits) the structured `VaultItem`.
   - `GET /api/v1/vault/dashboard`: Executes a single MongoDB `$facet` aggregation pipeline returning:
     - `urgentItems`: Active items where `returnDeadline`, `warrantyExpiryDate`, or `nextRenewalDate` is within the next 14 days, with computed `hoursRemaining`.
     - `allActiveItems`: Paginated/filterable active items.
     - `metrics`: `{ moneyAtRiskNext14Days, totalProtectedAssetValue, totalMoneySavedOrRecovered, repeatVelocityAvgSeconds }`.
   - `PATCH /api/v1/vault/:id/confirm`: Updates item fields and upserts the household's `MerchantProfile` (`usageCount + 1`) so future uploads from that merchant auto-complete.
   - `POST /api/v1/vault/:id/resolve`: Records a successful return refund, warranty claim, or subscription cancellation, adding the item's value to `totalMoneySavedOrRecovered`.
   - `GET /api/v1/vault/:id/claim-dossier.pdf`: Generates a clean, printable **Warranty / Return Claim Dossier PDF** including Merchant, Item, Order/Serial #, Purchase Date, Warranty Expiry, SHA-256 Proof Hash, and embedded receipt image.
   - `GET /api/v1/verify/:token`: Returns a public **Second-Hand Resale Trust Certificate** verifying original receipt authenticity and remaining warranty days.

---

## 3. AI & MULTIMODAL EXTRACTION ENGINE SPECIFICATION

Build a modular AI extraction pipeline in `server/src/services/ai/`:
1. **Pre-Processor (`ocrPreprocessor.ts`):** Normalizes image contrast/orientation and computes the `SHA-256` cryptographic hash.
2. **Structured Extractor (`structuredExtractor.ts`):**
   - Uses Gemini (`gemini-2.5-flash`) or OpenAI (`gpt-4o-mini`) Structured Outputs with `temperature: 0` (plus a deterministic regex/heuristic fallback parser so the app works offline or without an API key during local evaluator testing, while supporting live API keys via `.env`).
   - Extracts `kind`, `merchantName`, `title`, `purchasePrice`, `currency`, `purchaseDateISO`, `identifiers` (`orderNumber`, `serialNumber`, `modelCode`), `explicitReturnDaysOnReceipt`, `explicitWarrantyMonthsOnReceipt`, `billingCycle`, per-field confidence scores (`0.0` to `1.0`), and normalized `[x1, y1, x2, y2]` bounding boxes.
3. **Deterministic Policy & Date Resolver (`policyResolver.ts`):**
   - Merges extracted data with `MerchantProfile` memory (Priority 1), explicit receipt terms (Priority 2), or built-in merchant defaults (Priority 3: e.g., Daraz = 14d return, Apple = 14d return / 12m warranty, Netflix/Spotify/SaaS = 30d renewal cycle).

---

## 4. REQUIRED DELIVERABLES & INTERACTIVE DEMO SEED DATA

1. Pre-seed the database (or local state fallback) with realistic Pakistani & global daily-life records so a WAMO Labs senior engineer reviewing the app can test every workflow immediately without creating an account first:
   - **Urgent Return Closing in 28 Hours:** *Anker Prime 67W GaN Wall Charger* from **Daraz Mall** (`PKR 9,850`, Order `#DZ-994812`, `98%` confidence, 14-day return window expiring tomorrow).
   - **Trial Auto-Renewing in 41 Hours:** *Cursor Pro Annual Plan Trial* (`USD 20/mo`, auto-renewal alert active).
   - **Active High-Value Hardware Warranty:** *Lenovo Legion Slim 5 Laptop* from **PakLap Lahore** (`PKR 345,000`, Serial `PF4X982L`, 12-month warranty active, verifiable Resale Certificate link ready).
   - **Resolved Saved-Money Record:** *Sony WH-1000XM5 Headphones* (`PKR 82,000` recovered via 1-Click Warranty Claim PDF).
2. Include a **"Test 60s vs. 20s Repeat-User Speed Demo"** interactive switcher in the top header:
   - Clicking **"Simulate 1st Visit (New Merchant)"** runs the full guided extraction & policy confirmation drawer.
   - Clicking **"Simulate 2nd Visit (Known Merchant: Daraz)"** demonstrates the `MerchantProfile` auto-match + optimistic 1-click save with the inline `Undo` toast and live task-timer comparison (`58s -> 18s`).
3. Write clean, modular, strictly typed code with zero placeholders, complete error handling, and a comprehensive `README.md`.

```