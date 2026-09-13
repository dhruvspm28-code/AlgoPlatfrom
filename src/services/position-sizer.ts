/**
 * Dynamic Position Sizing Engine for SmartQuant Edge.
 * Calculates optimal position size based on account capital, risk-per-trade percentage,
 * entry price, stop-loss distance, and capital cap guardrails.
 *
 * Formula:
 * 1. Risk Budget = Capital × Risk %
 * 2. Risk Per Share = |Entry − Stop Loss|
 * 3. Quantity = floor(Risk Budget / Risk Per Share)
 * 4. Apply Max Position Cap (% of Capital) and Max Trade Value Cap.
 */

export interface PositionSizingInput {
  accountCapital: number; // e.g. ₹5,00,000
  riskPctPerTrade: number; // e.g. 1.0%
  entryPrice: number; // e.g. ₹1,500
  stopLossPrice: number; // e.g. ₹1,450
  maxPositionSizePct?: number; // e.g. 25% of capital cap
  maxTradeValueCap?: number; // e.g. ₹5,00,000
}

export interface CalculationStep {
  label: string;
  formula: string;
  value: string;
}

export interface PositionSizingResult {
  recommendedQty: number;
  rawQty: number;
  maxRiskAmount: number; // Capital * (riskPct / 100)
  riskPerShare: number; // Entry - StopLoss
  totalPositionValue: number; // Qty * Entry
  capitalUtilizationPct: number;
  isCappedByMaxTradeValue: boolean;
  isCappedByPositionCap: boolean;
  steps: CalculationStep[];
}

export class PositionSizer {
  public static calculate(input: PositionSizingInput): PositionSizingResult {
    const capital = Math.max(1000, input.accountCapital);
    const riskPct = Math.min(10, Math.max(0.1, input.riskPctPerTrade));
    const entry = Math.max(0.1, input.entryPrice);
    const stopLoss = Math.max(0.05, input.stopLossPrice);

    const maxRiskAmount = Number(((capital * riskPct) / 100).toFixed(2));
    const riskPerShare = Math.max(0.05, Math.abs(entry - stopLoss));

    // Raw Qty = Max Risk / Risk per share
    const rawQty = Math.floor(maxRiskAmount / riskPerShare);
    let finalQty = Math.max(1, rawQty);

    // Guardrail 1: Max Position Size Cap (% of capital)
    const posCapPct = input.maxPositionSizePct || 25;
    const maxAllowedPosValue = (capital * posCapPct) / 100;
    const maxQtyByPosCap = Math.max(1, Math.floor(maxAllowedPosValue / entry));

    let isCappedByPositionCap = false;
    if (finalQty > maxQtyByPosCap) {
      finalQty = maxQtyByPosCap;
      isCappedByPositionCap = true;
    }

    // Guardrail 2: Max Trade Value Cap
    const maxTradeValueCap = input.maxTradeValueCap || 500000;
    const maxQtyByTradeValue = Math.max(1, Math.floor(maxTradeValueCap / entry));

    let isCappedByMaxTradeValue = false;
    if (finalQty > maxQtyByTradeValue) {
      finalQty = maxQtyByTradeValue;
      isCappedByMaxTradeValue = true;
    }

    const recommendedQty = Math.max(1, finalQty);
    const totalPositionValue = Number((recommendedQty * entry).toFixed(2));
    const capitalUtilizationPct = Number(((totalPositionValue / capital) * 100).toFixed(2));

    const steps: CalculationStep[] = [
      {
        label: "Risk Budget",
        formula: `Capital (₹${capital.toLocaleString("en-IN")}) × Risk (${riskPct}%)`,
        value: `₹${maxRiskAmount.toLocaleString("en-IN")}`,
      },
      {
        label: "Risk Per Share",
        formula: `|Entry (₹${entry}) − Stop Loss (₹${stopLoss})|`,
        value: `₹${riskPerShare.toFixed(2)}`,
      },
      {
        label: "Raw Quantity",
        formula: `Risk Budget / Risk Per Share`,
        value: `${rawQty} Qty`,
      },
      {
        label: "Position Cap (25%)",
        formula: `Max Value ₹${maxAllowedPosValue.toLocaleString("en-IN")} / Entry`,
        value: `${maxQtyByPosCap} Qty (${isCappedByPositionCap ? "CAPPED" : "OK"})`,
      },
      {
        label: "Max Trade Cap",
        formula: `Max ₹${maxTradeValueCap.toLocaleString("en-IN")} / Entry`,
        value: `${maxQtyByTradeValue} Qty (${isCappedByMaxTradeValue ? "CAPPED" : "OK"})`,
      },
      {
        label: "Final Approved Quantity",
        formula: `min(Raw, PosCap, TradeCap)`,
        value: `${recommendedQty} Qty (Value: ₹${totalPositionValue.toLocaleString("en-IN")})`,
      },
    ];

    return {
      recommendedQty,
      rawQty,
      maxRiskAmount,
      riskPerShare: Number(riskPerShare.toFixed(2)),
      totalPositionValue,
      capitalUtilizationPct,
      isCappedByMaxTradeValue,
      isCappedByPositionCap,
      steps,
    };
  }
}
