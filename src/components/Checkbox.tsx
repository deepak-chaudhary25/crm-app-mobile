import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useAppTheme } from '../theme';
import { moderateScale, scale, verticalScale } from '../utils/responsive';

interface CheckboxProps {
    value: boolean;
    onValueChange: (newValue: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
}

export const Checkbox = ({ value, onValueChange, label, description, disabled = false }: CheckboxProps) => {
    const { colors } = useAppTheme();

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => !disabled && onValueChange(!value)}
            activeOpacity={0.7}
            disabled={disabled}
        >
            <View style={[
                styles.box,
                {
                    borderColor: value ? colors.primary : colors.border,
                    backgroundColor: value ? colors.primary : 'transparent'
                }
            ]}>
                {value && <Icon name="checkmark" size={16} color="#FFF" />}
            </View>

            {(label || description) && (
                <View style={styles.textContainer}>
                    {label && (
                        <Text style={[
                            styles.label,
                            { color: colors.textPrimary, opacity: disabled ? 0.5 : 1 }
                        ]}>
                            {label}
                        </Text>
                    )}
                    {description && (
                        <Text style={[
                            styles.description,
                            { color: colors.textSecondary, opacity: disabled ? 0.5 : 1 }
                        ]}>
                            {description}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(8),
    },
    box: {
        width: moderateScale(22),
        height: moderateScale(22),
        borderRadius: moderateScale(6),
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(10),
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: moderateScale(14),
        fontWeight: '500',
    },
    description: {
        fontSize: moderateScale(12),
        marginTop: verticalScale(2),
    }
});
