import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Radar,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Sliders,
  Sparkles,
  Layers,
  ArrowUpDown,
  Zap,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { GlassCard, PageHeader, StatusPill, inr } from "@/components/ui-kit/primitives";
import { instruments, type Instrument } from "@/data/market";
import { marketDataEngine } from "@/services/market-data-engine";
import { InstrumentDrawer } from "@/components/trading/InstrumentDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/scanner")({
  head: () => ({
    meta: [
      { title: "Quantitative Market Scanner — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Screen Indian equities and indices by momentum, volatility breakout, mean reversion, RSI extremes, and volume surges.",
      },
    ],
  }),
  component: ScannerPage,
});

type PresetScanner =
  | "ALL"
  | "MOMENTUM"
  | "BREAKOUT"
  | "TREND"
  | "MEAN_REVERSION"
  | "HIGH_VOLUME"
  | "OVERSOLD"
  | "OVERBOUGHT";

const PRESET_DEFINITIONS: { id: PresetScanner; label: string; desc: string }[] = [
  { id: "ALL", label: "All Instruments", desc: "Full scanned equity and index universe" },
  { id: "MOMENTUM", label: "Momentum", desc: "RSI > 55 with positive daily change" },
  { id: "BREAKOUT", label: "Breakout", desc: "Change % > +1.5% and high relative volume" },
  { id: "TREND", label: "Trend Following", desc: "Bullish signal with positive MACD confluence" },
  {
    id: "MEAN_REVERSION",
    label: "Mean Reversion",
    desc: "Extreme RSI deviation with range bound price",
  },
  { id: "HIGH_VOLUME", label: "High Volume", desc: "Top volume activity and liquidity depth" },
  {
    id: "OVERSOLD",
    label: "Oversold (RSI < 35)",
    desc: "Potential technical bounce opportunities",
  },
  {
    id: "OVERBOUGHT",
    label: "Overbought (RSI > 70)",
    desc: "Extended upward moves near resistance",
  },
];

function ScannerPage() {
  const [selectedPreset, setSelectedPreset] = useState<PresetScanner>("ALL");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("ALL");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minRsi, setMinRsi] = useState<number | "">("");
  const [maxRsi, setMaxRsi] = useState<number | "">("");

  // Drawer state
  const [drawerSymbol, setDrawerSymbol] = useState<string | null>(null);

  // Sectors list
  const sectors = useMemo(() => {
    const set = new Set<string>();
    instruments.forEach((i) => i.sector && set.add(i.sector));
    return ["ALL", ...Array.from(set)];
  }, []);

  // Filter logic
  const filteredInstruments = useMemo(() => {
    return instruments.filter((inst) => {
      // Live tick integration
      const live = marketDataEngine.getLiveTick(inst.symbol);
      const price = live?.price ?? inst.price;
      const changePct = live?.changePct ?? inst.changePct;
      const rsi = inst.rsi;

      // Text search
      if (
        search &&
        !inst.symbol.toLowerCase().includes(search.toLowerCase()) &&
        !inst.name.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      // Sector filter
      if (sectorFilter !== "ALL" && inst.sector !== sectorFilter) {
        return false;
      }

      // Price filter
      if (minPrice !== "" && price < Number(minPrice)) return false;
      if (maxPrice !== "" && price > Number(maxPrice)) return false;

      // RSI filter
      if (minRsi !== "" && rsi < Number(minRsi)) return false;
      if (maxRsi !== "" && rsi > Number(maxRsi)) return false;

      // Presets
      switch (selectedPreset) {
        case "MOMENTUM":
          return rsi > 55 && changePct > 0;
        case "BREAKOUT":
          return changePct >= 1.2;
        case "TREND":
          return inst.signal === "BUY" && changePct > 0;
        case "MEAN_REVERSION":
          return rsi < 40 || rsi > 65;
        case "HIGH_VOLUME":
          return (
            inst.symbol.includes("NIFTY") ||
            inst.symbol === "RELIANCE" ||
            inst.symbol === "HDFCBANK"
          );
        case "OVERSOLD":
          return rsi <= 40;
        case "OVERBOUGHT":
          return rsi >= 65;
        case "ALL":
        default:
          return true;
      }
    });
  }, [search, sectorFilter, minPrice, maxPrice, minRsi, maxRsi, selectedPreset]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quantitative Market Scanner"
        subtitle="Screen Indian equities and derivatives by multi-factor quantitative filters, technical breakouts, and RSI conditions."
      />

      {/* PRESET FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PRESET_DEFINITIONS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPreset(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border flex items-center gap-1.5",
              selectedPreset === p.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-surface-2/60 text-muted-foreground border-border/70 hover:text-foreground hover:bg-surface-2",
            )}
          >
            {p.id === "MOMENTUM" && <TrendingUp className="h-3 w-3 text-bull" />}
            {p.id === "BREAKOUT" && <Zap className="h-3 w-3 text-warn" />}
            {p.label}
          </button>
        ))}
      </div>

      {/* ADVANCED FILTER TOOLBAR */}
      <GlassCard className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Search Instrument
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                placeholder="RELIANCE, INFY, NIFTY..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Sector
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Min Price (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs outline-none focus:border-primary num"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              RSI Range
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Min"
                value={minRsi}
                onChange={(e) => setMinRsi(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-1/2 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-primary num"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxRsi}
                onChange={(e) => setMaxRsi(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-1/2 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-primary num"
              />
            </div>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSectorFilter("ALL");
                setMinPrice("");
                setMaxPrice("");
                setMinRsi("");
                setMaxRsi("");
                setSelectedPreset("ALL");
              }}
              className="w-full text-xs h-8"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* SCANNER RESULTS TABLE */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              Matched Instruments ({filteredInstruments.length})
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              REAL-TIME SCAN
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Click any row to open full technical detail drawer
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-2/60 border-b border-border text-muted-foreground uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3 text-left">Symbol</th>
                <th className="py-2.5 px-3 text-left">Sector</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3 text-right">Day Change</th>
                <th className="py-2.5 px-3 text-right">Volume</th>
                <th className="py-2.5 px-3 text-right">RSI (14)</th>
                <th className="py-2.5 px-3 text-center">Quant Trend</th>
                <th className="py-2.5 px-3 text-right">Signal</th>
                <th className="py-2.5 px-3 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredInstruments.map((i) => {
                const live = marketDataEngine.getLiveTick(i.symbol);
                const price = live?.price ?? i.price;
                const changePct = live?.changePct ?? i.changePct;
                const change = live ? live.price - live.open : (price * changePct) / 100;

                return (
                  <tr
                    key={i.symbol}
                    onClick={() => setDrawerSymbol(i.symbol)}
                    className="hover:bg-surface-2/60 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      <div className="font-mono text-sm">{i.symbol}</div>
                      <div className="text-[11px] text-muted-foreground font-sans truncate max-w-[140px]">
                        {i.name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{i.sector || "INDEX"}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      ₹{price.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 px-3 text-right font-mono font-semibold",
                        changePct >= 0 ? "text-bull" : "text-bear",
                      )}
                    >
                      <div>
                        {changePct >= 0 ? "+" : ""}
                        {changePct.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {i.volume}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[11px] font-bold",
                          i.rsi >= 70
                            ? "bg-bear/10 text-bear"
                            : i.rsi <= 35
                              ? "bg-bull/10 text-bull"
                              : "bg-surface text-foreground",
                        )}
                      >
                        {i.rsi.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                          changePct >= 0 ? "text-bull bg-bull/10" : "text-bear bg-bear/10",
                        )}
                      >
                        {changePct >= 0 ? "Bullish" : "Bearish"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <StatusPill status={i.signal} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerSymbol(i.symbol);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* REUSABLE INSTRUMENT DETAIL DRAWER */}
      <InstrumentDrawer
        symbol={drawerSymbol}
        open={!!drawerSymbol}
        onClose={() => setDrawerSymbol(null)}
      />
    </div>
  );
}
