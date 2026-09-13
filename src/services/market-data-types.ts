/**
 * Normalized Market Data Types & Enums for SmartQuant Edge.
 * Single source of truth for all market tick payloads, feed connection states,
 * and Indian stock exchange market session states.
 */

export type FeedConnectionState =
  | "CONFIG_ERROR"
  | "AUTH_ERROR"
  | "CONNECTING"
  | "CONNECTED"
  | "WAITING_FOR_DATA"
  | "LIVE"
  | "STALE"
  | "DISCONNECTED"
  | "MARKET_CLOSED";

export type MarketSessionState =
  "PRE-MARKET" | "MARKET OPEN" | "MARKET CLOSED" | "POST-MARKET" | "DATA UNAVAILABLE";

export interface NormalizedTick {
  symbol: string;
  exchange: "NSE" | "BSE";
  instrumentId: string;
  price: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  change: number;
  changePct: number;
  volume: number;
  timestamp: string;
  provider: "dhan" | "upstox" | "groww";
  status: FeedConnectionState;
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "1D";

export interface Candle {
  symbol: string;
  timeframe: Timeframe;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export interface FeedStatus {
  provider: "dhan" | "upstox" | "groww";
  providerName: string;
  connectionState: FeedConnectionState;
  marketSession: MarketSessionState;
  lastTickTimestamp?: string;
  staleThresholdSec: number;
  isStale: boolean;
  reconnectAttempts: number;
  provenanceText: string;
  latencyMs?: number;
  subscribedCount?: number;
}
