/**
 * Security & Trading Audit Logger for SmartQuant Edge.
 * Captures all security events, strategy triggers, kill switch events,
 * risk rejections, broker connections, and order lifecycle changes.
 */

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  device: string;
  category: "AUTH" | "STRATEGY" | "RISK" | "ORDER" | "BROKER" | "KILL_SWITCH" | "SYSTEM";
  action: string;
  result: "SUCCESS" | "BLOCKED" | "FAILED" | "WARNING";
  details: string;
  entityId?: string;
}

const STORAGE_KEY = "smartquant_edge_audit_logs_v1";

const DEFAULT_AUDIT_LOGS: AuditEntry[] = [
  {
    id: "AUD-9901",
    timestamp: "2026-08-09T09:02:14.000Z",
    user: "Ananya Rao",
    device: "Chrome (MacBook Pro · 192.168.1.45)",
    category: "AUTH",
    action: "User Login",
    result: "SUCCESS",
    details: "Authenticated via Email + 2FA TOTP",
  },
  {
    id: "AUD-9902",
    timestamp: "2026-08-09T09:14:30.000Z",
    user: "Ananya Rao",
    device: "Chrome (MacBook Pro · 192.168.1.45)",
    category: "STRATEGY",
    action: "Strategy Promoted to Live",
    result: "SUCCESS",
    details: "Deployed EMA Crossover Pro (STR-001) with ₹2,000 risk cap",
    entityId: "STR-001",
  },
  {
    id: "AUD-9903",
    timestamp: "2026-08-09T09:30:00.000Z",
    user: "Ananya Rao",
    device: "Chrome (MacBook Pro · 192.168.1.45)",
    category: "BROKER",
    action: "Broker Connected",
    result: "SUCCESS",
    details: "Established session with Zerodha Kite API (OAuth token verified)",
  },
  {
    id: "AUD-9904",
    timestamp: "2026-08-09T09:41:22.000Z",
    user: "System / Strategy Engine",
    device: "Execution Worker Node #3",
    category: "ORDER",
    action: "Order Executed",
    result: "SUCCESS",
    details: "BUY 150 TATAMOTORS @ ₹954.20 via Supertrend Momentum",
    entityId: "ORD-55228",
  },
  {
    id: "AUD-9905",
    timestamp: "2026-08-09T10:15:00.000Z",
    user: "Risk Engine",
    device: "Automated Guardrail",
    category: "RISK",
    action: "Risk Check Evaluation",
    result: "BLOCKED",
    details: "Order for YESBANK (2,000 Qty) rejected: Exceeds max trade exposure limit of ₹50,000",
    entityId: "ORD-55225",
  },
];

class AuditLogService {
  private logs: AuditEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.logs = JSON.parse(stored);
          return;
        } catch {
          // Fallback to default
        }
      }
    }
    this.logs = [...DEFAULT_AUDIT_LOGS];
    this.save();
  }

  private save() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
      } catch (err) {
        console.warn("Failed to persist audit log:", err);
      }
    }
  }

  public record(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const newEntry: AuditEntry = {
      ...entry,
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(newEntry);
    this.save();
    return newEntry;
  }

  public getLogs(): AuditEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.save();
  }
}

export const auditLogService = new AuditLogService();
