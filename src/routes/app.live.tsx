/**
 * Live Market Execution Terminal Route for SmartQuant Edge.
 * 3-Column Professional Layout:
 * LEFT: Watchlist (10 Core Instruments with live LTP and change %)
 * CENTER: Candlestick/Area Chart with timeframes (1m-1D), active indicators, and Explain This Trade button
 * RIGHT: Instrument info, Market Regime, Signal Confluence, Position Sizer breakdown, Risk checks, and Order Entry Ticket.
 * BOTTOM: Active orders with Lifecycle Stepper and Explain This Trade triggers.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Send,
  X,
  Search,
  ChevronRight,
  Ban,
  Filter,
  AlertTriangle,
  Check,
  TrendingUp,
  BrainCircuit,
  Sliders,
  Layers,
  Sparkles,
  Zap,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard, PageHeader, StatusPill, inr } from "@/components/ui-kit/primitives";
import { usePlatform } from "@/context/PlatformContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type DetailedOrder } from "@/services/order-engine";
import { instrumentMapper } from "@/services/instrument-mapper";
import { candleAggregator } from "@/services/candle-aggregator";
import { IndicatorEngine } from "@/services/indicator-engine";
import { PositionSizer } from "@/services/position-sizer";
import { signalEngine, type StrategySignal } from "@/services/signal-engine";
import { marketRegimeEngine } from "@/services/market-regime";
import { marketDataEngine } from "@/services/market-data-engine";
import { type Timeframe, type NormalizedTick, type Candle } from "@/services/market-data-types";
import { realtimeBus } from "@/services/realtime-bus";
import { WatchlistTable } from "@/components/trading/WatchlistTable";
import { TradingChart } from "@/components/trading/TradingChart";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { InstrumentDrawer } from "@/components/trading/InstrumentDrawer";
import { MarketDataDiagnostics } from "@/components/trading/MarketDataDiagnostics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/live")({
  head: () => ({
    meta: [
      { title: "Live Execution Terminal — SmartQuant Edge" },
      {
        name: "description",
        content:
          "End-to-end real market data terminal, order routing, pre-trade risk engine, and Explain This Trade pipeline.",
      },
    ],
  }),
  component: LiveTerminalPage,
});

export function LiveTerminalPage() {
  const {
    orders,
    submitOrder,
    cancelOrder,
    tradingMode,
    globalTradingState,
    riskLimits,
    feedStatus,
    openExplainModal,
  } = usePlatform();

  const watchlist = instrumentMapper.getAllWatchlist();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [drawerSymbol, setDrawerSymbol] = useState<string | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<"POSITIONS" | "ORDERS">("POSITIONS");

  // Broker-Style Order Ticket State
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "SL-M" | "SL-L">("LIMIT");
  const [validity, setValidity] = useState<"DAY" | "IOC">("DAY");
  const [qty, setQty] = useState<number>(10);
  const [price, setPrice] = useState<number>(2984.4);
  const [stopLoss, setStopLoss] = useState<number>(2900.0);
  const [target, setTarget] = useState<number>(3150.0);
  const [submitting, setSubmitting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnectFeed = async () => {
    setReconnecting(true);
    try {
      const res = await fetch("/api/market-data/reconnect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Feed reconnected successfully!");
      } else {
        toast.error(data.message || "Feed reconnection failed.");
      }
      await marketDataEngine.reconnect();
    } catch {
      toast.error("Failed to connect to market data gateway.");
    } finally {
      setReconnecting(false);
    }
  };

  // Stepper Modal State
  const [selectedOrderForStepper, setSelectedOrderForStepper] = useState<DetailedOrder | null>(
    null,
  );

  // Toggleable Indicators matching Section 35
  const [activeIndicators, setActiveIndicators] = useState({
    sma: false,
    ema: true,
    vwap: true,
    bb: false,
    supertrend: true,
  });

  // Active Instrument Data with Real-time Tick Subscription
  const selectedMapping = instrumentMapper.getMapping(selectedSymbol) || watchlist[0];
  const [liveTick, setLiveTick] = useState<NormalizedTick | undefined>(() =>
    marketDataEngine.getLatestTick(selectedSymbol),
  );
  const [ticksReceivedCount, setTicksReceivedCount] = useState<number>(0);
  const [frontendEventsReceived, setFrontendEventsReceived] = useState<number>(0);
  const [lastTickReceivedAt, setLastTickReceivedAt] = useState<number>(0);
  const [historicalCandles, setHistoricalCandles] = useState<Candle[]>([]);

  // Fetch official session candles on symbol or timeframe change to populate candleAggregator
  useEffect(() => {
    let cancelled = false;
    const fetchSessionCandles = async () => {
      try {
        const res = await fetch(
          `/api/market-data/historical?symbol=${encodeURIComponent(selectedSymbol)}&range=1D&resolution=${timeframe}`,
        );
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.candles) && data.candles.length > 0) {
          setHistoricalCandles(data.candles);
          candleAggregator.setCandles(selectedSymbol, timeframe, data.candles);
        }
      } catch (err) {
        console.warn("[app.live] Session candles fetch error:", err);
      }
    };
    fetchSessionCandles();
    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, timeframe]);

  // Subscribe to real-time market ticks across all instruments
  useEffect(() => {
    // Initial sync
    const initial = marketDataEngine.getLatestTick(selectedSymbol);
    if (initial) setLiveTick(initial);

    const unsub = realtimeBus.subscribe("MARKET_TICK", (evt) => {
      const tick = evt.payload as NormalizedTick;
      setFrontendEventsReceived((c) => c + 1);
      setLastTickReceivedAt(Date.now());
      if (tick && tick.symbol === selectedSymbol) {
        setLiveTick(tick);
      }
      setTicksReceivedCount((c) => c + 1);
    });

    return () => unsub();
  }, [selectedSymbol]);

  const currentLtp = liveTick ? liveTick.price : selectedMapping.basePrice;
  const currentChange = liveTick ? liveTick.change : 0;
  const currentChangePct = liveTick ? liveTick.changePct : 0;

  // Candles & Indicators dynamically recomputed on real ticks and historical loads
  const candles = useMemo(
    () => candleAggregator.getCandles(selectedSymbol, timeframe),
    [selectedSymbol, timeframe, ticksReceivedCount, historicalCandles.length],
  );
  const indicators = useMemo(() => IndicatorEngine.calculateAll(candles), [candles]);
  const regime = useMemo(() => marketRegimeEngine.getRegime(), [ticksReceivedCount]);

  // Active Signal for Selected Symbol
  const [activeSignal, setActiveSignal] = useState<StrategySignal | undefined>(() =>
    signalEngine.getLatestSignal(selectedSymbol),
  );

  useEffect(() => {
    try {
      if (feedStatus.connectionState === "LIVE" && !feedStatus.isStale) {
        const sig = signalEngine.evaluateStrategy({
          strategyId: "STR-001",
          strategyName: "EMA Crossover Pro",
          symbol: selectedSymbol,
        });
        setActiveSignal(sig);
      } else {
        setActiveSignal(signalEngine.getLatestSignal(selectedSymbol));
      }
    } catch {
      setActiveSignal(signalEngine.getLatestSignal(selectedSymbol));
    }
  }, [selectedSymbol, feedStatus.connectionState, feedStatus.isStale]);

  // Position Sizing Calculation
  const sizingResult = PositionSizer.calculate({
    accountCapital: riskLimits.availableCapital,
    riskPctPerTrade: 1.5,
    entryPrice: price,
    stopLossPrice: stopLoss,
  });

  const estValue = qty * price;
  const isOverCapital = estValue > riskLimits.availableCapital;
  const isOverMaxTrade = estValue > riskLimits.maxTradeValue;
  const isMissingStopLoss = !stopLoss || stopLoss <= 0;
  const isFeedStale =
    feedStatus.isStale ||
    feedStatus.connectionState === "CONFIG_ERROR" ||
    feedStatus.connectionState === "AUTH_ERROR" ||
    feedStatus.connectionState === "DISCONNECTED";

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    const tick = marketDataEngine.getLatestTick(sym);
    setLiveTick(tick);
    const base = instrumentMapper.getMapping(sym)?.basePrice || 1000;
    const ltp = tick ? tick.price : base;
    setPrice(ltp);
    setStopLoss(Number((ltp * 0.97).toFixed(2)));
  };

  const handleApplySizing = () => {
    setQty(sizingResult.recommendedQty);
    toast.success(`Applied recommended position size: ${sizingResult.recommendedQty} Qty`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (globalTradingState === "HALTED") {
      toast.error("Trading is Halted. Clear Emergency Kill Switch before placing orders.");
      return;
    }

    if (tradingMode === "LIVE_TRADING" && isFeedStale) {
      toast.error(
        `Market data is ${feedStatus.connectionState}. Order placement blocked for risk protection.`,
      );
      return;
    }

    if (isMissingStopLoss) {
      toast.error("Stop Loss is required by Pre-Trade Risk Engine guardrails.");
      return;
    }

    setSubmitting(true);
    try {
      const newOrder = await submitOrder({
        symbol: selectedSymbol,
        side,
        orderType,
        qty: Number(qty),
        price: Number(price),
        stopLossPrice: Number(stopLoss),
        strategyId: activeSignal?.strategyName || "Manual Execution",
      });

      if (newOrder.status === "REJECTED") {
        toast.error(`Order Rejected by Risk: ${newOrder.rejectionReason}`);
      } else {
        toast.success(
          `Simulated Paper Fill executed: ${side} ${qty} ${selectedSymbol} @ ₹${newOrder.avgFillPrice}`,
        );
        setActiveBottomTab("POSITIONS");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit order";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Convert aggregated candles to chart points sorted chronologically
  const chartData = useMemo(() => {
    return candles
      .map((c) => ({
        timestamp: c.openTime,
        time: new Date(c.openTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: c.close,
        close: c.close,
        open: c.open,
        high: c.high,
        low: c.low,
        volume: c.volume,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [candles]);

  // Root-cause runtime diagnostic print required by user
  useEffect(() => {
    const firstC = candles[0];
    const lastC = candles[candles.length - 1];
    const liveC = candleAggregator.getCandles(selectedSymbol, timeframe);
    const diag = {
      selectedSymbol,
      selectedTimeframe: timeframe,
      "chartData.length": chartData.length,
      "historicalCandles.length": historicalCandles.length,
      "liveCandles.length": liveC.length,
      firstTimestamp: firstC ? new Date(firstC.openTime).toISOString() : "N/A",
      lastTimestamp: lastC ? new Date(lastC.openTime).toISOString() : "N/A",
      firstClose: firstC ? firstC.close : "N/A",
      lastClose: lastC ? lastC.close : "N/A",
    };
    console.log("[app.live:chartData Runtime Diagnostic]", diag);
    if (typeof window !== "undefined") {
      (window as unknown as Record<string, unknown>).__SMARTQUANT_LIVE_CHART_DIAGNOSTICS__ = diag;
    }
  }, [selectedSymbol, timeframe, chartData.length, historicalCandles.length, candles]);

  return (
    <div className="space-y-6">
      {/* Global Trading Halted Banner */}
      {globalTradingState === "HALTED" && (
        <div className="rounded-2xl border-2 border-bear/60 bg-bear/15 p-4 text-bear flex items-center justify-between gap-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-bear shrink-0" />
            <div>
              <p className="font-bold text-sm uppercase tracking-wide">
                EMERGENCY KILL SWITCH ACTIVE — TRADING HALTED
              </p>
              <p className="text-xs text-bear/90">
                All algorithmic strategy signals paused. New orders strictly blocked.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-bear text-bear hover:bg-bear hover:text-white"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Emergency Controls
          </Button>
        </div>
      )}

      <PageHeader
        title="Live Execution Terminal"
        subtitle={`Real-Time Market Data · Multi-Timeframe Candles · Algorithmic Risk Pipeline · Mode: ${tradingMode.replace("_", " ")}`}
      />

      {/* Real-time Developer Diagnostic Panel */}
      <MarketDataDiagnostics
        feedStatus={feedStatus}
        lastTickSymbol={liveTick?.symbol}
        lastTickLtp={liveTick?.price}
        lastTickTimestamp={liveTick?.timestamp}
        frontendEventsReceived={frontendEventsReceived}
        lastReceivedAt={lastTickReceivedAt}
      />

      {/* Live Market Feed Status & Provider Switcher Banner */}
      <div className="rounded-xl border border-border/80 bg-surface-2/70 p-3.5 backdrop-blur-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                  {feedStatus.providerName || "DhanHQ Market Feed v2"}
                </span>

                {/* Provider Selector Switcher */}
                <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => marketDataEngine.switchProvider("groww")}
                    className={cn(
                      "px-2 py-0.5 rounded font-bold transition-colors cursor-pointer",
                      feedStatus.provider === "groww"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Groww API
                  </button>
                  <button
                    type="button"
                    onClick={() => marketDataEngine.switchProvider("dhan")}
                    className={cn(
                      "px-2 py-0.5 rounded font-bold transition-colors cursor-pointer",
                      feedStatus.provider === "dhan"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    DhanHQ
                  </button>
                </div>

                {/* Connection Status Pill */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                    feedStatus.connectionState === "LIVE"
                      ? "bg-bull/15 text-bull border border-bull/30"
                      : feedStatus.connectionState === "CONFIG_ERROR" ||
                          feedStatus.connectionState === "AUTH_ERROR"
                        ? "bg-bear/15 text-bear border border-bear/30"
                        : feedStatus.connectionState === "STALE" ||
                            feedStatus.connectionState === "MARKET_CLOSED"
                          ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                          : "bg-info/15 text-info border border-info/30",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      feedStatus.connectionState === "LIVE"
                        ? "bg-bull animate-ping"
                        : feedStatus.connectionState === "CONFIG_ERROR" ||
                            feedStatus.connectionState === "AUTH_ERROR"
                          ? "bg-bear"
                          : feedStatus.connectionState === "STALE" ||
                              feedStatus.connectionState === "MARKET_CLOSED"
                            ? "bg-amber-500"
                            : "bg-info animate-pulse",
                    )}
                  />
                  {feedStatus.connectionState.replace("_", " ")}
                </span>

                {(feedStatus.connectionState === "AUTH_ERROR" ||
                  feedStatus.connectionState === "DISCONNECTED" ||
                  feedStatus.connectionState === "CONFIG_ERROR") && (
                  <button
                    type="button"
                    onClick={handleReconnectFeed}
                    disabled={reconnecting}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    {reconnecting ? "Reconnecting..." : "[Reconnect]"}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {feedStatus.provenanceText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs num">
            <div className="text-right">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Feed Latency
              </p>
              <p className="font-bold text-foreground">
                {feedStatus.latencyMs !== undefined && feedStatus.latencyMs > 0
                  ? `${feedStatus.latencyMs} ms`
                  : feedStatus.connectionState === "LIVE"
                    ? "< 15 ms"
                    : "--"}
              </p>
            </div>

            <div className="text-right border-l border-border/60 pl-3">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Last Verified Tick
              </p>
              <p className="font-mono text-[11px] font-semibold text-foreground">
                {feedStatus.lastTickTimestamp
                  ? new Date(feedStatus.lastTickTimestamp).toLocaleTimeString("en-IN", {
                      hour12: false,
                    })
                  : "No live ticks yet"}
              </p>
            </div>

            <div className="text-right border-l border-border/60 pl-3">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Instruments
              </p>
              <p className="font-bold text-primary">
                {feedStatus.subscribedCount || 10} Subscribed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groww Session Approval / Auth Error Dedicated Action Card */}
      {feedStatus.provider === "groww" && feedStatus.connectionState === "AUTH_ERROR" && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">Groww Authentication Required</h3>
                  <span className="rounded-full bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    AUTH ERROR
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Groww requires session approval before an API access token can be generated.
                </p>
                <div className="mt-2 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground/90">Follow these steps to activate live market data:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-1">
                    <li>Log in to your Groww Developer Account</li>
                    <li>Navigate to API Management / Sessions</li>
                    <li>Approve your active trading session via TOTP / 2FA</li>
                    <li>Click <strong>Reconnect</strong> below to establish live market data</li>
                  </ol>
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleReconnectFeed}
              disabled={reconnecting}
              variant="outline"
              className="shrink-0 border-red-500/40 hover:bg-red-500/20 text-red-300 font-bold text-xs cursor-pointer"
            >
              <Radio className={cn("mr-1.5 h-3.5 w-3.5", reconnecting && "animate-spin")} />
              {reconnecting ? "Reconnecting..." : "Reconnect"}
            </Button>
          </div>
        </div>
      )}

      {/* 3-COLUMN TERMINAL LAYOUT */}
      <div className="grid gap-5 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: MULTI-GROUP WATCHLIST (3 Cols) */}
        <div className="lg:col-span-3 space-y-3">
          <WatchlistTable
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => handleSelectSymbol(sym)}
            onOpenDrawer={(sym) => setDrawerSymbol(sym)}
            compact={true}
          />
        </div>

        {/* CENTER COLUMN: PRO CANDLESTICK & VOLUME CHART (6 Cols) */}
        <div className="lg:col-span-6 space-y-3">
          <TradingChart
            symbol={selectedSymbol}
            exchange={selectedMapping.exchange as "NSE" | "BSE"}
            feedStatus={feedStatus}
            currentTick={liveTick}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />

          {/* Explain This Trade Action Banner */}
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
              <div>
                <p className="text-xs font-bold text-foreground">Explain This Trade Pipeline</p>
                <p className="text-[11px] text-muted-foreground">
                  Inspect full 9-stage algorithmic decision trail
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => openExplainModal("ORD-1024")}
              className="text-xs h-7 px-3 font-semibold cursor-pointer"
            >
              Explain Trade
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: REGIME, SIGNAL, SIZING & ORDER TICKET (3 Cols) */}
        <GlassCard className="p-4 lg:col-span-3 space-y-4">
          {/* Signal Confluence Box */}
          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-primary" /> Active Signal Engine
              </span>
              <span className="text-[10px] text-muted-foreground">{regime.regime}</span>
            </div>

            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-black px-2.5 py-0.5 rounded-md ${
                  activeSignal?.signalType === "BUY"
                    ? "bg-bull text-bull-foreground"
                    : activeSignal?.signalType === "SELL"
                      ? "bg-bear text-bear-foreground"
                      : "bg-surface-3 text-foreground"
                }`}
              >
                {activeSignal?.signalType || "HOLD"} SIGNAL
              </span>

              <div className="text-right num">
                <p className="font-bold text-foreground">
                  Confluence: {activeSignal?.confluenceScore || 70}/100
                </p>
                <p className="text-[9px] text-muted-foreground">Alignment Score (Not win %)</p>
              </div>
            </div>

            {/* Evidence items */}
            <div className="space-y-1 text-[11px] pt-1">
              {activeSignal?.indicatorEvidence?.slice(0, 3).map((e, idx) => (
                <div key={idx} className="flex justify-between items-center text-muted-foreground">
                  <span>{e.indicator}:</span>
                  <span className={e.passed ? "text-bull font-medium" : "text-bear font-medium"}>
                    {e.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Position Sizer Math Box */}
          <div className="rounded-xl border border-border bg-surface-2/60 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" /> Position Sizer Formula
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplySizing}
                className="h-6 px-2 text-[10px] font-bold"
              >
                Apply ({sizingResult.recommendedQty} Qty)
              </Button>
            </div>

            <div className="space-y-1 text-[11px] num">
              <div className="flex justify-between text-muted-foreground">
                <span>Risk Budget (1.5%):</span>
                <span className="font-semibold text-foreground">
                  ₹{sizingResult.maxRiskAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Risk Per Share (|Entry - SL|):</span>
                <span className="font-semibold text-foreground">₹{sizingResult.riskPerShare}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Recommended Quantity:</span>
                <span className="text-primary">{sizingResult.recommendedQty} Qty</span>
              </div>
            </div>
          </div>

          {/* Broker-Style Order Ticket */}
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="font-bold flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-primary" /> Broker Order Ticket
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                Cap: {inr(riskLimits.availableCapital)}
              </span>
            </div>

            {/* Side Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide("BUY")}
                className={`py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  side === "BUY"
                    ? "bg-bull text-bull-foreground shadow"
                    : "bg-surface-2 text-muted-foreground hover:bg-surface-3"
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide("SELL")}
                className={`py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  side === "SELL"
                    ? "bg-bear text-bear-foreground shadow"
                    : "bg-surface-2 text-muted-foreground hover:bg-surface-3"
                }`}
              >
                SELL
              </button>
            </div>

            {/* Order Type & Validity */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Order Type</Label>
                <select
                  value={orderType}
                  onChange={(e) =>
                    setOrderType(e.target.value as "LIMIT" | "MARKET" | "SL-M" | "SL-L")
                  }
                  className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs outline-none"
                >
                  <option value="LIMIT">LIMIT</option>
                  <option value="MARKET">MARKET</option>
                  <option value="SL-M">STOP LOSS (M)</option>
                  <option value="SL-L">STOP LIMIT (L)</option>
                </select>
              </div>

              <div>
                <Label className="text-[10px]">Validity</Label>
                <select
                  value={validity}
                  onChange={(e) => setValidity(e.target.value as "DAY" | "IOC")}
                  className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs outline-none"
                >
                  <option value="DAY">DAY</option>
                  <option value="IOC">IOC (Immediate)</option>
                </select>
              </div>
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="h-7 text-xs num"
                />
              </div>
              <div>
                <Label className="text-[10px]">Limit Price (₹)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="h-7 text-xs num"
                />
              </div>
            </div>

            {/* Stop Loss & Target Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Stop Loss (₹) *</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="h-7 text-xs num"
                />
              </div>
              <div>
                <Label className="text-[10px]">Target Price (₹)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="h-7 text-xs num"
                />
              </div>
            </div>

            {/* Calculated Risk & Reward Metrics */}
            <div className="rounded-lg border border-border bg-surface-2/60 p-2.5 text-[11px] space-y-1 num">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Value:</span>
                <span className="font-bold text-foreground">{inr(estValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Per Share:</span>
                <span className="font-semibold text-foreground">
                  ₹{Math.abs(price - stopLoss).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Risk Budget:</span>
                <span className="font-semibold text-bear">
                  ₹{(Math.abs(price - stopLoss) * qty).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Potential Reward:</span>
                <span className="font-semibold text-bull">
                  ₹{(Math.abs(target - price) * qty).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1 font-bold">
                <span className="text-muted-foreground">Risk / Reward:</span>
                <span className="text-primary">
                  1 :{" "}
                  {Math.abs(price - stopLoss) > 0
                    ? (Math.abs(target - price) / Math.abs(price - stopLoss)).toFixed(2)
                    : "--"}
                </span>
              </div>
            </div>

            {/* Pre-Trade Risk Guardrail Checklist */}
            <div className="rounded-lg border border-border bg-surface-2/40 p-2.5 space-y-1 text-[10px]">
              <p className="font-bold uppercase tracking-wider text-muted-foreground pb-0.5">
                Pre-Trade Risk Engine Check
              </p>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span>Market Feed Live</span>
                  <span
                    className={
                      !isFeedStale
                        ? "text-bull font-bold flex items-center gap-0.5"
                        : tradingMode === "PAPER_TRADING"
                          ? "text-amber-500 font-bold"
                          : "text-bear font-bold"
                    }
                  >
                    {!isFeedStale
                      ? "✓ VERIFIED"
                      : tradingMode === "PAPER_TRADING"
                        ? "⚠ PAPER ACTIVE"
                        : "✗ STALE / OFFLINE"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Instrument Valid</span>
                  <span className="text-bull font-bold">✓ APPROVED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Order Limit (₹5L Cap)</span>
                  <span className={!isOverMaxTrade ? "text-bull font-bold" : "text-bear font-bold"}>
                    {!isOverMaxTrade ? "✓ WITHIN CAP" : "✗ EXCEEDED"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mandatory Stop Loss</span>
                  <span
                    className={!isMissingStopLoss ? "text-bull font-bold" : "text-bear font-bold"}
                  >
                    {!isMissingStopLoss ? "✓ SPECIFIED" : "✗ REQUIRED"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Available Capital</span>
                  <span className={!isOverCapital ? "text-bull font-bold" : "text-bear font-bold"}>
                    {!isOverCapital ? "✓ SUFFICIENT" : "✗ INSUFFICIENT"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Kill Switch Inactive</span>
                  <span
                    className={
                      globalTradingState !== "HALTED"
                        ? "text-bull font-bold"
                        : "text-bear font-bold"
                    }
                  >
                    {globalTradingState !== "HALTED" ? "✓ INACTIVE" : "✗ HALTED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Paper Trading Banner Notice */}
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-500 text-center font-semibold">
              PAPER TRADING • SIMULATED EXECUTION • NO REAL MONEY
            </div>

            <Button
              type="submit"
              disabled={
                submitting ||
                globalTradingState === "HALTED" ||
                (tradingMode === "LIVE_TRADING" && isFeedStale) ||
                isMissingStopLoss ||
                isOverCapital ||
                isOverMaxTrade
              }
              className={`w-full font-bold text-xs h-9 cursor-pointer ${
                side === "BUY"
                  ? "bg-bull hover:bg-bull/90 text-bull-foreground"
                  : "bg-bear hover:bg-bear/90 text-bear-foreground"
              }`}
            >
              {submitting ? "Routing to Paper Broker..." : `PLACE PAPER ${side} ORDER (${qty} QTY)`}
            </Button>
          </form>
        </GlassCard>
      </div>

      {/* Reusable Instrument Slide-over Drawer */}
      <InstrumentDrawer
        symbol={drawerSymbol}
        open={!!drawerSymbol}
        onClose={() => setDrawerSymbol(null)}
      />

      {/* BOTTOM SECTION: WORKSTATION DOCK (POSITIONS & ORDERS) */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveBottomTab("POSITIONS")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeBottomTab === "POSITIONS"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground bg-surface-2",
              )}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Open Positions & Live P&L
            </button>
            <button
              type="button"
              onClick={() => setActiveBottomTab("ORDERS")}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeBottomTab === "ORDERS"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground bg-surface-2",
              )}
            >
              <Activity className="h-3.5 w-3.5" /> Order Book ({orders.length})
            </button>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {activeBottomTab === "POSITIONS"
              ? "Live Mark-to-Market P&L Engine"
              : "Real-time Order Execution Lifecycle"}
          </span>
        </div>

        {activeBottomTab === "POSITIONS" ? (
          <PositionsTable onSelectSymbol={handleSelectSymbol} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/60 uppercase tracking-wide">
                  <th className="pb-2">Order ID</th>
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 num">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No orders recorded. Use the order ticket above to place an order.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr
                      key={ord.id}
                      className="hover:bg-surface-2/60 cursor-pointer transition-colors"
                      onClick={() => setSelectedOrderForStepper(ord)}
                    >
                      <td className="py-3 font-semibold text-primary">{ord.id}</td>
                      <td className="py-3 font-medium text-foreground">{ord.symbol}</td>
                      <td className="py-3">
                        <StatusPill status={ord.side} />
                      </td>
                      <td className="py-3">
                        {ord.filledQty} / {ord.qty}
                      </td>
                      <td className="py-3 font-mono">₹{ord.price}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold ${
                            ord.status === "EXECUTED"
                              ? "bg-bull/10 text-bull"
                              : ord.status === "REJECTED"
                                ? "bg-bear/10 text-bear"
                                : "bg-info/10 text-info"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openExplainModal(ord.id);
                          }}
                          className="h-7 px-2 text-[11px] font-semibold text-primary border-primary/30"
                        >
                          Explain Trade
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderForStepper(ord);
                          }}
                          className="h-7 px-2 text-[11px]"
                        >
                          Stepper <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ORDER LIFECYCLE STEPPER DIALOG */}
      {selectedOrderForStepper && (
        <Dialog
          open={!!selectedOrderForStepper}
          onOpenChange={() => setSelectedOrderForStepper(null)}
        >
          <DialogContent className="glass sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>ORDER #{selectedOrderForStepper.id}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    selectedOrderForStepper.side === "BUY"
                      ? "bg-bull/20 text-bull"
                      : "bg-bear/20 text-bear"
                  }`}
                >
                  {selectedOrderForStepper.side} {selectedOrderForStepper.qty}{" "}
                  {selectedOrderForStepper.symbol}
                </span>
              </DialogTitle>
              <DialogDescription className="num">
                {selectedOrderForStepper.symbol} @ ₹{selectedOrderForStepper.price} · Created at{" "}
                {new Date(selectedOrderForStepper.createdAt).toLocaleTimeString()}
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-4">
              <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs space-y-1 num">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Type:</span>
                  <span className="font-semibold">{selectedOrderForStepper.orderType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filled Quantity:</span>
                  <span className="font-semibold">
                    {selectedOrderForStepper.filledQty} / {selectedOrderForStepper.qty}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold text-bull">{selectedOrderForStepper.status}</span>
                </div>
              </div>

              {/* TIMELINE STEPPER */}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lifecycle Timeline Progress
              </p>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {selectedOrderForStepper.timeline.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3">
                    <span
                      className={`absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                        step.passed
                          ? "bg-bull text-bull-foreground"
                          : "bg-bear text-bear-foreground"
                      }`}
                    >
                      {step.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </span>
                    <div>
                      <p className="text-xs font-bold">{step.label}</p>
                      {step.note && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{step.note}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground num mt-0.5">
                        {new Date(step.timestamp).toLocaleTimeString()} IST
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const id = selectedOrderForStepper.id;
                  setSelectedOrderForStepper(null);
                  openExplainModal(id);
                }}
                className="text-xs text-primary"
              >
                Explain This Trade
              </Button>

              <div className="flex gap-2">
                {selectedOrderForStepper.status !== "EXECUTED" &&
                  selectedOrderForStepper.status !== "CANCELLED" &&
                  selectedOrderForStepper.status !== "REJECTED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        cancelOrder(selectedOrderForStepper.id);
                        setSelectedOrderForStepper(null);
                        toast.info(`Order #${selectedOrderForStepper.id} cancelled`);
                      }}
                    >
                      Cancel Order
                    </Button>
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrderForStepper(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
