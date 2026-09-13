/**
 * Paper Trading Broker & Real-Time Mark-to-Market Engine for SmartQuant Edge.
 * Fills simulated paper orders against normalized real-time price ticks.
 * Manages paper positions, portfolio ledger, real-time MTM P&L, and idempotency protection.
 * Explicitly denotes all executions as "Simulated Paper Execution".
 */

import { realtimeBus } from "./realtime-bus";
import { marketDataEngine } from "./market-data-engine";
import { auditLogService } from "./audit-log-service";
import { DatabasePersistence } from "./db-persistence";
import { type NormalizedTick } from "./market-data-types";

export interface PaperPosition {
  symbol: string;
  side: "LONG" | "SHORT";
  qty: number;
  quantity?: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  strategyId?: string;
  stopLoss?: number;
  target?: number;
  updatedAt: string;
}

export interface PaperOrder {
  id: string;
  idempotencyKey: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "SL-M";
  qty: number;
  requestedPrice: number;
  fillPrice: number;
  status: "FILLED" | "REJECTED" | "CANCELLED";
  executionType: "SIMULATED_PAPER_FILL";
  timestamp: string;
}

export interface PaperTrade {
  id: string;
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  tradeValue: number;
  executionNote: string;
  timestamp: string;
}

export interface PaperPortfolio {
  cashBalance: number;
  investedCapital: number;
  totalPortfolioValue: number;
  unrealisedPnl: number;
  realisedPnl: number;
  todayPnl?: number;
}

class PaperBroker {
  private positions = new Map<string, PaperPosition>();
  private trades: PaperTrade[] = [];
  private processedKeys = new Set<string>();
  private cashBalance: number = 1000000; // ₹10,00,000 paper virtual ledger
  private realisedPnl: number = 24500;

  constructor() {
    this.loadState();
    this.subscribeToMarketTicks();
  }

  private loadState() {
    const savedPos = DatabasePersistence.getItem<PaperPosition[]>("paper_positions", [
      {
        symbol: "RELIANCE",
        side: "LONG",
        qty: 120,
        avgPrice: 2941.0,
        currentPrice: 2984.4,
        pnl: 5208,
        pnlPct: 1.48,
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "ICICIBANK",
        side: "LONG",
        qty: 50,
        avgPrice: 1260.0,
        currentPrice: 1284.05,
        pnl: 1202.5,
        pnlPct: 1.91,
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "TCS",
        side: "SHORT",
        qty: 25,
        avgPrice: 4160.0,
        currentPrice: 4128.75,
        pnl: 781.25,
        pnlPct: 0.75,
        updatedAt: new Date().toISOString(),
      },
    ]);
    savedPos.forEach((p) => this.positions.set(p.symbol, p));

    this.trades = DatabasePersistence.getItem<PaperTrade[]>("paper_trades", []);
  }

  private saveState() {
    DatabasePersistence.setItem("paper_positions", Array.from(this.positions.values()));
    DatabasePersistence.setItem("paper_trades", this.trades);
  }

  /**
   * Real-time Mark-to-Market listener:
   * Whenever a genuine tick arrives, update open position valuations and unrealized P&L
   */
  private subscribeToMarketTicks() {
    realtimeBus.subscribe<NormalizedTick>("MARKET_TICK", (event) => {
      const tick = event.payload;
      if (!tick || !this.positions.has(tick.symbol)) return;

      const pos = this.positions.get(tick.symbol)!;
      pos.currentPrice = tick.price;
      const diff = pos.side === "LONG" ? tick.price - pos.avgPrice : pos.avgPrice - tick.price;
      pos.pnl = Number((pos.qty * diff).toFixed(2));
      pos.pnlPct = Number(((diff / pos.avgPrice) * 100).toFixed(2));
      pos.updatedAt = new Date().toISOString();

      realtimeBus.emit("POSITION_UPDATED", this.getPositions());
      realtimeBus.emit("PORTFOLIO_UPDATED", this.getPortfolio());
    });
  }

  public getPositions(): PaperPosition[] {
    return Array.from(this.positions.values()).map((pos) => {
      const latestTick = marketDataEngine.getLatestTick(pos.symbol);
      const ltp = latestTick ? latestTick.price : pos.currentPrice;
      const diff = pos.side === "LONG" ? ltp - pos.avgPrice : pos.avgPrice - ltp;
      const pnl = Number((pos.qty * diff).toFixed(2));
      const pnlPct = Number(((diff / pos.avgPrice) * 100).toFixed(2));

      return {
        ...pos,
        quantity: pos.qty,
        currentPrice: ltp,
        pnl,
        pnlPct,
      };
    });
  }

  public getPosition(symbol: string): PaperPosition | undefined {
    return this.getPositions().find((p) => p.symbol === symbol);
  }

  public getTrades(): PaperTrade[] {
    return [...this.trades];
  }

  public getPortfolio(): PaperPortfolio {
    const currentPositions = this.getPositions();
    const unrealisedPnl = currentPositions.reduce((acc, p) => acc + p.pnl, 0);
    const investedCapital = currentPositions.reduce((acc, p) => acc + p.qty * p.avgPrice, 0);
    const totalPortfolioValue = this.cashBalance + investedCapital + unrealisedPnl;

    return {
      cashBalance: this.cashBalance,
      investedCapital,
      totalPortfolioValue,
      unrealisedPnl,
      realisedPnl: this.realisedPnl,
      todayPnl: this.realisedPnl + unrealisedPnl,
    };
  }

  /**
   * Idempotent Simulated Paper Order Execution
   */
  public simulateOrder(input: {
    idempotencyKey: string;
    symbol: string;
    side: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "SL-M";
    qty: number;
    price: number;
  }): PaperOrder {
    // 1. Idempotency Check (Duplicate Request ID Protection)
    if (this.processedKeys.has(input.idempotencyKey)) {
      auditLogService.record({
        user: "Idempotency Guard",
        device: "Paper Broker",
        category: "ORDER",
        action: "Duplicate Order Blocked",
        result: "BLOCKED",
        details: `Blocked duplicate order request key: ${input.idempotencyKey}`,
      });

      throw new Error(
        `Duplicate order request: Idempotency key '${input.idempotencyKey}' already processed.`,
      );
    }

    this.processedKeys.add(input.idempotencyKey);

    // 2. Fetch Latest Real-Time Tick Price (no synthetic slippage)
    const latestTick = marketDataEngine.getLatestTick(input.symbol);
    const fillPrice = latestTick ? latestTick.price : input.price;

    const orderId = `P-ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const tradeId = `TRD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const order: PaperOrder = {
      id: orderId,
      idempotencyKey: input.idempotencyKey,
      symbol: input.symbol,
      side: input.side,
      orderType: input.orderType,
      qty: input.qty,
      requestedPrice: input.price,
      fillPrice,
      status: "FILLED",
      executionType: "SIMULATED_PAPER_FILL",
      timestamp: now,
    };

    // 3. Record Trade
    const trade: PaperTrade = {
      id: tradeId,
      orderId,
      symbol: input.symbol,
      side: input.side,
      qty: input.qty,
      price: fillPrice,
      tradeValue: Number((input.qty * fillPrice).toFixed(2)),
      executionNote: "Simulated Paper Execution matched against real Dhan LTP",
      timestamp: now,
    };
    this.trades.unshift(trade);

    // 4. Update Position Ledger & Realized P&L
    this.updatePosition(input.symbol, input.side, input.qty, fillPrice);
    this.saveState();

    auditLogService.record({
      user: "Paper Broker",
      device: "Simulated Execution Engine",
      category: "ORDER",
      action: "Paper Order Executed",
      result: "SUCCESS",
      details: `SIMULATED PAPER FILL: ${input.side} ${input.qty} ${input.symbol} @ ₹${fillPrice} (Key: ${input.idempotencyKey})`,
      entityId: orderId,
    });

    realtimeBus.emit("ORDER_EXECUTED", order);
    realtimeBus.emit("POSITION_UPDATED", this.getPositions());
    realtimeBus.emit("PORTFOLIO_UPDATED", this.getPortfolio());

    return order;
  }

  private updatePosition(symbol: string, side: "BUY" | "SELL", qty: number, fillPrice: number) {
    const existing = this.positions.get(symbol);

    if (!existing) {
      if (side === "BUY") {
        this.positions.set(symbol, {
          symbol,
          side: "LONG",
          qty,
          avgPrice: fillPrice,
          currentPrice: fillPrice,
          pnl: 0,
          pnlPct: 0,
          updatedAt: new Date().toISOString(),
        });
        this.cashBalance -= qty * fillPrice;
      } else {
        this.positions.set(symbol, {
          symbol,
          side: "SHORT",
          qty,
          avgPrice: fillPrice,
          currentPrice: fillPrice,
          pnl: 0,
          pnlPct: 0,
          updatedAt: new Date().toISOString(),
        });
        this.cashBalance += qty * fillPrice;
      }
      return;
    }

    if (existing.side === "LONG") {
      if (side === "BUY") {
        const totalQty = existing.qty + qty;
        const totalCost = existing.qty * existing.avgPrice + qty * fillPrice;
        existing.qty = totalQty;
        existing.avgPrice = Number((totalCost / totalQty).toFixed(2));
        existing.updatedAt = new Date().toISOString();
        this.cashBalance -= qty * fillPrice;
      } else {
        // SELL closes/reduces LONG
        const closeQty = Math.min(qty, existing.qty);
        const pnlGain = closeQty * (fillPrice - existing.avgPrice);
        this.realisedPnl += Number(pnlGain.toFixed(2));
        this.cashBalance += closeQty * fillPrice;

        if (qty >= existing.qty) {
          this.positions.delete(symbol);
        } else {
          existing.qty -= qty;
          existing.updatedAt = new Date().toISOString();
        }
      }
    } else {
      // Existing SHORT
      if (side === "SELL") {
        const totalQty = existing.qty + qty;
        const totalCost = existing.qty * existing.avgPrice + qty * fillPrice;
        existing.qty = totalQty;
        existing.avgPrice = Number((totalCost / totalQty).toFixed(2));
        existing.updatedAt = new Date().toISOString();
        this.cashBalance += qty * fillPrice;
      } else {
        // BUY closes/reduces SHORT
        const closeQty = Math.min(qty, existing.qty);
        const pnlGain = closeQty * (existing.avgPrice - fillPrice);
        this.realisedPnl += Number(pnlGain.toFixed(2));
        this.cashBalance -= closeQty * fillPrice;

        if (qty >= existing.qty) {
          this.positions.delete(symbol);
        } else {
          existing.qty -= qty;
          existing.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  /** Closes all open paper positions (Used by Kill Switch) */
  public closeAllPositions(reason: string = "Kill Switch Exit All"): number {
    const count = this.positions.size;
    const now = new Date().toISOString();

    this.positions.forEach((pos, sym) => {
      const trade: PaperTrade = {
        id: `TRD-EXIT-${Date.now()}`,
        orderId: `ORD-KILL-${Date.now()}`,
        symbol: sym,
        side: pos.side === "LONG" ? "SELL" : "BUY",
        qty: pos.qty,
        price: pos.currentPrice,
        tradeValue: pos.qty * pos.currentPrice,
        executionNote: `Position Liquidated: ${reason}`,
        timestamp: now,
      };
      this.trades.unshift(trade);
    });

    this.positions.clear();
    this.saveState();

    realtimeBus.emit("POSITION_UPDATED", []);
    realtimeBus.emit("PORTFOLIO_UPDATED", this.getPortfolio());

    return count;
  }

  public exitPosition(symbol: string, reason: string = "Manual Position Exit"): boolean {
    const pos = this.positions.get(symbol);
    if (!pos) return false;
    const latestTick = marketDataEngine.getLatestTick(symbol);
    const fillPrice = latestTick ? latestTick.price : pos.currentPrice;

    this.simulateOrder({
      idempotencyKey: `exit-${symbol}-${Date.now()}`,
      symbol,
      side: pos.side === "LONG" ? "SELL" : "BUY",
      orderType: "MARKET",
      qty: pos.qty,
      price: fillPrice,
    });
    return true;
  }
}

export const paperBroker = new PaperBroker();
