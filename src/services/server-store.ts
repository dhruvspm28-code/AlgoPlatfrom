/**
 * Authoritative Server Store for SmartQuant Edge.
 * Manages server-side authoritative persistence for:
 * Users, Sessions, Strategies, Orders, Trades, Positions, Portfolio Snapshots,
 * Risk Events, Signals, Audit Events, and Explain Trade Chains.
 * Ensures trading ledger authority is independent of client browser localStorage.
 */

import { type UserProfile, type UserSession } from "./auth-service";
import { type Strategy } from "@/data/platform";
import { type DetailedOrder } from "./order-engine";
import { type PaperTrade, type PaperPosition, type PaperPortfolio } from "./paper-broker";
import { type StrategySignal } from "./signal-engine";
import { type RiskDecisionRecord, type RiskLimits } from "./risk-engine";
import { type AuditEntry } from "./audit-log-service";
import { type TradeExplainRecord } from "./trade-explainer";

export interface ServerDatabaseSchema {
  users: UserProfile[];
  sessions: UserSession[];
  strategies: Strategy[];
  orders: DetailedOrder[];
  trades: PaperTrade[];
  positions: PaperPosition[];
  portfolioSnapshots: Array<{ timestamp: string; portfolio: PaperPortfolio }>;
  riskLimits: RiskLimits | null;
  riskDecisions: RiskDecisionRecord[];
  signals: StrategySignal[];
  auditLogs: AuditEntry[];
  explainRecords: TradeExplainRecord[];
}

class ServerStore {
  private data: ServerDatabaseSchema = {
    users: [],
    sessions: [],
    strategies: [],
    orders: [],
    trades: [],
    positions: [],
    portfolioSnapshots: [],
    riskLimits: null,
    riskDecisions: [],
    signals: [],
    auditLogs: [],
    explainRecords: [],
  };

  constructor() {
    this.init();
  }

  private init() {
    // Initial in-memory authoritative ledger
  }

  // Generic Get / Set for table keys
  public getTable<K extends keyof ServerDatabaseSchema>(key: K): ServerDatabaseSchema[K] {
    return this.data[key];
  }

  public setTable<K extends keyof ServerDatabaseSchema>(
    key: K,
    value: ServerDatabaseSchema[K],
  ): void {
    this.data[key] = value;
  }

  // Specialized append methods
  public recordOrder(order: DetailedOrder): void {
    this.data.orders = [order, ...this.data.orders.filter((o) => o.id !== order.id)];
  }

  public recordTrade(trade: PaperTrade): void {
    this.data.trades = [trade, ...this.data.trades];
  }

  public updatePositions(positions: PaperPosition[]): void {
    this.data.positions = [...positions];
  }

  public recordSignal(signal: StrategySignal): void {
    this.data.signals = [signal, ...this.data.signals.slice(0, 49)];
  }

  public recordRiskDecision(decision: RiskDecisionRecord): void {
    this.data.riskDecisions = [decision, ...this.data.riskDecisions.slice(0, 49)];
  }

  public recordAuditLog(entry: AuditEntry): void {
    this.data.auditLogs = [entry, ...this.data.auditLogs.slice(0, 99)];
  }

  public recordExplainChain(record: TradeExplainRecord): void {
    this.data.explainRecords = [
      record,
      ...this.data.explainRecords.filter((r) => r.id !== record.id),
    ];
  }

  public getFullSnapshot(): ServerDatabaseSchema {
    return { ...this.data };
  }
}

export const serverStore = new ServerStore();
