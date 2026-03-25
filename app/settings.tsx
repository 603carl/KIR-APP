import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { Stack, useRouter } from 'expo-router';
import { 
    Bell, 
    ChevronRight, 
    Eye, 
    Shield, 
    Smartphone, 
    Trash2, 
    User as UserIcon, 
    ShieldCheck, 
    LogOut, 
    Mail, 
    MapPin,
    Phone
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { 
    ScrollView, 
    StyleSheet, 
    Switch, 
    Text, 
    TouchableOpacity, 
    View, 
    Image, 
    Alert,
    ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

interface Profile {
    full_name: string;
    email?: string;
    phone?: string;
    county?: string;
    role?: string;
    avatar_url?: string;
}

export default function SettingsScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [biometrics, setBiometrics] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            setProfile({
                ...data,
                email: user.email
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        router.replace('/auth/login');
                    }
                }
            ]
        );
    };

    const SettingRow = ({ icon: Icon, title, value, onValueChange, type = 'switch', onPress, subValue }: any) => (
        <TouchableOpacity 
            style={styles.settingRow} 
            onPress={onPress} 
            disabled={type === 'switch'}
            activeOpacity={0.7}
        >
            <View style={styles.iconBox}>
                <Icon size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subValue && <Text style={styles.settingSubValue}>{subValue}</Text>}
            </View>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                />
            ) : (
                <ChevronRight size={18} color={COLORS.textMuted} />
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ 
                headerShown: true,
                title: 'Account Settings',
                headerTitleStyle: { fontWeight: '900' },
                headerShadowVisible: false,
                headerStyle: { backgroundColor: COLORS.background }
            }} />
            
            <SafeAreaView style={styles.safe} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                    
                    {/* Profile Aero Header */}
                    <MotiView 
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={styles.profileHeader}
                    >
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <UserIcon size={40} color={COLORS.primary} />
                            </View>
                            <View style={styles.verifyBadge}>
                                <ShieldCheck size={14} color={COLORS.white} />
                            </View>
                        </View>
                        
                        <Text style={styles.userName}>{profile?.full_name || 'Kenya Citizen'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{profile?.role?.toUpperCase() || 'CITIZEN'}</Text>
                        </View>

                        <View style={styles.profileStats}>
                            <View style={styles.statItem}>
                                <Mail size={14} color={COLORS.textMuted} />
                                <Text style={styles.statText} numberOfLines={1}>{profile?.email || 'No email'}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <MapPin size={14} color={COLORS.textMuted} />
                                <Text style={styles.statText}>{profile?.county || 'Kenya'}</Text>
                            </View>
                        </View>
                    </MotiView>

                    <Text style={styles.sectionHeader}>Contact Information</Text>
                    <View style={styles.card}>
                         <SettingRow 
                            icon={Phone} 
                            title="Phone Number" 
                            type="link" 
                            subValue={profile?.phone || 'Not linked'}
                        />
                         <View style={styles.divider} />
                         <SettingRow 
                            icon={MapPin} 
                            title="Residential County" 
                            type="link" 
                            subValue={profile?.county || 'Set your location'}
                        />
                    </View>

                    <Text style={styles.sectionHeader}>Preferences</Text>
                    <View style={styles.card}>
                        <SettingRow icon={Bell} title="Push Notifications" value={notifications} onValueChange={setNotifications} />
                        <View style={styles.divider} />
                        <SettingRow icon={Smartphone} title="Aero Dark Mode" value={darkMode} onValueChange={setDarkMode} />
                        <View style={styles.divider} />
                        <SettingRow icon={Eye} title="Low Data Usage" value={false} />
                    </View>

                    <Text style={styles.sectionHeader}>Security</Text>
                    <View style={styles.card}>
                        <SettingRow icon={Shield} title="Biometric Access" value={biometrics} onValueChange={setBiometrics} />
                        <View style={styles.divider} />
                        <SettingRow icon={Shield} title="Update Password" type="link" />
                    </View>

                    <Text style={styles.sectionHeader}>System</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.error + '10' }]}>
                                <LogOut size={20} color={COLORS.error} />
                            </View>
                            <Text style={styles.logoutText}>Sign Out</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.dangerRow}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.error + '10' }]}>
                                <Trash2 size={20} color={COLORS.error} />
                            </View>
                            <Text style={styles.dangerText}>Delete Account Data</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.versionText}>KIR App Production v2.4.0</Text>
                        <Text style={styles.infoText}>In partnership with Kenya Public Safety Authorities</Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    safe: { flex: 1 },
    scroll: { padding: SPACING.lg },
    
    // Profile Header Aero
    profileHeader: {
        backgroundColor: COLORS.white,
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        ...SHADOWS.premium,
        borderWidth: 1,
        borderColor: COLORS.white + '80',
    },
    avatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: COLORS.background,
    },
    verifyBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: COLORS.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    userName: { 
        fontSize: 24, 
        fontWeight: '900', 
        color: COLORS.black,
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 20,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 1,
    },
    profileStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        width: '100%',
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
    },
    statText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    statDivider: {
        width: 1,
        height: 16,
        backgroundColor: COLORS.border,
        marginHorizontal: 8,
    },

    sectionHeader: { 
        fontSize: 12, 
        fontWeight: '900', 
        color: COLORS.textMuted, 
        textTransform: 'uppercase', 
        marginBottom: 12, 
        marginLeft: 8, 
        letterSpacing: 1.5 
    },
    card: { 
        backgroundColor: COLORS.white, 
        borderRadius: 24, 
        paddingVertical: 8, 
        ...SHADOWS.soft, 
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.white + '50',
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    iconBox: { 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        backgroundColor: COLORS.primary + '10', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    settingTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
    settingSubValue: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', marginTop: 2 },
    divider: { height: 1, backgroundColor: COLORS.background, marginLeft: 72 },
    
    logoutRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    logoutText: { marginLeft: 16, fontSize: 16, fontWeight: '700', color: COLORS.error },
    dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, opacity: 0.6 },
    dangerText: { marginLeft: 16, fontSize: 16, fontWeight: '700', color: COLORS.error },
    
    footer: { marginTop: 0, alignItems: 'center', paddingBottom: 20 },
    versionText: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, marginBottom: 4 },
    infoText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});
