import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { normalizeCounty } from '@/lib/utils';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    ArrowLeft,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    Droplets,
    HeartPulse,
    LocateFixed,
    MapPin,
    MoreHorizontal,
    Shield,
    Truck,
    Zap
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: '1', title: 'Water & Sanitation', icon: Droplets, color: '#3B82F6', desc: 'Pipe leaks, drainage, water shortage' },
    { id: '2', title: 'Roads & Transport', icon: Truck, color: '#10B981', desc: 'Potholes, street lights, accidents' },
    { id: '3', title: 'Power & Utility', icon: Zap, color: '#F59E0B', desc: 'Power outage, fallen cables, gas' },
    { id: '4', title: 'Security & Safety', icon: Shield, color: '#EF4444', desc: 'Crime reports, suspicious activity' },
    { id: '5', title: 'Fire & Rescue', icon: AlertCircle, color: '#F97316', desc: 'House fires, wildfires, rescue' },
    { id: '6', title: 'Health Emergency', icon: HeartPulse, color: '#EC4899', desc: 'Medical emergencies, outbreaks' },
    { id: '7', title: 'Other / Custom Incident', icon: MoreHorizontal, color: '#6B7280', desc: 'Something else not listed here' },
];

const STAGES = ['Category', 'Details', 'Location', 'Submit'];

export default function ReportScreen() {
    const [step, setStep] = useState(0);
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [customCategoryTitle, setCustomCategoryTitle] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
    const [mediaItems, setMediaItems] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [locationMethod, setLocationMethod] = useState<'gps' | 'landmark' | null>(null);
    const [locationName, setLocationName] = useState('');
    const [landmarkName, setLandmarkName] = useState('');
    const [coords, setCoords] = useState({ lat: -1.2921, lng: 36.8219 });
    const [county, setCounty] = useState('');
    const [subCounty, setSubCounty] = useState('');
    const [locationConfirmed, setLocationConfirmed] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Safety: Log mount and ensure insets are valid
    React.useEffect(() => {
        console.log('[ReportScreen] Mounted');
    }, []);

    const safeInsets = {
        top: insets?.top || 0,
        bottom: insets?.bottom || 0,
        left: insets?.left || 0,
        right: insets?.right || 0,
    };

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const items = result.assets.map((asset: any) => ({
                uri: asset.uri,
                type: asset.type as 'image' | 'video'
            }));
            setMediaItems(items);
        }
    };

    const uploadMedia = async (uri: string): Promise<string | null> => {
        try {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const extension = uri.split('.').pop();
            const path = `${fileName}.${extension}`;

            const formData = new FormData();
            formData.append('file', {
                uri,
                name: path,
                type: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
            } as any);

            const { data, error } = await supabase.storage
                .from('incident-media')
                .upload(path, formData);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('incident-media')
                .getPublicUrl(path);

            return publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            return null;
        }
    };

    const handleNext = () => {
        if (step === 0 && !selectedCat) return; // Must select category
        if (step === 1 && (!title || !description)) return; // Must provide details

        if (step < STAGES.length - 1) setStep(step + 1);
        else {
            handleFinalSubmit();
        }
    };

    const handleFinalSubmit = async () => {
        const cleanTitle = title.trim();
        const cleanDescription = description.trim();

        if (cleanTitle.length < 5) {
            Alert.alert('Title Too Short', 'Please provide a more descriptive title (at least 5 characters).');
            return;
        }
        if (cleanDescription.length < 10) {
            Alert.alert('Description Too Short', 'Please provide more details about the incident (at least 10 characters).');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Auth session expired. Please login again.");

            // 1. FAST PATH: Insert Incident metadata immediately
            let finalCounty = county;
            let finalSubCounty = subCounty;

            if (!finalCounty) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('county')
                    .eq('id', user.id)
                    .single();
                if (profile?.county) finalCounty = profile.county;
            }

            // 1. DATABASE INSERT: Metadata first (Async)
            // CRITICAL: Explicit 15s Timeout to prevent UI hang in production
            const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
            
            const insertPromise = supabase
                .from('incidents')
                .insert([
                    {
                        user_id: user.id,
                        title: getCategoryTitle(),
                        category: getCategoryTitle().toLowerCase(), // Match Watch Command enum (water, roads, etc.)
                        description: description.trim(),
                        severity: severity,
                        location: locationMethod === 'gps' ? locationName : landmarkName,
                        location_name: locationMethod === 'gps' ? locationName : landmarkName,
                        lat: coords.lat || -1.2921,
                        lng: coords.lng || 36.8219,
                        county: finalCounty || 'Nairobi City',
                        sub_county: finalSubCounty || null,
                        anonymity: isAnonymous,
                        media_urls: [], // Start empty, fill in background
                        status: 'Pending'
                    }
                ])
                .select()
                .single();

            const { data: incidentData, error: insertError } = await Promise.race([
                insertPromise,
                timeout(15000)
            ]) as any;

            if (insertError) throw insertError;

            // 2. IMMEDIATE FEEDBACK: Success and Navigate
            Alert.alert(
              'Report Received', 
              mediaItems.length > 0 
                ? 'Your report is saved. Photos will upload in the background.' 
                : 'Your incident has been reported successfully.'
            );
            router.replace('/(tabs)/my-reports');

            // 3. BACKGROUND TASK: Media Upload
            if (mediaItems.length > 0) {
                (async () => {
                    try {
                        const uploadedUrls: string[] = [];
                        for (let i = 0; i < mediaItems.length; i++) {
                            const url = await uploadMedia(mediaItems[i].uri);
                            if (url) uploadedUrls.push(url);
                        }
                        
                        if (uploadedUrls.length > 0) {
                            await supabase
                                .from('incidents')
                                .update({ media_urls: uploadedUrls })
                                .eq('id', incidentData.id);
                        }
                    } catch (bgError) {
                        console.error('[Background Upload Error]:', bgError);
                    }
                })();
            }

        } catch (error: any) {
            console.error('Submission Error:', error);
            if (error.message === 'timeout') {
                Alert.alert('Network Timeout', 'The server is taking too long to respond. Please check your internet connection and try again.');
            } else {
                Alert.alert('Submission Error', error.message || 'Failed to submit report. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCategoryTitle = () => {
        const cat = CATEGORIES.find(c => c.id === selectedCat);
        if (cat?.id === '7' && customCategoryTitle.trim()) {
            return customCategoryTitle.trim();
        }
        return cat ? cat.title : 'Not Selected';
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <MotiView from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>What's the issue?</Text>
                        <Text style={styles.stepSub}>Select the category that best describes the incident.</Text>

                        <View style={styles.catGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.catCard, selectedCat === cat.id && styles.catCardActive]}
                                    onPress={() => {
                                        setSelectedCat(cat.id);
                                        setTimeout(handleNext, 50);
                                    }}
                                >
                                    <View style={[styles.catIconIcon, { backgroundColor: cat.color + '15' }]}>
                                        <cat.icon color={cat.color} size={28} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.catCardTitle}>{cat.title}</Text>
                                        <Text style={styles.catCardDesc}>{cat.desc}</Text>
                                    </View>
                                    {selectedCat === cat.id && (
                                        <CheckCircle2 color={COLORS.primary} size={20} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </MotiView>
                );
            case 1:
                return (
                    <MotiView from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Share the details</Text>
                        <Text style={styles.stepSub}>Provide a concise description of what happened.</Text>

                        <View style={styles.inputStack}>
                            <View style={styles.inputBox}>
                                <TextInput
                                    placeholder="Incident Title"
                                    style={styles.textInput}
                                    placeholderTextColor={COLORS.textMuted}
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            {selectedCat === '7' && (
                                <>
                                    <Text style={styles.inputLabel}>Custom Category Name</Text>
                                    <View style={styles.inputBox}>
                                        <TextInput
                                            placeholder="e.g. Alien Invasion"
                                            style={styles.textInput}
                                            placeholderTextColor={COLORS.textMuted}
                                            value={customCategoryTitle}
                                            onChangeText={setCustomCategoryTitle}
                                        />
                                    </View>
                                </>
                            )}

                            <Text style={styles.inputLabel}>Severity Level</Text>
                            <View style={styles.severityRow}>
                                {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.severityBtn, severity === s && styles.severityBtnActive]}
                                        onPress={() => setSeverity(s as any)}
                                    >
                                        <Text style={[styles.severityBtnText, severity === s && styles.severityBtnTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={[styles.inputBox, { height: 160, alignItems: 'flex-start' }]}>
                                <TextInput
                                    placeholder="Describe the situation in detail..."
                                    multiline
                                    style={[styles.textInput, { paddingTop: 12, width: '100%', height: '100%' }]}
                                    placeholderTextColor={COLORS.textMuted}
                                    value={description}
                                    onChangeText={setDescription}
                                    textAlignVertical="top"
                                    scrollEnabled={false} // Prevents conflict with parent ScrollView
                                    blurOnSubmit={false}
                                />
                            </View>

                            {uploading ? (
                                <View style={styles.uploadProgressContainer}>
                                    <View style={styles.uploadHeader}>
                                        <Text style={styles.uploadStatus}>Processing Media...</Text>
                                        <Text style={styles.uploadPercent}>{uploadProgress}%</Text>
                                    </View>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.mediaBtn, mediaItems.length > 0 && styles.mediaBtnActive]}
                                    onPress={pickMedia}
                                >
                                    {mediaItems.length > 0 ? (
                                        <CheckCircle2 size={24} color={COLORS.white} />
                                    ) : (
                                        <Camera size={24} color={COLORS.primary} />
                                    )}
                                    <Text style={[styles.mediaBtnText, mediaItems.length > 0 && styles.mediaBtnTextActive]}>
                                        {mediaItems.length > 0 ? `${mediaItems.length} Files Selected` : 'Add Photos or Videos'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {mediaItems.length > 0 && !uploading && (
                                <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={styles.readyPrompt}>
                                    <Check size={16} color={COLORS.success} />
                                    <Text style={styles.readyText}>Media attached! Continue with your report.</Text>
                                </MotiView>
                            )}
                        </View>
                    </MotiView>
                );
            case 2:
                return (
                    <MotiView from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Incident Location</Text>
                        <Text style={styles.stepSub}>How should we mark the location of this incident?</Text>

                        {!locationMethod ? (
                            <View style={styles.methodGrid}>
                                <TouchableOpacity
                                    style={styles.methodCard}
                                    onPress={async () => {
                                        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
                                        if (status === 'granted') {
                                            setLocationMethod('gps');
                                            setLocationName('Acquiring precise location...');
                                            const currentLoc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
                                            setCoords({ lat: currentLoc.coords.latitude, lng: currentLoc.coords.longitude });
                                            // Reverse geocode to get location name, county, and sub-county
                                            const rev = await ExpoLocation.reverseGeocodeAsync(currentLoc.coords);
                                            if (rev?.[0]) {
                                                const loc = rev[0];
                                                // Build location name
                                                setLocationName(`${loc.name || ''} ${loc.street || ''}, ${loc.city || ''}`.trim());

                                                // Extract county (region in Kenya geocoding)
                                                // In Kenya: region = County, subregion = Sub-county/Constituency
                                                const rawCounty = loc.region || loc.city || '';
                                                const countyName = normalizeCounty(rawCounty);
                                                const subCountyName = loc.subregion || loc.district || '';

                                                setCounty(countyName);
                                                setSubCounty(subCountyName);

                                                console.log('Location extracted:', {
                                                    locationName: `${loc.name} ${loc.street}, ${loc.city}`,
                                                    county: countyName,
                                                    subCounty: subCountyName
                                                });
                                            }
                                        } else {
                                            Alert.alert('Permission Required', 'GPS requires location access. Please use the Landmark option instead.');
                                        }
                                    }}
                                >
                                    <View style={[styles.methodIcon, { backgroundColor: COLORS.primary + '15' }]}>
                                        <LocateFixed size={28} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.methodTitle}>GPS Auto-Pin</Text>
                                    <Text style={styles.methodDesc}>Pin the exact coordinates of where you are now.</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.methodCard}
                                    onPress={() => setLocationMethod('landmark')}
                                >
                                    <View style={[styles.methodIcon, { backgroundColor: COLORS.gold + '15' }]}>
                                        <MapPin size={28} color={COLORS.gold} />
                                    </View>
                                    <Text style={styles.methodTitle}>Nearest Landmark</Text>
                                    <Text style={styles.methodDesc}>Specify a building, street, or common area nearby.</Text>
                                </TouchableOpacity>
                            </View>
                        ) : locationMethod === 'gps' ? (
                            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <View style={styles.mapPlaceholder}>
                                    <LinearGradient colors={['#E1E4E8', '#F0F2F5']} style={styles.placeholderGradient}>
                                        <View style={styles.mapPinShadow} />
                                        <MotiView
                                            from={{ translateY: -20 }}
                                            animate={{ translateY: 0 }}
                                            transition={{ type: 'spring', loop: true }}
                                            style={styles.floatingPin}
                                        >
                                            <MapPin size={48} color={COLORS.primary} fill={COLORS.white} />
                                        </MotiView>
                                        <Text style={styles.placeholderText}>GPS coordinates captured</Text>
                                    </LinearGradient>
                                </View>
                                <View style={styles.locationInfo}>
                                    <LocateFixed size={20} color={COLORS.primary} />
                                    <Text style={styles.locationText}>{locationName || 'Getting address...'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setLocationMethod(null)} style={styles.changeMethodBtn}>
                                    <Text style={styles.changeMethodText}>Change method</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmLocationBtn, styles.confirmLocationBtnActive]}
                                    onPress={() => {
                                        setLocationConfirmed(true);
                                        handleNext();
                                    }}
                                >
                                    <Text style={styles.confirmLocationText}>Confirm Location</Text>
                                </TouchableOpacity>
                            </MotiView>
                        ) : (
                            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <View style={styles.inputBox}>
                                    <TextInput
                                        placeholder="e.g. Near Westlands Stage, KICC, Uhuru Park"
                                        style={styles.textInput}
                                        placeholderTextColor={COLORS.textMuted}
                                        value={landmarkName}
                                        onChangeText={setLandmarkName}
                                        autoFocus
                                    />
                                </View>
                                <Text style={styles.helperText}>Provide as much detail as possible to help responders find the location.</Text>
                                <TouchableOpacity onPress={() => setLocationMethod(null)} style={styles.changeMethodBtn}>
                                    <Text style={styles.changeMethodText}>Change to GPS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmLocationBtn, landmarkName.length > 3 && styles.confirmLocationBtnActive]}
                                    onPress={() => {
                                        if (landmarkName.length > 3) {
                                            setLocationConfirmed(true);
                                            handleNext();
                                        }
                                    }}
                                    disabled={landmarkName.length <= 3}
                                >
                                    <Text style={styles.confirmLocationText}>Use This Landmark</Text>
                                </TouchableOpacity>
                            </MotiView>
                        )}
                    </MotiView>
                );
            case 3:
                return (
                    <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.stepContainer}>
                        <View style={styles.summaryTop}>
                            <View style={styles.successIconBox}>
                                <Check color={COLORS.white} size={40} strokeWidth={3} />
                            </View>
                            <Text style={styles.stepTitle}>Ready to Submit</Text>
                            <Text style={styles.stepSub}>Your report will be sent to the National Response Team.</Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Category</Text>
                                <Text style={styles.summaryValue}>{getCategoryTitle()}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Title</Text>
                                <Text style={styles.summaryValue} numberOfLines={1}>{title || 'N/A'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Priority</Text>
                                <Text style={[styles.summaryValue, { color: (severity === 'High' || severity === 'Critical') ? COLORS.error : COLORS.warning }]}>{severity}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Location</Text>
                                <Text style={styles.summaryValue} numberOfLines={1}>{locationMethod === 'gps' ? locationName : landmarkName}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Anonymity</Text>
                                <Text style={styles.summaryValue}>{isAnonymous ? 'On' : 'Off'}</Text>
                            </View>
                        </View>

                        <View style={styles.anonymityBox}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.anonymityTitle}>Report Anonymously</Text>
                                <Text style={styles.anonymitySub}>Your identity will be hidden from the public and authorities.</Text>
                            </View>
                            <Switch
                                value={isAnonymous}
                                onValueChange={setIsAnonymous}
                                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                thumbColor={COLORS.white}
                            />
                        </View>
                    </MotiView>
                );
            default:
                return null;
        }
    };

    const isNextDisabled = () => {
        if (step === 0) return !selectedCat;
        if (step === 1) return !title || !description || uploading || (selectedCat === '7' && !customCategoryTitle.trim());
        if (step === 2) return !locationConfirmed;
        return false;
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safe} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.back()}>
                        <ArrowLeft size={24} color={COLORS.black} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Report</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    {STAGES.map((_, i) => (
                        <View key={i} style={[styles.progressDot, { backgroundColor: i <= step ? COLORS.primary : COLORS.border, width: i === step ? 32 : 10 }]} />
                    ))}
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
                        {renderStep()}
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 20 }]}>
                        <TouchableOpacity
                            style={[styles.nextBtn, (isNextDisabled() || isSubmitting) && { opacity: 0.5 }]}
                            onPress={handleNext}
                            disabled={isNextDisabled() || isSubmitting}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, '#004D2C']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.nextGradient}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <>
                                        <Text style={styles.nextBtnText}>{step === STAGES.length - 1 ? 'Publish Report' : 'Continue'}</Text>
                                        <ChevronRight size={20} color={COLORS.white} />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    safe: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
    headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black },
    progressContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: SPACING.md },
    progressDot: { height: 10, borderRadius: 5 },
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
    stepContainer: { paddingTop: SPACING.lg },
    stepTitle: { fontSize: 28, fontWeight: '900', color: COLORS.black },
    stepSub: { fontSize: 16, color: COLORS.textSecondary, marginTop: 8, marginBottom: 32, lineHeight: 24 },
    catGrid: { gap: 16 },
    catCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: BORDER_RADIUS.xl, backgroundColor: COLORS.surfaceVariant, borderWidth: 2, borderColor: 'transparent' },
    catCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.white, ...SHADOWS.medium },
    catIconIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    catCardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.black, marginLeft: 16 },
    catCardDesc: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 16, marginTop: 4 },
    methodGrid: { gap: 16 },
    methodCard: { backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    methodIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    methodTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black, marginBottom: 4 },
    methodDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
    changeMethodBtn: { alignSelf: 'center', marginBottom: 20 },
    changeMethodText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },
    helperText: { fontSize: 12, color: COLORS.textMuted, marginTop: 12, marginBottom: 20, textAlign: 'center' },
    inputStack: { gap: 16 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginTop: 8 },
    severityRow: { flexDirection: 'row', gap: 8 },
    severityBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: COLORS.surfaceVariant, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    severityBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    severityBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
    severityBtnTextActive: { color: COLORS.white },
    inputBox: { backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
    textInput: { fontSize: 16, color: COLORS.black },
    mediaBtn: { height: 100, borderRadius: BORDER_RADIUS.xl, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', gap: 12 },
    mediaBtnActive: { backgroundColor: COLORS.primary, borderStyle: 'solid', borderColor: COLORS.primary },
    mediaBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
    mediaBtnTextActive: { color: COLORS.white },
    uploadProgressContainer: { marginTop: 10 },
    uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    uploadStatus: { fontSize: 14, fontWeight: '700', color: COLORS.black },
    uploadPercent: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
    progressBar: { height: 8, backgroundColor: COLORS.surfaceVariant, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: COLORS.primary },
    readyPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: COLORS.success + '10', padding: 12, borderRadius: 12 },
    readyText: { fontSize: 13, fontWeight: '700', color: COLORS.success },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 16, height: 50, marginBottom: 20, gap: 12 },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.black },
    mapPlaceholder: { height: 280, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', marginBottom: 20, position: 'relative' },
    floatingPin: { position: 'absolute', zIndex: 2 },
    mapPinShadow: { width: 40, height: 10, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.1)', position: 'absolute', bottom: '45%' },
    locateBtn: { position: 'absolute', bottom: 16, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    confirmLocationBtn: { height: 56, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    confirmLocationBtnActive: { backgroundColor: COLORS.success },
    confirmLocationText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
    placeholderGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    placeholderText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginTop: 40 },
    locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surfaceVariant, padding: 16, borderRadius: BORDER_RADIUS.lg, marginBottom: 20 },
    locationText: { fontSize: 14, fontWeight: '700', color: COLORS.black },
    summaryTop: { alignItems: 'center', paddingTop: 20, marginBottom: 40 },
    successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center', marginBottom: 24, ...SHADOWS.premium },
    summaryCard: { backgroundColor: COLORS.surfaceVariant, borderRadius: BORDER_RADIUS.xl, padding: 24, gap: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    summaryValue: { fontSize: 15, fontWeight: '800', color: COLORS.black, flex: 1, textAlign: 'right', marginLeft: 10 },
    anonymityBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceVariant, padding: 20, borderRadius: BORDER_RADIUS.xl, marginTop: 24, gap: 16 },
    anonymityTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
    anonymitySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    footer: { padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 20 : 20 },
    nextBtn: { height: 56, borderRadius: 28, overflow: 'hidden', ...SHADOWS.premium },
    nextGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    nextBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
});
