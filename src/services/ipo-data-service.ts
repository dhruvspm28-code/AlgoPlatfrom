/**
 * IPO Intelligence Data Service for SmartQuant Edge.
 * Manages upcoming, open, closed, and listed IPO datasets, subscription tracker,
 * financial metrics, and user watchlists.
 */

import { DatabasePersistence } from "./db-persistence";

export interface IPODetails {
  id: string;
  symbol: string;
  companyName: string;
  category: "OPEN" | "UPCOMING" | "CLOSED" | "LISTED";
  priceBandMin: number;
  priceBandMax: number;
  lotSize: number;
  issueSizeCr: number;
  freshIssueCr: number;
  ofsCr: number;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listingDate: string;
  exchange: "NSE & BSE" | "NSE SME" | "BSE SME";
  subscription?: {
    retailX: number;
    niiX: number;
    qibX: number;
    employeeX?: number;
    overallX: number;
    updatedAt: string;
  };
  financials?: {
    revenueGrowthPct: number;
    profitGrowthPct: number;
    eps: number;
    peRatio: number;
    roePct: number;
    debtToEquity: number;
    ebitdaMarginPct: number;
  };
  riskScore: {
    overall: "LOW" | "MEDIUM" | "HIGH";
    overallScore: number; // 0 to 100
    valuationScore: number;
    debtScore: number;
    profitScore: number;
    demandScore: number;
  };
}

export const INITIAL_IPO_DATA: IPODetails[] = [
  {
    id: "ipo-101",
    symbol: "QUANTUMTECH",
    companyName: "QuantumTech Solutions India Ltd",
    category: "OPEN",
    priceBandMin: 450,
    priceBandMax: 475,
    lotSize: 31,
    issueSizeCr: 1250,
    freshIssueCr: 800,
    ofsCr: 450,
    openDate: "2026-08-08",
    closeDate: "2026-08-11",
    allotmentDate: "2026-08-13",
    listingDate: "2026-08-16",
    exchange: "NSE & BSE",
    subscription: {
      retailX: 4.82,
      niiX: 8.31,
      qibX: 12.45,
      employeeX: 2.1,
      overallX: 7.64,
      updatedAt: "2026-08-09T16:30:00.000Z",
    },
    financials: {
      revenueGrowthPct: 34.2,
      profitGrowthPct: 42.8,
      eps: 18.5,
      peRatio: 25.6,
      roePct: 22.4,
      debtToEquity: 0.18,
      ebitdaMarginPct: 24.8,
    },
    riskScore: {
      overall: "LOW",
      overallScore: 78,
      valuationScore: 72,
      debtScore: 90,
      profitScore: 84,
      demandScore: 78,
    },
  },
  {
    id: "ipo-102",
    symbol: "NEXGENFIN",
    companyName: "NexGen Financial Services Ltd",
    category: "UPCOMING",
    priceBandMin: 210,
    priceBandMax: 225,
    lotSize: 65,
    issueSizeCr: 850,
    freshIssueCr: 500,
    ofsCr: 350,
    openDate: "2026-08-14",
    closeDate: "2026-08-18",
    allotmentDate: "2026-08-20",
    listingDate: "2026-08-23",
    exchange: "NSE & BSE",
    financials: {
      revenueGrowthPct: 18.5,
      profitGrowthPct: 12.1,
      eps: 8.2,
      peRatio: 27.4,
      roePct: 14.2,
      debtToEquity: 1.45,
      ebitdaMarginPct: 16.5,
    },
    riskScore: {
      overall: "MEDIUM",
      overallScore: 58,
      valuationScore: 52,
      debtScore: 48,
      profitScore: 62,
      demandScore: 68,
    },
  },
  {
    id: "ipo-103",
    symbol: "AEROCORE",
    companyName: "AeroCore Precision Components Ltd",
    category: "LISTED",
    priceBandMin: 620,
    priceBandMax: 650,
    lotSize: 22,
    issueSizeCr: 2100,
    freshIssueCr: 1500,
    ofsCr: 600,
    openDate: "2026-07-20",
    closeDate: "2026-07-23",
    allotmentDate: "2026-07-26",
    listingDate: "2026-07-29",
    exchange: "NSE & BSE",
    subscription: {
      retailX: 18.4,
      niiX: 42.1,
      qibX: 88.5,
      overallX: 48.2,
      updatedAt: "2026-07-23T17:00:00.000Z",
    },
    financials: {
      revenueGrowthPct: 48.6,
      profitGrowthPct: 61.2,
      eps: 32.4,
      peRatio: 38.2,
      roePct: 28.5,
      debtToEquity: 0.08,
      ebitdaMarginPct: 31.2,
    },
    riskScore: {
      overall: "LOW",
      overallScore: 86,
      valuationScore: 78,
      debtScore: 94,
      profitScore: 92,
      demandScore: 96,
    },
  },
];

class IPODataService {
  private ipos: IPODetails[] = [];
  private watchlist = new Set<string>();

  constructor() {
    this.ipos = DatabasePersistence.getItem<IPODetails[]>("ipo_data_list", INITIAL_IPO_DATA);
    const savedWatchlist = DatabasePersistence.getItem<string[]>("ipo_watchlist", ["ipo-101"]);
    savedWatchlist.forEach((id) => this.watchlist.add(id));
  }

  private save() {
    DatabasePersistence.setItem("ipo_data_list", this.ipos);
    DatabasePersistence.setItem("ipo_watchlist", Array.from(this.watchlist));
  }

  public getAllIPOs(): IPODetails[] {
    return [...this.ipos];
  }

  public getIPOById(id: string): IPODetails | undefined {
    return this.ipos.find((i) => i.id === id);
  }

  public toggleWatchlist(id: string): boolean {
    if (this.watchlist.has(id)) {
      this.watchlist.delete(id);
    } else {
      this.watchlist.add(id);
    }
    this.save();
    return this.watchlist.has(id);
  }

  public isInWatchlist(id: string): boolean {
    return this.watchlist.has(id);
  }

  public getWatchlistIPOs(): IPODetails[] {
    return this.ipos.filter((i) => this.watchlist.has(i.id));
  }
}

export const ipoDataService = new IPODataService();
