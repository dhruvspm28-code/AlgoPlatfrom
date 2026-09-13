/**
 * Alerts Center Workstation for SmartQuant Edge.
 * Real-time institutional surveillance for market prices, technical indicators,
 * strategy triggers, risk violations, order lifecycles, and feed health events.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Bell,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Power,
  Zap,
  TrendingUp,
  Activity,
  Trash2,
  Check,
  Sliders,
  X,
  Clock,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader, StatCard, inr } from "@/components/ui-kit/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlatform } from "@/context/PlatformContext";
import { CENTRAL_DEMO_DATA, AlertRuleItem } from "@/data/central-trading-dataset";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts Center — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Institutional surveillance center monitoring price breaks, indicator triggers, pre-trade risk thresholds, and algorithmic execution events.",
      },
    ],
  }),
  component: AlertsCenterPage,
});

function AlertsCenterPage() {
  const { isLiveTrading } = usePlatform();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "TRIGGERED" | "HISTORY" | "RULES">(
    "ACTIVE",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Alerts State
  const [alerts, setAlerts] = useState<AlertRuleItem[]>(CENTRAL_DEMO_DATA.alertRules);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Alert Form State
  const [newAlert, setNewAlert] = useState<{
    type: AlertRuleItem["type"];
    symbol: string;
    condition: string;
    threshold: string;
    severity: AlertRuleItem["severity"];
    enabled: boolean;
  }>({
    type: "PRICE",
    symbol: "RELIANCE",
    condition: "LTP >= Threshold",
    threshold: "3000.00",
    severity: "WARNING",
    enabled: true,
  });

  const isDemo = !isLiveTrading;

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // Tab filter
      if (activeTab === "ACTIVE" && a.status !== "ENABLED") return false;
      if (activeTab === "TRIGGERED" && a.status !== "TRIGGERED") return false;
      if (activeTab === "HISTORY" && a.status !== "TRIGGERED") return false;

      // Severity
      if (severityFilter !== "ALL" && a.severity !== severityFilter) return false;

      // Type
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;

      // Search
      const matchSearch =
        a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.trigger.toLowerCase().includes(searchQuery.toLowerCase());

      return matchSearch;
    });
  }, [alerts, activeTab, severityFilter, typeFilter, searchQuery]);

  // Top Metrics
  const metrics = useMemo(() => {
    const active = alerts.filter((a) => a.status === "ENABLED").length;
    const triggered = alerts.filter((a) => a.status === "TRIGGERED").length;
    const unread = 2;
    const critical = alerts.filter((a) => a.severity === "CRITICAL").length;

    return { active, triggered, unread, critical };
  }, [alerts]);

  // Actions
  const handleToggleStatus = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === "ENABLED" ? "DISABLED" : "ENABLED" } : a,
      ),
    );
    toast.success("Alert rule status updated");
  };

  const handleDelete = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Alert deleted");
  };

  const handleMarkRead = (id: string) => {
    toast.success("Marked as read");
  };

  const handleCreateAlert = () => {
    const created: AlertRuleItem = {
      id: `ALT-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString(),
      severity: newAlert.severity,
      type: newAlert.type,
      symbol: newAlert.symbol,
      trigger: `${newAlert.symbol} ${newAlert.condition}`,
      currentVal: "Evaluating",
      threshold: newAlert.threshold,
      status: newAlert.enabled ? "ENABLED" : "DISABLED",
    };

    setAlerts((prev) => [created, ...prev]);
    setIsCreateModalOpen(false);
    toast.success("New alert surveillance rule created", {
      description: `${created.symbol} ${created.type} alert armed`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-amber-400" />
              Alerts Center
            </h1>
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs px-2.5 py-0.5 border",
                isDemo
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
              )}
            >
              {isDemo ? "PAPER SURVEILLANCE" : "LIVE FEED ACTIVE"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor market prices, strategy signals, risk boundaries, and execution events
          </p>
        </div>

        {/* Create Alert Action */}
        <div className="flex items-center gap-2">
          {isDemo && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/40 border border-border text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-amber-400" />
              <span>Simulated Event Bus</span>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs h-9 gap-1.5 font-semibold bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Alert
          </Button>
        </div>
      </div>

      {/* 2. TOP METRICS STRIP (4 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="ACTIVE ALERTS"
          value={metrics.active.toString()}
          subtext="Armed surveillance"
          variant="primary"
        />
        <StatCard
          label="TRIGGERED TODAY"
          value={metrics.triggered.toString()}
          subtext="Recent activations"
          variant="warning"
        />
        <StatCard
          label="UNREAD NOTIFICATIONS"
          value={metrics.unread.toString()}
          subtext="Pending review"
        />
        <StatCard
          label="CRITICAL THRESHOLDS"
          value={metrics.critical.toString()}
          subtext="High-priority guardrails"
          variant={metrics.critical > 0 ? "danger" : "default"}
        />
      </div>

      {/* 3. TABS & FILTER BAR */}
      <GlassCard className="p-4 space-y-3 bg-card/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center rounded-lg bg-secondary/50 p-1 border border-border/40">
            {(["ACTIVE", "TRIGGERED", "HISTORY", "RULES"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  activeTab === tab
                    ? "bg-card text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === "ACTIVE"
                  ? `Active (${alerts.filter((a) => a.status === "ENABLED").length})`
                  : tab === "TRIGGERED"
                    ? `Triggered (${alerts.filter((a) => a.status === "TRIGGERED").length})`
                    : tab}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search alerts by symbol, trigger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none text-foreground"
            >
              <option value="ALL">All Types</option>
              <option value="PRICE">Price</option>
              <option value="INDICATOR">Indicator</option>
              <option value="STRATEGY">Strategy</option>
              <option value="RISK">Risk</option>
              <option value="ORDER">Order</option>
              <option value="FEED HEALTH">Feed Health</option>
              <option value="KILL SWITCH">Kill Switch</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* 4. MAIN ALERTS TABLE */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border/40">
              <tr>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Symbol</th>
                <th className="py-3 px-3">Trigger Condition</th>
                <th className="py-3 px-3 text-right">Current Value</th>
                <th className="py-3 px-3 text-right">Threshold</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground font-sans">
                    No alerts match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((a) => {
                  const isCritical = a.severity === "CRITICAL";
                  const isWarning = a.severity === "WARNING";
                  const isTriggered = a.status === "TRIGGERED";

                  return (
                    <tr key={a.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-3 text-muted-foreground">{a.time}</td>
                      <td className="py-3 px-3 font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-bold",
                            isCritical
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : isWarning
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/30",
                          )}
                        >
                          {a.severity}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-foreground">{a.type}</td>
                      <td className="py-3 px-3 font-sans font-bold text-foreground">{a.symbol}</td>
                      <td className="py-3 px-3 font-sans text-muted-foreground max-w-[200px] truncate">
                        {a.trigger}
                      </td>
                      <td className="py-3 px-3 text-right text-foreground">{a.currentVal}</td>
                      <td className="py-3 px-3 text-right text-muted-foreground">{a.threshold}</td>
                      <td className="py-3 px-3 text-center font-sans">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-bold",
                            isTriggered
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                              : a.status === "ENABLED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(a.id)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            {a.status === "ENABLED" ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkRead(a.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(a.id)}
                            className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* 5. MODAL: CREATE ALERT */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create Institutional Surveillance Alert
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define trigger conditions, instrument boundaries, and automated severity escalation
              rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Alert Type</label>
                <select
                  value={newAlert.type}
                  onChange={(e) =>
                    setNewAlert((p) => ({
                      ...p,
                      type: e.target.value as AlertRuleItem["type"],
                    }))
                  }
                  className="w-full bg-secondary/60 border border-border rounded-lg p-2 text-foreground focus:outline-none"
                >
                  <option value="PRICE">PRICE</option>
                  <option value="INDICATOR">INDICATOR</option>
                  <option value="STRATEGY">STRATEGY</option>
                  <option value="RISK">RISK</option>
                  <option value="ORDER">ORDER</option>
                  <option value="FEED HEALTH">FEED HEALTH</option>
                  <option value="KILL SWITCH">KILL SWITCH</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Symbol</label>
                <input
                  type="text"
                  value={newAlert.symbol}
                  onChange={(e) =>
                    setNewAlert((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))
                  }
                  className="w-full bg-secondary/60 border border-border rounded-lg p-2 text-foreground focus:outline-none"
                  placeholder="e.g. RELIANCE"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Condition</label>
                <select
                  value={newAlert.condition}
                  onChange={(e) => setNewAlert((p) => ({ ...p, condition: e.target.value }))}
                  className="w-full bg-secondary/60 border border-border rounded-lg p-2 text-foreground focus:outline-none"
                >
                  <option value="LTP >= Threshold">LTP &gt;= Threshold</option>
                  <option value="LTP <= Threshold">LTP &lt;= Threshold</option>
                  <option value="Volume Spike > 2x">Volume Spike &gt; 2x</option>
                  <option value="RSI(14) > 70 (Overbought)">RSI(14) &gt; 70</option>
                  <option value="RSI(14) < 30 (Oversold)">RSI(14) &lt; 30</option>
                  <option value="Drawdown > Threshold">Drawdown &gt; Limit</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">
                  Threshold Value
                </label>
                <input
                  type="text"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert((p) => ({ ...p, threshold: e.target.value }))}
                  className="w-full bg-secondary/60 border border-border rounded-lg p-2 text-foreground focus:outline-none"
                  placeholder="e.g. 3000.00"
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-semibold">Severity</label>
              <select
                value={newAlert.severity}
                onChange={(e) =>
                  setNewAlert((p) => ({
                    ...p,
                    severity: e.target.value as AlertRuleItem["severity"],
                  }))
                }
                className="w-full bg-secondary/60 border border-border rounded-lg p-2 text-foreground focus:outline-none"
              >
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateAlert}
              className="bg-primary hover:bg-primary/90"
            >
              Arm Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
