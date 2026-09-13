/**
 * Marketing, subscription, strategy and admin mock content.
 */

export const features = [
  {
    title: "Quantitative Strategies",
    body: "Deploy algorithmic models with multi-timeframe RSI, MACD, EMA, Bollinger Bands, ATR, Volume and Supertrend execution logic.",
    icon: "Blocks",
  },
  {
    title: "Institutional Backtesting",
    body: "Replay a decade of tick-accurate data with slippage, brokerage and impact cost modelled into every fill.",
    icon: "History",
  },
  {
    title: "AI Signal Engine",
    body: "Transformer models score every symbol for direction, conviction and risk, refreshed on each candle close.",
    icon: "BrainCircuit",
  },
  {
    title: "Broker-Native Execution",
    body: "Route live orders through Zerodha, Upstox, Angel One or Fyers with sub-200ms round trips.",
    icon: "Zap",
  },
  {
    title: "Risk Guardrails",
    body: "Per-trade stop loss, daily loss caps, exposure limits and a one-tap emergency kill switch.",
    icon: "ShieldCheck",
  },
  {
    title: "Reporting & Compliance",
    body: "Auto-generated P&L, tax and trading-journal reports exportable to PDF and Excel.",
    icon: "FileSpreadsheet",
  },
];

export const stats = [
  { label: "Strategies deployed", value: "48,200+" },
  { label: "Orders executed daily", value: "1.9M" },
  { label: "Median backtest runtime", value: "3.4s" },
  { label: "Platform uptime", value: "99.98%" },
];

export const testimonials = [
  {
    quote:
      "We moved our entire intraday desk onto SmartQuant Edge. What used to take a quant week now ships before the market opens.",
    name: "Ananya Rao",
    role: "Head of Trading, Meridian Capital",
  },
  {
    quote:
      "The backtester is brutally honest — slippage and impact cost included. That alone saved us two losing strategies.",
    name: "Vikram Shetty",
    role: "Founder, Shetty Algo Partners",
  },
  {
    quote:
      "The quantitative market insights and indicator confluence breakdown provide immediate clarity on regime transitions.",
    name: "Priya Menon",
    role: "Independent Derivatives Trader",
  },
];

export const faqs = [
  {
    q: "Do I need to know how to code?",
    a: "No. The algorithmic strategies are fully pre-configured and automated — you can configure indicators, set risk thresholds and control execution with one tap.",
  },
  {
    q: "Which brokers are supported?",
    a: "Zerodha Kite, Upstox, Angel One, Fyers, Dhan and Alice Blue are supported out of the box, with an open REST/WebSocket bridge for anything else.",
  },
  {
    q: "How far back does historical data go?",
    a: "Ten years of adjusted daily data and five years of one-minute intraday data across NSE and BSE cash and F&O segments.",
  },
  {
    q: "Is my capital ever held by SmartQuant Edge?",
    a: "Never. Funds stay in your broker account. SmartQuant Edge only holds an OAuth session token that you can revoke at any time.",
  },
  {
    q: "Can I paper trade before going live?",
    a: "Yes. Every strategy runs in simulation against the live tape with a virtual ledger until you explicitly promote it to live.",
  },
  {
    q: "What happens if my internet drops mid-trade?",
    a: "Execution runs server-side. Your strategies keep managing positions and stop losses even if your browser is closed.",
  },
];

export interface Plan {
  id: "free" | "pro" | "enterprise";
  name: string;
  price: string;
  period: string;
  tagline: string;
  highlight?: boolean;
  perks: string[];
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Starter",
    price: "₹0",
    period: "forever",
    tagline: "Learn the mechanics of systematic trading.",
    perks: [
      "3 saved strategies",
      "1 year backtest history",
      "Paper trading only",
      "Delayed market data",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹2,499",
    period: "per month",
    tagline: "For serious retail and prop traders.",
    highlight: true,
    perks: [
      "Unlimited strategies",
      "10 year tick backtests",
      "Live broker execution",
      "Realtime AI insights",
      "Market scanner + alerts",
      "PDF & Excel reporting",
      "Priority email support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "annual contract",
    tagline: "Desk-wide deployment with governance.",
    perks: [
      "Everything in Pro",
      "Multi-seat & role controls",
      "Dedicated execution cluster",
      "Custom data feeds",
      "Compliance audit exports",
      "24×7 phone support & SLA",
    ],
  },
];

export const planMatrix = [
  { feature: "Saved strategies", free: "3", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Backtest history", free: "1 year", pro: "10 years", enterprise: "10 years + custom" },
  { feature: "Live execution", free: "—", pro: "Included", enterprise: "Dedicated cluster" },
  {
    feature: "AI insights",
    free: "Daily digest",
    pro: "Realtime",
    enterprise: "Realtime + custom models",
  },
  { feature: "Market scanner", free: "5 presets", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Report exports", free: "—", pro: "PDF & Excel", enterprise: "PDF, Excel, API" },
  { feature: "Seats", free: "1", pro: "1", enterprise: "Unlimited" },
  { feature: "Support", free: "Community", pro: "Priority email", enterprise: "24×7 phone + SLA" },
];

export const indicators = [
  { id: "RSI", label: "RSI", desc: "Relative Strength Index" },
  { id: "MACD", label: "MACD", desc: "Moving Avg Convergence Divergence" },
  { id: "EMA", label: "EMA", desc: "Exponential Moving Average" },
  { id: "SMA", label: "SMA", desc: "Simple Moving Average" },
  { id: "BB", label: "Bollinger Bands", desc: "Volatility envelope" },
  { id: "VOL", label: "Volume", desc: "Traded quantity" },
  { id: "ATR", label: "ATR", desc: "Average True Range" },
  { id: "ST", label: "Supertrend", desc: "ATR trend follower" },
] as const;

export interface Strategy {
  id: string;
  name: string;
  indicators: string[];
  timeframe: string;
  entry: string;
  exit: string;
  stopLoss: number;
  target: number;
  risk: number;
  positionSize: number;
  status: "LIVE" | "PAPER" | "DRAFT";
  winRate: number;
  pnl: number;
  lastModified?: string;
  instrument?: string;
  trailingStop?: number;
}

export const strategies: Strategy[] = [
  {
    id: "STR-001",
    name: "EMA Crossover Pro",
    indicators: ["EMA", "VOL"],
    timeframe: "15m",
    entry: "EMA(9) crosses above EMA(21) AND Volume > 1.5× avg(20)",
    exit: "EMA(9) crosses below EMA(21)",
    stopLoss: 1.2,
    target: 3.0,
    risk: 1.5,
    positionSize: 25,
    status: "LIVE",
    winRate: 68.4,
    pnl: 184320,
  },
  {
    id: "STR-002",
    name: "RSI Mean Reversion",
    indicators: ["RSI", "SMA"],
    timeframe: "5m",
    entry: "RSI(14) < 28 AND close > SMA(200)",
    exit: "RSI(14) > 58 OR target hit",
    stopLoss: 0.8,
    target: 1.8,
    risk: 1.0,
    positionSize: 20,
    status: "LIVE",
    winRate: 61.2,
    pnl: 96140,
  },
  {
    id: "STR-003",
    name: "Supertrend Momentum",
    indicators: ["ST", "ATR"],
    timeframe: "1h",
    entry: "Supertrend(10, 3) flips bullish AND ATR(14) rising",
    exit: "Supertrend flips bearish",
    stopLoss: 2.0,
    target: 5.5,
    risk: 2.0,
    positionSize: 30,
    status: "LIVE",
    winRate: 57.9,
    pnl: 241880,
  },
  {
    id: "STR-004",
    name: "Bollinger Squeeze",
    indicators: ["BB", "VOL", "ATR"],
    timeframe: "30m",
    entry: "Band width < 20th percentile AND close breaks upper band",
    exit: "Close re-enters middle band",
    stopLoss: 1.5,
    target: 4.0,
    risk: 1.75,
    positionSize: 22,
    status: "PAPER",
    winRate: 54.6,
    pnl: 38210,
  },
  {
    id: "STR-005",
    name: "MACD Trend Rider",
    indicators: ["MACD", "EMA"],
    timeframe: "1d",
    entry: "MACD line crosses signal above zero AND close > EMA(50)",
    exit: "MACD histogram turns negative for 2 candles",
    stopLoss: 3.0,
    target: 9.0,
    risk: 2.5,
    positionSize: 35,
    status: "PAPER",
    winRate: 49.8,
    pnl: 61470,
  },
  {
    id: "STR-006",
    name: "Breakout Hunter",
    indicators: ["VOL", "ATR", "SMA"],
    timeframe: "15m",
    entry: "Close > 20-day high AND Volume > 2× avg(20)",
    exit: "Close < SMA(10) OR stop hit",
    stopLoss: 1.8,
    target: 4.5,
    risk: 2.0,
    positionSize: 18,
    status: "DRAFT",
    winRate: 44.1,
    pnl: -12480,
  },
];

export const aiInsights = [
  {
    symbol: "TATAMOTORS",
    action: "BUY" as const,
    confidence: 91,
    risk: "Moderate",
    sentiment: "Bullish",
    note: "Volume-backed breakout above the 20-day range with EV order-book upgrades in the last 48 hours.",
  },
  {
    symbol: "ICICIBANK",
    action: "BUY" as const,
    confidence: 84,
    risk: "Low",
    sentiment: "Bullish",
    note: "NIM expansion and credit-cost normalisation keep the financials leadership trade intact.",
  },
  {
    symbol: "TCS",
    action: "HOLD" as const,
    confidence: 66,
    risk: "Low",
    sentiment: "Neutral",
    note: "Deal wins steady but discretionary IT spend guidance remains cautious into the next quarter.",
  },
  {
    symbol: "ADANIPORTS",
    action: "SELL" as const,
    confidence: 78,
    risk: "High",
    sentiment: "Bearish",
    note: "Breakdown below the 50-DMA on rising volume; cargo volume growth decelerating sequentially.",
  },
  {
    symbol: "WIPRO",
    action: "SELL" as const,
    confidence: 72,
    risk: "Moderate",
    sentiment: "Bearish",
    note: "Relative strength at 12-month lows versus the IT index with negative earnings revisions.",
  },
];

export const sectorSentiment = [
  { sector: "Financials", score: 78 },
  { sector: "Auto", score: 72 },
  { sector: "Energy", score: 61 },
  { sector: "Infra", score: 47 },
  { sector: "Pharma", score: 44 },
  { sector: "IT", score: 33 },
];

export const newsDigest = [
  {
    title: "RBI holds repo rate, signals a data-dependent stance",
    source: "Mint",
    time: "34m ago",
    tone: "Neutral",
  },
  {
    title: "Auto majors report best monthly dispatches in three years",
    source: "Economic Times",
    time: "1h ago",
    tone: "Bullish",
  },
  {
    title: "IT bellwethers guide down FY discretionary spend",
    source: "Reuters",
    time: "2h ago",
    tone: "Bearish",
  },
  {
    title: "FIIs turn net buyers of ₹4,120 crore in cash market",
    source: "NSE Bulletin",
    time: "3h ago",
    tone: "Bullish",
  },
];

export const adminUsers = [
  {
    id: "USR-1041",
    name: "Ananya Rao",
    email: "ananya@meridiancap.in",
    plan: "Enterprise",
    strategies: 24,
    status: "Active",
    joined: "12 Jan 2026",
  },
  {
    id: "USR-1042",
    name: "Vikram Shetty",
    email: "vikram@shettyalgo.com",
    plan: "Pro",
    strategies: 11,
    status: "Active",
    joined: "03 Feb 2026",
  },
  {
    id: "USR-1043",
    name: "Priya Menon",
    email: "priya.menon@gmail.com",
    plan: "Pro",
    strategies: 7,
    status: "Active",
    joined: "18 Feb 2026",
  },
  {
    id: "USR-1044",
    name: "Rohit Bansal",
    email: "rohit.b@quantlabs.io",
    plan: "Starter",
    strategies: 3,
    status: "Trial",
    joined: "27 Mar 2026",
  },
  {
    id: "USR-1045",
    name: "Sneha Iyer",
    email: "sneha.iyer@outlook.com",
    plan: "Pro",
    strategies: 9,
    status: "Suspended",
    joined: "05 Apr 2026",
  },
  {
    id: "USR-1046",
    name: "Kabir Nair",
    email: "kabir@northedge.fund",
    plan: "Enterprise",
    strategies: 31,
    status: "Active",
    joined: "22 Apr 2026",
  },
];

export const supportTickets = [
  {
    id: "TCK-8821",
    subject: "Kite session expiring every 30 minutes",
    user: "Priya Menon",
    priority: "High",
    status: "Open",
    updated: "6m ago",
  },
  {
    id: "TCK-8820",
    subject: "Excel export missing brokerage column",
    user: "Rohit Bansal",
    priority: "Medium",
    status: "In Progress",
    updated: "42m ago",
  },
  {
    id: "TCK-8819",
    subject: "Request: Supertrend on renko candles",
    user: "Vikram Shetty",
    priority: "Low",
    status: "Open",
    updated: "3h ago",
  },
  {
    id: "TCK-8818",
    subject: "Invoice GST number correction",
    user: "Ananya Rao",
    priority: "Medium",
    status: "Resolved",
    updated: "1d ago",
  },
];

export const knowledgeBase = [
  { title: "Connecting your broker account", cat: "Getting started", reads: "12.4k" },
  { title: "Understanding slippage in backtests", cat: "Backtesting", reads: "8.9k" },
  { title: "Setting daily loss limits", cat: "Risk", reads: "7.1k" },
  { title: "Reading the AI confidence score", cat: "AI Insights", reads: "6.3k" },
  { title: "Exporting tax reports for ITR", cat: "Reports", reads: "5.8k" },
  { title: "Rotating your API keys safely", cat: "Security", reads: "4.2k" },
];

export const activityLog = [
  { action: "Signed in from Chrome · Mumbai, IN", time: "Today, 09:02" },
  { action: "Deployed strategy “Supertrend Momentum” to live", time: "Today, 09:14" },
  { action: "Rotated API key ending ••8f2c", time: "Yesterday, 18:40" },
  { action: "Enabled two-factor authentication", time: "24 Jul 2026, 11:22" },
  { action: "Exported monthly P&L report (PDF)", time: "22 Jul 2026, 20:05" },
];

export const serverHealth = [
  { name: "Execution cluster", value: 98, unit: "% uptime", tone: "bull" as const },
  { name: "Data feed latency", value: 42, unit: "ms p95", tone: "info" as const },
  { name: "Queue depth", value: 7, unit: "jobs", tone: "warn" as const },
  { name: "Error rate", value: 0.03, unit: "%", tone: "bull" as const },
];
