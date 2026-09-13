import { useState, useEffect, type ReactNode } from "react";
import { Link, useRouterState, type LinkProps, useNavigate } from "@tanstack/react-router";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Activity,
  BarChart3,
  Bell,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  Menu,
  Radar,
  Settings2,
  ShieldCheck,
  Blocks,
  Wallet,
  X,
  LogOut,
  AlertTriangle,
  Power,
  CheckCircle2,
  RefreshCw,
  Key,
  ShieldAlert,
  Zap,
  Building2,
  Shield,
  Layers,
  BookOpen,
  User,
  Copy,
  Check,
  TrendingUp,
  LifeBuoy,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlatform, type TradingMode } from "@/context/PlatformContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { indices } from "@/data/market";
import { marketDataEngine } from "@/services/market-data-engine";
import { CommandPalette } from "@/components/trading/CommandPalette";

interface NavItem {
  label: string;
  to: string;
  search?: Record<string, string>;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

/** Institutional Trading Platform 6-Desk Navigation */
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Market",
    items: [
      { label: "Dashboard", to: "/app", exact: true, icon: LayoutDashboard },
      { label: "Watchlist", to: "/app/watchlist", icon: Radar },
      { label: "Market Scanner", to: "/app/scanner", icon: Layers },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Strategies", to: "/app/strategies", exact: true, icon: Blocks },
      { label: "Backtesting", to: "/app/backtest", icon: BarChart3 },
      { label: "Quant Insights", to: "/app/insights", icon: BrainCircuit },
    ],
  },
  {
    label: "Trading",
    items: [
      { label: "Live Terminal", to: "/app/live", icon: Activity },
      { label: "Orders", to: "/app/execution-reports", icon: FileText },
      { label: "Positions", to: "/app/positions", icon: Wallet },
      { label: "Portfolio", to: "/app/portfolio", exact: true, icon: Building2 },
    ],
  },
  {
    label: "Risk",
    items: [
      { label: "Risk Command Center", to: "/app/admin", exact: true, icon: ShieldAlert },
      {
        label: "Exposure Analytics",
        to: "/app/exposure",
        icon: ShieldCheck,
      },
      { label: "Kill Switch", to: "/app/kill-switch", icon: Power },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        label: "Performance",
        to: "/app/performance",
        icon: TrendingUp,
      },
      { label: "Trade Journal", to: "/app/trade-journal", icon: BookOpen },
      { label: "Execution Reports", to: "/app/execution-reports", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Alerts Center", to: "/app/alerts", icon: Bell },
      { label: "Account & Security", to: "/app/profile", icon: ShieldCheck },
      { label: "Support", to: "/app/support", icon: LifeBuoy },
    ],
  },
];

function SidebarNav({
  onNavigate,
  isCollapsed = false,
}: {
  onNavigate?: () => void;
  isCollapsed?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchParams = useRouterState({
    select: (s) => s.location.search as Record<string, string>,
  });
  const { user, globalTradingState } = usePlatform();
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (user.userId) {
      navigator.clipboard.writeText(user.userId);
      setCopied(true);
      toast.success("User ID copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          "border-b border-sidebar-border py-4 transition-all flex items-center",
          isCollapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <Logo to="/app" compact={isCollapsed} />
      </div>

      {globalTradingState === "HALTED" &&
        (isCollapsed ? (
          <div className="mx-auto mt-3" title="Kill Switch Active: All algo execution stopped">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-bear/40 bg-bear/10 text-bear animate-pulse">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        ) : (
          <div className="mx-3 mt-3 rounded-lg border border-bear/40 bg-bear/10 p-2.5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-bear">
              <AlertTriangle className="h-3.5 w-3.5" /> Kill Switch Active
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">All algo execution stopped</p>
          </div>
        ))}

      <nav className={cn("flex-1 space-y-3 overflow-y-auto py-3", isCollapsed ? "px-1.5" : "px-3")}>
        {navGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed ? (
              <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>
            ) : (
              <div className="my-1.5 mx-2 border-t border-sidebar-border/40" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const href = String(item.to);
                const isPathMatch = item.exact ? pathname === href : pathname.startsWith(href);
                const isSearchMatch = item.search?.tab
                  ? searchParams?.tab === item.search.tab
                  : true;
                const active = isPathMatch && isSearchMatch;

                const linkElement = (
                  <Link
                    to={item.to}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    search={item.search as any}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center rounded-lg text-xs transition-colors font-medium cursor-pointer",
                      isCollapsed ? "h-9 w-9 justify-center mx-auto" : "gap-2.5 px-3 py-1.5",
                      active
                        ? "bg-primary/15 text-primary font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                    aria-label={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );

                return (
                  <li key={`${group.label}-${item.label}`}>
                    {isCollapsed ? (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="bg-popover text-popover-foreground border border-border text-xs py-1 px-2.5 shadow-md"
                          >
                            <span className="font-semibold text-foreground">{item.label}</span>
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              ({group.label})
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      linkElement
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Info & SmartQuant User ID */}
      <div
        className={cn(
          "border-t border-sidebar-border",
          isCollapsed ? "p-2 flex justify-center" : "p-3 space-y-2",
        )}
      >
        {isCollapsed ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopyId}
                  className="h-9 w-9 rounded-lg border border-sidebar-border bg-surface/60 flex items-center justify-center text-xs font-bold text-primary hover:bg-surface-2 transition-colors cursor-pointer"
                  aria-label={`User ID: ${user.userId || "SQE-7F42K9"}`}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-bull" />
                  ) : user.name ? (
                    user.name.slice(0, 2).toUpperCase()
                  ) : (
                    "SQ"
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-popover text-popover-foreground border border-border text-xs py-1.5 px-2.5 shadow-md"
              >
                <p className="font-bold text-foreground">{user.name}</p>
                <p className="font-mono text-[11px] text-primary">{user.userId || "SQE-7F42K9"}</p>
                <p className="text-[10px] text-muted-foreground">{user.plan} · Click to copy ID</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="rounded-lg border border-sidebar-border bg-surface/50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                User ID
              </span>
              <button
                onClick={handleCopyId}
                className="text-[10px] font-medium text-primary hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="h-3 w-3 text-bull" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="num text-xs font-bold text-foreground mt-0.5">
              {user.userId || "SQE-7F42K9"}
            </p>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-sidebar-border/50">
              <span className="truncate">{user.name}</span>
              <span className="rounded bg-primary/10 px-1 py-0.2 text-[9px] font-bold text-primary">
                {user.plan}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ALL" | "TRADING" | "RISK" | "SECURITY">("ALL");
  const { notificationsList } = usePlatform();

  const filtered = notificationsList.filter((n) => {
    if (tab === "TRADING")
      return n.tone === "bull" || n.title.includes("BUY") || n.title.includes("SELL");
    if (tab === "RISK")
      return n.tone === "bear" || n.title.includes("Stop-loss") || n.title.includes("Kill");
    if (tab === "SECURITY") return n.title.includes("Session") || n.title.includes("Token");
    return true;
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
        {notificationsList.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-bear" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-surface p-2 shadow-xl max-h-96 overflow-y-auto text-xs"
            >
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
                <span className="font-bold text-foreground">Notifications</span>
                <span className="text-[10px] text-muted-foreground">
                  {notificationsList.length} total
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 py-1 px-1 border-b border-border/30 text-[10px]">
                {(["ALL", "TRADING", "RISK", "SECURITY"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-2 py-0.5 rounded font-semibold transition-colors",
                      tab === t
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No notifications in this category
                  </p>
                ) : (
                  filtered.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-lg px-2.5 py-2 hover:bg-surface-2 border-b border-border/40 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            n.tone === "bull"
                              ? "bg-bull"
                              : n.tone === "bear"
                                ? "bg-bear"
                                : "bg-info",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">{n.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{n.body}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Emergency Kill Switch Dialog & Button */
function EmergencyKillSwitchControl() {
  const {
    globalTradingState,
    activateKillSwitch,
    resumeTrading,
    stopAllAlgorithms,
    cancelPendingOrders,
    exitAllPositions,
  } = usePlatform();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<"HALT_ALL" | "CANCEL_PENDING" | "EXIT_POSITIONS">(
    "HALT_ALL",
  );

  const handleExecute = () => {
    if (actionType === "HALT_ALL") {
      activateKillSwitch("Emergency kill switch engaged by trader");
      toast.error("KILL SWITCH ACTIVE — All algorithmic execution halted");
    } else if (actionType === "CANCEL_PENDING") {
      cancelPendingOrders();
      toast.info("All open pending orders cancelled");
    } else if (actionType === "EXIT_POSITIONS") {
      exitAllPositions();
      toast.warning("Liquidated all simulated paper positions at current market prices");
    }
    setConfirmOpen(false);
  };

  return (
    <>
      {globalTradingState === "HALTED" ? (
        <Button
          size="sm"
          onClick={resumeTrading}
          className="h-8 gap-1.5 bg-bull text-bull-foreground hover:bg-bull/90 text-xs font-semibold"
        >
          <RefreshCw className="h-3 w-3" /> Resume Trading
        </Button>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            setActionType("HALT_ALL");
            setConfirmOpen(true);
          }}
          className="h-8 gap-1.5 text-xs font-semibold"
        >
          <Power className="h-3 w-3" /> Kill Switch
        </Button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-bear">
              <ShieldAlert className="h-5 w-5 text-bear" /> Emergency Kill Switch Action
            </DialogTitle>
            <DialogDescription>
              Select an authoritative risk control action to execute immediately across all
              execution engines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setActionType("HALT_ALL")}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  actionType === "HALT_ALL"
                    ? "border-bear bg-bear/10"
                    : "border-border bg-surface-2/50 hover:bg-surface-2",
                )}
              >
                <Power className="mt-0.5 h-4 w-4 text-bear shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">STOP ALGORITHMS (GLOBAL HALT)</p>
                  <p className="text-[11px] text-muted-foreground">
                    Pauses all automated strategy execution and blocks new order submissions
                    immediately.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActionType("CANCEL_PENDING")}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  actionType === "CANCEL_PENDING"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border bg-surface-2/50 hover:bg-surface-2",
                )}
              >
                <X className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">CANCEL PENDING ORDERS</p>
                  <p className="text-[11px] text-muted-foreground">
                    Cancels all unfilled LIMIT and SL-M orders currently pending in the order book.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActionType("EXIT_POSITIONS")}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  actionType === "EXIT_POSITIONS"
                    ? "border-bear bg-bear/10"
                    : "border-border bg-surface-2/50 hover:bg-surface-2",
                )}
              >
                <LogOut className="mt-0.5 h-4 w-4 text-bear shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    EXIT ALL POSITIONS (LIQUIDATE)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Simulates market exits for all open paper positions at prevailing market prices.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Dismiss
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecute}>
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Strict Market Data Provenance Badge */
function FeedStatusControl() {
  const { feedStatus, switchMarketDataProvider } = usePlatform();
  const [open, setOpen] = useState(false);

  const timeStr = feedStatus.lastTickTimestamp
    ? new Date(feedStatus.lastTickTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";
  const state = feedStatus.connectionState;
  const isStale = feedStatus.isStale || state === "STALE";

  let label = "DATA UNAVAILABLE";
  let badgeColor = "border-border bg-surface-2 text-muted-foreground";
  let dotColor = "bg-muted-foreground";

  if (isStale) {
    label = `STALE DATA (${timeStr})`;
    badgeColor = "border-amber-500/40 bg-amber-500/10 text-amber-500";
    dotColor = "bg-amber-500 animate-pulse";
  } else if (state === "LIVE") {
    label = `LIVE (${timeStr} IST)`;
    badgeColor = "border-bull/40 bg-bull/10 text-bull";
    dotColor = "bg-bull animate-pulse-dot";
  } else if (state === "MARKET_CLOSED") {
    label = "MARKET CLOSED";
    badgeColor = "border-border bg-surface-2 text-muted-foreground";
    dotColor = "bg-muted-foreground";
  } else if (state === "WAITING_FOR_DATA") {
    label = "WAITING FOR DATA";
    badgeColor = "border-info/40 bg-info/10 text-info";
    dotColor = "bg-info animate-pulse";
  } else if (state === "CONNECTING" || state === "CONNECTED") {
    label = state === "CONNECTING" ? "CONNECTING..." : "CONNECTED";
    badgeColor = "border-info/40 bg-info/10 text-info";
    dotColor = "bg-info animate-pulse";
  } else if (state === "AUTH_ERROR") {
    label = "AUTH ERROR";
    badgeColor = "border-bear/40 bg-bear/10 text-bear";
    dotColor = "bg-bear animate-pulse";
  } else if (state === "CONFIG_ERROR") {
    label = "CONFIG ERROR";
    badgeColor = "border-bear/40 bg-bear/10 text-bear";
    dotColor = "bg-bear animate-pulse";
  } else if (state === "DISCONNECTED") {
    label = "DISCONNECTED";
    badgeColor = "border-bear/40 bg-bear/10 text-bear";
    dotColor = "bg-bear";
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium sm:flex transition-colors num",
          badgeColor,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Market Data Gateway Provenance
            </DialogTitle>
            <DialogDescription>
              Institutional market data feed state, provider selection, and Indian exchange session
              status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs num">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-2/80">
              <span className="text-muted-foreground font-semibold">Active Feed Gateway:</span>
              <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => switchMarketDataProvider("groww")}
                  className={cn(
                    "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer",
                    feedStatus.provider === "groww"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Groww API
                </button>
                <button
                  type="button"
                  onClick={() => switchMarketDataProvider("dhan")}
                  className={cn(
                    "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer",
                    feedStatus.provider === "dhan"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  DhanHQ Feed
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Provider:</span>
                <span className="text-foreground font-bold">{feedStatus.providerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Feed State:</span>
                <span
                  className={state === "LIVE" ? "text-bull font-bold" : "text-amber-500 font-bold"}
                >
                  {state}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Clock (IST):</span>
                <span className="text-foreground">{feedStatus.marketSession}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stale Threshold:</span>
                <span className="text-foreground">{feedStatus.staleThresholdSec}s</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {feedStatus.provenanceText}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Center Market Strip showing NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT, NIFTY FIN SERVICE, USD/INR */
const MARKET_STRIP_ITEMS = [
  {
    name: "NIFTY 50",
    symbol: "NIFTY 50",
    defaultVal: 24812.35,
    defaultChg: 186.4,
    defaultPct: 0.76,
  },
  { name: "SENSEX", symbol: "SENSEX", defaultVal: 81428.9, defaultChg: 542.1, defaultPct: 0.67 },
  {
    name: "BANK NIFTY",
    symbol: "BANK NIFTY",
    defaultVal: 53104.2,
    defaultChg: -128.6,
    defaultPct: -0.24,
  },
  { name: "NIFTY IT", symbol: "TCS", defaultVal: 41850.5, defaultChg: 310.2, defaultPct: 0.75 },
  {
    name: "NIFTY FIN",
    symbol: "HDFCBANK",
    defaultVal: 23640.8,
    defaultChg: 88.4,
    defaultPct: 0.38,
  },
  { name: "USD/INR", symbol: "USDINR", defaultVal: 83.92, defaultChg: -0.04, defaultPct: -0.05 },
];

function CenterMarketTicker() {
  const { feedStatus } = usePlatform();
  const isOffline =
    feedStatus.connectionState === "DISCONNECTED" ||
    feedStatus.connectionState === "CONFIG_ERROR" ||
    feedStatus.connectionState === "AUTH_ERROR";

  return (
    <div className="hidden xl:flex items-center gap-2 num text-xs overflow-x-auto max-w-2xl py-0.5 no-scrollbar">
      {MARKET_STRIP_ITEMS.map((item) => {
        const liveTick =
          marketDataEngine.getLatestTick(item.name) || marketDataEngine.getLatestTick(item.symbol);
        const hasLivePrice =
          !!liveTick || (!isOffline && feedStatus.connectionState !== "WAITING_FOR_DATA");
        const price = liveTick ? liveTick.price : item.defaultVal;
        const change = liveTick ? liveTick.change : item.defaultChg;
        const changePct = liveTick ? liveTick.changePct : item.defaultPct;
        const isUp = change >= 0;

        return (
          <div
            key={item.name}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/50 bg-surface/40 shrink-0 text-[11px]"
          >
            <span className="font-semibold text-muted-foreground">{item.name}</span>
            {isOffline ? (
              <span className="text-[10px] text-amber-500 font-mono">DATA UNAVAILABLE</span>
            ) : (
              <>
                <span className="font-bold text-foreground">
                  {item.name === "USD/INR"
                    ? `₹${price.toFixed(2)}`
                    : `₹${price.toLocaleString("en-IN")}`}
                </span>
                <span className={cn("text-[10px] font-semibold", isUp ? "text-bull" : "text-bear")}>
                  {isUp ? "+" : ""}
                  {changePct.toFixed(2)}%
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Map pathname to professional page title */
function getPageTitle(pathname: string): string {
  if (pathname === "/app") return "Market Dashboard Overview";
  if (pathname === "/app/watchlist") return "Market Watch & Real-Time Monitoring";
  if (pathname === "/app/scanner") return "Real-Time Market Scanner";
  if (pathname === "/app/strategies") return "Quantitative Strategies Management";
  if (pathname === "/app/backtest") return "Quantitative Backtesting Engine";
  if (pathname === "/app/insights") return "Quantitative Market Insights";
  if (pathname === "/app/live") return "Live Execution Terminal";
  if (pathname === "/app/positions") return "Positions & Mark-to-Market Terminal";
  if (pathname === "/app/portfolio") return "Portfolio Workstation";
  if (pathname === "/app/admin") return "Risk Command Center";
  if (pathname === "/app/exposure") return "Exposure Analytics Desk";
  if (pathname === "/app/kill-switch") return "Emergency Kill Switch Safety Control";
  if (pathname === "/app/performance") return "Performance Analytics Workstation";
  if (pathname === "/app/trade-journal") return "Trade Journal & Verification";
  if (pathname === "/app/execution-reports") return "Execution Reports & Fills Audit";
  if (pathname === "/app/alerts") return "Alerts & Surveillance Center";
  if (pathname === "/app/profile") return "Account & Security Center";
  if (pathname === "/app/support") return "Platform Support";
  return "SmartQuant Edge";
}

/** Institutional Profile Dropdown Menu */
function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const { user, logout } = usePlatform();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info("Signed out of SmartQuant Edge");
    navigate({ to: "/login" });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account and security menu"
        className="flex items-center gap-2 rounded-lg border border-border px-2 py-1 hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <span className="grid h-6 w-6 place-items-center rounded bg-primary/20 text-[10px] font-bold text-primary">
          {user.name ? user.name.slice(0, 2).toUpperCase() : "SQ"}
        </span>
        <span className="hidden xl:inline text-xs font-mono font-medium text-foreground">
          {user.userId || "SQE-7F42K9"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-xl text-xs"
            >
              {/* Account Header */}
              <div className="px-3 py-2.5 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-foreground truncate">{user.name}</p>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    {user.role} · {user.plan}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{user.userId}</p>
              </div>

              {/* Navigation Items */}
              <div className="py-1 space-y-0.5">
                <Link
                  to="/app/profile"
                  search={{ tab: "overview" }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors font-medium"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Profile & Security</span>
                </Link>
                <Link
                  to="/app/profile"
                  search={{ tab: "sessions" }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors font-medium"
                >
                  <Key className="h-3.5 w-3.5 text-primary" />
                  <span>Sessions & Devices</span>
                </Link>
                <Link
                  to="/app/profile"
                  search={{ tab: "activity" }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors font-medium"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Security Activity</span>
                </Link>
                <Link
                  to="/app/support"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors font-medium"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Support</span>
                </Link>
              </div>

              {/* Logout Action */}
              <div className="pt-1 border-t border-border/50">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-bear hover:bg-bear/10 transition-colors font-medium text-left cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sq_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sq_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = usePlatform();
  const navigate = useNavigate();

  const title = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Desktop Sidebar (Collapsible Rail) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out lg:block",
          isCollapsed ? "w-14" : "w-60",
        )}
      >
        <SidebarNav isCollapsed={isCollapsed} />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarNav onNavigate={() => setMobileOpen(false)} isCollapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar matching Section 9 */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-6">
            {/* LEFT: Hamburger Toggle & Page Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setMobileOpen(true);
                  } else {
                    toggleSidebar();
                  }
                }}
                aria-label={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
                title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-surface-2 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-4 w-4" />
              </button>
              <h1 className="text-sm font-bold text-foreground truncate tracking-tight">{title}</h1>
            </div>

            {/* CENTER: Indian Market Strip (NIFTY 50, SENSEX, BANK NIFTY, NIFTY IT, NIFTY FIN, USD/INR) */}
            <CenterMarketTicker />

            {/* RIGHT: Search Trigger, Feed Status, Kill Switch, Notifications, Profile */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors cursor-pointer"
              >
                <span className="hidden md:inline text-[11px]">Search (Ctrl+K)</span>
                <kbd className="rounded bg-surface-3 px-1 py-0.2 text-[9px] font-mono border border-border/80">
                  ⌘K
                </kbd>
              </button>

              <FeedStatusControl />
              <EmergencyKillSwitchControl />
              <NotificationBell />

              {/* Institutional Profile Dropdown Menu */}
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <motion.main
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-6 lg:py-7"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
