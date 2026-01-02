import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, Filter, MapPin, Search } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542013936693-884638332954?q=80&w=400&auto=format&fit=crop';

export default function MyReportsScreen() {
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchReports = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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

    useEffect(() => {
        fetchReports();

        const subscription = supabase
            .channel('my_reports_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
                fetchReports();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReports();
    };
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending': return { bg: COLORS.warning + '15', text: COLORS.warning, icon: Clock };
            case 'In-Progress': return { bg: COLORS.info + '15', text: COLORS.info, icon: AlertCircle };
            case 'Resolved': return { bg: COLORS.primary + '15', text: COLORS.primary, icon: CheckCircle2 };
            case 'Verified': return { bg: COLORS.success + '15', text: COLORS.success, icon: CheckCircle2 };
            case 'Rejected': return { bg: COLORS.error + '15', text: COLORS.error, icon: AlertCircle };
            default: return { bg: COLORS.background, text: COLORS.textSecondary, icon: Clock };
        }
    };

    const renderItem = ({ item, index }: any) => {
        const status = getStatusStyle(item.status);
        const StatusIcon = status.icon;

        return (
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 100 }}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push(`/incident/${item.id}`)}
                    style={styles.card}
                >
                    <Image
                        source={{ uri: (item.media_urls && item.media_urls[0]) || PLACEHOLDER_IMAGE }}
                        style={styles.cardImage}
                    />
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                <StatusIcon size={12} color={status.text} />
                                <Text style={[styles.statusText, { color: status.text }]}>{item.status}</Text>
                            </View>
                        </View>

                        <View style={styles.locationRow}>
                            <MapPin size={14} color={COLORS.textMuted} />
                            <Text style={styles.locationText}>{item.location_name}</Text>
                        </View>

                        <View style={styles.cardFooter}>
                            <Text style={styles.dateText}>
                                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity style={styles.detailsBtn}>
                                <Text style={styles.detailsBtnText}>Track Status</Text>
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
                    <TouchableOpacity style={styles.analyticsBtn}>
                        <Text style={styles.analyticsText}>Insights</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={reports}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyContainer}>
                                <AlertCircle size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>No reports found</Text>
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
                                        {reports.filter(r => r.status === 'Resolved').length}
                                    </Text>
                                </View>
                                <View style={[styles.statItem, { backgroundColor: COLORS.warning + '10' }]}>
                                    <Text style={styles.statLabel}>Pending</Text>
                                    <Text style={[styles.statValue, { color: COLORS.warning }]}>
                                        {reports.filter(r => r.status === 'Pending').length}
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
                                    />
                                </View>
                                <TouchableOpacity style={styles.filterBtn}>
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
