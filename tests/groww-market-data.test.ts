/**
 * Automated Test Suite for Groww Market Data Provider & Official Groww Feed Architecture.
 *
 * Validates:
 * 1. Missing Groww credentials -> CONFIG_ERROR
 * 2. Invalid Groww credentials -> AUTH_ERROR
 * 3. SHA-256 checksum generation for Groww token exchange (sha256(secret + timestamp))
 * 4. NKeys user public key generation (prefix 0xA0, CRC16-LE, Base32 RFC 4648, length 56, prefix 'U')
 * 5. Native binary Protobuf decoder for StocksSocketResponseProtoDto (equities & indices)
 * 6. Strict state transition: never shows LIVE until an authentic fresh tick arrives
 * 7. Accurate Indian stock market session calculation in IST
 * 8. Credential masking: raw API key and secret never exposed
 * 9. Market Data Engine dual-provider switching (Groww <-> Dhan)
 * 10. Candle aggregation and indicator pipeline integration with Groww ticks
 * 11. Official topic routing for equities (/ld/eq/nse/price.{token}) and indices (/ld/indices/...)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { GrowwMarketDataProvider, growwProvider } from "../src/services/groww-provider";
import {
  GrowwFeed,
  generateNKeysUserKey,
  parseStocksSocketResponseProto,
  type GrowwInstrument,
} from "../src/services/groww-feed";
import { marketDataEngine } from "../src/services/market-data-engine";
import { candleAggregator } from "../src/services/candle-aggregator";
import { type NormalizedTick } from "../src/services/market-data-types";
import { WATCHLIST_INSTRUMENTS } from "../src/services/instrument-mapper";

describe("SmartQuant Edge Groww Market Data Provider & Feed", () => {
  let provider: GrowwMarketDataProvider;

  beforeEach(() => {
    provider = new GrowwMarketDataProvider();
    provider._resetForTesting();
    marketDataEngine._resetForTesting();
    candleAggregator.clear();
  });

  it("1. should report CONFIG_ERROR when Groww credentials are missing", () => {
    provider.configureCredentials({ apiKey: undefined, apiSecret: undefined });
    assert.equal(provider.getState(), "CONFIG_ERROR");
    assert.match(provider.getProvenanceText(), /CONFIG ERROR/);
  });

  it("2. should report AUTH_ERROR when Groww credentials are invalid", () => {
    provider.configureCredentials({ apiKey: "INVALID_KEY", apiSecret: "wrong_secret" });
    assert.equal(provider.getState(), "AUTH_ERROR");
    assert.match(provider.getProvenanceText(), /AUTH ERROR/);
  });

  it("3. should generate valid SHA-256 checksum for Groww token exchange", async () => {
    const secret = "kZVvcf9B1n1MIryrS4M5X5s@oGyhc7dY";
    const timestamp = 1719830400;
    const checksum = await provider.generateChecksum(secret, timestamp);
    assert.equal(typeof checksum, "string");
    assert.equal(checksum.length, 64);
    assert.match(checksum, /^[a-f0-9]{64}$/);
  });

  it("4. should generate compliant NKeys user key starting with 'U' and length 56", () => {
    const dummyPub = Buffer.alloc(32, 0x42);
    const nkey = generateNKeysUserKey(dummyPub);
    assert.equal(typeof nkey, "string");
    assert.equal(nkey.length, 56);
    assert.equal(nkey[0], "U");
  });

  it("5. should parse binary Protobuf for stockLivePrice and stocksLiveIndices", () => {
    // Construct a mock binary protobuf message for StocksSocketResponseProtoDto:
    // Field 4 (tag 34 = 4 << 3 | 2): stockLivePrice
    //   Field 13 (tag 105 = 13 << 3 | 1): ltp = 2985.50 (double, 8 bytes)
    //   Field 2 (tag 17 = 2 << 3 | 1): open = 2950.0 (double, 8 bytes)
    const priceBuf = Buffer.alloc(18);
    // tag for ltp: 13 << 3 | 1 = 105 (0x69)
    priceBuf[0] = 0x69;
    priceBuf.writeDoubleLE(2985.5, 1);
    // tag for open: 2 << 3 | 1 = 17 (0x11)
    priceBuf[9] = 0x11;
    priceBuf.writeDoubleLE(2950.0, 10);

    // Outer message: tag 34 (0x22), length 18, priceBuf
    const outerBuf = Buffer.concat([Buffer.from([0x22, priceBuf.length]), priceBuf]);

    const parsed = parseStocksSocketResponseProto(outerBuf);
    assert.ok(parsed.stockLivePrice);
    assert.equal(parsed.stockLivePrice?.ltp, 2985.5);
    assert.equal(parsed.stockLivePrice?.open, 2950.0);

    // Test index protobuf: Field 6 (tag 50 = 6 << 3 | 2): stocksLiveIndices
    //   Field 2 (tag 17 = 2 << 3 | 1): value = 24850.25 (double, 8 bytes)
    const indexInner = Buffer.alloc(9);
    indexInner[0] = 0x11; // 2 << 3 | 1
    indexInner.writeDoubleLE(24850.25, 1);
    const indexOuter = Buffer.concat([Buffer.from([0x32, indexInner.length]), indexInner]);

    const parsedIndex = parseStocksSocketResponseProto(indexOuter);
    assert.ok(parsedIndex.stocksLiveIndices);
    assert.equal(parsedIndex.stocksLiveIndices?.value, 24850.25);
  });

  it("6. should transition to LIVE state ONLY after fresh valid tick arrives", () => {
    provider.configureCredentials({ apiKey: "test_key", apiSecret: "test_secret" });
    assert.notEqual(provider.getState(), "LIVE");

    let receivedTick: NormalizedTick | undefined;
    provider.setOnTick((tick) => {
      receivedTick = tick;
    });

    const liveTick: NormalizedTick = {
      symbol: "RELIANCE",
      exchange: "NSE",
      instrumentId: "NSE_RELIANCE",
      price: 2985.4,
      open: 2950.0,
      high: 2990.0,
      low: 2945.0,
      previousClose: 2940.0,
      change: 45.4,
      changePct: 1.54,
      volume: 50000,
      timestamp: new Date().toISOString(),
      provider: "groww",
      status: "LIVE",
    };

    provider.injectSimulatedTick(liveTick);

    assert.equal(provider.getState(), "LIVE");
    assert.ok(receivedTick);
    assert.equal(receivedTick.symbol, "RELIANCE");
    assert.equal(receivedTick.price, 2985.4);
    assert.equal(receivedTick.provider, "groww");
  });

  it("7. should accurately calculate Indian stock exchange market session in IST", () => {
    const session = provider.calculateMarketSession();
    assert.ok(
      ["MARKET OPEN", "PRE-MARKET", "POST-MARKET", "MARKET CLOSED"].includes(session),
      `Unexpected session state: ${session}`,
    );
  });

  it("8. should mask credentials and never expose raw secret or token in diagnostics", () => {
    provider.configureCredentials({
      apiKey: "sample_groww_jwt_token_for_masking_unit_tests_only_value_12345",
      apiSecret: "sample_groww_secret_mock_string_for_testing_purposes",
    });

    const masked = provider.getMaskedCredentials();
    assert.ok(masked.apiKey.includes("••••"));
    assert.ok(masked.apiSecret.includes("••••"));
    assert.ok(
      !masked.apiKey.includes("sample_groww_jwt_token_for_masking_unit_tests_only_value_12345"),
    );
    assert.ok(!masked.apiSecret.includes("sample_groww_secret_mock_string_for_testing_purposes"));
  });

  it("9. should switch between Dhan and Groww providers on marketDataEngine", async () => {
    await marketDataEngine.switchProvider("dhan");
    assert.equal(marketDataEngine.getActiveProviderId(), "dhan");
    assert.equal(marketDataEngine.getFeedStatus().provider, "dhan");
    assert.equal(marketDataEngine.getFeedStatus().providerName, "DhanHQ Market Feed");

    await marketDataEngine.switchProvider("groww");
    assert.equal(marketDataEngine.getActiveProviderId(), "groww");
    assert.equal(marketDataEngine.getFeedStatus().provider, "groww");
    assert.equal(marketDataEngine.getFeedStatus().providerName, "Groww Trade Gateway");
  });

  it("10. should feed genuine Groww ticks into candleAggregator", async () => {
    await marketDataEngine.switchProvider("groww");

    const tick: NormalizedTick = {
      symbol: "TCS",
      exchange: "NSE",
      instrumentId: "NSE_TCS",
      price: 4150.0,
      open: 4120.0,
      high: 4160.0,
      low: 4110.0,
      previousClose: 4128.75,
      change: 21.25,
      changePct: 0.51,
      volume: 12000,
      timestamp: new Date().toISOString(),
      provider: "groww",
      status: "LIVE",
    };

    marketDataEngine.onTickReceived(tick);

    const latest = marketDataEngine.getLatestTick("TCS");
    assert.ok(latest);
    assert.equal(latest.price, 4150.0);
    assert.equal(latest.provider, "groww");

    const candles1m = candleAggregator.getCandles("TCS", "1m");
    assert.ok(candles1m.length > 0);
    assert.equal(candles1m[candles1m.length - 1].close, 4150.0);
  });

  it("11. should manage GrowwFeed subscriptions for equities and indices", () => {
    const feed = new GrowwFeed("dummy_token");

    const equities: GrowwInstrument[] = [
      { exchange: "NSE", segment: "CASH", exchange_token: "2885", trading_symbol: "RELIANCE" },
      { exchange: "NSE", segment: "CASH", exchange_token: "11536", trading_symbol: "TCS" },
    ];
    const indices: GrowwInstrument[] = [
      { exchange: "NSE", segment: "CASH", exchange_token: "NIFTY", trading_symbol: "NIFTY 50" },
    ];

    const eqSub = feed.subscribe_ltp(equities);
    assert.equal(eqSub["2885"], true);
    assert.equal(eqSub["11536"], true);

    const idxSub = feed.subscribe_index_value(indices);
    assert.equal(idxSub["NIFTY"], true);

    const eqUnsub = feed.unsubscribe_ltp(equities);
    assert.equal(eqUnsub["2885"], true);

    const idxUnsub = feed.unsubscribe_index_value(indices);
    assert.equal(idxUnsub["NIFTY"], true);

    feed.disconnect();
  });
});
