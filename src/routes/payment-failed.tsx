import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui-kit/primitives";

/** Checkout failure screen with recovery actions. */
export const Route = createFileRoute("/payment-failed")({
  head: () => ({
    meta: [
      { title: "Payment failed — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Your payment could not be processed. Retry with another method or contact the SmartQuant Edge billing desk.",
      },
      { property: "og:title", content: "Payment failed — SmartQuant Edge" },
      { property: "og:description", content: "We could not process your subscription payment." },
    ],
  }),
  component: Failed,
});

function Failed() {
  return (
    <MarketingShell>
      <div className="relative flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="grid-backdrop absolute inset-0" aria-hidden />
        <GlassCard hover={false} className="relative w-full max-w-lg p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-bear/12 text-bear">
            <XCircle className="h-8 w-8" />
          </span>
          <h1 className="mt-6 text-2xl font-bold">Payment failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your bank declined the transaction (error code 51 — insufficient funds). No amount has
            been debited. You can retry with a different card or UPI handle.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild className="glow-ring">
              <Link to="/pricing">Retry payment</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contact billing</Link>
            </Button>
          </div>
        </GlassCard>
      </div>
    </MarketingShell>
  );
}
