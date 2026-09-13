import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Original SmartQuant Edge Geometric Emblem
 * Minimalist mathematical "SQ" quantitative edge mark representing
 * discrete price structures, momentum boundaries, and algorithmic edge.
 */
export function QuantEdgeEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-label="SmartQuant Edge Logo"
    >
      {/* Precision chamfered background */}
      <rect
        width="32"
        height="32"
        rx="7.5"
        className="fill-primary/15 stroke-primary/35"
        strokeWidth="1.25"
      />
      {/* S-curve quantitative price bracket */}
      <path
        d="M21 9.5H13.2C10.9 9.5 9 11.3 9 13.5C9 15.7 10.9 17.5 13.2 17.5H18.8C21.1 17.5 23 19.3 23 21.5C23 23.7 21.1 25.5 18.8 25.5H11"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Q terminal / Razor Quant Edge */}
      <path
        d="M17.8 21.2L24.5 27.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Quantum pricing node */}
      <circle cx="21" cy="9.5" r="1.35" fill="currentColor" />
    </svg>
  );
}

/**
 * Standardized Brand Identity for SmartQuant Edge
 * "Quantitative Trading. Smarter Execution."
 */
export function Logo({
  className,
  compact = false,
  showTagline = false,
  to = "/",
}: {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
  to?: string;
}) {
  return (
    <Link to={to} className={cn("group flex items-center gap-3 select-none", className)}>
      <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary shadow-xs transition-transform group-hover:scale-[1.03]">
        <QuantEdgeEmblem />
      </span>

      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-sm font-extrabold tracking-tight text-foreground">
              SMART<span className="text-primary font-black">QUANT</span>
            </span>
            <span className="rounded bg-primary/15 border border-primary/30 px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-widest text-primary uppercase">
              EDGE
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] text-muted-foreground font-medium tracking-tight">
              Quantitative Trading. Smarter Execution.
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
