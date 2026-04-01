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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MessageSquare, Shield, X as CloseIcon } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SOSChatModal } from '@/components/SOSChatModal';
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

// 0. Memoized Components for Ultra Fast Response
const CategoryCard = React.memo(({ cat, isSelected, onPress }: { cat: any, isSelected: boolean, onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.categoryCard, isSelected && { borderColor: cat.color, backgroundColor: cat.color + '10' }]}
    onPress={onPress}
  >
    <View style={[styles.catIconBox, { backgroundColor: cat.color + '15' }]}><cat.icon color={cat.color} size={26} /></View>
    <Text style={styles.catTitle}>{cat.title}</Text>
  </TouchableOpacity>
));

const IncidentCard = React.memo(({ item, index, onPress, timeAgo }: { item: Incident, index: number, onPress: () => void, timeAgo: string }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
    <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 50 }} style={styles.incidentCard}>
      <Image source={{ uri: item.media_urls?.[0] || 'https://images.unsplash.com/photo-1594495894542-a46cc73e081a?q=80&w=400&auto=format&fit=crop' }} style={styles.incidentImage} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay} />
      <View style={styles.incidentContent}>
        <View style={styles.incidentHeader}>
          <Text style={styles.incidentTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.primary + '15' }]}><View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} /><Text style={[styles.statusText, { color: COLORS.primary }]}>{item.status || 'Active'}</Text></View>
        </View>
        <Text style={styles.incidentLoc}>{item.location_name} • {timeAgo}</Text>
        <View style={styles.incidentFooter}>
          <View style={styles.impactBox}><TrendingUp size={14} color={COLORS.primary} /><Text style={styles.impactText}>{item.category}</Text></View>
          <View style={styles.viewBtn}><Text style={styles.viewBtnText}>View</Text><ChevronRight size={14} color={COLORS.primary} /></View>
        </View>
      </View>
    </MotiView>
  </TouchableOpacity>
));

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
  const [activeSosId, setActiveSosId] = useState<string | null>(null);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // 1. Initial mounting tasks
  useEffect(() => {
    loadCachedData().then(() => {
      Promise.all([
        fetchUser(),
        fetchStats(),
        checkLocationPermission()
      ]);
    });

    const subscription = supabase
      .channel('public:incidents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        const newIncident = payload.new as Incident;
        setIncidents(prev => [newIncident, ...prev]);
        fetchStats();
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

  // Track chat visibility via ref so realtime callbacks don't need effect re-runs
  const isChatVisibleRef = useRef(isChatVisible);
  useEffect(() => { isChatVisibleRef.current = isChatVisible; }, [isChatVisible]);

  // 1.5 SOS Chat Sync & Active Detection — STABLE (runs once on mount)
  // We keep track of active subscriptions to avoid duplicates
  const subscriptionsRef = useRef<{ alertSub: any, messageSub: any }>({ alertSub: null, messageSub: null });

  const clearSosListeners = useCallback(() => {
    if (subscriptionsRef.current.alertSub) {
      supabase.removeChannel(subscriptionsRef.current.alertSub);
      subscriptionsRef.current.alertSub = null;
    }
    if (subscriptionsRef.current.messageSub) {
      supabase.removeChannel(subscriptionsRef.current.messageSub);
      subscriptionsRef.current.messageSub = null;
    }
  }, []);

  const attachSosListeners = useCallback((sosId: string) => {
    // Clear existing before attaching new ones
    clearSosListeners();

    // A. Listen for status changes (persistence) — STABLE channel
    const alertSub = supabase
      .channel(`sos_status:${sosId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_alerts', filter: `id=eq.${sosId}` },
        (payload) => {
          const updated = payload.new as any;
          if (['resolved', 'cancelled', 'acknowledged'].includes(updated.status)) {
            setSosActive(false);
            setActiveSosId(null);
            setUnreadCount(0);
            setIsChatVisible(false);
            clearSosListeners();
          }
        }
      )
      .subscribe();

    // B. Listen for new operator messages — STABLE channel, uses ref for chat visibility
    const messageSub = supabase
      .channel(`sos_messages:${sosId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_messages',
          filter: `sos_id=eq.${sosId}`
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_role !== 'citizen' && !isChatVisibleRef.current) {
            setUnreadCount(prev => prev + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      )
      .subscribe();

      subscriptionsRef.current = { alertSub, messageSub };
  }, [clearSosListeners]);

  useEffect(() => {

    const checkActiveSos = async () => {
      const user = cachedUser.current || (await supabase.auth.getUser()).data.user;
      if (!user) return;
      if (!cachedUser.current) cachedUser.current = user;

      // 1. Fetch MOST RECENT active SOS session
      const { data: sosData } = await supabase
        .from('sos_alerts')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sosData) {
        setSosActive(true);
        setActiveSosId(sosData.id);
        
        // 2. Fetch unread messages count for this SOS
        const { count } = await supabase
          .from('sos_messages' as any)
          .select('*', { count: 'exact', head: true })
          .eq('sos_id', sosData.id)
          .neq('sender_role', 'citizen')
          .is('is_read' as any, false);
        
        setUnreadCount(count || 0);
        
        attachSosListeners(sosData.id);
      } else {
        setSosActive(false);
        setActiveSosId(null);
        setUnreadCount(0);
      }
    };

    checkActiveSos();

    // 1.7 Global Incident Feed Listener — STABLE
    const incidentsSub = supabase
      .channel('public_incidents_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          console.log('[Realtime] Incidents update detected, refreshing feed...');
          fetchIncidents();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      clearSosListeners();
      if (incidentsSub) supabase.removeChannel(incidentsSub);
    };
  }, [attachSosListeners, clearSosListeners]); // STABLE — no dependencies, channels stay alive

  // 2. Fetch incidents when query/category/location changes
  useEffect(() => {
    fetchIncidents();
  }, [searchQuery, selectedCategory, userLocation]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    cachedUser.current = user;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile?.full_name && profile.full_name !== 'Citizen') {
      setUserName(profile.full_name.split(' ')[0]);
    } else {
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Citizen';
      setUserName(fullName.split(' ')[0]);
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

  const cancelSOS = useCallback(async () => {
    if (!activeSosId) return;

    // INSTANT CANCEL — no dialog, no delay
    const cancellingId = activeSosId;

    // 1. Reset local state IMMEDIATELY for instant UI feedback
    setSosActive(false);
    setActiveSosId(null);
    setUnreadCount(0);
    setIsChatVisible(false);
    clearSosListeners();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const user = cachedUser.current || (await supabase.auth.getUser()).data.user;

      // 2. Update SOS status to cancelled in DB
      const { error: updateError } = await supabase
        .from('sos_alerts')
        .update({
          status: 'cancelled',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', cancellingId);

      if (updateError) throw updateError;

      // 3. Send a system message so Watch Command knows
      await supabase.from('sos_messages').insert({
        sos_id: cancellingId,
        content: '⚠️ SOS has been cancelled by the citizen.',
        sender_role: 'citizen',
        sender_name: userName || 'Citizen',
        sender_id: user?.id || null,
      });
    } catch (error) {
      console.error('SOS Cancel Error:', error);
      Alert.alert('Cancel Failed', 'Could not sync cancellation. Please check your connection.');
    }
  }, [activeSosId, userName]);

  const handleSOS = useCallback(async () => {
    if (sosActive) {
      // INSTANT CANCEL — one tap to deactivate
      cancelSOS();
      return;
    }

    // 1. FAST TRIGGER (UI FEEDBACK)
    setSosActive(true);
    setActiveSosId(null); // Wait for real ID
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    try {
      const user = cachedUser.current || (await supabase.auth.getUser()).data.user;
      if (!user) {
        setSosActive(false);
        Alert.alert('Authentication Error', 'Please login to trigger emergency protocols.');
        return;
      }

      // HIGH ACCURACY FETCH (FRESH)
      let finalLat = -1.2921;
      let finalLng = 36.8219;
      
      try {
        const freshLoc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.BestForNavigation
        });
        finalLat = freshLoc.coords.latitude;
        finalLng = freshLoc.coords.longitude;
        setUserLocation(freshLoc);
      } catch (e) {
        console.warn('High accuracy fetch failed, using state/default', e);
        if (userLocation) {
          finalLat = userLocation.coords.latitude;
          finalLng = userLocation.coords.longitude;
        }
      }

      const { data: sosData, error: sosError } = await supabase.from('sos_alerts').insert({
        user_id: user.id,
        lat: finalLat,
        lng: finalLng,
        location_name: 'Locating...',
        status: 'active'
      }).select().single();

      if (sosError) throw sosError;
      
      // Update with REAL ID once DB confirms
      setActiveSosId(sosData.id);
      
      // CRITICAL BUG FIX: Attach listeners immediately for NEW sessions!
      attachSosListeners(sosData.id);

      // Async location enrichment
      (async () => {
        try {
          const results = await Location.reverseGeocodeAsync({ latitude: finalLat, longitude: finalLng });
          if (results && results[0]) {
            const loc = results[0];
            const address = [loc.street, loc.district, loc.name].filter(Boolean).join(', ');
            const county = normalizeCounty(loc.region || loc.city || '');
            await supabase.from('sos_alerts').update({ location_name: address, county }).eq('id', sosData.id);
            await supabase.from('alerts').insert({
              rule_name: 'SOS EMERGENCY',
              message: `CRITICAL: SOS from user at ${address}`,
              severity: 'critical',
              user_id: user.id,
              sos_alert_id: sosData.id
            });
          }
        } catch (e) { console.warn('SOS enrichment fail', e); }
      })();
    } catch (error) {
      console.error('SOS FAILED:', error);
      setSosActive(false);
      setActiveSosId(null);
      Alert.alert('SOS Failure', 'System link error. Please call 999.');
    }
  }, [sosActive, userLocation, userName, cancelSOS]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
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

          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={22} color="#94A3B8" />
              <TextInput
                placeholder="Search incidents..."
                style={styles.searchInput}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </MotiView>

          <View style={styles.statsContainer}>
            <LinearGradient colors={['#064E3B', '#022C22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsCard}>
              <View style={styles.statsContent}>
                <View>
                  <Text style={styles.statsLabel}>National Resolved</Text>
                  <Text style={styles.statsValue}>{stats.resolvedRate}</Text>
                  <Text style={styles.statsTrend}>{stats.trend} this week</Text>
                </View>
                <TrendingUp color="#4ADE80" size={48} strokeWidth={3} />
              </View>
            </LinearGradient>
          </View>

          <MotiView from={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.sosCardContainer}>
            <TouchableOpacity onPress={handleSOS} activeOpacity={0.9} style={[styles.sosCardInner, sosActive && styles.sosCardInnerActive]}>
              {sosActive && (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#991B1B', borderRadius: 28 }]} />
              )}
              <View style={styles.sosButtonContainer}>
                <View style={styles.sos3DShadow} />
                <LinearGradient colors={['#FF3B3B', '#DC2626', '#991B1B']} style={styles.sos3DButton}>
                  <View style={styles.sosInnerCircle}><Text style={styles.sosButtonText}>SOS</Text></View>
                </LinearGradient>
              </View>
              <View style={styles.sosTextBody}>
                <Text style={styles.sosMainLabel}>{sosActive ? 'SOS ACTIVE' : 'SOS Emergency'}</Text>
                <Text style={styles.sosSubLabel}>Only For Emergency</Text>
              </View>
              {sosActive && (
                <MotiView from={{ opacity: 0.4, scale: 1 }} animate={{ opacity: 1, scale: 1.2 }} transition={{ loop: true, type: 'timing', duration: 1000 }} style={styles.activePulse}>
                  <View style={styles.pulseDot} />
                </MotiView>
              )}
            </TouchableOpacity>
          </MotiView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Report</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/my-reports')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            <TouchableOpacity
              style={[styles.categoryCard, !selectedCategory && { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]}
              onPress={() => setSelectedCategory(null)}
            >
              <View style={[styles.catIconBox, { backgroundColor: '#DBEAFE' }]}><TrendingUp color="#3B82F6" size={26} /></View>
              <Text style={styles.catTitle}>All</Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <CategoryCard 
                key={cat.id} 
                cat={cat} 
                isSelected={selectedCategory === cat.title} 
                onPress={() => setSelectedCategory(selectedCategory === cat.title ? null : cat.title)}
              />
            ))}
          </ScrollView>

          <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
            <View>
              <Text style={styles.sectionTitle}>Community Feed</Text>
              <MotiView from={{ opacity: 0, translateX: -10 }} animate={{ opacity: 1, translateX: 0 }} style={styles.aiBadge}>
                <Zap size={12} color="#4A5568" />
                <Text style={styles.aiBadgeText}>AI RANKED</Text>
              </MotiView>
            </View>
            <View style={styles.liveIndicator}><View style={styles.dot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>

          {loading && incidents.length === 0 ? (
            [1, 2, 3].map((key) => <SkeletonCard key={key} />)
          ) : (
            incidents.map((item, index) => (
              <IncidentCard 
                key={item.id} 
                item={item} 
                index={index} 
                onPress={() => router.push(`/incident/${item.id}`)}
                timeAgo={getTimeAgo(item.created_at)}
              />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* SOS Tactical Chat Trigger */}
      <AnimatePresence>
        {sosActive && activeSosId && (
          <MotiView
            from={{ opacity: 0, scale: 0.5, translateY: 50 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            exit={{ opacity: 0, scale: 0.5, translateY: 50 }}
            style={styles.chatFabContainer}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                setIsChatVisible(true);
                setUnreadCount(0);
              }}
              style={styles.chatFab}
            >
              <LinearGradient
                colors={[COLORS.accent, '#991B1B']}
                style={styles.chatFabGradient}
              >
                <MessageSquare color={COLORS.white} size={28} />
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unreadCount}</Text>
                  </View>
                )}
              </LinearGradient>
              <View style={styles.chatFabLabel}>
                <Text style={styles.chatFabLabelText}>TACTICAL LINK</Text>
              </View>
            </TouchableOpacity>
          </MotiView>
        )}
      </AnimatePresence>

      {/* SOS Chat Modal */}
      {activeSosId && (
        <SOSChatModal 
          isVisible={isChatVisible}
          onClose={() => setIsChatVisible(false)}
          sosId={activeSosId}
          onCancelSOS={cancelSOS}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: 8 },
  header: { paddingHorizontal: 4, paddingBottom: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: '700', color: '#1A202C' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: -2 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#DCFCE7' },
  verifiedIconContainer: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  badgeText: { fontSize: 10, fontWeight: '900', color: COLORS.success, textTransform: 'uppercase' },
  searchContainer: { marginBottom: 20 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, height: 52, borderRadius: 16, paddingHorizontal: 16, ...SHADOWS.soft },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: COLORS.black },
  statsContainer: { marginBottom: 24 },
  statsCard: { padding: 20, borderRadius: 24 },
  statsContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  statsValue: { color: COLORS.white, fontSize: 32, fontWeight: '900', marginTop: 2 },
  statsTrend: { color: '#4ADE80', fontSize: 12, fontWeight: '700', marginTop: 4 },
  sosCardContainer: { marginBottom: 24, borderRadius: 28, backgroundColor: '#DC2626', ...SHADOWS.premium },
  sosCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 28, overflow: 'hidden' },
  sosCardInnerActive: { backgroundColor: 'transparent' },
  sosButtonContainer: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  sos3DShadow: { position: 'absolute', bottom: 2, width: 74, height: 74, borderRadius: 37, backgroundColor: '#000', opacity: 0.5 },
  sos3DButton: { width: 74, height: 74, borderRadius: 37, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
  sosInnerCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  sosButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  sosTextBody: { flex: 1, marginLeft: 16 },
  sosMainLabel: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  sosSubLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginTop: 2 },
  activePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(239, 68, 68, 0.4)', justifyContent: 'center', alignItems: 'center' },
  pulseDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.black },
  seeAll: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  categoryScroll: { gap: 12, paddingBottom: 16 },
  categoryCard: { width: 90, backgroundColor: COLORS.white, padding: 12, borderRadius: 16, alignItems: 'center', ...SHADOWS.soft },
  catIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: '#F8FAFC' },
  catTitle: { fontSize: 12, fontWeight: '700', color: COLORS.black },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  aiBadgeText: { fontSize: 9, fontWeight: '900', color: '#64748B' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error, marginRight: 6 },
  liveText: { fontSize: 10, fontWeight: '900', color: COLORS.error },
  incidentCard: { backgroundColor: COLORS.white, borderRadius: 24, marginBottom: 16, overflow: 'hidden', ...SHADOWS.soft },
  incidentImage: { width: '100%', height: 160 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, height: 160 },
  incidentContent: { padding: 16 },
  incidentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  incidentTitle: { fontSize: 16, fontWeight: '800', color: COLORS.black, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, gap: 4 },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusText: { fontSize: 10, fontWeight: '800' },
  incidentLoc: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 },
  incidentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  impactBox: { flexDirection: 'row', alignItems: 'center' },
  impactText: { marginLeft: 6, fontSize: 12, color: '#64748B', fontWeight: '600' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  chatFabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  chatFab: {
    alignItems: 'center',
  },
  chatFabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.premium,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chatFabLabel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  chatFabLabelText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.white,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  unreadText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
  },
});
