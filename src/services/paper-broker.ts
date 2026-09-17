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
  ltp?: number;
  investedValue?: number;
  currentValue?: number;
  pnl: number;
  pnlPct: number;
  dayPnl?: number;
  dayPnlPct?: number;
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
    this.cashBalance = DatabasePersistence.getItem<number>("paper_cash_balance", 1000000);
    this.realisedPnl = DatabasePersistence.getItem<number>("paper_realised_pnl", 24500);

    const savedPos = DatabasePersistence.getItem<PaperPosition[]>("paper_positions", [
      {
        symbol: "RELIANCE",
        side: "LONG",
        qty: 25,
        avgPrice: 1245.0,
        currentPrice: 1250.7,
        pnl: 142.5,
        pnlPct: 0.46,
        stopLoss: 1210.0,
        target: 1320.0,
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "ICICIBANK",
        side: "LONG",
        qty: 30,
        avgPrice: 1348.0,
        currentPrice: 1351.6,
        pnl: 108.0,
        pnlPct: 0.27,
        stopLoss: 1310.0,
        target: 1420.0,
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "TCS",
        side: "SHORT",
        qty: 15,
        avgPrice: 2220.0,
        currentPrice: 2214.5,
        pnl: 82.5,
        pnlPct: 0.25,
        stopLoss: 2260.0,
        target: 2150.0,
        updatedAt: new Date().toISOString(),
      },
    ]);
    savedPos.forEach((p) => this.positions.set(p.symbol, p));

    this.trades = DatabasePersistence.getItem<PaperTrade[]>("paper_trades", []);
  }

  private saveState() {
    DatabasePersistence.setItem("paper_positions", Array.from(this.positions.values()));
    DatabasePersistence.setItem("paper_trades", this.trades);
    DatabasePersistence.setItem("paper_cash_balance", this.cashBalance);
    DatabasePersistence.setItem("paper_realised_pnl", this.realisedPnl);
  }

  public getCashBalance(): number {
    return this.cashBalance;
  }

  public setCashBalance(val: number): void {
    this.cashBalance = val;
    this.saveState();
    realtimeBus.emit("PORTFOLIO_UPDATED", this.getPortfolio());
  }

  public resetAccount(initialCapital = 1000000): void {
    this.positions.clear();
    this.trades = [];
    this.processedKeys.clear();
    this.cashBalance = initialCapital;
    this.realisedPnl = 0;
    this.saveState();
    realtimeBus.emit("POSITION_UPDATED", []);
    realtimeBus.emit("PORTFOLIO_UPDATED", this.getPortfolio());
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
      const prevClose = tick.previousClose || tick.prevClose || pos.avgPrice;
      const isLong = pos.side === "LONG";
      const diff = isLong ? tick.price - pos.avgPrice : pos.avgPrice - tick.price;
      pos.pnl = Number((pos.qty * diff).toFixed(2));
      pos.pnlPct = Number(((diff / pos.avgPrice) * 100).toFixed(2));
      const dayDiff = isLong ? tick.price - prevClose : prevClose - tick.price;
      pos.dayPnl = Number((pos.qty * dayDiff).toFixed(2));
      pos.dayPnlPct = prevClose > 0 ? Number(((dayDiff / prevClose) * 100).toFixed(2)) : 0;
      pos.updatedAt = new Date().toISOString();

      realtimeBus.emit("POSITION_UPDATED", this.getPositions());
      realtimeBus.emit("PORTFOLIO_UPDATED", this.getPortfolio());
    });
  }

  public getPositions(): PaperPosition[] {
    return Array.from(this.positions.values()).map((pos) => {
      const latestTick = marketDataEngine.getLatestTick(pos.symbol);
      const ltp = latestTick ? latestTick.price : pos.currentPrice;
      const prevClose = latestTick?.previousClose || latestTick?.prevClose || pos.avgPrice;

      // Canonical Long / Short Valuation Formulas
      const isLong = pos.side === "LONG";
      const priceDiff = isLong ? ltp - pos.avgPrice : pos.avgPrice - ltp;
      const unrealizedPnl = Number((pos.qty * priceDiff).toFixed(2));
      const pnlPct = Number(((priceDiff / pos.avgPrice) * 100).toFixed(2));
      const investedValue = Number((pos.qty * pos.avgPrice).toFixed(2));
      const currentValue = Number((pos.qty * ltp).toFixed(2));

      // Day P&L
      const dayDiff = isLong ? ltp - prevClose : prevClose - ltp;
      const dayPnl = Number((pos.qty * dayDiff).toFixed(2));
      const dayPnlPct = Number(((dayDiff / prevClose) * 100).toFixed(2));

      return {
        ...pos,
        quantity: pos.qty,
        currentPrice: ltp,
        ltp,
        investedValue,
        currentValue,
        pnl: unrealizedPnl,
        pnlPct,
        dayPnl,
        dayPnlPct,
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
    const investedCapital = currentPositions.reduce((acc, p) => acc + (p.investedValue ?? p.qty * p.avgPrice), 0);
    const totalDayPnl = currentPositions.reduce((acc, p) => acc + (p.dayPnl ?? 0), 0);
    const totalPortfolioValue = this.cashBalance + investedCapital + unrealisedPnl;

    return {
      cashBalance: this.cashBalance,
      investedCapital,
      totalPortfolioValue,
      unrealisedPnl,
      realisedPnl: this.realisedPnl,
      todayPnl: totalDayPnl,
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
    const fillPrice = latestTick && latestTick.price > 0 ? latestTick.price : input.price;
    const tradeValue = Number((input.qty * fillPrice).toFixed(2));

    // Check available free paper cash for BUY orders
    if (input.side === "BUY") {
      const existingPos = this.positions.get(input.symbol);
      if (!existingPos || existingPos.side === "LONG") {
        if (tradeValue > this.cashBalance) {
          throw new Error(
            `Insufficient paper trading cash balance. Required: ₹${tradeValue.toLocaleString("en-IN")}, Available: ₹${this.cashBalance.toLocaleString("en-IN")}.`,
          );
        }
      }
    }

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
      tradeValue,
      executionNote: "Simulated Paper Execution matched against real market LTP",
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
