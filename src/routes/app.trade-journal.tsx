/**
 * Trade Journal Workstation for SmartQuant Edge.
 * Institutional trade analysis, review, notes, tagging, rating,
 * and 9-stage verifiable "Explain This Trade" audit trail chain.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Filter,
  BrainCircuit,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Tag,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  X,
  Share2,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/context/PlatformContext";
import { CENTRAL_DEMO_DATA, JournalTrade } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/trade-journal")({
  head: () => ({
    meta: [
      { title: "Trade Journal — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Review, annotate and explain executed trades with 9-stage algorithmic audit chains, execution quality, and performance attribution.",
      },
    ],
  }),
  component: TradeJournalPage,
});

function TradeJournalPage() {
  const { isLiveTrading, openExplainModal } = usePlatform();

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("ALL");
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [sideFilter, setSideFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [resultFilter, setResultFilter] = useState<"ALL" | "WIN" | "LOSS" | "BREAKEVEN">("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Selected trade for drawer
  const [selectedTrade, setSelectedTrade] = useState<JournalTrade | null>(null);

  // Local interactive notes and ratings for user engagement
  const [tradeNotes, setTradeNotes] = useState<Record<string, string>>({
    "TJ-2026-089": "Clean breakout after morning consolidation. Trailed stop loss properly.",
    "TJ-2026-088": "Mean reversion exit triggered right at upper Bollinger Band.",
  });
  const [tradeRatings, setTradeRatings] = useState<Record<string, number>>({
    "TJ-2026-089": 5,
    "TJ-2026-088": 4,
  });
  const [currentNote, setCurrentNote] = useState("");

  const isDemo = !isLiveTrading;
  const rawTrades: JournalTrade[] = CENTRAL_DEMO_DATA.journalTrades;

  // Filtered dataset
  const filteredTrades = useMemo(() => {
    return rawTrades.filter((t) => {
      const matchSearch =
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStrategy = strategyFilter === "ALL" || t.strategy === strategyFilter;
      const matchSymbol = symbolFilter === "ALL" || t.symbol === symbolFilter;
      const matchSide = sideFilter === "ALL" || t.side === sideFilter;
      const matchResult = resultFilter === "ALL" || t.result === resultFilter;
      const matchDate = dateFilter === "ALL" || t.date === dateFilter;

      return matchSearch && matchStrategy && matchSymbol && matchSide && matchResult && matchDate;
    });
  }, [rawTrades, searchQuery, strategyFilter, symbolFilter, sideFilter, resultFilter, dateFilter]);

  // Top metric calculations
  const stats = useMemo(() => {
    const total = filteredTrades.length;
    if (total === 0) {
      return { total: 0, winRate: 0, netPnL: 0, avgTrade: 0, bestTrade: 0, worstTrade: 0 };
    }

    const wins = filteredTrades.filter((t) => t.result === "WIN");
    const winRate = (wins.length / total) * 100;
    const netPnL = filteredTrades.reduce((acc, t) => acc + t.netPnl, 0);
    const avgTrade = netPnL / total;
    const bestTrade = Math.max(...filteredTrades.map((t) => t.netPnl));
    const worstTrade = Math.min(...filteredTrades.map((t) => t.netPnl));

    return { total, winRate, netPnL, avgTrade, bestTrade, worstTrade };
  }, [filteredTrades]);

  // Dropdown lists
  const uniqueStrategies = useMemo(
    () => Array.from(new Set(rawTrades.map((t) => t.strategy))),
    [rawTrades],
  );
  const uniqueSymbols = useMemo(
    () => Array.from(new Set(rawTrades.map((t) => t.symbol))),
    [rawTrades],
  );
  const uniqueDates = useMemo(() => Array.from(new Set(rawTrades.map((t) => t.date))), [rawTrades]);

  const handleOpenDrawer = (trade: JournalTrade) => {
    setSelectedTrade(trade);
    setCurrentNote(tradeNotes[trade.id] || trade.notes || "");
  };

  const handleSaveNote = () => {
    if (!selectedTrade) return;
    setTradeNotes((prev) => ({ ...prev, [selectedTrade.id]: currentNote }));
    toast.success("Trade note saved", {
      description: `Annotated trade ${selectedTrade.id}`,
    });
  };

  const handleSetRating = (stars: number) => {
    if (!selectedTrade) return;
    setTradeRatings((prev) => ({ ...prev, [selectedTrade.id]: stars }));
    toast.success("Rating updated", {
      description: `Rated ${stars} stars`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="h-6 w-6 text-primary" />
              Trade Journal
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
              {isDemo ? "PAPER DEMO DATA" : "LIVE BROKER FILLS"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review, annotate and explain executed trades with complete 9-stage algorithmic audit
            trails
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDemo && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-amber-400" />
              <span>Simulated Journal Dataset</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. TOP METRICS STRIP (6 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="TOTAL TRADES" value={stats.total.toString()} subtext="Executed fills" />
        <StatCard
          label="WIN RATE"
          value={`${stats.winRate.toFixed(1)}%`}
          subtext={`${filteredTrades.filter((t) => t.result === "WIN").length}W / ${filteredTrades.filter((t) => t.result === "LOSS").length}L`}
          trend={stats.winRate >= 50 ? "up" : "down"}
          variant={stats.winRate >= 50 ? "success" : "warning"}
        />
        <StatCard
          label="NET P&L"
          value={inr(stats.netPnL)}
          subtext="After simulated fees"
          trend={stats.netPnL >= 0 ? "up" : "down"}
          variant={stats.netPnL >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="AVG TRADE"
          value={inr(stats.avgTrade)}
          subtext="Per completed roundtrip"
          variant={stats.avgTrade >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="BEST TRADE"
          value={`+${inr(stats.bestTrade)}`}
          subtext="Peak profitable fill"
          variant="success"
        />
        <StatCard
          label="WORST TRADE"
          value={inr(stats.worstTrade)}
          subtext="Max loss fill"
          variant="danger"
        />
      </div>

      {/* 3. FILTERS BAR */}
      <GlassCard className="p-4 space-y-3 bg-card/60">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by symbol, strategy, or trade ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Strategy Filter */}
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
          >
            <option value="ALL">All Strategies ({uniqueStrategies.length})</option>
            {uniqueStrategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Symbol Filter */}
          <select
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
          >
            <option value="ALL">All Symbols ({uniqueSymbols.length})</option>
            {uniqueSymbols.map((sym) => (
              <option key={sym} value={sym}>
                {sym}
              </option>
            ))}
          </select>

          {/* Side Filter */}
          <select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as "ALL" | "BUY" | "SELL")}
            className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
          >
            <option value="ALL">All Sides</option>
            <option value="BUY">BUY Long</option>
            <option value="SELL">SELL Short</option>
          </select>

          {/* Result Filter */}
          <select
            value={resultFilter}
            onChange={(e) =>
              setResultFilter(e.target.value as "ALL" | "WIN" | "LOSS" | "BREAKEVEN")
            }
            className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">WIN Trades</option>
            <option value="LOSS">LOSS Trades</option>
            <option value="BREAKEVEN">Breakeven</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
          >
            <option value="ALL">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* 4. MAIN TRADE JOURNAL TABLE */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
              <tr>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-3">Side</th>
                <th className="py-3 px-3">Strategy</th>
                <th className="py-3 px-3 text-right">Entry Price</th>
                <th className="py-3 px-3 text-right">Exit Price</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Net P&L</th>
                <th className="py-3 px-3 text-right">P&L %</th>
                <th className="py-3 px-3 text-center">Duration</th>
                <th className="py-3 px-3 text-center">Result</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted-foreground font-sans">
                    No trade journal records found matching the active filters.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isWin = t.result === "WIN";
                  const isLoss = t.result === "LOSS";

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenDrawer(t)}
                      className="hover:bg-secondary/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 font-sans">
                        <div className="font-medium text-foreground">{t.date}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{t.time}</div>
                      </td>
                      <td className="py-3 px-3 font-sans font-bold text-foreground">{t.symbol}</td>
                      <td className="py-3 px-3 font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-bold",
                            t.side === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30",
                          )}
                        >
                          {t.side}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-sans text-muted-foreground max-w-[150px] truncate">
                        {t.strategy}
                      </td>
                      <td className="py-3 px-3 text-right text-foreground">{inr(t.entryPrice)}</td>
                      <td className="py-3 px-3 text-right text-foreground">{inr(t.exitPrice)}</td>
                      <td className="py-3 px-3 text-right text-muted-foreground">{t.quantity}</td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={cn(
                            "font-bold",
                            isWin
                              ? "text-emerald-400"
                              : isLoss
                                ? "text-rose-400"
                                : "text-muted-foreground",
                          )}
                        >
                          {t.netPnl >= 0 ? "+" : ""}
                          {inr(t.netPnl)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={cn(
                            "font-semibold",
                            isWin
                              ? "text-emerald-400"
                              : isLoss
                                ? "text-rose-400"
                                : "text-muted-foreground",
                          )}
                        >
                          {t.pnlPercent >= 0 ? "+" : ""}
                          {t.pnlPercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground font-sans">
                        {t.duration}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-bold",
                            isWin
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : isLoss
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {t.result}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openExplainModal(t.id);
                          }}
                          className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <BrainCircuit className="h-3.5 w-3.5" />
                          Explain
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

      {/* 5. TRADE DETAIL DRAWER */}
      {selectedTrade && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-card border-l border-border shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-5">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">{selectedTrade.symbol}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-0.5",
                      selectedTrade.side === "BUY"
                        ? "text-emerald-400 border-emerald-500/30"
                        : "text-rose-400 border-rose-500/30",
                    )}
                  >
                    {selectedTrade.side}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-0.5",
                      selectedTrade.result === "WIN"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400",
                    )}
                  >
                    {selectedTrade.result}
                  </Badge>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  ID: {selectedTrade.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Trade Summary Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-secondary/30">
                <span className="text-[10px] text-muted-foreground block font-sans">
                  Entry Price
                </span>
                <span className="text-base font-bold text-foreground">
                  {inr(selectedTrade.entryPrice)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <span className="text-[10px] text-muted-foreground block font-sans">
                  Exit Price
                </span>
                <span className="text-base font-bold text-foreground">
                  {inr(selectedTrade.exitPrice)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <span className="text-[10px] text-muted-foreground block font-sans">Net P&L</span>
                <span
                  className={cn(
                    "text-base font-bold",
                    selectedTrade.netPnl >= 0 ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {selectedTrade.netPnl >= 0 ? "+" : ""}
                  {inr(selectedTrade.netPnl)} ({selectedTrade.pnlPercent.toFixed(2)}%)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <span className="text-[10px] text-muted-foreground block font-sans">
                  Quantity & Duration
                </span>
                <span className="text-sm font-bold text-foreground">
                  {selectedTrade.quantity} Qty · {selectedTrade.duration}
                </span>
              </div>
            </div>

            {/* Strategy Info */}
            <div className="p-3 rounded-lg bg-secondary/20 border border-border/40 space-y-1 text-xs">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Generating Strategy
              </span>
              <span className="font-semibold text-foreground">{selectedTrade.strategy}</span>
            </div>

            {/* "Explain This Trade" 9-Stage Trigger CTA */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <span className="text-sm font-bold text-white">Explain This Trade</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-primary/20 text-primary border-primary/40"
                >
                  9 Stages
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inspect the algorithmic evidence chain: Market Data → Indicators → Conditions →
                Signal → Sizing → Risk → Order → Fill → P&L.
              </p>
              <Button
                size="sm"
                onClick={() => openExplainModal(selectedTrade.id)}
                className="w-full text-xs font-semibold gap-1.5 mt-1"
              >
                Launch 9-Stage Visual Explainer
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Rating Stars */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Execution Quality Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleSetRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        star <= (tradeRatings[selectedTrade.id] || 0)
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                ))}
                <span className="text-xs text-muted-foreground ml-2">
                  {(tradeRatings[selectedTrade.id] || 0) > 0
                    ? `${tradeRatings[selectedTrade.id]}/5 Stars`
                    : "Unrated"}
                </span>
              </div>
            </div>

            {/* Notes & Annotations */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Trader Notes & Journal Annotation
              </label>
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Record your psychological state, trade management notes, or setup observations..."
                rows={3}
                className="w-full bg-secondary/50 border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNote}
                className="mt-2 text-xs h-8 border-border hover:bg-secondary"
              >
                Save Annotation
              </Button>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>Executed on Simulated DhanHQ Feed</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTrade(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
