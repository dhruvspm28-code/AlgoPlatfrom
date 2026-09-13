/**
 * Positions Workstation Terminal for SmartQuant Edge.
 * Real-time mark-to-market open position ledger, risk controls, and 9-stage trade explanations.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Wallet,
  Layers,
  Search,
  RefreshCw,
  Power,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  ShieldCheck,
  Percent,
  Sliders,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { usePlatform } from "@/context/PlatformContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEMO_POSITIONS,
  DEMO_PORTFOLIO_TOTALS,
  type ConsistentPosition,
} from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";
import { paperBroker } from "@/services/paper-broker";

export const Route = createFileRoute("/app/positions")({
  head: () => ({
    meta: [
      { title: "Positions Terminal — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Open paper positions, tick-by-tick mark-to-market valuations, exposure weights, and 9-stage Explain This Trade audits.",
      },
    ],
  }),
  component: PositionsPage,
});

function PositionsPage() {
  const navigate = useNavigate();
  const { openExplainModal, exitAllPositions } = usePlatform();

  // Positions dataset initialized from deterministic central repository
  const [positions, setPositions] = useState<ConsistentPosition[]>(DEMO_POSITIONS);
  const [activeTab, setActiveTab] = useState<"ALL" | "INTRADAY" | "DELIVERY">("ALL");
  const [search, setSearch] = useState("");
  const [strategyFilter, setStrategyFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"pnl" | "currentValue" | "symbol">("pnl");

  // Position detail drawer state
  const [selectedPosition, setSelectedPosition] = useState<ConsistentPosition | null>(null);

  // Modify Stop Loss / Target Modal state
  const [editingPosition, setEditingPosition] = useState<ConsistentPosition | null>(null);
  const [modStopLoss, setModStopLoss] = useState(0);
  const [modTarget, setModTarget] = useState(0);

  // Calculations
  const openCount = positions.length;
  const totalInvested = positions.reduce((acc, p) => acc + p.invested, 0);
  const currentValue = positions.reduce((acc, p) => acc + p.currentValue, 0);
  const dayPnl = positions.reduce((acc, p) => acc + p.dayPnl, 0);
  const totalPnl = positions.reduce((acc, p) => acc + p.pnl, 0);
  const longExposure = positions
    .filter((p) => p.side === "LONG")
    .reduce((acc, p) => acc + p.currentValue, 0);
  const shortExposure = positions
    .filter((p) => p.side === "SHORT")
    .reduce((acc, p) => acc + p.currentValue, 0);

  const uniqueStrategies = useMemo(
    () => Array.from(new Set(positions.map((p) => p.strategy))),
    [positions],
  );

  const filteredPositions = useMemo(() => {
    return positions
      .filter((p) => {
        const matchSearch =
          p.symbol.toLowerCase().includes(search.toLowerCase()) ||
          p.strategy.toLowerCase().includes(search.toLowerCase());
        const matchTab = activeTab === "ALL" || p.product === activeTab;
        const matchStrat = strategyFilter === "ALL" || p.strategy === strategyFilter;
        return matchSearch && matchTab && matchStrat;
      })
      .sort((a, b) => {
        if (sortBy === "pnl") return b.pnl - a.pnl;
        if (sortBy === "currentValue") return b.currentValue - a.currentValue;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [positions, search, activeTab, strategyFilter, sortBy]);

  const handleSquareOffSingle = (symbol: string) => {
    try {
      paperBroker.exitPosition(symbol);
    } catch {
      // ignore
    }
    setPositions((prev) => prev.filter((p) => p.symbol !== symbol));
    if (selectedPosition?.symbol === symbol) setSelectedPosition(null);
    toast.warning(`Position squared off: ${symbol}`);
  };

  const handleSquareOffAll = () => {
    exitAllPositions();
    setPositions([]);
    toast.warning(`All ${positions.length} open positions liquidated`);
  };

  const handleSaveModification = () => {
    if (!editingPosition) return;
    setPositions((prev) =>
      prev.map((p) =>
        p.symbol === editingPosition.symbol
          ? { ...p, stopLoss: modStopLoss, target: modTarget }
          : p,
      ),
    );
    setEditingPosition(null);
    toast.success(`Guardrails updated for ${editingPosition.symbol}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Positions"
            subtitle="Open paper positions and mark-to-market exposure."
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-primary/10 border-primary/30 text-primary text-[11px] font-mono font-bold px-2.5 py-1"
          >
            PAPER / DEMO DATA
          </Badge>

          {positions.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleSquareOffAll}
              className="h-8 text-xs font-bold"
            >
              <Power className="mr-1.5 h-3.5 w-3.5" /> Square Off All
            </Button>
          )}
        </div>
      </div>

      {/* TOP METRIC STRIP */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 text-xs num">
        <GlassCard className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            OPEN POSITIONS
          </span>
          <p className="text-base font-bold text-primary font-mono">{openCount} active</p>
          <span className="text-[10px] text-muted-foreground">Deterministic paper</span>
        </GlassCard>

        <GlassCard className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            TOTAL INVESTED
          </span>
          <p className="text-base font-bold text-foreground font-mono">{inr(totalInvested)}</p>
          <span className="text-[10px] text-muted-foreground">Deployed capital</span>
        </GlassCard>

        <GlassCard className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            CURRENT VALUE
          </span>
          <p className="text-base font-bold text-foreground font-mono">{inr(currentValue)}</p>
          <span className="text-[10px] text-muted-foreground">Real-time MTM</span>
        </GlassCard>

        <GlassCard className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            DAY P&L
          </span>
          <p
            className={cn("text-base font-bold font-mono", dayPnl >= 0 ? "text-bull" : "text-bear")}
          >
            {inr(dayPnl)}
          </p>
          <span className="text-[10px] text-muted-foreground">Today's session</span>
        </GlassCard>

        <GlassCard className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            TOTAL P&L
          </span>
          <p
            className={cn(
              "text-base font-bold font-mono",
              totalPnl >= 0 ? "text-bull" : "text-bear",
            )}
          >
            {inr(totalPnl)}
          </p>
          <span className="text-[10px] text-muted-foreground">Since entry</span>
        </GlassCard>

        <GlassCard className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            LONG EXPOSURE
          </span>
          <p className="text-base font-bold text-bull font-mono">{inr(longExposure)}</p>
          <span className="text-[10px] text-muted-foreground">Bullish risk</span>
        </GlassCard>

        <GlassCard className="p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            SHORT EXPOSURE
          </span>
          <p className="text-base font-bold text-bear font-mono">{inr(shortExposure)}</p>
          <span className="text-[10px] text-muted-foreground">Bearish hedge</span>
        </GlassCard>
      </div>

      {/* FILTER CONTROLS BAR */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* TABS: ALL / INTRADAY / DELIVERY */}
          <div className="flex items-center gap-1 bg-surface-2/60 p-1 rounded-xl border border-border">
            {(["ALL", "INTRADAY", "DELIVERY"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeTab === tab
                    ? "bg-surface text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "ALL" ? `All (${positions.length})` : tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
            {/* SEARCH INPUT */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search symbol or strategy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            {/* STRATEGY FILTER */}
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="ALL">All Strategies</option>
              {uniqueStrategies.map((strat) => (
                <option key={strat} value={strat}>
                  {strat}
                </option>
              ))}
            </select>

            {/* SORT BY */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "pnl" | "currentValue" | "symbol")}
              className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="pnl">Sort by P&L</option>
              <option value="currentValue">Sort by Value</option>
              <option value="symbol">Sort by Symbol</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* POSITIONS TABLE */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2/60 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Avg Price</th>
                <th className="py-2.5 px-3 text-right">LTP</th>
                <th className="py-2.5 px-3 text-right">Invested</th>
                <th className="py-2.5 px-3 text-right">Current Value</th>
                <th className="py-2.5 px-3 text-right">Day P&L</th>
                <th className="py-2.5 px-3 text-right">Total P&L</th>
                <th className="py-2.5 px-3 text-right">P&L %</th>
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 num">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center font-sans">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-full bg-surface-2 flex items-center justify-center text-muted-foreground">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">No open positions</p>
                      <p className="text-xs text-muted-foreground">
                        Execute a paper trade or run a strategy from the Live Terminal.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => navigate({ to: "/app/live" })}
                        className="text-xs mt-2"
                      >
                        Go to Live Terminal
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => {
                  const isPositive = pos.pnl >= 0;
                  return (
                    <tr
                      key={pos.symbol}
                      onClick={() => setSelectedPosition(pos)}
                      className="hover:bg-surface-2/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 font-sans">
                        <span className="font-bold text-foreground block">{pos.symbol}</span>
                        <span className="text-[10px] text-muted-foreground block">
                          {pos.sector}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface border border-border">
                          {pos.product}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                            pos.side === "LONG" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear",
                          )}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold">{pos.qty}</td>
                      <td className="py-3 px-3 text-right">₹{pos.avgPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-bold text-foreground">
                        ₹{pos.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">{inr(pos.invested)}</td>
                      <td className="py-3 px-3 text-right font-semibold">
                        {inr(pos.currentValue)}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-3 text-right font-semibold",
                          pos.dayPnl >= 0 ? "text-bull" : "text-bear",
                        )}
                      >
                        {pos.dayPnl >= 0 ? "+" : ""}
                        {inr(pos.dayPnl)}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-3 text-right font-bold",
                          isPositive ? "text-bull" : "text-bear",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {inr(pos.pnl)}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-3 text-right font-bold",
                          isPositive ? "text-bull" : "text-bear",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {pos.pnlPct.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-sans">{pos.strategy}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-bull/10 text-bull">
                          {pos.status}
                        </span>
                      </td>
                      <td
                        className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPosition(pos);
                            setModStopLoss(pos.stopLoss);
                            setModTarget(pos.target);
                          }}
                          className="h-6 px-2 text-[10px]"
                        >
                          Modify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSquareOffSingle(pos.symbol)}
                          className="h-6 px-2 text-[10px] font-bold"
                        >
                          Square Off
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* POSITION DETAIL DRAWER / MODAL */}
      <Dialog open={!!selectedPosition} onOpenChange={(open) => !open && setSelectedPosition(null)}>
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{selectedPosition?.symbol}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedPosition?.side} · {selectedPosition?.product}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Managed by {selectedPosition?.strategy}
                </DialogDescription>
              </div>

              {selectedPosition && (
                <div className="text-right num">
                  <div
                    className={cn(
                      "text-base font-extrabold",
                      selectedPosition.pnl >= 0 ? "text-bull" : "text-bear",
                    )}
                  >
                    {inr(selectedPosition.pnl)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ({selectedPosition.pnlPct >= 0 ? "+" : ""}
                    {selectedPosition.pnlPct.toFixed(2)}%)
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedPosition && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-2 border border-border num">
                <div>
                  <span className="text-[10px] text-muted-foreground block">ENTRY PRICE</span>
                  <span className="font-semibold font-mono">
                    ₹{selectedPosition.avgPrice.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">CURRENT LTP</span>
                  <span className="font-semibold font-mono text-foreground">
                    ₹{selectedPosition.currentPrice.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">QUANTITY</span>
                  <span className="font-semibold font-mono">{selectedPosition.qty} Units</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">PORTFOLIO WEIGHT</span>
                  <span className="font-semibold font-mono text-primary">
                    {selectedPosition.portfolioWeight}%
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-2/60 border border-border space-y-2 num">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Stop Loss:</span>
                  <span className="font-bold text-bear">
                    ₹{selectedPosition.stopLoss.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Take-Profit Target:</span>
                  <span className="font-bold text-bull">₹{selectedPosition.target.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Risk at SL:</span>
                  <span className="font-bold text-bear">
                    {inr(
                      Math.abs(selectedPosition.currentPrice - selectedPosition.stopLoss) *
                        selectedPosition.qty,
                    )}
                  </span>
                </div>
              </div>

              {/* 9-STAGE EXPLAIN ACTION */}
              <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-4 w-4" /> Explain This Trade
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    View the full 9-stage deterministic algorithmic audit trail.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    openExplainModal("ORD-1024");
                    setSelectedPosition(null);
                  }}
                  className="h-8 text-xs font-semibold"
                >
                  Audit Trail
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            {selectedPosition && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleSquareOffSingle(selectedPosition.symbol)}
                className="text-xs font-bold"
              >
                Square Off Position
              </Button>
            )}
            <Button size="sm" onClick={() => setSelectedPosition(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODIFY STOP LOSS & TARGET MODAL */}
      <Dialog open={!!editingPosition} onOpenChange={(open) => !open && setEditingPosition(null)}>
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" /> Modify Position Guardrails —{" "}
              {editingPosition?.symbol}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Adjust automated stop loss and target profit price triggers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Stop Loss Trigger Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={modStopLoss}
                onChange={(e) => setModStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Take-Profit Target Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={modTarget}
                onChange={(e) => setModTarget(parseFloat(e.target.value) || 0)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPosition(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveModification} className="text-xs font-bold">
              Save Parameters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
