/**
 * Broker Authentication & Execution Adapter for SmartQuant Edge.
 * Separates SmartQuant Platform Authentication from Broker OAuth / Session Tokens.
 * Provides clear status tracking and a clean Mock Broker Adapter interface.
 */

import { realtimeBus } from "./realtime-bus";
import { auditLogService } from "./audit-log-service";

export type BrokerStatus = "CONNECTED" | "DISCONNECTED" | "EXPIRED" | "RECONNECTING";

export interface BrokerSession {
  brokerId: "dhan" | "zerodha" | "upstox" | "angelone" | "fyers" | "groww" | "mock";
  brokerName: string;
  accountClientId: string;
  status: BrokerStatus;
  tokenExpiresAt: string;
  lastSyncAt: string;
  isPaperMode: boolean;
}

const STORAGE_BROKER_KEY = "smartquant_edge_broker_v1";

class BrokerAdapter {
  private session: BrokerSession = {
    brokerId: "zerodha",
    brokerName: "Zerodha Kite",
    accountClientId: "ZR-884210",
    status: "CONNECTED",
    tokenExpiresAt: new Date(Date.now() + 3600 * 1000 * 8).toISOString(),
    lastSyncAt: new Date().toISOString(),
    isPaperMode: true,
  };

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_BROKER_KEY);
      if (stored) {
        try {
          this.session = JSON.parse(stored);
        } catch (err) {
          console.warn("Failed to parse broker session:", err);
        }
      }
    }
  }

  private save() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_BROKER_KEY, JSON.stringify(this.session));
    }
  }

  public getSession(): BrokerSession {
    return { ...this.session };
  }

  public getStatus(): BrokerStatus {
    return this.session.status;
  }

  /** Connect broker with OAuth / API Credentials */
  public async connectBroker(
    brokerId: BrokerSession["brokerId"],
    apiKey?: string,
    totpCode?: string,
  ): Promise<{ success: boolean; message: string }> {
    this.session.status = "RECONNECTING";
    this.save();
    realtimeBus.emit("BROKER_STATUS_CHANGED", {
      status: "RECONNECTING",
      broker: this.session.brokerName,
    });

    // Simulate OAuth / API token handshake
    await new Promise((res) => setTimeout(res, 1200));

    const brokerNames: Record<BrokerSession["brokerId"], string> = {
      dhan: "DhanHQ Trading Gateway",
      zerodha: "Zerodha Kite",
      upstox: "Upstox Pro",
      angelone: "Angel One SmartAPI",
      fyers: "Fyers API v3",
      groww: "Groww Trade Gateway",
      mock: "Mock Paper Engine",
    };

    this.session = {
      brokerId,
      brokerName: brokerNames[brokerId] || "Broker API",
      accountClientId: `CLIENT-${Math.floor(100000 + Math.random() * 900000)}`,
      status: "CONNECTED",
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000 * 12).toISOString(),
      lastSyncAt: new Date().toISOString(),
      isPaperMode: this.session.isPaperMode,
    };
    this.save();

    realtimeBus.emit("BROKER_STATUS_CHANGED", {
      status: "CONNECTED",
      broker: this.session.brokerName,
    });

    auditLogService.record({
      user: "Ananya Rao",
      device: "Web Terminal",
      category: "BROKER",
      action: "Broker OAuth Authentication",
      result: "SUCCESS",
      details: `Established token session with ${this.session.brokerName} (${this.session.accountClientId})`,
    });

    return {
      success: true,
      message: `Successfully connected to ${this.session.brokerName} (${this.session.accountClientId})`,
    };
  }

  /** Disconnect Broker */
  public disconnectBroker(): void {
    this.session.status = "DISCONNECTED";
    this.save();

    realtimeBus.emit("BROKER_STATUS_CHANGED", {
      status: "DISCONNECTED",
      broker: this.session.brokerName,
    });

    auditLogService.record({
      user: "Ananya Rao",
      device: "Web Terminal",
      category: "BROKER",
      action: "Broker Disconnected",
      result: "SUCCESS",
      details: `Terminated OAuth session for ${this.session.brokerName}`,
    });
  }

  /** Simulate Token Expiration for testing */
  public expireToken(): void {
    this.session.status = "EXPIRED";
    this.save();

    realtimeBus.emit("BROKER_STATUS_CHANGED", {
      status: "EXPIRED",
      broker: this.session.brokerName,
    });

    auditLogService.record({
      user: "System",
      device: "OAuth Monitor",
      category: "BROKER",
      action: "Broker Token Expired",
      result: "WARNING",
      details: `Access token expired for ${this.session.brokerName}. Re-authentication required.`,
    });
  }
}

export const brokerAdapter = new BrokerAdapter();
