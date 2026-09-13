import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, MessageSquare, Ticket } from "lucide-react";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Button } from "@/components/ui/button";
import { GlassCard, Reveal, SectionHeading } from "@/components/ui-kit/primitives";
import { knowledgeBase } from "@/data/platform";

/** Public support centre: knowledge base + entry points into the ticket desk. */
export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Centre — SmartQuant Edge Help & Knowledge Base" },
      {
        name: "description",
        content:
          "Guides, troubleshooting articles, live chat and ticket support for the SmartQuant Edge trading platform.",
      },
      { property: "og:title", content: "SmartQuant Edge Support Centre" },
      {
        property: "og:description",
        content: "Knowledge base articles, live chat and ticket support.",
      },
    ],
  }),
  component: Support,
});

const channels = [
  {
    icon: Ticket,
    title: "Raise a ticket",
    body: "Track every issue with SLA timers and full history.",
    to: "/app/support" as const,
    cta: "Open ticket desk",
  },
  {
    icon: MessageSquare,
    title: "Live chat",
    body: "Median first response under four minutes during market hours.",
    to: "/app/support" as const,
    cta: "Start a chat",
  },
  {
    icon: BookOpen,
    title: "Knowledge base",
    body: "180+ articles on strategies, brokers, risk and reporting.",
    to: "/support" as const,
    cta: "Browse articles",
  },
];

function Support() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="Support"
            title="Help, exactly when the market won't wait"
            subtitle="Self-serve answers, a real ticket desk and live chat staffed through Indian market hours."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {channels.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.06}>
                <GlassCard className="flex h-full flex-col p-6">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{c.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.body}</p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link to={c.to}>{c.cta}</Link>
                  </Button>
                </GlassCard>
              </Reveal>
            ))}
          </div>

          <h2 className="mt-16 text-2xl font-bold">Popular articles</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {knowledgeBase.map((a) => (
              <GlassCard key={a.title} className="p-5">
                <p className="text-xs tracking-wide text-primary uppercase">{a.cat}</p>
                <p className="mt-2 font-medium">{a.title}</p>
                <p className="num mt-3 text-xs text-muted-foreground">{a.reads} reads</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
