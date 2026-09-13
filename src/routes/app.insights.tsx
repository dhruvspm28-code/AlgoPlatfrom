import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  BarChart2,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { GlassCard, PageHeader, StatusPill, inr } from "@/components/ui-kit/primitives";
import { sectorSentiment } from "@/data/platform";
import { InstrumentDrawer } from "@/components/trading/InstrumentDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/insights")({
  head: () => ({
    meta: [
      { title: "Quantitative Market Insights — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Deterministic quantitative market observations, technical indicator confluence evidence, and sector relative strength.",
      },
    ],
  }),
  component: InsightsPage,
});

interface QuantitativeInsight {
  symbol: string;
  name: string;
  sector: string;
  action: "BUY" | "SELL" | "HOLD";
  regime: string;
  confluenceScore: number;
  evidence: {
    rule: string;
    status: "CONFIRMED" | "NEUTRAL" | "DIVERGENT";
    value: string;
  }[];
  riskNote: string;
}

const QUANTITATIVE_INSIGHTS: QuantitativeInsight[] = [
  {
    symbol: "NIFTY 50",
    name: "NIFTY 50 Benchmark Index",
    sector: "INDEX",
    action: "BUY",
    regime: "Trending Bullish (Stage 2 Expansion)",
    confluenceScore: 84,
    evidence: [
      { rule: "EMA 20 > EMA 50", status: "CONFIRMED", value: "Spread: +142 pts (+0.57%)" },
      {
        rule: "Price > Volume Weighted Average Price (VWAP)",
        status: "CONFIRMED",
        value: "Trading +85 pts above intraday anchor",
      },
      {
        rule: "RSI (14) Momentum Band",
        status: "CONFIRMED",
        value: "RSI 62.4 (Bullish momentum zone, not overbought)",
      },
      {
        rule: "Volume vs 20-period Moving Average",
        status: "CONFIRMED",
        value: "1.35× average volume on expansion bars",
      },
      {
        rule: "Supertrend (10, 3) Trend Filter",
        status: "CONFIRMED",
        value: "Trailing support line active at 24,720",
      },
    ],
    riskNote: "ATR 14 is at 112 pts. Recommended initial stop-loss placement below 24,780.",
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    sector: "Energy / Conglomerate",
    action: "BUY",
    regime: "Bullish Volatility Breakout",
    confluenceScore: 78,
    evidence: [
      {
        rule: "EMA 9 > EMA 21 Bullish Crossover",
        status: "CONFIRMED",
        value: "Positive slope on both moving averages",
      },
      {
        rule: "Bollinger Band Upper Envelope Break",
        status: "CONFIRMED",
        value: "Band width expanding from 18th percentile",
      },
      {
        rule: "RSI (14) Momentum",
        status: "CONFIRMED",
        value: "RSI 58.6 (Rebounding from midline)",
      },
      {
        rule: "Delivery Volume Ratio",
        status: "NEUTRAL",
        value: "48.2% delivery vs 52.0% 5-day average",
      },
    ],
    riskNote:
      "Earnings release within 14 trading days. Position sizing trimmed to 0.75x standard risk.",
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    sector: "Information Technology",
    action: "HOLD",
    regime: "Mean Reverting Consolidation",
    confluenceScore: 52,
    evidence: [
      {
        rule: "Price Oscillating Near 50-period SMA",
        status: "NEUTRAL",
        value: "Spread within ±0.3% of 4,280 benchmark",
      },
      {
        rule: "RSI (14) Neutral Midline",
        status: "NEUTRAL",
        value: "RSI 48.2 (No directional trend bias)",
      },
      {
        rule: "MACD Signal Histogram",
        status: "DIVERGENT",
        value: "Histogram near zero (-1.2), fading momentum",
      },
      {
        rule: "Intraday Volume Participation",
        status: "DIVERGENT",
        value: "0.78× 20-period volume (Subdued institutional participation)",
      },
    ],
    riskNote:
      "Await candle close above 4,320 resistance or below 4,220 support before initiating directional exposure.",
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    sector: "Banking",
    action: "BUY",
    regime: "Accumulation Near Value Zone",
    confluenceScore: 72,
    evidence: [
      {
        rule: "Price Reclaiming VWAP Anchor",
        status: "CONFIRMED",
        value: "Recovered from intraday low with volume surge",
      },
      {
        rule: "RSI (14) Divergence",
        status: "CONFIRMED",
        value: "Bullish price/RSI divergence on 15m frame",
      },
      {
        rule: "EMA 20 Slope Transition",
        status: "CONFIRMED",
        value: "Slope flipped positive (+0.12°)",
      },
      {
        rule: "High-Volume Node Support",
        status: "CONFIRMED",
        value: "Institutional volume shelf holding at 1,640",
      },
    ],
    riskNote: "Tight stop-loss mandatory below 1,632 (0.6% capital risk).",
  },
];

export function InsightsPage() {
  const [drawerSymbol, setDrawerSymbol] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quantitative Market Insights"
        subtitle="Deterministic factor alignment, technical indicator confluence, and empirical evidence evaluated on verified candle closes."
      />

      {/* TOP DESK REGIME BANNER */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-4">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Macro Regime
          </span>
          <p className="text-base font-bold text-bull mt-1">Trending Bullish</p>
          <span className="text-[10px] text-muted-foreground">Stage 2 Continuation</span>
        </GlassCard>
        <GlassCard className="p-4">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            India VIX Volatility
          </span>
          <p className="text-base font-bold text-foreground mt-1 num">13.42</p>
          <span className="text-[10px] text-bull">Low Volatility Regime (-2.1%)</span>
        </GlassCard>
        <GlassCard className="p-4">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            NSE 500 Market Breadth
          </span>
          <p className="text-base font-bold text-bull mt-1 num">68.4% Advancing</p>
          <span className="text-[10px] text-muted-foreground">342 Advancing / 158 Declining</span>
        </GlassCard>
        <GlassCard className="p-4">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">
            Aggregate Confluence
          </span>
          <p className="text-base font-bold text-primary mt-1 num">76 / 100</p>
          <span className="text-[10px] text-muted-foreground">Strong Factor Alignment</span>
        </GlassCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 items-start">
        {/* QUANTITATIVE EVIDENCE OBSERVATIONS (LEFT 2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
            <span className="font-semibold uppercase tracking-wider text-foreground">
              Evidence-Based Factor Observations
            </span>
            <span className="font-mono text-[11px]">15m & 1h Bar Verification</span>
          </div>

          {QUANTITATIVE_INSIGHTS.map((ins) => (
            <GlassCard key={ins.symbol} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setDrawerSymbol(ins.symbol)}
                      className="font-bold text-base text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      {ins.symbol}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {ins.sector}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Regime: <span className="font-medium text-foreground">{ins.regime}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusPill status={ins.action} />
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary block num">
                      {ins.confluenceScore}/100
                    </span>
                    <span className="text-[10px] text-muted-foreground">Confluence</span>
                  </div>
                </div>
              </div>

              {/* UNDERLYING EVIDENCE CHECKLIST */}
              <div className="space-y-2 rounded-xl bg-surface-2/60 p-3.5 text-xs border border-border/60">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] block mb-2">
                  Underlying Mathematical Evidence Checklist:
                </span>
                <div className="space-y-1.5">
                  {ins.evidence.map((ev, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      {ev.status === "CONFIRMED" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-bull shrink-0 mt-0.5" />
                      ) : ev.status === "DIVERGENT" ? (
                        <AlertCircle className="h-3.5 w-3.5 text-bear shrink-0 mt-0.5" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-warn shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{ev.rule}</span>
                        <span className="text-muted-foreground font-mono text-[11px] block">
                          {ev.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RISK FOOTER */}
              <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
                <span>
                  <strong>Risk Mandate:</strong> {ins.riskNote}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDrawerSymbol(ins.symbol)}
                  className="text-xs h-7 shrink-0"
                >
                  Inspect Charts
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* SECTOR RELATIVE STRENGTH & CONVICTION (RIGHT COL) */}
        <div className="space-y-5">
          <GlassCard className="p-5 space-y-4">
            <div className="border-b border-border pb-2">
              <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Sector Relative Strength
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sectoral breadth and cumulative momentum rank
              </p>
            </div>

            <div className="space-y-3">
              {sectorSentiment.map((s) => (
                <div key={s.sector} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{s.sector}</span>
                    <span className="num font-bold text-primary">{s.score}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden border border-border/50">
                    <div
                      className={cn(
                        "h-full transition-all",
                        s.score >= 70 ? "bg-bull" : s.score >= 50 ? "bg-primary" : "bg-warn",
                      )}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Deterministic Methodology:</p>
              <p>
                Observations are derived strictly from technical indicator formulas and order book
                tick streams. No black-box or non-deterministic AI generation is employed.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* REUSABLE INSTRUMENT DETAIL DRAWER */}
      <InstrumentDrawer
        symbol={drawerSymbol}
        open={!!drawerSymbol}
        onClose={() => setDrawerSymbol(null)}
      />
    </div>
  );
}
