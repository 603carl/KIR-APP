import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSessionSafely, supabase } from '@/lib/supabase';
import { cacheKeys, readSecureCache, removeSecureCache, writeSecureCache } from '@/lib/clientCache';

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  county?: string;
  role?: string;
  avatar_url?: string;
  notification_prefs?: Record<string, any>;
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
  const currentUserId = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await getSessionSafely();
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      currentUserId.current = session.user.id;
      const displayCacheKey = cacheKeys.displayProfile(session.user.id);
      const cachedDisplay = await readSecureCache<Profile>(displayCacheKey, 24 * 60 * 60 * 1000);
      if (cachedDisplay) {
        setProfile(current => current || cachedDisplay);
        setLoading(false);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      
      const nextProfile = {
        ...data,
        email: session.user.email
      } as Profile;
      setProfile(nextProfile);
      await writeSecureCache(displayCacheKey, {
        id: nextProfile.id,
        full_name: nextProfile.full_name || 'Citizen',
        avatar_url: nextProfile.avatar_url,
        accuracy_score: nextProfile.accuracy_score,
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
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            fetchProfile();
        } else if (event === 'SIGNED_OUT') {
            if (currentUserId.current) {
                removeSecureCache(cacheKeys.displayProfile(currentUserId.current)).catch(() => undefined);
            }
            currentUserId.current = null;
            setProfile(null);
            setLoading(false);
        }
    });

    return () => {
      authSubscription.unsubscribe();
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
