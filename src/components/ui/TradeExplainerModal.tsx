/**
 * "Explain This Trade" Interactive Audit Trail Modal Component for SmartQuant Edge.
 * Visualizes the 9-stage verifiable trade lifecycle:
 * Market Data -> Indicators -> Conditions -> Signal -> Sizing -> Risk -> Order -> Fill -> Position & P&L.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type TradeExplainRecord } from "@/services/trade-explainer";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  Zap,
  Layers,
  FileCheck2,
} from "lucide-react";

interface TradeExplainerModalProps {
  record: TradeExplainRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STAGE_ICONS = [
  Zap, // 1. Market Data
  Layers, // 2. Indicators
  FileCheck2, // 3. Strategy Conditions
  BrainCircuit, // 4. Signal
  TrendingUp, // 5. Position Sizing
  ShieldCheck, // 6. Risk Decision
  Clock, // 7. Order
  CheckCircle2, // 8. Fill
  TrendingUp, // 9. Position & P&L
];

export function TradeExplainerModal({ record, open, onOpenChange }: TradeExplainerModalProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
              <DialogTitle className="text-base font-bold">Explain This Trade</DialogTitle>
            </div>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                record.side === "BUY" ? "bg-bull/20 text-bull" : "bg-bear/20 text-bear"
              }`}
            >
              {record.side} {record.symbol}
            </span>
          </div>
          <DialogDescription className="text-xs">
            Algorithmic provenance and complete 9-stage verifiable audit chain for{" "}
            {record.strategyName}.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Card */}
        <div className="rounded-xl border border-border bg-surface-2/70 p-3 text-xs">
          <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
            Execution Summary
          </p>
          <p className="mt-1 font-medium text-foreground">{record.summary}</p>
          <p className="mt-1 text-[11px] text-muted-foreground num">
            Audited at {new Date(record.timestamp).toLocaleString()} IST · Ref: {record.id}
          </p>
        </div>

        {/* 9-Stage Stepper Flow */}
        <div className="space-y-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            End-to-End Decision Pipeline
          </p>

          <div className="space-y-2.5">
            {record.stages.map((stage, idx) => {
              const IconComponent = STAGE_ICONS[idx] || CheckCircle2;
              const isPassed = stage.status === "PASSED" || stage.status === "COMPLETED";
              const isBlocked = stage.status === "BLOCKED";

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 transition-all ${
                    isBlocked
                      ? "border-bear/50 bg-bear/10"
                      : isPassed
                        ? "border-border bg-surface-2/40 hover:bg-surface-2/70"
                        : "border-primary/40 bg-primary/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`grid h-6 w-6 place-items-center rounded-lg text-xs font-bold ${
                          isBlocked
                            ? "bg-bear text-white"
                            : isPassed
                              ? "bg-bull/20 text-bull"
                              : "bg-primary/20 text-primary"
                        }`}
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{stage.stageName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isBlocked
                            ? "bg-bear text-white"
                            : isPassed
                              ? "bg-bull/15 text-bull"
                              : "bg-info/15 text-info"
                        }`}
                      >
                        {stage.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground num">
                        {new Date(stage.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1.5 text-xs num">
                    <div>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Input:{" "}
                      </span>
                      <span className="text-muted-foreground">{stage.inputSummary}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-foreground">Decision: </span>
                      <span className="font-medium text-foreground">{stage.decision}</span>
                    </div>
                    <div className="rounded-lg bg-surface-3/60 p-2 text-[11px]">
                      <span className="font-semibold text-primary">Output: </span>
                      <span className="text-foreground/90">{stage.outputSummary}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close Explainer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
