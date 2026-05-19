import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Zap, TrendingUp, TrendingDown, Activity, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Market = "KR" | "US" | "COIN";
type Condition = "above" | "below";

const MARKET_LABELS: Record<Market, string> = { KR: "🇰🇷 국장", US: "🇺🇸 미장", COIN: "🪙 코인" };
const MARKET_COLORS: Record<Market, string> = {
  KR: "oklch(0.78 0.25 145)",
  US: "oklch(0.75 0.25 195)",
  COIN: "oklch(0.72 0.28 330)",
};

const MARKET_HINTS: Record<Market, string> = {
  KR: "예: 005930 (삼성전자), 000660 (SK하이닉스)",
  US: "예: AAPL, TSLA, NVDA",
  COIN: "예: BTC, ETH, SOL (USDT 기준)",
};

interface AlertFormData {
  symbol: string;
  market: Market;
  targetPrice: string;
  condition: Condition;
}

const defaultForm: AlertFormData = {
  symbol: "",
  market: "COIN",
  targetPrice: "",
  condition: "above",
};

export default function AlertsPage() {
  const utils = trpc.useUtils();
  const { data: alerts = [], isLoading } = trpc.alerts.list.useQuery();
  const createMutation = trpc.alerts.create.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); toast.success("알림이 추가되었습니다"); setDialogOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(`오류: ${e.message}`),
  });
  const deleteMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); toast.success("알림이 삭제되었습니다"); },
    onError: (e) => toast.error(`오류: ${e.message}`),
  });
  const toggleMutation = trpc.alerts.update.useMutation({
    onSuccess: () => utils.alerts.list.invalidate(),
    onError: (e) => toast.error(`오류: ${e.message}`),
  });

  const triggerCheck = trpc.settings.triggerCheck.useMutation({
    onSuccess: () => toast.success("가격 체크 완료"),
    onError: (e) => toast.error(`오류: ${e.message}`),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<AlertFormData>(defaultForm);
  const [editAlert, setEditAlert] = useState<typeof alerts[0] | null>(null);
  const [editForm, setEditForm] = useState<AlertFormData>(defaultForm);
  const [priceChecking, setPriceChecking] = useState<number | null>(null);
  const [livePrices, setLivePrices] = useState<Record<number, { price: number | null; error?: string }>>({});

  const updateMutation = trpc.alerts.update.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); toast.success("알림이 수정되었습니다"); setEditAlert(null); },
    onError: (e) => toast.error(`오류: ${e.message}`),
  });

  async function handleCheckPrice(id: number, symbol: string, market: Market) {
    setPriceChecking(id);
    try {
      const result = await utils.alerts.checkPrice.fetch({ symbol, market });
      setLivePrices(prev => ({ ...prev, [id]: { price: result.price, error: result.error } }));
    } catch {
      setLivePrices(prev => ({ ...prev, [id]: { price: null, error: "조회 실패" } }));
    } finally {
      setPriceChecking(null);
    }
  }

  function handleEditOpen(alert: typeof alerts[0]) {
    setEditAlert(alert);
    setEditForm({
      symbol: alert.symbol,
      market: alert.market as Market,
      targetPrice: alert.targetPrice,
      condition: alert.condition as Condition,
    });
  }

  function handleEditSubmit() {
    if (!editAlert) return;
    if (!editForm.symbol.trim()) return toast.error("종목 코드를 입력하세요");
    if (!editForm.targetPrice || isNaN(parseFloat(editForm.targetPrice))) return toast.error("올바른 목표가를 입력하세요");
    updateMutation.mutate({ id: editAlert.id, ...editForm });
  }

  function handleSubmit() {
    if (!form.symbol.trim()) return toast.error("종목 코드를 입력하세요");
    if (!form.targetPrice || isNaN(parseFloat(form.targetPrice))) return toast.error("올바른 목표가를 입력하세요");
    createMutation.mutate(form);
  }

  const activeCount = alerts.filter(a => a.active === 1 && a.fired === 0).length;
  const firedCount = alerts.filter(a => a.fired === 1).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-widest neon-text-pink" style={{ fontFamily: "Orbitron, sans-serif" }}>
            ALERT MONITOR
          </h1>
          <p className="text-xs font-mono mt-1" style={{ color: "oklch(0.55 0.06 220)" }}>
            가격 알림 조건 관리 시스템
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerCheck.mutate()}
            disabled={triggerCheck.isPending}
            className="font-mono text-xs"
            style={{ borderColor: "oklch(0.75 0.25 195 / 0.5)", color: "oklch(0.75 0.25 195)" }}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${triggerCheck.isPending ? "animate-spin" : ""}`} />
            즉시 체크
          </Button>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="font-bold tracking-wider"
            style={{
              background: "oklch(0.72 0.28 330 / 0.15)",
              border: "1px solid oklch(0.72 0.28 330 / 0.6)",
              color: "oklch(0.72 0.28 330)",
              boxShadow: "0 0 10px oklch(0.72 0.28 330 / 0.2)",
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            알림 추가
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "전체 알림", value: alerts.length, color: "oklch(0.75 0.25 195)", icon: Activity },
          { label: "활성 알림", value: activeCount, color: "oklch(0.78 0.25 145)", icon: Zap },
          { label: "발동 완료", value: firedCount, color: "oklch(0.72 0.28 330)", icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="hud-box p-4 text-center">
            <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
            <div className="text-2xl font-black" style={{ color, textShadow: `0 0 10px ${color}` }}>
              {value}
            </div>
            <div className="text-xs font-mono mt-1" style={{ color: "oklch(0.45 0.04 220)" }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="tech-line" />

      {/* Alert List */}
      {isLoading ? (
        <div className="text-center py-12 font-mono text-sm" style={{ color: "oklch(0.55 0.06 220)" }}>
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: "oklch(0.72 0.28 330)" }} />
          LOADING...
        </div>
      ) : alerts.length === 0 ? (
        <div className="hud-box p-12 text-center">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "oklch(0.72 0.28 330)" }} />
          <p className="font-mono text-sm" style={{ color: "oklch(0.45 0.04 220)" }}>
            등록된 알림이 없습니다<br />
            <span className="text-xs">[ + 알림 추가 ] 버튼으로 시작하세요</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const liveData = livePrices[alert.id];
            const marketColor = MARKET_COLORS[alert.market as Market];
            const isActive = alert.active === 1;

            return (
              <div
                key={alert.id}
                className="hud-box p-4 transition-all"
                style={{
                  borderColor: `${marketColor}40`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Status + Symbol */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`status-dot ${isActive ? "active" : "inactive"}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-base tracking-wider" style={{ color: marketColor, fontFamily: "Orbitron, sans-serif" }}>
                          {alert.symbol}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${marketColor}20`, color: marketColor, border: `1px solid ${marketColor}40` }}>
                          {MARKET_LABELS[alert.market as Market]}
                        </span>

                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs font-mono flex-wrap">
                        <span style={{ color: "oklch(0.55 0.06 220)" }}>
                          목표가: <span style={{ color: "oklch(0.85 0.15 200)" }}>{parseFloat(alert.targetPrice).toLocaleString("ko-KR", { maximumFractionDigits: 8 })}</span>
                        </span>
                        <span style={{ color: "oklch(0.55 0.06 220)" }}>
                          조건: {alert.condition === "above"
                            ? <span className="neon-text-green">▲ 이상</span>
                            : <span style={{ color: "oklch(0.72 0.28 330)" }}>▼ 이하</span>}
                        </span>
                        {liveData && (
                          <span style={{ color: liveData.error ? "oklch(0.65 0.28 25)" : "oklch(0.88 0.22 95)" }}>
                            현재가: {liveData.error ? "조회실패" : liveData.price?.toLocaleString("ko-KR", { maximumFractionDigits: 8 }) ?? "-"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCheckPrice(alert.id, alert.symbol, alert.market as Market)}
                      disabled={priceChecking === alert.id}
                      className="h-8 w-8 p-0"
                      title="현재가 조회"
                      style={{ color: "oklch(0.75 0.25 195)" }}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${priceChecking === alert.id ? "animate-spin" : ""}`} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditOpen(alert)}
                      className="h-8 w-8 p-0"
                      title="편집"
                      style={{ color: "oklch(0.88 0.22 95)" }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: alert.id, active: alert.active === 1 ? 0 : 1 })}
                      className="h-8 px-2 text-xs font-mono"
                      style={{ color: alert.active === 1 ? "oklch(0.78 0.25 145)" : "oklch(0.45 0.04 220)" }}
                    >
                      {alert.active === 1 ? "ON" : "OFF"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(alert.id)}
                      className="h-8 w-8 p-0"
                      style={{ color: "oklch(0.65 0.28 25)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: "oklch(0.09 0.015 260)", border: "1px solid oklch(0.72 0.28 330 / 0.4)" }}>
          <DialogHeader>
            <DialogTitle className="neon-text-pink font-black tracking-widest" style={{ fontFamily: "Orbitron, sans-serif" }}>
              NEW ALERT
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>시장 구분</Label>
              <Select value={form.market} onValueChange={(v) => setForm(f => ({ ...f, market: v as Market }))}>
                <SelectTrigger style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.09 0.015 260)", borderColor: "oklch(0.22 0.04 260)" }}>
                  <SelectItem value="KR">🇰🇷 국장 (한국)</SelectItem>
                  <SelectItem value="US">🇺🇸 미장 (미국)</SelectItem>
                  <SelectItem value="COIN">🪙 코인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>종목 코드</Label>
              <Input
                placeholder={MARKET_HINTS[form.market]}
                value={form.symbol}
                onChange={(e) => setForm(f => ({ ...f, symbol: e.target.value }))}
                style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)", fontFamily: "Share Tech Mono, monospace" }}
              />
              <p className="text-xs font-mono" style={{ color: "oklch(0.45 0.04 220)" }}>{MARKET_HINTS[form.market]}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>목표가</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.targetPrice}
                onChange={(e) => setForm(f => ({ ...f, targetPrice: e.target.value }))}
                style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)", fontFamily: "Share Tech Mono, monospace" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>알림 조건</Label>
              <Select value={form.condition} onValueChange={(v) => setForm(f => ({ ...f, condition: v as Condition }))}>
                <SelectTrigger style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.09 0.015 260)", borderColor: "oklch(0.22 0.04 260)" }}>
                  <SelectItem value="above">▲ 목표가 이상 도달 시</SelectItem>
                  <SelectItem value="below">▼ 목표가 이하 도달 시</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} style={{ color: "oklch(0.55 0.06 220)" }}>취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              style={{
                background: "oklch(0.72 0.28 330 / 0.15)",
                border: "1px solid oklch(0.72 0.28 330 / 0.6)",
                color: "oklch(0.72 0.28 330)",
              }}
            >
              {createMutation.isPending ? "추가 중..." : "[ 추가 ]"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Alert Dialog */}
      <Dialog open={editAlert !== null} onOpenChange={(o) => { if (!o) setEditAlert(null); }}>
        <DialogContent style={{ background: "oklch(0.09 0.015 260)", border: "1px solid oklch(0.88 0.22 95 / 0.4)" }}>
          <DialogHeader>
            <DialogTitle className="font-black tracking-widest" style={{ fontFamily: "Orbitron, sans-serif", color: "oklch(0.88 0.22 95)", textShadow: "0 0 10px oklch(0.88 0.22 95 / 0.5)" }}>
              EDIT ALERT
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>시장 구분</Label>
              <Select value={editForm.market} onValueChange={(v) => setEditForm(f => ({ ...f, market: v as Market }))}>
                <SelectTrigger style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.09 0.015 260)", borderColor: "oklch(0.22 0.04 260)" }}>
                  <SelectItem value="KR">🇰🇷 국장 (한국)</SelectItem>
                  <SelectItem value="US">🇺🇸 미장 (미국)</SelectItem>
                  <SelectItem value="COIN">🪙 코인</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>종목 코드</Label>
              <Input
                value={editForm.symbol}
                onChange={(e) => setEditForm(f => ({ ...f, symbol: e.target.value }))}
                style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)", fontFamily: "Share Tech Mono, monospace" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>목표가</Label>
              <Input
                type="number"
                value={editForm.targetPrice}
                onChange={(e) => setEditForm(f => ({ ...f, targetPrice: e.target.value }))}
                style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)", fontFamily: "Share Tech Mono, monospace" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono" style={{ color: "oklch(0.75 0.25 195)" }}>알림 조건</Label>
              <Select value={editForm.condition} onValueChange={(v) => setEditForm(f => ({ ...f, condition: v as Condition }))}>
                <SelectTrigger style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "oklch(0.09 0.015 260)", borderColor: "oklch(0.22 0.04 260)" }}>
                  <SelectItem value="above">▲ 목표가 이상 도달 시</SelectItem>
                  <SelectItem value="below">▼ 목표가 이하 도달 시</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditAlert(null)} style={{ color: "oklch(0.55 0.06 220)" }}>취소</Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
              style={{ background: "oklch(0.88 0.22 95 / 0.15)", border: "1px solid oklch(0.88 0.22 95 / 0.6)", color: "oklch(0.88 0.22 95)" }}
            >
              {updateMutation.isPending ? "수정 중..." : "[ 저장 ]"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o: boolean) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent style={{ background: "oklch(0.09 0.015 260)", border: "1px solid oklch(0.65 0.28 25 / 0.5)" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "oklch(0.65 0.28 25)" }}>알림 삭제</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "oklch(0.55 0.06 220)" }}>
              이 알림을 삭제하면 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background: "oklch(0.12 0.02 260)", borderColor: "oklch(0.22 0.04 260)", color: "oklch(0.85 0.15 200)" }}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId !== null) deleteMutation.mutate({ id: deleteId }); setDeleteId(null); }}
              style={{ background: "oklch(0.65 0.28 25 / 0.2)", border: "1px solid oklch(0.65 0.28 25 / 0.6)", color: "oklch(0.65 0.28 25)" }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
