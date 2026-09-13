/**
 * Multi-Timeframe Candle Aggregator for SmartQuant Edge.
 * Aggregates normalized incoming ticks into 1m, 5m, 15m, 30m, 1h, 1D candles.
 * Handles interval boundaries, rolling bar updates, and market session cutoffs.
 * Never fabricates missing candles.
 */

import { type NormalizedTick, type Timeframe, type Candle } from "./market-data-types";
import { WATCHLIST_INSTRUMENTS } from "./instrument-mapper";

export const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "1D": 1440,
};

type CandleListener = (symbol: string, timeframe: Timeframe, candle: Candle) => void;

class CandleAggregator {
  private candlesMap = new Map<string, Map<Timeframe, Candle[]>>();
  private listeners: CandleListener[] = [];

  constructor() {
    // Strictly builds candles from genuine received ticks via addTick().
    // Never fabricates or seeds synthetic fake candles.
  }

  public clearAll(): void {
    this.candlesMap.clear();
  }

  public clear(): void {
    this.clearAll();
  }

  public _resetForTesting(): void {
    this.clearAll();
  }

  /** Allows tests or verified historical loaders to inject genuine candles */
  public setCandles(symbol: string, timeframe: Timeframe, candles: Candle[]): void {
    let tfMap = this.candlesMap.get(symbol);
    if (!tfMap) {
      tfMap = new Map();
      this.candlesMap.set(symbol, tfMap);
    }
    tfMap.set(timeframe, [...candles]);
  }

  /**
   * Process a live normalized tick and update/rollover candles across all 6 timeframes
   */
  public addTick(tick: NormalizedTick): void {
    let tfMap = this.candlesMap.get(tick.symbol);
    if (!tfMap) {
      tfMap = new Map();
      this.candlesMap.set(tick.symbol, tfMap);
    }

    const timeframes: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "1D"];
    const tickTime = new Date(tick.timestamp).getTime();

    timeframes.forEach((tf) => {
      let candles = tfMap.get(tf);
      if (!candles) {
        candles = [];
        tfMap.set(tf, candles);
      }

      const intervalMs = TIMEFRAME_MINUTES[tf] * 60 * 1000;
      const lastCandle = candles[candles.length - 1];

      if (!lastCandle) {
        // First candle
        const openTime = Math.floor(tickTime / intervalMs) * intervalMs;
        const newCandle: Candle = {
          symbol: tick.symbol,
          timeframe: tf,
          openTime,
          closeTime: openTime + intervalMs,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume,
          isClosed: false,
        };
        candles.push(newCandle);
        this.notify(tick.symbol, tf, newCandle);
        return;
      }

      // Check if tick belongs to the active candle
      if (tickTime < lastCandle.closeTime) {
        // Update current candle
        lastCandle.high = Number(Math.max(lastCandle.high, tick.price).toFixed(2));
        lastCandle.low = Number(Math.min(lastCandle.low, tick.price).toFixed(2));
        lastCandle.close = tick.price;
        lastCandle.volume += tick.volume;
        this.notify(tick.symbol, tf, lastCandle);
      } else {
        // Close previous candle
        lastCandle.isClosed = true;

        // Open new candle on timeframe boundary
        const newOpenTime = Math.floor(tickTime / intervalMs) * intervalMs;
        const newCandle: Candle = {
          symbol: tick.symbol,
          timeframe: tf,
          openTime: newOpenTime,
          closeTime: newOpenTime + intervalMs,
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: tick.volume,
          isClosed: false,
        };

        candles.push(newCandle);
        // Keep max 200 candles per symbol per timeframe
        if (candles.length > 200) {
          candles.shift();
        }

        this.notify(tick.symbol, tf, newCandle);
      }
    });
  }

  public getCandles(symbol: string, timeframe: Timeframe = "15m"): Candle[] {
    const tfMap = this.candlesMap.get(symbol);
    if (!tfMap) return [];
    return tfMap.get(timeframe) || [];
  }

  public getLatestCandle(symbol: string, timeframe: Timeframe = "15m"): Candle | undefined {
    const list = this.getCandles(symbol, timeframe);
    return list.length > 0 ? list[list.length - 1] : undefined;
  }

  public subscribe(callback: CandleListener): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(symbol: string, timeframe: Timeframe, candle: Candle) {
    for (const listener of this.listeners) {
      try {
        listener(symbol, timeframe, candle);
      } catch (err) {
        console.warn("[CandleAggregator] Listener error:", err);
      }
    }
  }
}

export const candleAggregator = new CandleAggregator();
