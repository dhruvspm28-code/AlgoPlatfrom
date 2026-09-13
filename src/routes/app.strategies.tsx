import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Blocks,
  Play,
  Pause,
  ShieldCheck,
  Ban,
  Plus,
  Copy,
  Trash2,
  BarChart3,
  Activity,
  Layers,
  Search,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Clock,
  TrendingUp,
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
import { cn } from "@/lib/utils";
import { type Strategy } from "@/data/platform";

export const Route = createFileRoute("/app/strategies")({
  head: () => ({
    meta: [
      { title: "Quantitative Strategies — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Manage, activate, and monitor algorithmic trading strategies with deterministic execution rules.",
      },
    ],
  }),
  component: StrategiesPage,
});

// Institutional performance metrics for strategies
const STRATEGY_QUANT_METRICS: Record<
  string,
  {
    sharpe: number;
    maxDrawdown: number;
    profitFactor: number;
    expectancy: number;
    trades: number;
    market: string;
    lastSignal: string;
  }
> = {
  "STR-001": {
    sharpe: 1.84,
    maxDrawdown: 4.2,
    profitFactor: 1.92,
    expectancy: 0.64,
    trades: 142,
    market: "NIFTY 50 / BANK NIFTY",
    lastSignal: "BUY @ ₹2,984.40 (11:20 IST)",
  },
  "STR-002": {
    sharpe: 1.45,
    maxDrawdown: 5.1,
    profitFactor: 1.68,
    expectancy: 0.42,
    trades: 98,
    market: "NSE Large-Cap Cash",
    lastSignal: "BUY @ ₹1,284.05 (10:15 IST)",
  },
  "STR-003": {
    sharpe: 2.12,
    maxDrawdown: 3.8,
    profitFactor: 2.15,
    expectancy: 0.81,
    trades: 216,
    market: "INDEX F&O Intraday",
    lastSignal: "SELL @ ₹51,120.00 (09:45 IST)",
  },
  "STR-004": {
    sharpe: 1.32,
    maxDrawdown: 6.4,
    profitFactor: 1.54,
    expectancy: 0.38,
    trades: 64,
    market: "BANK NIFTY High Vol",
    lastSignal: "HOLD / NEUTRAL",
  },
  "STR-005": {
    sharpe: 1.62,
    maxDrawdown: 4.9,
    profitFactor: 1.76,
    expectancy: 0.52,
    trades: 88,
    market: "NSE Momentum Universe",
    lastSignal: "BUY @ ₹1,912.30 (10:30 IST)",
  },
};

function StrategiesPage() {
  const navigate = useNavigate();
  const {
    strategies,
    toggleStrategyStatus,
    addStrategy,
    deleteStrategy,
    duplicateStrategy,
    globalTradingState,
    stopAllAlgorithms,
    cancelPendingOrders,
    exitAllPositions,
  } = usePlatform();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedStrategyDetail, setSelectedStrategyDetail] = useState<Strategy | null>(null);

  // New Strategy Creation Modal State
  const [isNewStrategyModalOpen, setIsNewStrategyModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");
  const [newStrategyInstrument, setNewStrategyInstrument] = useState("NIFTY 50 Index Futures");
  const [newStrategyTimeframe, setNewStrategyTimeframe] = useState("15m");
  const [newStrategyRisk, setNewStrategyRisk] = useState(1.0);
  const [newStrategyStopLoss, setNewStrategyStopLoss] = useState(1.5);
  const [newStrategyTarget, setNewStrategyTarget] = useState(3.0);

  // Top metric counters
  const totalStrategies = strategies.length;
  const activeStrategies = strategies.filter((s) => s.status === "LIVE").length;
  const paperStrategies = strategies.filter((s) => s.status === "PAPER").length;
  const pausedStrategies = strategies.filter((s) => s.status === "DRAFT").length;

  const filteredStrategies = useMemo(() => {
    return strategies.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.indicators.some((ind) => ind.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [strategies, search, statusFilter]);

  const handleToggle = (id: string, currentStatus: "LIVE" | "PAPER" | "DRAFT") => {
    try {
      if (currentStatus === "LIVE") {
        toggleStrategyStatus(id, "DRAFT");
        toast.info("Strategy paused (set to DRAFT)");
      } else if (currentStatus === "PAPER") {
        toggleStrategyStatus(id, "LIVE");
        toast.success("Strategy promoted to LIVE execution");
      } else {
        toggleStrategyStatus(id, "PAPER");
        toast.info("Strategy activated in PAPER mode");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update strategy status";
      toast.error(msg);
    }
  };

  const handleCreateStrategy = () => {
    if (!newStrategyName.trim()) {
      toast.error("Strategy name is required");
      return;
    }
    const newId = `STR-${Date.now().toString().slice(-4)}`;
    const newStrat: Strategy = {
      id: newId,
      name: newStrategyName.trim(),
      indicators: ["EMA", "RSI", "MACD"],
      timeframe: newStrategyTimeframe,
      entry: "RSI(14) < 30 AND Close > EMA(21)",
      exit: `SL: ${newStrategyStopLoss}% | TGT: ${newStrategyTarget}%`,
      stopLoss: newStrategyStopLoss,
      target: newStrategyTarget,
      risk: newStrategyRisk,
      positionSize: 25,
      status: "PAPER",
      winRate: 0,
      pnl: 0,
      lastModified: "Today, Just now",
      instrument: newStrategyInstrument,
      trailingStop: 1.0,
    };
    addStrategy(newStrat);
    setIsNewStrategyModalOpen(false);
    setNewStrategyName("");
    toast.success(`Strategy "${newStrat.name}" created in PAPER mode`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Quantitative Strategies"
          subtitle="Algorithmic execution models, broker execution lifecycles, and risk mandate configurations."
        />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsNewStrategyModalOpen(true)}
            className="text-xs font-semibold h-8"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> + New Strategy
          </Button>
        </div>
      </div>

      {/* TOP METRICS STRIP */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Live Strategies"
          value={String(activeStrategies)}
          icon={<Activity className="h-4 w-4" />}
          footnote="Routing real-time signals"
        />
        <StatCard
          label="Paper Strategies"
          value={String(paperStrategies)}
          icon={<Layers className="h-4 w-4" />}
          footnote="Simulated execution sandbox"
        />
        <StatCard
          label="Paused Strategies"
          value={String(pausedStrategies)}
          icon={<Pause className="h-4 w-4" />}
          footnote="Draft or idle algorithms"
        />
        <StatCard
          label="Total Registered Strategies"
          value={String(totalStrategies)}
          icon={<Blocks className="h-4 w-4" />}
          footnote="Rule pipelines configured"
        />
      </div>

      {/* EMERGENCY EXECUTION CONTROLS */}
      <GlassCard className="p-4 border-bear/30 bg-bear/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 text-bear">
              <ShieldCheck className="h-4 w-4" /> Granular Execution Controls
            </h3>
            <p className="text-xs text-muted-foreground">
              Overrides apply immediately without altering historical data or model configurations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                stopAllAlgorithms();
                toast.info("All algorithmic strategies paused");
              }}
              className="text-xs h-7"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5 text-warn" /> Stop All Algos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const count = cancelPendingOrders();
                toast.info(`Cancelled ${count} pending orders`);
              }}
              className="text-xs h-7"
            >
              Cancel Orders
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const count = exitAllPositions();
                toast.warning(`Liquidated ${count} positions`);
              }}
              className="text-xs h-7"
            >
              Exit All Positions
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* SEARCH AND FILTER BAR */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search strategies by name, ID, or indicators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="LIVE">LIVE Execution</option>
            <option value="PAPER">PAPER Simulated</option>
            <option value="DRAFT">DRAFT / Paused</option>
          </select>
        </div>
      </GlassCard>

      {/* STRATEGIES GRID */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredStrategies.map((s) => {
          const metrics = STRATEGY_QUANT_METRICS[s.id] || {
            sharpe: 1.5,
            maxDrawdown: 4.5,
            profitFactor: 1.75,
            expectancy: 0.5,
            trades: 100,
            market: s.instrument || "NSE Large-Cap",
            lastSignal: "HOLD / NEUTRAL",
          };

          return (
            <GlassCard
              key={s.id}
              className={cn(
                "p-5 flex flex-col justify-between transition-all",
                s.status === "LIVE" ? "border-bull/40 shadow-sm shadow-bull/5" : "border-border/80",
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{s.id}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          s.status === "LIVE"
                            ? "bg-bull/10 text-bull border-bull/30"
                            : s.status === "PAPER"
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-surface-2 text-muted-foreground border-border",
                        )}
                      >
                        {s.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {s.timeframe || "15m"}
                      </span>
                    </div>
                    <h4 className="mt-1 font-semibold text-sm text-foreground">{s.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.instrument || metrics.market}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        duplicateStrategy(s.id);
                        toast.success(`Duplicated ${s.name}`);
                      }}
                      title="Duplicate Strategy"
                      className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (strategies.length <= 1) {
                          toast.error("Cannot delete the last strategy");
                          return;
                        }
                        deleteStrategy(s.id);
                        toast.info(`Deleted ${s.name}`);
                      }}
                      title="Delete Strategy"
                      className="p-1 text-muted-foreground hover:text-bear rounded transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* INDICATORS & RISK PERKS */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {s.indicators.map((ind) => (
                    <span
                      key={ind}
                      className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium"
                    >
                      {ind}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground ml-auto num font-mono">
                    SL: {s.stopLoss}% · TGT: {s.target}%
                  </span>
                </div>

                {/* LAST SIGNAL & QUANT METRICS */}
                <div className="mt-3 p-2.5 rounded-lg bg-surface-2/40 border border-border/60 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Last Signal:</span>
                    <span className="font-mono font-semibold text-primary">
                      {metrics.lastSignal}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/50 text-center num text-[11px]">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Sharpe</span>
                      <span className="font-semibold">{metrics.sharpe}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Max DD</span>
                      <span className="font-semibold text-bear">-{metrics.maxDrawdown}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Profit Factor</span>
                      <span className="font-semibold text-bull">{metrics.profitFactor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER CONTROLS */}
              <div className="border-t border-border/60 pt-3 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs num">
                  <div>
                    <p className="text-muted-foreground text-[10px]">Win Rate</p>
                    <p className="font-bold text-bull">{s.winRate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px]">Simulated P&L</p>
                    <p className={`font-bold ${s.pnl >= 0 ? "text-bull" : "text-bear"}`}>
                      {inr(s.pnl)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedStrategyDetail(s)}
                    className="text-xs h-7 px-2"
                  >
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: "/app/backtest" })}
                    className="text-xs h-7 px-2"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" /> Backtest
                  </Button>
                  <Button
                    size="sm"
                    variant={s.status === "LIVE" ? "destructive" : "outline"}
                    disabled={globalTradingState === "HALTED" && s.status !== "LIVE"}
                    onClick={() => handleToggle(s.id, s.status)}
                    className="text-xs h-7 px-2.5"
                  >
                    {s.status === "LIVE" ? (
                      <>
                        <Pause className="mr-1 h-3 w-3" /> Pause
                      </>
                    ) : s.status === "PAPER" ? (
                      <>
                        <Play className="mr-1 h-3 w-3 text-bull" /> Deploy Live
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3 w-3" /> Test Paper
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* STRATEGY DETAILS MODAL */}
      <Dialog
        open={!!selectedStrategyDetail}
        onOpenChange={(open) => !open && setSelectedStrategyDetail(null)}
      >
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Blocks className="h-4 w-4 text-primary" /> {selectedStrategyDetail?.name} (
              {selectedStrategyDetail?.id})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Institutional quantitative configuration and deterministic execution parameters.
            </DialogDescription>
          </DialogHeader>

          {selectedStrategyDetail && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-surface-2 border border-border">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Instrument</span>
                  <span className="font-semibold">
                    {selectedStrategyDetail.instrument || "NIFTY 50 Futures"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Timeframe</span>
                  <span className="font-mono font-semibold">
                    {selectedStrategyDetail.timeframe || "15m"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Status</span>
                  <span className="font-mono font-bold">{selectedStrategyDetail.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Risk / Trade</span>
                  <span className="font-mono font-semibold">{selectedStrategyDetail.risk}%</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-2/60 border border-border space-y-1.5">
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                  Entry Logic Rule
                </span>
                <p className="font-mono text-xs text-foreground bg-surface p-2 rounded border border-border/80">
                  {selectedStrategyDetail.entry}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-2/60 border border-border space-y-1.5">
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                  Exit Conditions
                </span>
                <p className="font-mono text-xs text-foreground bg-surface p-2 rounded border border-border/80">
                  {selectedStrategyDetail.exit}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setSelectedStrategyDetail(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE NEW STRATEGY MODAL */}
      <Dialog open={isNewStrategyModalOpen} onOpenChange={setIsNewStrategyModalOpen}>
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Create New Algorithmic Strategy
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register a new systematic execution model with platform risk guardrails.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Strategy Name</label>
              <input
                type="text"
                placeholder="e.g. Nifty Volatility Breakout Alpha"
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Target Instrument
                </label>
                <select
                  value={newStrategyInstrument}
                  onChange={(e) => setNewStrategyInstrument(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option>NIFTY 50 Index Futures</option>
                  <option>BANK NIFTY Index Futures</option>
                  <option>RELIANCE</option>
                  <option>TCS</option>
                  <option>HDFCBANK</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Timeframe</label>
                <select
                  value={newStrategyTimeframe}
                  onChange={(e) => setNewStrategyTimeframe(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="1D">1D</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Risk / Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStrategyRisk}
                  onChange={(e) => setNewStrategyRisk(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Stop Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStrategyStopLoss}
                  onChange={(e) => setNewStrategyStopLoss(parseFloat(e.target.value) || 1.5)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Target (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStrategyTarget}
                  onChange={(e) => setNewStrategyTarget(parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewStrategyModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateStrategy} className="text-xs font-bold">
              Register Strategy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
