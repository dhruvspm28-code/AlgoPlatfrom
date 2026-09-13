/**
 * Global Command & Search Palette for SmartQuant Edge.
 * Shortcut: Ctrl+K / Cmd+K.
 * Allows quick search and navigation across Instruments, Strategies, Orders, and Desks.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Activity,
  Zap,
  BarChart3,
  ShieldAlert,
  Wallet,
  FileText,
  ShieldCheck,
  Radar,
  ArrowRight,
  TrendingUp,
  X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { instrumentMapper } from "@/services/instrument-mapper";
import { usePlatform } from "@/context/PlatformContext";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectInstrument?: (symbol: string) => void;
}

export function CommandPalette({ open, onOpenChange, onSelectInstrument }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { strategies } = usePlatform();

  const instruments = instrumentMapper.getAllWatchlist();

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Filter items
  const q = query.toLowerCase().trim();

  const filteredInstruments = instruments.filter(
    (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
  );

  const filteredStrategies = strategies.filter(
    (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
  );

  const navigationPages = [
    { title: "Live Execution Terminal", path: "/app/live", icon: Activity, group: "Trading" },
    { title: "Market Dashboard", path: "/app", icon: BarChart3, group: "Market" },
    { title: "Market Scanner", path: "/app/scanner", icon: Radar, group: "Market" },
    { title: "Quantitative Strategies", path: "/app/strategies", icon: Zap, group: "Research" },
    {
      title: "Quantitative Backtesting",
      path: "/app/backtest",
      icon: BarChart3,
      group: "Research",
    },
    { title: "Algo Monitor & Orders", path: "/app/monitor", icon: Zap, group: "Trading" },
    {
      title: "Portfolio Holdings & Positions",
      path: "/app/portfolio",
      icon: Wallet,
      group: "Trading",
    },
    { title: "Risk Command Center", path: "/app/admin", icon: ShieldAlert, group: "Risk" },
    {
      title: "Execution Reports & Audit Log",
      path: "/app/reports",
      icon: FileText,
      group: "Analytics",
    },
    {
      title: "Account & Security Center",
      path: "/app/profile",
      icon: ShieldCheck,
      group: "System",
    },
  ].filter((p) => p.title.toLowerCase().includes(q) || p.group.toLowerCase().includes(q));

  const handleSelectNav = (path: string) => {
    onOpenChange(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: path as any });
  };

  const handleSelectSymbol = (sym: string) => {
    onOpenChange(false);
    if (onSelectInstrument) {
      onSelectInstrument(sym);
    }
    navigate({ to: "/app/live" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-xl overflow-hidden shadow-2xl border-border bg-surface">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search instruments, strategies, orders, or navigation... (Esc to close)"
            className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4 text-xs">
          {/* Instruments */}
          {filteredInstruments.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Instruments ({filteredInstruments.length})
              </p>
              <div className="space-y-0.5">
                {filteredInstruments.slice(0, 5).map((inst) => (
                  <button
                    key={inst.symbol}
                    onClick={() => handleSelectSymbol(inst.symbol)}
                    className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{inst.symbol}</span>
                      <span className="text-[10px] text-muted-foreground">{inst.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-[10px] font-mono rounded bg-surface-3 px-1 py-0.2">
                        {inst.exchange}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          {navigationPages.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Navigation & Desks
              </p>
              <div className="space-y-0.5">
                {navigationPages.slice(0, 6).map((page) => (
                  <button
                    key={page.path}
                    onClick={() => handleSelectNav(page.path)}
                    className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <page.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-foreground">{page.title}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{page.group}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Strategies */}
          {filteredStrategies.length > 0 && (
            <div>
              <p className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Strategies
              </p>
              <div className="space-y-0.5">
                {filteredStrategies.map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => handleSelectNav("/app/strategies")}
                    className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium text-foreground">{strat.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {strat.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredInstruments.length === 0 &&
            navigationPages.length === 0 &&
            filteredStrategies.length === 0 && (
              <p className="py-8 text-center text-muted-foreground text-xs">
                No matching results for "{query}"
              </p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
