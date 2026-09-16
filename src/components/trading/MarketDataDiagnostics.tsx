import { useState, useEffect } from "react";
import { Activity, Radio, Bug, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FeedStatus } from "@/services/market-data-types";
import { WATCHLIST_INSTRUMENTS } from "@/services/instrument-mapper";

export interface MarketDataDiagnosticsProps {
  feedStatus: FeedStatus;
  lastTickSymbol?: string;
  lastTickLtp?: number;
  lastTickTimestamp?: string;
  frontendEventsReceived: number;
  lastReceivedAt?: number;
}

interface ServerMetrics {
  packetsReceived: number;
  packetsDecoded: number;
  eventsPublished: number;
  lastTickSymbol: string;
  lastTickLtp: number;
  lastTickPrevLtp: number;
  lastTickTimestamp: string;
  secondsSinceLastTick: number | null;
}

export function MarketDataDiagnostics({
  feedStatus,
  lastTickSymbol,
  lastTickLtp,
  lastTickTimestamp,
  frontendEventsReceived,
  lastReceivedAt,
}: MarketDataDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null);
  const [secondsSinceLastFrontendTick, setSecondsSinceLastFrontendTick] = useState<number | null>(null);

  // Poll server diagnostic metrics every 1.5s
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/market-data/status");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.metrics) {
            setServerMetrics(data.metrics);
          }
        }
      } catch {
        // Silently ignore poll errors
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update seconds counter dynamically
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastReceivedAt && lastReceivedAt > 0) {
        setSecondsSinceLastFrontendTick(Math.max(0, Math.floor((Date.now() - lastReceivedAt) / 1000)));
      } else if (serverMetrics?.secondsSinceLastTick != null) {
        setSecondsSinceLastFrontendTick(serverMetrics.secondsSinceLastTick);
      } else {
        setSecondsSinceLastFrontendTick(null);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [lastReceivedAt, serverMetrics]);

  const activeSymbol = lastTickSymbol || serverMetrics?.lastTickSymbol || "N/A";
  const activeLtp = lastTickLtp ?? serverMetrics?.lastTickLtp ?? null;
  const activeTimestamp = lastTickTimestamp || serverMetrics?.lastTickTimestamp || "Waiting...";
  const packetsReceived = serverMetrics?.packetsReceived ?? 0;
  const packetsDecoded = serverMetrics?.packetsDecoded ?? 0;
  const eventsPublished = serverMetrics?.eventsPublished ?? 0;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-md p-3 shadow-lg text-xs font-mono text-foreground">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-amber-400" />
          <span className="font-bold tracking-wide uppercase text-amber-300 text-[11px]">
            Dev Diagnostics: Live Feed Trace
          </span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
              feedStatus.connectionState === "LIVE"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                : feedStatus.connectionState === "WAITING_FOR_DATA"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-red-500/20 text-red-300 border border-red-500/40",
            )}
          >
            {feedStatus.connectionState}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Radio className={cn("h-3 w-3", frontendEventsReceived > 0 ? "text-emerald-400 animate-ping" : "text-muted-foreground")} />
            FE: {frontendEventsReceived}
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-amber-400 hover:text-amber-200 p-0.5 rounded transition-colors"
            title={isOpen ? "Collapse diagnostics" : "Expand diagnostics"}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Grid */}
      {isOpen && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-[11px]">
          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Provider</p>
            <p className="font-bold text-amber-200 truncate">{feedStatus.providerName || "Groww Trade Gateway"}</p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">WebSocket State</p>
            <p className="font-bold text-foreground">{feedStatus.connectionState}</p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Subscribed Instruments</p>
            <p className="font-bold text-foreground">
              {WATCHLIST_INSTRUMENTS.length} Instruments
            </p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Packets Received</p>
            <p className="font-bold text-cyan-300">{packetsReceived}</p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Packets Decoded</p>
            <p className="font-bold text-emerald-300">{packetsDecoded}</p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Realtime Events Published</p>
            <p className="font-bold text-indigo-300">{eventsPublished}</p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Frontend Events Received</p>
            <p className="font-bold text-emerald-400">{frontendEventsReceived}</p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Seconds Since Last Tick</p>
            <p
              className={cn(
                "font-bold",
                secondsSinceLastFrontendTick === null
                  ? "text-muted-foreground"
                  : secondsSinceLastFrontendTick < 5
                    ? "text-emerald-400"
                    : secondsSinceLastFrontendTick < 15
                      ? "text-amber-400"
                      : "text-red-400",
              )}
            >
              {secondsSinceLastFrontendTick === null ? "—" : `${secondsSinceLastFrontendTick}s`}
            </p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Last Tick Symbol</p>
            <p className="font-bold text-foreground">{activeSymbol}</p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase">Last Tick LTP</p>
            <p className="font-bold text-foreground">
              {activeLtp !== null ? `₹${activeLtp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
            </p>
          </div>

          <div className="rounded bg-black/40 p-2 border border-white/5 sm:col-span-2">
            <p className="text-[10px] text-muted-foreground uppercase">Last Tick Timestamp</p>
            <p className="font-semibold text-muted-foreground truncate">{activeTimestamp}</p>
          </div>
        </div>
      )}
    </div>
  );
}
