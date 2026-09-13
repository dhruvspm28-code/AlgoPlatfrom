import { GlassCard } from "@/components/ui-kit/primitives";

/** Shared renderer for legal pages so Privacy and Terms stay visually identical. */
export function LegalDocument({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: Array<{ heading: string; body: string }>;
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="grid-backdrop absolute inset-0" aria-hidden />
      <article className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="num mt-2 text-xs text-muted-foreground">{updated}</p>
        <div className="mt-10 space-y-4">
          {sections.map((s) => (
            <GlassCard key={s.heading} hover={false} className="p-6">
              <h2 className="text-base font-semibold">{s.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </GlassCard>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          Questions about this document? Write to legal@smartquant.in.
        </p>
      </article>
    </div>
  );
}
