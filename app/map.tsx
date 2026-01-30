import { COLORS, SHADOWS } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import * as ExpoLocation from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Filter, Layers, MapPin, Navigation, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Incident {
    id: string;
    lat: number | null;
    lng: number | null;
    title: string;
    category: string;
    severity: string;
    location: string;
}

const NAIROBI_COORDS = {
    latitude: -1.286389,
    longitude: 36.817223,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
};

// OpenStreetMap Tile Servers (FREE - No API Key Required)
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_HUMANITARIAN_URL = 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
const CARTO_LIGHT_URL = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
const CARTO_DARK_URL = 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

const MAP_STYLES = [
    { id: 'standard', name: 'Standard', url: OSM_TILE_URL },
    { id: 'humanitarian', name: 'Humanitarian', url: OSM_HUMANITARIAN_URL },
    { id: 'light', name: 'Light', url: CARTO_LIGHT_URL },
    { id: 'dark', name: 'Dark', url: CARTO_DARK_URL },
];

const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
        case 'critical': return '#EF4444';
        case 'high': return '#F97316';
        case 'medium': return '#EAB308';
        case 'low': return COLORS.primary;
        default: return COLORS.primary;
    }
};

export default function MapScreen() {
    const router = useRouter();
    const mapRef = useRef<MapView>(null);
    const [mapStyleIndex, setMapStyleIndex] = useState(0);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showStylePicker, setShowStylePicker] = useState(false);

    const categories = ['All', 'Crime', 'Accident', 'Infrastructure', 'Health Emergency', 'Water & Sanitation', 'Power Outage'];

    useEffect(() => {
        initializeMap();

        const subscription = supabase
            .channel('map_realtime_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
                console.log('Real-time update:', payload);
                fetchIncidents();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    useEffect(() => {
        filterIncidents();
    }, [searchQuery, incidents, selectedCategory]);

    const initializeMap = async () => {
        try {
            setLoading(true);
            setError(null);

            // Request location permissions
            const { status: currentStatus } = await ExpoLocation.getForegroundPermissionsAsync();
            let finalStatus = currentStatus;

            if (currentStatus !== 'granted') {
                const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus === 'granted') {
                try {
                    const location = await ExpoLocation.getCurrentPositionAsync({
                        accuracy: ExpoLocation.Accuracy.Balanced,
                    });
                    setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });
                } catch (locError) {
                    console.log('Could not get user location, using default');
                }
            }

            await fetchIncidents();
        } catch (err) {
            console.error('Map initialization error:', err);
            setError('Failed to initialize map. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchIncidents = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('incidents')
                .select('id, lat, lng, title, category, severity, location')
                .not('lat', 'is', null)
                .not('lng', 'is', null);

            if (fetchError) throw fetchError;

            // Filter out incidents with invalid coordinates
            const validIncidents = (data || []).filter(
                (incident) =>
                    incident.lat !== null &&
                    incident.lng !== null &&
                    !isNaN(Number(incident.lat)) &&
                    !isNaN(Number(incident.lng)) &&
                    Math.abs(Number(incident.lat)) <= 90 &&
                    Math.abs(Number(incident.lng)) <= 180
            );

            setIncidents(validIncidents);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching incidents:', err);
            setError('Could not load incidents. Pull to refresh.');
        }
    };

    const filterIncidents = () => {
        let filtered = incidents;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (i) =>
                    i.title?.toLowerCase().includes(query) ||
                    i.category?.toLowerCase().includes(query) ||
                    i.location?.toLowerCase().includes(query)
            );
        }

        if (selectedCategory && selectedCategory !== 'All') {
            filtered = filtered.filter((i) => i.category === selectedCategory);
        }

        setFilteredIncidents(filtered);
    };

    const centerOnUserLocation = () => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                ...userLocation,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 500);
        } else {
            Alert.alert('Location Unavailable', 'Could not determine your current location.');
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        await fetchIncidents();
        setLoading(false);
    };

    const cycleMapStyle = () => {
        setMapStyleIndex((prev) => (prev + 1) % MAP_STYLES.length);
    };

    if (error && incidents.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView style={styles.errorContent}>
                    <AlertTriangle size={64} color={COLORS.error} />
                    <Text style={styles.errorTitle}>Map Error</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={initializeMap}>
                        <RefreshCw size={20} color={COLORS.white} />
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                        <Text style={styles.backLinkText}>Go Back</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <MapView
                ref={mapRef}
                style={styles.map}
                mapType="none"
                initialRegion={userLocation ? { ...userLocation, latitudeDelta: 0.1, longitudeDelta: 0.1 } : NAIROBI_COORDS}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={true}
                rotateEnabled={true}
                pitchEnabled={false}
            >
                {/* OpenStreetMap Tiles - FREE, No API Key Required */}
                <UrlTile
                    urlTemplate={MAP_STYLES[mapStyleIndex].url}
                    maximumZ={19}
                    flipY={false}
                    tileSize={256}
                />

                {/* Incident Markers */}
                {filteredIncidents.map((incident) => (
                    <Marker
                        key={incident.id}
                        coordinate={{
                            latitude: Number(incident.lat),
                            longitude: Number(incident.lng),
                        }}
                        tracksViewChanges={false}
                    >
                        <View style={[styles.marker, { backgroundColor: getSeverityColor(incident.severity) }]}>
                            <AlertTriangle size={14} color={COLORS.white} />
                        </View>
                        <Callout tooltip onPress={() => router.push(`/incident/${incident.id}`)}>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle} numberOfLines={2}>{incident.title}</Text>
                                <Text style={styles.calloutType}>{incident.category}</Text>
                                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(incident.severity) + '20' }]}>
                                    <Text style={[styles.severityText, { color: getSeverityColor(incident.severity) }]}>
                                        {incident.severity}
                                    </Text>
                                </View>
                                <Text style={styles.calloutHint}>Tap for details →</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

            {/* Loading Overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading incidents...</Text>
                </View>
            )}

            {/* Floating Controls */}
            <SafeAreaView style={styles.controls} pointerEvents="box-none">
                {/* Top Bar */}
                <View style={styles.topControls}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <ArrowLeft size={24} color={COLORS.black} />
                    </TouchableOpacity>

                    <View style={styles.searchBar}>
                        <MapPin size={18} color={COLORS.primary} />
                        <TextInput
                            placeholder="Search incidents..."
                            style={styles.mapSearchInput}
                            placeholderTextColor={COLORS.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                        <RefreshCw size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Category Filter */}
                <View style={styles.categoryRow}>
                    {categories.slice(0, 4).map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.categoryChip,
                                (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && styles.categoryChipActive,
                            ]}
                            onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
                        >
                            <Text
                                style={[
                                    styles.categoryChipText,
                                    (selectedCategory === cat || (cat === 'All' && !selectedCategory)) && styles.categoryChipTextActive,
                                ]}
                            >
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Side Controls */}
                <View style={styles.sideControls}>
                    <TouchableOpacity style={styles.iconBtn} onPress={cycleMapStyle}>
                        <Layers size={22} color={COLORS.black} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Filter size={22} color={COLORS.black} />
                    </TouchableOpacity>
                </View>

                {/* Map Style Indicator */}
                <View style={styles.styleIndicator}>
                    <Text style={styles.styleText}>{MAP_STYLES[mapStyleIndex].name}</Text>
                </View>

                {/* Bottom Stats & Location */}
                <View style={styles.bottomControls}>
                    <View style={styles.statsCard}>
                        <Text style={styles.statsNumber}>{filteredIncidents.length}</Text>
                        <Text style={styles.statsLabel}>Active Incidents</Text>
                    </View>

                    <TouchableOpacity style={styles.locationBtn} onPress={centerOnUserLocation}>
                        <Navigation size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                {/* Attribution */}
                <View style={styles.attribution}>
                    <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    map: { width: '100%', height: '100%' },
    controls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },

    // Top Controls
    topControls: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
    backBtn: { width: 44, height: 44, backgroundColor: COLORS.white, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    searchBar: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: COLORS.white, ...SHADOWS.medium },
    mapSearchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: COLORS.black, fontWeight: '500' },
    refreshBtn: { width: 44, height: 44, backgroundColor: COLORS.white, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },

    // Category Row
    categoryRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
    categoryChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.white, borderRadius: 20, ...SHADOWS.soft },
    categoryChipActive: { backgroundColor: COLORS.primary },
    categoryChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
    categoryChipTextActive: { color: COLORS.white },

    // Side Controls
    sideControls: { position: 'absolute', right: 16, top: 180, gap: 10 },
    iconBtn: { width: 44, height: 44, backgroundColor: COLORS.white, borderRadius: 12, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },

    // Style Indicator
    styleIndicator: { position: 'absolute', right: 16, top: 290, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, ...SHADOWS.soft },
    styleText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },

    // Bottom Controls
    bottomControls: { position: 'absolute', bottom: 120, left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    statsCard: { backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, ...SHADOWS.premium },
    statsNumber: { fontSize: 28, fontWeight: '900', color: COLORS.primary },
    statsLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
    locationBtn: { width: 56, height: 56, backgroundColor: COLORS.primary, borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...SHADOWS.premium },

    // Attribution (Required by OSM License)
    attribution: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    attributionText: { fontSize: 10, color: COLORS.textMuted },

    // Markers & Callouts
    marker: { padding: 8, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white, ...SHADOWS.medium },
    callout: { backgroundColor: COLORS.white, padding: 14, borderRadius: 16, width: 180, ...SHADOWS.premium },
    calloutTitle: { fontWeight: '800', fontSize: 14, color: COLORS.black, marginBottom: 4 },
    calloutType: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
    severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8 },
    severityText: { fontSize: 11, fontWeight: '800' },
    calloutHint: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

    // Loading
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },

    // Error State
    errorContainer: { flex: 1, backgroundColor: COLORS.background },
    errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    errorTitle: { fontSize: 24, fontWeight: '800', color: COLORS.black, marginTop: 20 },
    errorText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 22 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 24 },
    retryText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    backLink: { marginTop: 16 },
    backLinkText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
});
