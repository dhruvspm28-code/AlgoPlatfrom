/**
 * Reusable Instrument Detail Slide-Over Drawer for SmartQuant Edge.
 * Displays comprehensive market intelligence, indicators, regime, signal confluence,
 * and current positions for any selected symbol.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  Sliders,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { marketDataEngine } from "@/services/market-data-engine";
import { instrumentMapper } from "@/services/instrument-mapper";
import { candleAggregator } from "@/services/candle-aggregator";
import { IndicatorEngine } from "@/services/indicator-engine";
import { signalEngine } from "@/services/signal-engine";
import { marketRegimeEngine } from "@/services/market-regime";
import { paperBroker } from "@/services/paper-broker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AreaSeries } from "@/components/charts/Charts";
import { cn } from "@/lib/utils";

export interface InstrumentDrawerProps {
  symbol: string | null;
  open: boolean;
  onClose: () => void;
}

export function InstrumentDrawer({ symbol, open, onClose }: InstrumentDrawerProps) {
  const navigate = useNavigate();

  if (!symbol) return null;

  const mapping = instrumentMapper.getMapping(symbol) || {
    symbol,
    name: symbol,
    exchange: "NSE" as const,
    assetClass: "EQUITY" as const,
    nseToken: "0",
    upstoxKey: "",
    dhanToken: "",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 1000,
  };

  const tick = marketDataEngine.getLatestTick(symbol);
  const ltp = tick ? tick.price : mapping.basePrice;
  const change = tick ? tick.change : 0;
  const changePct = tick ? tick.changePct : 0;
  const isUp = changePct >= 0;

  // Real calculated indicators & candles
  const [drawerCandles, setDrawerCandles] = useState<any[]>(() =>
    symbol ? candleAggregator.getCandles(symbol, "15m") : [],
  );

  useEffect(() => {
    if (!open || !symbol) return;
    let cancelled = false;
    const fetchCandles = async () => {
      try {
        const res = await fetch(
          `/api/market-data/historical?symbol=${encodeURIComponent(symbol)}&range=1D&resolution=15m`,
        );
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.candles) && data.candles.length > 0) {
          setDrawerCandles(data.candles);
          candleAggregator.setCandles(symbol, "15m", data.candles);
        }
      } catch (err) {
        console.warn("[InstrumentDrawer] Historical candle fetch failed:", err);
      }
    };
    fetchCandles();
    return () => {
      cancelled = true;
    };
  }, [open, symbol]);

  const effectiveCandles =
    drawerCandles.length > 0 ? drawerCandles : candleAggregator.getCandles(symbol, "15m");
  const indicators = IndicatorEngine.calculateAll(effectiveCandles);
  const regime = marketRegimeEngine.getRegime();
  const signal = signalEngine.getLatestSignal(symbol);

  // Check if position exists
  const position = paperBroker.getPosition(symbol);

  // Sparkline data from recent candles
  const chartPoints = effectiveCandles.slice(-30).map((c) => ({
    time: new Date(c.openTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: c.close,
  }));

  const handleTradeInTerminal = () => {
    onClose();
    navigate({ to: "/app/live" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold">{mapping.symbol}</DialogTitle>
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                  {mapping.exchange} · {mapping.assetClass}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {mapping.name}
              </DialogDescription>
            </div>

            {/* Price & Change */}
            <div className="text-right num">
              <p className="text-base font-extrabold text-foreground">
                ₹{ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p
                className={cn(
                  "text-xs font-bold flex items-center justify-end gap-1",
                  isUp ? "text-bull" : "text-bear",
                )}
              >
                {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isUp ? "+" : ""}
                {change.toFixed(2)} ({isUp ? "+" : ""}
                {changePct.toFixed(2)}%)
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Recent Price Action Mini-Chart */}
          <div className="rounded-xl border border-border bg-surface-2/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                15-Minute Candle Trace
              </span>
              <span className="text-[10px] text-muted-foreground num">
                {chartPoints.length} candles
              </span>
            </div>
            <div className="h-40 w-full">
              <AreaSeries data={chartPoints} dataKey="value" xKey="time" height={160} />
            </div>
          </div>

          {/* Quantitative Indicator Matrix */}
          <div className="rounded-xl border border-border bg-surface-2/50 p-3 space-y-2">
            <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Technical Indicator Matrix
            </p>
            <div className="grid grid-cols-3 gap-2 num text-center">
              <div className="rounded-lg bg-surface-3/70 p-2">
                <p className="text-[10px] text-muted-foreground">VWAP</p>
                <p className="font-bold text-foreground">₹{indicators.vwap.value.toFixed(1)}</p>
              </div>
              <div className="rounded-lg bg-surface-3/70 p-2">
                <p className="text-[10px] text-muted-foreground">RSI (14)</p>
                <p
                  className={cn(
                    "font-bold",
                    indicators.rsi14.value > 70
                      ? "text-bear"
                      : indicators.rsi14.value < 30
                        ? "text-bull"
                        : "text-foreground",
                  )}
                >
                  {indicators.rsi14.value.toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-3/70 p-2">
                <p className="text-[10px] text-muted-foreground">Supertrend</p>
                <p
                  className={cn(
                    "font-bold",
                    indicators.supertrend.value.trend === "BULLISH" ? "text-bull" : "text-bear",
                  )}
                >
                  {indicators.supertrend.value.trend}
                </p>
              </div>
              <div className="rounded-lg bg-surface-3/70 p-2">
                <p className="text-[10px] text-muted-foreground">EMA (9/21)</p>
                <p className="font-bold text-foreground">
                  {indicators.ema9.value} / {indicators.ema21.value}
                </p>
              </div>
              <div className="rounded-lg bg-surface-3/70 p-2">
                <p className="text-[10px] text-muted-foreground">SMA (20)</p>
                <p className="font-bold text-foreground">{indicators.sma20.value}</p>
              </div>
              <div className="rounded-lg bg-surface-3/70 p-2">
                <p className="text-[10px] text-muted-foreground">ATR (14)</p>
                <p className="font-bold text-foreground">₹{indicators.atr14.value}</p>
              </div>
            </div>
          </div>

          {/* Market Regime & Signal Alignment */}
          <div className="rounded-xl border border-border bg-surface-2/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" /> Algorithmic Alignment
              </span>
              <span className="text-[10px] rounded bg-primary/10 px-1.5 py-0.5 font-bold text-primary">
                {regime.regime}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="font-bold text-foreground">
                  Signal:{" "}
                  <span
                    className={cn(
                      "font-black",
                      signal?.signalType === "BUY"
                        ? "text-bull"
                        : signal?.signalType === "SELL"
                          ? "text-bear"
                          : "text-muted-foreground",
                    )}
                  >
                    {signal?.signalType || "NEUTRAL"}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Confluence Alignment: {signal?.confluenceScore || 70}/100
                </p>
              </div>

              <div className="text-right num">
                <p className="text-[11px] text-muted-foreground">Volatility State</p>
                <p className="font-bold text-foreground">
                  {regime.volatilityState || regime.volatilityLevel}
                </p>
              </div>
            </div>
          </div>

          {/* Current Position (if any) */}
          {position && (
            <div className="rounded-xl border border-bull/30 bg-bull/5 p-3 space-y-1 num">
              <div className="flex items-center justify-between">
                <span className="font-bold text-bull text-[11px] uppercase tracking-wider">
                  Open Paper Position
                </span>
                <span className="font-bold text-foreground">
                  {position.qty} Qty · {position.side}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Avg Price: ₹{position.avgPrice}</span>
                <span className={cn("font-bold", position.pnl >= 0 ? "text-bull" : "text-bear")}>
                  P&L: ₹{position.pnl.toLocaleString("en-IN")} ({position.pnlPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* Action CTA */}
          <div className="pt-2">
            <Button onClick={handleTradeInTerminal} className="w-full gap-2 font-bold text-xs">
              <Zap className="h-3.5 w-3.5" /> Trade {mapping.symbol} in Live Terminal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
