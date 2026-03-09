import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '@/constants/Theme';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function SkeletonCard() {
    return (
        <View style={styles.cardContainer}>
            {/* Image Placeholder */}
            <MotiView
                transition={{ type: 'timing', duration: 1000, loop: true }}
                from={{ opacity: 0.3 }}
                animate={{ opacity: 0.7 }}
                style={styles.imageSkeleton}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    {/* Title Skeleton */}
                    <MotiView
                        transition={{ type: 'timing', duration: 1000, loop: true }}
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 0.7 }}
                        style={styles.titleSkeleton}
                    />
                    {/* Status Badge Skeleton */}
                    <MotiView
                        transition={{ type: 'timing', duration: 1000, loop: true }}
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 0.7 }}
                        style={styles.badgeSkeleton}
                    />
                </View>

                {/* Subtitle/Location Skeleton */}
                <MotiView
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                    from={{ opacity: 0.3 }}
                    animate={{ opacity: 0.7 }}
                    style={styles.subtitleSkeleton}
                />

                {/* Footer Skeleton */}
                <View style={styles.footer}>
                    <MotiView
                        transition={{ type: 'timing', duration: 1000, loop: true }}
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 0.7 }}
                        style={styles.categorySkeleton}
                    />
                    <MotiView
                        transition={{ type: 'timing', duration: 1000, loop: true }}
                        from={{ opacity: 0.3 }}
                        animate={{ opacity: 0.7 }}
                        style={styles.buttonSkeleton}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: 16,
        overflow: 'hidden',
        ...SHADOWS.premium,
    },
    imageSkeleton: {
        width: '100%',
        height: 180,
        backgroundColor: COLORS.border,
    },
    content: {
        padding: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    titleSkeleton: {
        width: '60%',
        height: 24,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    badgeSkeleton: {
        width: 60,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.border,
    },
    subtitleSkeleton: {
        width: '40%',
        height: 16,
        borderRadius: 4,
        backgroundColor: COLORS.border,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.background,
        paddingTop: 16,
    },
    categorySkeleton: {
        width: 80,
        height: 20,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    buttonSkeleton: {
        width: 100,
        height: 32,
        borderRadius: 12,
        backgroundColor: COLORS.border,
    },
});
