import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Button } from "@/components/ui/button";
import { GlassCard, Reveal, SectionHeading } from "@/components/ui-kit/primitives";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs, planMatrix, plans } from "@/data/platform";

/** Subscription plans + full feature comparison matrix. */
export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — SmartQuant Edge" },
      {
        name: "description",
        content:
          "Compare the Starter, Pro and Enterprise plans for the SmartQuant Edge algorithmic trading platform.",
      },
      { property: "og:title", content: "SmartQuant Edge Pricing — Starter, Pro and Enterprise" },
      {
        property: "og:description",
        content:
          "Transparent monthly pricing for strategy building, backtesting and live algorithmic execution.",
      },
    ],
  }),
  component: Pricing,
});

function cell(value: string) {
  if (value === "—") return <Minus className="mx-auto h-4 w-4 text-muted-foreground" />;
  return <span className="text-sm">{value}</span>;
}

function Pricing() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6">
          <SectionHeading
            eyebrow="Subscription"
            title="Pricing that scales with your capital"
            subtitle="Every plan includes quantitative strategies management, paper trading and the market scanner basics."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.06}>
                <GlassCard
                  className={`flex h-full flex-col p-6 ${p.highlight ? "border-primary/45 glow-ring" : ""}`}
                >
                  {p.highlight && (
                    <span className="mb-3 w-fit rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                  <p className="num mt-5 text-3xl font-bold">
                    {p.price}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      / {p.period}
                    </span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {p.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-7 w-full"
                    variant={p.highlight ? "default" : "outline"}
                  >
                    <Link to={p.id === "enterprise" ? "/contact" : "/payment-success"}>
                      {p.id === "enterprise"
                        ? "Talk to sales"
                        : p.id === "free"
                          ? "Start free"
                          : "Upgrade to Pro"}
                    </Link>
                  </Button>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold">Full comparison</h2>
        <GlassCard hover={false} className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-4 font-medium">Capability</th>
                <th className="px-5 py-4 text-center font-medium">Starter</th>
                <th className="px-5 py-4 text-center font-medium text-primary">Pro</th>
                <th className="px-5 py-4 text-center font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {planMatrix.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-border/60 last:border-0 hover:bg-surface-2/40"
                >
                  <td className="px-5 py-3.5 text-sm font-medium">{row.feature}</td>
                  <td className="px-5 py-3.5 text-center text-muted-foreground">
                    {cell(row.free)}
                  </td>
                  <td className="px-5 py-3.5 text-center">{cell(row.pro)}</td>
                  <td className="px-5 py-3.5 text-center text-muted-foreground">
                    {cell(row.enterprise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>

        <div className="mt-14">
          <h2 className="text-2xl font-bold">Billing questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.slice(0, 4).map((f) => (
              <AccordionItem
                key={f.q}
                value={f.q}
                className="glass mb-3 rounded-2xl border-none px-5"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </MarketingShell>
  );
}
