/**
 * Strategy Conflict Detector for SmartQuant Edge.
 * Identifies opposing strategy signals on the same symbol (e.g. Momentum BUY vs Mean Reversion SELL)
 * and resolves via configured conflict policies.
 */

import { type StrategySignal } from "./signal-engine";
import { auditLogService } from "./audit-log-service";

export type ConflictResolutionPolicy =
  "BLOCK" | "HIGHEST_PRIORITY" | "MAJORITY_VOTE" | "RISK_ENGINE_DECIDES";

export interface SignalConflict {
  id: string;
  symbol: string;
  signals: StrategySignal[];
  status: "DETECTED" | "RESOLVED" | "BLOCKED";
  resolutionPolicy: ConflictResolutionPolicy;
  winningSignal?: StrategySignal;
  reason?: string;
  timestamp: string;
}

class StrategyConflictDetector {
  private activeConflicts: SignalConflict[] = [];
  private currentPolicy: ConflictResolutionPolicy = "BLOCK";

  public evaluateSignal(
    newSignal: StrategySignal,
    existingSignals: StrategySignal[],
  ): {
    hasConflict: boolean;
    conflict?: SignalConflict;
  } {
    // Search active signals on same symbol with opposite direction
    const opposing = existingSignals.filter(
      (s) =>
        s.symbol === newSignal.symbol &&
        s.strategyId !== newSignal.strategyId &&
        ((s.signalType === "BUY" && newSignal.signalType === "SELL") ||
          (s.signalType === "SELL" && newSignal.signalType === "BUY")),
    );

    if (opposing.length === 0) {
      return { hasConflict: false };
    }

    const conflictId = `CONF-${Math.floor(1000 + Math.random() * 9000)}`;
    const conflict: SignalConflict = {
      id: conflictId,
      symbol: newSignal.symbol,
      signals: [newSignal, ...opposing],
      status: this.currentPolicy === "BLOCK" ? "BLOCKED" : "RESOLVED",
      resolutionPolicy: this.currentPolicy,
      winningSignal: this.currentPolicy === "HIGHEST_PRIORITY" ? newSignal : undefined,
      timestamp: new Date().toISOString(),
    };

    this.activeConflicts.unshift(conflict);

    auditLogService.record({
      user: "Conflict Detector",
      device: "Execution Engine",
      category: "STRATEGY",
      action: "Strategy Conflict Detected",
      result: "WARNING",
      details: `⚠ Conflict on ${newSignal.symbol}: ${newSignal.strategyName} (${newSignal.signalType}) vs ${opposing[0].strategyName} (${opposing[0].signalType}). Policy: ${this.currentPolicy}`,
      entityId: conflictId,
    });

    return { hasConflict: true, conflict };
  }

  public getConflicts(): SignalConflict[] {
    return [...this.activeConflicts];
  }

  public setPolicy(policy: ConflictResolutionPolicy) {
    this.currentPolicy = policy;
  }

  public getPolicy(): ConflictResolutionPolicy {
    return this.currentPolicy;
  }
}

export const strategyConflictDetector = new StrategyConflictDetector();
