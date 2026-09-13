/**
 * Market Data Engine for SmartQuant Edge.
 * Connects DhanHQ and Groww Trade Gateway real market feeds,
 * tick normalization, 15-second stale data detection,
 * candle aggregation across all 6 timeframes, and real-time event bus distribution.
 * Never silently falls back to fake/mock data.
 */

import { realtimeBus } from "./realtime-bus";
import { auditLogService } from "./audit-log-service";
import { candleAggregator } from "./candle-aggregator";
import { dhanProvider, type DhanMarketDataProvider } from "./dhan-provider";
import { growwProvider, type GrowwMarketDataProvider } from "./groww-provider";
import {
  type NormalizedTick,
  type FeedConnectionState,
  type MarketSessionState,
  type FeedStatus,
} from "./market-data-types";

const STALE_THRESHOLD_SEC = 15;

export type ActiveMarketProviderId = "dhan" | "groww";

export type MarketDataProviderInstance = DhanMarketDataProvider | GrowwMarketDataProvider;

class MarketDataEngine {
  private dhan: DhanMarketDataProvider = dhanProvider;
  private groww: GrowwMarketDataProvider = growwProvider;
  private activeProviderId: ActiveMarketProviderId = "groww";
  private lastTickTime = 0;
  private ticksMap = new Map<string, NormalizedTick>();
  private staleTimerId: ReturnType<typeof setInterval> | null = null;
  private isStale = false;

  constructor() {
    this.init();
  }

  private init() {
    this.wireActiveProvider();
    this.startStaleMonitoring();
    this.startEngine();
  }

  private getActiveProvider(): MarketDataProviderInstance {
    return this.activeProviderId === "groww" ? this.groww : this.dhan;
  }

  private wireActiveProvider() {
    const provider = this.getActiveProvider();

    // Seed initial verified snapshots from the active provider
    provider.getAllSnapshots().forEach((snap) => {
      this.ticksMap.set(snap.symbol, snap);
    });

    // Wire up tick callback
    provider.setOnTick((tick) => {
      this.onTickReceived(tick);
    });

    // Wire up state changes
    provider.setOnStateChange(() => {
      realtimeBus.emit("FEED_STATUS_CHANGED", this.getFeedStatus());
    });
  }

  public async startEngine() {
    const provider = this.getActiveProvider();
    await provider.connect();

    auditLogService.record({
      user: "System",
      device: "Market Data Engine",
      category: "BROKER",
      action: "Market Data Feed Initialized",
      result: "SUCCESS",
      details: `Initialized feed provider: ${provider.providerName} (Status: ${provider.getState()})`,
    });
  }

  /** Switch between Dhan and Groww market data providers */
  public async switchProvider(newProviderId: ActiveMarketProviderId): Promise<void> {
    if (this.activeProviderId === newProviderId) return;

    // Disconnect previous active provider
    this.getActiveProvider().disconnect();

    this.activeProviderId = newProviderId;
    this.lastTickTime = 0;
    this.isStale = false;
    this.ticksMap.clear();

    this.wireActiveProvider();
    await this.startEngine();

    realtimeBus.emit("FEED_STATUS_CHANGED", this.getFeedStatus());

    auditLogService.record({
      user: "Trader",
      device: "Web Terminal",
      category: "BROKER",
      action: "Switched Market Data Provider",
      result: "SUCCESS",
      details: `Active market data feed switched to ${this.getActiveProvider().providerName}`,
    });
  }

  /** Callback invoked when a genuine normalized tick arrives */
  public onTickReceived(tick: NormalizedTick) {
    this.lastTickTime = Date.now();
    this.isStale = false;
    this.ticksMap.set(tick.symbol, tick);

    if (
      tick.provider &&
      (tick.provider === "dhan" || tick.provider === "groww") &&
      this.activeProviderId !== tick.provider
    ) {
      this.activeProviderId = tick.provider;
    }

    const provider = this.getActiveProvider();
    if (tick.status === "LIVE" && provider.getState() !== "LIVE") {
      (provider as unknown as { updateState?: (s: string) => void }).updateState?.("LIVE");
    }

    // Feed tick to Candle Aggregator across all 6 timeframes
    candleAggregator.addTick(tick);

    // Publish normalized tick to global Real-Time Event Bus
    realtimeBus.emit("MARKET_TICK", tick);
  }

  public getLatestTick(symbol: string): NormalizedTick | undefined {
    return this.ticksMap.get(symbol) || this.getActiveProvider().getSnapshot(symbol);
  }

  public getLiveTick(symbol: string): NormalizedTick | undefined {
    return this.getLatestTick(symbol);
  }

  public getAllLatestTicks(): NormalizedTick[] {
    const list = Array.from(this.ticksMap.values());
    if (list.length === 0) {
      return this.getActiveProvider().getAllSnapshots();
    }
    return list;
  }

  public getFeedStatus(): FeedStatus {
    const provider = this.getActiveProvider();
    const currentState = provider.getState();
    const elapsedSec = this.lastTickTime > 0 ? (Date.now() - this.lastTickTime) / 1000 : 0;
    const isNowStale = this.lastTickTime > 0 && elapsedSec > STALE_THRESHOLD_SEC;

    let effectiveState: FeedConnectionState = currentState;
    if (currentState === "LIVE" && isNowStale) {
      effectiveState = "STALE";
    }

    return {
      provider: this.activeProviderId,
      providerName: provider.providerName,
      connectionState: effectiveState,
      marketSession: provider.calculateMarketSession(),
      lastTickTimestamp:
        this.lastTickTime > 0 ? new Date(this.lastTickTime).toISOString() : undefined,
      staleThresholdSec: STALE_THRESHOLD_SEC,
      isStale: isNowStale,
      reconnectAttempts: provider.getReconnectAttempts(),
      latencyMs: provider.getLastLatencyMs(),
      subscribedCount: provider.getSubscribedCount(),
      provenanceText: isNowStale
        ? `STALE DATA: No market updates received for >${STALE_THRESHOLD_SEC}s.`
        : provider.getProvenanceText(),
    };
  }

  public _resetForTesting(): void {
    this.activeProviderId = "groww";
    this.lastTickTime = 0;
    this.isStale = false;
    this.ticksMap.clear();
    this.dhan._resetForTesting();
    this.groww._resetForTesting();
    this.wireActiveProvider();
  }

  public calculateMarketSession(): MarketSessionState {
    return this.getActiveProvider().calculateMarketSession();
  }

  public getProvider(): MarketDataProviderInstance {
    return this.getActiveProvider();
  }

  public getDhanProvider(): DhanMarketDataProvider {
    return this.dhan;
  }

  public getGrowwProvider(): GrowwMarketDataProvider {
    return this.groww;
  }

  public getActiveProviderId(): ActiveMarketProviderId {
    return this.activeProviderId;
  }

  private startStaleMonitoring() {
    if (this.staleTimerId) clearInterval(this.staleTimerId);

    this.staleTimerId = setInterval(() => {
      if (this.lastTickTime === 0) return;
      const elapsedSec = (Date.now() - this.lastTickTime) / 1000;
      const provider = this.getActiveProvider();

      if (elapsedSec > STALE_THRESHOLD_SEC && !this.isStale && provider.getState() === "LIVE") {
        this.isStale = true;

        auditLogService.record({
          user: "System",
          device: "Stale Feed Detector",
          category: "BROKER",
          action: "Market Feed Stale Warning",
          result: "WARNING",
          details: `No ticks received for >${STALE_THRESHOLD_SEC}s. Feed marked STALE. Order placement blocked.`,
        });

        realtimeBus.emit("NOTIFICATION_ADDED", {
          title: "⚠ MARKET DATA STALE",
          body: `No market update received for ${Math.floor(elapsedSec)}s. Check ${provider.providerName} connection.`,
          tone: "bear",
        });

        realtimeBus.emit("SYSTEM_HEALTH_CHANGED", {
          id: "market-data",
          status: "DEGRADED",
          note: "Market data feed stale (>15s pause)",
        });

        realtimeBus.emit("FEED_STATUS_CHANGED", this.getFeedStatus());
      }
    }, 3000);

    if (
      this.staleTimerId &&
      typeof this.staleTimerId === "object" &&
      "unref" in this.staleTimerId
    ) {
      (this.staleTimerId as unknown as { unref: () => void }).unref();
    }
  }
}

export const marketDataEngine = new MarketDataEngine();
