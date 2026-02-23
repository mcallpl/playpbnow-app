import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
}

export function PulsingTabIcon({ name, size, color, active, glowColor = '#87ca37' }: PulsingTabIconProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(glowOpacity);
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [active]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glowDot, { backgroundColor: glowColor }, animatedGlowStyle]} />
      <Animated.View style={animatedIconStyle}>
        <BrandedIcon name={name} size={size} color={active ? glowColor : color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -6,
  },
});
