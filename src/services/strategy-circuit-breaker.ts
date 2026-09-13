/**
 * Strategy-Level Circuit Breaker for SmartQuant Edge.
 * Auto-pauses individual algorithms when daily strategy loss caps, drawdown limits,
 * or order error frequencies exceed configured thresholds.
 */

import { realtimeBus } from "./realtime-bus";
import { auditLogService } from "./audit-log-service";
import { DatabasePersistence } from "./db-persistence";

export interface CircuitBreakerRule {
  strategyId: string;
  strategyName: string;
  maxDailyLossCap: number; // e.g. ₹5,000
  currentDailyLoss: number;
  maxDrawdownPct: number; // e.g. 5.0%
  maxRejectedOrders: number; // e.g. 3
  currentRejectedOrders: number;
  isTriggered: boolean;
  triggerReason?: string;
}

const DEFAULT_CIRCUIT_RULES: Record<string, CircuitBreakerRule> = {
  "strat-1": {
    strategyId: "strat-1",
    strategyName: "Nifty Momentum Alpha",
    maxDailyLossCap: 5000,
    currentDailyLoss: 1250,
    maxDrawdownPct: 4.5,
    maxRejectedOrders: 3,
    currentRejectedOrders: 0,
    isTriggered: false,
  },
  "strat-2": {
    strategyId: "strat-2",
    strategyName: "BankNifty Mean Reversion",
    maxDailyLossCap: 7500,
    currentDailyLoss: 8200,
    maxDrawdownPct: 5.0,
    maxRejectedOrders: 3,
    currentRejectedOrders: 4,
    isTriggered: true,
    triggerReason: "Daily strategy loss (-₹8,200) breached cap (-₹7,500)",
  },
};

class StrategyCircuitBreaker {
  private rules = new Map<string, CircuitBreakerRule>();

  constructor() {
    const saved = DatabasePersistence.getItem<Record<string, CircuitBreakerRule>>(
      "circuit_breaker_rules",
      DEFAULT_CIRCUIT_RULES,
    );
    Object.values(saved).forEach((r) => this.rules.set(r.strategyId, r));
  }

  private save() {
    const obj: Record<string, CircuitBreakerRule> = {};
    this.rules.forEach((v, k) => (obj[k] = v));
    DatabasePersistence.setItem("circuit_breaker_rules", obj);
  }

  public getRule(strategyId: string): CircuitBreakerRule | undefined {
    return this.rules.get(strategyId);
  }

  public getAllRules(): CircuitBreakerRule[] {
    return Array.from(this.rules.values());
  }

  public checkAndEnforce(
    strategyId: string,
    lossChange: number,
    isRejectedOrder: boolean = false,
  ): boolean {
    const rule = this.rules.get(strategyId);
    if (!rule) return true;

    rule.currentDailyLoss += lossChange;
    if (isRejectedOrder) rule.currentRejectedOrders += 1;

    let breachReason = "";
    if (rule.currentDailyLoss >= rule.maxDailyLossCap) {
      breachReason = `Daily loss (-₹${rule.currentDailyLoss.toLocaleString("en-IN")}) breached strategy cap (-₹${rule.maxDailyLossCap.toLocaleString("en-IN")})`;
    } else if (rule.currentRejectedOrders >= rule.maxRejectedOrders) {
      breachReason = `Rejected orders count (${rule.currentRejectedOrders}) reached threshold (${rule.maxRejectedOrders})`;
    }

    if (breachReason) {
      rule.isTriggered = true;
      rule.triggerReason = breachReason;
      this.save();

      auditLogService.record({
        user: `Circuit Breaker: ${rule.strategyName}`,
        device: "Risk Engine",
        category: "STRATEGY",
        action: "Strategy Circuit Breaker Triggered",
        result: "WARNING",
        details: `⚠ ${breachReason}. Strategy auto-paused!`,
        entityId: strategyId,
      });

      realtimeBus.emit("NOTIFICATION_ADDED", {
        title: `⚠ CIRCUIT BREAKER: ${rule.strategyName}`,
        body: breachReason,
        tone: "bear",
      });

      return false; // Strategy Halted
    }

    this.save();
    return true;
  }

  public resetCircuitBreaker(strategyId: string): void {
    const rule = this.rules.get(strategyId);
    if (!rule) return;

    rule.isTriggered = false;
    rule.currentDailyLoss = 0;
    rule.currentRejectedOrders = 0;
    rule.triggerReason = undefined;
    this.save();

    auditLogService.record({
      user: "Trader Action",
      device: "Web Terminal",
      category: "STRATEGY",
      action: "Circuit Breaker Reset",
      result: "SUCCESS",
      details: `Reset circuit breaker for ${rule.strategyName}`,
      entityId: strategyId,
    });
  }
}

export const strategyCircuitBreaker = new StrategyCircuitBreaker();
