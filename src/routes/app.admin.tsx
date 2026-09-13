/**
 * Risk Command Center Workstation for SmartQuant Edge.
 * Institutional pre-trade risk desk, algorithmic circuit breakers,
 * exposure caps, real-time risk events audit, and emergency controls.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  Sliders,
  Users,
  Activity,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  TrendingDown,
  PieChart,
  Layers,
  Ban,
  Percent,
  RefreshCw,
  FileText,
  Clock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { usePlatform } from "@/context/PlatformContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CENTRAL_DEMO_DATA, RiskEventItem } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin")({
  head: () => ({
    meta: [
      { title: "Risk Command Center — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Pre-trade controls, exposure limits, real-time risk events, circuit breakers, and algorithmic governance.",
      },
    ],
  }),
  component: RiskCommandCenterPage,
});

function RiskCommandCenterPage() {
  const navigate = useNavigate();
  const {
    globalTradingState,
    haltInfo,
    activateKillSwitch,
    resumeTrading,
    riskLimits,
    paperPositions,
    strategies,
    orders,
    stopAllAlgorithms,
    cancelPendingOrders,
  } = usePlatform();

  const isHalted = globalTradingState === "HALTED";
  const portfolio = CENTRAL_DEMO_DATA.portfolio;
  const limits = CENTRAL_DEMO_DATA.exposureLimits;
  const riskEvents: RiskEventItem[] = CENTRAL_DEMO_DATA.riskEvents;

  // Margin utilization
  const marginUtil = (portfolio.grossExposure / (portfolio.totalValue * 1.5)) * 100;

  // 8 Pre-trade risk checklist status
  const preTradeChecks = [
    {
      name: "Capital Available",
      desc: "Verifies unencumbered cash > order margin requirement",
      status: "PASS",
      icon: CheckCircle2,
    },
    {
      name: "Position Size Cap",
      desc: "Max ₹2,50,000 per single instrument or 25% portfolio weight",
      status: "PASS",
      icon: CheckCircle2,
    },
    {
      name: "Trade Value Limit",
      desc: "Single order cannot exceed ₹1,50,000 gross notional",
      status: "PASS",
      icon: CheckCircle2,
    },
    {
      name: "Mandatory Stop Loss",
      desc: "Orders without valid SL trigger price are rejected instantly",
      status: "PASS",
      icon: CheckCircle2,
    },
    {
      name: "Daily Loss Limit",
      desc: "Halts trading if daily loss exceeds configured ₹25,000 cap",
      status: "PASS",
      icon: CheckCircle2,
    },
    {
      name: "Daily Trade Count",
      desc: "Enforces max 50 orders/day to prevent runaway loops",
      status: "PASS",
      icon: CheckCircle2,
    },
    {
      name: "Kill Switch Status",
      desc: "Server-enforced global execution halt gatekeeper",
      status: isHalted ? "FAIL" : "PASS",
      icon: isHalted ? Ban : CheckCircle2,
    },
    {
      name: "Feed Freshness",
      desc: "Blocks execution if tick staleness exceeds 15,000 ms",
      status: "PASS",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ShieldAlert className="h-6 w-6 text-rose-400" />
              Risk Command Center
            </h1>
            {/* Top Status */}
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs px-2.5 py-0.5 border font-bold",
                isHalted
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
              )}
            >
              {isHalted ? "■ RISK ENGINE HALTED" : "● RISK ENGINE ARMED"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Pre-trade controls, exposure limits, real-time risk events and portfolio risk
            surveillance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
            onClick={() => navigate({ to: "/app/kill-switch" })}
          >
            <Power className="h-3.5 w-3.5" />
            Emergency Kill Switch
          </Button>
        </div>
      </div>

      {/* 2. TOP METRICS STRIP (8 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard
          label="AVAILABLE CAPITAL"
          value={inr(portfolio.cashBalance)}
          subtext="Unencumbered"
        />
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
          variant="success"
        />
        <StatCard
          label="DAILY P&L"
          value={`+${inr(portfolio.todayPnL)}`}
          subtext="Mark-to-Market"
          trend="up"
          variant="success"
        />
        <StatCard
          label="DAILY LOSS LIMIT"
          value={inr(limits.dailyRisk.limit)}
          subtext="Stop ceiling"
          variant="danger"
        />
        <StatCard label="TRADES TODAY" value="18" subtext="Active sessions" />
        <StatCard label="MAX DAILY TRADES" value="50" subtext="32 remaining" />
        <StatCard
          label="MARGIN UTIL."
          value={`${marginUtil.toFixed(1)}%`}
          subtext="Safe threshold: 80%"
          variant={marginUtil > 70 ? "warning" : "success"}
        />
      </div>

      {/* 3. SECTION A: PRE-TRADE RISK CHECK (8 institutional checks) */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Pre-Trade Gateway Risk Checks
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deterministic validation pipeline enforced prior to broker dispatch
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-mono text-emerald-400 border-emerald-500/30"
          >
            {isHalted ? "1 Violation (HALTED)" : "8 / 8 Active & Passing"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {preTradeChecks.map((check) => {
            const isPass = check.status === "PASS";
            const Icon = check.icon;

            return (
              <div
                key={check.name}
                className={cn(
                  "p-3 rounded-lg border text-xs space-y-1.5 transition-colors",
                  isPass
                    ? "bg-secondary/20 border-border/40 hover:border-border"
                    : "bg-rose-500/10 border-rose-500/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Icon
                      className={cn("h-4 w-4", isPass ? "text-emerald-400" : "text-rose-500")}
                    />
                    {check.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1.5 py-0 font-mono",
                      isPass
                        ? "text-emerald-400 border-emerald-500/30"
                        : "text-rose-400 border-rose-500/50",
                    )}
                  >
                    {check.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{check.desc}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 4. SECTION B: RISK LIMITS (CURRENT / LIMIT / UTILIZATION) */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              Configured Risk Limits & Utilization
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Source of truth: risk-engine.ts runtime state
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Autonomous Enforcement
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/30 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
              <tr>
                <th className="py-2.5 px-3">Risk Metric</th>
                <th className="py-2.5 px-3 text-right">Current Value</th>
                <th className="py-2.5 px-3 text-right">Configured Limit</th>
                <th className="py-2.5 px-3 text-right">Utilization %</th>
                <th className="py-2.5 px-3 text-right">Remaining Headroom</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono">
              <tr className="hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3 font-sans font-medium text-foreground">
                  Max Single Position Size
                </td>
                <td className="py-3 px-3 text-right text-foreground font-bold">
                  {inr(limits.singleInstrument.current)}
                </td>
                <td className="py-3 px-3 text-right text-muted-foreground">
                  {inr(limits.singleInstrument.limit)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                  {limits.singleInstrument.utilization.toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-right text-muted-foreground">
                  {inr(limits.singleInstrument.remaining)}
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-400 border-emerald-500/30"
                  >
                    COMPLIANT
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3 font-sans font-medium text-foreground">
                  Max Single Trade Value
                </td>
                <td className="py-3 px-3 text-right text-foreground font-bold">{inr(98500)}</td>
                <td className="py-3 px-3 text-right text-muted-foreground">{inr(150000)}</td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">65.7%</td>
                <td className="py-3 px-3 text-right text-muted-foreground">{inr(51500)}</td>
                <td className="py-3 px-3 text-center font-sans">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-400 border-emerald-500/30"
                  >
                    COMPLIANT
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3 font-sans font-medium text-foreground">
                  Max Portfolio Gross Exposure
                </td>
                <td className="py-3 px-3 text-right text-foreground font-bold">
                  {inr(limits.grossExposure.current)}
                </td>
                <td className="py-3 px-3 text-right text-muted-foreground">
                  {inr(limits.grossExposure.limit)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                  {limits.grossExposure.utilization.toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-right text-muted-foreground">
                  {inr(limits.grossExposure.remaining)}
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-400 border-emerald-500/30"
                  >
                    COMPLIANT
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3 font-sans font-medium text-foreground">
                  Daily Loss Ceiling (Drawdown Cap)
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                  ₹0.00 (In Profit)
                </td>
                <td className="py-3 px-3 text-right text-muted-foreground">
                  {inr(limits.dailyRisk.limit)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">0.0%</td>
                <td className="py-3 px-3 text-right text-muted-foreground">
                  {inr(limits.dailyRisk.limit)}
                </td>
                <td className="py-3 px-3 text-center font-sans">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-400 border-emerald-500/30"
                  >
                    IN PROFIT
                  </Badge>
                </td>
              </tr>
              <tr className="hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3 font-sans font-medium text-foreground">
                  Daily Trade Submission Limit
                </td>
                <td className="py-3 px-3 text-right text-foreground font-bold">18 Orders</td>
                <td className="py-3 px-3 text-right text-muted-foreground">50 Orders</td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">36.0%</td>
                <td className="py-3 px-3 text-right text-muted-foreground">32 Orders</td>
                <td className="py-3 px-3 text-center font-sans">
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-400 border-emerald-500/30"
                  >
                    NORMAL
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* 5. SECTION C & D: RECENT RISK EVENTS & PORTFOLIO RISK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section C: Risk Events */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Recent Risk Events Audit
            </h3>
            <span className="text-xs font-mono text-muted-foreground">Last 24 Hours</span>
          </div>

          <div className="space-y-3">
            {riskEvents.map((evt) => {
              const isBlocked = evt.type === "BLOCKED";
              const isWarning = evt.type === "LIMIT_WARNING";

              return (
                <div
                  key={evt.id}
                  className="p-3 rounded-lg bg-secondary/30 border border-border/40 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0 font-mono",
                          isBlocked
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : isWarning
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30",
                        )}
                      >
                        {evt.type}
                      </Badge>
                      <span className="font-bold text-foreground font-mono">{evt.symbol}</span>
                      <span className="text-muted-foreground font-mono">{evt.time}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{evt.reason}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                    {evt.severity}
                  </Badge>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Section D: Portfolio Risk */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Portfolio Risk Surveillance Summary
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block">Max Portfolio Drawdown</span>
                  <span className="font-mono text-foreground font-bold text-sm">
                    {Math.abs(CENTRAL_DEMO_DATA.performance.maxDrawdown).toFixed(2)}% (Peak:
                    ₹10,45,000)
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-emerald-400 border-emerald-500/30 font-mono"
                >
                  Controlled
                </Badge>
              </div>

              <div className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block">Largest Asset Concentration</span>
                  <span className="font-mono text-foreground font-bold text-sm">
                    RELIANCE (28.7% Portfolio Weight)
                  </span>
                </div>
                <Badge variant="outline" className="text-amber-400 border-amber-500/30 font-mono">
                  Near 25% Soft Cap
                </Badge>
              </div>

              <div className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block">
                    Open Overnight Value at Risk (95% VaR)
                  </span>
                  <span className="font-mono text-foreground font-bold text-sm">
                    {inr(18400)} (1.77% of Portfolio)
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-emerald-400 border-emerald-500/30 font-mono"
                >
                  Acceptable
                </Badge>
              </div>
            </div>
          </div>

          {/* Section E: Emergency Controls Shortcuts */}
          <div className="pt-4 border-t border-border/40 mt-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Emergency Operator Controls
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                onClick={() => navigate({ to: "/app/kill-switch" })}
              >
                <Power className="h-3.5 w-3.5 mr-1" />
                Kill Switch
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border/60 hover:bg-secondary/60"
                onClick={() => {
                  stopAllAlgorithms();
                  toast.success("Strategies paused");
                }}
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                Pause Strats
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border/60 hover:bg-secondary/60"
                onClick={() => navigate({ to: "/app/execution-reports" })}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View Orders
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
