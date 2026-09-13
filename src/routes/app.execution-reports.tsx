/**
 * Execution Reports Terminal Workstation for SmartQuant Edge.
 * Institutional order lifecycle tracking, fills audit, slippage metrics,
 * execution quality surveillance, CSV/Print export, and full order stepper drawers.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Download,
  Printer,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info,
  X,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/context/PlatformContext";
import { CENTRAL_DEMO_DATA, ExecutionOrder } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/execution-reports")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: (search.tab as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Execution Reports — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Institutional order lifecycle audit, fills, slippage, execution quality, and transaction fee analytics.",
      },
    ],
  }),
  component: ExecutionReportsPage,
});

function ExecutionReportsPage() {
  const { tab: queryTab } = Route.useSearch();
  const { isLiveTrading, orders: platformOrders } = usePlatform();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"ALL" | "FILLED" | "REJECTED" | "CANCELLED">(
    queryTab === "filled"
      ? "FILLED"
      : queryTab === "rejected"
        ? "REJECTED"
        : queryTab === "cancelled"
          ? "CANCELLED"
          : "ALL",
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [symbolFilter, setSymbolFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Order for Drawer
  const [selectedOrder, setSelectedOrder] = useState<ExecutionOrder | null>(null);

  const isDemo = !isLiveTrading;
  const rawOrders: ExecutionOrder[] = CENTRAL_DEMO_DATA.executionOrders;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((o) => {
      // Tab filter
      if (activeTab === "FILLED" && o.status !== "EXECUTED") return false;
      if (activeTab === "REJECTED" && o.status !== "REJECTED") return false;
      if (activeTab === "CANCELLED" && o.status !== "CANCELLED") return false;

      // Search
      const matchSearch =
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.strategy.toLowerCase().includes(searchQuery.toLowerCase());

      // Symbol
      const matchSymbol = symbolFilter === "ALL" || o.symbol === symbolFilter;

      // Status
      const matchStatus = statusFilter === "ALL" || o.status === statusFilter;

      return matchSearch && matchSymbol && matchStatus;
    });
  }, [rawOrders, activeTab, searchQuery, symbolFilter, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = rawOrders.length;
    const filled = rawOrders.filter((o) => o.status === "EXECUTED").length;
    const partiallyFilled = 0;
    const rejected = rawOrders.filter((o) => o.status === "REJECTED").length;
    const cancelled = rawOrders.filter((o) => o.status === "CANCELLED").length;
    const fillRate = total > 0 ? (filled / total) * 100 : 0;
    const totalFees = rawOrders.reduce((acc, o) => acc + o.fees, 0);
    const totalSlippage = rawOrders.reduce((acc, o) => acc + Math.abs(o.slippage * o.quantity), 0);

    return {
      total,
      filled,
      partiallyFilled,
      rejected,
      cancelled,
      fillRate,
      totalFees,
      totalSlippage,
    };
  }, [rawOrders]);

  const uniqueSymbols = useMemo(
    () => Array.from(new Set(rawOrders.map((o) => o.symbol))),
    [rawOrders],
  );

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      "Order ID",
      "Time",
      "Symbol",
      "Side",
      "Type",
      "Qty",
      "Req Price",
      "Fill Price",
      "Slippage",
      "Fees",
      "Strategy",
      "Status",
    ];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.time,
      o.symbol,
      o.side,
      o.type,
      o.quantity,
      o.requestedPrice,
      o.fillPrice,
      o.slippage,
      o.fees,
      `"${o.strategy}"`,
      o.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Execution_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report exported successfully");
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <FileText className="h-6 w-6 text-emerald-400" />
              Execution Reports
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
              {isDemo ? "PAPER EXECUTION / DEMO" : "LIVE BROKER GATEWAY"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Order lifecycle audit, fills, slippage, execution quality, and transaction cost analysis
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isDemo && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-amber-400" />
              <span>Simulated Order Engine Data</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-9 gap-1.5 border-border/60 hover:bg-secondary/60"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs h-9 gap-1.5 border-border/60 hover:bg-secondary/60"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* 2. TOP METRICS STRIP (8 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="TOTAL ORDERS" value={metrics.total.toString()} subtext="Processed" />
        <StatCard
          label="FILLED"
          value={metrics.filled.toString()}
          subtext="Executed fills"
          variant="success"
        />
        <StatCard
          label="PARTIALLY FILLED"
          value={metrics.partiallyFilled.toString()}
          subtext="Tranches"
        />
        <StatCard
          label="REJECTED"
          value={metrics.rejected.toString()}
          subtext="Risk filtered"
          variant={metrics.rejected > 0 ? "danger" : "default"}
        />
        <StatCard
          label="CANCELLED"
          value={metrics.cancelled.toString()}
          subtext="Operator cancelled"
        />
        <StatCard
          label="FILL RATE"
          value={`${metrics.fillRate.toFixed(1)}%`}
          subtext="Success ratio"
          trend="up"
          variant="success"
        />
        <StatCard label="TOTAL FEES" value={inr(metrics.totalFees)} subtext="STT & Brokerage" />
        <StatCard
          label="TOTAL SLIPPAGE"
          value={inr(metrics.totalSlippage)}
          subtext="Execution diff"
          variant="warning"
        />
      </div>

      {/* 3. TABS & FILTER BAR */}
      <GlassCard className="p-4 space-y-3 bg-card/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sub-tabs */}
          <div className="flex items-center rounded-lg bg-secondary/50 p-1 border border-border/40">
            {(["ALL", "FILLED", "REJECTED", "CANCELLED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  activeTab === tab
                    ? "bg-card text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "ALL" ? `All Orders (${rawOrders.length})` : tab}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders, symbols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
            >
              <option value="ALL">All Symbols</option>
              {uniqueSymbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* 4. ORDERS TABLE */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
              <tr>
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-3">Side</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Requested</th>
                <th className="py-3 px-3 text-right">Fill Price</th>
                <th className="py-3 px-3 text-right">Slippage</th>
                <th className="py-3 px-3 text-right">Fees</th>
                <th className="py-3 px-3">Strategy</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Lifecycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-muted-foreground font-sans">
                    NO EXECUTION DATA AVAILABLE
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isExecuted = o.status === "EXECUTED";
                  const isRejected = o.status === "REJECTED";
                  const isCancelled = o.status === "CANCELLED";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="hover:bg-secondary/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3 font-medium text-foreground">{o.id}</td>
                      <td className="py-3 px-3 text-muted-foreground">{o.time}</td>
                      <td className="py-3 px-3 font-sans font-bold text-foreground">{o.symbol}</td>
                      <td className="py-3 px-3 font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-bold",
                            o.side === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30",
                          )}
                        >
                          {o.side}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{o.type}</td>
                      <td className="py-3 px-3 text-right text-foreground">{o.quantity}</td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {inr(o.requestedPrice)}
                      </td>
                      <td className="py-3 px-3 text-right text-foreground font-bold">
                        {o.fillPrice > 0 ? inr(o.fillPrice) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={cn(
                            o.slippage > 0 ? "text-amber-400" : "text-muted-foreground",
                          )}
                        >
                          {o.slippage > 0 ? `+${inr(o.slippage)}` : "₹0.00"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">{inr(o.fees)}</td>
                      <td className="py-3 px-3 font-sans text-muted-foreground max-w-[140px] truncate">
                        {o.strategy}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-bold",
                            isExecuted
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : isRejected
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-muted-foreground group-hover:text-foreground"
                        >
                          Details
                          <ChevronRight className="h-3.5 w-3.5" />
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

      {/* 5. ORDER DETAIL DRAWER WITH LIFECYCLE STEPPER */}
      {selectedOrder && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-card border-l border-border shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="space-y-6">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">{selectedOrder.symbol}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-0.5",
                      selectedOrder.side === "BUY"
                        ? "text-emerald-400 border-emerald-500/30"
                        : "text-rose-400 border-rose-500/30",
                    )}
                  >
                    {selectedOrder.side}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-0.5",
                      selectedOrder.status === "EXECUTED"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400",
                    )}
                  >
                    {selectedOrder.status}
                  </Badge>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  Order ID: {selectedOrder.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Execution Lifecycle Stepper */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Order Lifecycle Execution Stages
              </h4>

              <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                {selectedOrder.lifecycle.map((stage, idx: number) => {
                  const isFail = stage.status === "FAILED";
                  const isSuccess = stage.status === "COMPLETED";

                  return (
                    <div key={idx} className="relative flex items-start gap-3 pl-1">
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0 z-10",
                          isFail
                            ? "bg-rose-500 text-white"
                            : isSuccess
                              ? "bg-emerald-500 text-white"
                              : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {isFail ? "✕" : "✓"}
                      </div>
                      <div className="flex-1 p-2.5 rounded-lg bg-secondary/30 border border-border/40 text-xs">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-foreground font-sans">{stage.stage}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {stage.timestamp}
                          </span>
                        </div>
                        {stage.details && (
                          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                            {stage.details}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing & Execution Quality Specs */}
            <div className="p-4 rounded-xl bg-secondary/20 border border-border/40 space-y-3 text-xs font-mono">
              <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-sans font-semibold">
                Execution Quality & Financial Audit
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans">
                    Requested Price
                  </span>
                  <span className="text-foreground font-bold">
                    {inr(selectedOrder.requestedPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans">
                    Filled Price
                  </span>
                  <span className="text-foreground font-bold">{inr(selectedOrder.fillPrice)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans">
                    Recorded Slippage
                  </span>
                  <span
                    className={cn(
                      selectedOrder.slippage > 0 ? "text-amber-400 font-bold" : "text-emerald-400",
                    )}
                  >
                    {inr(selectedOrder.slippage)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-sans">
                    Statutory Fees
                  </span>
                  <span className="text-foreground">{inr(selectedOrder.fees)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>Broker: DhanHQ Gateway</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
