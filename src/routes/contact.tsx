import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard, SectionHeading } from "@/components/ui-kit/primitives";

/** Public contact page with a validated enquiry form. */
export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SmartQuant Edge — Sales & Support" },
      {
        name: "description",
        content:
          "Talk to the SmartQuant Edge team about pricing, enterprise deployment, broker integrations or platform support.",
      },
      { property: "og:title", content: "Contact SmartQuant Edge" },
      { property: "og:description", content: "Reach our sales and support desks in Bengaluru." },
    ],
  }),
  component: Contact,
});

/** Client-side validation contract for the enquiry form. */
const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  subject: z.string().trim().min(1, "Please add a subject").max(120),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(1000),
});

const channels = [
  { icon: Mail, label: "sales@smartquant.in", sub: "Sales & enterprise" },
  { icon: Phone, label: "+91 80 4718 2200", sub: "Mon–Fri, 9:00–18:30 IST" },
  { icon: MapPin, label: "Prestige Tech Park, Bengaluru 560103", sub: "Registered office" },
];

function Contact() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = contactSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    e.currentTarget.reset();
    toast.success("Message sent", { description: "Our team replies within one business day." });
  }

  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="Contact"
            title="Let's talk about your trading stack"
            subtitle="Sales, integrations, media or partnership enquiries — we read every message."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="space-y-4">
              {channels.map((c) => (
                <GlassCard key={c.label} className="flex items-start gap-4 p-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                </GlassCard>
              ))}
            </div>

            <GlassCard hover={false} className="p-6">
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" name="name" placeholder="Ananya Rao" maxLength={100} />
                    {errors.name && <p className="text-xs text-bear">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@desk.com"
                      maxLength={255}
                    />
                    {errors.email && <p className="text-xs text-bear">{errors.email}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="Enterprise deployment for a 12-seat desk"
                    maxLength={120}
                  />
                  {errors.subject && <p className="text-xs text-bear">{errors.subject}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    rows={6}
                    placeholder="Tell us about your strategies, brokers and volumes…"
                    maxLength={1000}
                  />
                  {errors.message && <p className="text-xs text-bear">{errors.message}</p>}
                </div>
                <Button type="submit" className="w-full glow-ring">
                  Send message
                </Button>
              </form>
            </GlassCard>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
