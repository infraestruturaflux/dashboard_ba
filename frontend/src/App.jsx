import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BarChart2, Activity, LogOut, ShieldCheck, Shield } from "lucide-react";

import {
  ToastProvider, ToastViewport, Toast,
  ToastTitle, ToastDescription, ToastClose,
} from "@/components/ui/toast";
import { useToast } from "@/lib/useToast";
import { Dashboard } from "@/pages/Dashboard";
import { Analytics } from "@/pages/Analytics";
import { Login } from "@/pages/Login";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function NavBar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-card border-b border-border px-4 h-10 flex items-center gap-1">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          cn("flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
            isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")
        }
      >
        <Activity className="w-3.5 h-3.5" /> Dashboard
      </NavLink>

      {/* Analytics só para ADMIN */}
      {isAdmin && (
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            cn("flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
              isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")
          }
        >
          <BarChart2 className="w-3.5 h-3.5" /> Analytics
        </NavLink>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Perfil + logout */}
      {user && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isAdmin
              ? <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              : <Shield className="w-3.5 h-3.5 text-sky-400" />}
            <span className={isAdmin ? "text-primary font-medium" : "text-sky-400 font-medium"}>
              {user.displayName}
            </span>
          </span>
          <button
            onClick={logout}
            title="Sair"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </nav>
  );
}

function ProtectedRoutes() {
  const { user, isAdmin } = useAuth();
  const { toasts, toast } = useToast();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <ToastProvider>
      <NavBar />
      <div className="pt-10">
        <Routes>
          <Route path="/"          element={<Dashboard toast={toast} />} />
          {isAdmin && (
            <Route path="/analytics" element={<Analytics />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant} open>
          <div className="flex-1 min-w-0">
            {title       && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
