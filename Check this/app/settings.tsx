import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { Stack, useRouter } from 'expo-router';
import { Bell, ChevronRight, Eye, Shield, Smartphone, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [biometrics, setBiometrics] = useState(true);

    const SettingRow = ({ icon: Icon, title, value, onValueChange, type = 'switch', onPress }: any) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={type === 'switch'}>
            <View style={styles.iconBox}>
                <Icon size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.settingTitle}>{title}</Text>
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

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Settings', headerShadowVisible: false }} />
            <SafeAreaView style={styles.safe} edges={['bottom']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                    <Text style={styles.sectionHeader}>Preferences</Text>
                    <View style={styles.card}>
                        <SettingRow icon={Bell} title="Push Notifications" value={notifications} onValueChange={setNotifications} />
                        <View style={styles.divider} />
                        <SettingRow icon={Smartphone} title="Dark Mode" value={darkMode} onValueChange={setDarkMode} />
                        <View style={styles.divider} />
                        <SettingRow icon={Eye} title="Low Data Mode" value={false} />
                    </View>

                    <Text style={styles.sectionHeader}>Security</Text>
                    <View style={styles.card}>
                        <SettingRow icon={Shield} title="Biometric Lock" value={biometrics} onValueChange={setBiometrics} />
                        <View style={styles.divider} />
                        <SettingRow icon={Shield} title="Two-Factor Authentication" type="link" />
                    </View>

                    <Text style={styles.sectionHeader}>Account Actions</Text>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.dangerRow}>
                            <View style={[styles.iconBox, { backgroundColor: COLORS.error + '10' }]}>
                                <Trash2 size={20} color={COLORS.error} />
                            </View>
                            <Text style={styles.dangerText}>Delete Account</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>Data gathered by this app is used strictly for public safety and utility restoration in accordance with the Data Protection Act of Kenya.</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    safe: { flex: 1 },
    scroll: { padding: SPACING.lg },
    sectionHeader: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
    card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, paddingVertical: 8, ...SHADOWS.soft, marginBottom: 32 },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '10', justifyContent: 'center', alignItems: 'center' },
    settingTitle: { flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '700', color: COLORS.black },
    divider: { height: 1, backgroundColor: COLORS.background, marginLeft: 68 },
    dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    dangerText: { marginLeft: 16, fontSize: 16, fontWeight: '700', color: COLORS.error },
    infoBox: { marginTop: 20, paddingHorizontal: 10 },
    infoText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, textAlign: 'center' },
});
