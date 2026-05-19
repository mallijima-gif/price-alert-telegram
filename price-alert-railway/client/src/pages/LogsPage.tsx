import { trpc } from "@/lib/trpc";
import { RefreshCw, ClockIcon, TrendingUp, TrendingDown } from "lucide-react";

const MARKET_LABELS: Record<string, string> = { KR: "🇰🇷 국장", US: "🇺🇸 미장", COIN: "🪙 코인" };
const MARKET_COLORS: Record<string, string> = {
  KR: "oklch(0.78 0.25 145)",
  US: "oklch(0.75 0.25 195)",
  COIN: "oklch(0.72 0.28 330)",
};

export default function LogsPage() {
  const { data: logs = [], isLoading, refetch, isFetching } = trpc.logs.list.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-widest neon-text-cyan" style={{ fontFamily: "Orbitron, sans-serif" }}>
            ALERT HISTORY
          </h1>
          <p className="text-xs font-mono mt-1" style={{ color: "oklch(0.55 0.06 220)" }}>
            발송된 알림 이력 조회
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all"
          style={{ border: "1px solid oklch(0.75 0.25 195 / 0.4)", color: "oklch(0.75 0.25 195)", background: "oklch(0.75 0.25 195 / 0.05)" }}
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </div>

      <div className="tech-line" />

      {isLoading ? (
        <div className="text-center py-12 font-mono text-sm" style={{ color: "oklch(0.55 0.06 220)" }}>
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: "oklch(0.75 0.25 195)" }} />
          LOADING...
        </div>
      ) : logs.length === 0 ? (
        <div className="hud-box hud-box-cyan p-12 text-center">
          <ClockIcon className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "oklch(0.75 0.25 195)" }} />
          <p className="font-mono text-sm" style={{ color: "oklch(0.45 0.04 220)" }}>
            발송된 알림 이력이 없습니다<br />
            <span className="text-xs">알림 조건이 충족되면 여기에 기록됩니다</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-mono" style={{ color: "oklch(0.45 0.04 220)" }}>
            <div className="col-span-2">시장</div>
            <div className="col-span-2">종목</div>
            <div className="col-span-2">조건</div>
            <div className="col-span-2">목표가</div>
            <div className="col-span-2">발동가</div>
            <div className="col-span-2">발동 시각</div>
          </div>
          <div className="tech-line" />

          {logs.map((log) => {
            const marketColor = MARKET_COLORS[log.market] ?? "oklch(0.75 0.25 195)";
            const isAbove = log.condition === "above";
            const targetNum = parseFloat(log.targetPrice);
            const triggeredNum = parseFloat(log.triggeredPrice);
            const diff = ((triggeredNum - targetNum) / targetNum * 100).toFixed(2);

            return (
              <div
                key={log.id}
                className="hud-box grid grid-cols-12 gap-2 px-4 py-3 items-center transition-all hover:bg-white/2"
                style={{ borderColor: `${marketColor}30` }}
              >
                <div className="col-span-2">
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${marketColor}15`, color: marketColor, border: `1px solid ${marketColor}30` }}>
                    {MARKET_LABELS[log.market] ?? log.market}
                  </span>
                </div>
                <div className="col-span-2 font-black text-sm tracking-wider" style={{ color: marketColor, fontFamily: "Orbitron, sans-serif" }}>
                  {log.symbol}
                </div>
                <div className="col-span-2 flex items-center gap-1 text-xs font-mono">
                  {isAbove
                    ? <><TrendingUp className="w-3 h-3" style={{ color: "oklch(0.78 0.25 145)" }} /><span style={{ color: "oklch(0.78 0.25 145)" }}>이상</span></>
                    : <><TrendingDown className="w-3 h-3" style={{ color: "oklch(0.72 0.28 330)" }} /><span style={{ color: "oklch(0.72 0.28 330)" }}>이하</span></>}
                </div>
                <div className="col-span-2 text-xs font-mono" style={{ color: "oklch(0.65 0.06 220)" }}>
                  {targetNum.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-mono" style={{ color: "oklch(0.88 0.22 95)" }}>
                    {triggeredNum.toLocaleString("ko-KR", { maximumFractionDigits: 8 })}
                  </span>
                  <span className="text-xs font-mono ml-1" style={{ color: isAbove ? "oklch(0.78 0.25 145)" : "oklch(0.72 0.28 330)" }}>
                    ({isAbove ? "+" : ""}{diff}%)
                  </span>
                </div>
                <div className="col-span-2 text-xs font-mono" style={{ color: "oklch(0.45 0.04 220)" }}>
                  {new Date(log.sentAt).toLocaleString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {logs.length > 0 && (
        <p className="text-xs font-mono text-center" style={{ color: "oklch(0.35 0.03 260)" }}>
          최근 {logs.length}건 표시 중
        </p>
      )}
    </div>
  );
}
