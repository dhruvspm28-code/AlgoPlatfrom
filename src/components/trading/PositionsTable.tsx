/**
 * Professional Broker Positions & Mark-to-Market P&L Table for SmartQuant Edge.
 * Real-time position valuation calculated dynamically on genuine MARKET_TICK events.
 * Displays: Symbol, Side, Qty, Avg Price, LTP, Invested, Current Value, P&L (₹), P&L (%), Day P&L.
 * Includes portfolio summary bar with Total Invested, Portfolio Value, Unrealized P&L, and Day P&L.
 */

import { useState, useEffect, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, Shield, Layers, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { paperBroker, type PaperPosition, type PaperPortfolio } from "@/services/paper-broker";
import { realtimeBus } from "@/services/realtime-bus";
import { inr } from "@/components/ui-kit/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface PositionsTableProps {
  onSelectSymbol?: (symbol: string) => void;
  className?: string;
}

export function PositionsTable({ onSelectSymbol, className }: PositionsTableProps) {
  const [positions, setPositions] = useState<PaperPosition[]>(() => paperBroker.getPositions());
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(() => paperBroker.getPortfolio());
  const [ticksVersion, setTicksVersion] = useState(0);

  // Subscribe to real-time market ticks and position updates
  useEffect(() => {
    const unsub1 = realtimeBus.subscribe("MARKET_TICK", () => {
      setPositions(paperBroker.getPositions());
      setPortfolio(paperBroker.getPortfolio());
      setTicksVersion((v) => v + 1);
    });

    const unsub2 = realtimeBus.subscribe("POSITION_UPDATED", () => {
      setPositions(paperBroker.getPositions());
      setPortfolio(paperBroker.getPortfolio());
      setTicksVersion((v) => v + 1);
    });

    const unsub3 = realtimeBus.subscribe("ORDER_EXECUTED", () => {
      setPositions(paperBroker.getPositions());
      setPortfolio(paperBroker.getPortfolio());
      setTicksVersion((v) => v + 1);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const totalInvested = useMemo(
    () => positions.reduce((acc, p) => acc + (p.investedValue ?? p.qty * p.avgPrice), 0),
    [positions, ticksVersion],
  );

  const totalCurrentValue = useMemo(
    () => positions.reduce((acc, p) => acc + (p.currentValue ?? p.qty * (p.ltp || p.currentPrice)), 0),
    [positions, ticksVersion],
  );

  const totalUnrealizedPnl = useMemo(
    () => positions.reduce((acc, p) => acc + p.pnl, 0),
    [positions, ticksVersion],
  );

  const totalPnlPct = useMemo(() => {
    if (totalInvested === 0) return 0;
    return Number(((totalUnrealizedPnl / totalInvested) * 100).toFixed(2));
  }, [totalInvested, totalUnrealizedPnl]);

  const totalDayPnl = useMemo(
    () => positions.reduce((acc, p) => acc + (p.dayPnl ?? 0), 0),
    [positions, ticksVersion],
  );

  const handleSquareOff = (symbol: string, side: "LONG" | "SHORT", qty: number) => {
    try {
      const closeSide = side === "LONG" ? "SELL" : "BUY";
      paperBroker.simulateOrder({
        idempotencyKey: `sq-${symbol}-${Date.now()}`,
        symbol,
        side: closeSide,
        orderType: "MARKET",
        qty,
        price: 0,
      });
      toast.success(`Position ${symbol} squared off successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to square off");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Portfolio Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-border/60 bg-surface-2/40 p-2.5">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Total Invested
          </p>
          <p className="text-base font-bold font-mono text-foreground mt-0.5">
            {inr(totalInvested)}
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-surface-2/40 p-2.5">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Current Value
          </p>
          <p className="text-base font-bold font-mono text-foreground mt-0.5">
            {inr(totalCurrentValue)}
          </p>
        </div>

        <div
          className={cn(
            "rounded-lg border p-2.5",
            totalUnrealizedPnl > 0
              ? "border-bull/30 bg-bull/5"
              : totalUnrealizedPnl < 0
                ? "border-bear/30 bg-bear/5"
                : "border-border/60 bg-surface-2/40",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
              Total Unrealized P&L
            </p>
            <span
              className={cn(
                "text-[10px] font-bold font-mono px-1.5 py-0.2 rounded",
                totalUnrealizedPnl > 0
                  ? "text-bull bg-bull/15"
                  : totalUnrealizedPnl < 0
                    ? "text-bear bg-bear/15"
                    : "text-muted-foreground bg-surface-2",
              )}
            >
              {totalUnrealizedPnl >= 0 ? "+" : ""}
              {totalPnlPct}%
            </span>
          </div>
          <p
            className={cn(
              "text-base font-bold font-mono mt-0.5",
              totalUnrealizedPnl > 0 ? "text-bull" : totalUnrealizedPnl < 0 ? "text-bear" : "text-foreground",
            )}
          >
            {totalUnrealizedPnl >= 0 ? "+" : ""}
            {inr(totalUnrealizedPnl)}
          </p>
        </div>

        <div
          className={cn(
            "rounded-lg border p-2.5",
            totalDayPnl > 0
              ? "border-bull/30 bg-bull/5"
              : totalDayPnl < 0
                ? "border-bear/30 bg-bear/5"
                : "border-border/60 bg-surface-2/40",
          )}
        >
          <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Day P&L
          </p>
          <p
            className={cn(
              "text-base font-bold font-mono mt-0.5",
              totalDayPnl > 0 ? "text-bull" : totalDayPnl < 0 ? "text-bear" : "text-foreground",
            )}
          >
            {totalDayPnl >= 0 ? "+" : ""}
            {inr(totalDayPnl)}
          </p>
        </div>
      </div>

      {/* Positions Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-surface-2/70 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-2 text-center">Side</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Avg Price</th>
                <th className="py-2.5 px-3 text-right">Current LTP</th>
                <th className="py-2.5 px-3 text-right">Invested</th>
                <th className="py-2.5 px-3 text-right">Current Value</th>
                <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                <th className="py-2.5 px-3 text-right">P&L %</th>
                <th className="py-2.5 px-3 text-right">Day P&L</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-[11px]">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground font-sans">
                    No open paper positions. Place an order from the Order Ticket above.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const ltp = pos.ltp || pos.currentPrice;
                  const isPositive = pos.pnl > 0;
                  const isNegative = pos.pnl < 0;
                  const dayPositive = (pos.dayPnl ?? 0) > 0;
                  const dayNegative = (pos.dayPnl ?? 0) < 0;

                  return (
                    <tr
                      key={pos.symbol}
                      onClick={() => onSelectSymbol?.(pos.symbol)}
                      className="hover:bg-surface-2/60 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-sans font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{pos.symbol}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                            pos.side === "LONG"
                              ? "bg-bull/15 text-bull"
                              : "bg-bear/15 text-bear",
                          )}
                        >
                          {pos.side}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-foreground font-semibold">
                        {pos.qty}
                      </td>

                      <td className="py-2.5 px-3 text-right text-muted-foreground">
                        {inr(pos.avgPrice)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
                        {inr(ltp)}
                      </td>

                      <td className="py-2.5 px-3 text-right text-muted-foreground">
                        {inr(pos.investedValue ?? pos.qty * pos.avgPrice)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                        {inr(pos.currentValue ?? pos.qty * ltp)}
                      </td>

                      <td
                        className={cn(
                          "py-2.5 px-3 text-right font-bold",
                          isPositive ? "text-bull" : isNegative ? "text-bear" : "text-muted-foreground",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {inr(pos.pnl)}
                      </td>

                      <td
                        className={cn(
                          "py-2.5 px-3 text-right font-bold",
                          isPositive ? "text-bull" : isNegative ? "text-bear" : "text-muted-foreground",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {pos.pnlPct.toFixed(2)}%
                      </td>

                      <td
                        className={cn(
                          "py-2.5 px-3 text-right font-semibold",
                          dayPositive ? "text-bull" : dayNegative ? "text-bear" : "text-muted-foreground",
                        )}
                      >
                        {dayPositive ? "+" : ""}
                        {inr(pos.dayPnl ?? 0)}
                      </td>

                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSquareOff(pos.symbol, pos.side, pos.qty)}
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground border-border/60 hover:border-bear/50 hover:bg-bear/10 transition-colors"
                        >
                          Exit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
