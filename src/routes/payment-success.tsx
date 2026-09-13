import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Download } from "lucide-react";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui-kit/primitives";

/** Post-checkout confirmation screen. */
export const Route = createFileRoute("/payment-success")({
  head: () => ({
    meta: [
      { title: "Payment successful — SmartQuant Edge Pro" },
      {
        name: "description",
        content:
          "Your SmartQuant Edge Pro subscription is active. Live execution and quantitative analytics are unlocked.",
      },
      { property: "og:title", content: "Payment successful — SmartQuant Edge" },
      { property: "og:description", content: "Your subscription is active." },
    ],
  }),
  component: Success,
});

function Success() {
  return (
    <MarketingShell>
      <div className="relative flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="grid-backdrop absolute inset-0" aria-hidden />
        <GlassCard hover={false} className="relative w-full max-w-lg p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-bull/12 text-bull">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-6 text-2xl font-bold">Payment successful</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Pro subscription is active. Live execution, realtime AI insights and unlimited
            strategies are unlocked on this account.
          </p>
          <dl className="num mt-7 space-y-2 rounded-2xl border border-border bg-surface/40 p-4 text-left text-sm">
            {[
              ["Invoice", "QE-2026-004821"],
              ["Plan", "Pro · Monthly"],
              ["Amount", "₹2,499.00"],
              ["Next billing", "29 Aug 2026"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild className="glow-ring">
              <Link to="/app">Go to dashboard</Link>
            </Button>
            <Button variant="outline">
              <Download className="mr-1.5 h-4 w-4" /> Download invoice
            </Button>
          </div>
        </GlassCard>
      </div>
    </MarketingShell>
  );
}
