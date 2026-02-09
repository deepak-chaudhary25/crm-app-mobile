import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useAppTheme } from '../theme';
import { moderateScale } from '../utils/responsive';

export const Loader = () => {
    const { colors } = useAppTheme();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease)
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 0.8,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease)
                    })
                ]),
                Animated.sequence([
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease)
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.5,
                        duration: 1000,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.ease)
                    })
                ])
            ])
        );

        pulse.start();

        return () => pulse.stop();
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.circle,
                    {
                        backgroundColor: colors.primary,
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim
                    }
                ]}
            />
            {/* Inner fixed circle for cooler effect */}
            <View style={[styles.innerCircle, { backgroundColor: colors.primary }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circle: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        position: 'absolute',
    },
    innerCircle: {
        width: moderateScale(30),
        height: moderateScale(30),
        borderRadius: moderateScale(15),
        opacity: 0.8,
    }
});
