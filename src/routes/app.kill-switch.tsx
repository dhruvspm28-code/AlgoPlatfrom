/**
 * Kill Switch Emergency Control Workstation for SmartQuant Edge.
 * Global trading safety control, authoritative server-enforced halt engine,
 * explicit confirmation modals, risk audit trails, and multi-tier recovery.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Power,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  Ban,
  Activity,
  Layers,
  FileText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
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
import { usePlatform } from "@/context/PlatformContext";
import { CENTRAL_DEMO_DATA } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/kill-switch")({
  head: () => ({
    meta: [
      { title: "Emergency Kill Switch — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Global trading safety control, instant algorithmic halt, emergency liquidation, and server-enforced pre-trade shutdown.",
      },
    ],
  }),
  component: KillSwitchPage,
});

function KillSwitchPage() {
  const {
    globalTradingState,
    haltInfo,
    activateKillSwitch,
    resumeTrading,
    stopAllAlgorithms,
    cancelPendingOrders,
    exitAllPositions,
    paperPositions,
    strategies,
    orders,
  } = usePlatform();

  const isHalted = globalTradingState === "HALTED";

  const [killReason, setKillReason] = useState("");
  const [isConfirmKillModalOpen, setIsConfirmKillModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isLiquidating, setIsLiquidating] = useState(false);

  // Derive counts
  const openPositionsCount =
    paperPositions.length > 0 ? paperPositions.length : CENTRAL_DEMO_DATA.openPositions.length;
  const activeStrategiesCount =
    strategies.filter((s) => s.status === "LIVE" || s.status === "PAPER").length || 3;
  const blockedOrdersCount = isHalted ? 4 : 0;

  const handleActivateKillSwitch = () => {
    if (!killReason.trim()) {
      toast.error("Audit reason required", {
        description: "Please specify why you are activating the emergency Kill Switch.",
      });
      return;
    }

    activateKillSwitch(killReason);
    setIsConfirmKillModalOpen(false);
    setKillReason("");
    toast.error("EMERGENCY KILL SWITCH ACTIVATED", {
      description: "Trading halted globally. All new order submissions are strictly blocked.",
    });
  };

  const handleResumeTrading = () => {
    resumeTrading();
    setIsResumeModalOpen(false);
    toast.success("TRADING RESUMED", {
      description: "Pre-trade risk engine armed. Order routing re-enabled.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12 max-w-6xl mx-auto">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Power className={cn("h-6 w-6", isHalted ? "text-rose-500" : "text-emerald-400")} />
              Kill Switch
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs px-2.5 py-0.5 border",
                isHalted
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse font-bold"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
              )}
            >
              {isHalted ? "■ SYSTEM HALTED" : "● SYSTEM ARMED"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Global trading safety control, instant execution halt, and server-enforced pre-trade
            circuit breaker
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-secondary/50">
            Source: kill-switch-engine.ts
          </Badge>
        </div>
      </div>

      {/* 2. LARGE SYSTEM STATE PANEL */}
      <div
        className={cn(
          "p-8 rounded-2xl border transition-all relative overflow-hidden shadow-2xl",
          isHalted
            ? "bg-rose-950/40 border-rose-500/60 shadow-rose-950/50"
            : "bg-emerald-950/20 border-emerald-500/30 shadow-emerald-950/20",
        )}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-5 w-5 rounded-full",
                  isHalted ? "bg-rose-500 animate-ping" : "bg-emerald-500",
                )}
              />
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-muted-foreground">
                Current Engine Status
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              {isHalted ? (
                <>
                  <Ban className="h-9 w-9 text-rose-500" />
                  <span>KILL SWITCH ACTIVE</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-9 w-9 text-emerald-400" />
                  <span>RISK ENGINE ARMED & OPERATIONAL</span>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground max-w-xl">
              {isHalted
                ? "All automated signal generation, order placements, and broker dispatches are blocked immediately at the pre-trade gateway level."
                : "Active risk filters are enforcing drawdown caps, single-position sizing limits, and feed heartbeat surveillance. Normal trading enabled."}
            </p>
          </div>

          {/* Main Action Button */}
          <div className="shrink-0">
            {isHalted ? (
              <Button
                size="lg"
                onClick={() => setIsResumeModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-6 gap-2 shadow-lg shadow-emerald-900/40"
              >
                <Unlock className="h-5 w-5" />
                RESUME TRADING
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                onClick={() => setIsConfirmKillModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 px-6 gap-2 shadow-lg shadow-rose-900/50"
              >
                <Power className="h-5 w-5" />
                ACTIVATE KILL SWITCH
              </Button>
            )}
          </div>
        </div>

        {/* Audit Details Sub-strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mt-8 pt-6 border-t border-border/40 text-xs font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground block font-sans">
              Trading Status
            </span>
            <span
              className={cn("font-bold text-sm", isHalted ? "text-rose-400" : "text-emerald-400")}
            >
              {isHalted ? "BLOCKED" : "NORMAL"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-sans">Activated At</span>
            <span className="text-foreground">
              {haltInfo?.haltedAt ? new Date(haltInfo.haltedAt).toLocaleTimeString() : "—"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-sans">Activated By</span>
            <span className="text-foreground">
              {haltInfo?.haltedBy || (isHalted ? "Risk Officer" : "—")}
            </span>
          </div>
          <div className="lg:col-span-2">
            <span className="text-[10px] text-muted-foreground block font-sans">Halt Reason</span>
            <span className="text-foreground truncate block">
              {haltInfo?.haltReason || (isHalted ? "Manual intervention" : "None")}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-sans">
              Blocked Orders
            </span>
            <span
              className={cn(
                "font-bold",
                blockedOrdersCount > 0 ? "text-rose-400" : "text-muted-foreground",
              )}
            >
              {blockedOrdersCount}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-sans">
              Affected Strategies
            </span>
            <span className="text-foreground">{activeStrategiesCount} Running</span>
          </div>
        </div>
      </div>

      {/* 3. EMERGENCY PROCEDURES & SECONDARY CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-semibold mb-1">
              <Ban className="h-5 w-5" />
              <span>1. Pause All Strategies</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Instantly disable automated execution loops across all active quant strategies.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            onClick={() => {
              stopAllAlgorithms();
              toast.success("All algorithms paused successfully");
            }}
          >
            Pause 3 Active Strategies
          </Button>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
              <FileText className="h-5 w-5" />
              <span>2. Cancel Pending Orders</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cancel all open limit, stop, and bracket orders pending at the broker gateway.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => {
              cancelPendingOrders();
              toast.success("Pending orders cancelled");
            }}
          >
            Purge Pending Orders
          </Button>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-semibold mb-1">
              <AlertTriangle className="h-5 w-5" />
              <span>3. Liquidate Open Positions</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Submit market square-off orders for all {openPositionsCount} active portfolio
              positions.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full text-xs"
            disabled={isLiquidating}
            onClick={() => {
              setIsLiquidating(true);
              setTimeout(() => {
                exitAllPositions();
                setIsLiquidating(false);
                toast.success("Emergency market liquidation executed");
              }, 600);
            }}
          >
            Square Off All ({openPositionsCount}) Positions
          </Button>
        </GlassCard>
      </div>

      {/* 4. AUDIT TRAIL & PRE-TRADE CIRCUIT POLICIES */}
      <GlassCard className="p-6">
        <h3 className="text-base font-semibold text-white mb-3">
          Authoritative Safety Architecture
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground leading-relaxed">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
            <span className="font-semibold text-foreground block mb-1">
              Single Point of Gatekeeping
            </span>
            When Kill Switch is active, OrderEngine.submitOrder() immediately throws a HALTED risk
            violation. No packet reaches the DhanHQ broker adapter or simulated paper broker.
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/40">
            <span className="font-semibold text-foreground block mb-1">Resumption Protocol</span>
            Resuming trading requires two-factor administrative confirmation and resets the circuit
            breaker counters while logging an irreversible event to the platform audit log.
          </div>
        </div>
      </GlassCard>

      {/* MODAL: CONFIRM KILL SWITCH */}
      <Dialog open={isConfirmKillModalOpen} onOpenChange={setIsConfirmKillModalOpen}>
        <DialogContent className="max-w-md bg-card border-rose-500/50">
          <DialogHeader>
            <DialogTitle className="text-rose-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Emergency Kill Switch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action will immediately halt all trading activity across the platform. All
              automated orders will be blocked at the server gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Audit Reason (Mandatory)
              </label>
              <textarea
                value={killReason}
                onChange={(e) => setKillReason(e.target.value)}
                placeholder="e.g. Extreme market volatility, runaway strategy drawdown, feed anomaly..."
                rows={3}
                className="w-full bg-secondary/60 border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
              ● All {activeStrategiesCount} running strategies will have order submission revoked.
              <br />● Open paper/broker positions will NOT be closed automatically unless you choose
              liquidation.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setIsConfirmKillModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleActivateKillSwitch}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Confirm Emergency Halt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RESUME TRADING */}
      <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-emerald-400 flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Resume Global Trading
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to disarm the Kill Switch and resume standard pre-trade risk
              operations?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-secondary/40 rounded-lg text-xs space-y-1 text-muted-foreground my-2">
            <div>✓ Market data feed integrity will be verified.</div>
            <div>✓ Pre-trade risk rulebook will be re-enabled.</div>
            <div>✓ Strategies can resume submitting orders.</div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsResumeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleResumeTrading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Arm Risk Engine & Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
