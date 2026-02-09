import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useAppTheme } from '../theme';

interface SkeletonProps {
    width?: ViewStyle['width'];
    height?: ViewStyle['height'];
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export const Skeleton = ({ width, height, borderRadius = 4, style }: SkeletonProps) => {
    const { colors, isDark } = useAppTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        return () => pulse.stop();
    }, []);

    const baseColor = isDark ? '#374151' : '#E5E7EB';

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: baseColor,
                    opacity,
                },
                style,
            ]}
        />
    );
};
