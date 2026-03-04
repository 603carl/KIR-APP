import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

const loginSchema = z.object({
  employeeId: z.string().regex(/^KIR[0-9]{7}$/, "Invalid Employee ID format. Must be KIR followed by 7 digits."),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Auth() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  // Handle redirects and identity verification states
  useEffect(() => {
    if (user && !authLoading) {
      if (role) {
        console.log("[Auth] Identity verified. Redirecting to:", role === 'admin' ? "/admin" : from);
        const target = role === 'admin' && (from === "/" || from === "/auth") ? "/admin" : from;
        navigate(target, { replace: true });
      } else {
        console.warn("[Auth] Authenticated but no role found. Resetting state.");
        setError("IDENTITY NOT FOUND: Your login is valid, but you are not registered in the Employee database. Please check your KIR ID or contact an Admin.");
        setIsSubmitting(false);
      }
    }
  }, [user, authLoading, role, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    const validation = loginSchema.safeParse({ employeeId, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Background ID -> Email lookup
      const cleanId = employeeId.trim().toUpperCase();
      console.log(`[Auth] Attempting lookup for Employee ID: ${cleanId}`);

      let targetEmail = "";

      const { data: employee, error: lookupError } = await (supabase as any)
        .from('employees')
        .select('email')
        .eq('employee_id', cleanId)
        .maybeSingle();

      if (employee?.email) {
        targetEmail = employee.email;
        console.log("[Auth] Resolved ID from database:", targetEmail);
      } else if (cleanId === "KIR3851494") {
        // FAIL-SAFE for Master Admin
        targetEmail = "johnmwani603@gmail.com";
        console.warn("[Auth] Database lookup failed but ID matched Master Admin. Using fail-safe email.");
      }

      if (!targetEmail) {
        if (lookupError) {
          console.error("[Auth] Lookup database error:", lookupError);
          setError(`SYSTEM ERROR: ${lookupError.message} (${lookupError.code})`);
        } else {
          console.warn("[Auth] No employee record found for ID:", cleanId);
          setError("ACCESS DENIED: Employee ID not found in the secure database.");
        }
        setIsSubmitting(false);
        return;
      }

      console.log("[Auth] Reaching signIn phase with email:", targetEmail);
      const { error: signInError } = await signIn(targetEmail, password);

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("ACCESS DENIED: Invalid Password.");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("ACCESS DENIED: Agent identity pending verification.");
        } else {
          setError(`SYSTEM ERROR: ${signInError.message}`);
        }
        setIsSubmitting(false);
      }
      // Success will be handled by the useEffect above
    } catch (err) {
      setError("CRITICAL FAILURE: Connection terminated.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1c] relative overflow-hidden font-mono text-white">
      {/* Background World Map Effect */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, #1a2c4e 0%, transparent 70%),
            linear-gradient(0deg, transparent 24%, rgba(32, 255, 255, .1) 25%, rgba(32, 255, 255, .1) 26%, transparent 27%, transparent 74%, rgba(32, 255, 255, .1) 75%, rgba(32, 255, 255, .1) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(32, 255, 255, .1) 25%, rgba(32, 255, 255, .1) 26%, transparent 27%, transparent 74%, rgba(32, 255, 255, .1) 75%, rgba(32, 255, 255, .1) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '100% 100%, 50px 50px, 50px 50px'
        }}
      />

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none" />

      <div className="w-full max-w-lg relative z-20 p-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full opacity-75 blur group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div className="relative w-32 h-32 rounded-full bg-black flex items-center justify-center border-2 border-cyan-500/50 overflow-hidden">
              <img src="/logo.jpg" alt="Agency Logo" className="w-full h-full object-cover" />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-[0.2em] text-cyan-400 uppercase text-shadow-glow">
            Watch Command
          </h1>
          <p className="text-xs text-cyan-700 mt-2 tracking-widest uppercase">
            Kenya Incident Report Center
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-950/50 border-red-500/50 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-mono text-xs uppercase tracking-wider">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-cyan-600 pl-1">Employee ID (KIRXXXXXXX)</label>
              <Input
                type="text"
                placeholder="KIR1234567"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                autoFocus
                className="bg-black/40 border-cyan-800/50 text-cyan-100 placeholder:text-cyan-900/50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 h-10 rounded-sm font-mono tracking-wider"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-cyan-600 pl-1">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="bg-black/40 border-cyan-800/50 text-cyan-100 placeholder:text-cyan-900/50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 h-10 rounded-sm font-mono tracking-wider"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 border border-cyan-700/50 hover:border-cyan-500 uppercase tracking-[0.2em] h-12 transition-all duration-300 font-bold text-shadow-glow"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AUTHENTICATING...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>

        <div className="mt-12 text-center space-y-2 opacity-60">
          <p className="text-[10px] text-cyan-800 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
            You are entering a secured Government system. Usage is monitored and audited. Unauthorized access is a criminal offense.
          </p>
        </div>
      </div>
    </div>
  );
}
