/**
 * IPO Intelligence Terminal Route for SmartQuant Edge.
 * Provides IPO tracking, Subscription Tracker, Financial Analysis, Risk Score breakdown,
 * IPO Rule Builder, and Listing-Day Paper Strategy execution.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ipoDataService, type IPODetails } from "@/services/ipo-data-service";
import { ipoStrategyEngine } from "@/services/ipo-strategy-engine";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Star,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ipo")({
  component: IPOIntelligencePage,
});

function IPOIntelligencePage() {
  const [ipos, setIpos] = useState<IPODetails[]>(ipoDataService.getAllIPOs());
  const [selectedIpo, setSelectedIpo] = useState<IPODetails>(ipos[0]);
  const [activeCategory, setActiveCategory] = useState<"ALL" | "OPEN" | "UPCOMING" | "LISTED">(
    "ALL",
  );

  const filtered =
    activeCategory === "ALL" ? ipos : ipos.filter((i) => i.category === activeCategory);

  const handleToggleWatchlist = (id: string) => {
    const isSaved = ipoDataService.toggleWatchlist(id);
    setIpos(ipoDataService.getAllIPOs());
    toast.success(isSaved ? "Added to IPO Watchlist" : "Removed from IPO Watchlist");
  };

  const handleExecuteListingStrategy = (ipoId: string) => {
    try {
      const order = ipoStrategyEngine.executeListingDayPaperStrategy(ipoId);
      toast.success(`Executed Listing-Day Paper Strategy! Order ID: ${order.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute listing strategy.";
      toast.error(msg);
    }
  };

  const evalResult = ipoStrategyEngine.evaluateIPO(selectedIpo);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">
              IPO Intelligence & Strategy Terminal
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Quantitative analysis, subscription tracking, valuation risk scores, and listing-day
            paper execution strategies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "OPEN", "UPCOMING", "LISTED"] as const).map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="text-xs"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Grid: IPO List & Detail Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: IPO Watchlist / Listing Table */}
        <div className="glass space-y-4 rounded-2xl p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Primary Market Listings</h2>

          <div className="space-y-3">
            {filtered.map((ipo) => {
              const isWatch = ipoDataService.isInWatchlist(ipo.id);
              const isSelected = selectedIpo.id === ipo.id;

              return (
                <div
                  key={ipo.id}
                  onClick={() => setSelectedIpo(ipo)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface/40 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{ipo.companyName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWatchlist(ipo.id);
                      }}
                      className="text-muted-foreground hover:text-amber-400"
                    >
                      <Star
                        className={`h-4 w-4 ${isWatch ? "fill-amber-400 text-amber-400" : ""}`}
                      />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs num">
                    <span className="text-muted-foreground">Price Band:</span>
                    <span className="font-bold">
                      ₹{ipo.priceBandMin} – ₹{ipo.priceBandMax}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs num">
                    <span className="text-muted-foreground">Issue Size:</span>
                    <span className="font-medium">₹{ipo.issueSizeCr} Cr</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold num ${
                        ipo.category === "OPEN"
                          ? "bg-bull/20 text-bull"
                          : ipo.category === "UPCOMING"
                            ? "bg-info/20 text-info"
                            : "bg-surface-2 text-muted-foreground"
                      }`}
                    >
                      {ipo.category}
                    </span>

                    {ipo.subscription && (
                      <span className="font-semibold text-primary num">
                        Overall {ipo.subscription.overallX}x
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Comprehensive IPO Intelligence Detail */}
        <div className="glass space-y-5 rounded-2xl p-6 lg:col-span-2">
          {/* Company Title */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <span className="text-xs font-semibold text-primary">
                {selectedIpo.symbol} ({selectedIpo.exchange})
              </span>
              <h2 className="text-lg font-bold">{selectedIpo.companyName}</h2>
            </div>

            <Button
              size="sm"
              onClick={() => handleExecuteListingStrategy(selectedIpo.id)}
              className="bg-bull text-bull-foreground hover:bg-bull/90 text-xs font-semibold"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" /> Execute Listing Paper Strategy
            </Button>
          </div>

          {/* Subscription Multiples */}
          {selectedIpo.subscription ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">
                  Real-Time Subscription Tracker
                </span>
                <span className="num text-muted-foreground">
                  Last updated: {new Date(selectedIpo.subscription.updatedAt).toLocaleTimeString()}{" "}
                  IST
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center num text-xs">
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="text-muted-foreground">Retail</div>
                  <div className="text-base font-bold text-bull">
                    {selectedIpo.subscription.retailX}x
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="text-muted-foreground">NII (HNI)</div>
                  <div className="text-base font-bold text-bull">
                    {selectedIpo.subscription.niiX}x
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface-2 p-3">
                  <div className="text-muted-foreground">QIB</div>
                  <div className="text-base font-bold text-bull">
                    {selectedIpo.subscription.qibX}x
                  </div>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
                  <div className="text-muted-foreground">Overall</div>
                  <div className="text-base font-bold text-primary">
                    {selectedIpo.subscription.overallX}x
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
              Subscription data: <strong>DATA UNAVAILABLE</strong> (Bidding not started)
            </div>
          )}

          {/* IPO Risk Analysis Score */}
          <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">IPO Valuation & Fundamentals Risk Score</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md num ${
                  selectedIpo.riskScore.overall === "LOW"
                    ? "bg-bull/20 text-bull"
                    : "bg-warn/20 text-warn"
                }`}
              >
                Overall Risk: {selectedIpo.riskScore.overall} ({selectedIpo.riskScore.overallScore}
                /100)
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs num">
              <div>
                <span className="text-muted-foreground">Valuation Score:</span>
                <div className="font-semibold text-primary">
                  {selectedIpo.riskScore.valuationScore}/100
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Debt Balance:</span>
                <div className="font-semibold text-bull">{selectedIpo.riskScore.debtScore}/100</div>
              </div>
              <div>
                <span className="text-muted-foreground">Profit Growth:</span>
                <div className="font-semibold text-bull">
                  {selectedIpo.riskScore.profitScore}/100
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Market Demand:</span>
                <div className="font-semibold text-primary">
                  {selectedIpo.riskScore.demandScore}/100
                </div>
              </div>
            </div>
          </div>

          {/* Quantitative Rule Signal */}
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-1.5 text-xs num">
            <div className="flex items-center justify-between font-bold">
              <span>Quantitative Strategy Rule Signal</span>
              <span className="text-bull font-bold text-sm">{evalResult.signal}</span>
            </div>
            <p className="text-muted-foreground">{evalResult.reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
