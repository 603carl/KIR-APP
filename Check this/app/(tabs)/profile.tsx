import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { registerForPushNotificationsAsync, savePushToken, sendTestNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import {
    Award,
    Bell,
    ChevronRight,
    CircleChevronRight,
    FileText,
    HelpCircle,
    LogOut,
    Shield,
    Star,
    TrendingUp,
    User
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({
        reports: 0,
        resolved: 0,
        score: 0,
        verifications: 0,
        velocity: 0,
        isFirstResponder: false,
        isCommunitySentinel: false,
        topInterest: 'General'
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Modal States
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [activeModal, setActiveModal] = useState<'info' | 'notifications' | 'privacy' | null>(null);

    // Form States
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editLocation, setEditLocation] = useState('');

    // Emergency Info States
    const [bloodGroup, setBloodGroup] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [medicalConditions, setMedicalConditions] = useState('');

    // Security States
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);

    useEffect(() => {
        fetchProfile();
        checkBiometrics();
        setupNotifications();
    }, []);

    const checkBiometrics = async () => {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        setIsBiometricSupported(compatible);
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricEnrolled(enrolled);
    };

    const setupNotifications = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                await savePushToken(session.user.id, token);
            }
        }
    };

    const handleAuthenticate = async () => {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to access security settings',
            fallbackLabel: 'Use Passcode',
        });
        return result.success;
    };

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.replace('/auth/login');
                return;
            }

            const userId = session.user.id;

            // Fetch all data in parallel
            const [profileRes, reportsRes, resolvedRes, verifyRes, iqRes] = await Promise.allSettled([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Resolved'),
                supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.rpc('get_user_civic_intelligence', { target_user_id: userId })
            ]);

            // Handle Profile Data
            if (profileRes.status === 'fulfilled' && profileRes.value.data) {
                const profileData = profileRes.value.data;
                setProfile(profileData);
                setEditName(profileData.full_name || '');
                setEditBio(profileData.bio || '');
                setEditLocation(profileData.location_name || 'Nairobi, Kenya');
                setBloodGroup(profileData.blood_group || '');
                setEmergencyName(profileData.emergency_contact_name || '');
                setEmergencyPhone(profileData.emergency_contact_phone || '');
                setMedicalConditions(profileData.medical_conditions || '');
            } else {
                console.log('Profile missing or error in fetch, attempting sync...');
                // Safety: Create missing profile if authenticated
                const fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Citizen';
                const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;

                const { data: newProfile, error: createError } = await supabase.from('profiles').upsert({
                    id: userId,
                    full_name: fullName,
                    email: session.user.email,
                    avatar_url: avatarUrl,
                    role: 'reporter'
                }).select().single();

                if (!createError && newProfile) {
                    setProfile(newProfile);
                    setEditName(newProfile.full_name || '');
                }
            }

            // Handle Stats & Civic IQ
            const iq = (iqRes.status === 'fulfilled' ? iqRes.value.data?.[0] : {}) || {};
            setStats({
                reports: reportsRes.status === 'fulfilled' ? reportsRes.value.count || 0 : 0,
                resolved: resolvedRes.status === 'fulfilled' ? resolvedRes.value.count || 0 : 0,
                verifications: verifyRes.status === 'fulfilled' ? verifyRes.value.count || 0 : 0,
                score: iq.impact_score || 0,
                velocity: iq.velocity || 0,
                isFirstResponder: iq.is_first_responder || false,
                isCommunitySentinel: iq.is_community_sentinel || false,
                topInterest: iq.top_interest || 'General'
            });

        } catch (error: any) {
            console.error('Profile fetch error:', error);
            if (error.message?.includes('JWT')) {
                router.replace('/auth/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const pickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadAvatar(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (uri: string) => {
        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileName = `${user.id}-${Date.now()}.jpg`;
            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName,
                type: 'image/jpeg',
            } as any);

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, formData);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;
            setProfile({ ...profile, avatar_url: publicUrl });
            Alert.alert('Success', 'Profile picture updated!');

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editName,
                    bio: editBio,
                    location_name: editLocation,
                    blood_group: bloodGroup,
                    emergency_contact_name: emergencyName,
                    emergency_contact_phone: emergencyPhone,
                    medical_conditions: medicalConditions,
                })
                .eq('id', user.id);

            if (error) throw error;
            setProfile({
                ...profile,
                full_name: editName,
                bio: editBio,
                location_name: editLocation,
                blood_group: bloodGroup,
                emergency_contact_name: emergencyName,
                emergency_contact_phone: emergencyPhone,
                medical_conditions: medicalConditions
            });
            setEditModalVisible(false);
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePrefs = async (key: string, value: any, section: 'notifications' | 'privacy') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const field = section === 'notifications' ? 'notification_prefs' : 'privacy_settings';
            const currentPrefs = profile?.[field] || {};
            const newPrefs = { ...currentPrefs, [key]: value };

            const { error } = await supabase
                .from('profiles')
                .update({ [field]: newPrefs })
                .eq('id', user.id);

            if (error) throw error;
            if (profile) {
                setProfile({ ...profile, [field]: newPrefs });
            }
        } catch (error: any) {
            console.error('Update preferences error:', error);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace('/auth/login');
    };

    const MenuItem = ({ icon: Icon, title, subtitle, onPress, showSwitch }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIconContainer}>
                <Icon size={22} color={COLORS.primary} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            {showSwitch ? (
                <Switch
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                />
            ) : (
                <ChevronRight size={18} color={COLORS.textMuted} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <LinearGradient
                    colors={[COLORS.primary, '#004D2C']}
                    style={styles.headerGradient}
                >
                    <SafeAreaView edges={['top']} style={styles.headerContent}>
                        <MotiView
                            from={{ opacity: 0, translateY: -20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            style={styles.profileRow}
                        >
                            <TouchableOpacity style={styles.imageContainer} onPress={pickAvatar} disabled={uploading}>
                                {uploading || loading ? (
                                    <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <ActivityIndicator color={COLORS.white} />
                                    </View>
                                ) : (
                                    <Image
                                        source={profile?.avatar_url ? { uri: profile.avatar_url } : require('@/assets/images/icon.png')}
                                        style={styles.profileImage}
                                    />
                                )}
                                <TouchableOpacity style={styles.editBadge} onPress={pickAvatar}>
                                    <Award size={14} color={COLORS.white} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                            <View style={styles.nameContainer}>
                                {loading ? (
                                    <MotiView
                                        from={{ opacity: 0.3 }}
                                        animate={{ opacity: 0.7 }}
                                        transition={{ loop: true, type: 'timing', duration: 1000 }}
                                        style={{ width: 150, height: 28, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8 }}
                                    />
                                ) : (
                                    <>
                                        <Text style={styles.name}>{profile?.full_name || 'Anonymous User'}</Text>
                                        <Text style={styles.rank}>{profile?.role === 'responder' ? 'Official Responder' : 'Verified Citizen'} • {stats.topInterest}</Text>
                                    </>
                                )}
                            </View>
                        </MotiView>

                        <View style={styles.statsOverview}>
                            <View style={styles.statBox}>
                                {loading ? <View style={styles.statSkeleton} /> : <Text style={styles.statNumber}>{stats.reports}</Text>}
                                <Text style={styles.statLabel}>Reports</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                {loading ? <View style={styles.statSkeleton} /> : <Text style={styles.statNumber}>{stats.resolved}</Text>}
                                <Text style={styles.statLabel}>Resolved</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                {loading ? <View style={styles.statSkeleton} /> : (
                                    <View style={styles.scoreRow}>
                                        <Text style={styles.statNumber}>{stats.score}</Text>
                                        {stats.velocity > 0 && <TrendingUp size={10} color={COLORS.success} />}
                                    </View>
                                )}
                                <Text style={styles.statLabel}>Impact Score</Text>
                            </View>
                        </View>
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Civic Achievements</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementScroll}>
                        {[
                            { id: '1', title: 'First Responder', icon: Star, color: COLORS.gold, earned: stats.isFirstResponder },
                            { id: '2', title: 'Action Hero', icon: Award, color: '#10B981', earned: stats.resolved >= 20 },
                            { id: '3', title: 'Verify Pro', icon: Shield, color: COLORS.primary, earned: stats.isCommunitySentinel },
                        ].map(item => (
                            <View key={item.id} style={[styles.achievementCard, !item.earned && { opacity: 0.5 }]}>
                                <View style={[styles.achievementIcon, { backgroundColor: item.color + '20' }]}>
                                    <item.icon size={24} color={item.earned ? item.color : COLORS.textMuted} />
                                </View>
                                <Text style={styles.achievementTitle}>{item.title}</Text>
                                {!item.earned && <Text style={styles.lockedText}>Locked</Text>}
                            </View>
                        ))}
                    </ScrollView>

                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <View style={styles.card}>
                        <MenuItem icon={User} title="Personal & Emergency Info" subtitle="Edit profile and emergency contact" onPress={() => { setActiveModal('info'); setEditModalVisible(true); }} />
                        <View style={styles.divider} />
                        <MenuItem icon={Bell} title="Notifications" subtitle="Push, email, and emergency alerts" onPress={() => { setActiveModal('notifications'); setEditModalVisible(true); }} />
                        <View style={styles.divider} />
                        <MenuItem icon={Shield} title="Privacy & Security" subtitle="Anonymous reporting and app lock" onPress={() => { setActiveModal('privacy'); setEditModalVisible(true); }} />
                    </View>

                    <Text style={styles.sectionTitle}>Support & Community</Text>
                    <View style={styles.card}>
                        <MenuItem icon={HelpCircle} title="Help Center" onPress={() => router.push('/help')} />
                        <View style={styles.divider} />
                        <MenuItem icon={FileText} title="Terms of Service" onPress={() => router.push('/legal/terms')} />
                        <View style={styles.divider} />
                        <MenuItem icon={Shield} title="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
                        <View style={styles.divider} />
                        <MenuItem icon={CircleChevronRight} title="Community Guidelines" onPress={() => router.push('/legal/guidelines')} />
                    </View>


                    <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
                        <LogOut size={20} color={COLORS.error} />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Version 1.0.0 (Premium Build)</Text>
                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* Premium Settings Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.modalCloseOverlay}
                            activeOpacity={1}
                            onPress={() => setEditModalVisible(false)}
                        />
                        <View style={[styles.modalContent, { height: Dimensions.get('window').height * 0.9, paddingBottom: Math.max(20, insets.bottom) }]}>
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHandle} />
                                <Text style={styles.modalTitle}>
                                    {activeModal === 'info' ? 'Edit Profile & Emergency' :
                                        activeModal === 'notifications' ? 'Notification Settings' : 'Privacy & Security'}
                                </Text>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.modalScrollContent}
                                keyboardShouldPersistTaps="handled"
                            >
                                {activeModal === 'info' && (
                                    <View style={styles.modalBody}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Full Name</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                value={editName}
                                                onChangeText={setEditName}
                                                placeholder="Enter your name"
                                            />
                                        </View>

                                        <View style={styles.row}>
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.modalLabel}>Blood Group</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        value={bloodGroup}
                                                        onChangeText={setBloodGroup}
                                                        placeholder="e.g. O+"
                                                    />
                                                </View>
                                            </View>
                                            <View style={{ flex: 2 }}>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.modalLabel}>Primary Location</Text>
                                                    <TextInput
                                                        style={styles.modalInput}
                                                        value={editLocation}
                                                        onChangeText={setEditLocation}
                                                        placeholder="e.g. Nairobi"
                                                    />
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Emergency Contact Name</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                value={emergencyName}
                                                onChangeText={setEmergencyName}
                                                placeholder="Name of contact"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Emergency Contact Phone</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                value={emergencyPhone}
                                                onChangeText={setEmergencyPhone}
                                                placeholder="+254..."
                                                keyboardType="phone-pad"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Medical Conditions / Allergies</Text>
                                            <TextInput
                                                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                                value={medicalConditions}
                                                onChangeText={setMedicalConditions}
                                                multiline
                                                placeholder="Any critical medical info..."
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.modalLabel}>Bio</Text>
                                            <TextInput
                                                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                                value={editBio}
                                                onChangeText={setEditBio}
                                                multiline
                                                placeholder="Tell us about yourself..."
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.saveBtn}
                                            onPress={handleUpdateProfile}
                                            disabled={saving}
                                        >
                                            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeModal === 'notifications' && (
                                    <View style={styles.modalBody}>
                                        {[
                                            { key: 'push', title: 'Push Notifications', sub: 'Instant emergency alerts' },
                                            { key: 'email', title: 'Email Reports', sub: 'Weekly summaries of incidents' },
                                            { key: 'emergency', title: 'Critical Alerts', sub: 'Priority security warnings' },
                                        ].map(item => (
                                            <View key={item.key} style={styles.prefRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.prefTitle}>{item.title}</Text>
                                                    <Text style={styles.prefSub}>{item.sub}</Text>
                                                </View>
                                                <Switch
                                                    value={profile?.notification_prefs?.[item.key] ?? true}
                                                    onValueChange={(val) => handleUpdatePrefs(item.key, val, 'notifications')}
                                                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                                />
                                            </View>
                                        ))}

                                        <TouchableOpacity
                                            style={[styles.prefRow, { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary + '30', borderWidth: 1 }]}
                                            onPress={sendTestNotification}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.prefTitle, { color: COLORS.primary }]}>Test Alert</Text>
                                                <Text style={styles.prefSub}>Send a test emergency notification now</Text>
                                            </View>
                                            <Bell size={20} color={COLORS.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {activeModal === 'privacy' && (
                                    <View style={styles.modalBody}>
                                        {isBiometricSupported && (
                                            <View style={[styles.prefRow, { marginBottom: 12, backgroundColor: COLORS.gold + '10' }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.prefTitle}>Biometric Lock</Text>
                                                    <Text style={styles.prefSub}>Require Fingerprint/FaceID to open app</Text>
                                                </View>
                                                <Switch
                                                    value={profile?.privacy_settings?.biometric_lock ?? false}
                                                    onValueChange={async (val) => {
                                                        if (val) {
                                                            const success = await handleAuthenticate();
                                                            if (!success) return;
                                                        }
                                                        handleUpdatePrefs('biometric_lock', val, 'privacy');
                                                    }}
                                                    trackColor={{ false: COLORS.border, true: COLORS.gold }}
                                                />
                                            </View>
                                        )}
                                        {[
                                            { key: 'anonymous_reporting', title: 'Anonymous by Default', sub: 'Keep your identity hidden' },
                                            { key: 'show_activity', title: 'Show My Activity', sub: 'Allow others to see your verifications' },
                                        ].map(item => (
                                            <View key={item.key} style={styles.prefRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.prefTitle}>{item.title}</Text>
                                                    <Text style={styles.prefSub}>{item.sub}</Text>
                                                </View>
                                                <Switch
                                                    value={profile?.privacy_settings?.[item.key] ?? false}
                                                    onValueChange={(val) => handleUpdatePrefs(item.key, val, 'privacy')}
                                                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                                />
                                            </View>
                                        ))}

                                        <View style={[styles.prefRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
                                            <View>
                                                <Text style={styles.prefTitle}>Auto Sign-Out Timeout</Text>
                                                <Text style={styles.prefSub}>App will sign out after being in background</Text>
                                            </View>
                                            <View style={styles.timeoutSelector}>
                                                {[
                                                    { label: '30s', value: 30 },
                                                    { label: '1m', value: 60 },
                                                    { label: 'Never', value: -1 }
                                                ].map(opt => (
                                                    <TouchableOpacity
                                                        key={opt.value}
                                                        onPress={() => handleUpdatePrefs('auto_sign_out_timeout', opt.value, 'privacy')}
                                                        style={[
                                                            styles.timeoutOption,
                                                            (profile?.privacy_settings?.auto_sign_out_timeout ?? 30) === opt.value && styles.timeoutOptionActive
                                                        ]}
                                                    >
                                                        <Text style={[
                                                            styles.timeoutText,
                                                            (profile?.privacy_settings?.auto_sign_out_timeout ?? 30) === opt.value && styles.timeoutTextActive
                                                        ]}>{opt.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>

                            <TouchableOpacity style={styles.closeBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.closeBtnText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    row: { flexDirection: 'row', alignItems: 'center' },
    headerGradient: { borderBottomLeftRadius: 44, borderBottomRightRadius: 44, paddingBottom: 40, ...SHADOWS.premium },
    headerContent: { paddingHorizontal: SPACING.lg },
    profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
    imageContainer: { width: 80, height: 80, borderRadius: 40, position: 'relative' },
    profileImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: COLORS.white },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.gold, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },
    nameContainer: { marginLeft: 20 },
    name: { fontSize: 24, fontWeight: '900', color: COLORS.white },
    rank: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },
    statsOverview: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 40, borderRadius: 24, padding: 24, justifyContent: 'space-around', alignItems: 'center' },
    statBox: { alignItems: 'center' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.white },
    statSkeleton: { width: 30, height: 24, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: 2 },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    content: { padding: SPACING.lg, paddingBottom: 40 },
    sectionTitle: { fontSize: 22, fontWeight: '900', color: COLORS.black, marginBottom: 20, marginTop: 12 },
    achievementScroll: { gap: 12, paddingBottom: 20 },
    achievementCard: { width: 110, backgroundColor: COLORS.white, padding: 16, borderRadius: 24, alignItems: 'center', ...SHADOWS.soft },
    achievementIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    achievementTitle: { fontSize: 12, fontWeight: '700', color: COLORS.black, textAlign: 'center' },
    lockedText: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontWeight: '700' },
    card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, paddingVertical: 8, ...SHADOWS.premium, marginBottom: 24 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center' },
    menuTextContainer: { flex: 1, marginLeft: 16 },
    menuTitle: { fontSize: 17, fontWeight: '800', color: COLORS.black },
    menuSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
    divider: { height: 1, backgroundColor: COLORS.background, marginLeft: 72 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 60, borderRadius: 20, backgroundColor: COLORS.error + '10', marginTop: 10 },
    logoutText: { fontSize: 16, fontWeight: '800', color: COLORS.error },
    versionText: { textAlign: 'center', marginTop: 32, fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalCloseOverlay: { ...StyleSheet.absoluteFillObject },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        width: '100%',
        ...SHADOWS.premium
    },
    modalHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
    modalHandle: { width: 44, height: 5, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 16 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.black, textAlign: 'center' },
    modalScrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    modalBody: { gap: 24 },
    inputGroup: { gap: 8 },
    modalLabel: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
    modalInput: { backgroundColor: '#F8F9FA', borderRadius: 18, padding: 18, fontSize: 16, color: COLORS.black, borderWidth: 1.5, borderColor: '#E9ECEF' },
    saveBtn: { backgroundColor: COLORS.primary, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 12, ...SHADOWS.premium },
    saveBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
    closeBtn: { paddingVertical: 16, alignItems: 'center' },
    closeBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 16 },
    prefRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 20, borderRadius: 22, marginBottom: 12 },
    prefTitle: { fontSize: 16, fontWeight: '800', color: COLORS.black },
    prefSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },
    timeoutSelector: { flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 12, padding: 4, width: '100%' },
    timeoutOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    timeoutOptionActive: { backgroundColor: COLORS.white, ...SHADOWS.soft },
    timeoutText: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
    timeoutTextActive: { color: COLORS.primary },
});
