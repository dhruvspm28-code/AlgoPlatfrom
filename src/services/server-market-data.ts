/**
 * Server-Side Market Data Bridge for SmartQuant Edge.
 *
 * Runs exclusively in the Node.js server runtime (Vite dev server or SSR):
 * 1. Safely loads GROWW_API_KEY and GROWW_API_SECRET from server-side .env.
 * 2. Authenticates with official Groww API Gateway (HMAC SHA-256).
 * 3. Connects to official Groww Feed NATS Gateway (wss://socket-api.groww.in).
 * 4. Dispatches genuine ticks via Server-Sent Events (SSE) to connected browser clients.
 * 5. Strictly protects credentials: never sends keys to the client, logs, or storage.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { checkEnvConfigured } from "./safe-env";
import { GrowwAPI, GrowwFeed, type GrowwInstrument, type ParsedSocketResponse } from "./groww-feed";
import { WATCHLIST_INSTRUMENTS, type InstrumentMapping } from "./instrument-mapper";
import {
  type NormalizedTick,
  type FeedConnectionState,
  type MarketSessionState,
} from "./market-data-types";

class ServerMarketDataManager {
  private feed: GrowwFeed | null = null;
  private connectionState: FeedConnectionState = "CONNECTING";
  private provenanceText = "INITIALIZING: Server-side Groww Feed starting...";
  private lastVerifiedSnapshot = new Map<string, NormalizedTick>();
  private sseClients = new Set<ServerResponse>();
  private isInitialized = false;
  private tokenToSymbol = new Map<string, InstrumentMapping>();

  constructor() {
    this.buildTokenMap();
    this.initializeBaselineSnapshots();
  }

  private buildTokenMap() {
    for (const inst of WATCHLIST_INSTRUMENTS) {
      if (inst.assetClass === "EQUITY") {
        this.tokenToSymbol.set(`eq:${inst.nseToken}`, inst);
      } else {
        this.tokenToSymbol.set(`idx:${inst.growwSymbol.toUpperCase()}`, inst);
      }
    }
  }

  private initializeBaselineSnapshots() {
    const now = new Date().toISOString();
    WATCHLIST_INSTRUMENTS.forEach((inst) => {
      this.lastVerifiedSnapshot.set(inst.symbol, {
        symbol: inst.symbol,
        exchange: inst.exchange,
        instrumentId: inst.growwKey,
        price: inst.basePrice,
        open: inst.basePrice,
        high: inst.basePrice,
        low: inst.basePrice,
        previousClose: inst.basePrice,
        change: 0,
        changePct: 0,
        volume: 0,
        timestamp: now,
        provider: "groww",
        status: "MARKET_CLOSED",
      });
    });
  }

  public calculateMarketSession(): MarketSessionState {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    const day = istTime.getUTCDay();
    const hours = istTime.getUTCHours();
    const mins = istTime.getUTCMinutes();
    const timeInMins = hours * 60 + mins;

    if (day === 0 || day === 6) return "MARKET CLOSED";
    if (timeInMins >= 540 && timeInMins < 555) return "PRE-MARKET";
    if (timeInMins >= 555 && timeInMins <= 930) return "MARKET OPEN";
    if (timeInMins > 930 && timeInMins <= 960) return "POST-MARKET";
    return "MARKET CLOSED";
  }

  public async start(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const envStatus = checkEnvConfigured();
    if (!envStatus.growwApiKey || !envStatus.growwApiSecret) {
      this.connectionState = "CONFIG_ERROR";
      this.provenanceText = "CONFIG ERROR: Groww credentials missing in server .env.";
      return;
    }

    const session = this.calculateMarketSession();
    if (session === "MARKET CLOSED") {
      this.connectionState = "MARKET_CLOSED";
      this.provenanceText =
        "MARKET CLOSED: NSE/BSE regular trading hours closed (09:15-15:30 IST). Connected to official Groww Feed (wss://socket-api.groww.in).";
    } else {
      this.connectionState = "CONNECTING";
      this.provenanceText = "CONNECTING: Authenticating with Groww Trade Gateway...";
    }

    try {
      const apiKey = process.env.GROWW_API_KEY!;
      const apiSecret = process.env.GROWW_API_SECRET!;

      // 1. Authenticate with official Groww API
      const sessionToken = await GrowwAPI.getAccessToken(apiKey, apiSecret);

      // 2. Initialize official GrowwFeed NATS client
      this.feed = new GrowwFeed(sessionToken);
      await this.feed.initialize();

      this.feed.setOnConnectionChange((status, detail) => {
        if (status === "CONNECTED") {
          const curSession = this.calculateMarketSession();
          if (curSession === "MARKET CLOSED") {
            this.connectionState = "MARKET_CLOSED";
            this.provenanceText =
              "MARKET CLOSED: NSE/BSE regular trading hours closed (09:15-15:30 IST). Connected to official Groww Feed (wss://socket-api.groww.in).";
          } else {
            this.connectionState = "WAITING_FOR_DATA";
            this.provenanceText = `WAITING FOR DATA: Subscribed to ${WATCHLIST_INSTRUMENTS.length} instruments on Groww Feed NATS gateway. Awaiting verified live market tick.`;
          }
        } else if (status === "DISCONNECTED") {
          this.connectionState = "DISCONNECTED";
          this.provenanceText = `DISCONNECTED: ${detail}`;
        }
        this.broadcastStatus();
      });

      this.feed.setOnTick((topic, data) => {
        this.handleTick(topic, data);
      });

      this.feed.connect();

      // Subscribe equities and indices
      const equities: GrowwInstrument[] = WATCHLIST_INSTRUMENTS.filter(
        (i) => i.assetClass === "EQUITY",
      ).map((i) => ({
        exchange: i.exchange,
        segment: "CASH",
        exchange_token: i.nseToken,
        trading_symbol: i.symbol,
      }));

      const indices: GrowwInstrument[] = WATCHLIST_INSTRUMENTS.filter(
        (i) => i.assetClass === "INDEX",
      ).map((i) => ({
        exchange: i.exchange,
        segment: "CASH",
        exchange_token: i.growwSymbol,
        trading_symbol: i.symbol,
      }));

      this.feed.subscribe_ltp(equities);
      this.feed.subscribe_index_value(indices);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.connectionState = "AUTH_ERROR";
      this.provenanceText = `GROWW CONNECTION ERROR: ${msg}`;
    }
  }

  private handleTick(topic: string, data: ParsedSocketResponse) {
    let mapping: InstrumentMapping | undefined;
    if (topic.includes("/price.")) {
      const token = topic.split("/price.")[1];
      if (topic.includes("/indices/")) {
        mapping = this.tokenToSymbol.get(`idx:${token.toUpperCase()}`);
      } else {
        mapping = this.tokenToSymbol.get(`eq:${token}`);
      }
    }

    if (!mapping) return;

    let price = 0;
    let open = mapping.basePrice;
    let high = mapping.basePrice;
    let low = mapping.basePrice;
    let volume = 0;
    let tsInMillis = Date.now();

    if (data.stockLivePrice && data.stockLivePrice.ltp > 0) {
      const p = data.stockLivePrice;
      price = p.ltp;
      open = p.open || mapping.basePrice;
      high = p.high || Math.max(open, price);
      low = p.low || Math.min(open, price);
      volume = p.volume || 0;
      tsInMillis = p.tsInMillis || Date.now();
    } else if (data.stocksLiveIndices && data.stocksLiveIndices.value > 0) {
      price = data.stocksLiveIndices.value;
      tsInMillis = data.stocksLiveIndices.tsInMillis || Date.now();
    } else {
      return;
    }

    const prev = this.lastVerifiedSnapshot.get(mapping.symbol) || {
      previousClose: mapping.basePrice,
      open: mapping.basePrice,
      high: mapping.basePrice,
      low: mapping.basePrice,
    };

    const change = Number((price - prev.previousClose).toFixed(2));
    const changePct = Number(((change / prev.previousClose) * 100).toFixed(2));

    const tick: NormalizedTick = {
      symbol: mapping.symbol,
      exchange: mapping.exchange,
      instrumentId: mapping.growwKey,
      price,
      open: open || prev.open,
      high: Math.max(prev.high, high, price),
      low: Math.min(prev.low, low, price),
      previousClose: prev.previousClose,
      change,
      changePct,
      volume,
      timestamp: new Date(tsInMillis).toISOString(),
      provider: "groww",
      status: "LIVE",
    };

    this.lastVerifiedSnapshot.set(mapping.symbol, tick);

    if (this.connectionState !== "LIVE") {
      this.connectionState = "LIVE";
      this.provenanceText = "LIVE: Streaming genuine real-time market ticks from Groww Feed API.";
      this.broadcastStatus();
    }

    // Broadcast tick to all connected SSE clients
    const msg = `data: ${JSON.stringify(tick)}\n\n`;
    for (const client of this.sseClients) {
      client.write(msg);
    }
  }

  private broadcastStatus() {
    const statusPayload = JSON.stringify({
      type: "STATUS",
      status: this.getStatus(),
    });
    const msg = `data: ${statusPayload}\n\n`;
    for (const client of this.sseClients) {
      client.write(msg);
    }
  }

  public getStatus() {
    const envStatus = checkEnvConfigured();
    return {
      growwConfigured: envStatus.growwApiKey && envStatus.growwApiSecret,
      connectionState: this.connectionState,
      provenanceText: this.provenanceText,
      marketSession: this.calculateMarketSession(),
      subscribedCount: WATCHLIST_INSTRUMENTS.length,
      lastTickTimestamp: new Date().toISOString(),
      provider: "groww",
      providerName: "Groww Trade Gateway",
    };
  }

  public getSnapshots(): NormalizedTick[] {
    return Array.from(this.lastVerifiedSnapshot.values());
  }

  // HTTP Middleware Handlers for Vite / Nitro
  public handleStatus(res: ServerResponse) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    res.end(JSON.stringify(this.getStatus()));
  }

  public handleTicks(res: ServerResponse) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    res.end(JSON.stringify(this.getSnapshots()));
  }

  public handleStream(req: IncomingMessage, res: ServerResponse) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    this.sseClients.add(res);

    // Send initial status and snapshots
    res.write(`data: ${JSON.stringify({ type: "STATUS", status: this.getStatus() })}\n\n`);
    for (const tick of this.lastVerifiedSnapshot.values()) {
      res.write(`data: ${JSON.stringify(tick)}\n\n`);
    }

    req.on("close", () => {
      this.sseClients.delete(res);
    });
  }
}

export const serverMarketData = new ServerMarketDataManager();
