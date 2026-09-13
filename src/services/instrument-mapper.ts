/**
 * Centralized Instrument Mapping Layer for SmartQuant Edge.
 * Maps normalized trader symbols to exchange specific instrument tokens and provider keys.
 */

export interface InstrumentMapping {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  assetClass: "EQUITY" | "INDEX";
  nseToken: string;
  upstoxKey: string;
  dhanToken: string;
  growwKey: string;
  growwSymbol: string;
  lotSize: number;
  tickSize: number;
  basePrice: number;
}

export const WATCHLIST_INSTRUMENTS: InstrumentMapping[] = [
  {
    symbol: "NIFTY 50",
    name: "Nifty 50 Index",
    exchange: "NSE",
    assetClass: "INDEX",
    nseToken: "26000",
    upstoxKey: "NSE_INDEX|Nifty 50",
    dhanToken: "13",
    growwKey: "NSE_NIFTY",
    growwSymbol: "NIFTY",
    lotSize: 25,
    tickSize: 0.05,
    basePrice: 24812.35,
  },
  {
    symbol: "SENSEX",
    name: "BSE Sensex Index",
    exchange: "BSE",
    assetClass: "INDEX",
    nseToken: "1",
    upstoxKey: "BSE_INDEX|SENSEX",
    dhanToken: "51",
    growwKey: "BSE_SENSEX",
    growwSymbol: "SENSEX",
    lotSize: 10,
    tickSize: 0.05,
    basePrice: 81350.2,
  },
  {
    symbol: "BANK NIFTY",
    name: "Nifty Bank Index",
    exchange: "NSE",
    assetClass: "INDEX",
    nseToken: "26009",
    upstoxKey: "NSE_INDEX|Nifty Bank",
    dhanToken: "25",
    growwKey: "NSE_BANKNIFTY",
    growwSymbol: "BANKNIFTY",
    lotSize: 15,
    tickSize: 0.05,
    basePrice: 53104.2,
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    exchange: "NSE",
    assetClass: "EQUITY",
    nseToken: "2885",
    upstoxKey: "NSE_EQ|INE002A01018",
    dhanToken: "1333",
    growwKey: "NSE_RELIANCE",
    growwSymbol: "RELIANCE",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 2984.4,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services Ltd",
    exchange: "NSE",
    assetClass: "EQUITY",
    nseToken: "11536",
    upstoxKey: "NSE_EQ|INE467B01029",
    dhanToken: "11536",
    growwKey: "NSE_TCS",
    growwSymbol: "TCS",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 4128.75,
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    exchange: "NSE",
    assetClass: "EQUITY",
    nseToken: "1594",
    upstoxKey: "NSE_EQ|INE009A01021",
    dhanToken: "1594",
    growwKey: "NSE_INFY",
    growwSymbol: "INFY",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 1892.6,
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    exchange: "NSE",
    assetClass: "EQUITY",
    nseToken: "1333",
    upstoxKey: "NSE_EQ|INE040A01034",
    dhanToken: "1333",
    growwKey: "NSE_HDFCBANK",
    growwSymbol: "HDFCBANK",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 1721.3,
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    exchange: "NSE",
    assetClass: "EQUITY",
    nseToken: "4963",
    upstoxKey: "NSE_EQ|INE090A01021",
    dhanToken: "4963",
    growwKey: "NSE_ICICIBANK",
    growwSymbol: "ICICIBANK",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 1284.05,
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    exchange: "NSE",
    assetClass: "EQUITY",
    nseToken: "3045",
    upstoxKey: "NSE_EQ|INE062A01020",
    dhanToken: "3045",
    growwKey: "NSE_SBIN",
    growwSymbol: "SBIN",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 842.5,
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    exchange: "NSE",
    assetClass: "EQUITY",
    nseToken: "3456",
    upstoxKey: "NSE_EQ|INE155A01022",
    dhanToken: "3456",
    growwKey: "NSE_TATAMOTORS",
    growwSymbol: "TATAMOTORS",
    lotSize: 1,
    tickSize: 0.05,
    basePrice: 978.8,
  },
];

class InstrumentMapper {
  private mapBySymbol = new Map<string, InstrumentMapping>();

  constructor() {
    WATCHLIST_INSTRUMENTS.forEach((inst) => {
      this.mapBySymbol.set(inst.symbol, inst);
    });
  }

  public getMapping(symbol: string): InstrumentMapping | undefined {
    return this.mapBySymbol.get(symbol);
  }

  public getProviderToken(symbol: string, provider: "upstox" | "dhan" | "groww" | "mock"): string {
    const inst = this.getMapping(symbol);
    if (!inst) return symbol;
    if (provider === "groww") return inst.growwKey;
    if (provider === "upstox") return inst.upstoxKey;
    if (provider === "dhan") return inst.dhanToken;
    return inst.nseToken;
  }

  public getAllWatchlist(): InstrumentMapping[] {
    return Array.from(this.mapBySymbol.values());
  }
}

export const instrumentMapper = new InstrumentMapper();
