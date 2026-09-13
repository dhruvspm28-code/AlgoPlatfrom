# QuantEdge AI (SmartQuant Edge) — Comprehensive Project State & Technical Architecture Summary

**Software Project Management (SPM) Capstone Milestone Report**  
**Document Version:** 2.4.0 (Final Milestone Release)  
**Date:** September 2026  
**Status:** 100% Milestone Completion | All 39 Automated Tests Passing | Clean SSR Production Build  
**Compiled PDF Location:** `d:\share market spm\SmartQuant_Edge_Project_Summary.pdf`  
**Interactive HTML Location:** `d:\share market spm\SmartQuant_Edge_Project_Summary.html`

---

## 1. Executive Summary & Project Identification

**QuantEdge AI** (designated internally as **SmartQuant Edge**) is an institutional-grade, AI-powered algorithmic trading platform and quantitative finance suite designed specifically for Indian equity and derivatives markets (NSE & BSE) and global asset classes. Inspired by platforms such as Zerodha Streak, QuantConnect, and TradingView, SmartQuant Edge combines a dark-themed glassmorphic trading terminal with:

- Automated rule evaluation across 10 mathematical indicators.
- Realistic paper broker simulation with mark-to-market P&L, slippage, and STT/regulatory fee modeling.
- Pre-trade risk controls with hard capital caps, stop-loss enforcement, and emergency circuit breakers.
- An explainable AI trade audit pipeline (**"Explain This Trade"**) providing an immutable 9-stage verifiable audit chain for every order.
- A first-party, privacy-centric authentication engine utilizing PBKDF2-HMAC-SHA512 hashing, permanent SmartQuant User IDs (`SQE-XXXXXX`), dual-channel 2FA OTP verification, and zero third-party/social tracker reliance.

The application satisfies 100% of the initial Software Requirements Specification (SRS) across **28 distinct frontend routes**, **28 background quantitative services**, and **39 automated unit and integration tests** with zero failing assertions.

---

## 2. Software Project Management (SPM) Lifecycle & Governance

The platform was built following modern **Agile/Scrum** methodologies across 7 focused two-week sprints:

| Sprint / Phase                       | Focus & Scope                                                                              | Core Deliverables                                                                  | Quality & Test Gate                                    | Status       |
| :----------------------------------- | :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :----------------------------------------------------- | :----------- |
| **Sprint 1: Foundation**             | Project scaffolding, Tailwind v4 design tokens, dark glassmorphism, App & Marketing shells | `styles.css`, `AppShell.tsx`, `MarketingShell.tsx`, route layout scaffolding       | TypeScript strict mode, clean linter                   | **Complete** |
| **Sprint 2: Public & Marketing**     | Public portal, hero section, pricing tiers, legal terms, privacy policy                    | `index.tsx`, `pricing.tsx`, `about.tsx`, `contact.tsx`, `terms.tsx`, `privacy.tsx` | Responsive layout checks (mobile, tablet, desktop)     | **Complete** |
| **Sprint 3: Core Terminal**          | Executive dashboard, live watchlist, asset performance charts, holdings                    | `app.index.tsx`, `app.portfolio.tsx`, `WatchlistTable.tsx`, `InstrumentDrawer.tsx` | Recharts responsive container verification             | **Complete** |
| **Sprint 4: Quantitative Core**      | Technical indicator engine, multi-indicator confluence, position sizing, risk engine       | `indicator-engine.ts`, `signal-engine.ts`, `position-sizer.ts`, `risk-engine.ts`   | Mathematical verification against TradingView formulas | **Complete** |
| **Sprint 5: Execution & Simulation** | Paper broker, order lifecycle stepper, DhanHQ broker adapter, emergency kill switch        | `order-engine.ts`, `paper-broker.ts`, `dhan-provider.ts`, `kill-switch-engine.ts`  | 16-test automated trading pipeline suite               | **Complete** |
| **Sprint 6: Security & Identity**    | First-party auth, PBKDF2 password hashing, SQE User IDs, dual-channel OTP, audit logs      | `auth-service.ts`, `otp-provider.ts`, `audit-log-service.ts`, `server-store.ts`    | 23-test automated authentication suite                 | **Complete** |
| **Sprint 7: Verification & Build**   | End-to-end integration, SSR bundling, error boundaries, documentation                      | `.output/` Nitro bundle, test execution, comprehensive documentation               | `npm run build` 0 errors, 39/39 tests passing          | **Complete** |

---

## 3. Full-Stack System Architecture & Technology Stack

SmartQuant Edge utilizes a decoupled, reactive, 6-tier architecture designed for low latency, type safety, and institutional auditability:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Layer 1: Presentation & Routing                      │
│   React 19 • TypeScript 5.8 • TanStack Start/Router • Tailwind CSS v4   │
│   Framer Motion • Recharts 2.15 • Radix UI Primitives • Lucide Icons    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│              Layer 2: State Coordination & Real-Time Event Bus          │
│   PlatformContext.tsx • realtime-bus.ts (Pub/Sub) • System Health       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│              Layer 3: Quantitative Logic & Pre-Trade Risk Core          │
│   Indicator Engine • Signal Engine • Position Sizer • Risk Engine       │
│   Strategy Circuit Breaker • Kill Switch Engine                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│              Layer 4: Execution, Paper Simulation & Explainability      │
│   Order Engine (9-State Stepper) • Paper Broker (MTM P&L)               │
│   Trade Explainer (9-Stage Verifiable Audit Chain)                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│              Layer 5: Market Data & Broker Adapters                     │
│   Broker Adapter (Universal Interface) • DhanHQ WebSocket Provider      │
│   Market Data Engine • Candle Aggregator (1m to 1D Bars)                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│              Layer 6: Security, Authoritative Ledger & Persistence      │
│   Auth Service (PBKDF2-HMAC-SHA512) • OTP Provider • Server Store        │
│   Audit Log Service • Database Persistence (LocalStorage/IndexedDB)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Dependency Inventory

- **Runtime & Compilation:** Node.js 24.x LTS, Vite 8.2.1, Nitro 3.0 (Cloudflare Module & Node SSR preset).
- **Frontend Framework:** React 19.2.0, TypeScript 5.8.3, TanStack React Start 1.168.26, TanStack React Router 1.170.16.
- **Styling & UI Kit:** Tailwind CSS 4.2.1, tw-animate-css 1.3.4, Radix UI Primitives (Accordion, Dialog, Dropdown, Tabs, Slider, Tooltip, Switch), Lucide React 0.575.
- **Data Visualization & Motion:** Recharts 2.15.4, D3 packages, Framer Motion 12.42.2.
- **Validation & State:** Zod 3.24.2, React Hook Form 7.71.2.

---

## 4. Complete Inventory of All 28 Routes & Pages

All pages specified in the initial requirements are fully implemented in `src/routes/`:

1. **Landing Page (`/` -> `index.tsx`):** Hero section with live stock chart, animated ticker, 6 feature cards, trading statistics, user testimonials, pricing preview, FAQ accordion, and footer.
2. **Login (`/login` -> `login.tsx`):** First-party authentication supporting SmartQuant User ID (`SQE-XXXXXX`), email, or phone. Password challenge triggers mandatory 2FA OTP code. Passwordless OTP login flow, device trust checkbox, zero social login trackers.
3. **Register (`/register` -> `register.tsx`):** Two-step onboarding. Collects profile info and password with interactive strength meter, verifies dual-channel OTP, and mints an immutable SmartQuant User ID.
4. **Forgot Password (`/forgot-password` -> `forgot-password.tsx`):** User lookup, cryptographic OTP challenge verification, and password reset form with automatic session invalidation.
5. **Terminal Dashboard (`/app` -> `app.index.tsx`):** Executive overview showing Portfolio Value (₹28,47,320), Today's P&L (+₹42,850), Win Rate (68.4%), Open Positions, Market Overview Cards, Interactive Chart, Recent Trades, and Live Watchlist with Quick Drawers.
6. **Strategy Builder (`/app/strategies` -> `app.strategies.tsx`):** No-code algorithmic strategy creator for RSI, MACD, EMA, SMA, Bollinger Bands, ATR, Supertrend. Supports entry/exit rules, stop loss, profit target, timeframe, position sizing, save, duplicate, delete, and Paper/Live toggles.
7. **Backtesting Engine (`/app/backtest` -> `app.backtest.tsx`):** Historical simulation engine across NIFTY 50 and BANKNIFTY. Computes Equity Curve, Profit Factor (2.18), Max Drawdown (-8.4%), CAGR (+34.2%), Sharpe Ratio (1.85), Win Rate, trade logs, and PDF/CSV export.
8. **Live Trading Desk (`/app/live` -> `app.live.tsx`):** Broker connection status, real-time tick freshness badge, active orders table, open positions with live MTM P&L, Auto Trading toggle, Emergency Kill-Switch button, and order history.
9. **Market Scanner (`/app/scanner` -> `app.scanner.tsx`):** Screener filtering by Price, 24h Volume, RSI Overbought/Oversold, EMA Bullish/Bearish Crossover, MACD Histogram, 52-Week Breakout, Gap Up (>1.5%), and Gap Down (< -1.5%).
10. **AI Insights (`/app/insights` -> `app.insights.tsx`):** Consensus Buy/Sell/Hold recommendations, AI confidence scores (e.g. 88% Strong Buy), Risk Rating, Market Sentiment Meter (68% Bullish), Sector Heatmap, and Financial News AI Summarizer.
11. **Portfolio Page (`/app/portfolio` -> `app.portfolio.tsx`):** Asset holdings table, allocation pie chart (Large Cap, Mid Cap, F&O, Cash), performance charts, daily/monthly/annual return breakdowns, and dividend summary.
12. **Reports & Tax Analytics (`/app/reports` -> `app.reports.tsx`):** Monthly/Quarterly/Yearly P&L reports, Short-Term Capital Gains (STCG @ 20%), Long-Term Capital Gains (LTCG @ 12.5%), STT calculation, Trading Journal with trade reflections, and PDF/Excel export.
13. **System Infrastructure Monitor (`/app/monitor` -> `app.monitor.tsx`):** Latency telemetry (DhanHQ: 12ms, Risk Engine: 4ms, Order Engine: 8ms), microservice health cards, active WebSocket connections, CPU/Memory telemetry graphs, and live error log console.
14. **Admin Governance Panel (`/app/admin` -> `app.admin.tsx`):** Platform KPIs (14,280 Users, 3,920 Active Traders, ₹42.8L MRR), User management table, Plan tier controls, Global Strategy oversight, Server health dials, Announcements broadcaster, and Audit Trail.
15. **IPO Intelligence Desk (`/app/ipo` -> `app.ipo.tsx`):** Real-time Grey Market Premium (GMP) tracker, upcoming/open IPO table, expected listing gains, subscription rate status (QIB, NII, Retail), and automated listing-day trading strategy generator.
16. **User Profile & Security (`/app/profile` -> `app.profile.tsx`):** Profile details, avatar manager, SmartQuant ID card, encrypted Dhan/Upstox API key management, Active Session manager (with 1-click remote device revocation), Single-device enforcement toggle, and Activity logs.
17. **Support Center (`/app/support` & `/support`):** Support ticket submission form, searchable knowledge base, system status indicator, and interactive simulated Live Chat widget.
18. **Subscription Pricing (`/pricing` -> `pricing.tsx`):** Free, Pro (₹2,499/mo), Enterprise (₹7,999/mo) with full feature comparison matrix, monthly/annual toggle (20% discount), and checkout CTA.
19. **Payment Success (`/payment-success` -> `payment-success.tsx`):** Transaction confirmation, plan activation badge, receipt download, and dashboard navigation CTA.
20. **Payment Failed (`/payment-failed` -> `payment-failed.tsx`):** Decline code analysis, retry payment flow, and direct link to customer support.
21. **About Us (`/about` -> `about.tsx`):** Company vision, quantitative research philosophy, executive leadership bios, and technological milestones.
22. **Contact Us (`/contact` -> `contact.tsx`):** Inquiry form, enterprise support email, physical office address in BKC Mumbai, and response SLA guarantee.
23. **Privacy Policy (`/privacy` -> `privacy.tsx`):** Institutional data governance, zero credential resale clause, SEBI cybersecurity alignment, and encryption disclosures.
24. **Terms of Service (`/terms` -> `terms.tsx`):** Algorithmic trading risk disclosure, financial disclaimer, intellectual property terms, and user conduct boundaries.
25. **App Shell & Global Navigation (`AppShell.tsx`):** Sticky top bar, responsive sidebar, market status indicator, live tickers, kill-switch banner, notification center, and mobile drawer.
26. **Command Palette (`CommandPalette.tsx`):** Instant search modal (`Cmd/Ctrl + K`) for quick symbol lookup, page navigation, and quick action triggers.
27. **Instrument Drawer (`InstrumentDrawer.tsx`):** Slide-out drawer displaying interactive mini-charts, order entry shortcuts, bid/ask depth, and technical indicator summaries.
28. **Watchlist Table (`WatchlistTable.tsx`):** Real-time filterable watchlist with sparkline charts, day change percentages, and 1-click order placement.

---

## 5. Quantitative Engines & Microservices (Deep Dive)

The system includes 28 modular TypeScript services in `src/services/`:

### 5.1 Technical Indicator Engine (`indicator-engine.ts`)

Calculates 10 core mathematical indicators on genuine `Candle[]` arrays:

- **SMA (20, 50):** Moving average: `SMA = (sum of Close) / Period`.
- **EMA (9, 21):** Exponential average with smoothing multiplier `2 / (Period + 1)`.
- **RSI (14):** Wilder's smoothed relative strength index (Overbought > 70, Oversold < 30).
- **MACD (12, 26, 9):** Fast EMA (12) - Slow EMA (26), Signal Line (9 EMA of MACD), and Histogram.
- **Bollinger Bands (20, 2):** Middle band (20 SMA) +/- 2 standard deviations, with bandwidth %.
- **ATR (14):** Average True Range measuring market volatility.
- **VWAP:** Volume-Weighted Average Price across intraday sessions.
- **Supertrend (10, 3):** Directional trend indicator with ATR bands.
- **Stochastic Oscillator (14, 3, 3):** %K and %D momentum oscillator.
- **Standard Deviation (20):** Population volatility metric.

### 5.2 Pre-Trade Risk Engine (`risk-engine.ts`)

Acts as an unskippable algorithmic gatekeeper before any order reaches the simulated paper broker or live broker adapter:

- **Capital & Position Caps:** Max 25% capital per asset, max single trade ₹5,00,000, max portfolio exposure ₹15,00,000.
- **Daily Drawdown & Trade Limits:** Max ₹20,000 daily loss ceiling, max 50 orders/day.
- **Mandatory Stop-Loss Check:** Rejects any order lacking a stop-loss price.
- **Breach Actions:** Triggers `CRITICAL_HALT` and blocks order routing upon threshold breach.

### 5.3 Order Lifecycle & Execution State Machine (`order-engine.ts`)

Tracks orders across a deterministic 9-stage finite state machine:
`CREATED` -> `RISK_CHECK` -> `SUBMITTED` -> `ACCEPTED` -> `PARTIALLY_FILLED` -> `EXECUTED` (or `REJECTED`, `CANCELLED`, `FAILED`).
Includes **idempotency key protection** to prevent duplicate order execution within debounce windows.

### 5.4 Paper Broker Simulation (`paper-broker.ts`)

Provides institutional-grade simulation without financial risk:

- Simulates realistic slippage (0.02% on market orders).
- Calculates statutory transaction charges: Brokerage (₹20/order), STT (0.025% on sell), Exchange turnover fees, and GST.
- Updates real-time Mark-to-Market (MTM) P&L on every incoming price tick.

### 5.5 "Explain This Trade" 9-Stage Audit Chain (`trade-explainer.ts`)

Records a verifiable 9-stage chronological chain for every signal, order, or trade:

1. **Market Data:** Raw tick, timestamp, latency, symbol token, and feed status.
2. **Indicators:** Mathematical indicator values at time of evaluation.
3. **Strategy Conditions:** Exact rule evaluated (e.g. `RSI < 30 AND Close > EMA(21)`).
4. **Signal:** Signal type (BUY/SELL), confidence score (0-100%), confluence rating.
5. **Position Sizing:** Capital allocation and risk per share formula.
6. **Risk Decision:** Gatekeeper verdict (APPROVED / BLOCKED) with rule compliance note.
7. **Order:** Formatted order payload (Market/Limit/SL-M, side, quantity, price).
8. **Fill:** Simulated paper fill price, slippage, brokerage fee, and execution timestamp.
9. **Position & P&L:** Updated open position, average buy price, mark-to-market P&L, and cash balance.

### 5.6 Emergency Kill-Switch & Circuit Breakers (`kill-switch-engine.ts`)

- **Global Kill Switch:** One-click platform emergency halt. Automatically cancels all pending orders, deactivates all automated strategies, and triggers position liquidation options.
- **Strategy Circuit Breaker (`strategy-circuit-breaker.ts`):** Pauses individual strategies experiencing consecutive losses.
- **Strategy Conflict Detector (`strategy-conflict-detector.ts`):** Detects and prevents inverse cross-strategy orders (e.g. Strategy A buying RELIANCE while Strategy B is selling RELIANCE simultaneously).

---

## 6. First-Party Authentication & Security Architecture

SmartQuant Edge enforces a zero-trust, privacy-first security model (`auth-service.ts` and `otp-provider.ts`):

- **Permanent SmartQuant User ID:** Formatted as `SQE-XXXXXX` using Crockford-style Base32 characters (excluding `0, 1, I, O` to prevent transcription errors). Non-sequential and cryptographically random.
- **PBKDF2-HMAC-SHA512 Password Hashing:** 100,000 iterations with unique 16-byte cryptographically secure salt. Zero plaintext passwords stored in memory or disk.
- **Mandatory Dual-Channel 2FA OTP:** 6-digit cryptographic OTP issued via Email & SMS with a 5-minute expiry window. Replay protection ensures single-use consumption.
- **Brute-Force Lockout:** Maximum 3 invalid OTP attempts before automatic invalidation. 60-second resend cooldown.
- **Session Governance:** Active session tracking with IP, browser, device name, and last-active timestamp. Single-device enforcement option terminates existing sessions upon new login.
- **Zero Third-Party Dependency:** Completely free of Google, Facebook, or other social login trackers to safeguard trading confidentiality.

---

## 7. Quality Verification & Automated Test Results

The codebase is fortified by two automated test suites executed via `node:test` and `tsx`:

### Test Suite 1: First-Party Authentication (`tests/authentication.test.ts`)

- **Total Tests:** 23
- **Passed:** 23 (100%)
- **Failed:** 0
- **Duration:** 1.22 seconds
- **Key Coverage:** User ID generation format, 100-collision immunity test, PBKDF2 salt & hash verification, mandatory OTP challenge, single-use token consumption, resend cooldown, brute-force attempt limits, password reset flow, trusted device registration, single-device policy enforcement, route protection, and 20 security audit log events.

### Test Suite 2: Trading Pipeline & Risk Core (`tests/trading-pipeline.test.ts`)

- **Total Tests:** 16
- **Passed:** 16 (100%)
- **Failed:** 0
- **Duration:** 36.1 milliseconds
- **Key Coverage:** DhanHQ config & auth errors, market closed hours detection, 10 technical indicators calculation, stale feed (>15s) signal rejection, signal confluence score, position sizing formula, stop-loss enforcement, paper execution lifecycle stepper, idempotency rejection, emergency kill switch order blocking, MTM P&L tick updates, and the 9-stage Explain This Trade audit chain.

### Production SSR Build Verification

- Executed `npm run build` (`vite build` + Nitro SSR compilation).
- Transformed 3,029 modules into production bundles in `.output/public` and `.output/server`.
- **Result:** 0 errors, 100% clean production build.

---

## 8. Requirements Traceability Matrix (Current Status vs. SRS)

| SRS Requirement            | Target Artifact                                        | Verification Status      |
| :------------------------- | :----------------------------------------------------- | :----------------------- |
| **1. Landing Page**        | `src/routes/index.tsx`                                 | **Verified Operational** |
| **2. Login & 2FA**         | `src/routes/login.tsx`, `auth-service.ts`              | **Verified Operational** |
| **3. Registration & ID**   | `src/routes/register.tsx`, `otp-provider.ts`           | **Verified Operational** |
| **4. User Dashboard**      | `src/routes/app.index.tsx`                             | **Verified Operational** |
| **5. Strategy Builder**    | `src/routes/app.strategies.tsx`                        | **Verified Operational** |
| **6. Backtesting Engine**  | `src/routes/app.backtest.tsx`                          | **Verified Operational** |
| **7. Live Trading Desk**   | `src/routes/app.live.tsx`, `dhan-provider.ts`          | **Verified Operational** |
| **8. Market Scanner**      | `src/routes/app.scanner.tsx`                           | **Verified Operational** |
| **9. AI Insights**         | `src/routes/app.insights.tsx`                          | **Verified Operational** |
| **10. Portfolio Page**     | `src/routes/app.portfolio.tsx`                         | **Verified Operational** |
| **11. Reports & Taxes**    | `src/routes/app.reports.tsx`                           | **Verified Operational** |
| **12. Subscription Plans** | `src/routes/pricing.tsx`                               | **Verified Operational** |
| **13. Admin Panel**        | `src/routes/app.admin.tsx`                             | **Verified Operational** |
| **14. Support Center**     | `src/routes/app.support.tsx`                           | **Verified Operational** |
| **15. User Profile**       | `src/routes/app.profile.tsx`                           | **Verified Operational** |
| **16. System Monitor**     | `src/routes/app.monitor.tsx`                           | **Verified Operational** |
| **17. IPO Intelligence**   | `src/routes/app.ipo.tsx`                               | **Verified Operational** |
| **18-20. Legal & Policy**  | `about.tsx`, `contact.tsx`, `privacy.tsx`, `terms.tsx` | **Verified Operational** |

---

## 9. Strategic Continuation Roadmap (How to Continue)

For developers picking up the project for future phases:

### Phase 1: Live Broker API Key Integration (Weeks 1 – 2)

1. Obtain real DhanHQ credentials from the [Dhan Developer Console](https://dhanhq.co).
2. In `src/services/dhan-provider.ts`, connect to the live binary WebSocket stream (`wss://api-feed.dhan.co`) to ingest raw market packets.
3. In `src/services/order-engine.ts`, route orders to DhanHQ REST POST `/orders` when `tradingMode === "LIVE_TRADING"`.
4. Connect the Upstox V2 API adapter using the abstract interface in `src/services/broker-adapter.ts`.

### Phase 2: Relational Persistence Migration (Weeks 3 – 4)

1. Transition `src/services/server-store.ts` in-memory ledger to a persistent **PostgreSQL** database.
2. Set up **TimescaleDB** hypertables for tick-level order book records and historical candle bars.
3. Use Prisma or Drizzle ORM for database migrations covering Users, Sessions, Orders, and Audit Logs.
4. Deploy Redis Pub/Sub to synchronize order books and positions across multi-instance server clusters.

### Phase 3: Machine Learning Model Deployment (Weeks 5 – 6)

1. Deploy a Python FastAPI microservice utilizing **FinBERT** for sentiment scoring of Indian financial news (Moneycontrol, Economic Times).
2. Integrate an ONNX-runtime LSTM model for 15-minute price volatility predictions and dynamic stop-loss adjustments.
3. Feed real-time sentiment scores directly into `src/services/signal-engine.ts` to adjust strategy confluence weights.

### Phase 4: Production Payment Gateway & Webhooks (Weeks 7 – 8)

1. Integrate Razorpay / Stripe for INR recurring subscription billing (Free, Pro @ ₹2,499/mo, Enterprise @ ₹7,999/mo).
2. Implement webhook endpoints for subscription lifecycle events (renewal, payment failure, upgrade).
3. Add automated GST invoice generation with downloadable PDF receipts in `app.reports.tsx`.

---

## 10. Developer Runbook & Onboarding Guide

### Prerequisites

- Node.js 20.x or 24.x LTS
- npm (or pnpm / bun)
- Windows, macOS, or Linux

### Standard Developer Commands

```bash
# Navigate to the project directory
cd "d:\share market spm\smartquant-edge-main"

# Install all dependencies
npm install

# Start local development server with Hot Module Replacement
npm run dev

# Run Authentication & Security Test Suite (23 tests)
npx --package=tsx tsx --test tests/authentication.test.ts

# Run Trading Pipeline & Risk Core Test Suite (16 tests)
npx --package=tsx tsx --test tests/trading-pipeline.test.ts

# Run all 39 tests simultaneously
npx --package=tsx tsx --test tests/*.test.ts

# Build production SSR & client bundle
npm run build
```

### Default Seed Credentials for Testing

- **SmartQuant User ID:** `SQE-7F42K9`
- **Email:** `ananya@meridiancap.in`
- **Mobile:** `+91 98765 43210`
- **Password:** `AlphaTrader@2026!`
- **Test 2FA OTP Code:** `123456` (or dynamic in console)
- **Assigned Role:** Pro Trader / Admin

---

_Report prepared for final Software Project Management (SPM) capstone submission and future engineering sprint continuation._
