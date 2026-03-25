import { SkeletonCard } from '@/components/SkeletonCard';
import { BORDER_RADIUS, COLORS, FONT_SIZE, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { normalizeCounty } from '@/lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AlertCircle,
  ChevronRight,
  Droplet,
  Search,
  ShieldCheck,
  TrendingUp,
  Truck,
  Zap,
  PhoneCall
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: '1', title: 'Water', icon: Droplet, color: '#3B82F6' },
  { id: '2', title: 'Power', icon: Zap, color: '#F59E0B' },
  { id: '3', title: 'Roads', icon: Truck, color: '#10B981' },
  { id: '4', title: 'Security', icon: ShieldCheck, color: '#EF4444' },
  { id: '5', title: 'Fire', icon: AlertCircle, color: '#F97316' },
];

interface Incident {
  id: string;
  title: string;
  location_name: string;
  created_at: string;
  severity: string;
  category: string;
  status: string;
  media_urls: string[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [stats, setStats] = useState({ resolvedRate: '0%', trend: '+0%' });
  const [userName, setUserName] = useState('Citizen');
  const [sosActive, setSosActive] = useState(false);

  // Performance: Cache user to avoid repeated auth calls
  const cachedUser = useRef<any>(null);
  const isRequestingLocation = useRef(false);

  const CACHE_KEY_INCIDENTS = '@cached_incidents';
  const CACHE_KEY_STATS = '@cached_stats';

  const loadCachedData = async () => {
    try {
      const cachedIncidents = await AsyncStorage.getItem(CACHE_KEY_INCIDENTS);
      const cachedStats = await AsyncStorage.getItem(CACHE_KEY_STATS);
      if (cachedIncidents) setIncidents(JSON.parse(cachedIncidents));
      if (cachedStats) setStats(JSON.parse(cachedStats));
    } catch (e) {
      console.log('Error loading cache', e);
    }
  };

  // 1. Initial mounting tasks - OPTIMIZED with parallel loading and local cache
  useEffect(() => {
    loadCachedData().then(() => {
      // Load all initial data in parallel for faster startup AFTER cache fills UI
      Promise.all([
        fetchUser(),
        fetchStats(),
        checkLocationPermission()
      ]);
    });

    const subscription = supabase
      .channel('public:incidents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        // Optimistic UI Update: instantly push new incident to feed
        const newIncident = payload.new as Incident;
        setIncidents(prev => [newIncident, ...prev]);
        fetchStats(); // Update numbers
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, (payload) => {
        const updated = payload.new as Incident;
        setIncidents(prev => prev.map(inc => inc.id === updated.id ? updated : inc));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 2. Fetch incidents when query/category/location changes
  useEffect(() => {
    fetchIncidents();
  }, [searchQuery, selectedCategory, userLocation]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Cache user for reuse in SOS and other functions
    cachedUser.current = user;

    // Fetch from profiles table for the correct name
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile?.full_name && profile.full_name !== 'Citizen') {
      setUserName(profile.full_name.split(' ')[0]);
    } else {
      // Profile missing or has generic name
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Citizen';
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      if (!profile && !error || (error && (error as any).code === 'PGRST116')) {
        // Attempt to create profile from user metadata if it's missing
        const county = user.user_metadata?.county || '';

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: fullName,
            email: user.email,
            avatar_url: avatarUrl,
            location_name: county,
            role: 'reporter'
          })
          .select()
          .single();

        if (!createError && newProfile) {
          setUserName(newProfile.full_name?.split(' ')[0] || 'Citizen');
        }
      } else if (profile?.full_name === 'Citizen' && fullName !== 'Citizen') {
        // Update generic name with metadata name
        await supabase.from('profiles').update({
          full_name: fullName,
          avatar_url: avatarUrl
        }).eq('id', user.id);
        setUserName(fullName.split(' ')[0]);
      } else if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true });
      const { count: resolved } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['Resolved', 'Closed', 'resolved', 'closed']);

      if (total && total > 0) {
        const newStats = {
          resolvedRate: `${((resolved || 0) / total * 100).toFixed(1)}%`,
          trend: '+2.4%'
        };
        setStats(newStats);
        AsyncStorage.setItem(CACHE_KEY_STATS, JSON.stringify(newStats));
      }
    } catch (e) {
      console.error('Stats error:', e);
    }
  };


  const checkLocationPermission = async () => {
    if (isRequestingLocation.current) return;
    isRequestingLocation.current = true;

    try {
      // Small delay to ensure the screen is fully mounted and animations finished
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = currentStatus;

      if (currentStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        setUserLocation(loc);
      }
    } catch (e) {
      console.log('Location check failed', e);
    } finally {
      isRequestingLocation.current = false;
    }
  };

  const fetchIncidents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const lat = userLocation?.coords.latitude || null;
      const lng = userLocation?.coords.longitude || null;

      const { data, error } = await supabase
        .rpc('get_smart_community_feed', {
          target_user_id: user.id,
          user_lat: lat,
          user_lng: lng,
          search_query: searchQuery || null,
          selected_cat: selectedCategory || null
        });

      if (error) throw error;
      setIncidents(data || []);

      // Cache results so next load is instant
      if (!searchQuery && !selectedCategory) {
        AsyncStorage.setItem(CACHE_KEY_INCIDENTS, JSON.stringify(data || []));
      }
    } catch (error) {
      console.error('Smart Feed error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchIncidents();
    fetchStats();
  }, [userLocation, searchQuery, selectedCategory]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);

    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return past.toLocaleDateString();
  };

  const handleSOS = async () => {
    // 1. Instant UI Feedback - Visual and Haptic
    if (sosActive) {
      // Immediate shutdown as requested
      try {
        setSosActive(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('sos_alerts')
            .update({ status: 'cancelled' })
            .eq('user_id', user.id)
            .eq('status', 'active');

          // Immediately reflect in Alerts for Watch Command
          await supabase.from('alerts').insert({
            rule_name: 'SOS_CANCELLED',
            message: `SOS Cancelled by user ${userName}`,
            severity: 'info',
            user_id: user.id
          });
        }
      } catch (e) {
        console.error('Cancel SOS error:', e);
      }
      return;
    }

    // --- ONE-TAP ULTRA-FAST SOS PATH START ---
    setSosActive(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    try {
      // CRITICAL: Proactive Session Refresh before SOS to prevent JWT failure
      const { data: sessionData } = await supabase.auth.refreshSession();
      let user = sessionData.user;

      if (!user) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }

      if (!user) {
        setSosActive(false);
        Alert.alert('Error', 'Please log in to use SOS.');
        return;
      }

      // 2. Location Bypass - Try last known position FIRST for instant result
      let lat = userLocation?.coords.latitude;
      let lng = userLocation?.coords.longitude;

      if (!lat || !lng) {
        // Background request if cache is empty
        const lastLoc = await Location.getLastKnownPositionAsync({});
        if (lastLoc) {
          lat = lastLoc.coords.latitude;
          lng = lastLoc.coords.longitude;
        } else {
          // Deep fallback if device has NO location history
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const freshLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            lat = freshLoc.coords.latitude;
            lng = freshLoc.coords.longitude;
          }
        }
      }

      // 3. Fast-Path Insert: Coordinate-only insert to bypass slow geocoding
      // CRITICAL: Explicit 15s Timeout to prevent "infinite loading"
      const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

      const insertPromise = supabase.from('sos_alerts').insert({
        user_id: user.id,
        lat: lat || -1.2921, // Default to Nairobi center if total location failure
        lng: lng || 36.8219,
        location_name: 'Locating in progress...',
        status: 'active'
      }).select().single();

      const { data: sosData, error: sosError } = await Promise.race([
        insertPromise,
        timeout(15000)
      ]) as any;

      if (sosError) throw sosError;

      // 4. Background Enrichment - Don't block the UI for geocoding
      if (lat && lng) {
        (async () => {
          try {
            const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (results && results[0]) {
              const loc = results[0];
              const resolvedAddress = [loc.street, loc.district, loc.name].filter(Boolean).join(', ');
              const county = normalizeCounty(loc.region || loc.city || '');

              await supabase.from('sos_alerts').update({
                location_name: resolvedAddress || 'Street identified',
                county: county
              }).eq('id', sosData.id);

              // Update system alerts table for Watch Command
              await supabase.from('alerts').insert({
                rule_name: 'SOS EMERGENCY',
                message: `CRITICAL: SOS from user at ${resolvedAddress || 'Coordinates'}`,
                severity: 'critical',
                user_id: user.id,
                sos_alert_id: sosData.id
              });
            }
          } catch (e) { console.warn('[SOS Enrichment Failed]', e); }
        })();
      }

      // 5. Confirmation (Non-blocking)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });

    } catch (error: any) {
      console.error('SOS EXECUTION FAILED:', error);
      setSosActive(false);
      if (error.message === 'timeout') {
        Alert.alert('Timeout Error', 'The server is taking too long to respond. Your SOS may still be delivered, but please check your local connection or call 999.');
      } else {
        Alert.alert('SOS Failure', 'System link error. Please call 999 directly.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
        >

          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <Text style={styles.greeting}>Habari, <Text style={{ fontWeight: '900', color: COLORS.primary }}>{userName}</Text></Text>
              <TouchableOpacity style={styles.profileBadge}>
                <View style={styles.verifiedIconContainer}>
                  <ShieldCheck color={COLORS.white} size={12} />
                </View>
                <Text style={styles.badgeText}>Verified</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Kenya Incident Hub</Text>
          </View>

          {/* Search Box */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.searchContainer}
          >
            <View style={styles.searchBox}>
              <Search size={22} color="#94A3B8" />
              <TextInput
                placeholder="Search incidents or locations..."
                style={styles.searchInput}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </MotiView>

          {/* National Stats */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['#064E3B', '#022C22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCard}
            >
              <View style={styles.statsContent}>
                <View>
                  <Text style={styles.statsLabel}>National Resolved</Text>
                  <Text style={styles.statsValue}>{stats.resolvedRate}</Text>
                  <Text style={styles.statsTrend}>{stats.trend} from last week</Text>
                </View>
                <MotiView
                  from={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ alignSelf: 'flex-start', marginTop: 10 }}
                >
                  <TrendingUp color="#4ADE80" size={48} strokeWidth={3} />
                </MotiView>
              </View>
            </LinearGradient>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  header: {
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  greeting: {
    fontSize: 22,
    color: '#4A5568',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: -2,
    letterSpacing: 0.2,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  verifiedIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.success,
    textTransform: 'uppercase',
  },
  searchContainer: { marginBottom: SPACING.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, height: 56, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, ...SHADOWS.soft },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: COLORS.black },
  statsContainer: { marginBottom: SPACING.lg },
  statsCard: { height: 130, borderRadius: 24, padding: 20, justifyContent: 'center' },
  statsContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  statsValue: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 2 },
  statsTrend: { color: '#4ADE80', fontSize: 12, fontWeight: '800', marginTop: 4 },
  sosContainer: {
    marginBottom: SPACING.lg,
  },
  sosCardContainer: {
    marginBottom: 24,
    borderRadius: 32,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    ...SHADOWS.premium,
  },
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTextMain: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
  sosLabelContainer: {
    flex: 1,
    marginLeft: 16,
  },
  sosActionText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
  },
  sosWarningText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, marginTop: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: COLORS.black, letterSpacing: -0.5 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDF2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  aiBadgeText: { fontSize: 10, fontWeight: '900', color: '#4A5568', letterSpacing: 1 },
  seeAll: { color: COLORS.success, fontWeight: '900', fontSize: 14 },
  categoryScroll: { gap: 12, paddingBottom: 10 },
  categoryCard: { width: 95, backgroundColor: COLORS.white, padding: 12, borderRadius: 16, alignItems: 'center', ...SHADOWS.soft, borderWidth: 1, borderColor: '#F1F5F9' },
  catIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catTitle: { fontSize: 12, fontWeight: '900', color: COLORS.black },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error, marginRight: 6 },
  liveText: { fontSize: 11, fontWeight: '900', color: COLORS.error, letterSpacing: 1 },
  incidentCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, marginBottom: 16, overflow: 'hidden', ...SHADOWS.premium },
  incidentImage: { width: '100%', height: 180 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, height: 180 },
  incidentContent: { padding: SPACING.lg },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  incidentTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.black },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 6 },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '900' },
  incidentLoc: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: 12 },
  incidentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.background, paddingTop: 16 },
  impactBox: { flexDirection: 'row', alignItems: 'center' },
  impactText: { marginLeft: 6, fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '10', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  viewBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
});
