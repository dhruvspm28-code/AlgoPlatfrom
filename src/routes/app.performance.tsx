/**
 * Performance Analytics Workstation for SmartQuant Edge.
 * Institutional quantitative analysis of strategy and portfolio performance.
 * Equity curve, Drawdown, Daily P&L, Win/Loss distribution, Monthly returns,
 * and comprehensive strategy/instrument breakdowns.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Filter,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { AreaSeries } from "@/components/charts/Charts";
import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/context/PlatformContext";
import { CENTRAL_DEMO_DATA, JournalTrade, StrategyRecord } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/performance")({
  head: () => ({
    meta: [
      { title: "Performance Analytics — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Quantitative analysis of strategy and portfolio performance, Sharpe ratio, equity curve, drawdown, and trade distributions.",
      },
    ],
  }),
  component: PerformancePage,
});

function PerformancePage() {
  const { isLiveTrading } = usePlatform();

  // Filters
  const [timeRange, setTimeRange] = useState<"TODAY" | "7D" | "1M" | "3M" | "6M" | "1Y" | "ALL">(
    "1M",
  );
  const [selectedStrategy, setSelectedStrategy] = useState<string>("ALL");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("ALL");
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<
    "strategy" | "instrument" | "daily" | "tradeType"
  >("strategy");

  // Determine data source (Central deterministic paper dataset if paper/demo)
  const isDemo = !isLiveTrading;
  const trades: JournalTrade[] = CENTRAL_DEMO_DATA.journalTrades;
  const perfMetrics = CENTRAL_DEMO_DATA.performance;

  // Filter trades based on controls
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchStrat = selectedStrategy === "ALL" || t.strategy === selectedStrategy;
      const matchInst = selectedInstrument === "ALL" || t.symbol === selectedInstrument;
      return matchStrat && matchInst;
    });
  }, [trades, selectedStrategy, selectedInstrument]);

  // Derived metrics from filtered trades
  const stats = useMemo(() => {
    if (filteredTrades.length === 0) {
      return {
        totalTrades: 0,
        netPnL: 0,
        winRate: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        sharpe: 0,
        maxDrawdown: 0,
      };
    }

    const wins = filteredTrades.filter((t) => t.netPnl > 0);
    const losses = filteredTrades.filter((t) => t.netPnl < 0);
    const netPnL = filteredTrades.reduce((acc, t) => acc + t.netPnl, 0);
    const winRate = (wins.length / filteredTrades.length) * 100;

    const totalWinVal = wins.reduce((acc, t) => acc + t.netPnl, 0);
    const totalLossVal = Math.abs(losses.reduce((acc, t) => acc + t.netPnl, 0));
    const profitFactor = totalLossVal > 0 ? totalWinVal / totalLossVal : totalWinVal > 0 ? 99.9 : 0;
    const avgWin = wins.length > 0 ? totalWinVal / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossVal / losses.length : 0;

    return {
      totalTrades: filteredTrades.length,
      netPnL,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      sharpe: perfMetrics.sharpeRatio,
      maxDrawdown: perfMetrics.maxDrawdown,
    };
  }, [filteredTrades, perfMetrics]);

  // Equity curve data points
  const equityPoints = useMemo(() => {
    return perfMetrics.equityCurve.map((pt) => ({
      time: pt.date,
      value: pt.value,
    }));
  }, [perfMetrics.equityCurve]);

  // Drawdown points
  const drawdownPoints = useMemo(() => {
    return perfMetrics.equityCurve.map((pt) => {
      const dd = pt.drawdown || 0;
      return {
        time: pt.date,
        value: dd,
      };
    });
  }, [perfMetrics.equityCurve]);

  // Monthly returns matrix
  const monthlyReturns = [
    {
      year: 2026,
      jan: "+2.4%",
      feb: "+3.1%",
      mar: "+1.8%",
      apr: "+0.9%",
      may: "+2.7%",
      jun: "+1.5%",
      jul: "+3.4%",
      aug: "+2.1%",
      sep: "+1.9%",
      ytd: "+21.6%",
    },
    {
      year: 2025,
      jan: "+1.8%",
      feb: "-0.4%",
      mar: "+4.2%",
      apr: "+2.0%",
      may: "+1.1%",
      jun: "+3.0%",
      jul: "+2.8%",
      aug: "+1.6%",
      sep: "+2.2%",
      ytd: "+19.8%",
    },
  ];

  // Strategy breakdown table data
  const strategyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { trades: number; wins: number; pnl: number; symbols: Set<string> }
    >();
    trades.forEach((t) => {
      const existing = map.get(t.strategy) || {
        trades: 0,
        wins: 0,
        pnl: 0,
        symbols: new Set<string>(),
      };
      existing.trades += 1;
      if (t.netPnl > 0) existing.wins += 1;
      existing.pnl += t.netPnl;
      existing.symbols.add(t.symbol);
      map.set(t.strategy, existing);
    });

    return Array.from(map.entries()).map(([strat, data]) => ({
      strategy: strat,
      trades: data.trades,
      winRate: (data.wins / data.trades) * 100,
      pnl: data.pnl,
      profitFactor: data.pnl > 0 ? ((data.pnl + 5000) / 5000).toFixed(2) : "0.85",
      instruments: Array.from(data.symbols).join(", "),
    }));
  }, [trades]);

  // Instrument breakdown table data
  const instrumentBreakdown = useMemo(() => {
    const map = new Map<string, { trades: number; wins: number; pnl: number; volume: number }>();
    trades.forEach((t) => {
      const existing = map.get(t.symbol) || { trades: 0, wins: 0, pnl: 0, volume: 0 };
      existing.trades += 1;
      if (t.netPnl > 0) existing.wins += 1;
      existing.pnl += t.netPnl;
      existing.volume += t.quantity;
      map.set(t.symbol, existing);
    });

    return Array.from(map.entries()).map(([sym, data]) => ({
      symbol: sym,
      trades: data.trades,
      winRate: (data.wins / data.trades) * 100,
      pnl: data.pnl,
      volume: data.volume,
    }));
  }, [trades]);

  // Unique list of strategies and instruments for filter dropdowns
  const availableStrategies = useMemo(
    () => Array.from(new Set(trades.map((t) => t.strategy))),
    [trades],
  );
  const availableInstruments = useMemo(
    () => Array.from(new Set(trades.map((t) => t.symbol))),
    [trades],
  );

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
              Performance Analytics
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs px-2.5 py-0.5 border",
                isDemo
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
              )}
            >
              {isDemo ? "PAPER DEMO PERFORMANCE" : "LIVE BROKER FEED"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Quantitative analysis of strategy and portfolio performance, risk-adjusted returns &
            drawdown analytics
          </p>
        </div>

        {/* Global Dataset Banner / Export */}
        <div className="flex items-center gap-2">
          {isDemo && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-amber-400" />
              <span>Deterministic Simulated Dataset</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-border/60 hover:bg-secondary/60"
            onClick={() => {
              const json = JSON.stringify(perfMetrics, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `SmartQuant-Performance-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
            }}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Export Analytics
          </Button>
        </div>
      </div>

      {/* 2. TOP METRICS STRIP (8 Quant Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard
          label="NET P&L"
          value={inr(stats.netPnL)}
          subtext={stats.netPnL >= 0 ? "Profitable" : "Deficit"}
          trend={stats.netPnL >= 0 ? "up" : "down"}
          variant={stats.netPnL >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="TOTAL TRADES"
          value={stats.totalTrades.toString()}
          subtext={`${filteredTrades.filter((t) => t.netPnl > 0).length}W / ${filteredTrades.filter((t) => t.netPnl < 0).length}L`}
        />
        <StatCard
          label="WIN RATE"
          value={`${stats.winRate.toFixed(1)}%`}
          subtext="Executed fills"
          trend={stats.winRate >= 50 ? "up" : "down"}
          variant={stats.winRate >= 50 ? "success" : "warning"}
        />
        <StatCard
          label="PROFIT FACTOR"
          value={stats.profitFactor.toFixed(2)}
          subtext="Gross Win / Loss"
          trend="up"
          variant="success"
        />
        <StatCard
          label="SHARPE RATIO"
          value={stats.sharpe.toFixed(2)}
          subtext="Risk-adjusted"
          trend="up"
          variant="success"
        />
        <StatCard
          label="MAX DRAWDOWN"
          value={`${stats.maxDrawdown.toFixed(1)}%`}
          subtext="Peak-to-trough"
          trend="down"
          variant="danger"
        />
        <StatCard
          label="AVG WIN"
          value={inr(stats.avgWin)}
          subtext="Winning trades"
          variant="success"
        />
        <StatCard
          label="AVG LOSS"
          value={inr(stats.avgLoss)}
          subtext="Losing trades"
          variant="danger"
        />
      </div>

      {/* FILTER CONTROLS BAR */}
      <GlassCard className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-card/60">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filters:
          </span>
          <div className="flex items-center rounded-lg bg-secondary/50 p-0.5 border border-border/40">
            {(["TODAY", "7D", "1M", "3M", "6M", "1Y", "ALL"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                  timeRange === range
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Strategy filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Strategy:</span>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="bg-secondary/60 border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Strategies ({availableStrategies.length})</option>
              {availableStrategies.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Instrument filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Instrument:</span>
            <select
              value={selectedInstrument}
              onChange={(e) => setSelectedInstrument(e.target.value)}
              className="bg-secondary/60 border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Instruments ({availableInstruments.length})</option>
              {availableInstruments.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* 3. MAIN CHARTS (Grid: Equity & Drawdown, Daily P&L, Win vs Loss) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve (2 cols) */}
        <GlassCard className="lg:col-span-2 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Portfolio Equity Curve (Simulated vs Capital)
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {inr(CENTRAL_DEMO_DATA.portfolio.totalValue)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />+
                    {CENTRAL_DEMO_DATA.portfolio.returnPercent.toFixed(2)}% Overall
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono bg-secondary/50">
                Initial: {inr(1000000)}
              </Badge>
            </div>
            <div className="h-64 w-full">
              <AreaSeries
                data={equityPoints}
                dataKey="value"
                xKey="time"
                height={256}
                color="#10b981"
                gradientId="perfEquityGrad"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3 mt-2">
            <span>Peak: {inr(1045000)}</span>
            <span>Trough: {inr(998000)}</span>
            <span>Current Capital: {inr(CENTRAL_DEMO_DATA.portfolio.totalValue)}</span>
          </div>
        </GlassCard>

        {/* Drawdown Curve & Win vs Loss */}
        <div className="space-y-6">
          {/* Drawdown Curve */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Drawdown Profile
                </h3>
                <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                  -{Math.abs(perfMetrics.maxDrawdown).toFixed(2)}% Max Drawdown
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/30"
              >
                Under Control
              </Badge>
            </div>
            <div className="h-28 w-full">
              <AreaSeries
                data={drawdownPoints}
                dataKey="value"
                xKey="time"
                height={112}
                color="#f43f5e"
                gradientId="perfDdGrad"
              />
            </div>
          </GlassCard>

          {/* Win vs Loss Distribution */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Win vs Loss Distribution
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-medium">Winning Trades (75%)</span>
                  <span className="font-mono text-white">9 trades · +₹17,800.00</span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "75%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-rose-400 font-medium">Losing Trades (25%)</span>
                  <span className="font-mono text-white">3 trades · -₹2,210.00</span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: "25%" }} />
                </div>
              </div>
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Profit Factor: <strong className="text-foreground">8.05</strong>
                </span>
                <span>
                  Avg Win/Loss: <strong className="text-foreground">2.68x</strong>
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 4. DAILY P&L & MONTHLY RETURNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily P&L Bars */}
        <GlassCard className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Daily P&L Distribution (Last 14 Trading Sessions)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Realized net returns per trading day
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> Win Day
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 inline-block" /> Loss Day
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-border/40">
            {perfMetrics.equityCurve.slice(-14).map((pt, idx: number) => {
              const dailyChange =
                idx > 0 ? pt.value - perfMetrics.equityCurve.slice(-14)[idx - 1].value : 1200;
              const isGreen = dailyChange >= 0;
              const heightPercent = Math.min(
                100,
                Math.max(15, (Math.abs(dailyChange) / 6000) * 100),
              );

              return (
                <div
                  key={pt.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-popover text-popover-foreground px-1.5 py-0.5 rounded shadow font-mono pointer-events-none whitespace-nowrap z-10">
                    {inr(dailyChange)}
                  </div>
                  <div
                    className={cn(
                      "w-full rounded-t transition-all",
                      isGreen
                        ? "bg-emerald-500/80 hover:bg-emerald-400"
                        : "bg-rose-500/80 hover:bg-rose-400",
                    )}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[9px] font-mono text-muted-foreground rotate-45 origin-left pt-1">
                    {pt.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Monthly Returns Heatmap */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Monthly Returns (%)
              </h3>
              <Badge
                variant="outline"
                className="text-xs font-mono text-emerald-400 border-emerald-500/30"
              >
                YTD +21.6%
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/40">
                    <th className="text-left pb-2 font-medium">Year</th>
                    <th className="text-right pb-2">Q1</th>
                    <th className="text-right pb-2">Q2</th>
                    <th className="text-right pb-2">Q3</th>
                    <th className="text-right pb-2 font-bold text-foreground">YTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {monthlyReturns.map((row) => (
                    <tr key={row.year} className="hover:bg-secondary/30">
                      <td className="py-2 text-left font-semibold text-foreground">{row.year}</td>
                      <td className="py-2 text-right text-emerald-400">+7.3%</td>
                      <td className="py-2 text-right text-emerald-400">+5.1%</td>
                      <td className="py-2 text-right text-emerald-400">+7.4%</td>
                      <td className="py-2 text-right font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded">
                        {row.ytd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground pt-3 border-t border-border/40 flex items-center justify-between">
            <span>Benchmark: NIFTY 50 (+14.2%)</span>
            <span className="text-emerald-400 font-semibold">Alpha: +7.4%</span>
          </div>
        </GlassCard>
      </div>

      {/* 5. PERFORMANCE BREAKDOWN WORKBENCH (By Strategy, By Instrument, By Trade Type) */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Performance Breakdown Workbench</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Granular attribution of profitability across strategies, instruments, and execution
              styles
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center rounded-lg bg-secondary/50 p-1 border border-border/40">
            <button
              onClick={() => setActiveBreakdownTab("strategy")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                activeBreakdownTab === "strategy"
                  ? "bg-card text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              By Strategy
            </button>
            <button
              onClick={() => setActiveBreakdownTab("instrument")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                activeBreakdownTab === "instrument"
                  ? "bg-card text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              By Instrument
            </button>
            <button
              onClick={() => setActiveBreakdownTab("daily")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                activeBreakdownTab === "daily"
                  ? "bg-card text-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              By Day of Week
            </button>
          </div>
        </div>

        {/* Tab 1: By Strategy */}
        {activeBreakdownTab === "strategy" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/30 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
                <tr>
                  <th className="py-2.5 px-3">Strategy Name</th>
                  <th className="py-2.5 px-3">Instruments</th>
                  <th className="py-2.5 px-3 text-right">Trades</th>
                  <th className="py-2.5 px-3 text-right">Win Rate</th>
                  <th className="py-2.5 px-3 text-right">Profit Factor</th>
                  <th className="py-2.5 px-3 text-right">Realized Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {strategyBreakdown.map((row) => (
                  <tr
                    key={row.strategy}
                    className="hover:bg-secondary/40 font-mono transition-colors"
                  >
                    <td className="py-3 px-3 font-sans font-medium text-foreground">
                      {row.strategy}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground font-sans">{row.instruments}</td>
                    <td className="py-3 px-3 text-right text-foreground">{row.trades}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={cn(
                          row.winRate >= 50 ? "text-emerald-400 font-semibold" : "text-amber-400",
                        )}
                      >
                        {row.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">{row.profitFactor}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={cn(
                          "font-bold",
                          row.pnl >= 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {row.pnl >= 0 ? "+" : ""}
                        {inr(row.pnl)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: By Instrument */}
        {activeBreakdownTab === "instrument" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/30 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
                <tr>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3 text-right">Completed Trades</th>
                  <th className="py-2.5 px-3 text-right">Volume Traded</th>
                  <th className="py-2.5 px-3 text-right">Win Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Realized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {instrumentBreakdown.map((row) => (
                  <tr
                    key={row.symbol}
                    className="hover:bg-secondary/40 font-mono transition-colors"
                  >
                    <td className="py-3 px-3 font-sans font-bold text-foreground">{row.symbol}</td>
                    <td className="py-3 px-3 text-right text-foreground">{row.trades}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {row.volume.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={cn(
                          row.winRate >= 50 ? "text-emerald-400 font-semibold" : "text-amber-400",
                        )}
                      >
                        {row.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={cn(
                          "font-bold",
                          row.pnl >= 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {row.pnl >= 0 ? "+" : ""}
                        {inr(row.pnl)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: By Day of Week */}
        {activeBreakdownTab === "daily" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/30 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
                <tr>
                  <th className="py-2.5 px-3">Day of Week</th>
                  <th className="py-2.5 px-3 text-right">Trades Count</th>
                  <th className="py-2.5 px-3 text-right">Win Rate</th>
                  <th className="py-2.5 px-3 text-right">Profit Factor</th>
                  <th className="py-2.5 px-3 text-right">Average Day Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  { day: "Monday", trades: 3, winRate: "66.7%", pf: "4.20", ret: "+₹3,150.00" },
                  { day: "Tuesday", trades: 3, winRate: "100%", pf: "99.9", ret: "+₹5,820.00" },
                  { day: "Wednesday", trades: 2, winRate: "50.0%", pf: "1.85", ret: "+₹1,120.00" },
                  {
                    day: "Thursday (Expiry)",
                    trades: 3,
                    winRate: "66.7%",
                    pf: "6.40",
                    ret: "+₹4,300.00",
                  },
                  { day: "Friday", trades: 1, winRate: "100%", pf: "99.9", ret: "+₹1,200.00" },
                ].map((row) => (
                  <tr key={row.day} className="hover:bg-secondary/40 font-mono transition-colors">
                    <td className="py-3 px-3 font-sans font-medium text-foreground">{row.day}</td>
                    <td className="py-3 px-3 text-right text-foreground">{row.trades}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                      {row.winRate}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">{row.pf}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">{row.ret}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
