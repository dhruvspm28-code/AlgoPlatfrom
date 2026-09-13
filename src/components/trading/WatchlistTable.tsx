/**
 * Institutional Broker Watchlist Component for SmartQuant Edge.
 * Columns: Symbol, LTP, Change, Change %, Volume, VWAP, RSI, Trend, Signal, Status.
 * Tabs: ALL, INDEX, BANKING, IT, AUTO, PHARMA, CUSTOM.
 * Features: Search, sorting, instrument selection, custom list add/remove in localStorage.
 */

import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { marketDataEngine } from "@/services/market-data-engine";
import { instrumentMapper } from "@/services/instrument-mapper";
import { candleAggregator } from "@/services/candle-aggregator";
import { IndicatorEngine } from "@/services/indicator-engine";
import { signalEngine } from "@/services/signal-engine";
import { Input } from "@/components/ui/input";

export type WatchlistGroup = "ALL" | "INDEX" | "BANKING" | "IT" | "AUTO" | "PHARMA" | "CUSTOM";

export interface WatchlistTableProps {
  selectedSymbol?: string;
  onSelectSymbol: (symbol: string) => void;
  onOpenDrawer?: (symbol: string) => void;
  compact?: boolean;
  className?: string;
}

const CUSTOM_WATCHLIST_KEY = "sqe_custom_watchlist";

export function WatchlistTable({
  selectedSymbol,
  onSelectSymbol,
  onOpenDrawer,
  compact = false,
  className,
}: WatchlistTableProps) {
  const [activeGroup, setActiveGroup] = useState<WatchlistGroup>("ALL");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"symbol" | "price" | "changePct" | "rsi">("changePct");
  const [sortAsc, setSortAsc] = useState(false);

  // Custom watchlist symbols in localStorage
  const [customSymbols, setCustomSymbols] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(CUSTOM_WATCHLIST_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch (err) {
      void err;
    }
    return ["RELIANCE", "HDFCBANK", "TATAMOTORS", "TCS"];
  });

  const toggleCustomSymbol = (sym: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCustomSymbols((prev) => {
      const next = prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym];
      try {
        localStorage.setItem(CUSTOM_WATCHLIST_KEY, JSON.stringify(next));
      } catch (err) {
        void err;
      }
      return next;
    });
  };

  const allInstruments = instrumentMapper.getAllWatchlist();

  // Filter instruments based on group and search query
  const filteredList = useMemo(() => {
    return allInstruments.filter((inst) => {
      // Group filter
      if (activeGroup === "INDEX") {
        if (inst.assetClass !== "INDEX") return false;
      } else if (activeGroup === "BANKING") {
        if (!["HDFCBANK", "ICICIBANK", "SBIN", "BANK NIFTY"].includes(inst.symbol)) return false;
      } else if (activeGroup === "IT") {
        if (!["TCS", "INFY", "WIPRO"].includes(inst.symbol)) return false;
      } else if (activeGroup === "AUTO") {
        if (!["TATAMOTORS", "MARUTI"].includes(inst.symbol)) return false;
      } else if (activeGroup === "PHARMA") {
        if (!["SUNPHARMA"].includes(inst.symbol)) return false;
      } else if (activeGroup === "CUSTOM") {
        if (!customSymbols.includes(inst.symbol)) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return inst.symbol.toLowerCase().includes(q) || inst.name.toLowerCase().includes(q);
      }

      return true;
    });
  }, [allInstruments, activeGroup, search, customSymbols]);

  // Compute live data and indicators for table
  const enrichedList = useMemo(() => {
    return filteredList.map((inst) => {
      const tick = marketDataEngine.getLatestTick(inst.symbol);
      const ltp = tick ? tick.price : inst.basePrice;
      const change = tick ? tick.change : 0;
      const changePct = tick ? tick.changePct : 0;
      const volume = tick ? tick.volume : 0;

      // Quick indicator assessment
      const candles = candleAggregator.getCandles(inst.symbol, "15m");
      const ind = IndicatorEngine.calculateAll(candles);
      const sig = signalEngine.getLatestSignal(inst.symbol);

      return {
        ...inst,
        ltp,
        change,
        changePct,
        volume,
        vwap: ind.vwap.value,
        rsi: ind.rsi14.value,
        supertrend: ind.supertrend.value.trend,
        signal: sig?.signalType || (changePct >= 0.5 ? "BUY" : changePct <= -0.5 ? "SELL" : "HOLD"),
        confluence: sig?.confluenceScore || 65,
        isCustom: customSymbols.includes(inst.symbol),
      };
    });
  }, [filteredList, customSymbols]);

  // Sort list
  const sortedList = useMemo(() => {
    return [...enrichedList].sort((a, b) => {
      let diff = 0;
      if (sortField === "symbol") diff = a.symbol.localeCompare(b.symbol);
      else if (sortField === "price") diff = a.ltp - b.ltp;
      else if (sortField === "changePct") diff = a.changePct - b.changePct;
      else if (sortField === "rsi") diff = a.rsi - b.rsi;
      return sortAsc ? diff : -diff;
    });
  }, [enrichedList, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const groups: { id: WatchlistGroup; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "INDEX", label: "Indices" },
    { id: "BANKING", label: "Banking" },
    { id: "IT", label: "IT" },
    { id: "AUTO", label: "Auto" },
    { id: "PHARMA", label: "Pharma" },
    { id: "CUSTOM", label: `Custom (${customSymbols.length})` },
  ];

  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      {/* Search & Sector Group Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search instrument, index or company..."
            className="h-8 pl-8 text-xs bg-surface-2"
          />
        </div>

        {/* Group Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={cn(
                "px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer",
                activeGroup === g.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground hover:bg-surface-3",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-surface-2/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              <th className="py-2 px-2 text-center w-6"></th>
              <th
                onClick={() => handleSort("symbol")}
                className="py-2 px-2 text-left cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Symbol</span>
                  <ArrowUpDown className="h-2.5 w-2.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort("price")}
                className="py-2 px-2 text-right cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>LTP</span>
                  <ArrowUpDown className="h-2.5 w-2.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort("changePct")}
                className="py-2 px-2 text-right cursor-pointer hover:text-foreground select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Chg %</span>
                  <ArrowUpDown className="h-2.5 w-2.5" />
                </div>
              </th>
              {!compact && (
                <>
                  <th className="py-2 px-2 text-right">VWAP</th>
                  <th
                    onClick={() => handleSort("rsi")}
                    className="py-2 px-2 text-right cursor-pointer hover:text-foreground select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>RSI</span>
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </div>
                  </th>
                  <th className="py-2 px-2 text-center">Trend</th>
                  <th className="py-2 px-2 text-center">Signal</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 num">
            {sortedList.length === 0 ? (
              <tr>
                <td
                  colSpan={compact ? 4 : 8}
                  className="py-6 text-center text-muted-foreground text-xs"
                >
                  No instruments matching filters.
                </td>
              </tr>
            ) : (
              sortedList.map((inst) => {
                const isSelected = inst.symbol === selectedSymbol;
                const isBull = inst.changePct >= 0;

                return (
                  <tr
                    key={inst.symbol}
                    onClick={() => onSelectSymbol(inst.symbol)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-surface-2",
                      isSelected ? "bg-primary/15 font-semibold" : "",
                    )}
                  >
                    <td className="py-2 px-1 text-center">
                      <button
                        type="button"
                        onClick={(e) => toggleCustomSymbol(inst.symbol, e)}
                        className="text-muted-foreground hover:text-amber-400 p-0.5"
                        title={
                          inst.isCustom ? "Remove from Custom Watchlist" : "Add to Custom Watchlist"
                        }
                      >
                        <Star
                          className={cn(
                            "h-3 w-3",
                            inst.isCustom
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/40",
                          )}
                        />
                      </button>
                    </td>

                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{inst.symbol}</span>
                        <span className="text-[9px] rounded bg-surface-3 px-1 py-0.2 text-muted-foreground font-semibold">
                          {inst.exchange}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                        {inst.name}
                      </p>
                    </td>

                    <td className="py-2 px-2 text-right font-bold text-foreground">
                      ₹{inst.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    <td
                      className={cn(
                        "py-2 px-2 text-right font-bold",
                        isBull ? "text-bull" : "text-bear",
                      )}
                    >
                      {isBull ? "+" : ""}
                      {inst.changePct.toFixed(2)}%
                    </td>

                    {!compact && (
                      <>
                        <td className="py-2 px-2 text-right text-muted-foreground">
                          ₹{inst.vwap ? inst.vwap.toFixed(1) : "--"}
                        </td>

                        <td
                          className={cn(
                            "py-2 px-2 text-right font-semibold",
                            inst.rsi > 70
                              ? "text-bear font-bold"
                              : inst.rsi < 30
                                ? "text-bull font-bold"
                                : "text-foreground",
                          )}
                        >
                          {inst.rsi ? inst.rsi.toFixed(1) : "--"}
                        </td>

                        <td className="py-2 px-2 text-center">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              inst.supertrend === "BULLISH"
                                ? "bg-bull/10 text-bull"
                                : "bg-bear/10 text-bear",
                            )}
                          >
                            {inst.supertrend || "NEUTRAL"}
                          </span>
                        </td>

                        <td className="py-2 px-2 text-center">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              inst.signal === "BUY"
                                ? "bg-bull text-bull-foreground"
                                : inst.signal === "SELL"
                                  ? "bg-bear text-bear-foreground"
                                  : "bg-surface-3 text-muted-foreground",
                            )}
                          >
                            {inst.signal}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
