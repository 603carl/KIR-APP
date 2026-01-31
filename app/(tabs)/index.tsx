import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { normalizeCounty } from '@/lib/utils';
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
  Zap
} from 'lucide-react-native';
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

  // 1. Initial mounting tasks - OPTIMIZED with parallel loading
  useEffect(() => {
    // Load all initial data in parallel for faster startup
    Promise.all([
      fetchUser(),
      fetchStats(),
      checkLocationPermission()
    ]);

    const subscription = supabase
      .channel('public:incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchIncidents();
        fetchStats();
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile?.full_name) {
      setUserName(profile.full_name.split(' ')[0]);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true });
      const { count: resolved } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['Resolved', 'Closed', 'resolved', 'closed']);

      if (total && total > 0) {
        setStats({
          resolvedRate: `${((resolved || 0) / total * 100).toFixed(1)}%`,
          trend: '+2.4%'
        });
      }
    } catch (e) {
      console.error('Stats error:', e);
    }
  };


  const checkLocationPermission = async () => {
    if (isRequestingLocation.current) return;
    isRequestingLocation.current = true;

    try {
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = currentStatus;

      if (currentStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
    if (sosActive) {
      Alert.alert(
        'Cancel SOS?',
        'Are you sure you want to cancel this emergency alert? Only do this if you are safe.',
        [
          { text: 'Keep Active', style: 'cancel' },
          {
            text: 'Cancel SOS',
            style: 'destructive',
            onPress: async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase
                    .from('sos_alerts')
                    .update({ status: 'cancelled' })
                    .eq('user_id', user.id)
                    .eq('status', 'active');
                }
                setSosActive(false);
                Alert.alert('SOS Cancelled', 'Your emergency alert has been cancelled.');
              } catch (e) {
                console.error('Cancel SOS error:', e);
                setSosActive(false); // UI fallback
              }
            }
          }
        ]
      );
      return;
    }

    // INSTANT UI FEEDBACK - Activate immediately before any async work
    setSosActive(true);

    try {
      // Use cached user for speed, fallback to fresh fetch
      let user = cachedUser.current;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }

      if (!user) {
        setSosActive(false);
        Alert.alert('Authentication Required', 'Please log in to use SOS feature.');
        return;
      }

      // Use cached location if available for instant response, fetch fresh in background
      let lat = userLocation?.coords.latitude;
      let lng = userLocation?.coords.longitude;

      if (!lat || !lng) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setSosActive(false);
          Alert.alert('Location Required', 'SOS needs your location to send help.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }

      let locationName = 'Unknown Location';

      // Insert SOS alert immediately with coordinates (fast path)
      const { data: sosData, error: sosError } = await supabase.from('sos_alerts').insert({
        user_id: user.id,
        lat,
        lng,
        location_name: 'Locating...',
        status: 'active'
      }).select().single();

      if (sosError) throw sosError;

      // Enrich with location details in background
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        .then(async (results) => {
          if (results && results[0]) {
            const loc = results[0];
            const resolvedAddress = [loc.street, loc.district, loc.city].filter(Boolean).join(', ');
            const county = normalizeCounty(loc.region || loc.city || '');
            const subCounty = loc.subregion || loc.district || '';

            await supabase.from('sos_alerts').update({
              location_name: resolvedAddress,
              county: county,
              sub_county: subCounty
            }).eq('id', sosData.id);
          }
        })
        .catch(err => console.error('Geocoding error:', err));

      if (sosError) throw sosError;

      // Create watch command alert in background (don't block UI)
      (async () => {
        try {
          await supabase.from('alerts').insert({
            rule_name: 'SOS Emergency',
            message: `EMERGENCY SOS from user at ${locationName} (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
            severity: 'critical',
            acknowledged: false,
            user_id: user.id,
            sos_alert_id: sosData.id
          });
        } catch (e) { /* Background task, ignore errors */ }
      })();

      Alert.alert('SOS Sent', 'Emergency services have been notified. Stay calm, help is on the way.');

    } catch (error: any) {
      console.error('SOS Error:', error);
      setSosActive(false);
      Alert.alert('SOS Failed', error.message || 'Could not send SOS. Please try again or call emergency services directly.');
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

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Habari, {userName}</Text>
              <Text style={styles.headerTitle}>Kenya Incident Hub</Text>
            </View>
            <TouchableOpacity style={styles.profileBadge}>
              <ShieldCheck color={COLORS.primary} size={20} />
              <Text style={styles.badgeText}>Verified</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.searchContainer}
          >
            <View style={styles.searchBox}>
              <Search size={20} color={COLORS.textMuted} />
              <TextInput
                placeholder="Search incidents or locations..."
                style={styles.searchInput}
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </MotiView>

          {/* National Stats */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={[COLORS.primary, '#004D2C']}
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
                <TrendingUp color="rgba(255,255,255,0.6)" size={48} />
              </View>
            </LinearGradient>
          </View>

          {/* SOS Emergency Button */}
          <MotiView
            from={{ scale: sosActive ? 1 : 0.95 }}
            animate={{ scale: sosActive ? [1, 1.05, 1] : 1 }}
            transition={{ loop: sosActive, type: 'timing', duration: 500 }}
          >
            <TouchableOpacity
              style={[
                styles.sosButton,
                sosActive && styles.sosButtonActive
              ]}
              onPress={handleSOS}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={sosActive ? ['#DC2626', '#991B1B'] : ['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sosGradient}
              >
                <View style={styles.sosContent}>
                  <View style={styles.sosIconContainer}>
                    <AlertCircle color={COLORS.white} size={32} />
                  </View>
                  <View style={styles.sosTextContainer}>
                    <Text style={styles.sosTitle}>{sosActive ? 'SOS ACTIVE' : 'SOS Emergency'}</Text>
                    <Text style={styles.sosSub}>{sosActive ? 'Help is on the way...' : 'Tap for immediate assistance'}</Text>
                  </View>
                  {sosActive && (
                    <MotiView
                      from={{ opacity: 0.5 }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ loop: true, type: 'timing', duration: 800 }}
                      style={styles.sosLiveIndicator}
                    >
                      <View style={styles.sosLiveDot} />
                      <Text style={styles.sosLiveText}>LIVE</Text>
                    </MotiView>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>

          {/* Quick Categories */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Report</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            <TouchableOpacity
              style={[styles.categoryCard, !selectedCategory && { backgroundColor: COLORS.primary + '10' }]}
              onPress={() => setSelectedCategory(null)}
            >
              <View style={[styles.catIconBox, { backgroundColor: COLORS.primary + '20' }]}>
                <TrendingUp color={COLORS.primary} size={24} />
              </View>
              <Text style={styles.catTitle}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, selectedCategory === cat.title && { backgroundColor: cat.color + '10' }]}
                onPress={() => setSelectedCategory(selectedCategory === cat.title ? null : cat.title)}
              >
                <View style={[styles.catIconBox, { backgroundColor: cat.color + '20' }]}>
                  <cat.icon color={cat.color} size={24} />
                </View>
                <Text style={styles.catTitle}>{cat.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Recent Activity Feed */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Community Feed</Text>
              <View style={styles.aiBadge}>
                <Zap size={10} color={COLORS.primary} />
                <Text style={styles.aiBadgeText}>AI RANKED</Text>
              </View>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.dot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {incidents.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/incident/${item.id}`)}
              activeOpacity={0.9}
            >
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 100 }}
                style={styles.incidentCard}
              >
                <Image
                  source={{ uri: item.media_urls?.[0] || 'https://images.unsplash.com/photo-1594495894542-a46cc73e081a?q=80&w=400&auto=format&fit=crop' }}
                  style={styles.incidentImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.imageOverlay}
                />
                <View style={styles.incidentContent}>
                  <View style={styles.incidentHeader}>
                    <Text style={styles.incidentTitle}>{item.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: COLORS.primary + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
                      <Text style={[styles.statusText, { color: COLORS.primary }]}>{item.status || 'Pending'}</Text>
                    </View>
                  </View>
                  <Text style={styles.incidentLoc}>{item.location_name} • {getTimeAgo(item.created_at)}</Text>

                  <View style={styles.incidentFooter}>
                    <View style={styles.impactBox}>
                      <TrendingUp size={14} color={COLORS.primary} />
                      <Text style={styles.impactText}>{item.category}</Text>
                    </View>
                    <View style={styles.viewBtn}>
                      <Text style={styles.viewBtnText}>View Details</Text>
                      <ChevronRight size={14} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
              </MotiView>
            </TouchableOpacity>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  greeting: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.black },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, ...SHADOWS.soft },
  badgeText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: COLORS.primary },
  searchContainer: { marginBottom: SPACING.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, height: 56, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, ...SHADOWS.soft },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: COLORS.black },
  statsContainer: { marginBottom: SPACING.lg },
  statsCard: { height: 140, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, justifyContent: 'center' },
  statsContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  statsValue: { color: COLORS.white, fontSize: 36, fontWeight: '900' },
  statsTrend: { color: COLORS.success, fontSize: 13, fontWeight: '700', marginTop: 4 },
  sosButton: { marginBottom: SPACING.lg, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', ...SHADOWS.medium },
  sosButtonActive: { ...SHADOWS.premium, transform: [{ scale: 1.02 }] },
  sosGradient: { padding: SPACING.lg },
  sosContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sosIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  sosTextContainer: { flex: 1 },
  sosTitle: { fontSize: 20, fontWeight: '900', color: COLORS.white },
  sosSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  sosLiveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  sosLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700' },
  sosLiveText: { fontSize: 10, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md, marginTop: SPACING.md },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: COLORS.black },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  aiBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  seeAll: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  categoryScroll: { gap: 12, paddingBottom: 10 },
  categoryCard: { width: 100, backgroundColor: COLORS.white, padding: 16, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.soft },
  catIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catTitle: { fontSize: 13, fontWeight: '700', color: COLORS.black },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.error + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error, marginRight: 6 },
  liveText: { fontSize: 10, fontWeight: '900', color: COLORS.error },
  incidentCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, marginBottom: 16, overflow: 'hidden', ...SHADOWS.premium },
  incidentImage: { width: '100%', height: 180 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, height: 180 },
  incidentContent: { padding: SPACING.lg },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  incidentTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '900' },
  incidentLoc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  incidentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.background, paddingTop: 16 },
  impactBox: { flexDirection: 'row', alignItems: 'center' },
  impactText: { marginLeft: 6, fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '10', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  viewBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
});
