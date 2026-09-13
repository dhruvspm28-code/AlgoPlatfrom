/**
 * Technical Indicator Engine for SmartQuant Edge.
 * Calculates mathematical indicators on genuine Candle array data:
 * SMA, EMA, RSI, MACD, Bollinger Bands, ATR, VWAP, Supertrend, Stochastic, StdDev.
 * Handles insufficient-data states and recalculates when new candles arrive.
 */

import { type Candle } from "./market-data-types";

export interface IndicatorResult<T> {
  value: T;
  isReady: boolean;
  requiredBars: number;
  availableBars: number;
  note?: string;
}

export interface MACDValue {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerValue {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface SupertrendValue {
  trend: "BULLISH" | "BEARISH";
  supertrend: number;
}

export interface StochasticValue {
  k: number;
  d: number;
}

export interface AllIndicatorsSnapshot {
  sma20: IndicatorResult<number>;
  sma50: IndicatorResult<number>;
  ema9: IndicatorResult<number>;
  ema21: IndicatorResult<number>;
  rsi14: IndicatorResult<number>;
  macd: IndicatorResult<MACDValue>;
  bollinger: IndicatorResult<BollingerValue>;
  atr14: IndicatorResult<number>;
  vwap: IndicatorResult<number>;
  supertrend: IndicatorResult<SupertrendValue>;
  stochastic: IndicatorResult<StochasticValue>;
  stdDev20: IndicatorResult<number>;
}

export class IndicatorEngine {
  /** Simple Moving Average (SMA) */
  public static calculateSMA(candles: Candle[], period: number = 20): IndicatorResult<number> {
    if (candles.length < period) {
      return {
        value: candles[candles.length - 1]?.close || 0,
        isReady: false,
        requiredBars: period,
        availableBars: candles.length,
        note: `Insufficient bars for SMA(${period}). Requires ${period}, has ${candles.length}.`,
      };
    }

    const slice = candles.slice(-period);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    const value = Number((sum / period).toFixed(2));

    return {
      value,
      isReady: true,
      requiredBars: period,
      availableBars: candles.length,
    };
  }

  /** Exponential Moving Average (EMA) */
  public static calculateEMA(candles: Candle[], period: number = 20): IndicatorResult<number> {
    if (candles.length < period) {
      return {
        value: candles[candles.length - 1]?.close || 0,
        isReady: false,
        requiredBars: period,
        availableBars: candles.length,
        note: `Insufficient bars for EMA(${period}).`,
      };
    }

    const multiplier = 2 / (period + 1);
    // Initial EMA is SMA of first 'period' candles
    let ema = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;

    for (let i = period; i < candles.length; i++) {
      ema = (candles[i].close - ema) * multiplier + ema;
    }

    return {
      value: Number(ema.toFixed(2)),
      isReady: true,
      requiredBars: period,
      availableBars: candles.length,
    };
  }

  /** Relative Strength Index (RSI - Wilder's Smoothing) */
  public static calculateRSI(candles: Candle[], period: number = 14): IndicatorResult<number> {
    if (candles.length <= period) {
      return {
        value: 50,
        isReady: false,
        requiredBars: period + 1,
        availableBars: candles.length,
        note: `Insufficient bars for RSI(${period}).`,
      };
    }

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < candles.length; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) {
      return { value: 100, isReady: true, requiredBars: period + 1, availableBars: candles.length };
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return {
      value: Number(rsi.toFixed(2)),
      isReady: true,
      requiredBars: period + 1,
      availableBars: candles.length,
    };
  }

  /** Moving Average Convergence Divergence (MACD) */
  public static calculateMACD(
    candles: Candle[],
    fast: number = 12,
    slow: number = 26,
    signalPeriod: number = 9,
  ): IndicatorResult<MACDValue> {
    const requiredBars = slow + signalPeriod;
    if (candles.length < requiredBars) {
      return {
        value: { macd: 0, signal: 0, histogram: 0 },
        isReady: false,
        requiredBars,
        availableBars: candles.length,
        note: `Insufficient bars for MACD(${fast}, ${slow}, ${signalPeriod}).`,
      };
    }

    const fastMultiplier = 2 / (fast + 1);
    const slowMultiplier = 2 / (slow + 1);
    const signalMultiplier = 2 / (signalPeriod + 1);

    // Compute fast & slow EMAs over the series
    let fastEMA = candles[0].close;
    let slowEMA = candles[0].close;
    const macdSeries: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      const price = candles[i].close;
      fastEMA = i === 0 ? price : (price - fastEMA) * fastMultiplier + fastEMA;
      slowEMA = i === 0 ? price : (price - slowEMA) * slowMultiplier + slowEMA;

      if (i >= slow - 1) {
        macdSeries.push(fastEMA - slowEMA);
      }
    }

    if (macdSeries.length < signalPeriod) {
      return {
        value: { macd: 0, signal: 0, histogram: 0 },
        isReady: false,
        requiredBars,
        availableBars: candles.length,
      };
    }

    // Signal Line is EMA of macdSeries
    let signalEMA = macdSeries.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    for (let i = signalPeriod; i < macdSeries.length; i++) {
      signalEMA = (macdSeries[i] - signalEMA) * signalMultiplier + signalEMA;
    }

    const currentMACD = macdSeries[macdSeries.length - 1];
    const histogram = currentMACD - signalEMA;

    return {
      value: {
        macd: Number(currentMACD.toFixed(2)),
        signal: Number(signalEMA.toFixed(2)),
        histogram: Number(histogram.toFixed(2)),
      },
      isReady: true,
      requiredBars,
      availableBars: candles.length,
    };
  }

  /** Standard Deviation (StdDev) */
  public static calculateStdDev(candles: Candle[], period: number = 20): IndicatorResult<number> {
    if (candles.length < period) {
      return {
        value: 0,
        isReady: false,
        requiredBars: period,
        availableBars: candles.length,
        note: `Insufficient bars for StdDev(${period}).`,
      };
    }

    const slice = candles.slice(-period);
    const mean = slice.reduce((acc, c) => acc + c.close, 0) / period;
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      value: Number(stdDev.toFixed(2)),
      isReady: true,
      requiredBars: period,
      availableBars: candles.length,
    };
  }

  /** Bollinger Bands */
  public static calculateBollingerBands(
    candles: Candle[],
    period: number = 20,
    stdDevMult: number = 2,
  ): IndicatorResult<BollingerValue> {
    const sma = this.calculateSMA(candles, period);
    const stdDev = this.calculateStdDev(candles, period);

    if (!sma.isReady || !stdDev.isReady) {
      return {
        value: { upper: 0, middle: 0, lower: 0, bandwidth: 0 },
        isReady: false,
        requiredBars: period,
        availableBars: candles.length,
        note: `Insufficient bars for Bollinger Bands(${period}).`,
      };
    }

    const middle = sma.value;
    const bandSpan = stdDev.value * stdDevMult;
    const upper = Number((middle + bandSpan).toFixed(2));
    const lower = Number((middle - bandSpan).toFixed(2));
    const bandwidth = Number((((upper - lower) / middle) * 100).toFixed(2));

    return {
      value: { upper, middle, lower, bandwidth },
      isReady: true,
      requiredBars: period,
      availableBars: candles.length,
    };
  }

  /** Average True Range (ATR) */
  public static calculateATR(candles: Candle[], period: number = 14): IndicatorResult<number> {
    if (candles.length <= period) {
      return {
        value: 0,
        isReady: false,
        requiredBars: period + 1,
        availableBars: candles.length,
        note: `Insufficient bars for ATR(${period}).`,
      };
    }

    const trSeries: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trSeries.push(tr);
    }

    let atr = trSeries.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trSeries.length; i++) {
      atr = (atr * (period - 1) + trSeries[i]) / period;
    }

    return {
      value: Number(atr.toFixed(2)),
      isReady: true,
      requiredBars: period + 1,
      availableBars: candles.length,
    };
  }

  /** Volume-Weighted Average Price (VWAP) */
  public static calculateVWAP(candles: Candle[]): IndicatorResult<number> {
    if (candles.length === 0) {
      return {
        value: 0,
        isReady: false,
        requiredBars: 1,
        availableBars: 0,
        note: "No candles available for VWAP.",
      };
    }

    let cumVolume = 0;
    let cumVolPrice = 0;

    for (const c of candles) {
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumVolPrice += typicalPrice * c.volume;
      cumVolume += c.volume;
    }

    const vwap = cumVolume > 0 ? cumVolPrice / cumVolume : candles[candles.length - 1].close;

    return {
      value: Number(vwap.toFixed(2)),
      isReady: true,
      requiredBars: 1,
      availableBars: candles.length,
    };
  }

  /** Supertrend Indicator */
  public static calculateSupertrend(
    candles: Candle[],
    period: number = 10,
    multiplier: number = 3,
  ): IndicatorResult<SupertrendValue> {
    const atrResult = this.calculateATR(candles, period);
    if (!atrResult.isReady || candles.length < period + 1) {
      return {
        value: { trend: "BULLISH", supertrend: candles[candles.length - 1]?.close || 0 },
        isReady: false,
        requiredBars: period + 1,
        availableBars: candles.length,
        note: `Insufficient bars for Supertrend(${period}, ${multiplier}).`,
      };
    }

    const atr = atrResult.value;
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2] || last;
    const basicUpper = (last.high + last.low) / 2 + multiplier * atr;
    const basicLower = (last.high + last.low) / 2 - multiplier * atr;

    const trend: "BULLISH" | "BEARISH" = last.close > prev.close ? "BULLISH" : "BEARISH";
    const supertrend = trend === "BULLISH" ? basicLower : basicUpper;

    return {
      value: {
        trend,
        supertrend: Number(supertrend.toFixed(2)),
      },
      isReady: true,
      requiredBars: period + 1,
      availableBars: candles.length,
    };
  }

  /** Stochastic Oscillator (%K, %D) */
  public static calculateStochastic(
    candles: Candle[],
    kPeriod: number = 14,
    dPeriod: number = 3,
  ): IndicatorResult<StochasticValue> {
    if (candles.length < kPeriod + dPeriod) {
      return {
        value: { k: 50, d: 50 },
        isReady: false,
        requiredBars: kPeriod + dPeriod,
        availableBars: candles.length,
        note: `Insufficient bars for Stochastic(${kPeriod}, ${dPeriod}).`,
      };
    }

    const kValues: number[] = [];
    for (let i = kPeriod - 1; i < candles.length; i++) {
      const window = candles.slice(i - kPeriod + 1, i + 1);
      const highMax = Math.max(...window.map((c) => c.high));
      const lowMin = Math.min(...window.map((c) => c.low));
      const currentClose = candles[i].close;

      const k = highMax === lowMin ? 50 : ((currentClose - lowMin) / (highMax - lowMin)) * 100;
      kValues.push(k);
    }

    const lastK = kValues[kValues.length - 1];
    const dSlice = kValues.slice(-dPeriod);
    const lastD = dSlice.reduce((a, b) => a + b, 0) / dSlice.length;

    return {
      value: {
        k: Number(lastK.toFixed(2)),
        d: Number(lastD.toFixed(2)),
      },
      isReady: true,
      requiredBars: kPeriod + dPeriod,
      availableBars: candles.length,
    };
  }

  /** Computes all 10 indicators in a single call for a candle set */
  public static calculateAll(candles: Candle[]): AllIndicatorsSnapshot {
    return {
      sma20: this.calculateSMA(candles, 20),
      sma50: this.calculateSMA(candles, 50),
      ema9: this.calculateEMA(candles, 9),
      ema21: this.calculateEMA(candles, 21),
      rsi14: this.calculateRSI(candles, 14),
      macd: this.calculateMACD(candles, 12, 26, 9),
      bollinger: this.calculateBollingerBands(candles, 20, 2),
      atr14: this.calculateATR(candles, 14),
      vwap: this.calculateVWAP(candles),
      supertrend: this.calculateSupertrend(candles, 10, 3),
      stochastic: this.calculateStochastic(candles, 14, 3),
      stdDev20: this.calculateStdDev(candles, 20),
    };
  }
}
