import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Shared presentational primitives.
 * Keeping these in one module keeps page files declarative and consistent.
 */

/** Scroll-triggered fade + rise. Used across marketing and app surfaces. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Glassmorphism container used for every card-like surface. */
export function GlassCard({
  children,
  className,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn("glass rounded-2xl", hover && "card-hover", className)}>{children}</div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-3xl font-bold text-balance sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-muted-foreground text-pretty">{subtitle}</p>}
    </div>
  );
}

/** Page title block for authenticated app screens. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Formats a signed number with colour + sign, in tabular figures. */
export function Delta({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const up = value >= 0;
  return (
    <span className={cn("num font-semibold", up ? "text-bull" : "text-bear", className)}>
      {up ? "+" : "−"}
      {prefix}
      {Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      {suffix}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaSuffix = "%",
  icon,
  footnote,
  subtext,
  trend,
  variant,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaSuffix?: string;
  icon?: ReactNode;
  footnote?: string;
  subtext?: string;
  trend?: "up" | "down" | string;
  variant?: "primary" | "success" | "warning" | "danger" | "default" | string;
}) {
  const note = footnote || subtext;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase truncate">
          {label}
        </p>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <p
        className={cn(
          "num mt-2 text-xl font-bold font-mono truncate",
          variant === "success"
            ? "text-emerald-400"
            : variant === "danger"
              ? "text-rose-400"
              : variant === "warning"
                ? "text-amber-400"
                : variant === "primary"
                  ? "text-primary"
                  : "text-foreground",
        )}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
        {delta !== undefined && <Delta value={delta} suffix={deltaSuffix} />}
        {note && (
          <span
            className={cn(
              "truncate text-[11px]",
              variant === "success" && trend === "up"
                ? "text-emerald-400/90"
                : variant === "danger" && trend === "down"
                  ? "text-rose-400/90"
                  : "text-muted-foreground",
            )}
          >
            {note}
          </span>
        )}
      </div>
    </GlassCard>
  );
}

/** Consistent status pill across orders, strategies, tickets and users. */
export function StatusPill({ status }: { status: string }) {
  const tone = /live|active|complete|open position|bull|buy|resolved|connected/i.test(status)
    ? "bg-bull/12 text-bull border-bull/30"
    : /reject|suspend|sell|bear|fail|error|high/i.test(status)
      ? "bg-bear/12 text-bear border-bear/30"
      : /pending|partial|progress|paper|trial|warn|medium/i.test(status)
        ? "bg-warn/12 text-warn border-warn/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        tone,
      )}
    >
      {status}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-muted-foreground">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function inr(n: number, fraction = 0) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: fraction, minimumFractionDigits: fraction })}`;
}
