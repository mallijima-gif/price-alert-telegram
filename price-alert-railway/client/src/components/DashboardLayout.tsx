import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, History, Settings, Menu, X, Zap, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const navItems = [
  { path: "/", label: "ALERTS", icon: Bell },
  { path: "/logs", label: "HISTORY", icon: History },
  { path: "/settings", label: "SETTINGS", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const utils = trpc.useUtils();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      utils.auth.me.invalidate();
    } catch {
      toast.error("로그아웃 실패");
    }
  };

  const SidebarContent = () => (
    <aside className="flex flex-col h-full w-56 bg-background border-r border-border p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Zap className="text-pink-500 w-5 h-5" />
        <span className="neon-text-cyan font-bold tracking-widest text-sm">PRICE ALERT</span>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location === path;
          return (
            <Link key={path} href={path}>
              <a
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-bold tracking-widest transition-all ${
                  active
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </a>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2 rounded text-xs font-bold tracking-widest text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10 transition-all mt-4"
      >
        <LogOut className="w-4 h-4" />
        LOGOUT
      </button>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex">
        <SidebarContent />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-56">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="text-pink-500 w-4 h-4" />
            <span className="neon-text-cyan font-bold tracking-widest text-sm">PRICE ALERT</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
