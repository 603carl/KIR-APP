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

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            fetchProfile();
        } else if (event === 'SIGNED_OUT') {
            setProfile(null);
        }
    });

    let profileSubscription: any = null;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            profileSubscription = supabase
                .channel(`profile_sync:${session.user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${session.user.id}`
                    },
                    (payload) => {
                        if (payload.new) {
                            setProfile(prev => {
                                if (!prev) return null;
                                return {
                                    ...prev,
                                    ...payload.new,
                                    id: payload.new.id || prev.id,
                                    full_name: payload.new.full_name || prev.full_name
                                } as Profile;
                            });
                        }
                    }
                )
                .subscribe();
        }
    });

    return () => {
      authSubscription.unsubscribe();
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
