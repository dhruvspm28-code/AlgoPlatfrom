/**
 * Real-time event synchronization bus for SmartQuant Edge.
 * Uses BroadcastChannel for cross-tab/window real-time events,
 * and an internal EventTarget for in-app reactive state updates.
 */

export type RealtimeEventType =
  | "MARKET_TICK"
  | "FEED_STATUS_CHANGED"
  | "ORDER_UPDATED"
  | "ORDER_EXECUTED"
  | "POSITION_UPDATED"
  | "PORTFOLIO_UPDATED"
  | "STRATEGY_SIGNAL"
  | "STRATEGY_STATUS_CHANGED"
  | "KILL_SWITCH_TRIGGERED"
  | "KILL_SWITCH_RESUMED"
  | "SESSION_REVOKED"
  | "BROKER_STATUS_CHANGED"
  | "NOTIFICATION_ADDED"
  | "RISK_ALERT"
  | "SYSTEM_HEALTH_CHANGED"
  | "TRADING_MODE_CHANGED"
  | "EXPLAIN_TRADE_RECORDED";

export interface RealtimeEvent<T = unknown> {
  id: string;
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
  sourceSessionId?: string;
}

class RealtimeBus {
  private channel: BroadcastChannel | null = null;
  private emitter = new EventTarget();
  private channelName = "smartquant_edge_realtime_v1";

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event: MessageEvent<RealtimeEvent>) => {
          this.dispatchLocal(event.data);
        };
      } catch (err) {
        console.warn("BroadcastChannel initialization failed, falling back to local bus:", err);
      }
    }
  }

  /** Broadcast event locally and across tabs/devices */
  public emit<T = unknown>(
    type: RealtimeEventType,
    payload: T,
    sourceSessionId?: string,
  ): RealtimeEvent<T> {
    const event: RealtimeEvent<T> = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
      sourceSessionId,
    };

    // Emit locally
    this.dispatchLocal(event);

    // Broadcast across tabs/windows
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (err) {
        console.warn("Failed to post broadcast message:", err);
      }
    }

    return event;
  }

  /** Subscribe to real-time events */
  public subscribe<T = unknown>(
    type: RealtimeEventType | "*",
    callback: (event: RealtimeEvent<T>) => void,
  ): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<RealtimeEvent<T>>;
      if (type === "*" || customEvent.detail.type === type) {
        callback(customEvent.detail);
      }
    };

    this.emitter.addEventListener("realtime", handler);

    return () => {
      this.emitter.removeEventListener("realtime", handler);
    };
  }

  private dispatchLocal<T>(event: RealtimeEvent<T>) {
    this.emitter.dispatchEvent(new CustomEvent("realtime", { detail: event }));
  }
}

export const realtimeBus = new RealtimeBus();
