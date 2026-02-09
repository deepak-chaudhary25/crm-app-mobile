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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(32),
        minHeight: verticalScale(300), // Ensure minimum height for visibility
    },
    iconContainer: {
        width: moderateScale(120),
        height: moderateScale(120),
        borderRadius: moderateScale(60),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(24),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: verticalScale(8),
        },
        shadowOpacity: 0.15,
        shadowRadius: moderateScale(12),
        elevation: 6,
    },
    title: {
        fontSize: moderateScale(22),
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: verticalScale(12),
        letterSpacing: 0.5,
    },
    description: {
        fontSize: moderateScale(15),
        textAlign: 'center',
        lineHeight: verticalScale(24),
        marginBottom: verticalScale(32),
        paddingHorizontal: scale(16),
        opacity: 0.8,
    },
    button: {
        paddingHorizontal: scale(32),
        paddingVertical: verticalScale(14),
        borderRadius: moderateScale(30),
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: verticalScale(4),
        },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(8),
        elevation: 4,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: moderateScale(16),
        letterSpacing: 0.5,
    }
});
