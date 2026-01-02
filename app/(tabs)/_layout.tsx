import { BORDER_RADIUS, COLORS, SHADOWS } from '@/constants/Theme';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Bell, FileText, Home, Plus, User } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
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

export default function TabLayout() {
  const insets = useSafeAreaInsets();

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
          bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 15) : 0,
          left: 16,
          right: 16,
          height: 68,
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
              bottom: -insets.bottom - 20,
              left: -20,
              right: -20,
              height: insets.bottom + 100,
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
          tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
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
});
