import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  county?: string;
  role?: string;
  avatar_url?: string;
  privacy_settings?: any;
  accuracy_score?: number;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      setProfile({
        ...data,
        email: session.user.email
      });
    } catch (error) {
      console.error('[ProfileContext] Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    // Listen for Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    // Real-time synchronization
    let profileSubscription: any = null;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            profileSubscription = supabase
                .channel(`profile:${session.user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${session.user.id}`
                    },
                    (payload: RealtimePostgresChangesPayload<any>) => {
                        if (payload.new) {
                            setProfile(prev => ({
                                ...prev,
                                ...payload.new,
                                id: payload.new.id // Ensure ID persists
                            }));
                        }
                    }
                )
                .subscribe();
        }
    });

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) supabase.removeChannel(profileSubscription);
    };
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refreshProfile: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
