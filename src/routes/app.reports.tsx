import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Download,
  ShieldCheck,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Bell,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Activity,
  Trash2,
  Power,
  Eye,
  Printer,
  Plus,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { usePlatform } from "@/context/PlatformContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaSeries } from "@/components/charts/Charts";
import { equityCurve } from "@/data/market";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/reports")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: (search.tab as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Trade Journal & Execution Reports — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Institutional trade journaling with 9-stage Explain This Trade audit trails, quantitative execution reports, and real-time alerts center.",
      },
    ],
  }),
  component: ReportsPage,
});

interface JournalEntry {
  id: string;
  symbol: string;
  strategy: string;
  side: "BUY" | "SELL";
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPct: number;
  duration: string;
  result: "WIN" | "LOSS" | "BREAKEVEN";
  status: "CLOSED" | "SQUARED_OFF" | "OPEN";
  tags?: string[];
  notes?: string;
}

const INITIAL_JOURNAL_TRADES: JournalEntry[] = [
  {
    id: "ORD-1024",
    symbol: "RELIANCE",
    strategy: "EMA Crossover Pro",
    side: "BUY",
    entryTime: "2026-09-11 09:35",
    exitTime: "2026-09-11 11:20",
    entryPrice: 2984.4,
    exitPrice: 3012.0,
    qty: 35,
    pnl: 966.0,
    pnlPct: 0.92,
    duration: "1h 45m",
    result: "WIN",
    status: "CLOSED",
    tags: ["Confluence", "Momentum"],
    notes: "Clean breakout above 21 EMA with confirming volume surge.",
  },
  {
    id: "ORD-1021",
    symbol: "NIFTY 50",
    strategy: "Supertrend Momentum",
    side: "BUY",
    entryTime: "2026-09-11 10:15",
    exitTime: "2026-09-11 12:45",
    entryPrice: 24850.0,
    exitPrice: 24965.5,
    qty: 50,
    pnl: 5775.0,
    pnlPct: 0.46,
    duration: "2h 30m",
    result: "WIN",
    status: "CLOSED",
    tags: ["Index", "Supertrend"],
    notes: "Supertrend turned green on 15m candle close; target hit.",
  },
  {
    id: "ORD-1019",
    symbol: "TCS",
    strategy: "RSI Mean Reversion",
    side: "BUY",
    entryTime: "2026-09-10 13:00",
    exitTime: "2026-09-10 14:15",
    entryPrice: 4280.0,
    exitPrice: 4252.0,
    qty: 25,
    pnl: -700.0,
    pnlPct: -0.65,
    duration: "1h 15m",
    result: "LOSS",
    status: "CLOSED",
    tags: ["Mean Reversion"],
    notes: "Stop-loss hit after false bounce on IT sector weakness.",
  },
  {
    id: "ORD-1015",
    symbol: "BANK NIFTY",
    strategy: "EMA Crossover Pro",
    side: "SELL",
    entryTime: "2026-09-10 09:45",
    exitTime: "2026-09-10 15:15",
    entryPrice: 51400.0,
    exitPrice: 51120.0,
    qty: 30,
    pnl: 8400.0,
    pnlPct: 0.54,
    duration: "5h 30m",
    result: "WIN",
    status: "SQUARED_OFF",
    tags: ["Short", "EOD Exit"],
    notes: "Short continuation held until intraday 15:15 auto square-off.",
  },
  {
    id: "ORD-1012",
    symbol: "INFY",
    strategy: "MACD Trend Rider",
    side: "BUY",
    entryTime: "2026-09-09 11:30",
    exitTime: "2026-09-09 13:50",
    entryPrice: 1895.0,
    exitPrice: 1922.5,
    qty: 60,
    pnl: 1650.0,
    pnlPct: 1.45,
    duration: "2h 20m",
    result: "WIN",
    status: "CLOSED",
    tags: ["MACD", "Alpha"],
    notes: "MACD histogram flipped positive above zero line.",
  },
];

interface AlertRule {
  id: string;
  category: "PRICE" | "INDICATOR" | "STRATEGY" | "RISK" | "ORDER" | "FEED" | "KILL_SWITCH";
  symbol: string;
  trigger: string;
  threshold: string;
  currentValue: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  status: "ACTIVE" | "TRIGGERED" | "DISABLED";
  time: string;
}

const INITIAL_ALERTS: AlertRule[] = [
  {
    id: "ALT-001",
    category: "RISK",
    symbol: "PORTFOLIO",
    trigger: "Daily Loss > 80% of Limit",
    threshold: "₹20,000",
    currentValue: "₹0.00",
    severity: "CRITICAL",
    status: "ACTIVE",
    time: "Today, 09:15",
  },
  {
    id: "ALT-002",
    category: "PRICE",
    symbol: "RELIANCE",
    trigger: "LTP Crosses Above Resistance",
    threshold: "₹3,000.00",
    currentValue: "₹2,984.40",
    severity: "INFO",
    status: "ACTIVE",
    time: "Today, 10:30",
  },
  {
    id: "ALT-003",
    category: "FEED",
    symbol: "DHAN_SOCKET",
    trigger: "Feed Packet Stale > 5000ms",
    threshold: "5000ms",
    currentValue: "12ms",
    severity: "WARNING",
    status: "ACTIVE",
    time: "Today, 09:00",
  },
  {
    id: "ALT-004",
    category: "KILL_SWITCH",
    symbol: "SYSTEM",
    trigger: "Emergency Kill Switch Activated",
    threshold: "HALT_STATE",
    currentValue: "ARMED",
    severity: "CRITICAL",
    status: "ACTIVE",
    time: "Standby",
  },
];

function ReportsPage() {
  const { tab: queryTab } = Route.useSearch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"journal" | "audit" | "alerts" | "performance">(
    queryTab === "journal"
      ? "journal"
      : queryTab === "alerts"
        ? "alerts"
        : queryTab === "performance"
          ? "performance"
          : "audit",
  );

  const { orders, openExplainModal, notificationsList } = usePlatform();

  // Journal state
  const [journalTrades, setJournalTrades] = useState<JournalEntry[]>(INITIAL_JOURNAL_TRADES);
  const [journalSearch, setJournalSearch] = useState("");
  const [winLossFilter, setWinLossFilter] = useState<string>("ALL");
  const [strategyFilter, setStrategyFilter] = useState<string>("ALL");
  const [symbolFilter, setSymbolFilter] = useState<string>("ALL");
  const [selectedTradeNote, setSelectedTradeNote] = useState<JournalEntry | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  // Alerts state
  const [alertsList, setAlertsList] = useState<AlertRule[]>(INITIAL_ALERTS);
  const [alertFilterSeverity, setAlertFilterSeverity] = useState<string>("ALL");
  const [alertSearch, setAlertSearch] = useState("");
  const [isCreateAlertOpen, setIsCreateAlertOpen] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({
    symbol: "NIFTY 50",
    category: "PRICE" as AlertRule["category"],
    trigger: "LTP > Threshold",
    threshold: "25000",
    severity: "WARNING" as AlertRule["severity"],
  });

  const handleTabChange = (tab: "journal" | "audit" | "alerts" | "performance") => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      if (tab === "audit") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  };

  // Filtered Journal Trades
  const filteredJournal = useMemo(() => {
    return journalTrades.filter((t) => {
      const matchSearch =
        t.symbol.toLowerCase().includes(journalSearch.toLowerCase()) ||
        t.strategy.toLowerCase().includes(journalSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(journalSearch.toLowerCase());
      const matchResult = winLossFilter === "ALL" || t.result === winLossFilter;
      const matchStrategy = strategyFilter === "ALL" || t.strategy === strategyFilter;
      const matchSymbol = symbolFilter === "ALL" || t.symbol === symbolFilter;
      return matchSearch && matchResult && matchStrategy && matchSymbol;
    });
  }, [journalTrades, journalSearch, winLossFilter, strategyFilter, symbolFilter]);

  // Unique lists for dropdowns
  const uniqueStrategies = useMemo(
    () => Array.from(new Set(journalTrades.map((t) => t.strategy))),
    [journalTrades],
  );
  const uniqueSymbols = useMemo(
    () => Array.from(new Set(journalTrades.map((t) => t.symbol))),
    [journalTrades],
  );

  // Execution Reports Calculations directly from authoritative orders data
  const filledOrders = useMemo(() => orders.filter((o) => o.status === "EXECUTED"), [orders]);
  const rejectedOrders = useMemo(() => orders.filter((o) => o.status === "REJECTED"), [orders]);
  const cancelledOrders = useMemo(() => orders.filter((o) => o.status === "CANCELLED"), [orders]);

  const totalTradesCount = journalTrades.length;
  const winTrades = journalTrades.filter((t) => t.result === "WIN");
  const lossTrades = journalTrades.filter((t) => t.result === "LOSS");
  const winRate =
    totalTradesCount > 0 ? ((winTrades.length / totalTradesCount) * 100).toFixed(1) : "0.0";
  const grossPnl = journalTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalFees = orders.length * 40; // ₹40 simulated brokerage and exchange STT
  const netPnl = grossPnl - totalFees;
  const totalWinsAmount = winTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalLossAmount = Math.abs(lossTrades.reduce((acc, t) => acc + t.pnl, 0));
  const avgWin = winTrades.length > 0 ? totalWinsAmount / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? totalLossAmount / lossTrades.length : 0;
  const profitFactor = totalLossAmount > 0 ? (totalWinsAmount / totalLossAmount).toFixed(2) : "N/A";

  const handleSaveNote = () => {
    if (!selectedTradeNote) return;
    setJournalTrades((prev) =>
      prev.map((t) => (t.id === selectedTradeNote.id ? { ...t, notes: tempNoteText } : t)),
    );
    setSelectedTradeNote(null);
    toast.success("Trade journal note saved");
  };

  const handleCreateAlert = () => {
    const newId = `ALT-00${alertsList.length + 1}`;
    const item: AlertRule = {
      id: newId,
      category: newAlertForm.category,
      symbol: newAlertForm.symbol,
      trigger: newAlertForm.trigger,
      threshold: newAlertForm.threshold,
      currentValue: "Live Tick",
      severity: newAlertForm.severity,
      status: "ACTIVE",
      time: "Just now",
    };
    setAlertsList([item, ...alertsList]);
    setIsCreateAlertOpen(false);
    toast.success(`Alert ${newId} created and registered with live event bus`);
  };

  const handleDeleteAlert = (id: string) => {
    setAlertsList((prev) => prev.filter((a) => a.id !== id));
    toast.info(`Alert ${id} removed`);
  };

  const handleToggleAlert = (id: string) => {
    setAlertsList((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "ACTIVE" ? "DISABLED" : "ACTIVE" } : a,
      ),
    );
  };

  const exportExecutionCsv = () => {
    const headers = "Order ID,Timestamp,Symbol,Side,Type,Qty,Price,Fill Price,Status,Strategy\n";
    const rows = orders
      .map(
        (o) =>
          `"${o.id}","${o.createdAt}","${o.symbol}","${o.side}","${o.orderType}",${o.qty},${o.price},${o.avgFillPrice || 0},"${o.status}","${o.strategyId || "Manual"}"`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SmartQuant_Executions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported executions to CSV");
  };

  const filteredAlerts = useMemo(() => {
    return alertsList.filter((a) => {
      const matchSev = alertFilterSeverity === "ALL" || a.severity === alertFilterSeverity;
      const matchSearch =
        a.symbol.toLowerCase().includes(alertSearch.toLowerCase()) ||
        a.trigger.toLowerCase().includes(alertSearch.toLowerCase()) ||
        a.id.toLowerCase().includes(alertSearch.toLowerCase());
      return matchSev && matchSearch;
    });
  }, [alertsList, alertFilterSeverity, alertSearch]);

  const perfData = useMemo(() => equityCurve(30, 1000000, 42), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Analytics, Journal & Execution Reports"
          subtitle="Trade journaling with 9-stage Explain This Trade audits, quantitative performance reporting, and system alerts."
        />

        {/* WORKSTATION TABS */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-2/70 border border-border/80 rounded-xl overflow-x-auto">
          <button
            onClick={() => handleTabChange("journal")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "journal"
                ? "bg-surface text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            Trade Journal ({journalTrades.length})
          </button>
          <button
            onClick={() => handleTabChange("audit")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "audit"
                ? "bg-surface text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="h-3.5 w-3.5 text-bull" />
            Execution Reports ({orders.length})
          </button>
          <button
            onClick={() => handleTabChange("alerts")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "alerts"
                ? "bg-surface text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Bell className="h-3.5 w-3.5 text-warn" />
            Alerts Center ({alertsList.length})
          </button>
          <button
            onClick={() => handleTabChange("performance")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeTab === "performance"
                ? "bg-surface text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Performance Curve
          </button>
        </div>
      </div>

      {/* 1. TRADE JOURNAL TAB */}
      {activeTab === "journal" && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BAR */}
          <GlassCard className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search trade journal by symbol, strategy, or ID..."
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* RESULT FILTER */}
              <select
                value={winLossFilter}
                onChange={(e) => setWinLossFilter(e.target.value)}
                className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="ALL">All Outcomes</option>
                <option value="WIN">WIN Trades</option>
                <option value="LOSS">LOSS Trades</option>
                <option value="BREAKEVEN">Breakeven</option>
              </select>

              {/* STRATEGY FILTER */}
              <select
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="ALL">All Strategies</option>
                {uniqueStrategies.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* SYMBOL FILTER */}
              <select
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="ALL">All Symbols</option>
                {uniqueSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>
          </GlassCard>

          {/* TRADE JOURNAL TABLE */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Verifiable Trade History & Journals
                </h3>
                <p className="text-xs text-muted-foreground">
                  Click 'Explain This Trade' to view the full 9-stage audit trail from tick to P&L
                </p>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3 text-right">Entry</th>
                    <th className="py-2.5 px-3 text-right">Exit</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">P&L</th>
                    <th className="py-2.5 px-3 text-right">P&L %</th>
                    <th className="py-2.5 px-3 text-center">Duration</th>
                    <th className="py-2.5 px-3 text-center">Result</th>
                    <th className="py-2.5 px-3 text-right">Explain & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 num">
                  {filteredJournal.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center">
                        <div className="max-w-xs mx-auto space-y-2 font-sans">
                          <p className="font-semibold text-foreground text-sm">
                            No journal trades recorded yet
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Orders and fills will appear here after your first paper trade.
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
                    filteredJournal.map((trade) => (
                      <tr key={trade.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-3 px-3 text-muted-foreground font-mono">
                          {trade.entryTime}
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground font-sans">
                          {trade.symbol}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-sans">
                          {trade.strategy}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              trade.side === "BUY"
                                ? "bg-bull/10 text-bull"
                                : "bg-bear/10 text-bear",
                            )}
                          >
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">₹{trade.entryPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right">₹{trade.exitPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-semibold">{trade.qty}</td>
                        <td
                          className={cn(
                            "py-3 px-3 text-right font-bold",
                            trade.pnl >= 0 ? "text-bull" : "text-bear",
                          )}
                        >
                          {inr(trade.pnl)}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-3 text-right font-bold",
                            trade.pnlPct >= 0 ? "text-bull" : "text-bear",
                          )}
                        >
                          {trade.pnlPct >= 0 ? "+" : ""}
                          {trade.pnlPct.toFixed(2)}%
                        </td>
                        <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                          {trade.duration}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              trade.result === "WIN"
                                ? "bg-bull/10 text-bull border border-bull/20"
                                : trade.result === "LOSS"
                                  ? "bg-bear/10 text-bear border border-bear/20"
                                  : "bg-surface-2 text-muted-foreground border border-border",
                            )}
                          >
                            {trade.result}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openExplainModal(trade.id)}
                            className="h-6 px-2 text-[10px] font-semibold text-primary border-primary/30 hover:bg-primary/10"
                          >
                            <Sparkles className="h-3 w-3 mr-1" /> Explain
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedTradeNote(trade);
                              setTempNoteText(trade.notes || "");
                            }}
                            className="h-6 px-2 text-[10px] text-muted-foreground"
                          >
                            Notes
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

      {/* 2. EXECUTION REPORTS TAB */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* STATS TILES */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Executions"
              value={orders.length > 0 ? String(orders.length) : "0"}
              footnote={`${filledOrders.length} filled · ${rejectedOrders.length} rejected`}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard
              label="Win Rate"
              value={totalTradesCount > 0 ? `${winRate}%` : "N/A"}
              delta={Number(winRate) > 50 ? 2.5 : -1.2}
              footnote={`${winTrades.length} wins / ${totalTradesCount} closed`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              label="Net P&L"
              value={inr(netPnl)}
              delta={netPnl >= 0 ? 3.4 : -2.1}
              footnote={`Gross: ${inr(grossPnl)} · Fees: ${inr(totalFees)}`}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <StatCard
              label="Profit Factor"
              value={profitFactor}
              footnote={`Avg Win: ${inr(avgWin)} | Loss: ${inr(avgLoss)}`}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
          </div>

          {/* EXECUTION ORDERS TABLE & EXPORTS */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Order Execution Audit Trail
                </h3>
                <p className="text-xs text-muted-foreground">
                  Verifiable ledger of all routed orders, fill prices, slippage, and brokerage fees
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="h-8 text-xs"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print / PDF
                </Button>
                <Button size="sm" onClick={exportExecutionCsv} className="h-8 text-xs">
                  <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Req. Price</th>
                    <th className="py-2.5 px-3 text-right">Fill Price</th>
                    <th className="py-2.5 px-3 text-right">Slippage</th>
                    <th className="py-2.5 px-3 text-right">Fees</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 num">
                  {orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="py-12 text-center text-muted-foreground font-sans uppercase tracking-wider text-xs font-semibold"
                      >
                        NO EXECUTION DATA AVAILABLE
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const slippage = o.avgFillPrice ? Math.abs(o.avgFillPrice - o.price) : 0;
                      return (
                        <tr key={o.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-primary">{o.id}</td>
                          <td className="py-3 px-3 text-muted-foreground font-mono">
                            {new Date(o.createdAt).toLocaleTimeString()} IST
                          </td>
                          <td className="py-3 px-3 font-bold text-foreground font-sans">
                            {o.symbol}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                o.side === "BUY" ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear",
                              )}
                            >
                              {o.side}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground font-mono">
                            {o.orderType}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">{o.qty}</td>
                          <td className="py-3 px-3 text-right">₹{o.price.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-bold text-foreground">
                            {o.avgFillPrice ? `₹${o.avgFillPrice.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground">
                            ₹{slippage.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground">₹40.00</td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                o.status === "EXECUTED"
                                  ? "bg-bull/10 text-bull border border-bull/20"
                                  : o.status === "REJECTED"
                                    ? "bg-bear/10 text-bear border border-bear/20"
                                    : "bg-warn/10 text-warn border border-warn/20",
                              )}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground font-sans">
                            {o.strategyId || "Manual Ticket"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 3. ALERTS CENTER TAB */}
      {activeTab === "alerts" && (
        <div className="space-y-6">
          <GlassCard className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search alert rules, triggers, or symbols..."
                    value={alertSearch}
                    onChange={(e) => setAlertSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <select
                  value={alertFilterSeverity}
                  onChange={(e) => setAlertFilterSeverity(e.target.value)}
                  className="bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="WARNING">WARNING</option>
                  <option value="INFO">INFO</option>
                </select>
              </div>

              <Button size="sm" onClick={() => setIsCreateAlertOpen(true)} className="text-xs h-8">
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Alert Rule
              </Button>
            </div>
          </GlassCard>

          {/* ALERTS RULES TABLE */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> Active Alert Monitors & Rules
                </h3>
                <p className="text-xs text-muted-foreground">
                  Monitors price thresholds, indicator crossovers, risk breaches, and kill switch
                  states
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Rule ID</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Target / Symbol</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Trigger Condition</th>
                    <th className="py-2.5 px-3">Threshold</th>
                    <th className="py-2.5 px-3">Current Value</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="max-w-xs mx-auto space-y-2">
                          <p className="font-semibold text-foreground text-sm">
                            No alerts configured
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Create a price, indicator, strategy or risk alert.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setIsCreateAlertOpen(true)}
                            className="text-xs mt-2"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Create First Alert
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-primary">{alert.id}</td>
                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              alert.severity === "CRITICAL"
                                ? "bg-bear/10 text-bear border border-bear/20"
                                : alert.severity === "WARNING"
                                  ? "bg-warn/10 text-warn border border-warn/20"
                                  : "bg-primary/10 text-primary border border-primary/20",
                            )}
                          >
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">{alert.symbol}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                          {alert.category}
                        </td>
                        <td className="py-3 px-3 text-foreground font-medium">{alert.trigger}</td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {alert.threshold}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          {alert.currentValue}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                              alert.status === "ACTIVE"
                                ? "bg-bull/10 text-bull"
                                : "bg-surface-2 text-muted-foreground",
                            )}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleToggleAlert(alert.id)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                          >
                            {alert.status === "ACTIVE" ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="text-muted-foreground hover:text-bear p-1 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* 4. PERFORMANCE CURVE TAB */}
      {activeTab === "performance" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard className="p-5 space-y-3">
            <div>
              <h2 className="font-bold text-sm">Account Cumulative Equity Curve</h2>
              <p className="text-xs text-muted-foreground">
                Historical simulated capital progression
              </p>
            </div>
            <div className="h-64 w-full">
              <AreaSeries data={perfData} dataKey="equity" xKey="label" height={240} />
            </div>
          </GlassCard>

          <GlassCard className="p-5 space-y-3">
            <div>
              <h2 className="font-bold text-sm">Trade Outcome Distribution</h2>
              <p className="text-xs text-muted-foreground">
                Distribution of wins ({winTrades.length}) vs losses ({lossTrades.length})
              </p>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-bull/10 border border-bull/20 text-center">
                  <span className="text-xs text-bull font-bold uppercase block">
                    Profitable Trades
                  </span>
                  <span className="text-2xl font-bold text-bull font-mono mt-1 block">
                    {winTrades.length}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {inr(totalWinsAmount)} total
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-bear/10 border border-bear/20 text-center">
                  <span className="text-xs text-bear font-bold uppercase block">Losing Trades</span>
                  <span className="text-2xl font-bold text-bear font-mono mt-1 block">
                    {lossTrades.length}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    -{inr(totalLossAmount)} total
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* NOTE EDIT MODAL */}
      <Dialog
        open={!!selectedTradeNote}
        onOpenChange={(open) => !open && setSelectedTradeNote(null)}
      >
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Trade Journal Note —{" "}
              {selectedTradeNote?.symbol} ({selectedTradeNote?.id})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add qualitative retrospective notes, execution tags, and learnings for this trade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <textarea
              rows={4}
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              placeholder="Record execution context, emotional state, rule adherence..."
              className="w-full bg-surface-2 border border-border rounded-lg p-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTradeNote(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote} className="text-xs">
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE ALERT MODAL */}
      <Dialog open={isCreateAlertOpen} onOpenChange={setIsCreateAlertOpen}>
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Create Alert Rule
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure real-time threshold notifications evaluated against incoming Dhan market
              ticks and platform events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Target Symbol / Component
              </label>
              <input
                type="text"
                value={newAlertForm.symbol}
                onChange={(e) => setNewAlertForm({ ...newAlertForm, symbol: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Category</label>
                <select
                  value={newAlertForm.category}
                  onChange={(e) =>
                    setNewAlertForm({
                      ...newAlertForm,
                      category: e.target.value as AlertRule["category"],
                    })
                  }
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="PRICE">Price Alert</option>
                  <option value="INDICATOR">Indicator Alert</option>
                  <option value="STRATEGY">Strategy Alert</option>
                  <option value="RISK">Risk Alert</option>
                  <option value="ORDER">Order Alert</option>
                  <option value="FEED">Feed Health Alert</option>
                  <option value="KILL_SWITCH">Kill Switch Alert</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Severity</label>
                <select
                  value={newAlertForm.severity}
                  onChange={(e) =>
                    setNewAlertForm({
                      ...newAlertForm,
                      severity: e.target.value as AlertRule["severity"],
                    })
                  }
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Trigger Description
              </label>
              <input
                type="text"
                value={newAlertForm.trigger}
                onChange={(e) => setNewAlertForm({ ...newAlertForm, trigger: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Threshold Value</label>
              <input
                type="text"
                value={newAlertForm.threshold}
                onChange={(e) => setNewAlertForm({ ...newAlertForm, threshold: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateAlertOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateAlert} className="text-xs font-bold">
              Register Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
