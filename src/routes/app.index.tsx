import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  IndianRupee,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Power,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Ban,
  XCircle,
  BarChart2,
  Layers,
  Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { AreaSeries } from "@/components/charts/Charts";
import { GlassCard, PageHeader, StatCard, StatusPill, inr } from "@/components/ui-kit/primitives";
import { monthlyReturns, recentTrades } from "@/data/market";
import { usePlatform } from "@/context/PlatformContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WatchlistTable } from "@/components/trading/WatchlistTable";
import { InstrumentDrawer } from "@/components/trading/InstrumentDrawer";
import { marketDataEngine } from "@/services/market-data-engine";
import { instrumentMapper } from "@/services/instrument-mapper";
import { candleAggregator } from "@/services/candle-aggregator";
import { IndicatorEngine } from "@/services/indicator-engine";
import { marketRegimeEngine } from "@/services/market-regime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: (search.tab as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Market Dashboard — SmartQuant Edge Quantitative Terminal" },
      {
        name: "description",
        content:
          "Institutional market overview, market breadth, regime detection, active watchlist, and live algo desk controls.",
      },
      { property: "og:title", content: "SmartQuant Edge Market Dashboard" },
      {
        property: "og:description",
        content: "Market breadth, quantitative regime, and live terminal gateway.",
      },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const {
    globalTradingState,
    haltInfo,
    resumeTrading,
    tradingMode,
    brokerSession,
    stopAllAlgorithms,
    cancelPendingOrders,
    exitAllPositions,
    systemHealth,
    strategies,
    paperPositions,
    paperPortfolio,
  } = usePlatform();

  const [confirmResumeOpen, setConfirmResumeOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [drawerSymbol, setDrawerSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"15m" | "1h" | "1D">("15m");

  const activeLiveCount = strategies.filter((s) => s.status === "LIVE").length;
  const activePaperCount = strategies.filter((s) => s.status === "PAPER").length;

  // Real data for selected instrument
  const selectedMapping = instrumentMapper.getMapping(selectedSymbol) || {
    symbol: selectedSymbol,
    name: selectedSymbol,
    exchange: "NSE" as const,
    assetClass: "EQUITY" as const,
    nseToken: "0",
    upstoxKey: "",
    dhanToken: "",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 1000,
  };

  const tick = marketDataEngine.getLatestTick(selectedSymbol);
  const ltp = tick ? tick.price : selectedMapping.basePrice;
  const change = tick ? tick.change : 0;
  const changePct = tick ? tick.changePct : 0;
  const isUp = changePct >= 0;

  // Aggregated candles & indicators for selected instrument
  const candles = candleAggregator.getCandles(selectedSymbol, timeframe);
  const indicators = IndicatorEngine.calculateAll(candles);
  const regime = marketRegimeEngine.getRegime();

  const chartData = candles.slice(-40).map((c) => ({
    time: new Date(c.openTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    value: c.close,
  }));

  // Calculate real Market Breadth & Top Movers across monitored universe
  const universe = instrumentMapper.getAllWatchlist();
  const { breadth, topGainers, topLosers, volumeLeaders } = useMemo(() => {
    let advancing = 0;
    let declining = 0;
    let unchanged = 0;

    const enriched = universe.map((inst) => {
      const t = marketDataEngine.getLatestTick(inst.symbol);
      const chg = t ? t.changePct : 0;
      const vol = t ? t.volume : 0;
      const price = t ? t.price : inst.basePrice;

      if (chg > 0.05) advancing++;
      else if (chg < -0.05) declining++;
      else unchanged++;

      return { ...inst, price, changePct: chg, volume: vol };
    });

    const sortedByGain = [...enriched].sort((a, b) => b.changePct - a.changePct);
    const sortedByLoss = [...enriched].sort((a, b) => a.changePct - b.changePct);
    const sortedByVol = [...enriched].sort((a, b) => b.volume - a.volume);

    return {
      breadth: { advancing, declining, unchanged, total: universe.length },
      topGainers: sortedByGain.slice(0, 3),
      topLosers: sortedByLoss.slice(0, 3),
      volumeLeaders: sortedByVol.slice(0, 3),
    };
  }, [universe]);

  // Sector performance summary
  const sectorSummary = [
    { sector: "Banking", score: 68, trend: "BULLISH", chg: "+1.2%" },
    { sector: "Energy", score: 54, trend: "NEUTRAL", chg: "+0.6%" },
    { sector: "IT", score: 38, trend: "BEARISH", chg: "-0.8%" },
    { sector: "Auto", score: 72, trend: "BULLISH", chg: "+2.4%" },
    { sector: "Pharma", score: 48, trend: "NEUTRAL", chg: "-0.2%" },
  ];

  return (
    <div className="space-y-6">
      {/* Reusable Instrument Slide-over Drawer */}
      <InstrumentDrawer
        symbol={drawerSymbol}
        open={!!drawerSymbol}
        onClose={() => setDrawerSymbol(null)}
      />

      {/* PROMINENT TRADING HALTED BANNER */}
      {globalTradingState === "HALTED" && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-bear/60 bg-bear/15 p-5 text-bear shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bear text-white">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold uppercase tracking-wide">TRADING HALTED</h2>
                  <span className="rounded-md bg-bear px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                    Kill Switch Active
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-bear/90">
                  {haltInfo.haltReason || "Emergency halt active."} All automated strategies paused.
                  New orders blocked.
                </p>
                {haltInfo.haltedAt && (
                  <p className="mt-1 text-[11px] text-muted-foreground num">
                    Halted at: {new Date(haltInfo.haltedAt).toLocaleTimeString()} IST by{" "}
                    {haltInfo.haltedBy}
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => setConfirmResumeOpen(true)}
              className="bg-bull text-bull-foreground hover:bg-bull/90 font-bold shrink-0"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Resume Trading
            </Button>
          </div>
        </div>
      )}

      {/* CONFIRM RESUME MODAL */}
      <Dialog open={confirmResumeOpen} onOpenChange={setConfirmResumeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-bull">
              <CheckCircle2 className="h-5 w-5 text-bull" /> Confirm Resume Trading
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate the trading terminal and clear the emergency halt
              state?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-bull/30 bg-bull/10 p-3 text-xs text-bull">
            <p className="font-semibold">Post-Resume Actions:</p>
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Global trading state set to ACTIVE</li>
              <li>Order placement enabled</li>
              <li>Strategies will resume signal processing</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResumeOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-bull text-bull-foreground hover:bg-bull/90"
              onClick={() => {
                resumeTrading();
                setConfirmResumeOpen(false);
                toast.success("Global trading state resumed");
              }}
            >
              Confirm & Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader
        title="Market Dashboard"
        subtitle={`Quantitative Overview · Mode: ${tradingMode.replace("_", " ")} · Broker Gateway: ${brokerSession.brokerName} (${brokerSession.status})`}
      />

      {/* TOP INSTITUTIONAL METRIC CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Portfolio Value"
          value={inr(paperPortfolio.totalPortfolioValue)}
          delta={2.14}
          icon={<IndianRupee className="h-4 w-4" />}
          footnote="Simulated Mark-to-Market"
        />
        <StatCard
          label="Today's Realized P&L"
          value={inr(paperPortfolio.realisedPnl)}
          delta={1.82}
          icon={<TrendingUp className="h-4 w-4" />}
          footnote="Realized cash ledger"
        />
        <StatCard
          label="Market Regime"
          value={regime.regime}
          delta={regime.trendStrengthScore}
          icon={<Target className="h-4 w-4" />}
          footnote={`Volatility: ${regime.volatilityLevel}`}
        />
        <StatCard
          label="Active Strategies"
          value={String(activeLiveCount + activePaperCount)}
          delta={0}
          icon={<Activity className="h-4 w-4" />}
          footnote={`${activePaperCount} paper, ${activeLiveCount} live`}
        />
      </div>

      {/* 3-COLUMN MAIN DASHBOARD WORKSTATION */}
      <div className="grid gap-5 xl:grid-cols-12 items-start">
        {/* LEFT: Core Watchlist (3 cols) */}
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Active Watchlist
            </span>
            <span className="text-[10px] text-muted-foreground">{universe.length} monitored</span>
          </div>

          <WatchlistTable
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => setSelectedSymbol(sym)}
            onOpenDrawer={(sym) => setDrawerSymbol(sym)}
            compact={true}
          />
        </div>

        {/* CENTER: Selected Instrument Chart & Technicals (6 cols) */}
        <GlassCard className="p-4 xl:col-span-6 space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{selectedMapping.symbol}</h2>
                <span className="text-[10px] rounded px-1.5 py-0.5 bg-surface-3 text-muted-foreground font-semibold">
                  {selectedMapping.name}
                </span>
                <button
                  onClick={() => setDrawerSymbol(selectedSymbol)}
                  className="text-primary hover:underline text-[10px] font-semibold flex items-center gap-0.5 ml-1"
                >
                  Inspect <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs num">
                <span className="text-base font-extrabold text-foreground">
                  ₹{ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={cn(
                    "font-bold flex items-center gap-1",
                    isUp ? "text-bull" : "text-bear",
                  )}
                >
                  {isUp ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {isUp ? "+" : ""}
                  {change.toFixed(2)} ({isUp ? "+" : ""}
                  {changePct.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Timeframes & Live Terminal Action */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl">
                {(["15m", "1h", "1D"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                      timeframe === tf
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                onClick={() => navigate({ to: "/app/live" })}
                className="h-7 px-2.5 text-xs font-bold gap-1"
              >
                <Zap className="h-3 w-3" /> Trade in Live Terminal
              </Button>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="h-64 w-full">
            <AreaSeries data={chartData} dataKey="value" xKey="time" height={250} />
          </div>

          {/* Live Indicator Snapshot Bar */}
          <div className="grid grid-cols-4 gap-2 border-t border-border/60 pt-3 text-center num text-xs">
            <div className="rounded-lg bg-surface-2/60 p-2">
              <p className="text-[10px] text-muted-foreground">VWAP</p>
              <p className="font-bold text-foreground">₹{indicators.vwap.value.toFixed(1)}</p>
            </div>
            <div className="rounded-lg bg-surface-2/60 p-2">
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
            <div className="rounded-lg bg-surface-2/60 p-2">
              <p className="text-[10px] text-muted-foreground">EMA (9/21)</p>
              <p className="font-bold text-foreground">
                {indicators.ema9.value} / {indicators.ema21.value}
              </p>
            </div>
            <div className="rounded-lg bg-surface-2/60 p-2">
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
          </div>
        </GlassCard>

        {/* RIGHT: Market Summary, Breadth, Movers (3 cols) */}
        <div className="xl:col-span-3 space-y-4">
          {/* Market Breadth Card */}
          <GlassCard className="p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5 text-primary" /> Market Breadth
              </span>
              <span className="text-[10px] text-muted-foreground num">{breadth.total} symbols</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold num">
                <span className="text-bull">Advancing: {breadth.advancing}</span>
                <span className="text-bear">Declining: {breadth.declining}</span>
                <span className="text-muted-foreground">Flat: {breadth.unchanged}</span>
              </div>

              {/* Breadth Bar */}
              <div className="h-2 w-full rounded-full bg-surface-3 flex overflow-hidden">
                <div
                  className="bg-bull h-full"
                  style={{ width: `${(breadth.advancing / breadth.total) * 100}%` }}
                />
                <div
                  className="bg-muted-foreground h-full"
                  style={{ width: `${(breadth.unchanged / breadth.total) * 100}%` }}
                />
                <div
                  className="bg-bear h-full"
                  style={{ width: `${(breadth.declining / breadth.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 space-y-1 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Session State:</span>
                <span className="font-semibold text-foreground">{regime.regime}</span>
              </div>
              <div className="flex justify-between">
                <span>Trend Strength:</span>
                <span className="font-semibold text-primary">{regime.trendStrengthScore}%</span>
              </div>
            </div>
          </GlassCard>

          {/* Top Movers Card */}
          <GlassCard className="p-4 space-y-3 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-bull" /> Top Gainers & Losers
            </span>

            <div className="space-y-2 num">
              {/* Gainers */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-bull uppercase">Top Gainers</p>
                {topGainers.map((g) => (
                  <button
                    key={g.symbol}
                    onClick={() => setSelectedSymbol(g.symbol)}
                    className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-2 transition-colors text-left"
                  >
                    <span className="font-bold text-foreground">{g.symbol}</span>
                    <span className="text-bull font-bold">+{g.changePct.toFixed(2)}%</span>
                  </button>
                ))}
              </div>

              {/* Losers */}
              <div className="space-y-1 pt-2 border-t border-border/40">
                <p className="text-[10px] font-bold text-bear uppercase">Top Losers</p>
                {topLosers.map((l) => (
                  <button
                    key={l.symbol}
                    onClick={() => setSelectedSymbol(l.symbol)}
                    className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-2 transition-colors text-left"
                  >
                    <span className="font-bold text-foreground">{l.symbol}</span>
                    <span className="text-bear font-bold">{l.changePct.toFixed(2)}%</span>
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Sector Overview Card */}
          <GlassCard className="p-4 space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Sectoral Relative Strength
            </span>
            <div className="space-y-1.5 pt-1">
              {sectorSummary.map((sec) => (
                <div key={sec.sector} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{sec.sector}</span>
                  <div className="flex items-center gap-2 num">
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        sec.chg.startsWith("+") ? "text-bull" : "text-bear",
                      )}
                    >
                      {sec.chg}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] px-1 py-0.2 rounded font-bold",
                        sec.trend === "BULLISH"
                          ? "bg-bull/10 text-bull"
                          : sec.trend === "BEARISH"
                            ? "bg-bear/10 text-bear"
                            : "bg-surface-3 text-muted-foreground",
                      )}
                    >
                      {sec.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* BOTTOM SECTION: OPEN POSITIONS & DESK CONTROLS */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* Open Positions Table */}
        <GlassCard className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="font-bold text-sm">Simulated Paper Positions</h2>
              <p className="text-xs text-muted-foreground">
                Mark-to-market valuations refreshed against incoming broker ticks
              </p>
            </div>
            <Link
              to="/app/live"
              className="text-xs text-primary flex items-center gap-1 hover:underline font-semibold"
            >
              Live Terminal <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/60 uppercase tracking-wide">
                  <th className="pb-2">Symbol</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Avg Price</th>
                  <th className="pb-2">LTP</th>
                  <th className="pb-2 text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 num">
                {paperPositions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No open paper positions.
                    </td>
                  </tr>
                ) : (
                  paperPositions.map((pos) => (
                    <tr key={pos.symbol} className="hover:bg-surface-2/50 transition-colors">
                      <td className="py-2.5 font-bold text-foreground">{pos.symbol}</td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                            pos.side === "LONG" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear",
                          )}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5">{pos.qty}</td>
                      <td className="py-2.5">₹{pos.avgPrice.toFixed(2)}</td>
                      <td className="py-2.5 font-semibold">₹{pos.currentPrice.toFixed(2)}</td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-bold",
                          pos.pnl >= 0 ? "text-bull" : "text-bear",
                        )}
                      >
                        {inr(pos.pnl)} ({pos.pnlPct >= 0 ? "+" : ""}
                        {pos.pnlPct.toFixed(2)}%)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Emergency Desk Controls */}
        <GlassCard className="p-5 space-y-4">
          <div>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Algorithmic Desk Safety
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant risk intervention across active algorithms and paper orders
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopAllAlgorithms();
                toast.info("Paused all active automated strategies");
              }}
              className="w-full justify-start text-xs font-semibold"
            >
              <Ban className="mr-2 h-3.5 w-3.5 text-amber-500" /> Stop All Running Algos
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const count = cancelPendingOrders();
                toast.info(`Cancelled ${count} open pending orders`);
              }}
              className="w-full justify-start text-xs font-semibold"
            >
              <XCircle className="mr-2 h-3.5 w-3.5 text-amber-500" /> Cancel Pending Orders
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const count = exitAllPositions();
                toast.warning(`Simulated exit triggered for ${count} positions`);
              }}
              className="w-full justify-start text-xs font-semibold text-bear border-bear/30 hover:bg-bear/10"
            >
              <Power className="mr-2 h-3.5 w-3.5 text-bear" /> Liquidate All Positions
            </Button>
          </div>

          {/* System Services Health */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Execution Engine Health</span>
              <span className="h-2 w-2 rounded-full bg-bull animate-pulse-dot" />
            </div>

            <div className="space-y-1.5 text-[11px] num">
              {systemHealth.slice(0, 3).map((s) => (
                <div key={s.id} className="flex justify-between">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="font-semibold text-bull">{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
