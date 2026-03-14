import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { BrandedIcon } from './BrandedIcon';

interface PulsingTabIconProps {
  name: string;
  size: number;
  color: string;
  active: boolean;
  glowColor?: string;
  count?: number;
}

export function PulsingTabIcon({ name, size, color, active, glowColor = '#87ca37', count }: PulsingTabIconProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      // Icon pulses aggressively
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0.9, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.2, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0.4, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      // Glow dot flashes
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0.2, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      // Expanding ring burst
      ringScale.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 0 }),
          withTiming(3, { duration: 800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 0 }),
          withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(glowOpacity);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
      ringScale.value = withTiming(0.5, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [active]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Expanding ring burst */}
      <Animated.View style={[styles.ring, { borderColor: glowColor }, animatedRingStyle]} />
      {/* Glow dot */}
      <Animated.View style={[styles.glowDot, { backgroundColor: glowColor }, animatedGlowStyle]} />
      {/* Icon */}
      <Animated.View style={animatedIconStyle}>
        <BrandedIcon name={name} size={size} color={active ? glowColor : color} />
      </Animated.View>
      {/* Badge count */}
      {active && count != null && count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  glowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: -4,
  },
  ring: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});
