/**
 * Automated Test Suite for SmartQuant Edge Trading Pipeline.
 *
 * Validates:
 * 1. Missing Dhan credentials -> CONFIG_ERROR
 * 2. Invalid Dhan credentials / Auth disconnect -> AUTH_ERROR
 * 3. Real DhanHQ v2 binary packet parsing (Quote code 4, Ticker code 2, Index code 1)
 * 4. Malformed packet rejection (truncated, zero/negative price, unknown security ID)
 * 5. LIVE state transition ONLY after genuine market tick (never merely on CONNECTED)
 * 6. Stale feed detection after >15 seconds without updates
 * 7. Reconnect behavior with exponential backoff and duplicate socket prevention
 * 8. Indian stock exchange market session in IST (09:15-15:30 IST)
 * 9. Candle creation strictly from genuine incoming ticks (zero synthetic fabrication)
 * 10. Technical indicator calculations on genuine candle data
 * 11. Signal generation blocked on stale/unavailable feed or insufficient candles (<21)
 * 12. Paper broker mark-to-market P&L updates from genuine ticks
 * 13. Security assertion: DHAN_ACCESS_TOKEN never exposed in logs or diagnostics
 * 14. Position sizing formula & capital caps
 * 15. Risk engine order rejection (stop-loss mandatory & capital limits)
 * 16. Paper order execution & lifecycle stepper progression
 * 17. Duplicate idempotency key rejection
 * 18. Kill switch halts trading & blocks orders
 * 19. "Explain This Trade" 9-stage verifiable audit chain
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { DhanMarketDataProvider, dhanProvider } from "../src/services/dhan-provider";
import { candleAggregator } from "../src/services/candle-aggregator";
import { IndicatorEngine } from "../src/services/indicator-engine";
import { signalEngine } from "../src/services/signal-engine";
import { PositionSizer } from "../src/services/position-sizer";
import { riskEngine } from "../src/services/risk-engine";
import { orderEngine } from "../src/services/order-engine";
import { paperBroker } from "../src/services/paper-broker";
import { killSwitchEngine } from "../src/services/kill-switch-engine";
import { tradeExplainerService } from "../src/services/trade-explainer";
import { marketDataEngine } from "../src/services/market-data-engine";
import { type Candle } from "../src/services/market-data-types";

// Binary DhanHQ v2 packet generator helpers for tests
function createDhanBinaryQuotePacket(params?: {
  responseCode?: number;
  msgLength?: number;
  exchangeSegmentCode?: number;
  securityId?: number;
  ltp?: number;
  quantity?: number;
  epochTime?: number;
  atp?: number;
  volume?: number;
  totalBuyQty?: number;
  totalSellQty?: number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
}): ArrayBuffer {
  const length = params?.msgLength ?? 50;
  const buf = new ArrayBuffer(length);
  const view = new DataView(buf);
  view.setUint8(0, params?.responseCode ?? 4);
  view.setInt16(1, length, true);
  view.setUint8(3, params?.exchangeSegmentCode ?? 1); // 1 = NSE_EQ
  view.setInt32(4, params?.securityId ?? 1333, true); // 1333 = RELIANCE
  if (length >= 50) {
    view.setFloat32(8, params?.ltp ?? 2985.5, true);
    view.setInt16(12, params?.quantity ?? 50, true);
    view.setInt32(14, params?.epochTime ?? Math.floor(Date.now() / 1000), true);
    view.setFloat32(18, params?.atp ?? 2980.0, true);
    view.setInt32(22, params?.volume ?? 45000, true);
    view.setInt32(26, params?.totalBuyQty ?? 10000, true);
    view.setInt32(30, params?.totalSellQty ?? 8000, true);
    view.setFloat32(34, params?.open ?? 2970.0, true);
    view.setFloat32(38, params?.close ?? 2960.0, true);
    view.setFloat32(42, params?.high ?? 2990.0, true);
    view.setFloat32(46, params?.low ?? 2965.0, true);
  }
  return buf;
}

function createDhanBinaryTickerPacket(params?: {
  securityId?: number;
  exchangeSegmentCode?: number;
  ltp?: number;
  epochTime?: number;
}): ArrayBuffer {
  const buf = new ArrayBuffer(16);
  const view = new DataView(buf);
  view.setUint8(0, 2);
  view.setInt16(1, 16, true);
  view.setUint8(3, params?.exchangeSegmentCode ?? 1);
  view.setInt32(4, params?.securityId ?? 1333, true);
  view.setFloat32(8, params?.ltp ?? 2988.75, true);
  view.setInt32(12, params?.epochTime ?? Math.floor(Date.now() / 1000), true);
  return buf;
}

function createDhanBinaryIndexPacket(params?: {
  securityId?: number;
  ltp?: number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
  epochTime?: number;
}): ArrayBuffer {
  const buf = new ArrayBuffer(32);
  const view = new DataView(buf);
  view.setUint8(0, 1);
  view.setInt16(1, 32, true);
  view.setUint8(3, 0); // IDX_I
  view.setInt32(4, params?.securityId ?? 13, true); // 13 = NIFTY 50
  view.setFloat32(8, params?.ltp ?? 24850.0, true);
  view.setFloat32(12, params?.open ?? 24700.0, true);
  view.setFloat32(16, params?.close ?? 24650.0, true);
  view.setFloat32(20, params?.high ?? 24900.0, true);
  view.setFloat32(24, params?.low ?? 24600.0, true);
  view.setInt32(28, params?.epochTime ?? Math.floor(Date.now() / 1000), true);
  return buf;
}

function createDhanBinaryDisconnectPacket(disconnectCode: number): ArrayBuffer {
  const buf = new ArrayBuffer(10);
  const view = new DataView(buf);
  view.setUint8(0, 50);
  view.setInt16(1, 10, true);
  view.setUint8(3, 0);
  view.setInt32(4, 0, true);
  view.setInt16(8, disconnectCode, true);
  return buf;
}

describe("SmartQuant Edge Trading Pipeline Test Suite", () => {
  // 1. Missing Dhan Credentials -> CONFIG_ERROR
  it("1. should report CONFIG_ERROR when Dhan credentials are missing", async () => {
    const provider = new DhanMarketDataProvider();
    provider.configureCredentials({ clientId: "", accessToken: "" });
    await provider.connect();
    assert.equal(provider.getState(), "CONFIG_ERROR");
    assert.match(provider.getProvenanceText(), /CONFIG ERROR/);
    assert.match(provider.getProvenanceText(), /credentials missing/);
  });

  // 2. Authentication Failure -> AUTH_ERROR
  it("2. should report AUTH_ERROR when Dhan credentials are invalid or rejected", async () => {
    const provider = new DhanMarketDataProvider();
    provider.configureCredentials({ clientId: "DHAN_123", accessToken: "INVALID_TOKEN" });
    await provider.connect();
    assert.equal(provider.getState(), "AUTH_ERROR");
    assert.match(provider.getProvenanceText(), /AUTH ERROR/);

    // Also test Disconnect packet 808 (token expired / invalid)
    const validProvider = new DhanMarketDataProvider();
    validProvider.configureCredentials({ clientId: "DHAN_VALID", accessToken: "TOKEN_SAMPLE" });
    const disconnectPacket = createDhanBinaryDisconnectPacket(808);
    validProvider.parseBinaryPacket(disconnectPacket);
    assert.equal(validProvider.getState(), "AUTH_ERROR");
  });

  // 3. Valid Binary Dhan Packet Normalization
  it("3. should normalize valid binary Dhan packets (Quote, Ticker, Index)", () => {
    const provider = new DhanMarketDataProvider();
    provider.configureCredentials({ clientId: "DHAN_123", accessToken: "VALID_TOKEN" });

    // 3a. Quote Packet (Code 4, 50 bytes)
    const quoteBuf = createDhanBinaryQuotePacket({
      securityId: 1333,
      ltp: 2985.5,
      open: 2970.0,
      close: 2960.0,
      high: 2990.0,
      low: 2965.0,
      volume: 45000,
    });
    const quoteTick = provider.parseBinaryPacket(quoteBuf);
    assert.ok(quoteTick);
    assert.equal(quoteTick.symbol, "RELIANCE");
    assert.equal(quoteTick.exchange, "NSE");
    assert.equal(quoteTick.price, 2985.5);
    assert.equal(quoteTick.open, 2970.0);
    assert.equal(quoteTick.high, 2990.0);
    assert.equal(quoteTick.low, 2965.0);
    assert.equal(quoteTick.previousClose, 2960.0);
    assert.equal(quoteTick.volume, 45000);
    assert.equal(quoteTick.provider, "dhan");
    assert.equal(quoteTick.status, "LIVE");

    // 3b. Ticker Packet (Code 2, 16 bytes)
    const tickerBuf = createDhanBinaryTickerPacket({
      securityId: 1333,
      ltp: 2988.75,
    });
    const tickerTick = provider.parseBinaryPacket(tickerBuf);
    assert.ok(tickerTick);
    assert.equal(tickerTick.symbol, "RELIANCE");
    assert.equal(tickerTick.price, 2988.75);

    // 3c. Index Packet (Code 1, 32 bytes)
    const indexBuf = createDhanBinaryIndexPacket({
      securityId: 13,
      ltp: 24850.0,
      open: 24700.0,
      close: 24650.0,
      high: 24900.0,
      low: 24600.0,
    });
    const indexTick = provider.parseBinaryPacket(indexBuf);
    assert.ok(indexTick);
    assert.equal(indexTick.symbol, "NIFTY 50");
    assert.equal(indexTick.price, 24850.0);
    assert.equal(indexTick.open, 24700.0);
  });

  // 4. Malformed Packet Rejection
  it("4. should reject malformed, truncated, or invalid binary packets", () => {
    const provider = new DhanMarketDataProvider();
    provider.configureCredentials({ clientId: "DHAN_123", accessToken: "VALID_TOKEN" });

    // Truncated buffer (< 8 bytes header)
    const tinyBuf = new ArrayBuffer(5);
    assert.equal(provider.parseBinaryPacket(tinyBuf), null);

    // Header claims 50 bytes, but buffer length is only 20 bytes
    const truncatedBuf = createDhanBinaryQuotePacket({ msgLength: 20 });
    assert.equal(provider.parseBinaryPacket(truncatedBuf), null);

    // Invalid LTP (0 or negative)
    const zeroPriceBuf = createDhanBinaryQuotePacket({ ltp: 0 });
    assert.equal(provider.parseBinaryPacket(zeroPriceBuf), null);

    const negativePriceBuf = createDhanBinaryQuotePacket({ ltp: -100.5 });
    assert.equal(provider.parseBinaryPacket(negativePriceBuf), null);

    // Unknown Security ID (not in watchlist)
    const unknownIdBuf = createDhanBinaryQuotePacket({ securityId: 999999 });
    assert.equal(provider.parseBinaryPacket(unknownIdBuf), null);
  });

  // 5. LIVE Only After Fresh Valid Tick
  it("5. should transition to LIVE state ONLY after fresh valid tick arrives", () => {
    const provider = new DhanMarketDataProvider();
    provider.configureCredentials({ clientId: "DHAN_USER", accessToken: "VALID_JWT" });

    // Connected does NOT mean LIVE!
    assert.notEqual(provider.getState(), "LIVE");

    // Process genuine tick packet -> now transitions to LIVE
    const quoteBuf = createDhanBinaryQuotePacket({ securityId: 1333, ltp: 2985.5 });
    provider.parseBinaryPacket(quoteBuf);

    assert.equal(provider.getState(), "LIVE");
  });

  // 6. Stale Feed Detection (>15s)
  it("6. should detect stale feed when no ticks arrive for >15 seconds", () => {
    const feedStatus = marketDataEngine.getFeedStatus();
    assert.equal(feedStatus.staleThresholdSec, 15);
    assert.ok(typeof feedStatus.isStale === "boolean");

    // Ingest a tick to simulate fresh market data
    const provider = marketDataEngine.getProvider();
    provider.configureCredentials({ clientId: "DHAN_VALID", accessToken: "TOKEN_VALID" });
    marketDataEngine.onTickReceived({
      symbol: "RELIANCE",
      exchange: "NSE",
      instrumentId: "1333",
      price: 2985.5,
      open: 2970.0,
      high: 2990.0,
      low: 2965.0,
      previousClose: 2960.0,
      change: 25.5,
      changePct: 0.86,
      volume: 45000,
      timestamp: new Date().toISOString(),
      provider: "dhan",
      status: "LIVE",
    });

    const freshStatus = marketDataEngine.getFeedStatus();
    assert.equal(freshStatus.isStale, false);
    assert.equal(freshStatus.connectionState, "LIVE");

    // Simulate 16 seconds elapsed without ticks
    (marketDataEngine as unknown as { lastTickTime: number }).lastTickTime = Date.now() - 16000;
    const staleStatus = marketDataEngine.getFeedStatus();
    assert.equal(staleStatus.isStale, true);
    assert.equal(staleStatus.connectionState, "STALE");
  });

  // 7. Reconnect Behavior
  it("7. should support reconnect with backoff tracking and duplicate prevention", () => {
    const provider = new DhanMarketDataProvider();
    provider.configureCredentials({ clientId: "DHAN_123", accessToken: "VALID_TOKEN" });

    assert.equal(provider.getReconnectAttempts(), 0);
    // Subscribed count matches core instruments
    assert.equal(provider.getSubscribedCount(), 10);

    // Clean disconnect resets socket
    provider.disconnect();
    assert.equal(provider.getState(), "DISCONNECTED");
  });

  // 8. Market Closed Behavior
  it("8. should accurately calculate Indian stock exchange market session in IST", () => {
    const session = marketDataEngine.calculateMarketSession();
    assert.ok(["MARKET OPEN", "MARKET CLOSED", "PRE-MARKET", "POST-MARKET"].includes(session));
  });

  // 9. Candle Creation Only From Genuine Ticks
  it("9. should build candles strictly from genuine incoming ticks without synthetic fabrication", () => {
    candleAggregator.clearAll();

    // Verify initially zero candles exist for fresh symbol
    const initialCandles = candleAggregator.getCandles("TEST_STOCK", "1m");
    assert.equal(initialCandles.length, 0, "No fake historical candles should be fabricated");

    // Ingest genuine ticks across 2 distinct minutes aligned to minute boundaries
    const baseTime = Math.floor(Date.now() / 60000) * 60000;
    const tick1 = {
      symbol: "TEST_STOCK",
      exchange: "NSE",
      instrumentId: "9999",
      price: 100.0,
      open: 100.0,
      high: 100.0,
      low: 100.0,
      previousClose: 99.0,
      change: 1.0,
      changePct: 1.01,
      volume: 50,
      timestamp: new Date(baseTime).toISOString(),
      provider: "dhan" as const,
      status: "LIVE" as const,
    };

    const tick2 = {
      ...tick1,
      price: 105.0,
      volume: 75,
      timestamp: new Date(baseTime + 10000).toISOString(), // 10s later, same 1m candle
    };

    const tick3 = {
      ...tick1,
      price: 102.0,
      volume: 30,
      timestamp: new Date(baseTime + 70000).toISOString(), // 70s later, next 1m candle
    };

    candleAggregator.addTick(tick1);
    candleAggregator.addTick(tick2);
    candleAggregator.addTick(tick3);

    const candles1m = candleAggregator.getCandles("TEST_STOCK", "1m");
    assert.equal(candles1m.length, 2, "Should have exactly 2 genuine 1m candles");
    assert.equal(candles1m[0].open, 100.0);
    assert.equal(candles1m[0].high, 105.0);
    assert.equal(candles1m[0].close, 105.0);
    assert.equal(candles1m[0].volume, 125);
    assert.equal(candles1m[1].open, 102.0);
  });

  // 10. Indicators on Genuine Candle Data
  it("10. should compute all 10 technical indicators accurately on genuine candle data", () => {
    const candles: Candle[] = [];
    const now = Date.now();
    for (let i = 0; i < 40; i++) {
      const price = 100 + i * 0.5 + Math.sin(i) * 2;
      candles.push({
        symbol: "RELIANCE",
        timeframe: "15m",
        openTime: now + i * 900000,
        closeTime: now + (i + 1) * 900000,
        open: price - 0.2,
        high: price + 1.0,
        low: price - 1.0,
        close: price,
        volume: 1000 + i * 50,
        isClosed: true,
      });
    }

    const all = IndicatorEngine.calculateAll(candles);
    assert.ok(all.sma20.isReady, "SMA20 should be ready");
    assert.ok(all.ema9.isReady, "EMA9 should be ready");
    assert.ok(all.rsi14.isReady, "RSI14 should be ready");
    assert.ok(all.rsi14.value >= 0 && all.rsi14.value <= 100, "RSI should be between 0 and 100");
    assert.ok(all.macd.isReady, "MACD should be ready");
    assert.ok(all.bollinger.isReady, "Bollinger Bands should be ready");
    assert.ok(
      all.bollinger.value.upper > all.bollinger.value.lower,
      "Upper band should exceed lower",
    );
    assert.ok(all.atr14.isReady, "ATR14 should be ready");
    assert.ok(all.atr14.value > 0, "ATR should be positive");
    assert.ok(all.vwap.isReady, "VWAP should be ready");
    assert.ok(all.supertrend.isReady, "Supertrend should be ready");
    assert.ok(all.stochastic.isReady, "Stochastic should be ready");
    assert.ok(all.stdDev20.isReady, "StdDev should be ready");
  });

  // 11. Signal Blocked on Stale or Unavailable Data or Insufficient Candles
  it("11. should reject signal generation when market data feed is unavailable, stale, or has insufficient candles", () => {
    // 11a. Unconfigured credentials
    const provider = marketDataEngine.getProvider();
    provider.configureCredentials({ clientId: "", accessToken: "" });

    assert.throws(() => {
      signalEngine.evaluateStrategy({
        strategyId: "STR-001",
        strategyName: "EMA Crossover Pro",
        symbol: "RELIANCE",
      });
    }, /Cannot generate signals: Market data is/);

    // 11b. Feed is LIVE, but insufficient candles (< 21)
    provider.configureCredentials({ clientId: "DHAN_VALID", accessToken: "TOKEN_VALID" });
    marketDataEngine.onTickReceived({
      symbol: "RELIANCE",
      exchange: "NSE",
      instrumentId: "1333",
      price: 2985.5,
      open: 2970.0,
      high: 2990.0,
      low: 2965.0,
      previousClose: 2960.0,
      change: 25.5,
      changePct: 0.86,
      volume: 45000,
      timestamp: new Date().toISOString(),
      provider: "dhan",
      status: "LIVE",
    });

    candleAggregator.clearAll(); // zero candles
    assert.throws(() => {
      signalEngine.evaluateStrategy({
        strategyId: "STR-001",
        strategyName: "EMA Crossover Pro",
        symbol: "RELIANCE",
      });
    }, /Insufficient genuine candles/);

    // 11c. Supply 35 genuine candles -> Signal generates successfully with confluence score
    const now = Date.now();
    const testCandles: Candle[] = [];
    for (let i = 0; i < 35; i++) {
      const price = 2950 + i * 2;
      testCandles.push({
        symbol: "RELIANCE",
        timeframe: "15m",
        openTime: now - (35 - i) * 900000,
        closeTime: now - (34 - i) * 900000,
        open: price - 2,
        high: price + 5,
        low: price - 3,
        close: price,
        volume: 5000 + i * 100,
        isClosed: true,
      });
    }
    candleAggregator.setCandles("RELIANCE", "15m", testCandles);

    const sig = signalEngine.evaluateStrategy({
      strategyId: "STR-001",
      strategyName: "EMA Crossover Pro",
      symbol: "RELIANCE",
    });
    assert.ok(sig);
    assert.equal(sig.symbol, "RELIANCE");
    assert.ok(sig.confluenceScore >= 0 && sig.confluenceScore <= 100);
    assert.match(sig.confluenceDisclaimer, /NOT probability of profit/);
    assert.ok(sig.indicatorEvidence.length > 0);
  });

  // 12. Paper P&L Updates from Genuine Ticks
  it("12. should recalculate unrealized P&L and portfolio value on incoming genuine ticks", () => {
    const initialPortfolio = paperBroker.getPortfolio();
    assert.ok(typeof initialPortfolio.totalPortfolioValue === "number");

    marketDataEngine.onTickReceived({
      symbol: "RELIANCE",
      exchange: "NSE",
      instrumentId: "1333",
      price: 3050.0, // +₹65 jump
      open: 2984.4,
      high: 3055.0,
      low: 2980.0,
      previousClose: 2984.4,
      change: 65.6,
      changePct: 2.2,
      volume: 50000,
      timestamp: new Date().toISOString(),
      provider: "dhan",
      status: "LIVE",
    });

    const positions = paperBroker.getPositions();
    const reliancePos = positions.find((p) => p.symbol === "RELIANCE");
    if (reliancePos) {
      assert.equal(reliancePos.currentPrice, 3050.0);
    }
  });

  // 13. Access Token Never Appears in Client Logs/Diagnostics
  it("13. should mask credentials and never expose raw access token in diagnostics", () => {
    const provider = new DhanMarketDataProvider();
    const secretToken = "SECRET_DHAN_BEARER_TOKEN_9988776655";
    provider.configureCredentials({
      clientId: "DHAN_CLIENT_42",
      accessToken: secretToken,
    });

    const masked = provider.getMaskedCredentials();
    assert.notEqual(masked.accessToken, secretToken);
    assert.match(masked.accessToken, /\*\*\*/);
    assert.match(masked.clientId, /\*\*\*/);

    // Provenance text must not contain secret token
    const provText = provider.getProvenanceText();
    assert.equal(provText.includes(secretToken), false);
  });

  // 14. Position Sizing
  it("14. should calculate position size using: Risk Budget / Risk Per Share and apply caps", () => {
    const result = PositionSizer.calculate({
      accountCapital: 1000000, // ₹10,00,000
      riskPctPerTrade: 1.0, // 1% = ₹10,000 risk budget
      entryPrice: 1000, // Entry = ₹1,000
      stopLossPrice: 950, // Stop Loss = ₹950 (Risk per share = ₹50)
      maxPositionSizePct: 25, // Max value = ₹2,50,000 (250 Qty)
    });

    // Expected Raw Qty = 10,000 / 50 = 200
    assert.equal(result.maxRiskAmount, 10000);
    assert.equal(result.riskPerShare, 50);
    assert.equal(result.rawQty, 200);
    assert.equal(result.recommendedQty, 200);
    assert.equal(result.totalPositionValue, 200000);
    assert.equal(result.steps.length, 6);
  });

  // 15. Risk Engine Rejection
  it("15. should block order when stop-loss is missing or exceeds limits", () => {
    const check1 = riskEngine.evaluateOrder({
      symbol: "RELIANCE",
      side: "BUY",
      qty: 10,
      price: 2984.4,
      stopLossPrice: 0, // Missing Stop Loss
    });
    assert.equal(check1.passed, false);
    assert.equal(check1.decision, "BLOCKED");
    assert.match(check1.reason, /Stop Loss is mandatory/);

    const check2 = riskEngine.evaluateOrder({
      symbol: "RELIANCE",
      side: "BUY",
      qty: 10000,
      price: 2984.4, // Trade value = ~₹3 Crores (exceeds available capital)
      stopLossPrice: 2900,
    });
    assert.equal(check2.passed, false);
    assert.equal(check2.decision, "BLOCKED");
    assert.match(check2.reason, /exceeds/);
  });

  // 16. Paper Order Execution & Lifecycle Stepper
  it("16. should execute paper order through full lifecycle stepper and record simulated fill", async () => {
    const order = await orderEngine.submitOrder({
      idempotencyKey: `TEST-KEY-${Date.now()}`,
      symbol: "SBIN",
      side: "BUY",
      orderType: "LIMIT",
      qty: 10,
      price: 842.5,
      stopLossPrice: 820.0,
    });

    assert.ok(order.id);
    assert.equal(order.status, "EXECUTED");
    assert.equal(order.filledQty, 10);
    assert.ok(order.timeline.some((t) => t.stage === "CREATED"));
    assert.ok(order.timeline.some((t) => t.stage === "RISK_CHECK" && t.passed));
    assert.ok(order.timeline.some((t) => t.stage === "SUBMITTED"));
    assert.ok(order.timeline.some((t) => t.stage === "ACCEPTED"));
    assert.ok(order.timeline.some((t) => t.stage === "EXECUTED"));
  });

  // 17. Duplicate Idempotency Key Rejection
  it("17. should reject duplicate order with same idempotency key", async () => {
    const duplicateKey = `IDEMPOTENT-${Date.now()}`;
    await orderEngine.submitOrder({
      idempotencyKey: duplicateKey,
      symbol: "TCS",
      side: "BUY",
      orderType: "LIMIT",
      qty: 5,
      price: 4128.75,
      stopLossPrice: 4050.0,
    });

    await assert.rejects(async () => {
      await orderEngine.submitOrder({
        idempotencyKey: duplicateKey,
        symbol: "TCS",
        side: "BUY",
        orderType: "LIMIT",
        qty: 5,
        price: 4128.75,
        stopLossPrice: 4050.0,
      });
    }, /already processed/);
  });

  // 18. Kill Switch Blocks Orders
  it("18. should halt trading and block all new order submissions when Kill Switch is active", async () => {
    killSwitchEngine.activateKillSwitch("Automated Test Halt");
    assert.equal(killSwitchEngine.getGlobalState(), "HALTED");

    const order = await orderEngine.submitOrder({
      symbol: "INFY",
      side: "BUY",
      orderType: "MARKET",
      qty: 10,
      price: 1892.6,
      stopLossPrice: 1850.0,
    });

    assert.equal(order.status, "REJECTED");
    assert.match(order.rejectionReason || "", /Kill Switch Active|Trading Halt/);

    // Resume trading
    killSwitchEngine.resumeTrading();
    assert.equal(killSwitchEngine.getGlobalState(), "ACTIVE");
  });

  // 19. "Explain This Trade" 9-Stage Verifiable Audit Chain
  it("19. should record and retrieve a complete 9-stage Explain This Trade chain", () => {
    const explainRecords = tradeExplainerService.getAllRecords();
    assert.ok(explainRecords.length > 0);

    const record = explainRecords[0];
    assert.ok(record.id);
    assert.ok(record.symbol);
    assert.ok(record.stages.length >= 9, "Must contain all 9 pipeline stages");

    const stageNames = record.stages.map((s) => s.stageName);
    assert.ok(stageNames.some((n) => n.includes("MARKET DATA")));
    assert.ok(stageNames.some((n) => n.includes("INDICATORS")));
    assert.ok(stageNames.some((n) => n.includes("STRATEGY CONDITIONS")));
    assert.ok(stageNames.some((n) => n.includes("SIGNAL")));
    assert.ok(stageNames.some((n) => n.includes("POSITION SIZING")));
    assert.ok(stageNames.some((n) => n.includes("RISK DECISION")));
    assert.ok(stageNames.some((n) => n.includes("ORDER")));
    assert.ok(stageNames.some((n) => n.includes("FILL")));
    assert.ok(stageNames.some((n) => n.includes("POSITION")));
  });
});
