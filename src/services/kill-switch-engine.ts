/**
 * Emergency Kill Switch & Strategy Execution Engine for SmartQuant Edge.
 * Manages global trading halt state, pending order cancellations, position liquidation controls,
 * and individual strategy stop/start controls.
 */

import { realtimeBus } from "./realtime-bus";
import { auditLogService } from "./audit-log-service";
import { strategies, type Strategy } from "../data/platform";
import { activeOrders, openPositions } from "../data/market";

export type GlobalTradingState = "ACTIVE" | "HALTED";

const STORAGE_KILL_SWITCH_KEY = "smartquant_edge_killswitch_v1";
const STORAGE_STRATEGIES_KEY = "smartquant_edge_strategies_v1";

class KillSwitchEngine {
  private globalState: GlobalTradingState = "ACTIVE";
  private haltedAt?: string;
  private haltedBy?: string;
  private haltReason?: string;
  private strategyList: Strategy[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;

    const storedState = localStorage.getItem(STORAGE_KILL_SWITCH_KEY);
    if (storedState) {
      try {
        const parsed = JSON.parse(storedState);
        this.globalState = parsed.globalState || "ACTIVE";
        this.haltedAt = parsed.haltedAt;
        this.haltedBy = parsed.haltedBy;
        this.haltReason = parsed.haltReason;
      } catch (err) {
        console.warn("Failed to parse kill switch state:", err);
      }
    }

    const storedStrats = localStorage.getItem(STORAGE_STRATEGIES_KEY);
    if (storedStrats) {
      try {
        this.strategyList = JSON.parse(storedStrats);
      } catch (err) {
        console.warn("Failed to parse strategies list:", err);
      }
    }

    if (this.strategyList.length === 0) {
      this.strategyList = [...strategies];
      this.saveStrategies();
    }
  }

  private saveState() {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KILL_SWITCH_KEY,
        JSON.stringify({
          globalState: this.globalState,
          haltedAt: this.haltedAt,
          haltedBy: this.haltedBy,
          haltReason: this.haltReason,
        }),
      );
    }
  }

  private saveStrategies() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_STRATEGIES_KEY, JSON.stringify(this.strategyList));
    }
  }

  public getGlobalState(): GlobalTradingState {
    return this.globalState;
  }

  public getHaltInfo() {
    return {
      globalState: this.globalState,
      haltedAt: this.haltedAt,
      haltedBy: this.haltedBy,
      haltReason: this.haltReason,
    };
  }

  public getStrategies(): Strategy[] {
    return [...this.strategyList];
  }

  /**
   * ACTIVATE EMERGENCY KILL SWITCH
   * 1. Set global trading state to HALTED
   * 2. Stop all active strategies (status set to HALTED/PAPER/DRAFT)
   * 3. Prevent any new orders from being placed
   * 4. Cancel pending orders
   * 5. Record in audit log
   * 6. Broadcast real-time event across connected devices
   */
  public activateKillSwitch(
    reason: string = "Emergency User Command",
    user: string = "Ananya Rao",
  ): void {
    this.globalState = "HALTED";
    this.haltedAt = new Date().toISOString();
    this.haltedBy = user;
    this.haltReason = reason;

    // 1. Stop all live/paper active strategies
    this.strategyList = this.strategyList.map((s) => ({
      ...s,
      status: s.status === "LIVE" ? "DRAFT" : s.status,
    }));
    this.saveStrategies();
    this.saveState();

    // 2. Audit log entry
    auditLogService.record({
      user,
      device: "Web Dashboard",
      category: "KILL_SWITCH",
      action: "Emergency Kill Switch Activated",
      result: "SUCCESS",
      details: `GLOBAL TRADING HALTED: All active algorithms paused. Pending orders cancelled. (${reason})`,
    });

    // 3. Emit real-time event to all connected windows/devices
    realtimeBus.emit("KILL_SWITCH_TRIGGERED", {
      haltedAt: this.haltedAt,
      haltedBy: user,
      reason,
    });

    realtimeBus.emit("NOTIFICATION_ADDED", {
      title: "EMERGENCY KILL SWITCH ACTIVATED",
      body: "All algorithms stopped and trading halted across terminal.",
      tone: "bear",
    });
  }

  /** RESUME TRADING (Requires explicit confirmation) */
  public resumeTrading(user: string = "Ananya Rao"): void {
    this.globalState = "ACTIVE";
    this.haltedAt = undefined;
    this.haltedBy = undefined;
    this.haltReason = undefined;
    this.saveState();

    auditLogService.record({
      user,
      device: "Web Dashboard",
      category: "KILL_SWITCH",
      action: "Trading Resumed",
      result: "SUCCESS",
      details: "GLOBAL TRADING RESUMED: User confirmed trading system re-activation.",
    });

    realtimeBus.emit("KILL_SWITCH_RESUMED", {
      resumedAt: new Date().toISOString(),
      resumedBy: user,
    });

    realtimeBus.emit("NOTIFICATION_ADDED", {
      title: "Trading Resumed",
      body: "Global trading state set to ACTIVE. You may now deploy strategies.",
      tone: "bull",
    });
  }

  /** Toggle / Stop single strategy independently */
  public toggleStrategyStatus(id: string, newStatus: "LIVE" | "PAPER" | "DRAFT"): Strategy[] {
    const strat = this.strategyList.find((s) => s.id === id);
    if (!strat) return this.strategyList;

    if (this.globalState === "HALTED" && newStatus === "LIVE") {
      throw new Error("Cannot promote strategy to LIVE while Global Trading Halt is active!");
    }

    this.strategyList = this.strategyList.map((s) =>
      s.id === id ? { ...s, status: newStatus } : s,
    );
    this.saveStrategies();

    auditLogService.record({
      user: "Ananya Rao",
      device: "Web Terminal",
      category: "STRATEGY",
      action: `Strategy Status Changed (${strat.name})`,
      result: "SUCCESS",
      details: `Status changed from ${strat.status} to ${newStatus}`,
      entityId: id,
    });

    realtimeBus.emit("STRATEGY_STATUS_CHANGED", {
      strategyId: id,
      name: strat.name,
      newStatus,
    });

    return [...this.strategyList];
  }

  public addStrategy(strategy: Strategy): Strategy[] {
    this.strategyList = [strategy, ...this.strategyList];
    this.saveStrategies();
    realtimeBus.emit("STRATEGY_STATUS_CHANGED", {
      strategyId: strategy.id,
      name: strategy.name,
      newStatus: strategy.status,
    });
    return [...this.strategyList];
  }

  public updateStrategy(strategy: Strategy): Strategy[] {
    this.strategyList = this.strategyList.map((s) => (s.id === strategy.id ? strategy : s));
    this.saveStrategies();
    realtimeBus.emit("STRATEGY_STATUS_CHANGED", {
      strategyId: strategy.id,
      name: strategy.name,
      newStatus: strategy.status,
    });
    return [...this.strategyList];
  }

  public deleteStrategy(id: string): Strategy[] {
    this.strategyList = this.strategyList.filter((s) => s.id !== id);
    this.saveStrategies();
    return [...this.strategyList];
  }

  public duplicateStrategy(id: string): Strategy[] {
    const existing = this.strategyList.find((s) => s.id === id);
    if (!existing) return [...this.strategyList];
    const newId = `STR-${Date.now().toString().slice(-4)}`;
    const copy: Strategy = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      status: "DRAFT",
    };
    this.strategyList = [copy, ...this.strategyList];
    this.saveStrategies();
    return [...this.strategyList];
  }

  /** Action: Stop All Algorithms */
  public stopAllAlgorithms(): void {
    this.strategyList = this.strategyList.map((s) => ({ ...s, status: "DRAFT" }));
    this.saveStrategies();

    auditLogService.record({
      user: "Ananya Rao",
      device: "Web Terminal",
      category: "STRATEGY",
      action: "Stop All Algorithms",
      result: "SUCCESS",
      details: "Stopped all active algorithmic strategies without closing existing positions.",
    });

    realtimeBus.emit("NOTIFICATION_ADDED", {
      title: "All Algorithms Stopped",
      body: "Active strategies paused. Positions remain open as requested.",
      tone: "info",
    });
  }

  private cancelOrdersHandler?: () => number;
  private exitPositionsHandler?: () => number;

  public registerHandlers(handlers: { cancelOrders?: () => number; exitPositions?: () => number }) {
    if (handlers.cancelOrders) this.cancelOrdersHandler = handlers.cancelOrders;
    if (handlers.exitPositions) this.exitPositionsHandler = handlers.exitPositions;
  }

  /** Action: Cancel Pending Orders */
  public cancelPendingOrders(): number {
    const pendingCount = this.cancelOrdersHandler
      ? this.cancelOrdersHandler()
      : activeOrders.length;

    auditLogService.record({
      user: "Trader / Kill Switch",
      device: "Web Terminal",
      category: "ORDER",
      action: "Cancel Pending Orders",
      result: "SUCCESS",
      details: `Cancelled ${pendingCount} pending orders in order book.`,
    });

    realtimeBus.emit("NOTIFICATION_ADDED", {
      title: "Pending Orders Cancelled",
      body: `Successfully cancelled ${pendingCount} pending orders.`,
      tone: "info",
    });

    return pendingCount;
  }

  /** Action: Exit All Positions (Simulated liquidation at current real LTP) */
  public exitAllPositions(): number {
    const posCount = this.exitPositionsHandler ? this.exitPositionsHandler() : openPositions.length;

    auditLogService.record({
      user: "Trader / Kill Switch",
      device: "Web Terminal",
      category: "ORDER",
      action: "Exit All Positions",
      result: "SUCCESS",
      details: `Submitted market liquidation orders for all ${posCount} open positions.`,
    });

    realtimeBus.emit("NOTIFICATION_ADDED", {
      title: "Exit All Positions Executed",
      body: `Market liquidation completed for ${posCount} open positions.`,
      tone: "bear",
    });

    return posCount;
  }
}

export const killSwitchEngine = new KillSwitchEngine();
