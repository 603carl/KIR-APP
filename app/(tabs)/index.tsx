import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  AlertCircle,
  ChevronRight,
  Droplet,
  Map as MapIcon,
  Search,
  ShieldCheck,
  TrendingUp,
  Truck,
  Zap
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  useEffect(() => {
    fetchIncidents();
    fetchStats();
    fetchUser();

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
  }, [searchQuery, selectedCategory]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name.split(' ')[0]);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true });
      const { count: resolved } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'Resolved');

      if (total && total > 0) {
        setStats({
          resolvedRate: `${((resolved || 0) / total * 100).toFixed(1)}%`,
          trend: '+2.4%' // Mock trend for now
        });
      }
    } catch (e) {
      console.error('Stats error:', e);
    }
  };

  const fetchIncidents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Optional location logic
      let lat = null;
      let lng = null;

      if (!userLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation(loc);
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } else {
        lat = userLocation.coords.latitude;
        lng = userLocation.coords.longitude;
      }

      const { data, error } = await supabase
        .rpc('get_smart_community_feed', {
          target_user_id: user.id,
          user_lat: lat,
          user_lng: lng,
          search_query: searchQuery || null,
          selected_cat: selectedCategory || null
        });

      if (error) throw error;
      if (data) setIncidents(data);
    } catch (error) {
      console.error('Smart Feed error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

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

          {/* Map View Toggle */}
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => router.push('/map')}
          >
            <BlurView intensity={80} tint="light" style={styles.mapBlur}>
              <View style={styles.mapBtnContent}>
                <View style={styles.mapBtnTextContainer}>
                  <MapIcon color={COLORS.primary} size={24} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.mapBtnTitle}>Interactive Map</Text>
                    <Text style={styles.mapBtnSub}>View real-time incidents nearby</Text>
                  </View>
                </View>
                <ChevronRight color={COLORS.textMuted} size={20} />
              </View>
            </BlurView>
          </TouchableOpacity>

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
                    <View style={[styles.statusBadge, { backgroundColor: (item.severity === 'High' || item.severity === 'Critical') ? COLORS.error + '20' : COLORS.warning + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: (item.severity === 'High' || item.severity === 'Critical') ? COLORS.error : COLORS.warning }]} />
                      <Text style={[styles.statusText, { color: (item.severity === 'High' || item.severity === 'Critical') ? COLORS.error : COLORS.warning }]}>{item.severity}</Text>
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
  mapButton: { marginBottom: SPACING.lg, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', ...SHADOWS.medium },
  mapBlur: { padding: SPACING.md },
  mapBtnContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapBtnTextContainer: { flexDirection: 'row', alignItems: 'center' },
  mapBtnTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black },
  mapBtnSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
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
