/**
 * Database Persistence Layer for SmartQuant Edge.
 * Persistent storage backing for Users, Sessions, Watchlists, Strategies,
 * Orders, OrderEvents, Positions, PaperTrades, RiskSettings, AuditLogs, and Notifications.
 */

import { serverStore, type ServerDatabaseSchema } from "./server-store";

const STORAGE_PREFIX = "smartquant_db_v1_";

export class DatabasePersistence {
  public static getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") {
      // In server or test environments, retrieve from authoritative serverStore if mapped
      const mappedKey = key as keyof ServerDatabaseSchema;
      const serverVal = serverStore.getTable(mappedKey);
      if (
        serverVal !== undefined &&
        (Array.isArray(serverVal) ? serverVal.length > 0 : serverVal !== null)
      ) {
        return serverVal as unknown as T;
      }
      return defaultValue;
    }
    try {
      const val = localStorage.getItem(STORAGE_PREFIX + key);
      return val ? JSON.parse(val) : defaultValue;
    } catch (err) {
      console.warn(`[DB Persistence] Error reading ${key}:`, err);
      return defaultValue;
    }
  }

  public static setItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") {
      const mappedKey = key as keyof ServerDatabaseSchema;
      serverStore.setTable(mappedKey, value as never);
      return;
    }
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[DB Persistence] Error saving ${key}:`, err);
    }
  }

  public static removeItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (err) {
      console.warn(`[DB Persistence] Error removing ${key}:`, err);
    }
  }
}
