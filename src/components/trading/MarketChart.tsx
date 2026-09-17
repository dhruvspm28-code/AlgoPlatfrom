/**
 * MarketChart Component for SmartQuant Edge.
 * Unifies institutional Candlestick & Volume chart with all timeframes:
 * 1D, 1W, 1M, 3M, 6M, 1Y, live Groww candle merging, crosshair, and indicator overlays.
 */

import { TradingChart, type TradingChartProps } from "./TradingChart";

export type MarketChartProps = TradingChartProps;

export function MarketChart(props: MarketChartProps) {
  return <TradingChart {...props} />;
}

export default MarketChart;
