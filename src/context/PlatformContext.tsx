/**
 * Platform Context & State Manager for SmartQuant Edge.
 * Connects Auth, Kill Switch, Broker Auth, Market Data Engine, Paper Trading,
 * Risk Engine, Order Lifecycle Engine, System Health, Audit Logs, and Real-Time Event Bus.
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { realtimeBus, type RealtimeEvent } from "@/services/realtime-bus";
import { authService, type UserProfile, type UserSession } from "@/services/auth-service";
import { killSwitchEngine, type GlobalTradingState } from "@/services/kill-switch-engine";
import { brokerAdapter, type BrokerSession } from "@/services/broker-adapter";
import { riskEngine, type RiskLimits } from "@/services/risk-engine";
import { orderEngine, type DetailedOrder } from "@/services/order-engine";
import { auditLogService, type AuditEntry } from "@/services/audit-log-service";
import { systemHealthService, type ServiceHealth } from "@/services/system-health";
import { marketDataEngine } from "@/services/market-data-engine";
import { paperBroker, type PaperPortfolio, type PaperPosition } from "@/services/paper-broker";
import { type FeedStatus } from "@/services/market-data-types";
import { notifications as initialNotifications } from "@/data/market";
import { type Strategy } from "@/data/platform";
import { tradeExplainerService, type TradeExplainRecord } from "@/services/trade-explainer";
import { TradeExplainerModal } from "@/components/ui/TradeExplainerModal";

export type TradingMode = "BACKTESTING" | "PAPER_TRADING" | "LIVE_TRADING";

export interface AppNotification {
  id: string | number;
  title: string;
  body: string;
  time: string;
  tone: "bull" | "bear" | "info";
}

interface PlatformContextType {
  // Auth & Sessions
  isAuthenticated: boolean;
  user: UserProfile;
  activeSessions: UserSession[];
  refreshUser: () => void;
  logout: () => void;
  setAllowMultipleDevices: (allow: boolean) => void;
  setTwoFactorEnabled: (enabled: boolean) => void;
  revokeSession: (id: string) => void;
  revokeAllOtherSessions: () => void;
  submitKyc: (pan: string, aadhaar: string, doc?: string) => void;
  sessionRevokedModal: { open: boolean; reason?: string };
  closeSessionRevokedModal: () => void;

  // Trading Mode & Market Data Feed Status
  tradingMode: TradingMode;
  isLiveTrading: boolean;
  setTradingMode: (mode: TradingMode) => void;
  feedStatus: FeedStatus;
  switchMarketDataProvider: (provider: "dhan" | "groww") => Promise<void>;

  // Emergency Kill Switch
  globalTradingState: GlobalTradingState;
  haltInfo: ReturnType<typeof killSwitchEngine.getHaltInfo>;
  activateKillSwitch: (reason?: string) => void;
  resumeTrading: () => void;
  strategies: Strategy[];
  toggleStrategyStatus: (id: string, status: "LIVE" | "PAPER" | "DRAFT") => void;
  addStrategy: (strategy: Strategy) => void;
  updateStrategy: (strategy: Strategy) => void;
  deleteStrategy: (id: string) => void;
  duplicateStrategy: (id: string) => void;
  stopAllAlgorithms: () => void;
  cancelPendingOrders: () => number;
  exitAllPositions: () => number;

  // Broker Auth & Paper Engine
  brokerSession: BrokerSession;
  connectBroker: (
    brokerId: BrokerSession["brokerId"],
  ) => Promise<{ success: boolean; message: string }>;
  disconnectBroker: () => void;
  paperPortfolio: PaperPortfolio;
  paperPositions: PaperPosition[];

  // Orders & Risk
  orders: DetailedOrder[];
  submitOrder: (input: Parameters<typeof orderEngine.submitOrder>[0]) => Promise<DetailedOrder>;
  cancelOrder: (id: string) => void;
  riskLimits: RiskLimits;
  updateRiskLimits: (newLimits: Partial<RiskLimits>) => void;
  selectedOrderForModal: DetailedOrder | null;
  setSelectedOrderForModal: (order: DetailedOrder | null) => void;

  // Audit Logs & System Health
  auditLogs: AuditEntry[];
  systemHealth: ServiceHealth[];

  // Notifications
  notificationsList: AppNotification[];
  addNotification: (n: Omit<AppNotification, "id" | "time">) => void;

  // Explain This Trade
  explainModalRecord: TradeExplainRecord | null;
  openExplainModal: (recordOrId: string | TradeExplainRecord) => void;
  closeExplainModal: () => void;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [user, setUser] = useState<UserProfile>(authService.getUser());
  const [activeSessions, setActiveSessions] = useState<UserSession[]>(
    authService.getActiveSessions(),
  );
  const [tradingMode, setTradingMode] = useState<TradingMode>("PAPER_TRADING");
  const [globalState, setGlobalState] = useState<GlobalTradingState>(
    killSwitchEngine.getGlobalState(),
  );
  const [haltInfo, setHaltInfo] = useState(killSwitchEngine.getHaltInfo());
  const [strategiesList, setStrategiesList] = useState<Strategy[]>(
    killSwitchEngine.getStrategies(),
  );
  const [brokerSession, setBrokerSession] = useState<BrokerSession>(brokerAdapter.getSession());
  const [orders, setOrders] = useState<DetailedOrder[]>(orderEngine.getOrders());
  const [riskLimitsState, setRiskLimitsState] = useState<RiskLimits>(riskEngine.getLimits());
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(auditLogService.getLogs());
  const [systemHealth, setSystemHealth] = useState<ServiceHealth[]>(
    systemHealthService.getServices(),
  );
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<DetailedOrder | null>(null);
  const [notificationsList, setNotificationsList] =
    useState<AppNotification[]>(initialNotifications);

  const [feedStatus, setFeedStatus] = useState<FeedStatus>(marketDataEngine.getFeedStatus());
  const [paperPortfolio, setPaperPortfolio] = useState<PaperPortfolio>(paperBroker.getPortfolio());
  const [paperPositions, setPaperPositions] = useState<PaperPosition[]>(paperBroker.getPositions());

  const [sessionRevokedModal, setSessionRevokedModal] = useState<{
    open: boolean;
    reason?: string;
  }>({ open: false });
  const [explainModalRecord, setExplainModalRecord] = useState<TradeExplainRecord | null>(null);

  const openExplainModal = (recordOrId: string | TradeExplainRecord) => {
    if (typeof recordOrId === "string") {
      const found =
        tradeExplainerService.getRecord(recordOrId) || tradeExplainerService.getAllRecords()[0];
      setExplainModalRecord(found || null);
    } else {
      setExplainModalRecord(recordOrId);
    }
  };

  const closeExplainModal = () => setExplainModalRecord(null);

  // Sync state & subscribe to Real-Time Event Bus
  useEffect(() => {
    const unsub = realtimeBus.subscribe("*", (evt: RealtimeEvent) => {
      switch (evt.type) {
        case "MARKET_TICK":
          setFeedStatus(marketDataEngine.getFeedStatus());
          setPaperPositions(paperBroker.getPositions());
          setPaperPortfolio(paperBroker.getPortfolio());
          break;
        case "POSITION_UPDATED":
          setPaperPositions(paperBroker.getPositions());
          break;
        case "PORTFOLIO_UPDATED":
          setPaperPortfolio(paperBroker.getPortfolio());
          break;
        case "KILL_SWITCH_TRIGGERED":
        case "KILL_SWITCH_RESUMED":
          setGlobalState(killSwitchEngine.getGlobalState());
          setHaltInfo(killSwitchEngine.getHaltInfo());
          setStrategiesList(killSwitchEngine.getStrategies());
          setAuditLogs(auditLogService.getLogs());
          break;
        case "STRATEGY_STATUS_CHANGED":
          setStrategiesList(killSwitchEngine.getStrategies());
          setAuditLogs(auditLogService.getLogs());
          break;
        case "BROKER_STATUS_CHANGED":
          setBrokerSession(brokerAdapter.getSession());
          setAuditLogs(auditLogService.getLogs());
          break;
        case "ORDER_UPDATED":
        case "ORDER_EXECUTED":
          setOrders(orderEngine.getOrders());
          setPaperPositions(paperBroker.getPositions());
          setPaperPortfolio(paperBroker.getPortfolio());
          setAuditLogs(auditLogService.getLogs());
          break;
        case "SESSION_REVOKED": {
          setActiveSessions(authService.getActiveSessions());
          setIsAuthenticated(authService.isAuthenticated());
          const payload = evt.payload as { targetSessionId?: string; reason?: string } | undefined;
          if (
            payload?.targetSessionId === "ALL" ||
            payload?.targetSessionId === authService.getCurrentSessionId()
          ) {
            setSessionRevokedModal({
              open: true,
              reason:
                payload?.reason ||
                "Your session has ended or your account was signed in on another device.",
            });
          }
          break;
        }
        case "NOTIFICATION_ADDED": {
          const payload = evt.payload as
            { title?: string; body?: string; tone?: "bull" | "info" | "bear" } | undefined;
          const validTone: "bull" | "info" | "bear" =
            payload?.tone === "bull" || payload?.tone === "bear" ? payload.tone : "info";
          setNotificationsList((prev) => [
            {
              id: Date.now(),
              title: payload?.title || "Notification",
              body: payload?.body || "",
              time: "Just now",
              tone: validTone,
            },
            ...prev,
          ]);
          break;
        }
        case "SYSTEM_HEALTH_CHANGED":
          setSystemHealth(systemHealthService.getServices());
          setFeedStatus(marketDataEngine.getFeedStatus());
          break;
      }
    });

    // Periodic feed status refresh
    const timer = setInterval(() => {
      setFeedStatus(marketDataEngine.getFeedStatus());
    }, 2000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const refreshUser = () => {
    setUser(authService.getUser());
    setActiveSessions(authService.getActiveSessions());
    setIsAuthenticated(authService.isAuthenticated());
  };

  const handleLogout = () => {
    authService.logout();
    refreshUser();
  };

  const handleSwitchMarketDataProvider = async (provider: "dhan" | "groww") => {
    await marketDataEngine.switchProvider(provider);
    setFeedStatus(marketDataEngine.getFeedStatus());
  };

  const handleSetAllowMultipleDevices = (allow: boolean) => {
    const next = authService.setAllowMultipleDevices(allow);
    setUser(next);
    setActiveSessions(authService.getActiveSessions());
  };

  const handleSetTwoFactorEnabled = (enabled: boolean) => {
    const next = authService.setTwoFactorEnabled(enabled);
    setUser(next);
  };

  const handleRevokeSession = (id: string) => {
    authService.revokeSession(id);
    setActiveSessions(authService.getActiveSessions());
  };

  const handleRevokeAllOtherSessions = () => {
    authService.revokeAllOtherSessions();
    setActiveSessions(authService.getActiveSessions());
  };

  const handleSubmitKyc = (pan: string, aadhaar: string, doc?: string) => {
    const next = authService.submitKyc(pan, aadhaar, doc);
    setUser(next);
  };

  const handleActivateKillSwitch = (reason?: string) => {
    killSwitchEngine.activateKillSwitch(reason);
    setGlobalState(killSwitchEngine.getGlobalState());
    setHaltInfo(killSwitchEngine.getHaltInfo());
    setStrategiesList(killSwitchEngine.getStrategies());
    setAuditLogs(auditLogService.getLogs());
  };

  const handleResumeTrading = () => {
    killSwitchEngine.resumeTrading();
    setGlobalState(killSwitchEngine.getGlobalState());
    setHaltInfo(killSwitchEngine.getHaltInfo());
    setAuditLogs(auditLogService.getLogs());
  };

  const handleToggleStrategyStatus = (id: string, status: "LIVE" | "PAPER" | "DRAFT") => {
    const next = killSwitchEngine.toggleStrategyStatus(id, status);
    setStrategiesList(next);
    setAuditLogs(auditLogService.getLogs());
  };

  const handleAddStrategy = (strategy: Strategy) => {
    const list = killSwitchEngine.addStrategy(strategy);
    setStrategiesList(list);
    setAuditLogs(auditLogService.getLogs());
  };

  const handleUpdateStrategy = (strategy: Strategy) => {
    const list = killSwitchEngine.updateStrategy(strategy);
    setStrategiesList(list);
    setAuditLogs(auditLogService.getLogs());
  };

  const handleDeleteStrategy = (id: string) => {
    const list = killSwitchEngine.deleteStrategy(id);
    setStrategiesList(list);
    setAuditLogs(auditLogService.getLogs());
  };

  const handleDuplicateStrategy = (id: string) => {
    const list = killSwitchEngine.duplicateStrategy(id);
    setStrategiesList(list);
    setAuditLogs(auditLogService.getLogs());
  };

  const handleStopAllAlgorithms = () => {
    killSwitchEngine.stopAllAlgorithms();
    setStrategiesList(killSwitchEngine.getStrategies());
  };

  const handleCancelPendingOrders = () => {
    const count = killSwitchEngine.cancelPendingOrders();
    setOrders(orderEngine.getOrders());
    return count;
  };

  const handleExitAllPositions = () => {
    const count = killSwitchEngine.exitAllPositions();
    setAuditLogs(auditLogService.getLogs());
    return count;
  };

  const handleConnectBroker = async (brokerId: BrokerSession["brokerId"]) => {
    const res = await brokerAdapter.connectBroker(brokerId);
    setBrokerSession(brokerAdapter.getSession());
    return res;
  };

  const handleDisconnectBroker = () => {
    brokerAdapter.disconnectBroker();
    setBrokerSession(brokerAdapter.getSession());
  };

  const handleSubmitOrder = async (input: Parameters<typeof orderEngine.submitOrder>[0]) => {
    const ord = await orderEngine.submitOrder(input);
    setOrders(orderEngine.getOrders());
    setPaperPositions(paperBroker.getPositions());
    setPaperPortfolio(paperBroker.getPortfolio());
    setRiskLimitsState(riskEngine.getLimits());
    setAuditLogs(auditLogService.getLogs());
    return ord;
  };

  const handleCancelOrder = (id: string) => {
    orderEngine.cancelOrder(id);
    setOrders(orderEngine.getOrders());
    setAuditLogs(auditLogService.getLogs());
  };

  const handleUpdateRiskLimits = (newLimits: Partial<RiskLimits>) => {
    const updated = riskEngine.updateLimits(newLimits);
    setRiskLimitsState(updated);
    setAuditLogs(auditLogService.getLogs());
  };

  const addNotification = (n: Omit<AppNotification, "id" | "time">) => {
    setNotificationsList((prev) => [
      {
        id: Date.now(),
        title: n.title,
        body: n.body,
        time: "Just now",
        tone: n.tone,
      },
      ...prev,
    ]);
  };

  return (
    <PlatformContext.Provider
      value={{
        isAuthenticated,
        user,
        activeSessions,
        refreshUser,
        logout: handleLogout,
        setAllowMultipleDevices: handleSetAllowMultipleDevices,
        setTwoFactorEnabled: handleSetTwoFactorEnabled,
        revokeSession: handleRevokeSession,
        revokeAllOtherSessions: handleRevokeAllOtherSessions,
        submitKyc: handleSubmitKyc,
        sessionRevokedModal,
        closeSessionRevokedModal: () => setSessionRevokedModal({ open: false }),

        tradingMode,
        isLiveTrading: tradingMode === "LIVE_TRADING",
        setTradingMode,
        feedStatus,
        switchMarketDataProvider: handleSwitchMarketDataProvider,

        globalTradingState: globalState,
        haltInfo,
        activateKillSwitch: handleActivateKillSwitch,
        resumeTrading: handleResumeTrading,
        strategies: strategiesList,
        toggleStrategyStatus: handleToggleStrategyStatus,
        addStrategy: handleAddStrategy,
        updateStrategy: handleUpdateStrategy,
        deleteStrategy: handleDeleteStrategy,
        duplicateStrategy: handleDuplicateStrategy,
        stopAllAlgorithms: handleStopAllAlgorithms,
        cancelPendingOrders: handleCancelPendingOrders,
        exitAllPositions: handleExitAllPositions,

        brokerSession,
        connectBroker: handleConnectBroker,
        disconnectBroker: handleDisconnectBroker,
        paperPortfolio,
        paperPositions,

        orders,
        submitOrder: handleSubmitOrder,
        cancelOrder: handleCancelOrder,
        riskLimits: riskLimitsState,
        updateRiskLimits: handleUpdateRiskLimits,
        selectedOrderForModal,
        setSelectedOrderForModal,
        auditLogs,
        systemHealth,

        notificationsList,
        addNotification,

        explainModalRecord,
        openExplainModal,
        closeExplainModal,
      }}
    >
      {children}
      <TradeExplainerModal
        record={explainModalRecord}
        open={!!explainModalRecord}
        onOpenChange={(open) => !open && closeExplainModal()}
      />
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    // Return safe fallback for components rendered in standalone error boundaries or early auth routes
    return {} as unknown as PlatformContextType;
  }
  return ctx;
}
