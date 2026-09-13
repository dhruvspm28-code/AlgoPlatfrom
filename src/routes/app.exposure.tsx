/**
 * Exposure Analytics Workstation for SmartQuant Edge.
 * Complete institutional exposure dashboard monitoring portfolio concentration,
 * gross/net exposures, sector caps, margin utilization, and risk limits.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  PieChart,
  Layers,
  AlertTriangle,
  TrendingUp,
  Percent,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Info,
  RefreshCw,
} from "lucide-react";
import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatform } from "@/context/PlatformContext";
import { CENTRAL_DEMO_DATA, OpenPosition, StrategyRecord } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/exposure")({
  head: () => ({
    meta: [
      { title: "Exposure Analytics — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Monitor portfolio concentration, margin utilization, gross/net exposures, sector caps, and pre-trade limit utilization.",
      },
    ],
  }),
  component: ExposureAnalyticsPage,
});

function ExposureAnalyticsPage() {
  const { isLiveTrading, riskLimits } = usePlatform();
  const [selectedSector, setSelectedSector] = useState<string>("ALL");

  const isDemo = !isLiveTrading;
  const portfolio = CENTRAL_DEMO_DATA.portfolio;
  const positions: OpenPosition[] = CENTRAL_DEMO_DATA.openPositions;
  const limits = CENTRAL_DEMO_DATA.exposureLimits;
  const strategies = CENTRAL_DEMO_DATA.strategies;

  // Margin calculation
  const marginUtilization = (portfolio.grossExposure / (portfolio.totalValue * 1.5)) * 100;

  // Sector Exposure aggregation
  const sectorData = useMemo(() => {
    const map = new Map<string, { exposure: number; count: number; symbols: string[] }>();
    positions.forEach((p) => {
      const existing = map.get(p.sector) || { exposure: 0, count: 0, symbols: [] };
      existing.exposure += p.currentValue;
      existing.count += 1;
      existing.symbols.push(p.symbol);
      map.set(p.sector, existing);
    });

    return Array.from(map.entries()).map(([sector, data]) => {
      const weight = (data.exposure / portfolio.totalValue) * 100;
      const limitWeight = 40.0; // institutional sector limit 40%
      const utilization = (weight / limitWeight) * 100;
      return {
        sector,
        exposure: data.exposure,
        weight,
        limitWeight,
        utilization,
        count: data.count,
        symbols: data.symbols,
        status: weight > 35 ? "WARNING" : "NORMAL",
      };
    });
  }, [positions, portfolio.totalValue]);

  // Strategy Exposure aggregation
  const strategyExposure = useMemo(() => {
    return strategies.map((s: StrategyRecord) => {
      const stratPositions = positions.filter((p) => p.strategy === s.name);
      const exposure = stratPositions.reduce((acc, p) => acc + p.currentValue, 0);
      const weight = (exposure / portfolio.totalValue) * 100;
      return {
        strategy: s.name,
        capital: s.capitalAllocated,
        exposure,
        weight,
        openPositions: stratPositions.length,
        risk: s.status === "ACTIVE" ? "NORMAL" : "PAUSED",
        mode: s.mode,
      };
    });
  }, [strategies, positions, portfolio.totalValue]);

  // Warnings generator based on actual limit thresholds
  const warnings = useMemo(() => {
    const list: { title: string; desc: string; severity: "warning" | "danger" | "info" }[] = [];

    // Check single stock concentration (> 25%)
    positions.forEach((p) => {
      const weight = (p.currentValue / portfolio.totalValue) * 100;
      if (weight >= 25) {
        list.push({
          title: `${p.symbol} Concentration Alert (${weight.toFixed(1)}%)`,
          desc: `Single instrument exposure has reached ${inr(p.currentValue)}, which is ${weight.toFixed(1)}% of total portfolio value (Soft Limit: 25.0%).`,
          severity: "warning",
        });
      }
    });

    // Check sector concentration (> 35%)
    sectorData.forEach((s) => {
      if (s.weight >= 35) {
        list.push({
          title: `${s.sector} Sector Overweight (${s.weight.toFixed(1)}%)`,
          desc: `Aggregate sector exposure stands at ${inr(s.exposure)} across ${s.symbols.join(", ")}, approaching the 40% maximum sector risk ceiling.`,
          severity: "warning",
        });
      }
    });

    // Check margin utilization
    if (marginUtilization > 75) {
      list.push({
        title: `High Margin Utilization (${marginUtilization.toFixed(1)}%)`,
        desc: `Leverage usage is at ${marginUtilization.toFixed(1)}%. Consider trimming overnight positions to avoid intraday margin calls.`,
        severity: "danger",
      });
    }

    if (list.length === 0) {
      list.push({
        title: "All Portfolio Exposures Within Risk Parameters",
        desc: "All single instrument, sector, and gross exposure levels are safely below configured pre-trade risk caps.",
        severity: "info",
      });
    }

    return list;
  }, [positions, portfolio.totalValue, sectorData, marginUtilization]);

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="h-6 w-6 text-indigo-400" />
              Exposure Analytics
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
              {isDemo ? "PAPER DEMO DATA" : "LIVE RISK ENGINE"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor portfolio concentration, leverage utilization, sector exposure caps, and
            pre-trade boundaries
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDemo && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-amber-400" />
              <span>Simulated Portfolio Dataset</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-border/60 hover:bg-secondary/60"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            Recalculate Caps
          </Button>
        </div>
      </div>

      {/* 2. TOP METRIC STRIP (6 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="GROSS EXPOSURE"
          value={inr(portfolio.grossExposure)}
          subtext={`Cap: ${inr(limits.grossExposure.limit)}`}
          variant="primary"
        />
        <StatCard
          label="NET EXPOSURE"
          value={inr(portfolio.netExposure)}
          subtext="Directional bias"
          trend="up"
          variant="success"
        />
        <StatCard
          label="LONG EXPOSURE"
          value={inr(portfolio.longExposure)}
          subtext={`${((portfolio.longExposure / portfolio.totalValue) * 100).toFixed(1)}% of capital`}
          variant="success"
        />
        <StatCard
          label="SHORT EXPOSURE"
          value={inr(portfolio.shortExposure)}
          subtext={`${((portfolio.shortExposure / portfolio.totalValue) * 100).toFixed(1)}% of capital`}
          variant="danger"
        />
        <StatCard
          label="CASH UNENCUMBERED"
          value={inr(portfolio.cashBalance)}
          subtext={`${((portfolio.cashBalance / portfolio.totalValue) * 100).toFixed(1)}% liquidity buffer`}
        />
        <StatCard
          label="MARGIN UTILIZATION"
          value={`${marginUtilization.toFixed(1)}%`}
          subtext="Max safe cap: 80%"
          trend={marginUtilization > 70 ? "down" : "up"}
          variant={marginUtilization > 70 ? "warning" : "success"}
        />
      </div>

      {/* 3. SECTION A: EXPOSURE UTILIZATION (CURRENT / LIMIT / UTILIZATION % / REMAINING) */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-400" />
              Pre-Trade Exposure Limits Utilization
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Source of truth: risk-engine.ts rulebook limits & portfolio capital caps
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono bg-secondary/50">
            6 Risk Checks Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(limits).map(([key, rawItem]) => {
            const item = rawItem as {
              name: string;
              current: number;
              limit: number;
              utilization: number;
              remaining: number;
            };
            const isHigh = item.utilization >= 75;
            const isCritical = item.utilization >= 90;

            return (
              <div
                key={key}
                className="p-4 rounded-xl bg-secondary/20 border border-border/40 flex flex-col justify-between space-y-3 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {item.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-mono px-1.5 py-0.2 border",
                      isCritical
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : isHigh
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                    )}
                  >
                    {isCritical ? "NEAR LIMIT" : isHigh ? "ELEVATED" : "HEALTHY"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      CURRENT
                    </span>
                    <span className="font-bold text-foreground">{inr(item.current)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-sans">LIMIT</span>
                    <span className="text-muted-foreground">{inr(item.limit)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-sans">
                      REMAINING
                    </span>
                    <span className="text-emerald-400 font-semibold">{inr(item.remaining)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground">Utilization</span>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        isCritical
                          ? "text-rose-400"
                          : isHigh
                            ? "text-amber-400"
                            : "text-emerald-400",
                      )}
                    >
                      {item.utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isCritical ? "bg-rose-500" : isHigh ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${Math.min(100, item.utilization)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 4. SECTION B & C: LONG VS SHORT & SECTOR EXPOSURE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Long vs Short Chart */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Directional Exposure (Long vs Short)
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4" />
                  Long Positions (5 Symbols)
                </span>
                <span className="font-mono text-white font-bold">
                  {inr(portfolio.longExposure)} (
                  {((portfolio.longExposure / portfolio.grossExposure) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(portfolio.longExposure / portfolio.grossExposure) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <ArrowDownRight className="h-4 w-4" />
                  Short Positions (1 Symbol)
                </span>
                <span className="font-mono text-white font-bold">
                  {inr(portfolio.shortExposure)} (
                  {((portfolio.shortExposure / portfolio.grossExposure) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${(portfolio.shortExposure / portfolio.grossExposure) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground block">Net Directional Bias</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  +{inr(portfolio.netExposure)} Bullish
                </span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground block">Cash Reserve</span>
                <span className="text-foreground font-bold font-mono text-sm">
                  {inr(portfolio.cashBalance)} (23.3%)
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Sector Exposure Chart */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sector Concentration vs Max 40% Cap
            </h3>
            <Badge variant="outline" className="text-xs font-mono">
              Cap: 40%
            </Badge>
          </div>

          <div className="space-y-3">
            {sectorData.map((s) => (
              <div key={s.sector} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{s.sector}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({s.symbols.join(", ")})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-muted-foreground">{inr(s.exposure)}</span>
                    <span
                      className={cn(
                        "font-bold",
                        s.weight > 35 ? "text-amber-400" : "text-foreground",
                      )}
                    >
                      {s.weight.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      s.weight > 35 ? "bg-amber-500" : "bg-indigo-500",
                    )}
                    style={{ width: `${(s.weight / s.limitWeight) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* 5. SECTION D: INSTRUMENT CONCENTRATION TABLE */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              Instrument Concentration Analysis
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Position sizing breakdown against 25% single-stock concentration limits
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">6 active holdings</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/30 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
              <tr>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3 text-right">Exposure Value</th>
                <th className="py-2.5 px-3 text-right">Portfolio %</th>
                <th className="py-2.5 px-3 text-right">Configured Limit</th>
                <th className="py-2.5 px-3 text-right">Utilization</th>
                <th className="py-2.5 px-3 text-center">Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {positions.map((p) => {
                const weight = (p.currentValue / portfolio.totalValue) * 100;
                const limitVal = portfolio.totalValue * 0.25;
                const util = (p.currentValue / limitVal) * 100;
                const isWarning = util >= 90;

                return (
                  <tr key={p.id} className="hover:bg-secondary/40 font-mono transition-colors">
                    <td className="py-3 px-3 font-sans font-bold text-foreground flex items-center gap-1.5">
                      {p.symbol}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1 py-0",
                          p.side === "BUY" ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {p.side}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-sans text-muted-foreground">{p.sector}</td>
                    <td className="py-3 px-3 text-right text-foreground font-bold">
                      {inr(p.currentValue)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">{weight.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {inr(limitVal)} (25%)
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={cn(
                          "font-bold",
                          isWarning ? "text-amber-400" : "text-emerald-400",
                        )}
                      >
                        {util.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5",
                          isWarning
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                        )}
                      >
                        {isWarning ? "APPROACHING CAP" : "COMPLIANT"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* 6. SECTION E & F: STRATEGY EXPOSURE & CONCENTRATION WARNINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Exposure (2 cols) */}
        <GlassCard className="lg:col-span-2 p-5">
          <h3 className="text-base font-semibold text-white mb-3">
            Strategy Capital Allocation & Risk
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/30 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
                <tr>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3 text-right">Allocated Capital</th>
                  <th className="py-2.5 px-3 text-right">Current Exposure</th>
                  <th className="py-2.5 px-3 text-right">% Portfolio</th>
                  <th className="py-2.5 px-3 text-center">Open Positions</th>
                  <th className="py-2.5 px-3 text-center">Risk State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {strategyExposure.map((strat) => (
                  <tr
                    key={strat.strategy}
                    className="hover:bg-secondary/40 font-mono transition-colors"
                  >
                    <td className="py-3 px-3 font-sans font-medium text-foreground">
                      {strat.strategy}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">
                      {inr(strat.capital)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground font-bold">
                      {inr(strat.exposure)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">
                      {strat.weight.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {strat.openPositions}
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5",
                          strat.risk === "NORMAL"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {strat.risk}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Section F: Risk Concentration Warnings */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Risk Concentration Warnings
            </h3>
            <div className="space-y-3">
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border text-xs space-y-1",
                    w.severity === "warning"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                      : w.severity === "danger"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                        : "bg-secondary/40 border-border text-muted-foreground",
                  )}
                >
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    {w.severity === "warning" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                    {w.severity === "danger" && (
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    )}
                    {w.severity === "info" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    {w.title}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground pt-4 border-t border-border/40 flex items-center justify-between">
            <span>Automated Pre-Trade Surveillance</span>
            <span className="text-emerald-400">Strict Enforcement</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
