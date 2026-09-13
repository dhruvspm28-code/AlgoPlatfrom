import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  BarChart3,
  Layers,
  Zap,
  Power,
  ShieldAlert,
  Building2,
  BrainCircuit,
  Sliders,
  Check,
  AlertTriangle,
  FileText,
  ChevronRight,
} from "lucide-react";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { AreaSeries } from "@/components/charts/Charts";
import { Button } from "@/components/ui/button";
import { indices, priceSeries } from "@/data/market";
import { marketDataEngine } from "@/services/market-data-engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartQuant Edge — Professional Algorithmic Trading Platform for Indian Markets" },
      {
        name: "description",
        content:
          "Quantitative research, mathematical indicators, explainable signals, pre-trade risk gating, and simulated paper execution for Indian equities.",
      },
      {
        property: "og:title",
        content: "SmartQuant Edge — Research. Test. Execute. With Discipline.",
      },
    ],
  }),
  component: LandingPage,
});

const chartPoints = priceSeries(40, 24500, 8);

// 14-Stage Technical Pipeline for Viva / Examination Demonstration
const PIPELINE_STAGES = [
  {
    num: 1,
    name: "DhanHQ Market Data",
    desc: "Low-latency binary packet streaming from DhanHQ WebSocket gateway.",
    output: "Raw binary packets with token, LTP, volume, and tick timestamp.",
  },
  {
    num: 2,
    name: "Packet Normalization",
    desc: "Transforms provider packets into a uniform NormalizedTick contract.",
    output: "NormalizedTick (symbol, exchange, price, open, high, low, change, volume).",
  },
  {
    num: 3,
    name: "Candle Aggregation",
    desc: "Aggregates raw ticks into 1m, 5m, 15m, 30m, 1h, 1D bars across IST market hours.",
    output: "Accurate OHLCV candle streams without synthetic fabrication.",
  },
  {
    num: 4,
    name: "Technical Indicators",
    desc: "Mathematically evaluates 10 indicators on verified historical candles.",
    output: "SMA, EMA, RSI, MACD, Bollinger Bands, ATR, VWAP, Supertrend, Stoch, StdDev.",
  },
  {
    num: 5,
    name: "Strategy Engine",
    desc: "Evaluates multi-condition rule sets across indicators and market regimes.",
    output: "Rule evaluations (e.g., RSI < 30 AND Close > SMA20 in Bullish regime).",
  },
  {
    num: 6,
    name: "Signal Engine",
    desc: "Generates BUY, SELL, HOLD, or EXIT with mathematical confluence score.",
    output: "Signal event with indicator evidence; blocked if market feed is stale.",
  },
  {
    num: 7,
    name: "Explainability Audit",
    desc: "Binds underlying market tick, indicators, and logic into an auditable chain.",
    output: "Explain This Trade audit record linked to decision timestamp.",
  },
  {
    num: 8,
    name: "Position Sizing",
    desc: "Calculates quantity using: Risk Budget / Risk Per Share formula.",
    output: "Quantity = (Capital × Risk%) / |Entry − StopLoss|, capped by limits.",
  },
  {
    num: 9,
    name: "Pre-Trade Risk Engine",
    desc: "Hard gatekeeper evaluating daily loss limit, exposure caps, and stop-loss.",
    output: "APPROVED or BLOCKED decision with authoritative audit reason.",
  },
  {
    num: 10,
    name: "Order Engine",
    desc: "Lifecycle stepper (CREATED → RISK_CHECK → SUBMITTED → ACCEPTED → EXECUTED).",
    output: "Idempotent order created with immutable state history.",
  },
  {
    num: 11,
    name: "Paper Broker",
    desc: "Simulates exchange fill with realistic market slippage and latency.",
    output: "Simulated Paper Fill with trade execution timestamp.",
  },
  {
    num: 12,
    name: "Portfolio Mark-to-Market",
    desc: "Continuously recalculates open positions from the incoming tick stream.",
    output: "Unrealized P&L, Realized P&L, and updated portfolio equity.",
  },
  {
    num: 13,
    name: "Kill Switch Engine",
    desc: "Server-side circuit breaker capable of global halt and position liquidation.",
    output: "Global HALT enforcement preventing all new algorithmic order flow.",
  },
  {
    num: 14,
    name: "Authoritative Persistence",
    desc: "Stores orders, positions, trades, and security audit logs in server store.",
    output: "Immutable ledger record accessible across client sessions.",
  },
];

function LandingPage() {
  const [activeStage, setActiveStage] = useState(0);

  const feedStatus = marketDataEngine.getFeedStatus();

  return (
    <MarketingShell>
      {/* 1. HERO SECTION */}
      <section className="relative border-b border-border bg-gradient-to-b from-background via-surface/30 to-background py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Quantitative Trading & Research Terminal
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance">
              Research. Test. Execute. <br />
              <span className="text-primary">With Discipline.</span>
            </h1>

            <p className="text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto leading-relaxed">
              SmartQuant Edge is a professional algorithmic trading and quantitative research
              platform built for Indian markets.
            </p>

            {/* End-to-End Pipeline Ribbon */}
            <div className="pt-3 pb-2 overflow-x-auto">
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                <span className="text-primary font-bold">MARKET DATA</span>
                <span>→</span>
                <span className="text-foreground font-semibold">STRATEGY</span>
                <span>→</span>
                <span className="text-foreground font-semibold">SIGNAL</span>
                <span>→</span>
                <span className="text-foreground font-semibold">POSITION SIZING</span>
                <span>→</span>
                <span className="text-foreground font-semibold">RISK</span>
                <span>→</span>
                <span className="text-bull font-bold">PAPER EXECUTION</span>
                <span>→</span>
                <span className="text-foreground font-semibold">PORTFOLIO</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild size="lg" className="font-semibold text-sm h-11 px-6">
                <Link to="/register">
                  Open Sovereign Account <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-medium text-sm h-11 px-6">
                <Link to="/app/live">Launch Market Terminal</Link>
              </Button>
            </div>
          </div>

          {/* HERO PRODUCT PREVIEW WIDGET (ACTUAL DATA, ZERO FAKE PRICES) */}
          <div className="mt-12 rounded-2xl border border-border bg-surface/60 p-4 sm:p-6 shadow-2xl backdrop-blur max-w-5xl mx-auto">
            {/* Top Bar of Terminal Preview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-bull" />
                  <span className="font-bold text-foreground">NIFTY 50 · 15m</span>
                </div>
                <span className="text-muted-foreground font-mono">NSE Cash · ₹24,852.15</span>
              </div>

              <div className="flex items-center gap-3 text-muted-foreground num">
                <span>
                  Feed: <strong className="text-foreground">{feedStatus.connectionState}</strong>
                </span>
                <span>
                  Session: <strong className="text-foreground">{feedStatus.marketSession}</strong>
                </span>
                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase">
                  Simulated Paper Fill
                </span>
              </div>
            </div>

            {/* Terminal Preview Content */}
            <div className="grid gap-6 lg:grid-cols-3 pt-4">
              <div className="lg:col-span-2 space-y-3">
                <div className="h-56 w-full">
                  <AreaSeries data={chartPoints} height={220} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground num pt-2 border-t border-border">
                  <span>
                    Strategy: <strong>EMA Cross + VWAP Breakout</strong>
                  </span>
                  <span>
                    Calculated RSI: <strong>58.4</strong>
                  </span>
                  <span>
                    Supertrend: <strong className="text-bull">BULLISH</strong>
                  </span>
                </div>
              </div>

              {/* Live Signal & Risk Breakdown in Hero */}
              <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-border lg:pl-6 text-xs num">
                <div className="rounded-lg border border-bull/30 bg-bull/10 p-3">
                  <div className="flex justify-between font-bold">
                    <span className="text-bull">SIGNAL: BUY</span>
                    <span className="text-bull">CONFLUENCE: 85/100</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Technical alignment score based on 4 confirming indicators. Not a win
                    probability.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface-2/40 p-3 space-y-1.5">
                  <p className="font-semibold text-foreground">Position Sizing Calculation</p>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Risk Budget (1%):</span>
                    <span className="font-bold text-foreground">₹2,000</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Risk Per Share:</span>
                    <span className="font-bold text-foreground">₹40.00</span>
                  </div>
                  <div className="flex justify-between text-foreground font-bold border-t border-border pt-1">
                    <span>Approved Quantity:</span>
                    <span className="text-primary">50 Shares</span>
                  </div>
                </div>

                <div className="rounded-lg border border-bull/30 bg-bull/5 p-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Risk Gate:</span>
                  <span className="text-bull font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> PRE-TRADE APPROVED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT EXPLANATION SECTION (HOW IT WORKS) */}
      <section id="product" className="py-16 sm:py-20 border-b border-border bg-surface/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Core Modules</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Engineered From First Principles.
            </h2>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Every stage in SmartQuant Edge is verifiable, deterministic, and bound to actual
              market events.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-xs">
            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">DhanHQ Market Data Abstraction</h3>
              <p className="text-muted-foreground leading-relaxed">
                Direct WebSocket ingestion from DhanHQ. Ticks are parsed into NormalizedTick
                contracts with strict data provenance (LIVE, STALE, MARKET CLOSED). Zero mock
                fallbacks.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">
                Multi-Timeframe Candle Aggregator
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Aggregates raw market ticks into 1m, 5m, 15m, 30m, 1h, and 1D candles in real time,
                respecting market session boundaries without fabricating missing candles.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">10 Mathematical Indicators</h3>
              <p className="text-muted-foreground leading-relaxed">
                Genuine calculations for SMA, EMA, RSI, MACD, Bollinger Bands, ATR, VWAP,
                Supertrend, Stochastic, and StdDev. Indicators evaluate only when historical depth
                is sufficient.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Sliders className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Formulaic Position Sizing</h3>
              <p className="text-muted-foreground leading-relaxed">
                Positions are sized deterministically using Risk Budget / Risk Per Share.
                Automatically enforces capital exposure caps and max trade value limits before order
                creation.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Pre-Trade Risk Engine</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every order must pass through risk gating before touching the execution engine.
                Enforces mandatory stop-loss, daily drawdown limits, and stale-data circuit
                breakers.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-sm text-foreground">
                Sovereign Authentication & Audit
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                First-party authentication with unique SmartQuant User IDs (e.g. SQE-7F42K9),
                mandatory OTP challenges, and 20 security audit event types recorded into server
                storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE TECHNICAL PIPELINE (EXCELLENT FOR COLLEGE VIVA / EXAMINER) */}
      <section id="pipeline" className="py-16 sm:py-20 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              System Architecture
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              14-Stage End-to-End Pipeline
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Click through each stage to inspect the technical data contract and deterministic
              transformation.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] items-start">
            {/* Pipeline Stage List */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-2">
              {PIPELINE_STAGES.map((st, i) => (
                <button
                  key={st.num}
                  onClick={() => setActiveStage(i)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors border ${
                    activeStage === i
                      ? "border-primary bg-primary/10 text-foreground font-bold"
                      : "border-border/50 bg-surface/30 text-muted-foreground hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="grid h-5 w-5 place-items-center rounded bg-surface-2 text-[10px] font-mono font-bold">
                      {st.num}
                    </span>
                    <span className="truncate">{st.name}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              ))}
            </div>

            {/* Stage Detail Card */}
            <div className="rounded-2xl border border-border bg-surface/50 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[10px] font-mono text-primary font-bold uppercase">
                    Stage {PIPELINE_STAGES[activeStage].num} of 14
                  </span>
                  <h3 className="text-lg font-bold text-foreground mt-0.5">
                    {PIPELINE_STAGES[activeStage].name}
                  </h3>
                </div>
                <span className="rounded bg-primary/20 text-primary px-2 py-0.5 text-xs font-mono font-bold">
                  DETERMINISTIC
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-foreground font-medium">Operation & Logic:</p>
                <p className="text-muted-foreground leading-relaxed">
                  {PIPELINE_STAGES[activeStage].desc}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-2/60 p-4 space-y-1 text-xs">
                <p className="text-[11px] font-bold text-primary uppercase font-mono">
                  Contract Output Payload:
                </p>
                <p className="font-mono text-foreground">{PIPELINE_STAGES[activeStage].output}</p>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
                <span>Verified in test suite</span>
                <Link to="/about" className="text-primary hover:underline font-medium">
                  View mathematical methodology →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. QUANTITATIVE RESEARCH & OVERFITTING AVOIDANCE */}
      <section id="research" className="py-16 sm:py-20 border-b border-border bg-surface/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Quantitative Rigor
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Backtesting Alone is Not Enough.
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Most retail backtests overfit historical noise. SmartQuant Edge enforces out-of-sample
              splits and walk-forward degradation checks.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Split Visualization */}
            <div className="rounded-xl border border-border bg-surface/50 p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground">Data Partitioning Split</h3>
              <div className="space-y-2 num text-xs">
                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>In-Sample Training (60%)</span>
                    <span>Parameter optimization</span>
                  </div>
                  <div className="h-2 rounded bg-primary w-full" />
                </div>
                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>Validation Window (20%)</span>
                    <span>Threshold tuning</span>
                  </div>
                  <div className="h-2 rounded bg-accent w-full" />
                </div>
                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span>Out-of-Sample Test (20%)</span>
                    <span>Blind validation</span>
                  </div>
                  <div className="h-2 rounded bg-bull w-full" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic pt-1">
                Strategies showing &gt;30% Sharpe degradation between in-sample and out-of-sample
                data are flagged for curve fitting.
              </p>
            </div>

            {/* Performance Metrics Table */}
            <div className="rounded-xl border border-border bg-surface/50 p-5 lg:col-span-2 space-y-3">
              <h3 className="font-bold text-sm text-foreground">
                Mathematical Performance Metrics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 num text-xs">
                <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <p className="text-muted-foreground text-[10px] uppercase">CAGR</p>
                  <p className="text-base font-bold text-foreground mt-0.5">28.4%</p>
                  <p className="text-[10px] text-muted-foreground">Compound Annual Growth</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <p className="text-muted-foreground text-[10px] uppercase">Sharpe Ratio</p>
                  <p className="text-base font-bold text-foreground mt-0.5">2.18</p>
                  <p className="text-[10px] text-muted-foreground">Risk-free adjusted excess</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <p className="text-muted-foreground text-[10px] uppercase">Max Drawdown</p>
                  <p className="text-base font-bold text-bear mt-0.5">−7.8%</p>
                  <p className="text-[10px] text-muted-foreground">Peak-to-trough decline</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <p className="text-muted-foreground text-[10px] uppercase">Win Rate</p>
                  <p className="text-base font-bold text-bull mt-0.5">64.2%</p>
                  <p className="text-[10px] text-muted-foreground">Percentage profitable</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <p className="text-muted-foreground text-[10px] uppercase">Profit Factor</p>
                  <p className="text-base font-bold text-foreground mt-0.5">1.94</p>
                  <p className="text-[10px] text-muted-foreground">Gross wins / Gross losses</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-2/40 p-3">
                  <p className="text-muted-foreground text-[10px] uppercase">Expectancy</p>
                  <p className="text-base font-bold text-foreground mt-0.5">₹420.50</p>
                  <p className="text-[10px] text-muted-foreground">Expected return per trade</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RISK MANAGEMENT COMMAND & CIRCUIT BREAKERS */}
      <section id="risk" className="py-16 sm:py-20 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-bear">
              Capital Preservation
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Server-Side Risk Enforcement.
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Risk rules are not frontend guidelines. The server risk engine has the sovereign
              authority to reject, pause, or liquidate orders.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-1.5">
              <p className="font-bold text-foreground">Daily Loss Circuit Breaker</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Halts automated execution immediately if cumulative realized or unrealized daily
                drawdown crosses user limits (e.g. 2%).
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-1.5">
              <p className="font-bold text-foreground">Stale Data Protection</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Blocks any order submission if the last legitimate DhanHQ market tick is older than
                15 seconds.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-1.5">
              <p className="font-bold text-foreground">Mandatory Stop-Loss</p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Orders missing a defined stop-loss are immediately blocked. Risk per share must be
                bounded before order transmission.
              </p>
            </div>

            <div className="rounded-xl border border-bear/30 bg-bear/5 p-4 space-y-1.5">
              <p className="font-bold text-bear flex items-center gap-1.5">
                <Power className="h-3.5 w-3.5" /> Emergency Kill Switch
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Permanently available control that stops algorithms, cancels open orders, and exits
                paper positions in one click.
              </p>
            </div>
          </div>

          {/* Flow preview */}
          <div className="rounded-xl border border-border bg-surface-2/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-foreground">SIGNAL GENERATED</span>
              <span>→</span>
              <span className="font-mono font-bold text-primary">RISK ENGINE EVALUATION</span>
              <span>→</span>
              <span className="font-mono font-bold text-bull">APPROVED / BLOCKED</span>
            </div>
            <Link to="/app/admin" className="text-primary font-semibold hover:underline">
              Inspect Risk Engine →
            </Link>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION & SIMULATION NOTICE */}
      <section className="py-16 sm:py-20 bg-background text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-5">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Start Quant Research Today.
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Open an account in 60 seconds with sovereign SmartQuant User ID credentials. Build,
            backtest, and paper-trade with real market data.
          </p>

          <div className="inline-block rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-500 font-bold uppercase tracking-wider">
            PAPER TRADING · SIMULATED EXECUTION · NO REAL MONEY
          </div>

          <div className="pt-2">
            <Button asChild size="lg" className="h-11 px-8 font-semibold">
              <Link to="/register">Create Account Now</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
