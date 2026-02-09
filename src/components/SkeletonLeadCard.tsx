import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme';
import { Skeleton } from './Skeleton';
import { scale, verticalScale, moderateScale } from '../utils/responsive';

export const SkeletonLeadCard = () => {
    const { colors } = useAppTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.textPrimary }]}>
            {/* Header Row */}
            <View style={styles.headerRow}>
                {/* Avatar Skeleton */}
                <Skeleton width={moderateScale(48)} height={moderateScale(48)} borderRadius={moderateScale(24)} style={{ marginRight: scale(12) }} />

                <View style={{ flex: 1 }}>
                    {/* Name & Badge Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(8) }}>
                        <Skeleton width={scale(120)} height={verticalScale(16)} borderRadius={4} style={{ marginRight: scale(8) }} />
                        <Skeleton width={scale(60)} height={verticalScale(16)} borderRadius={4} />
                    </View>

                    {/* Secondary Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        {/* Details Column */}
                        <View style={{ flex: 1 }}>
                            <Skeleton width={scale(80)} height={verticalScale(12)} borderRadius={4} style={{ marginBottom: verticalScale(4) }} />
                            <Skeleton width={scale(100)} height={verticalScale(12)} borderRadius={4} style={{ marginBottom: verticalScale(4) }} />
                            <Skeleton width={scale(90)} height={verticalScale(12)} borderRadius={4} />
                        </View>

                        {/* Score Column Skeleton */}
                        <View style={{ alignItems: 'center' }}>
                            <Skeleton width={moderateScale(40)} height={moderateScale(40)} borderRadius={moderateScale(20)} style={{ marginBottom: verticalScale(4) }} />
                            <Skeleton width={scale(30)} height={verticalScale(10)} borderRadius={4} />
                        </View>
                    </View>
                </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Actions Row Skeleton */}
            <View style={styles.actionRow}>
                <Skeleton width={scale(60)} height={verticalScale(16)} borderRadius={4} />
                <Skeleton width={scale(80)} height={verticalScale(16)} borderRadius={4} />
                <Skeleton width={scale(70)} height={verticalScale(16)} borderRadius={4} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: moderateScale(20),
        padding: scale(16),
        marginBottom: verticalScale(16),
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.08,
        shadowRadius: moderateScale(10),
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    divider: {
        height: 1,
        marginTop: verticalScale(12),
        marginBottom: verticalScale(12),
        opacity: 0.5,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scale(8),
    },
});
