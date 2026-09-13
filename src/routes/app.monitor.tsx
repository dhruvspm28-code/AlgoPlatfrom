/**
 * Orders Terminal & Algorithm Execution Monitor for SmartQuant Edge.
 * Tabs: Orders Terminal (OPEN, PENDING, EXECUTED, CANCELLED, REJECTED),
 * Running Algorithms & Circuit Breakers, Position Sizing & Parameter Optimizer.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { usePlatform } from "@/context/PlatformContext";
import { signalEngine, type StrategySignal } from "@/services/signal-engine";
import { strategyCircuitBreaker } from "@/services/strategy-circuit-breaker";
import { strategyConflictDetector } from "@/services/strategy-conflict-detector";
import { ParameterOptimizer } from "@/services/parameter-optimizer";
import { marketRegimeEngine } from "@/services/market-regime";
import { PositionSizer } from "@/services/position-sizer";
import { type DetailedOrder, type OrderStatus } from "@/services/order-engine";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  ShieldAlert,
  Zap,
  Sliders,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Layers,
  Sparkles,
  FileText,
  Clock,
  X,
  Check,
  ChevronRight,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, StatusPill, inr } from "@/components/ui-kit/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/monitor")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: (search.tab as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Orders & Algo Execution Terminal — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Live order lifecycle stepper, execution inspection, running strategy circuit breakers, and algorithmic parameter optimization.",
      },
    ],
  }),
  component: AlgoMonitorPage,
});

function AlgoMonitorPage() {
  const search = Route.useSearch();
  const {
    orders,
    cancelOrder,
    strategies,
    globalTradingState,
    activateKillSwitch,
    resumeTrading,
    openExplainModal,
    riskLimits,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<"orders" | "algos" | "parameters">(
    (search.tab as "orders" | "algos" | "parameters") || "orders",
  );

  // Orders Tab Filter
  const [orderFilter, setOrderFilter] = useState<
    "ALL" | "OPEN" | "PENDING" | "EXECUTED" | "CANCELLED" | "REJECTED"
  >("ALL");
  const [selectedOrderForStepper, setSelectedOrderForStepper] = useState<DetailedOrder | null>(
    null,
  );

  // Position sizer interactive inputs
  const [capital, setCapital] = useState<number>(500000);
  const [riskPct, setRiskPct] = useState<number>(1.5);
  const [entryPrice, setEntryPrice] = useState<number>(2980);
  const [stopLossPrice, setStopLossPrice] = useState<number>(2900);

  const sizingResult = PositionSizer.calculate({
    accountCapital: capital,
    riskPctPerTrade: riskPct,
    entryPrice,
    stopLossPrice,
  });

  const circuitRules = strategyCircuitBreaker.getAllRules();
  const conflicts = strategyConflictDetector.getConflicts();
  const optResults = ParameterOptimizer.runGridSearch("strat-1");
  const regime = marketRegimeEngine.getRegime();

  const handleResetCircuit = (stratId: string) => {
    strategyCircuitBreaker.resetCircuitBreaker(stratId);
    toast.success("Circuit breaker reset successfully.");
  };

  // Filter orders by sub-tab
  const filteredOrders = orders.filter((ord) => {
    if (orderFilter === "ALL") return true;
    if (orderFilter === "OPEN" && (ord.status === "CREATED" || ord.status === "ACCEPTED"))
      return true;
    if (orderFilter === "PENDING" && (ord.status === "SUBMITTED" || ord.status === "RISK_CHECK"))
      return true;
    if (orderFilter === "EXECUTED" && ord.status === "EXECUTED") return true;
    if (orderFilter === "CANCELLED" && ord.status === "CANCELLED") return true;
    if (orderFilter === "REJECTED" && ord.status === "REJECTED") return true;
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Orders & Algo Execution Monitor
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Authoritative order book, lifecycle steppers, strategy circuit breakers, and
            mathematical parameter tuning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold num">
            Market Regime: <span className="text-bull font-bold">{regime.regime}</span>
          </div>
          {globalTradingState === "HALTED" ? (
            <Button
              size="sm"
              onClick={resumeTrading}
              className="bg-bull text-bull-foreground font-bold"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Resume Trading
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => activateKillSwitch("Manual Monitor Trigger")}
              className="font-bold"
            >
              <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Emergency Halt
            </Button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border text-xs">
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold transition-colors cursor-pointer",
            activeTab === "orders"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Orders Terminal ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("algos")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold transition-colors cursor-pointer",
            activeTab === "algos"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Running Algorithms ({strategies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("parameters")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 font-bold transition-colors cursor-pointer",
            activeTab === "parameters"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Position Sizing & Optimization</span>
        </button>
      </div>

      {/* TAB 1: ORDERS TERMINAL */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Order Status Sub-Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {(["ALL", "OPEN", "PENDING", "EXECUTED", "CANCELLED", "REJECTED"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer",
                    orderFilter === status
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3",
                  )}
                >
                  {status}
                </button>
              ),
            )}
          </div>

          {/* Orders Table */}
          <GlassCard className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Instrument</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Stop Loss</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 num">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No orders matching status filter "{orderFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrderForStepper(ord)}
                        className="cursor-pointer transition-colors hover:bg-surface-2/60"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-primary">{ord.id}</td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(ord.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">{ord.symbol}</td>
                        <td className="py-3 px-3">
                          <StatusPill status={ord.side} />
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-semibold">
                          {ord.orderType}
                        </td>
                        <td className="py-3 px-3">
                          {ord.filledQty} / {ord.qty}
                        </td>
                        <td className="py-3 px-3 font-semibold">₹{ord.price}</td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {ord.stopLossPrice ? `₹${ord.stopLossPrice}` : "--"}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold text-[10px]",
                              ord.status === "EXECUTED"
                                ? "bg-bull/10 text-bull"
                                : ord.status === "REJECTED"
                                  ? "bg-bear/10 text-bear"
                                  : ord.status === "CANCELLED"
                                    ? "bg-surface-3 text-muted-foreground"
                                    : "bg-info/10 text-info",
                            )}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openExplainModal(ord.id);
                            }}
                            className="h-6 px-2 text-[10px] font-semibold text-primary border-primary/30"
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
                            className="h-6 px-2 text-[10px]"
                          >
                            Inspect <ChevronRight className="ml-0.5 h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: RUNNING ALGORITHMS & CIRCUIT BREAKERS */}
      {activeTab === "algos" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="glass space-y-4 rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Zap className="h-4 w-4 text-primary" /> Active Algorithms Execution State
              </h2>
              <span className="text-xs text-muted-foreground num">
                {strategies.length} Strategies Configured
              </span>
            </div>

            <div className="space-y-3">
              {strategies.map((strat) => {
                const rule = strategyCircuitBreaker.getRule(strat.id);
                const isHalted = rule?.isTriggered;

                return (
                  <div
                    key={strat.id}
                    className="rounded-xl border border-border/80 bg-surface/40 p-4 transition-all hover:border-border"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{strat.name}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold num",
                              isHalted
                                ? "bg-bear/20 text-bear"
                                : strat.status === "LIVE"
                                  ? "bg-bull/20 text-bull"
                                  : "bg-info/20 text-info",
                            )}
                          >
                            {isHalted ? "RISK_HALTED" : strat.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{strat.entry}</p>
                      </div>

                      <div className="flex items-center gap-3 text-xs num">
                        <div>
                          <span className="text-muted-foreground">Win Rate: </span>
                          <span className="font-semibold text-bull">{strat.winRate}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P&L: </span>
                          <span
                            className={cn("font-bold", strat.pnl >= 0 ? "text-bull" : "text-bear")}
                          >
                            ₹{strat.pnl.toLocaleString("en-IN")}
                          </span>
                        </div>

                        {isHalted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetCircuit(strat.id)}
                            className="h-7 border-bull/50 text-bull hover:bg-bull/10"
                          >
                            <RefreshCw className="mr-1 h-3 w-3" /> Reset Circuit
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conflict Detector Panel */}
          <div className="glass space-y-4 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <h2>Strategy Conflict Matrix</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time heuristic conflict detection prevents contradictory positions across
              simultaneous strategies.
            </p>

            <div className="space-y-2.5">
              {conflicts.length === 0 ? (
                <div className="rounded-xl border border-bull/30 bg-bull/5 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-bull" />
                  <p className="mt-2 text-xs font-semibold text-bull">No Execution Conflicts</p>
                  <p className="text-[10px] text-muted-foreground">
                    All active strategies aligned.
                  </p>
                </div>
              ) : (
                conflicts.map((c, i) => (
                  <div key={i} className="rounded-xl border border-bear/30 bg-bear/5 p-3 text-xs">
                    <p className="font-bold text-bear">{c.symbol} Conflict</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {c.reason ||
                        `Opposing signals detected on ${c.symbol} under ${c.resolutionPolicy} policy.`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POSITION SIZING & OPTIMIZATION */}
      {activeTab === "parameters" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Position Sizer Calculator */}
          <div className="glass space-y-4 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sliders className="h-4 w-4 text-primary" /> Mathematical Position Sizer
            </h2>
            <p className="text-xs text-muted-foreground">
              Formula:{" "}
              <code className="rounded bg-surface-3 px-1.5 py-0.5 text-foreground font-mono">
                Risk Budget / |Entry - StopLoss|
              </code>
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-muted-foreground">Account Capital (₹)</label>
                <input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 num text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Risk Budget (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPct}
                  onChange={(e) => setRiskPct(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 num text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Entry Price (₹)</label>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 num text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Stop Loss Price (₹)</label>
                <input
                  type="number"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 num text-xs outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-2 text-xs num">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Risk Budget:</span>
                <span className="font-bold text-foreground">
                  ₹{sizingResult.maxRiskAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Per Share:</span>
                <span className="font-bold text-foreground">₹{sizingResult.riskPerShare}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold border-t border-primary/20 pt-2 text-primary">
                <span>Recommended Quantity:</span>
                <span>{sizingResult.recommendedQty} Qty</span>
              </div>
            </div>
          </div>

          {/* Grid Search Parameter Optimizer */}
          <div className="glass space-y-4 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" /> Grid Search Optimizer (EMA 9/21)
            </h2>
            <p className="text-xs text-muted-foreground">
              Parameter sweep evaluating Sharpe Ratio and Profit Factor on validated historical tick
              bars.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-[10px] uppercase text-muted-foreground text-left">
                    <th className="pb-2">Fast EMA</th>
                    <th className="pb-2">Slow EMA</th>
                    <th className="pb-2 text-right">Sharpe</th>
                    <th className="pb-2 text-right">Win Rate</th>
                    <th className="pb-2 text-right">Profit Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 num">
                  {optResults.slice(0, 5).map((r, i) => (
                    <tr key={i} className="hover:bg-surface-2/40">
                      <td className="py-2.5 font-bold text-foreground">{r.parameters.emaFast}</td>
                      <td className="py-2.5 font-bold text-foreground">{r.parameters.emaSlow}</td>
                      <td className="py-2.5 text-right font-bold text-primary">
                        {r.sharpeRatio.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-bull">{r.winRatePct}%</td>
                      <td className="py-2.5 text-right font-semibold">
                        {r.profitFactor.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ORDER LIFECYCLE STEPPER DIALOG */}
      {selectedOrderForStepper && (
        <Dialog
          open={!!selectedOrderForStepper}
          onOpenChange={() => setSelectedOrderForStepper(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>ORDER #{selectedOrderForStepper.id}</span>
                <span
                  className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-bold",
                    selectedOrderForStepper.side === "BUY"
                      ? "bg-bull/20 text-bull"
                      : "bg-bear/20 text-bear",
                  )}
                >
                  {selectedOrderForStepper.side} {selectedOrderForStepper.qty}{" "}
                  {selectedOrderForStepper.symbol}
                </span>
              </DialogTitle>
              <DialogDescription className="num">
                {selectedOrderForStepper.symbol} @ ₹{selectedOrderForStepper.price} · Created at{" "}
                {new Date(selectedOrderForStepper.createdAt).toLocaleTimeString()} IST
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
                      className={cn(
                        "absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold",
                        step.passed
                          ? "bg-bull text-bull-foreground"
                          : "bg-bear text-bear-foreground",
                      )}
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
