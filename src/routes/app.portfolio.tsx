/**
 * Portfolio Workstation Terminal for SmartQuant Edge.
 * Multi-asset portfolio analytics, equity curve, asset & sector allocation, and performance breakdown.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Wallet,
  PieChart,
  TrendingUp,
  IndianRupee,
  Layers,
  BarChart3,
  Power,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Activity,
  Percent,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { usePlatform } from "@/context/PlatformContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AllocationPie, AreaSeries } from "@/components/charts/Charts";
import {
  DEMO_POSITIONS,
  DEMO_PORTFOLIO_TOTALS,
  DEMO_ORDERS,
  type ConsistentPosition,
} from "@/data/central-trading-dataset";
import { equityCurve } from "@/data/market";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio Terminal & Asset Allocation — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Institutional multi-asset portfolio workstation, equity curve timeframes, allocation concentration, and mark-to-market valuations.",
      },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const navigate = useNavigate();
  const { exitAllPositions } = usePlatform();

  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "3M" | "1Y" | "ALL">("1M");
  const [positions, setPositions] = useState<ConsistentPosition[]>(DEMO_POSITIONS);

  // Dynamic equity curve based on selected timeframe
  const equityPoints = useMemo(() => {
    const pointsMap = {
      "1D": 12,
      "1W": 18,
      "1M": 30,
      "3M": 45,
      "1Y": 60,
      ALL: 72,
    };
    return equityCurve(pointsMap[timeframe], 1000000, 33);
  }, [timeframe]);

  // Totals
  const totalVal = DEMO_PORTFOLIO_TOTALS.totalPortfolioValue;
  const availCash = DEMO_PORTFOLIO_TOTALS.availableCash;
  const investedVal = DEMO_PORTFOLIO_TOTALS.investedCapital;
  const todayPnl = DEMO_PORTFOLIO_TOTALS.todayPnl;
  const totalPnl = DEMO_PORTFOLIO_TOTALS.totalPnl;
  const returnPct = DEMO_PORTFOLIO_TOTALS.returnPct;

  // Asset allocation pie data (Equity, Intraday F&O, Cash)
  const assetAllocationData = useMemo(() => {
    const cashVal = availCash;
    const deliveryVal = positions
      .filter((p) => p.product === "DELIVERY")
      .reduce((sum, p) => sum + p.currentValue, 0);
    const intradayVal = positions
      .filter((p) => p.product === "INTRADAY")
      .reduce((sum, p) => sum + p.currentValue, 0);

    const cPct = Math.round((cashVal / totalVal) * 100);
    const dPct = Math.round((deliveryVal / totalVal) * 100);
    const iPct = Math.max(0, 100 - cPct - dPct);

    return [
      { name: "Liquid Cash", value: cPct, fill: "var(--color-primary)" },
      { name: "Equity Delivery", value: dPct, fill: "#10b981" },
      { name: "Intraday Positions", value: iPct, fill: "#8b5cf6" },
    ];
  }, [positions, availCash, totalVal]);

  // Sector allocation data
  const sectorAllocation = useMemo(() => {
    const sectorMap: Record<string, number> = {};
    positions.forEach((p) => {
      sectorMap[p.sector] = (sectorMap[p.sector] || 0) + p.currentValue;
    });

    const sectors = Object.entries(sectorMap).map(([name, val]) => ({
      name,
      value: Math.round((val / totalVal) * 100),
      amount: val,
    }));

    return sectors.sort((a, b) => b.value - a.value);
  }, [positions, totalVal]);

  // Recent activity
  const recentOrders = useMemo(() => DEMO_ORDERS.slice(0, 5), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Portfolio Workstation"
            subtitle="Multi-asset ledger, equity curve performance, asset allocation, and sector concentration."
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-primary/10 border-primary/30 text-primary text-[11px] font-mono font-bold px-2.5 py-1"
          >
            PAPER DEMO DATA · SIMULATED
          </Badge>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/app/positions" })}
            className="h-8 text-xs font-semibold"
          >
            View Open Positions ({positions.length})
          </Button>
        </div>
      </div>

      {/* TOP METRIC STRIP */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="PORTFOLIO VALUE"
          value={inr(totalVal)}
          delta={returnPct}
          icon={<Wallet className="h-4 w-4" />}
          footnote="Cash + open MTM"
        />
        <StatCard
          label="AVAILABLE CASH"
          value={inr(availCash)}
          delta={0}
          icon={<IndianRupee className="h-4 w-4" />}
          footnote="Free liquid balance"
        />
        <StatCard
          label="INVESTED VALUE"
          value={inr(investedVal)}
          icon={<Layers className="h-4 w-4" />}
          footnote="Deployed capital"
        />
        <StatCard
          label="TODAY'S P&L"
          value={inr(todayPnl)}
          delta={1.12}
          icon={<TrendingUp className="h-4 w-4" />}
          footnote="Current session MTM"
        />
        <StatCard
          label="TOTAL P&L"
          value={inr(totalPnl)}
          delta={returnPct}
          icon={<BarChart3 className="h-4 w-4" />}
          footnote="Realized + Unrealized"
        />
        <StatCard
          label="RETURN %"
          value={`+${returnPct.toFixed(2)}%`}
          delta={returnPct}
          icon={<Percent className="h-4 w-4" />}
          footnote="Absolute ROI on ledger"
        />
      </div>

      {/* SECTION A: PORTFOLIO PERFORMANCE & EQUITY CURVE */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Portfolio Performance & Growth
            </h3>
            <p className="text-xs text-muted-foreground">
              Compounded capital growth progression across historical simulation periods
            </p>
          </div>

          {/* TIMEFRAME SELECTOR */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-border">
            {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer",
                  timeframe === tf
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          <AreaSeries data={equityPoints} dataKey="equity" xKey="label" height={250} />
        </div>
      </GlassCard>

      {/* SECTION B: HOLDINGS / POSITIONS TABLE */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Holdings & Active Positions Ledger
            </h3>
            <p className="text-xs text-muted-foreground">
              Tick-by-tick real-time mark-to-market valuations and portfolio risk weights
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Avg Price</th>
                <th className="py-2.5 px-3 text-right">LTP</th>
                <th className="py-2.5 px-3 text-right">Invested</th>
                <th className="py-2.5 px-3 text-right">Current Value</th>
                <th className="py-2.5 px-3 text-right">P&L</th>
                <th className="py-2.5 px-3 text-right">P&L %</th>
                <th className="py-2.5 px-3 text-right">Weight</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 num">
              {positions.map((p) => {
                const isPositive = p.pnl >= 0;
                return (
                  <tr key={p.symbol} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 px-3 font-sans">
                      <span className="font-bold text-foreground block">{p.symbol}</span>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        {p.product} · {p.strategy}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold">{p.qty}</td>
                    <td className="py-3 px-3 text-right">₹{p.avgPrice.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">
                      ₹{p.currentPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right">{inr(p.invested)}</td>
                    <td className="py-3 px-3 text-right font-semibold">{inr(p.currentValue)}</td>
                    <td
                      className={cn(
                        "py-3 px-3 text-right font-bold",
                        isPositive ? "text-bull" : "text-bear",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {inr(p.pnl)}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-3 text-right font-bold",
                        isPositive ? "text-bull" : "text-bear",
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {p.pnlPct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                      {p.portfolioWeight}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: "/app/positions" })}
                        className="h-6 px-2 text-[10px]"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* SECTIONS C & D: ASSET ALLOCATION & SECTOR ALLOCATION */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SECTION C: ASSET ALLOCATION */}
        <GlassCard className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Asset Class Allocation
            </h3>
            <p className="text-xs text-muted-foreground">
              Capital distribution between cash reserves, delivery holdings, and intraday trades
            </p>
          </div>
          <div className="h-60 w-full">
            <AllocationPie data={assetAllocationData} height={230} />
          </div>
        </GlassCard>

        {/* SECTION D: SECTOR ALLOCATION */}
        <GlassCard className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Sector Concentration & 40% Caps
            </h3>
            <p className="text-xs text-muted-foreground">
              Concentration exposure monitored against quantitative single-sector limits
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {sectorAllocation.map((sec) => (
              <div key={sec.name} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">{sec.name}</span>
                  <span className="num font-bold text-primary">
                    {sec.value}% ({inr(sec.amount)}) / 40% Cap
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-2 border border-border overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      sec.value > 35 ? "bg-warn" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(100, (sec.value / 40) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* SECTION E: PERFORMANCE SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-xs num">
        <GlassCard className="p-4 space-y-1 border-bull/30 bg-bull/5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
            Best Performer
          </span>
          <p className="text-base font-bold text-foreground">
            {DEMO_PORTFOLIO_TOTALS.bestPerformer.symbol}
          </p>
          <span className="text-bull font-bold font-mono">
            +{inr(DEMO_PORTFOLIO_TOTALS.bestPerformer.pnl)} (+
            {DEMO_PORTFOLIO_TOTALS.bestPerformer.pnlPct}%)
          </span>
        </GlassCard>

        <GlassCard className="p-4 space-y-1 border-bear/30 bg-bear/5">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
            Worst Performer
          </span>
          <p className="text-base font-bold text-foreground">
            {DEMO_PORTFOLIO_TOTALS.worstPerformer.symbol}
          </p>
          <span className="text-bear font-bold font-mono">
            {inr(DEMO_PORTFOLIO_TOTALS.worstPerformer.pnl)} (
            {DEMO_PORTFOLIO_TOTALS.worstPerformer.pnlPct}%)
          </span>
        </GlassCard>

        <GlassCard className="p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
            Winning Positions
          </span>
          <p className="text-base font-bold text-bull font-mono">
            {DEMO_PORTFOLIO_TOTALS.winningPositionsCount} Positions
          </p>
          <span className="text-[11px] text-muted-foreground">Positive MTM</span>
        </GlassCard>

        <GlassCard className="p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
            Losing Positions
          </span>
          <p className="text-base font-bold text-bear font-mono">
            {DEMO_PORTFOLIO_TOTALS.losingPositionsCount} Position
          </p>
          <span className="text-[11px] text-muted-foreground">Managed by SL</span>
        </GlassCard>

        <GlassCard className="p-4 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold block">
            Largest Position
          </span>
          <p className="text-base font-bold text-foreground">
            {DEMO_PORTFOLIO_TOTALS.largestPosition.symbol}
          </p>
          <span className="text-primary font-bold font-mono">
            {inr(DEMO_PORTFOLIO_TOTALS.largestPosition.value)} (
            {DEMO_PORTFOLIO_TOTALS.largestPosition.concentrationPct}%)
          </span>
        </GlassCard>
      </div>

      {/* SECTION F: RECENT PORTFOLIO ACTIVITY */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Recent Portfolio Activity & Order Execution
            </h3>
            <p className="text-xs text-muted-foreground">
              Latest order executions synced with portfolio cash balance and positions ledger
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/app/execution-reports" })}
            className="text-xs h-7"
          >
            All Executions ({DEMO_ORDERS.length})
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                <th className="py-2 px-3">Order ID</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3">Side</th>
                <th className="py-2 px-3 text-right">Quantity</th>
                <th className="py-2 px-3 text-right">Price</th>
                <th className="py-2 px-3 text-right">Value</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 num">
              {recentOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-surface-2/30">
                  <td className="py-2.5 px-3 font-mono font-bold text-primary">{ord.id}</td>
                  <td className="py-2.5 px-3 font-bold text-foreground font-sans">{ord.symbol}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold",
                        ord.side === "BUY" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear",
                      )}
                    >
                      {ord.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">{ord.qty}</td>
                  <td className="py-2.5 px-3 text-right">₹{ord.price.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    {inr(ord.qty * ord.price)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                        ord.status === "EXECUTED"
                          ? "bg-bull/10 text-bull"
                          : ord.status === "REJECTED"
                            ? "bg-bear/10 text-bear"
                            : "bg-warn/10 text-warn",
                      )}
                    >
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
