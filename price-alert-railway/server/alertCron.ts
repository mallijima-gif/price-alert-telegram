/**
 * Alert Cron — standalone version using node-cron.
 * Fetches prices on a configurable schedule and fires Telegram alerts.
 */

import cron from "node-cron";
import { getAllActiveAlerts, createAlertLog, deleteAlertById } from "./db";
import { fetchPrice, Market } from "./priceService";
import { sendPriceAlert, isTelegramConfigured } from "./telegramService";

let isRunning = false;

const PRICE_FETCH_CONCURRENCY = Math.max(
  1,
  parseInt(process.env.PRICE_FETCH_CONCURRENCY ?? "5", 10) || 5
);
const CRON_SCHEDULE = process.env.ALERT_CRON_SCHEDULE ?? "*/10 * * * *";

function priceKey(symbol: string, market: string): string {
  return `${market}:${symbol.trim().toUpperCase()}`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

export async function runPriceCheck(): Promise<{
  checked: number;
  fired: number;
  errors: string[];
}> {
  if (isRunning) {
    return { checked: 0, fired: 0, errors: ["Previous check still running, skipped."] };
  }
  isRunning = true;
  const errors: string[] = [];
  let checked = 0;
  let fired = 0;

  try {
    const activeAlerts = await getAllActiveAlerts();
    checked = activeAlerts.length;
    if (activeAlerts.length === 0) return { checked: 0, fired: 0, errors: [] };

    console.log(`[AlertCron] Checking ${activeAlerts.length} alert(s)...`);

    const uniquePriceItems = Array.from(
      new Map(
        activeAlerts.map((alert) => [
          priceKey(alert.symbol, alert.market),
          { symbol: alert.symbol, market: alert.market as Market },
        ])
      ).values()
    );

    const priceResults = await mapWithConcurrency(
      uniquePriceItems,
      PRICE_FETCH_CONCURRENCY,
      (item) => fetchPrice(item.symbol, item.market)
    );

    const pricesByKey = new Map(
      priceResults.map((result) => [priceKey(result.symbol, result.market), result])
    );

    for (const alert of activeAlerts) {
      try {
        const { price, error } = pricesByKey.get(priceKey(alert.symbol, alert.market)) ?? {
          price: null,
          error: "Price result missing",
        };

        if (price === null) {
          const msg = `Could not fetch price for ${alert.symbol} (${alert.market}): ${error}`;
          console.warn(`[AlertCron] ${msg}`);
          errors.push(msg);
          continue;
        }

        const target = parseFloat(alert.targetPrice);
        const triggered =
          (alert.condition === "above" && price >= target) ||
          (alert.condition === "below" && price <= target);

        if (!triggered) continue;

        console.log(
          `[AlertCron] TRIGGERED: ${alert.symbol} @ ${price} (target: ${target}, cond: ${alert.condition})`
        );

        let sent = false;
        if (isTelegramConfigured()) {
          sent = await sendPriceAlert({
            symbol: alert.symbol,
            market: alert.market,
            targetPrice: alert.targetPrice,
            currentPrice: price,
            condition: alert.condition,
          });
        } else {
          console.warn("[AlertCron] Telegram not configured; logging to DB only.");
          sent = true;
        }

        if (sent) {
          await createAlertLog({
            alertId: alert.id,
            userId: alert.userId,
            symbol: alert.symbol,
            market: alert.market,
            targetPrice: alert.targetPrice,
            triggeredPrice: String(price),
            condition: alert.condition,
          });
          await deleteAlertById(alert.id);
          fired++;
        } else {
          errors.push(`Telegram send failed for alert ${alert.id} (${alert.symbol})`);
        }
      } catch (alertErr) {
        const msg = `Error processing alert ${alert.id}: ${String(alertErr)}`;
        console.error(`[AlertCron] ${msg}`);
        errors.push(msg);
      }
    }
  } finally {
    isRunning = false;
  }

  return { checked, fired, errors };
}

/** Start the price-check cron job (call once at server startup). */
export function startCron(): void {
  cron.schedule(CRON_SCHEDULE, async () => {
    const result = await runPriceCheck();
    if (result.fired > 0 || result.errors.length > 0) {
      console.log("[AlertCron] Result:", result);
    }
  });
  console.log(`[AlertCron] Cron started (${CRON_SCHEDULE})`);
}
