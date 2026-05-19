import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import AlertsPage from "@/pages/AlertsPage";
import LogsPage from "@/pages/LogsPage";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";

function AuthGate() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="neon-text-cyan text-xl tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={() => {
          utils.auth.me.invalidate();
          navigate("/");
        }}
      />
    );
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={AlertsPage} />
        <Route path="/logs" component={LogsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route>
          <div className="p-8 text-center neon-text-pink">404 — PAGE NOT FOUND</div>
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <TooltipProvider>
        <Toaster />
        <AuthGate />
      </TooltipProvider>
    </ThemeProvider>
  );
}
