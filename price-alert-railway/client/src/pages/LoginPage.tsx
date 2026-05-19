import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type LoginForm = { username: string; password: string };

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (res.ok) {
        onLogin();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "로그인 실패");
      }
    } catch {
      toast.error("서버 연결 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="cyber-panel p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚡</div>
          <h1 className="text-2xl font-bold neon-text-cyan tracking-widest">PRICE ALERT</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest">SYSTEM ACCESS REQUIRED</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground tracking-widest block mb-1">USERNAME</label>
            <input
              {...register("username", { required: true })}
              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-400 font-mono"
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground tracking-widest block mb-1">PASSWORD</label>
            <input
              {...register("password", { required: true })}
              type="password"
              className="w-full bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-cyan-400 font-mono"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 border border-pink-500 text-pink-400 hover:bg-pink-500/10 rounded font-bold tracking-widest transition-all disabled:opacity-50"
          >
            {loading ? "CONNECTING..." : "[ SIGN IN ]"}
          </button>
        </form>
      </div>
    </div>
  );
}
