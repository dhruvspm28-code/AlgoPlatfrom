import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, MessageSquare, BookOpen } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/ui-kit/primitives";
import { supportTickets, knowledgeBase } from "@/data/platform";

export const Route = createFileRoute("/app/support")({
  head: () => ({
    meta: [{ title: "Help & Support — SmartQuant Edge" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help Desk & Support Center"
        subtitle="Submit tickets, review broker integration guides, and query API documentation."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Active Support Tickets
          </h2>
          <div className="space-y-3">
            {supportTickets.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-surface-2/40 p-3 space-y-1 text-xs"
              >
                <div className="flex justify-between font-semibold">
                  <span>{t.subject}</span>
                  <span className="text-primary">{t.status}</span>
                </div>
                <div className="flex justify-between text-muted-foreground num">
                  <span>
                    Ticket {t.id} · Priority: {t.priority}
                  </span>
                  <span>{t.updated}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5 space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Knowledge Base & API Docs
          </h2>
          <div className="space-y-2">
            {knowledgeBase.map((kb) => (
              <div
                key={kb.title}
                className="flex justify-between items-center rounded-xl border border-border/60 p-3 text-xs hover:bg-surface-2/50"
              >
                <div>
                  <p className="font-semibold text-foreground">{kb.title}</p>
                  <p className="text-[11px] text-muted-foreground">{kb.cat}</p>
                </div>
                <span className="text-muted-foreground font-mono">{kb.reads} reads</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
