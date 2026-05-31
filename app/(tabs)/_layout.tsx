import { COLORS, SHADOWS } from '@/constants/Theme';
import { getSessionSafely, supabase } from '@/lib/supabase';
import { Tabs } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Bell, FileText, Home, Plus, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom Bell Icon with Badge
const BellWithBadge = ({ color, unreadCount }: { color: string; unreadCount: number }) => (
  <View style={{ position: 'relative' }}>
    <Bell color={color} size={24} />
    {unreadCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
      </View>
    )}
  </View>
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = async () => {
      const { data: { session } } = await getSessionSafely();
      if (cancelled || !session?.user) return;

      await fetchUnreadCount();

      // Personal notifications must never cause refresh work on other users' devices.
      channel = supabase.channel('notification-sync')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, () => {
          fetchUnreadCount();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, () => {
          fetchUnreadCount();
        })
        .on('broadcast', { event: 'refresh-unread-count' }, () => {
          fetchUnreadCount();
        })
        .subscribe();
    };

    subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { session } } = await getSessionSafely();
      const user = session?.user;
      if (!user) return;

      // Get acknowledged broadcast IDs from local storage
      let acknowledgedIds: string[] = [];
      let deletedIds: string[] = [];
      let thresholdISO = new Date(0).toISOString(); // Default to beginning of time if logic fails

      try {
        const [storedAck, storedDel, lastCleared] = await Promise.all([
          SecureStore.getItemAsync('acknowledged_broadcasts'),
          SecureStore.getItemAsync('deleted_notifications'),
          SecureStore.getItemAsync('last_alerts_cleared_at')
        ]);
        if (storedAck) acknowledgedIds = JSON.parse(storedAck);
        if (storedDel) deletedIds = JSON.parse(storedDel);
        
        // Calculate the 7-day "Latest" threshold
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const installDateStr = await SecureStore.getItemAsync('install_date');
        const installDate = installDateStr ? new Date(installDateStr) : new Date(user.created_at);
        
        let thresholdDate = installDate > sevenDaysAgo ? installDate : sevenDaysAgo;
        
        // Respect the "Clear All" timestamp
        if (lastCleared) {
          const lastClearedDate = new Date(lastCleared);
          if (lastClearedDate > thresholdDate) {
            thresholdDate = lastClearedDate;
          }
        }
        
        thresholdISO = thresholdDate.toISOString();
      } catch (e) { }

      // Fetch unread IDs to filter deleted ones
      // Logic: ONLY fetch unread since threshold (strict 7 days)
      const { data: unreadPersonal } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .gt('created_at', thresholdISO);

      const unreadPersonalCount = (unreadPersonal || []).filter(
        n => !deletedIds.includes(n.id)
      ).length;

      // Count unacknowledged broadcasts since threshold
      const { data: broadcasts } = await supabase
        .from('broadcasts')
        .select('id')
        .gt('created_at', thresholdISO);

      const unacknowledgedBroadcasts = (broadcasts || []).filter(
        b => !acknowledgedIds.includes(b.id) && !deletedIds.includes(b.id)
      ).length;

      setUnreadCount(unreadPersonalCount + unacknowledgedBroadcasts);

    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: -4,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: 60,
        },
        tabBarStyle: {
          height: 60 + insets.bottom,
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 4,
          paddingTop: 4,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          flexDirection: 'row',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          title: 'My Reports',
          tabBarIcon: ({ color }) => <FileText color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.addButtonContainer}>
              <View style={styles.addButton}>
                <Plus color={COLORS.white} size={32} strokeWidth={2.5} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <BellWithBadge color={color} unreadCount={unreadCount} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    top: -15,
    justifyContent: 'center',
    alignItems: 'center',
    width: 52,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '900',
  },
});
