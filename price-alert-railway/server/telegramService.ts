/**
 * Telegram Bot Service — standalone version
 */

import axios from "axios";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const TELEGRAM_MIN_INTERVAL_MS = Math.max(
  1000,
  parseInt(process.env.TELEGRAM_MIN_INTERVAL_MS ?? "1100", 10) || 1100
);

let lastSendAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTelegramSlot(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, lastSendAt + TELEGRAM_MIN_INTERVAL_MS - now);
  if (waitMs > 0) await sleep(waitMs);
  lastSendAt = Date.now();
}

function getRetryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  const retryAfter = error.response?.data?.parameters?.retry_after;
  return typeof retryAfter === "number" ? (retryAfter + 1) * 1000 : null;
}

export function isTelegramConfigured(): boolean {
  return BOT_TOKEN.length > 0 && CHAT_ID.length > 0;
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false;
  try {
    await waitForTelegramSlot();
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      { chat_id: CHAT_ID, text, parse_mode: "HTML" },
      { timeout: 10000 }
    );
    return true;
  } catch (e) {
    const retryAfterMs = getRetryAfterMs(e);
    if (retryAfterMs !== null) {
      console.warn(`[Telegram] rate limited; retrying after ${retryAfterMs}ms`);
      await sleep(retryAfterMs);
      return sendTelegramMessage(text);
    }
    console.error("[Telegram] send failed:", (e as Error).message);
    return false;
  }
}

const MARKET_LABELS: Record<string, string> = {
  KR: "🇰🇷 국장",
  US: "🇺🇸 미장",
  COIN: "🪙 코인",
};

export async function sendPriceAlert(params: {
  symbol: string;
  market: string;
  targetPrice: string;
  currentPrice: number;
  condition: string;
}): Promise<boolean> {
  const { symbol, market, targetPrice, currentPrice, condition } = params;
  const label = MARKET_LABELS[market] ?? market;
  const condText = condition === "above" ? "이상 도달" : "이하 도달";
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const msg = [
    `🚨 <b>가격 알림 발동!</b>`,
    ``,
    `📌 종목: <b>${symbol}</b> (${label})`,
    `🎯 목표가: ${Number(targetPrice).toLocaleString()}`,
    `💰 현재가: <b>${currentPrice.toLocaleString()}</b>`,
    `📊 조건: ${condText}`,
    `🕐 시각: ${now}`,
  ].join("\n");

  return sendTelegramMessage(msg);
}

export async function testTelegramConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isTelegramConfigured()) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 설정되지 않았습니다." };
  }
  try {
    const res = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
      { timeout: 10000 }
    );
    return { ok: res.data?.ok === true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
