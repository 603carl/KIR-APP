import { COLORS, SHADOWS } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Filter, Layers, MapPin, Navigation } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Incident {
    id: string;
    lat: number;
    lng: number;
    title: string;
    category: string;
    severity: string;
}

export default function MapScreen() {
    const router = useRouter();
    const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIncidents();

        const subscription = supabase
            .channel('map_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
                fetchIncidents();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    useEffect(() => {
        let filtered = incidents;
        if (searchQuery) {
            filtered = incidents.filter(i =>
                i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        setFilteredIncidents(filtered);
    }, [searchQuery, incidents]);

    const fetchIncidents = async () => {
        try {
            const { data, error } = await supabase
                .from('incidents')
                .select('id, lat, lng, title, category, severity');

            if (error) throw error;
            if (data) setIncidents(data);
        } catch (error) {
            console.error('Error fetching incidents:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: -1.286389,
                    longitude: 36.817223,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                mapType={mapType}
            >
                {filteredIncidents.map((incident) => (
                    <Marker
                        key={incident.id}
                        coordinate={{ latitude: incident.lat, longitude: incident.lng }}
                    >
                        <View style={[styles.marker, { backgroundColor: incident.severity === 'High' || incident.severity === 'Critical' ? COLORS.error : COLORS.primary }]}>
                            <AlertTriangle size={16} color={COLORS.white} />
                        </View>
                        <Callout tooltip onPress={() => router.push(`/incident/${incident.id}`)}>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>{incident.title}</Text>
                                <Text style={styles.calloutType}>{incident.category} • {incident.severity}</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

            {/* Floating Controls */}
            <SafeAreaView style={styles.controls} pointerEvents="box-none">
                <View style={styles.topControls}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <ArrowLeft size={24} color={COLORS.black} />
                    </TouchableOpacity>

                    <BlurView intensity={80} style={styles.searchBar}>
                        <MapPin size={20} color={COLORS.primary} />
                        <TextInput
                            placeholder="Find incidents..."
                            style={styles.mapSearchInput}
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </BlurView>
                </View>

                <View style={styles.sideControls}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}>
                        <Layers size={22} color={COLORS.black} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Filter size={22} color={COLORS.black} />
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomControls}>
                    <TouchableOpacity style={styles.locationBtn}>
                        <Navigation size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
    controls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
    topControls: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
    backBtn: { width: 48, height: 48, backgroundColor: COLORS.white, borderRadius: 24, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    searchBar: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.85)', ...SHADOWS.medium },
    mapSearchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.black, fontWeight: '600' },
    sideControls: { position: 'absolute', right: 20, top: 120, gap: 12 },
    iconBtn: { width: 48, height: 48, backgroundColor: COLORS.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    bottomControls: { position: 'absolute', bottom: 40, right: 20 },
    locationBtn: { width: 60, height: 60, backgroundColor: COLORS.primary, borderRadius: 30, justifyContent: 'center', alignItems: 'center', ...SHADOWS.premium },
    marker: { padding: 8, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white, ...SHADOWS.medium },
    callout: { backgroundColor: COLORS.white, padding: 12, borderRadius: 12, width: 150, borderTopWidth: 4, borderColor: COLORS.primary },
    calloutTitle: { fontWeight: '800', fontSize: 14, color: COLORS.black },
    calloutType: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
