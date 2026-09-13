/**
 * Signal Engine & Quantitative Strategy Evaluation Service for SmartQuant Edge.
 * Evaluates technical indicators against real market candle data to generate
 * BUY, SELL, HOLD, EXIT signals with indicator evidence and confluence scoring.
 * Strictly blocks signal generation when market data is unavailable or stale.
 */

import { realtimeBus } from "./realtime-bus";
import { auditLogService } from "./audit-log-service";
import { DatabasePersistence } from "./db-persistence";
import { marketDataEngine } from "./market-data-engine";
import { candleAggregator } from "./candle-aggregator";
import { IndicatorEngine, type AllIndicatorsSnapshot } from "./indicator-engine";
import { riskEngine } from "./risk-engine";

export type SignalType = "BUY" | "SELL" | "HOLD" | "EXIT";

export interface IndicatorEvidence {
  indicator: string;
  status: "BULLISH" | "BEARISH" | "NEUTRAL";
  value: string;
  passed: boolean;
  weight: number;
}

export interface StrategySignal {
  id: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  signalType: SignalType;
  price: number;
  confluenceScore: number; // 0 to 100 (Degree of multi-indicator alignment)
  confluenceDisclaimer: string;
  conditions: string[];
  indicatorEvidence: IndicatorEvidence[];
  riskStatus: "APPROVED" | "BLOCKED_BY_RISK" | "CONFLICTED" | "CIRCUIT_HALTED";
  timestamp: string;
}

const DEFAULT_SIGNALS: StrategySignal[] = [
  {
    id: "SIG-8810",
    strategyId: "STR-001",
    strategyName: "EMA Crossover Pro",
    symbol: "RELIANCE",
    signalType: "BUY",
    price: 2984.4,
    confluenceScore: 85,
    confluenceDisclaimer: "Degree of multi-indicator alignment — NOT probability of profit.",
    conditions: [
      "EMA(9) > EMA(21)",
      "RSI(14) between 45 and 68",
      "MACD histogram > 0",
      "Supertrend Bullish",
    ],
    indicatorEvidence: [
      {
        indicator: "EMA 9/21 Trend",
        status: "BULLISH",
        value: "EMA 9 (2988.20) > EMA 21 (2972.10)",
        passed: true,
        weight: 30,
      },
      {
        indicator: "RSI Momentum",
        status: "BULLISH",
        value: "RSI(14) = 62.4 (Optimal Bullish Range)",
        passed: true,
        weight: 25,
      },
      {
        indicator: "MACD Histogram",
        status: "BULLISH",
        value: "MACD (14.2) > Signal (8.5)",
        passed: true,
        weight: 25,
      },
      {
        indicator: "Supertrend",
        status: "BULLISH",
        value: "Supertrend flipped Bullish @ 2950.00",
        passed: true,
        weight: 20,
      },
    ],
    riskStatus: "APPROVED",
    timestamp: new Date(Date.now() - 120 * 1000).toISOString(),
  },
  {
    id: "SIG-8811",
    strategyId: "STR-002",
    strategyName: "RSI Mean Reversion",
    symbol: "ICICIBANK",
    signalType: "SELL",
    price: 1284.05,
    confluenceScore: 78,
    confluenceDisclaimer: "Degree of multi-indicator alignment — NOT probability of profit.",
    conditions: ["RSI(14) > 70", "Price touched upper Bollinger Band", "Stochastic Overbought"],
    indicatorEvidence: [
      {
        indicator: "RSI Reversal",
        status: "BEARISH",
        value: "RSI(14) = 74.8 (Overbought)",
        passed: true,
        weight: 35,
      },
      {
        indicator: "Bollinger Bands",
        status: "BEARISH",
        value: "Price touched Upper Band (1286.50)",
        passed: true,
        weight: 35,
      },
      {
        indicator: "Stochastic",
        status: "BEARISH",
        value: "%K = 86.4, %D = 82.1",
        passed: true,
        weight: 30,
      },
    ],
    riskStatus: "APPROVED",
    timestamp: new Date(Date.now() - 300 * 1000).toISOString(),
  },
];

class SignalEngine {
  private signals: StrategySignal[] = [];

  constructor() {
    this.signals = DatabasePersistence.getItem<StrategySignal[]>(
      "strategy_signals",
      DEFAULT_SIGNALS,
    );
  }

  private save() {
    DatabasePersistence.setItem("strategy_signals", this.signals);
  }

  public getSignals(symbol?: string): StrategySignal[] {
    if (symbol) return this.signals.filter((s) => s.symbol === symbol);
    return [...this.signals];
  }

  public getLatestSignal(symbol: string): StrategySignal | undefined {
    return this.signals.find((s) => s.symbol === symbol);
  }

  /**
   * Evaluates technical indicators against real market data for a given symbol and strategy.
   * Strictly blocks signal generation if market data is unavailable or stale.
   */
  public evaluateStrategy(input: {
    strategyId: string;
    strategyName: string;
    symbol: string;
  }): StrategySignal {
    // 1. Data Freshness and Availability Check
    const feedStatus = marketDataEngine.getFeedStatus();
    if (feedStatus.connectionState !== "LIVE" || feedStatus.isStale) {
      const reason = `Market data is ${feedStatus.connectionState} (stale=${feedStatus.isStale}). Signal generation halted.`;
      auditLogService.record({
        user: `Strategy: ${input.strategyName}`,
        device: "Signal Engine",
        category: "STRATEGY",
        action: "Signal Generation Blocked",
        result: "BLOCKED",
        details: reason,
        entityId: input.strategyId,
      });

      throw new Error(`Cannot generate signals: ${reason}`);
    }

    // 2. Retrieve genuine candles from aggregator
    const candles = candleAggregator.getCandles(input.symbol, "15m");
    if (candles.length < 21) {
      const reason = `Insufficient genuine candles for indicator warm-up (found ${candles.length}, required >= 21). Signal generation halted.`;
      auditLogService.record({
        user: `Strategy: ${input.strategyName}`,
        device: "Signal Engine",
        category: "STRATEGY",
        action: "Signal Generation Blocked",
        result: "BLOCKED",
        details: reason,
        entityId: input.strategyId,
      });

      throw new Error(`Cannot generate signals: ${reason}`);
    }

    const latestTick = marketDataEngine.getLatestTick(input.symbol);
    const currentPrice = latestTick ? latestTick.price : candles[candles.length - 1]?.close || 1000;

    // 3. Compute indicators
    const indicators = IndicatorEngine.calculateAll(candles);
    if (!indicators.ema21.isReady || !indicators.rsi14.isReady) {
      throw new Error(`Cannot generate signals: Indicator warm-up incomplete for ${input.symbol}.`);
    }

    // 4. Construct conditions & indicator evidence
    const evidence: IndicatorEvidence[] = [];

    // Rule 1: EMA 9 vs EMA 21
    const ema9 = indicators.ema9.value;
    const ema21 = indicators.ema21.value;
    const emaBullish = ema9 > ema21;
    evidence.push({
      indicator: "EMA 9/21 Trend",
      status: emaBullish ? "BULLISH" : "BEARISH",
      value: `EMA(9)=${ema9} ${emaBullish ? ">" : "<"} EMA(21)=${ema21}`,
      passed: emaBullish,
      weight: 30,
    });

    // Rule 2: RSI 14 Momentum
    const rsi = indicators.rsi14.value;
    const rsiPassed = rsi >= 45 && rsi <= 72;
    evidence.push({
      indicator: "RSI(14) Momentum",
      status: rsi > 70 ? "BEARISH" : rsi < 30 ? "BULLISH" : rsi >= 50 ? "BULLISH" : "NEUTRAL",
      value: `RSI(14)=${rsi} ${rsiPassed ? "(Optimal Range)" : "(Extreme Level)"}`,
      passed: rsiPassed,
      weight: 25,
    });

    // Rule 3: MACD Histogram
    const macdHist = indicators.macd.value.histogram;
    const macdPassed = macdHist > 0;
    evidence.push({
      indicator: "MACD Momentum",
      status: macdPassed ? "BULLISH" : "BEARISH",
      value: `MACD Histogram = ${macdHist} (${macdPassed ? "Positive" : "Negative"})`,
      passed: macdPassed,
      weight: 25,
    });

    // Rule 4: Supertrend Trend
    const stTrend = indicators.supertrend.value.trend;
    const stPassed = stTrend === "BULLISH";
    evidence.push({
      indicator: "Supertrend(10,3)",
      status: stTrend,
      value: `Supertrend: ${stTrend} @ ₹${indicators.supertrend.value.supertrend}`,
      passed: stPassed,
      weight: 20,
    });

    // 5. Calculate Confluence Score (0 to 100)
    let totalWeight = 0;
    let earnedWeight = 0;
    evidence.forEach((e) => {
      totalWeight += e.weight;
      if (e.passed) earnedWeight += e.weight;
    });

    const confluenceScore = Math.min(
      100,
      Math.max(10, Math.round((earnedWeight / totalWeight) * 100)),
    );

    let signalType: SignalType = "HOLD";
    if (confluenceScore >= 75) {
      signalType = "BUY";
    } else if (confluenceScore <= 35) {
      signalType = "SELL";
    }

    // 6. Check Risk Limits
    const riskCheck = riskEngine.evaluateOrder({
      symbol: input.symbol,
      side: signalType === "SELL" ? "SELL" : "BUY",
      qty: 10,
      price: currentPrice,
    });

    const riskStatus = riskCheck.passed ? "APPROVED" : "BLOCKED_BY_RISK";

    const signalId = `SIG-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSignal: StrategySignal = {
      id: signalId,
      strategyId: input.strategyId,
      strategyName: input.strategyName,
      symbol: input.symbol,
      signalType,
      price: currentPrice,
      confluenceScore,
      confluenceDisclaimer: "Degree of multi-indicator alignment — NOT probability of profit.",
      conditions: evidence.map((e) => `${e.indicator}: ${e.value}`),
      indicatorEvidence: evidence,
      riskStatus,
      timestamp: new Date().toISOString(),
    };

    this.signals.unshift(newSignal);
    if (this.signals.length > 50) this.signals.pop();
    this.save();

    realtimeBus.emit("STRATEGY_SIGNAL", newSignal);

    auditLogService.record({
      user: `Strategy: ${input.strategyName}`,
      device: "Signal Engine",
      category: "STRATEGY",
      action: `Signal ${signalType} Generated`,
      result: "SUCCESS",
      details: `${signalType} ${input.symbol} @ ₹${currentPrice} (Confluence: ${confluenceScore}/100, Risk: ${riskStatus})`,
      entityId: signalId,
    });

    return newSignal;
  }
}

export const signalEngine = new SignalEngine();
