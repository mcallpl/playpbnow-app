import { BrandedIcon } from '../components/BrandedIcon';
import React, { useEffect, useMemo, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

interface ScoreUpdateToastProps {
    visible: boolean;
    message: string;
    onHide: () => void;
}

export function ScoreUpdateToast({ visible, message, onHide }: ScoreUpdateToastProps) {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        if (visible) {
            // Slide in and fade in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                hideToast();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };

    if (!visible && slideAnim.__getValue() === -100) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <BrandedIcon name="notification" size={20} color="white" />
                </View>
                <Text style={styles.message}>{message}</Text>
            </View>
        </Animated.View>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    container: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    content: {
        backgroundColor: c.accent,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    iconContainer: {
        marginRight: 12,
    },
    message: {
        color: 'white',
        fontSize: 14,
        fontFamily: FONT_BODY_BOLD,
        flex: 1,
    },
});
