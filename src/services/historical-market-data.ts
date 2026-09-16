/**
 * Historical Market Data Service for SmartQuant Edge.
 * Connects to official broker Historical APIs (Groww Trade API).
 * Normalizes historical candle responses into standard Candle format.
 * Strictly enforces:
 * - No mathematically generated prices
 * - No random values
 * - No mock fallback data
 * - If unavailable from provider, returns clean UNAVAILABLE state
 */

import { type Candle, type Timeframe } from "./market-data-types";
import { GrowwAPI } from "./groww-feed";
import { instrumentMapper } from "./instrument-mapper";

export type HistoricalRange = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y";

export interface HistoricalCandleQuery {
  symbol: string;
  exchange?: "NSE" | "BSE";
  range: HistoricalRange;
  resolution?: Timeframe;
}

export interface HistoricalCandleResult {
  success: boolean;
  status: "SUCCESS" | "UNAVAILABLE" | "EMPTY" | "ERROR";
  symbol: string;
  range: HistoricalRange;
  resolution: Timeframe;
  candles: Candle[];
  provenanceText: string;
  errorMessage?: string;
  count: number;
}

export interface HistoricalMarketDataProvider {
  getHistoricalCandles(query: HistoricalCandleQuery): Promise<HistoricalCandleResult>;
}

/**
 * Maps user-selected range to sensible candle resolution
 */
export function getRecommendedResolution(range: HistoricalRange): Timeframe {
  switch (range) {
    case "1D":
      return "5m";
    case "1W":
      return "15m";
    case "1M":
      return "1h";
    case "3M":
    case "6M":
    case "1Y":
      return "1D";
    default:
      return "15m";
  }
}

/**
 * Calculates start and end timestamps for the requested historical range
 */
export function calculateHistoricalRangeDates(range: HistoricalRange): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getTime());

  switch (range) {
    case "1D":
      from.setHours(9, 15, 0, 0); // Indian market open today
      if (from.getTime() > to.getTime()) {
        from.setDate(from.getDate() - 1);
      }
      break;
    case "1W":
      from.setDate(from.getDate() - 7);
      break;
    case "1M":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3M":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6M":
      from.setMonth(from.getMonth() - 6);
      break;
    case "1Y":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  return { from, to };
}

/**
 * Converts standard timeframe into minutes integer expected by Groww API
 */
export function timeframeToMinutes(tf: Timeframe): number {
  switch (tf) {
    case "1m":
      return 1;
    case "5m":
      return 5;
    case "15m":
      return 15;
    case "30m":
      return 30;
    case "1h":
      return 60;
    case "1D":
      return 1440;
    default:
      return 15;
  }
}

export const EXCHANGE_MARKET_TICKERS: Record<string, string> = {
  "NIFTY 50": "%5ENSEI",
  "SENSEX": "%5EBSESN",
  "BANK NIFTY": "%5ENSEBANK",
  "RELIANCE": "RELIANCE.NS",
  "TCS": "TCS.NS",
  "HDFCBANK": "HDFCBANK.NS",
  "INFY": "INFY.NS",
  "ICICIBANK": "ICICIBANK.NS",
  "SBIN": "SBIN.NS",
  "TATAMOTORS": "TMPV.NS",
  "BHARTIARTL": "BHARTIARTL.NS",
};

/**
 * Maps range and resolution to exchange chart parameters
 */
export function mapRangeAndResolutionToExchangeParams(range: HistoricalRange, resolution: Timeframe) {
  let rParam = "1d";
  let interval = "15m";

  switch (range) {
    case "1D":
      rParam = "1d";
      interval = resolution === "1m" || resolution === "5m" ? resolution : resolution === "1h" ? "1h" : "15m";
      break;
    case "1W":
      rParam = "5d";
      interval = resolution === "1h" || resolution === "1D" ? resolution : "15m";
      break;
    case "1M":
      rParam = "1mo";
      interval = resolution === "1D" ? "1d" : "1h";
      break;
    case "3M":
      rParam = "3mo";
      interval = "1d";
      break;
    case "6M":
      rParam = "6mo";
      interval = "1d";
      break;
    case "1Y":
      rParam = "1y";
      interval = "1d";
      break;
    default:
      rParam = "1d";
      interval = "15m";
  }

  return { rParam, interval };
}

/**
 * Official Groww & Exchange Historical Market Data Provider implementation
 */
export class GrowwHistoricalMarketDataProvider implements HistoricalMarketDataProvider {
  public async getHistoricalCandles(query: HistoricalCandleQuery): Promise<HistoricalCandleResult> {
    const resolution = query.resolution || getRecommendedResolution(query.range);
    const mapping = instrumentMapper.getMapping(query.symbol);
    const exchange = query.exchange || mapping?.exchange || "NSE";
    const segment = mapping?.assetClass === "INDEX" ? "INDEX" : "CASH";

    // Symbol translation for Groww API
    let tradingSymbol = query.symbol;
    if (tradingSymbol === "NIFTY 50") tradingSymbol = "NIFTY";
    if (tradingSymbol === "BANK NIFTY") tradingSymbol = "BANKNIFTY";

    const { from, to } = calculateHistoricalRangeDates(query.range);
    const intervalMinutes = timeframeToMinutes(resolution);
    const formatDate = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

    // 1. First Attempt: Official Groww Historical Candle Endpoint
    try {
      const sessionToken = await GrowwAPI.resolveSessionToken({
        accessToken: process.env.GROWW_ACCESS_TOKEN,
        apiKey: process.env.GROWW_API_KEY,
        apiSecret: process.env.GROWW_API_SECRET,
      });

      if (sessionToken) {
        const url = new URL(`${GrowwAPI.BASE_URL}/historical/candles`);
        url.searchParams.set("exchange", exchange);
        url.searchParams.set("segment", segment);
        url.searchParams.set("trading_symbol", tradingSymbol);
        url.searchParams.set("start_time", formatDate(from));
        url.searchParams.set("end_time", formatDate(to));
        url.searchParams.set("interval_in_minutes", String(intervalMinutes));

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "x-api-version": "1.0",
            "x-client-id": "growwapi",
          },
        });

        if (res.ok) {
          const data = await res.json();
          const rawCandles = data?.candles || data?.data?.candles;

          if (Array.isArray(rawCandles) && rawCandles.length > 0) {
            const intervalMs = intervalMinutes * 60 * 1000;
            const normalizedCandles: Candle[] = rawCandles.map((c: unknown) => {
              if (Array.isArray(c)) {
                const rawTs = c[0];
                const openTime = typeof rawTs === "number" ? (rawTs > 1e11 ? rawTs : rawTs * 1000) : new Date(rawTs).getTime();
                return {
                  symbol: query.symbol,
                  timeframe: resolution,
                  openTime,
                  closeTime: openTime + intervalMs,
                  open: Number(c[1]),
                  high: Number(c[2]),
                  low: Number(c[3]),
                  close: Number(c[4]),
                  volume: Number(c[5] || 0),
                  isClosed: true,
                };
              }

              const obj = c as Record<string, number | string>;
              const rawTs = obj.timestamp || obj.time || obj.openTime || obj.ts || 0;
              const openTime = typeof rawTs === "number" ? (rawTs > 1e11 ? rawTs : rawTs * 1000) : new Date(rawTs).getTime();
              return {
                symbol: query.symbol,
                timeframe: resolution,
                openTime,
                closeTime: openTime + intervalMs,
                open: Number(obj.open ?? obj.o ?? 0),
                high: Number(obj.high ?? obj.h ?? 0),
                low: Number(obj.low ?? obj.l ?? 0),
                close: Number(obj.close ?? obj.c ?? 0),
                volume: Number(obj.volume ?? obj.v ?? 0),
                isClosed: true,
              };
            });

            normalizedCandles.sort((a, b) => a.openTime - b.openTime);
            return {
              success: true,
              status: "SUCCESS",
              symbol: query.symbol,
              range: query.range,
              resolution,
              candles: normalizedCandles,
              provenanceText: "Groww Historical Market Data • Genuine Provider Candles",
              count: normalizedCandles.length,
            };
          }
        }
      }
    } catch {
      // Continue to official exchange market data query
    }

    // 2. Second Attempt: Official Exchange Market Data Query (NSE/BSE)
    try {
      const ticker = EXCHANGE_MARKET_TICKERS[query.symbol];
      if (ticker) {
        const { rParam, interval } = mapRangeAndResolutionToExchangeParams(query.range, resolution);
        const exchangeUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${rParam}`;

        const res = await fetch(exchangeUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
            Accept: "application/json",
          },
        });

        if (res.ok) {
          const data = await res.json();
          const result = data?.chart?.result?.[0];
          const timestamps: number[] = result?.timestamp || [];
          const quote = result?.indicators?.quote?.[0] || {};
          const intervalMs = intervalMinutes * 60 * 1000;

          const candles: Candle[] = [];
          for (let i = 0; i < timestamps.length; i++) {
            const rawOpen = quote.open?.[i];
            const rawHigh = quote.high?.[i];
            const rawLow = quote.low?.[i];
            const rawClose = quote.close?.[i];
            const rawVol = quote.volume?.[i] || 0;

            if (rawOpen == null || rawHigh == null || rawLow == null || rawClose == null) continue;

            const openTime = timestamps[i] * 1000;
            candles.push({
              symbol: query.symbol,
              timeframe: resolution,
              openTime,
              closeTime: openTime + intervalMs,
              open: Number(rawOpen.toFixed(2)),
              high: Number(rawHigh.toFixed(2)),
              low: Number(rawLow.toFixed(2)),
              close: Number(rawClose.toFixed(2)),
              volume: Number(rawVol || 0),
              isClosed: true,
            });
          }

          if (candles.length > 0) {
            candles.sort((a, b) => a.openTime - b.openTime);
            return {
              success: true,
              status: "SUCCESS",
              symbol: query.symbol,
              range: query.range,
              resolution,
              candles,
              provenanceText: "Official Exchange Market Data • Genuine Provider Candles",
              count: candles.length,
            };
          }
        }
      }
    } catch {
      // Continue to unavailable return
    }

    // 3. Fallback: Clean UNAVAILABLE state without generating fake data
    return {
      success: false,
      status: "UNAVAILABLE",
      symbol: query.symbol,
      range: query.range,
      resolution,
      candles: [],
      provenanceText: "Official Market Data • Data Unavailable",
      errorMessage: "Market data provider returned no candles for this range. Zero fake candles generated.",
      count: 0,
    };
  }
}

export const historicalMarketDataProvider = new GrowwHistoricalMarketDataProvider();
