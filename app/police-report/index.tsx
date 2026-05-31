import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { type PoliceReport } from '@/lib/policeReports';
import { supabase } from '@/lib/supabase';
import { type Href, Stack, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, FileLock2, Plus, ShieldCheck } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyPoliceReports() {
    const router = useRouter();
    const [reports, setReports] = useState<PoliceReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('police_reports')
                .select('id,submission_reference,ob_number,status,case_module,title,nature_of_report,preferred_station,current_station,current_division,occurrence_location,created_at,updated_at')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setReports((data || []) as PoliceReport[]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load().catch(console.error);
        const channel = supabase.channel('my_private_police_reports')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'police_reports' }, () => load().catch(console.error))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [load]);

    return <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><ArrowLeft color={COLORS.text} /></TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.title}>My Police Reports</Text>
                <Text style={styles.sub}>Private cases visible only to you and authorized Watch staff</Text>
            </View>
            <TouchableOpacity style={styles.add} onPress={() => router.push('/police-report/new' as Href)}><Plus color={COLORS.white} size={20} /></TouchableOpacity>
        </View>
        <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load().catch(console.error); }} colors={[COLORS.primary]} />}
            ListEmptyComponent={loading
                ? <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} />
                : <View style={styles.empty}><FileLock2 size={44} color={COLORS.textMuted} /><Text style={styles.emptyTitle}>No private police reports</Text><Text style={styles.emptyText}>Reports filed here do not appear in the public incident feed.</Text></View>}
            renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => router.push(`/police-report/${item.id}` as Href)}>
                <View style={styles.row}><ShieldCheck color={COLORS.primary} size={20} /><Text style={styles.reference}>{item.submission_reference}</Text><Text style={styles.status}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text></View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.meta}>{item.current_station || item.preferred_station}{item.current_division ? ` / ${item.current_division}` : ''} | {new Date(item.created_at).toLocaleDateString('en-KE')}</Text>
                <View style={styles.ob}><Text style={styles.obText}>OB Number: {item.ob_number || 'Pending Official Recording'}</Text><ChevronRight size={16} color={COLORS.primary} /></View>
            </TouchableOpacity>}
        />
    </SafeAreaView>;
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background }, header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    title: { fontSize: 20, fontWeight: '900', color: COLORS.text }, sub: { fontSize: 11, lineHeight: 16, color: COLORS.textSecondary, marginTop: 3 },
    add: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
    list: { padding: SPACING.lg, paddingBottom: 40 }, card: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, marginBottom: 13, ...SHADOWS.soft },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, reference: { flex: 1, fontSize: 12, color: COLORS.primary, fontWeight: '900' },
    status: { fontSize: 10, fontWeight: '900', color: COLORS.textSecondary, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 13 }, meta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },
    ob: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    obText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary }, empty: { paddingTop: 70, alignItems: 'center' },
    emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '800', color: COLORS.text }, emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 8, lineHeight: 20 },
});
