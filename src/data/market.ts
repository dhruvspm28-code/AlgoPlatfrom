/**
 * Mock market + account data.
 * ---------------------------------------------------------------
 * Single source of truth for every simulated figure in the product.
 * Deterministic (seeded) so charts stay stable between renders/SSR.
 */

/** Tiny deterministic PRNG so server and client render identical series. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface Instrument {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  volume: string;
  rsi: number;
  signal: "BUY" | "SELL" | "HOLD";
}

export const instruments: Instrument[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    sector: "Energy",
    price: 2984.4,
    change: 41.2,
    changePct: 1.4,
    volume: "8.2M",
    rsi: 61.4,
    signal: "BUY",
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Svc",
    sector: "IT",
    price: 4128.75,
    change: -32.1,
    changePct: -0.77,
    volume: "3.1M",
    rsi: 44.8,
    signal: "HOLD",
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    sector: "Financials",
    price: 1721.3,
    change: 18.9,
    changePct: 1.11,
    volume: "12.7M",
    rsi: 58.2,
    signal: "BUY",
  },
  {
    symbol: "INFY",
    name: "Infosys",
    sector: "IT",
    price: 1892.6,
    change: -11.4,
    changePct: -0.6,
    volume: "6.4M",
    rsi: 39.6,
    signal: "SELL",
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank",
    sector: "Financials",
    price: 1284.05,
    change: 22.4,
    changePct: 1.77,
    volume: "14.9M",
    rsi: 66.9,
    signal: "BUY",
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors",
    sector: "Auto",
    price: 987.15,
    change: 34.6,
    changePct: 3.63,
    volume: "22.3M",
    rsi: 71.5,
    signal: "BUY",
  },
  {
    symbol: "SUNPHARMA",
    name: "Sun Pharmaceutical",
    sector: "Pharma",
    price: 1712.9,
    change: -6.2,
    changePct: -0.36,
    volume: "2.8M",
    rsi: 48.1,
    signal: "HOLD",
  },
  {
    symbol: "ADANIPORTS",
    name: "Adani Ports & SEZ",
    sector: "Infra",
    price: 1416.5,
    change: -28.7,
    changePct: -1.99,
    volume: "9.6M",
    rsi: 33.2,
    signal: "SELL",
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance",
    sector: "Financials",
    price: 7241.8,
    change: 96.5,
    changePct: 1.35,
    volume: "1.9M",
    rsi: 63.7,
    signal: "BUY",
  },
  {
    symbol: "LT",
    name: "Larsen & Toubro",
    sector: "Infra",
    price: 3624.2,
    change: 12.8,
    changePct: 0.35,
    volume: "4.2M",
    rsi: 55.4,
    signal: "HOLD",
  },
  {
    symbol: "WIPRO",
    name: "Wipro",
    sector: "IT",
    price: 542.35,
    change: -8.9,
    changePct: -1.61,
    volume: "11.4M",
    rsi: 36.9,
    signal: "SELL",
  },
  {
    symbol: "MARUTI",
    name: "Maruti Suzuki",
    sector: "Auto",
    price: 12894.0,
    change: 214.5,
    changePct: 1.69,
    volume: "0.9M",
    rsi: 68.3,
    signal: "BUY",
  },
];

export const indices = [
  { name: "NIFTY 50", value: 24812.35, change: 186.4, changePct: 0.76 },
  { name: "SENSEX", value: 81428.9, change: 542.1, changePct: 0.67 },
  { name: "BANK NIFTY", value: 53104.2, change: -128.6, changePct: -0.24 },
  { name: "INDIA VIX", value: 12.84, change: -0.62, changePct: -4.61 },
];

/** Intraday price series used by the animated hero chart + watchlist sparklines. */
export function priceSeries(points = 90, base = 2400, seed = 7) {
  const rand = seeded(seed);
  let price = base;
  return Array.from({ length: points }, (_, i) => {
    price += (rand() - 0.46) * base * 0.012;
    return {
      t: i,
      label: `${9 + Math.floor((i / points) * 6)}:${String(Math.floor((i * 60) / points) % 60).padStart(2, "0")}`,
      price: Number(price.toFixed(2)),
      benchmark: Number((base + (i / points) * base * 0.04).toFixed(2)),
      volume: Number((rand() * 100 + 20).toFixed(0)),
    };
  });
}

/** Long-horizon equity curve for backtesting / portfolio performance. */
export function equityCurve(months = 36, start = 100000, seed = 21) {
  const rand = seeded(seed);
  let equity = start;
  let peak = start;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return Array.from({ length: months }, (_, i) => {
    equity *= 1 + (rand() - 0.36) * 0.09;
    peak = Math.max(peak, equity);
    const benchmark = start * Math.pow(1.009, i);
    return {
      label: `${monthNames[i % 12]} ${24 + Math.floor(i / 12)}`,
      equity: Number(equity.toFixed(0)),
      benchmark: Number(benchmark.toFixed(0)),
      drawdown: Number((((equity - peak) / peak) * 100).toFixed(2)),
    };
  });
}

export interface Trade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  entry: number;
  exit: number;
  pnl: number;
  strategy: string;
  time: string;
  status: "CLOSED" | "OPEN" | "PENDING";
}

export const recentTrades: Trade[] = [
  {
    id: "TRD-90412",
    symbol: "TATAMOTORS",
    side: "BUY",
    qty: 150,
    entry: 954.2,
    exit: 987.15,
    pnl: 4942.5,
    strategy: "Supertrend Momentum",
    time: "10:42",
    status: "CLOSED",
  },
  {
    id: "TRD-90411",
    symbol: "INFY",
    side: "SELL",
    qty: 80,
    entry: 1908.4,
    exit: 1892.6,
    pnl: 1264.0,
    strategy: "RSI Mean Reversion",
    time: "10:18",
    status: "CLOSED",
  },
  {
    id: "TRD-90410",
    symbol: "HDFCBANK",
    side: "BUY",
    qty: 220,
    entry: 1702.4,
    exit: 1721.3,
    pnl: 4158.0,
    strategy: "EMA Crossover Pro",
    time: "09:58",
    status: "CLOSED",
  },
  {
    id: "TRD-90409",
    symbol: "ADANIPORTS",
    side: "BUY",
    qty: 100,
    entry: 1445.2,
    exit: 1416.5,
    pnl: -2870.0,
    strategy: "Breakout Hunter",
    time: "09:41",
    status: "CLOSED",
  },
  {
    id: "TRD-90408",
    symbol: "ICICIBANK",
    side: "BUY",
    qty: 300,
    entry: 1261.65,
    exit: 1284.05,
    pnl: 6720.0,
    strategy: "MACD Trend Rider",
    time: "09:32",
    status: "CLOSED",
  },
  {
    id: "TRD-90407",
    symbol: "WIPRO",
    side: "SELL",
    qty: 400,
    entry: 551.25,
    exit: 542.35,
    pnl: 3560.0,
    strategy: "Bollinger Squeeze",
    time: "09:24",
    status: "CLOSED",
  },
];

export const openPositions = [
  {
    symbol: "RELIANCE",
    side: "LONG" as const,
    qty: 120,
    avg: 2941.0,
    ltp: 2984.4,
    pnl: 5208,
    pnlPct: 1.48,
    strategy: "EMA Crossover Pro",
  },
  {
    symbol: "BAJFINANCE",
    side: "LONG" as const,
    qty: 25,
    avg: 7098.5,
    ltp: 7241.8,
    pnl: 3582.5,
    pnlPct: 2.02,
    strategy: "Supertrend Momentum",
  },
  {
    symbol: "SUNPHARMA",
    side: "SHORT" as const,
    qty: 60,
    avg: 1738.0,
    ltp: 1712.9,
    pnl: 1506,
    pnlPct: 1.44,
    strategy: "RSI Mean Reversion",
  },
  {
    symbol: "MARUTI",
    side: "LONG" as const,
    qty: 8,
    avg: 12960.0,
    ltp: 12894.0,
    pnl: -528,
    pnlPct: -0.51,
    strategy: "Breakout Hunter",
  },
];

export const activeOrders = [
  {
    id: "ORD-55231",
    symbol: "TCS",
    type: "LIMIT",
    side: "BUY" as const,
    qty: 40,
    price: 4100.0,
    filled: 0,
    status: "OPEN",
  },
  {
    id: "ORD-55230",
    symbol: "LT",
    type: "SL-M",
    side: "SELL" as const,
    qty: 30,
    price: 3580.0,
    filled: 0,
    status: "TRIGGER PENDING",
  },
  {
    id: "ORD-55229",
    symbol: "ICICIBANK",
    type: "MARKET",
    side: "BUY" as const,
    qty: 100,
    price: 1284.05,
    filled: 65,
    status: "PARTIAL",
  },
];

export const holdings = [
  { symbol: "RELIANCE", qty: 120, avg: 2712.4, ltp: 2984.4, sector: "Energy" },
  { symbol: "HDFCBANK", qty: 220, avg: 1584.1, ltp: 1721.3, sector: "Financials" },
  { symbol: "TCS", qty: 60, avg: 3894.0, ltp: 4128.75, sector: "IT" },
  { symbol: "BAJFINANCE", qty: 25, avg: 6702.0, ltp: 7241.8, sector: "Financials" },
  { symbol: "MARUTI", qty: 8, avg: 11480.0, ltp: 12894.0, sector: "Auto" },
  { symbol: "SUNPHARMA", qty: 90, avg: 1490.2, ltp: 1712.9, sector: "Pharma" },
].map((h) => ({
  ...h,
  invested: h.qty * h.avg,
  current: h.qty * h.ltp,
  pnl: h.qty * (h.ltp - h.avg),
  pnlPct: ((h.ltp - h.avg) / h.avg) * 100,
}));

export const allocation = [
  { name: "Financials", value: 38, fill: "var(--color-chart-1)" },
  { name: "IT", value: 22, fill: "var(--color-chart-2)" },
  { name: "Energy", value: 18, fill: "var(--color-chart-3)" },
  { name: "Auto", value: 12, fill: "var(--color-chart-5)" },
  { name: "Pharma", value: 10, fill: "var(--color-chart-4)" },
];

export const monthlyReturns = [
  { month: "Jan", ret: 4.2 },
  { month: "Feb", ret: -1.8 },
  { month: "Mar", ret: 6.1 },
  { month: "Apr", ret: 2.9 },
  { month: "May", ret: -3.4 },
  { month: "Jun", ret: 7.8 },
  { month: "Jul", ret: 5.2 },
  { month: "Aug", ret: 1.1 },
  { month: "Sep", ret: -2.2 },
  { month: "Oct", ret: 8.4 },
  { month: "Nov", ret: 3.7 },
  { month: "Dec", ret: 5.9 },
];

export const notifications = [
  {
    id: 1,
    title: "Supertrend Momentum fired a BUY",
    body: "TATAMOTORS · 150 qty @ ₹954.20",
    time: "2m ago",
    tone: "bull" as const,
  },
  {
    id: 2,
    title: "Stop-loss hit on ADANIPORTS",
    body: "Loss capped at ₹2,870 (0.4% of capital)",
    time: "18m ago",
    tone: "bear" as const,
  },
  {
    id: 3,
    title: "Backtest completed",
    body: "Bollinger Squeeze · 5y · Sharpe 1.94",
    time: "1h ago",
    tone: "info" as const,
  },
  {
    id: 4,
    title: "Broker session refreshed",
    body: "Zerodha Kite token valid until 03:30 IST",
    time: "3h ago",
    tone: "info" as const,
  },
];

export const orderHistory = [
  {
    id: "ORD-55228",
    symbol: "TATAMOTORS",
    side: "BUY" as const,
    qty: 150,
    price: 954.2,
    time: "09:41:22",
    status: "COMPLETE",
  },
  {
    id: "ORD-55227",
    symbol: "TATAMOTORS",
    side: "SELL" as const,
    qty: 150,
    price: 987.15,
    time: "10:42:07",
    status: "COMPLETE",
  },
  {
    id: "ORD-55226",
    symbol: "WIPRO",
    side: "SELL" as const,
    qty: 400,
    price: 551.25,
    time: "09:24:51",
    status: "COMPLETE",
  },
  {
    id: "ORD-55225",
    symbol: "YESBANK",
    side: "BUY" as const,
    qty: 2000,
    price: 21.4,
    time: "09:19:03",
    status: "REJECTED",
  },
  {
    id: "ORD-55224",
    symbol: "INFY",
    side: "SELL" as const,
    qty: 80,
    price: 1908.4,
    time: "09:16:44",
    status: "COMPLETE",
  },
];
