import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, XCircle, Send, Activity, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { data: telegramStatus } = trpc.settings.telegramStatus.useQuery();
  const { data: runtimeConfig } = trpc.settings.runtimeConfig.useQuery();
  const testTelegram = trpc.settings.sendTestMessage.useMutation({
    onSuccess: (res) => {
      if (res.ok) toast.success("✅ 텔레그램 연결 정상");
      else toast.error(`❌ ${res.error ?? "연결 실패"}`);
    },
    onError: (e: { message: string }) => toast.error(`오류: ${e.message}`),
  });

  const isConfigured = telegramStatus?.ok ?? false;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-widest" style={{ fontFamily: "Orbitron, sans-serif", color: "oklch(0.88 0.22 95)", textShadow: "0 0 14px oklch(0.88 0.22 95 / 0.5)" }}>
          SYSTEM CONFIG
        </h1>
        <p className="text-xs font-mono mt-1" style={{ color: "oklch(0.55 0.06 220)" }}>
          텔레그램 봇 및 크론 잡 상태 확인
        </p>
      </div>

      <div className="tech-line" />

      {/* Telegram Status */}
      <div className="hud-box p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4" style={{ color: "oklch(0.75 0.25 195)" }} />
          <h2 className="font-bold tracking-widest text-sm font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>
            TELEGRAM BOT
          </h2>
        </div>
        <div className="tech-line" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.78 0.25 145)" }} />
            ) : (
              <XCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.28 25)" }} />
            )}
            <span className="text-sm font-mono" style={{ color: isConfigured ? "oklch(0.78 0.25 145)" : "oklch(0.65 0.28 25)" }}>
              {isConfigured ? "연결 정상" : (telegramStatus?.error ?? "환경변수 미설정")}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => testTelegram.mutate()}
            disabled={testTelegram.isPending}
            className="font-mono text-xs"
            style={{
              background: "oklch(0.75 0.25 195 / 0.1)",
              border: "1px solid oklch(0.75 0.25 195 / 0.5)",
              color: "oklch(0.75 0.25 195)",
            }}
          >
            {testTelegram.isPending ? "전송 중..." : "[ 연결 테스트 ]"}
          </Button>
        </div>

        <div className="space-y-2 text-xs font-mono" style={{ color: "oklch(0.45 0.04 220)" }}>
          <div className="flex justify-between">
            <span>TELEGRAM_BOT_TOKEN</span>
            <span style={{ color: isConfigured ? "oklch(0.78 0.25 145)" : "oklch(0.65 0.28 25)" }}>
              {isConfigured ? "● SET" : "○ NOT SET"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>TELEGRAM_CHAT_ID</span>
            <span style={{ color: isConfigured ? "oklch(0.78 0.25 145)" : "oklch(0.65 0.28 25)" }}>
              {isConfigured ? "● SET" : "○ NOT SET"}
            </span>
          </div>
        </div>
      </div>

      {/* Cron Status */}
      <div className="hud-box hud-box-cyan p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: "oklch(0.72 0.28 330)" }} />
          <h2 className="font-bold tracking-widest text-sm font-mono" style={{ color: "oklch(0.72 0.28 330)" }}>
            CRON JOB STATUS
          </h2>
        </div>
        <div className="tech-line" />

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center">
            <span style={{ color: "oklch(0.45 0.04 220)" }}>실행 상태</span>
            <div className="flex items-center gap-1.5">
              <span className="status-dot active" />
              <span style={{ color: "oklch(0.78 0.25 145)" }}>RUNNING (node-cron)</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "oklch(0.45 0.04 220)" }}>체크 주기</span>
            <span style={{ color: "oklch(0.88 0.22 95)" }}>
              {runtimeConfig?.alertCronSchedule ?? "*/5 * * * *"}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "oklch(0.45 0.04 220)" }}>가격 조회 동시성</span>
            <span style={{ color: "oklch(0.88 0.22 95)" }}>
              {runtimeConfig?.priceFetchConcurrency ?? 5}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "oklch(0.45 0.04 220)" }}>텔레그램 전송 간격</span>
            <span style={{ color: "oklch(0.88 0.22 95)" }}>
              {runtimeConfig?.telegramMinIntervalMs ?? 1100}ms
            </span>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="hud-box p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 neon-text-pink" />
          <h2 className="font-bold tracking-widest text-sm font-mono neon-text-pink">
            SETUP GUIDE
          </h2>
        </div>
        <div className="tech-line" />

        <div className="space-y-3 text-xs font-mono">
          <div className="space-y-1">
            <p style={{ color: "oklch(0.75 0.25 195)" }}>① BotFather에서 봇 생성</p>
            <p style={{ color: "oklch(0.45 0.04 220)" }}>텔레그램에서 @BotFather 검색 → /newbot → 봇 이름 설정 → 토큰 복사</p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "oklch(0.75 0.25 195)" }}>② Chat ID 확인</p>
            <p style={{ color: "oklch(0.45 0.04 220)" }}>봇에게 메시지 전송 후 아래 URL 접속:</p>
            <code className="block px-2 py-1 rounded text-xs" style={{ background: "oklch(0.06 0.01 260)", color: "oklch(0.88 0.22 95)", border: "1px solid oklch(0.22 0.04 260)" }}>
              https://api.telegram.org/bot{"<TOKEN>"}/getUpdates
            </code>
          </div>
          <div className="space-y-1">
            <p style={{ color: "oklch(0.75 0.25 195)" }}>③ Railway 환경변수 설정</p>
            <div className="px-2 py-2 rounded space-y-1" style={{ background: "oklch(0.06 0.01 260)", border: "1px solid oklch(0.22 0.04 260)" }}>
              <p style={{ color: "oklch(0.88 0.22 95)" }}>TELEGRAM_BOT_TOKEN=1234567890:ABCdef...</p>
              <p style={{ color: "oklch(0.88 0.22 95)" }}>TELEGRAM_CHAT_ID=123456789</p>
            </div>
          </div>
          <div className="space-y-1">
            <p style={{ color: "oklch(0.75 0.25 195)" }}>④ 종목 코드 형식</p>
            <div className="px-2 py-2 rounded space-y-1" style={{ background: "oklch(0.06 0.01 260)", border: "1px solid oklch(0.22 0.04 260)" }}>
              <p style={{ color: "oklch(0.78 0.25 145)" }}>🇰🇷 국장: 005930 (삼성전자), 000660 (SK하이닉스)</p>
              <p style={{ color: "oklch(0.75 0.25 195)" }}>🇺🇸 미장: AAPL, TSLA, NVDA, MSFT</p>
              <p style={{ color: "oklch(0.72 0.28 330)" }}>🪙 코인: BTC, ETH, SOL, XRP (USDT 기준)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
