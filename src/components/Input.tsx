
import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { useAppTheme, typography } from '../theme';
import { Icon } from './Icon';

interface Props extends TextInputProps {
    label?: string;
    error?: string;
    rightIcon?: string;
    onRightIconPress?: () => void;
}

export const Input = ({ label, error, style, rightIcon, onRightIconPress, ...props }: Props) => {
    const { colors } = useAppTheme();

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
            <View>
                <TextInput
                    style={[
                        styles.input,
                        {
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                            color: colors.textPrimary,
                            paddingRight: rightIcon ? 40 : 12
                        },
                        error ? { borderColor: colors.error } : null,
                        style
                    ]}
                    placeholderTextColor={colors.textSecondary}
                    {...props}
                />
                {rightIcon && (
                    <TouchableOpacity
                        style={styles.iconContainer}
                        onPress={onRightIconPress}
                        disabled={!onRightIconPress}
                    >
                        <Icon name={rightIcon} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        ...typography.label,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
    iconContainer: {
        position: 'absolute',
        right: 12,
        top: 14,
        zIndex: 1,
    },
});
