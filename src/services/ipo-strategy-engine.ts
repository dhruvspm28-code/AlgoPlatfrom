/**
 * IPO Strategy Engine & Rule Builder for SmartQuant Edge.
 * Evaluates IPO subscription thresholds, financial fundamentals, and valuation metrics
 * to generate IPO WATCH / POSITIVE / HIGH RISK signals and execute Listing-Day Paper Strategies.
 */

import { ipoDataService, type IPODetails } from "./ipo-data-service";
import { paperBroker, type PaperOrder } from "./paper-broker";
import { auditLogService } from "./audit-log-service";
import { realtimeBus } from "./realtime-bus";

export interface IPORule {
  id: string;
  name: string;
  minSubscriptionX: number; // e.g. 5.0x
  minFinancialScore: number; // e.g. 70/100
  maxDebtToEquity: number; // e.g. 1.0
  actionSignal: "WATCH" | "POSITIVE" | "HIGH_RISK" | "BLOCKED";
}

export interface IPOSignalResult {
  ipoId: string;
  symbol: string;
  signal: "WATCH" | "POSITIVE" | "NEUTRAL" | "HIGH RISK" | "AVOID / BLOCKED";
  score: number;
  reason: string;
  timestamp: string;
}

class IPOStrategyEngine {
  private rules: IPORule[] = [
    {
      id: "rule-101",
      name: "High Demand Quality Growth Rule",
      minSubscriptionX: 5.0,
      minFinancialScore: 70,
      maxDebtToEquity: 0.8,
      actionSignal: "POSITIVE",
    },
  ];

  public evaluateIPO(ipo: IPODetails): IPOSignalResult {
    const subX = ipo.subscription?.overallX || 0;
    const finScore = ipo.riskScore.overallScore;
    const debt = ipo.financials?.debtToEquity || 0;

    let signal: IPOSignalResult["signal"] = "NEUTRAL";
    let reason = "Default quantitative evaluation.";

    if (subX >= 5.0 && finScore >= 70 && debt <= 0.8) {
      signal = "POSITIVE";
      reason = `Overall Subscription ${subX}x >= 5x AND Financial Score ${finScore}/100 >= 70 AND D/E ${debt} <= 0.8`;
    } else if (finScore >= 75) {
      signal = "WATCH";
      reason = `Strong fundamentals (${finScore}/100) — Monitor subscription updates.`;
    } else if (debt > 1.2 || finScore < 50) {
      signal = "HIGH RISK";
      reason = `High Debt-to-Equity (${debt}) or Weak Financial Score (${finScore}/100).`;
    }

    return {
      ipoId: ipo.id,
      symbol: ipo.symbol,
      signal,
      score: finScore,
      reason,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute simulated Listing-Day Paper Strategy
   */
  public executeListingDayPaperStrategy(ipoId: string): PaperOrder {
    const ipo = ipoDataService.getIPOById(ipoId);
    if (!ipo) throw new Error("IPO not found");

    const key = `KEY-IPO-${ipo.symbol}-${Date.now()}`;
    const listingPrice = Number((ipo.priceBandMax * 1.25).toFixed(2)); // 25% listing premium simulation

    const paperOrder = paperBroker.simulateOrder({
      idempotencyKey: key,
      symbol: ipo.symbol,
      side: "BUY",
      orderType: "MARKET",
      qty: ipo.lotSize,
      price: listingPrice,
    });

    auditLogService.record({
      user: "IPO Strategy Engine",
      device: "Listing-Day Paper Execution",
      category: "ORDER",
      action: "Listing-Day Paper Strategy Executed",
      result: "SUCCESS",
      details: `PAPER EXECUTION: BUY ${ipo.lotSize} Qty ${ipo.symbol} @ ₹${listingPrice} (Listing Premium Simulation)`,
      entityId: paperOrder.id,
    });

    realtimeBus.emit("NOTIFICATION_ADDED", {
      title: `Listing-Day Strategy Executed: ${ipo.symbol}`,
      body: `Bought ${ipo.lotSize} shares @ ₹${listingPrice} (Listing Gain +25%)`,
      tone: "bull",
    });

    return paperOrder;
  }
}

export const ipoStrategyEngine = new IPOStrategyEngine();
