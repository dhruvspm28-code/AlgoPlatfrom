import { createFileRoute } from "@tanstack/react-router";
import {
  Layers,
  BookOpen,
  ShieldCheck,
  Activity,
  Sliders,
  CheckCircle2,
  Lock,
  Zap,
} from "lucide-react";

import { MarketingShell } from "@/components/layout/MarketingShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Architecture & Methodology — SmartQuant Edge" },
      {
        name: "description",
        content:
          "End-to-end system architecture, mathematical formulas, and validation methodology for SmartQuant Edge.",
      },
      { property: "og:title", content: "Architecture & Methodology — SmartQuant Edge" },
    ],
  }),
  component: AboutAndMethodology,
});

const TRADING_PIPELINE_CHAIN = [
  "MARKET DATA",
  "NORMALIZATION",
  "CANDLES",
  "INDICATORS",
  "STRATEGY",
  "SIGNAL",
  "EXPLAINABILITY",
  "POSITION SIZING",
  "RISK",
  "ORDER",
  "PAPER BROKER",
  "PORTFOLIO/P&L",
  "AUDIT",
];

const ARCHITECTURE_CHAIN = [
  "USER",
  "FRONTEND",
  "SERVER",
  "AUTHENTICATION",
  "MARKET DATA",
  "INDICATORS",
  "STRATEGY",
  "SIGNALS",
  "SIZING",
  "RISK",
  "ORDER ENGINE",
  "PAPER BROKER",
  "PORTFOLIO",
  "DATABASE",
  "AUDIT",
];

const FORMULAS = [
  {
    name: "Relative Strength Index (RSI)",
    formula: "RSI = 100 − [100 / (1 + RS)], where RS = Average Gain / Average Loss",
    notes:
      "Calculated across 14 periods using Wilder's smoothing method. Overbought threshold: 70, Oversold: 30.",
  },
  {
    name: "Exponential Moving Average (EMA)",
    formula: "EMA_t = (Price_t × α) + (EMA_(t-1) × (1 − α)), where α = 2 / (N + 1)",
    notes:
      "Applies higher weight to recent candle closes. Evaluated for 9-period and 21-period crossover detection.",
  },
  {
    name: "Simple Moving Average (SMA)",
    formula: "SMA_t = (1 / N) × Σ_(i=0)^(N-1) Price_(t-i)",
    notes: "Arithmetic mean across N bars. Used for baseline trend filtering (SMA 20 & SMA 50).",
  },
  {
    name: "MACD (Moving Average Convergence Divergence)",
    formula:
      "MACD Line = EMA_12 − EMA_26; Signal Line = EMA_9(MACD Line); Histogram = MACD − Signal",
    notes: "Captures momentum shifts and acceleration changes across short and medium cycles.",
  },
  {
    name: "Bollinger Bands",
    formula: "Middle = SMA_20; Upper = SMA_20 + (2 × σ); Lower = SMA_20 − (2 × σ)",
    notes:
      "σ represents 20-period standard deviation. Bandwidth expansion indicates volatility expansion.",
  },
  {
    name: "Average True Range (ATR)",
    formula:
      "TR = max[(High − Low), |High − Close_prev|, |Low − Close_prev|]; ATR = WilderEMA_14(TR)",
    notes:
      "Measures pure market volatility independent of trend direction. Used for dynamic stop loss offsets.",
  },
  {
    name: "Volume Weighted Average Price (VWAP)",
    formula:
      "VWAP = Σ(Typical Price × Volume) / Σ(Volume), where Typical Price = (High + Low + Close) / 3",
    notes:
      "Cumulative intraday benchmark reset at market open (09:15 IST). Serves as institutional value line.",
  },
  {
    name: "Supertrend Indicator",
    formula:
      "Upper Band = Basic Upper Band − (Multiplier × ATR); Lower Band = Basic Lower Band + (Multiplier × ATR)",
    notes:
      "Uses Multiplier = 3.0 and ATR = 10. Trailing bands flip between Bullish and Bearish regimes on price breaches.",
  },
  {
    name: "Position Sizing & Risk Budget",
    formula:
      "Risk Budget = Capital × Risk%; Risk Per Share = |Entry − Stop Loss|; Quantity = ⌊Risk Budget / Risk Per Share⌋",
    notes:
      "Strictly enforces trade quantity bounding to ensure no single trade violates the specified portfolio risk percentage.",
  },
  {
    name: "Sharpe Ratio",
    formula: "Sharpe = (Mean Return − Risk-Free Rate) / Standard Deviation of Return",
    notes:
      "Annualized using 252 trading days. Risk-free rate pegged to Indian 91-day Treasury Bill rate (6.5%).",
  },
  {
    name: "Maximum Drawdown (MDD)",
    formula: "MDD = max_(t) [ (Peak Value − Trough Value_t) / Peak Value ]",
    notes: "Calculates the maximum peak-to-trough decline before a new equity peak is achieved.",
  },
  {
    name: "Profit Factor",
    formula: "Profit Factor = Gross Profits / |Gross Losses|",
    notes: "A value > 1.5 indicates statistical profitability across simulated trade sample.",
  },
  {
    name: "Mathematical Expectancy",
    formula: "Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss)",
    notes: "Expected rupee value gained or lost per executed unit trade.",
  },
  {
    name: "Walk-Forward & Out-of-Sample Validation",
    formula:
      "Data Split: In-Sample 60% (Training) | Validation 20% (Tuning) | Out-of-Sample 20% (Blind Test)",
    notes:
      "Strategies showing >30% Sharpe decay between In-Sample and Out-of-Sample are flagged for curve overfitting.",
  },
];

function AboutAndMethodology() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" /> Quantitative Specification & Architecture
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            System Architecture & Methodology
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SmartQuant Edge operates under deterministic quantitative rules. Below is the complete
            15-node system architectural data flow and the exact mathematical formulation of
            indicators, position sizing, and risk checks.
          </p>
        </div>

        {/* 1. TRADING PIPELINE SECTION (VIVA SPEC) */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> End-to-End Trading Pipeline
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exact 13-stage deterministic algorithmic execution lifecycle from market data to audit
              ledger.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface/50 p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 num text-xs">
              {TRADING_PIPELINE_CHAIN.map((node, i) => (
                <div key={node} className="flex items-center gap-2">
                  <span className="rounded-lg border border-primary/40 bg-surface-2 px-3 py-1.5 font-bold text-foreground">
                    {node}
                  </span>
                  {i < TRADING_PIPELINE_CHAIN.length - 1 && (
                    <span className="text-primary font-black">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. ARCHITECTURE SECTION (SECTION 46) */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Platform System Architecture
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deterministic 15-node data flow from trader invocation to audit recording.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface/50 p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2 num text-xs">
              {ARCHITECTURE_CHAIN.map((node, i) => (
                <div key={node} className="flex items-center gap-2">
                  <span className="rounded-lg border border-primary/30 bg-surface-2 px-3 py-1.5 font-bold text-foreground">
                    {node}
                  </span>
                  {i < ARCHITECTURE_CHAIN.length - 1 && (
                    <span className="text-primary font-black">↓</span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-muted-foreground pt-4 border-t border-border">
              <div className="space-y-1">
                <p className="font-bold text-foreground">1. Ingestion & Provenance</p>
                <p className="leading-relaxed">
                  Market ticks arrive over DhanHQ WebSocket. Market Data Engine tags tick with
                  timestamp, detects stale conditions (&gt;15s), and parses into NormalizedTick
                  contract.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-foreground">2. Sizing & Pre-Trade Risk</p>
                <p className="leading-relaxed">
                  Position Sizer calculates exact share count based on risk budget. Pre-trade Risk
                  Engine gates order against capital limits and stop-loss requirements before
                  submission.
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-foreground">3. Execution & Lineage</p>
                <p className="leading-relaxed">
                  Paper Broker simulates fill with realistic slippage. Order Engine records complete
                  9-stage Explain This Trade lineage into the authoritative server store.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. METHODOLOGY SECTION (SECTION 47) */}
        <section className="space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Mathematical Methodology & Equations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exact mathematical formulas implemented across the indicator and risk engines.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FORMULAS.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-border bg-surface/40 p-4 space-y-2 text-xs"
              >
                <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                <div className="rounded-lg border border-primary/20 bg-surface-2/60 p-2.5 font-mono text-[11px] text-primary">
                  {item.formula}
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">{item.notes}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. VIVA & EXAMINER SUMMARY BANNER */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-3 text-xs">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Examination & Viva Presentation Summary
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            SmartQuant Edge combines authentic Indian exchange market data (NSE/BSE via DhanHQ),
            first-party sovereign authentication (SmartQuant User ID + OTP challenge), deterministic
            position sizing, pre-trade risk gating, real-time mark-to-market trade tracking, a
            server-enforced Kill Switch, and a complete 9-stage auditable trade lineage engine
            without relying on external social OAuth or synthetic price fluctuation.
          </p>
        </section>
      </div>
    </MarketingShell>
  );
}
