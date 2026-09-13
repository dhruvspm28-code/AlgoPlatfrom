import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Shield, Lock, Activity } from "lucide-react";

import { Logo } from "@/components/brand/Logo";

/** Split-screen workstation chrome for SmartQuant Edge authentication */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Left branding & architecture showcase */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface/25 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-backdrop absolute inset-0 opacity-40" aria-hidden />

        <div className="relative">
          <Logo />
        </div>

        <div className="relative max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" /> First-Party Sovereign Authentication
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            Quantitative Research. Verified Execution. Zero Friction.
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            SmartQuant Edge operates a sovereign trading terminal for Indian markets with
            cryptographically verified User IDs, mandatory OTP challenge gating, server-side risk
            limits, and real-time mark-to-market trade tracking.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-border bg-surface/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Provider
              </p>
              <p className="mt-1 text-sm font-bold text-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-bull" /> DhanHQ Feed
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Auth Gateway
              </p>
              <p className="mt-1 text-sm font-bold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> User ID + OTP
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface/60 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Risk Gate
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">Pre-Trade Gated</p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/60">
          <p>© 2026 SmartQuant Edge · Indian Markets</p>
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

      {/* Right authentication card */}
      <main className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="rounded-2xl border border-border bg-surface/40 p-6 sm:p-8 backdrop-blur-md">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>

          <div className="mt-5 text-center text-xs text-muted-foreground">{footer}</div>
        </motion.div>
      </main>
    </div>
  );
}
