import { BORDER_RADIUS, COLORS, SHADOWS } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Bell, FileText, Home, Plus, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CustomTabBarButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={styles.addButtonContainer}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }}
    activeOpacity={0.8}
  >
    <View style={styles.addButton}>
      <Plus color={COLORS.white} size={32} strokeWidth={2.5} />
    </View>
  </TouchableOpacity>
);

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
    fetchUnreadCount();

    // Real-time subscription for notifications & Local Sync
    const channel = supabase.channel('notification-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchUnreadCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => {
        fetchUnreadCount();
      })
      .on('broadcast', { event: 'refresh-unread-count' }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get acknowledged broadcast IDs from local storage
      let acknowledgedIds: string[] = [];
      let deletedIds: string[] = [];
      try {
        const [storedAck, storedDel] = await Promise.all([
          SecureStore.getItemAsync('acknowledged_broadcasts'),
          SecureStore.getItemAsync('deleted_notifications')
        ]);
        if (storedAck) acknowledgedIds = JSON.parse(storedAck);
        if (storedDel) deletedIds = JSON.parse(storedDel);
      } catch (e) { }

      // Fetch install date to filter old notifications
      const installDate = await SecureStore.getItemAsync('install_date');
      const filterDate = installDate || user.created_at;

      // Fetch unread IDs to filter deleted ones
      const { data: unreadPersonal } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .gt('created_at', filterDate);

      const unreadPersonalCount = (unreadPersonal || []).filter(
        n => !deletedIds.includes(n.id)
      ).length;

      // Count unacknowledged broadcasts since install
      const { data: broadcasts } = await supabase
        .from('broadcasts')
        .select('id')
        .gt('created_at', filterDate);

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
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(insets.bottom, 12) + 2,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: BORDER_RADIUS.xxl,
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          ...SHADOWS.premium,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 10,
        },
        tabBarBackground: () => (
          <View
            style={{
              position: 'absolute',
              bottom: -(Math.max(insets.bottom, 12) + 20),
              left: -20,
              right: -20,
              height: Math.max(insets.bottom, 12) + 100,
              backgroundColor: COLORS.white,
            }}
          />
        ),
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
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
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
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButtonContainer: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.premium,
    borderWidth: 4,
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
