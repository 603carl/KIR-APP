import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type AppRole = "admin" | "operator" | "responder";

interface Profile {
  id: string;
  employee_id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  county: string | null;
  phone: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    data: { user: User | null; session: Session | null };
    error: any;
  }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string, retryCount = 0): Promise<boolean> => {
    try {
      setLoading(true);

      // 1. Primary Look-up: Link by UUID
      const { data: employeeData } = await supabase
        .from("employees")
        .select("*")
        .eq("id", userId)
        .single();

      if (employeeData) {
        setProfile(employeeData as unknown as Profile);
        setRole((employeeData as any).role as AppRole);
        return true;
      }

      // 2. Identity Linkage Logic (For bootstrapped or legacy accounts)
      const { data: authUserRoot } = await supabase.auth.getUser();
      const user = authUserRoot?.user;

      if (user?.email) {
        // Look for any employee record with this email
        const { data: linkedEmployee } = await supabase
          .from("employees")
          .select("*")
          .eq("email", user.email)
          .single();

        if (linkedEmployee) {
          if (!linkedEmployee.id) {
            console.log("[AuthContext] Found unlinked employee record. Attempting linkage...");
            // Fire and forget the update, or at least don't block access on it
            supabase
              .from("employees")
              .update({ id: userId } as any)
              .eq("employee_id", linkedEmployee.employee_id)
              .then(({ error }) => {
                if (error) console.error("[AuthContext] Background linkage failed:", error);
                else console.log("[AuthContext] Background linkage successful.");
              });
          }

          setProfile({ ...linkedEmployee, id: userId } as unknown as Profile);
          setRole((linkedEmployee as any).role as AppRole);
          return true;
        }
      }

      // 3. Master Admin Hardcoded Fallback (Emergency Over-ride)
      if (user?.email === 'johnmwani603@gmail.com') {
        console.warn("[AuthContext] MASTER ADMIN detected by email. Forcing Admin state.");
        setRole("admin");
        setProfile({
          id: userId,
          email: user.email,
          full_name: "Master Admin",
          employee_id: "KIR3851494",
          role: "admin"
        } as any);
        return true;
      }

      // 4. Metadata Fallback (Prevents sign-out loop if DB is locked/unlinked)
      if (user?.user_metadata?.role) {
        console.warn("[AuthContext] Database profile missing. Using Auth Metadata fallback for role:", user.user_metadata.role);
        setRole(user.user_metadata.role as AppRole);
        setProfile({
          id: userId,
          email: user.email || "",
          full_name: user.user_metadata.full_name || "Agent",
          role: user.user_metadata.role
        } as any);
        return true;
      }

      // 4. Fallback: Check profiles (Legacy/Citizens)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileData) {
        setProfile(profileData as unknown as Profile);
        setRole((profileData as any).role || "responder");
        return true;
      }

      // 5. RLS Handshake Delay mitigation
      if (retryCount < 1) {
        console.warn(`[AuthContext] Identity lookup attempt ${retryCount + 1} yielded no records for UID: ${userId}. Retrying in 1200ms...`);
        await new Promise(resolve => setTimeout(resolve, 1200));
        return fetchUserData(userId, retryCount + 1);
      }

      console.error(`[AuthContext] CRITICAL: No authorized persona found for UID: ${userId} after retries.`);
      return false;
    } catch (err: any) {
      console.error("[AuthContext] EXCEPTIONAL Error fetching identity data:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // fetchUserData will update profile/role and setLoading(false)
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
