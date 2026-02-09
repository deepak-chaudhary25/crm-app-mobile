import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme';
import { Icon } from './Icon';
import { moderateScale, scale, verticalScale } from '../utils/responsive';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState = ({
    icon = 'search',
    title,
    description,
    actionLabel,
    onAction
}: EmptyStateProps) => {
    const { colors } = useAppTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
                <Icon name={icon} size={moderateScale(48)} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

            {description && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {description}
                </Text>
            )}

            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onAction}
                >
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1, // Take available space
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(32),
        paddingTop: verticalScale(40), // Push it down a bit
    },
    iconContainer: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(24),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: verticalScale(4),
        },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(8),
        elevation: 4,
    },
    title: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: verticalScale(8),
    },
    description: {
        fontSize: moderateScale(14),
        textAlign: 'center',
        lineHeight: verticalScale(20),
        marginBottom: verticalScale(24),
    },
    button: {
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(24),
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: moderateScale(14),
    }
});
