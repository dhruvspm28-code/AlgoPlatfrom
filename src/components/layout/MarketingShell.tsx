import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { indices } from "@/data/market";
import { marketDataEngine } from "@/services/market-data-engine";
import { realtimeBus } from "@/services/realtime-bus";
import { usePlatform } from "@/context/PlatformContext";

/** Public navigation matching Section 2 */
const navItems = [
  { label: "Product", to: "/#product" },
  { label: "Strategies", to: "/#strategies" },
  { label: "Backtesting", to: "/#research" },
  { label: "Risk", to: "/#risk" },
  { label: "IPO Intelligence", to: "/app/ipo" },
  { label: "Methodology", to: "/about" },
  { label: "Architecture", to: "/#pipeline" },
];

function LiveTicker() {
  const [, setTickVer] = useState(0);

  useEffect(() => {
    const unsub = realtimeBus.subscribe("MARKET_TICK", () => {
      setTickVer((v) => v + 1);
    });
    return () => unsub();
  }, []);

  const row = [...indices, ...indices];
  return (
    <div className="overflow-hidden border-b border-border bg-surface-2/40 py-1">
      <div className="animate-ticker flex w-max gap-8 px-4">
        {row.map((i, idx) => {
          const liveTick = marketDataEngine.getLatestTick(i.name);
          const price = liveTick ? liveTick.price : i.value;
          const change = liveTick ? liveTick.change : i.change;
          const changePct = liveTick ? liveTick.changePct : i.changePct;
          const isUp = change >= 0;

          return (
            <span
              key={`${i.name}-${idx}`}
              className="num flex items-center gap-2 text-[11px] whitespace-nowrap"
            >
              <span className="text-muted-foreground font-semibold">{i.name}</span>
              <span className="font-bold text-foreground">₹{price.toLocaleString("en-IN")}</span>
              <span className={cn("font-medium", isUp ? "text-bull" : "text-bear")}>
                {isUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = usePlatform();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <LiveTicker />
      <div
        className={cn(
          "transition-colors duration-200",
          scrolled ? "bg-background/95 backdrop-blur border-b border-border" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.to}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" className="text-xs h-8 font-semibold">
                  <Link to="/app">Open Terminal</Link>
                </Button>
                <Link
                  to="/app/profile"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  <span className="grid h-5 w-5 place-items-center rounded bg-primary/20 text-[10px] font-bold text-primary">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "SQ"}
                  </span>
                  <span className="font-mono text-xs">{user?.userId || "SQE-7F42K9"}</span>
                </Link>
              </div>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-xs h-8">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild size="sm" className="text-xs h-8 font-semibold">
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          <button
            aria-label="Toggle navigation"
            onClick={() => setOpen((v) => !v)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border bg-background lg:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="mt-2 pt-2 border-t border-border">
                  {isAuthenticated ? (
                    <Button asChild size="sm" className="w-full text-xs font-semibold">
                      <Link to="/app" onClick={() => setOpen(false)}>
                        Open Terminal ({user?.userId})
                      </Link>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="outline" size="sm" className="text-xs">
                        <Link to="/login" onClick={() => setOpen(false)}>
                          Login
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="text-xs">
                        <Link to="/register" onClick={() => setOpen(false)}>
                          Get Started
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

const footerCols = [
  {
    heading: "Terminal",
    links: [
      { label: "Live Terminal", href: "/app/live" },
      { label: "Algo Monitor", href: "/app/monitor" },
      { label: "Quantitative Strategies", href: "/app/strategies" },
      { label: "Backtesting Workstation", href: "/app/backtest" },
      { label: "Market Scanner", href: "/app/scanner" },
    ],
  },
  {
    heading: "Intelligence & Risk",
    links: [
      { label: "IPO Intelligence", href: "/app/ipo" },
      { label: "Quantitative Insights", href: "/app/insights" },
      { label: "Risk Command Center", href: "/app/admin" },
      { label: "Security Center", href: "/app/profile" },
    ],
  },
  {
    heading: "Research & Documentation",
    links: [
      { label: "Quantitative Methodology", href: "/about" },
      { label: "System Architecture", href: "/about" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-sm text-xs text-muted-foreground leading-relaxed">
              SmartQuant Edge is a professional algorithmic trading and quantitative research
              platform engineered specifically for Indian markets.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Direct DhanHQ market data feed · First-party sovereign authentication · Server-side
              risk gating
            </p>
          </div>

          {footerCols.map((col) => (
            <div key={col.heading} className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                {col.heading}
              </p>
              <ul className="space-y-1.5 text-xs">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 SmartQuant Edge. All rights reserved.</p>
          <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-500 font-medium">
            Simulated Paper Execution Mode Available · Not an Investment Advisory Service
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
