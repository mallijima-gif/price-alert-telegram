/**
 * Price Service — standalone version (no Manus dependency)
 * Uses public Yahoo Finance v8 chart API (no API key required)
 * - COIN : BTC / BTCUSDT  → BTC-USD
 * - US   : AAPL, TSLA     → AAPL
 * - KR   : 005930         → 005930.KS (fallback .KQ)
 */

import axios from "axios";

export type Market = "KR" | "US" | "COIN";

export interface PriceResult {
  symbol: string;
  market: Market;
  price: number | null;
  error?: string;
}

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

async function fetchYahooPrice(yahooSymbol: string): Promise<number | null> {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}`;
    const { data } = await axios.get(url, {
      params: { interval: "1d", range: "5d" },
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      timeout: 10000,
    });
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    return (result.meta?.regularMarketPrice as number) ?? null;
  } catch (e) {
    console.error(`[PriceService] Yahoo ${yahooSymbol}:`, (e as Error).message);
    return null;
  }
}

function toCoinYahooSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  const base = upper.endsWith("USDT") ? upper.slice(0, -4) : upper;
  return `${base}-USD`;
}

async function fetchCoinPrice(symbol: string): Promise<number | null> {
  return fetchYahooPrice(toCoinYahooSymbol(symbol));
}

async function fetchUSPrice(symbol: string): Promise<number | null> {
  return fetchYahooPrice(symbol.toUpperCase());
}

async function fetchKRPrice(symbol: string): Promise<number | null> {
  let price = await fetchYahooPrice(`${symbol}.KS`);
  if (price !== null) return price;
  price = await fetchYahooPrice(`${symbol}.KQ`);
  return price;
}

export async function fetchPrice(symbol: string, market: Market): Promise<PriceResult> {
  let price: number | null = null;
  let error: string | undefined;
  try {
    if (market === "COIN") price = await fetchCoinPrice(symbol);
    else if (market === "US") price = await fetchUSPrice(symbol);
    else price = await fetchKRPrice(symbol);
    if (price === null) error = "가격 조회 실패";
  } catch (e) {
    error = String(e);
  }
  return { symbol, market, price, error };
}

export async function fetchPrices(
  items: { symbol: string; market: Market }[]
): Promise<PriceResult[]> {
  return Promise.all(items.map(({ symbol, market }) => fetchPrice(symbol, market)));
}
