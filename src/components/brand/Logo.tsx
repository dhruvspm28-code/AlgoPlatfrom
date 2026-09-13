import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Wordmark + emblem for SmartQuant Edge */
export function Logo({
  className,
  compact = false,
  to = "/",
}: {
  className?: string;
  compact?: boolean;
  to?: string;
}) {
  return (
    <Link to={to} className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-black text-sm tracking-tighter">
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 17.5 8.5 11l4 4L21 5.5" />
          <path d="M15 5.5h6v6" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-base font-bold tracking-tight text-foreground">
          Smart<span className="text-primary font-black">Quant</span>
          <span className="ml-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Edge
          </span>
        </span>
      )}
    </Link>
  );
}
