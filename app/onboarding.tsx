import { COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Community Safety',
        description: 'Join a vibrant community of Kenyans dedicated to making our neighborhoods safer and cleaner together.',
        image: require('../assets/images/onboarding/safety.png'),
    },
    {
        id: '2',
        title: 'Instant Reporting',
        description: 'Report incidents in seconds with our sleek, intuitive interface. Your voice matters, and we make it heard.',
        image: require('../assets/images/onboarding/reporting.png'),
    },
    {
        id: '3',
        title: 'Direct Impact',
        description: 'See the real-world results of your civic actions as public service teams respond and resolve issues.',
        image: require('../assets/images/onboarding/impact.png'),
    },
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();
    const timerRef = useRef<any>(null);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (currentIndex < SLIDES.length - 1) {
                flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
            } else {
                // Pause on the last slide so the user can click Get Started themselves
                if (timerRef.current) clearInterval(timerRef.current);
            }
        }, 5000); // Increased to 5 seconds per slide for better reading time
    };

    React.useEffect(() => {
        startTimer();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIndex]);

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
            router.replace('/auth/login');
        }
    };

    const handleSkip = async () => {
        await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
        router.replace('/auth/login');
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            <SafeAreaView style={styles.safe}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>

                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                    bounces={false}
                    onScroll={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / width);
                        setCurrentIndex(index);
                    }}
                    renderItem={({ item }) => (
                        <View style={styles.slide}>
                            <MotiView
                                from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                                transition={{ type: 'timing', duration: 800 }}
                                style={styles.imageContainer}
                            >
                                <Image
                                    source={item.image}
                                    style={styles.onboardingImage}
                                    resizeMode="cover"
                                />
                                <LinearGradient
                                    colors={['transparent', 'rgba(255,255,255,1)']}
                                    style={styles.imageFade}
                                />
                            </MotiView>

                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.description}>{item.description}</Text>
                            </View>
                        </View>
                    )}
                />

                <View style={styles.footer}>
                    <View style={styles.indicatorContainer}>
                        {SLIDES.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.indicator,
                                    {
                                        backgroundColor: currentIndex === i ? COLORS.primary : COLORS.border,
                                        width: currentIndex === i ? 32 : 8,
                                        opacity: currentIndex === i ? 1 : 0.5
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.nextBtnContainer} onPress={handleNext}>
                        <LinearGradient
                            colors={[COLORS.primary, '#004D2C']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.nextBtn}
                        >
                            <Text style={styles.nextBtnText}>
                                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
                            </Text>
                            <ArrowRight size={20} color={COLORS.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    safe: { flex: 1 },
    skipBtn: { alignSelf: 'flex-end', padding: SPACING.xl, zIndex: 10 },
    skipText: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted },
    slide: { width, alignItems: 'center' },
    imageContainer: { width: width, height: height * 0.55, position: 'relative' },
    onboardingImage: { width: '100%', height: '100%' },
    imageFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
    textContainer: { flex: 1, width: '100%', paddingHorizontal: SPACING.xl, alignItems: 'center', marginTop: -20 },
    title: { fontSize: 36, fontWeight: '900', color: COLORS.black, textAlign: 'center', marginBottom: 16, letterSpacing: -1 },
    description: { fontSize: 17, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 28, paddingHorizontal: 10 },
    footer: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
    indicatorContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
    indicator: { height: 8, borderRadius: 4 },
    nextBtnContainer: { height: 68, borderRadius: 34, overflow: 'hidden', ...SHADOWS.premium },
    nextBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    nextBtnText: { color: COLORS.white, fontSize: 19, fontWeight: '800' },
});
