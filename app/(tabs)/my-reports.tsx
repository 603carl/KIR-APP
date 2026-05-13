import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, Filter, MapPin, Search } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542013936693-884638332954?q=80&w=400&auto=format&fit=crop';

export default function MyReportsScreen() {
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReports = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const { data, error } = await supabase
                .from('incidents')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filteredReports = reports.filter(r => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            (r.title || '').toLowerCase().includes(query) ||
            (r.location_name || '').toLowerCase().includes(query) ||
            (r.status || '').toLowerCase().includes(query)
        );
    });

    useEffect(() => {
        fetchReports();

        const channel = supabase
            .channel('my_reports_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'incidents' 
            }, () => fetchReports())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReports();
    };

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return 'Unknown Date';
            return new Date(dateStr).toLocaleDateString('en-KE', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        } catch (e) {
            return 'Date Error';
        }
    };

    const getStatusStyle = (status: string) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'submitted':
            case 'pending':
            case 'under_review': return { bg: COLORS.warning + '15', text: COLORS.warning, icon: Clock };
            case 'verified': return { bg: COLORS.success + '15', text: COLORS.success, icon: CheckCircle2 };
            case 'assigned':
            case 'in_progress': return { bg: COLORS.info + '15', text: COLORS.info, icon: AlertCircle };
            case 'resolved': return { bg: COLORS.primary + '15', text: COLORS.primary, icon: CheckCircle2 };
            case 'closed': return { bg: COLORS.textMuted + '15', text: COLORS.textMuted, icon: CheckCircle2 };
            case 'rejected': return { bg: COLORS.error + '15', text: COLORS.error, icon: AlertCircle };
            default: return { bg: COLORS.background, text: COLORS.textSecondary, icon: Clock };
        }
    };

    const renderItem = ({ item, index }: any) => {
        const status = getStatusStyle(item.status);
        const StatusIcon = status.icon;

        return (
            <MotiView
                from={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 50 }}
            >
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push(`/incident/${item.id}`)}
                    style={styles.card}
                >
                    <Image
                        source={{ uri: (item.media_urls && item.media_urls[0]) || PLACEHOLDER_IMAGE }}
                        style={styles.cardImage}
                    />
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                <StatusIcon size={12} color={status.text} />
                                <Text style={[styles.statusText, { color: status.text }]}>{(item.status || 'unknown').toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.locationRow}>
                            <MapPin size={14} color={COLORS.textMuted} />
                            <Text style={styles.locationText} numberOfLines={1}>{item.location_name}</Text>
                        </View>

                        <View style={styles.cardFooter}>
                            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                            <TouchableOpacity style={styles.detailsBtn} onPress={() => router.push(`/incident/${item.id}`)}>
                                <Text style={styles.detailsBtnText}>Track</Text>
                                <ChevronRight size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </MotiView>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safe} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Submissions</Text>
                    <TouchableOpacity style={styles.analyticsBtn} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Personal impact analytics are preparing for launch.')}>
                        <Text style={styles.analyticsText}>Insights</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={filteredReports}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyContainer}>
                                <AlertCircle size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>{searchQuery ? 'No matching reports' : 'No reports found'}</Text>
                                <TouchableOpacity style={styles.reportNowBtn} onPress={() => router.push('/(tabs)/report')}>
                                    <Text style={styles.reportNowText}>Report an Incident</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                        )
                    }
                    ListHeaderComponent={
                        <>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Total</Text>
                                    <Text style={styles.statValue}>{reports.length}</Text>
                                </View>
                                <View style={[styles.statItem, { backgroundColor: COLORS.primary + '10' }]}>
                                    <Text style={styles.statLabel}>Resolved</Text>
                                    <Text style={[styles.statValue, { color: COLORS.primary }]}>
                                        {reports.filter(r => ['Resolved', 'Closed', 'resolved', 'closed'].includes(r.status)).length}
                                    </Text>
                                </View>
                                <View style={[styles.statItem, { backgroundColor: COLORS.warning + '10' }]}>
                                    <Text style={styles.statLabel}>In Progress</Text>
                                    <Text style={[styles.statValue, { color: COLORS.warning }]}>
                                        {reports.filter(r => ['Submitted', 'Pending', 'Under Review', 'Assigned', 'In Progress', 'submitted', 'pending', 'under_review', 'assigned', 'in_progress'].includes(r.status)).length}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.searchRow}>
                                <View style={styles.searchBox}>
                                    <Search size={20} color={COLORS.textMuted} />
                                    <TextInput
                                        placeholder="Search my reports..."
                                        style={styles.searchInput}
                                        placeholderTextColor={COLORS.textMuted}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                                            <AlertCircle size={18} color={COLORS.textMuted} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7} onPress={() => Alert.alert('Filter', 'Advanced filtering coming soon.')}>
                                    <Filter size={20} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                        </>
                    }
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    safe: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingVertical: 24, backgroundColor: COLORS.white },
    title: { fontSize: 32, fontWeight: '900', color: COLORS.black },
    analyticsBtn: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: COLORS.primary + '10', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    analyticsText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
    listContent: { padding: SPACING.lg, paddingBottom: 120 },
    statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    statItem: { flex: 1, backgroundColor: COLORS.background, padding: 20, borderRadius: 24, ...SHADOWS.soft },
    statLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700', marginBottom: 6 },
    statValue: { fontSize: 24, fontWeight: '900', color: COLORS.black },
    searchRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, height: 56, borderRadius: 16, paddingHorizontal: 16 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: COLORS.black },
    filterBtn: { width: 56, height: 56, backgroundColor: COLORS.primary + '15', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: COLORS.white, borderRadius: 28, marginBottom: 24, overflow: 'hidden', ...SHADOWS.premium },
    cardImage: { width: '100%', height: 180 },
    cardContent: { padding: 20 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    statusText: { fontSize: 11, fontWeight: '900' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    locationText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.background, paddingTop: 18 },
    dateText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
    detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailsBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '700', marginTop: 16, marginBottom: 24 },
    reportNowBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    reportNowText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
});
