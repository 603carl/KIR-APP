import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/auth/login');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            setProfile(data);
            setEditName(data.full_name || '');
            setEditBio(data.bio || '');
            setEditLocation(data.location_name || 'Nairobi, Kenya');

            // Fetch basic counts
            const { count: reportCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
            const { count: resolvedCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Resolved');
            const { count: verifyCount } = await supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

            // Fetch Advanced Intelligence
            const { data: iqData, error: iqError } = await supabase.rpc('get_user_civic_intelligence', { target_user_id: user.id });

            if (iqError) throw iqError;
            const iq = iqData?.[0] || {};

            setStats({
                reports: reportCount || 0,
                resolved: resolvedCount || 0,
                verifications: verifyCount || 0,
                score: iq.impact_score || 0,
                velocity: iq.velocity || 0,
                isFirstResponder: iq.is_first_responder || false,
                isCommunitySentinel: iq.is_community_sentinel || false,
                topInterest: iq.top_interest || 'General'
            });

        } catch (error: any) {
            console.error('Profile fetch error:', error);
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
                })
                .eq('id', user.id);

            if (error) throw error;
            setProfile({ ...profile, full_name: editName, bio: editBio, location_name: editLocation });
            setEditModalVisible(false);
            Alert.alert('Success', 'Profile updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePrefs = async (key: string, value: boolean, section: 'notifications' | 'privacy') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const field = section === 'notifications' ? 'notification_prefs' : 'privacy_settings';
            const currentPrefs = profile[field] || {};
            const newPrefs = { ...currentPrefs, [key]: value };

            const { error } = await supabase
                .from('profiles')
                .update({ [field]: newPrefs })
                .eq('id', user.id);

            if (error) throw error;
            setProfile({ ...profile, [field]: newPrefs });
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
                        <View style={styles.profileRow}>
                            <TouchableOpacity style={styles.imageContainer} onPress={pickAvatar} disabled={uploading}>
                                {uploading ? (
                                    <View style={[styles.profileImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <ActivityIndicator color={COLORS.white} />
                                    </View>
                                ) : (
                                    <Image
                                        source={{ uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }}
                                        style={styles.profileImage}
                                    />
                                )}
                                <TouchableOpacity style={styles.editBadge} onPress={pickAvatar}>
                                    <Award size={14} color={COLORS.white} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                            <View style={styles.nameContainer}>
                                <Text style={styles.name}>{profile?.full_name || 'Kenyan Citizen'}</Text>
                                <Text style={styles.rank}>{profile?.role === 'responder' ? 'Official Responder' : 'Verified Citizen'} • {stats.topInterest}</Text>
                            </View>
                        </View>

                        <View style={styles.statsOverview}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{stats.reports}</Text>
                                <Text style={styles.statLabel}>Reports</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{stats.resolved}</Text>
                                <Text style={styles.statLabel}>Resolved</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <View style={styles.scoreRow}>
                                    <Text style={styles.statNumber}>{stats.score}</Text>
                                    {stats.velocity > 0 && <TrendingUp size={10} color={COLORS.success} />}
                                </View>
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
                        <MenuItem icon={User} title="Personal Information" subtitle="Edit your profile and contact info" onPress={() => { setActiveModal('info'); setEditModalVisible(true); }} />
                        <View style={styles.divider} />
                        <MenuItem icon={Bell} title="Notifications" subtitle="Push, email, and emergency alerts" onPress={() => { setActiveModal('notifications'); setEditModalVisible(true); }} />
                        <View style={styles.divider} />
                        <MenuItem icon={Shield} title="Privacy & Security" subtitle="Anonymous reporting and data settings" onPress={() => { setActiveModal('privacy'); setEditModalVisible(true); }} />
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

                    <Text style={styles.versionText}>Version 1.0.0 (Executive Build)</Text>
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
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditModalVisible(false)} />
                    <View style={[styles.modalContent, { paddingBottom: Math.max(20, insets.bottom) }]}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>
                                {activeModal === 'info' ? 'Edit Profile' :
                                    activeModal === 'notifications' ? 'Notification Settings' : 'Privacy Settings'}
                            </Text>
                        </View>

                        {activeModal === 'info' && (
                            <View style={styles.modalBody}>
                                <Text style={styles.modalLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Enter your name"
                                />
                                <Text style={styles.modalLabel}>Location</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={editLocation}
                                    onChangeText={setEditLocation}
                                    placeholder="Your primary location"
                                />
                                <Text style={styles.modalLabel}>Bio</Text>
                                <TextInput
                                    style={[styles.modalInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                                    value={editBio}
                                    onChangeText={setEditBio}
                                    multiline
                                    placeholder="Tell us about yourself..."
                                />
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
                            </View>
                        )}

                        {activeModal === 'privacy' && (
                            <View style={styles.modalBody}>
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
                            </View>
                        )}

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setEditModalVisible(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerGradient: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 30, ...SHADOWS.premium },
    headerContent: { paddingHorizontal: SPACING.lg },
    profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
    imageContainer: { width: 80, height: 80, borderRadius: 40, position: 'relative' },
    profileImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: COLORS.white },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.gold, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },
    nameContainer: { marginLeft: 20 },
    name: { fontSize: 24, fontWeight: '900', color: COLORS.white },
    rank: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },
    statsOverview: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 30, borderRadius: 20, padding: 20, justifyContent: 'space-around', alignItems: 'center' },
    statBox: { alignItems: 'center' },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.white },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    content: { padding: SPACING.lg },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black, marginBottom: 16, marginTop: 10 },
    achievementScroll: { gap: 12, paddingBottom: 20 },
    achievementCard: { width: 110, backgroundColor: COLORS.white, padding: 16, borderRadius: 24, alignItems: 'center', ...SHADOWS.soft },
    achievementIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    achievementTitle: { fontSize: 12, fontWeight: '700', color: COLORS.black, textAlign: 'center' },
    lockedText: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontWeight: '700' },
    card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, paddingVertical: 8, ...SHADOWS.premium, marginBottom: 24 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center' },
    menuTextContainer: { flex: 1, marginLeft: 16 },
    menuTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
    menuSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.background, marginLeft: 72 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 60, borderRadius: 20, backgroundColor: COLORS.error + '10', marginTop: 10 },
    logoutText: { fontSize: 16, fontWeight: '800', color: COLORS.error },
    versionText: { textAlign: 'center', marginTop: 32, fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
    modalHeader: { alignItems: 'center', marginBottom: 24 },
    modalHandle: { width: 40, height: 5, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 12 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black },
    modalBody: { gap: 16 },
    modalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: -8 },
    modalInput: { backgroundColor: COLORS.background, borderRadius: 16, padding: 16, fontSize: 16, color: COLORS.black, borderWidth: 1, borderColor: COLORS.border },
    saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
    closeBtn: { marginTop: 16, alignItems: 'center' },
    closeBtnText: { color: COLORS.textMuted, fontWeight: '700' },
    prefRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 16, borderRadius: 16 },
    prefTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
    prefSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
