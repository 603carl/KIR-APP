import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "operator" | "responder";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading || (user && requiredRole && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1c] text-white font-mono">
        <div className="flex flex-col items-center gap-6 p-8 border border-cyan-500/20 bg-black/40 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.1)]">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
          <div className="space-y-2 text-center">
            <p className="text-cyan-400 tracking-[0.2em] font-bold uppercase">Verifying Access</p>
            <p className="text-[10px] text-cyan-800 uppercase tracking-widest max-w-[200px]">
              Querying secure employee database...
            </p>
          </div>
          {/* Automatic escape hatch if lookups take too long */}
          <div className="mt-4 pt-4 border-t border-cyan-500/10">
            <button
              onClick={() => window.location.href = '/auth'}
              className="text-[10px] text-cyan-900 hover:text-cyan-500 transition-colors uppercase tracking-[0.2em]"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role hierarchy: admin > supervisor > agent
  if (requiredRole) {
    const roleHierarchy = { admin: 3, operator: 2, responder: 1 };
    const userLevel = role ? roleHierarchy[role] : 0;
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
