/**
 * Market Watch Workstation for SmartQuant Edge.
 * Real-time Indian equity and index monitoring terminal.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { realtimeBus } from "@/services/realtime-bus";
import { marketDataEngine } from "@/services/market-data-engine";
import { type NormalizedTick } from "@/services/market-data-types";
import {
  Radar,
  Search,
  Plus,
  RefreshCw,
  Star,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  Info,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard, PageHeader, inr } from "@/components/ui-kit/primitives";
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
import { DEMO_WATCHLIST, type WatchlistInstrument } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/watchlist")({
  head: () => ({
    meta: [
      { title: "Market Watch Terminal — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Professional real-time market watchlist, streaming LTP quotes, depth analytics, and quick execution drawers.",
      },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const navigate = useNavigate();
  const { feedStatus, tradingMode, submitOrder } = usePlatform();

  const [instruments, setInstruments] = useState<WatchlistInstrument[]>(DEMO_WATCHLIST);
  const [activeGroup, setActiveGroup] = useState<
    "All" | "Indices" | "Banking" | "IT" | "Auto" | "Pharma" | "My Watchlist"
  >("All");
  const [search, setSearch] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Subscribe to live market ticks and update watchlist instruments
  useEffect(() => {
    // Initial sync with latest ticks in marketDataEngine
    setInstruments((prev) =>
      prev.map((inst) => {
        const tick = marketDataEngine.getLatestTick(inst.symbol);
        if (!tick) return inst;
        const prevClose = tick.previousClose || tick.prevClose || inst.prevClose || inst.ltp;
        const change = tick.change ?? Number((tick.price - prevClose).toFixed(2));
        const changePct = tick.changePct ?? (prevClose > 0 ? Number((((tick.price - prevClose) / prevClose) * 100).toFixed(2)) : 0);
        return {
          ...inst,
          ltp: tick.price,
          change,
          changePct,
          high: tick.high ? Math.max(inst.high, tick.high) : inst.high,
          low: tick.low ? Math.min(inst.low, tick.low) : inst.low,
          prevClose,
        };
      }),
    );

    const unsub = realtimeBus.subscribe("MARKET_TICK", (evt) => {
      const tick = evt.payload as NormalizedTick;
      if (!tick || !tick.symbol) return;
      setInstruments((prev) =>
        prev.map((inst) => {
          if (inst.symbol !== tick.symbol) return inst;
          const prevClose = tick.previousClose || tick.prevClose || inst.prevClose || inst.ltp;
          const change = tick.change ?? Number((tick.price - prevClose).toFixed(2));
          const changePct = tick.changePct ?? (prevClose > 0 ? Number((((tick.price - prevClose) / prevClose) * 100).toFixed(2)) : 0);
          return {
            ...inst,
            ltp: tick.price,
            change,
            changePct,
            high: tick.high ? Math.max(inst.high, tick.high) : inst.high,
            low: tick.low ? Math.min(inst.low, tick.low) : inst.low,
            prevClose,
          };
        }),
      );
    });

    return () => unsub();
  }, []);

  // Instrument Detail Drawer / Modal
  const [selectedInstrument, setSelectedInstrument] = useState<WatchlistInstrument | null>(null);

  // Quick Order State
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderQty, setOrderQty] = useState(25);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Add Instrument Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newSector, setNewSector] = useState<WatchlistInstrument["sector"]>("Banking");
  const [newExchange, setNewExchange] = useState<"NSE" | "BSE">("NSE");

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInstruments((prev) =>
      prev.map((inst) =>
        inst.symbol === symbol ? { ...inst, isFavorite: !inst.isFavorite } : inst,
      ),
    );
    toast.success(`Watchlist updated for ${symbol}`);
  };

  const filteredInstruments = useMemo(() => {
    return instruments.filter((inst) => {
      const matchSearch =
        inst.symbol.toLowerCase().includes(search.toLowerCase()) ||
        inst.name.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      if (activeGroup === "All") return true;
      if (activeGroup === "My Watchlist") return !!inst.isFavorite;
      return inst.sector === activeGroup;
    });
  }, [instruments, search, activeGroup]);

  const handleRefresh = () => {
    toast.info("Market quotes refreshed against streaming cache");
  };

  const handleExecutePaperOrder = async () => {
    if (!selectedInstrument) return;
    setIsSubmittingOrder(true);
    try {
      const slPrice =
        orderSide === "BUY"
          ? Number((selectedInstrument.ltp * 0.97).toFixed(2))
          : Number((selectedInstrument.ltp * 1.03).toFixed(2));

      await submitOrder({
        symbol: selectedInstrument.symbol,
        side: orderSide,
        orderType: "MARKET",
        qty: orderQty,
        price: selectedInstrument.ltp,
        stopLossPrice: slPrice,
        strategyId: "Manual Ticket",
      });
      toast.success(
        `Simulated Paper Order Executed: ${orderSide} ${orderQty} ${selectedInstrument.symbol} @ ₹${selectedInstrument.ltp.toFixed(2)}`,
      );
      setSelectedInstrument(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to execute order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleAddCustomInstrument = () => {
    if (!newSymbol.trim()) {
      toast.error("Symbol name is required");
      return;
    }
    const cleanSym = newSymbol.trim().toUpperCase();
    const item: WatchlistInstrument = {
      symbol: cleanSym,
      name: `${cleanSym} Equity`,
      exchange: newExchange,
      sector: newSector,
      ltp: 1500.0,
      change: 12.5,
      changePct: 0.84,
      open: 1490.0,
      high: 1515.0,
      low: 1485.0,
      prevClose: 1487.5,
      volume: "1.5M",
      vwap: 1498.2,
      status: "PAPER_SIMULATED",
      isFavorite: true,
    };
    setInstruments([item, ...instruments]);
    setIsAddModalOpen(false);
    setNewSymbol("");
    toast.success(`${cleanSym} added to watchlist`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader
            title="Market Watch"
            subtitle="Real-time instrument monitoring, streaming quotes, depth analytics, and quick execution drawers."
          />
        </div>

        {/* DEMO STATUS INDICATOR & CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="bg-primary/10 border-primary/30 text-primary text-[11px] font-mono font-bold px-2.5 py-1"
          >
            PAPER DEMO DATA · SIMULATED DATA
          </Badge>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="h-8 text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="h-8 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Instrument
          </Button>
        </div>
      </div>

      {/* TOP CONTROLS & GROUP TABS */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search instruments (NIFTY, RELIANCE, TCS, BANK NIFTY)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg focus:outline-none focus:border-primary font-medium"
            />
          </div>

          {/* MARKET STATUS & FEED PILLS */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-border">
              <span className="h-2 w-2 rounded-full bg-bull animate-pulse" />
              <span className="text-[11px] font-mono font-semibold">
                FEED: {feedStatus.connectionState}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-border">
              <span className="text-[11px] font-mono text-muted-foreground">MODE:</span>
              <span className="text-[11px] font-mono font-bold text-primary">{tradingMode}</span>
            </div>
          </div>
        </div>

        {/* WATCHLIST GROUPS */}
        <div className="flex items-center gap-1 border-t border-border/60 pt-3 overflow-x-auto text-xs">
          {(["All", "Indices", "Banking", "IT", "Auto", "Pharma", "My Watchlist"] as const).map(
            (grp) => (
              <button
                key={grp}
                onClick={() => setActiveGroup(grp)}
                className={cn(
                  "px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer",
                  activeGroup === grp
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60",
                )}
              >
                {grp === "My Watchlist" ? `★ ${grp}` : grp}
              </button>
            ),
          )}
        </div>
      </GlassCard>

      {/* MAIN WATCHLIST TABLE */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-surface-2/60 text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-left">
                <th className="py-2.5 px-3 w-8">Fav</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Exchange</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3 text-right">Change</th>
                <th className="py-2.5 px-3 text-right">Change %</th>
                <th className="py-2.5 px-3 text-right">Open</th>
                <th className="py-2.5 px-3 text-right">High</th>
                <th className="py-2.5 px-3 text-right">Low</th>
                <th className="py-2.5 px-3 text-right">Prev Close</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-right">VWAP</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 num">
              {filteredInstruments.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-muted-foreground font-sans">
                    <p className="font-semibold text-foreground text-sm">
                      No instruments match your filter
                    </p>
                    <p className="text-xs mt-1">
                      Try searching for another symbol or reset group filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInstruments.map((inst) => {
                  const isPositive = inst.change >= 0;
                  return (
                    <tr
                      key={inst.symbol}
                      onClick={() => setSelectedInstrument(inst)}
                      className="hover:bg-surface-2/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <button
                          onClick={(e) => toggleFavorite(inst.symbol, e)}
                          className={cn(
                            "hover:text-amber-400 transition-colors",
                            inst.isFavorite ? "text-amber-400" : "text-muted-foreground/40",
                          )}
                        >
                          <Star className="h-3.5 w-3.5 fill-current" />
                        </button>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className="font-bold text-foreground block">{inst.symbol}</span>
                        <span className="text-[10px] text-muted-foreground block">{inst.name}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface border border-border">
                          {inst.exchange}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-foreground">
                        ₹{inst.ltp.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-3 text-right font-semibold",
                          isPositive ? "text-bull" : "text-bear",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {inst.change.toFixed(2)}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-3 text-right font-bold",
                          isPositive ? "text-bull" : "text-bear",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {inst.changePct.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        ₹{inst.open.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        ₹{inst.high.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        ₹{inst.low.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        ₹{inst.prevClose.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {inst.volume}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        ₹{inst.vwap.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-bull/10 text-bull border border-bull/20">
                          {inst.status === "PAPER_SIMULATED" ? "PAPER" : inst.status}
                        </span>
                      </td>
                      <td
                        className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedInstrument(inst)}
                          className="h-6 px-2 text-[10px]"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedInstrument(inst);
                            setOrderSide("BUY");
                          }}
                          className="h-6 px-2 text-[10px] font-bold bg-bull hover:bg-bull/90 text-white"
                        >
                          Trade
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

      {/* INSTRUMENT DETAILS DRAWER / MODAL */}
      <Dialog
        open={!!selectedInstrument}
        onOpenChange={(open) => !open && setSelectedInstrument(null)}
      >
        <DialogContent className="max-w-lg bg-surface">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{selectedInstrument?.symbol}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedInstrument?.exchange} · {selectedInstrument?.sector}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedInstrument?.name}
                </DialogDescription>
              </div>

              {selectedInstrument && (
                <div className="text-right num">
                  <div className="text-base font-extrabold text-foreground">
                    ₹{selectedInstrument.ltp.toFixed(2)}
                  </div>
                  <div
                    className={cn(
                      "text-xs font-bold",
                      selectedInstrument.change >= 0 ? "text-bull" : "text-bear",
                    )}
                  >
                    {selectedInstrument.change >= 0 ? "+" : ""}
                    {selectedInstrument.change.toFixed(2)} (
                    {selectedInstrument.changePct >= 0 ? "+" : ""}
                    {selectedInstrument.changePct.toFixed(2)}%)
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedInstrument && (
            <div className="space-y-4 py-2 text-xs">
              {/* OHLC STATS GRID */}
              <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-surface-2/70 border border-border text-center num">
                <div>
                  <span className="text-[10px] text-muted-foreground block">OPEN</span>
                  <span className="font-semibold font-mono">
                    ₹{selectedInstrument.open.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">HIGH</span>
                  <span className="font-semibold font-mono text-bull">
                    ₹{selectedInstrument.high.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">LOW</span>
                  <span className="font-semibold font-mono text-bear">
                    ₹{selectedInstrument.low.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">PREV CLOSE</span>
                  <span className="font-semibold font-mono">
                    ₹{selectedInstrument.prevClose.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* VOLUME & VWAP */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-2/40 border border-border text-xs num">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume:</span>
                  <span className="font-semibold">{selectedInstrument.volume}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VWAP:</span>
                  <span className="font-semibold">₹{selectedInstrument.vwap.toFixed(2)}</span>
                </div>
              </div>

              {/* DAY RANGE METER */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Day Low: ₹{selectedInstrument.low.toFixed(2)}</span>
                  <span>Day High: ₹{selectedInstrument.high.toFixed(2)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-2 border border-border overflow-hidden relative">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((selectedInstrument.ltp - selectedInstrument.low) /
                            (selectedInstrument.high - selectedInstrument.low || 1)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* QUICK PAPER TRADE PANEL */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> Instant Simulated Paper Order
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    PAPER SIMULATED
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Order Side
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-surface-2 border border-border">
                      <button
                        onClick={() => setOrderSide("BUY")}
                        className={cn(
                          "py-1 rounded text-xs font-bold transition-all",
                          orderSide === "BUY"
                            ? "bg-bull text-white shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        BUY
                      </button>
                      <button
                        onClick={() => setOrderSide("SELL")}
                        className={cn(
                          "py-1 rounded text-xs font-bold transition-all",
                          orderSide === "SELL"
                            ? "bg-bear text-white shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        SELL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      Quantity (Lots/Shares)
                    </label>
                    <input
                      type="number"
                      value={orderQty}
                      onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs font-mono pt-1 text-muted-foreground">
                  <span>Est. Order Value:</span>
                  <span className="font-bold text-foreground">
                    {inr(orderQty * selectedInstrument.ltp)}
                  </span>
                </div>

                <Button
                  onClick={handleExecutePaperOrder}
                  disabled={isSubmittingOrder}
                  className={cn(
                    "w-full text-xs font-bold h-9 text-white shadow-md",
                    orderSide === "BUY" ? "bg-bull hover:bg-bull/90" : "bg-bear hover:bg-bear/90",
                  )}
                >
                  {isSubmittingOrder
                    ? "Routing..."
                    : `Execute ${orderSide} Paper Order (${orderQty} shares)`}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate({ to: "/app/live" });
              }}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Open in Live Terminal
            </Button>
            <Button size="sm" onClick={() => setSelectedInstrument(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD INSTRUMENT MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-surface">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add Instrument to Watchlist
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add equity or index contracts to monitor in your personal watchlist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Symbol Name</label>
              <input
                type="text"
                placeholder="e.g. BAJFINANCE, LT, AXISBANK"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Exchange</label>
                <select
                  value={newExchange}
                  onChange={(e) => setNewExchange(e.target.value as "NSE" | "BSE")}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="NSE">NSE (National Stock Exchange)</option>
                  <option value="BSE">BSE (Bombay Stock Exchange)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Sector Category</label>
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value as WatchlistInstrument["sector"])}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                >
                  <option value="Banking">Banking</option>
                  <option value="IT">IT</option>
                  <option value="Auto">Auto</option>
                  <option value="Pharma">Pharma</option>
                  <option value="Energy">Energy</option>
                  <option value="Indices">Indices</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddCustomInstrument} className="text-xs font-bold">
              Add to Watchlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
