import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Shield, Lock, Activity, Radio, Cpu, BarChart2 } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/**
 * Institutional Trading Workstation Shell for SmartQuant Edge Authentication.
 * Designed with clean Bloomberg / Zerodha Kite / TradingView information density.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  cardWidth = "max-w-md",
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  cardWidth?: "max-w-md" | "max-w-lg" | "max-w-xl";
}) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr] bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Left institutional workstation telemetry panel */}
      <aside className="relative hidden overflow-hidden border-r border-border/70 bg-surface/30 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <Logo showTagline to="/" />
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface-2/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> NSE · BSE LIVE GATEWAY
            </span>
          </div>

          <div className="max-w-md space-y-4 pt-4">
            <div className="inline-flex items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Sovereign Indian Quantitative Platform</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl leading-snug">
              Institutional algorithmic precision.
              <br />
              <span className="text-muted-foreground font-semibold">
                Designed for active Demat traders.
              </span>
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed">
              SmartQuant Edge pairs high-frequency market data streaming with verified broker
              gateways, mathematical position sizing, automated pre-trade risk checks, and
              cryptographic User IDs.
            </p>
          </div>

          {/* Institutional Specifications Matrix */}
          <div className="grid grid-cols-2 gap-2.5 max-w-md pt-2">
            <div className="rounded-lg border border-border/80 bg-surface/70 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Market Feed</span>
                <Radio className="h-3 w-3 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground">Groww Feed & DhanHQ</p>
              <p className="text-[10px] text-muted-foreground">Sub-millisecond NKeys streaming</p>
            </div>

            <div className="rounded-lg border border-border/80 bg-surface/70 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Authentication</span>
                <Lock className="h-3 w-3 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-foreground">Sovereign User ID</p>
              <p className="text-[10px] text-muted-foreground">Mandatory 2FA OTP verification</p>
            </div>

            <div className="rounded-lg border border-border/80 bg-surface/70 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Trading Account</span>
                <BarChart2 className="h-3 w-3 text-amber-400" />
              </div>
              <p className="text-xs font-bold text-foreground">Demat Eligibility Gated</p>
              <p className="text-[10px] text-muted-foreground">Verified UCC broker binding</p>
            </div>

            <div className="rounded-lg border border-border/80 bg-surface/70 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Risk Governance</span>
                <Cpu className="h-3 w-3 text-rose-400" />
              </div>
              <p className="text-xs font-bold text-foreground">Pre-Trade Circuit Breaker</p>
              <p className="text-[10px] text-muted-foreground">
                Deterministic hardware kill-switch
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-muted-foreground pt-6 border-t border-border/70">
          <p>© 2026 SmartQuant Edge · Indian Capital Markets</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/about" className="hover:text-foreground transition-colors">
              Architecture
            </Link>
          </div>
        </div>
      </aside>

      {/* Right authentication workstation card */}
      <main className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn("relative w-full", cardWidth)}
        >
          <div className="mb-6 lg:hidden flex justify-center">
            <Logo showTagline to="/" />
          </div>

          <div className="rounded-xl border border-border/80 bg-surface/90 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-border/60 pb-4 mb-5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{subtitle}</div>
            </div>
            <div>{children}</div>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">{footer}</div>
        </motion.div>
      </main>
    </div>
  );
}
