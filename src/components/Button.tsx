
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native';
import { colors, typography } from '../theme';

interface Props extends TouchableOpacityProps {
    title: string;
    loading?: boolean;
    variant?: 'primary' | 'outline';
}

export const Button = ({ title, loading, variant = 'primary', style, ...props }: Props) => {
    return (
        <TouchableOpacity
            style={[
                styles.container,
                variant === 'outline' && styles.outlineContainer,
                props.disabled && styles.disabled,
                style,
            ]}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
            ) : (
                <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    outlineContainer: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    text: {
        ...typography.buttonText,
    },
    outlineText: {
        color: colors.primary,
    },
    disabled: {
        opacity: 0.6,
    },
});
