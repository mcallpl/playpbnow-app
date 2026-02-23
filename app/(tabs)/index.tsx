import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';
import { BrandedIcon } from '../../components/BrandedIcon';
import { useTheme } from '../../context/ThemeContext';
import {
  ThemeColors,
  FONT_DISPLAY_EXTRABOLD,
  FONT_DISPLAY_BOLD,
  FONT_BODY_MEDIUM,
  FONT_BODY_REGULAR,
  ANIMATION,
} from '../../constants/theme';

const API_URL = 'https://peoplestar.com/Chipleball/api';

// Abstract court geometry motif — thin lines at very low opacity
function CourtGeometry({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
      {/* Outer court boundary */}
      <Rect x={width * 0.1} y={height * 0.08} width={width * 0.8} height={height * 0.7}
        rx={16} stroke={color} strokeWidth={1} fill="none" opacity={0.05} />
      {/* Center net line */}
      <Line x1={width * 0.5} y1={height * 0.08} x2={width * 0.5} y2={height * 0.78}
        stroke={color} strokeWidth={1} opacity={0.04} />
      {/* Kitchen lines */}
      <Line x1={width * 0.1} y1={height * 0.3} x2={width * 0.9} y2={height * 0.3}
        stroke={color} strokeWidth={0.5} opacity={0.03} strokeDasharray="8,6" />
      <Line x1={width * 0.1} y1={height * 0.55} x2={width * 0.9} y2={height * 0.55}
        stroke={color} strokeWidth={0.5} opacity={0.03} strokeDasharray="8,6" />
      {/* Partial arcs — abstract corner elements */}
      <Path d={`M ${width * 0.1} ${height * 0.2} Q ${width * 0.15} ${height * 0.08} ${width * 0.25} ${height * 0.08}`}
        stroke={color} strokeWidth={0.8} fill="none" opacity={0.04} />
      <Path d={`M ${width * 0.9} ${height * 0.2} Q ${width * 0.85} ${height * 0.08} ${width * 0.75} ${height * 0.08}`}
        stroke={color} strokeWidth={0.8} fill="none" opacity={0.04} />
      {/* Grid segments */}
      <Line x1={width * 0.3} y1={height * 0.08} x2={width * 0.3} y2={height * 0.25}
        stroke={color} strokeWidth={0.5} opacity={0.025} />
      <Line x1={width * 0.7} y1={height * 0.08} x2={width * 0.7} y2={height * 0.25}
        stroke={color} strokeWidth={0.5} opacity={0.025} />
    </Svg>
  );
}

// Noise/grain overlay — scattered dots at very low opacity
function NoiseOverlay({ width, height, color }: { width: number; height: number; color: string }) {
  const dots = useMemo(() => {
    const result = [];
    for (let i = 0; i < 120; i++) {
      result.push({
        cx: Math.random() * width,
        cy: Math.random() * height,
        r: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.03 + 0.01,
      });
    }
    return result;
  }, [width, height]);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {dots.map((d, i) => (
        <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} opacity={d.opacity} />
      ))}
    </Svg>
  );
}

export default function LandingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [systemStatus, setSystemStatus] = useState<'stable' | 'checking'>('checking');
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: ANIMATION.fadeDuration * 2,
      useNativeDriver: true,
    }).start();

    // Lightweight system ping
    const start = Date.now();
    fetch(`${API_URL}/get_courts.php`)
      .then(() => {
        setSystemStatus('stable');
        setLastSync(Math.round((Date.now() - start) / 1000));
      })
      .catch(() => setSystemStatus('stable'));
  }, []);

  const handleEnter = () => {
    router.replace('/groups');
  };

  const screenWidth = 400;
  const screenHeight = 400;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Noise overlay — full screen */}
      <NoiseOverlay width={screenWidth} height={800} color={isDark ? '#ffffff' : '#000000'} />

      {/* Court geometry — top 40% */}
      <View style={styles.courtGeometryWrap}>
        <CourtGeometry width={screenWidth} height={screenHeight} color={isDark ? '#ffffff' : '#1b3358'} />
      </View>

      {/* Light sweep sheen — hero area */}
      <LinearGradient
        colors={[
          'transparent',
          isDark ? 'rgba(135,202,55,0.03)' : 'rgba(109,184,44,0.04)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sheen}
      />

      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {/* Logo */}
        <Image
          source={require('../../assets/images/PPBN-Logo-SMALL.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Subheading */}
        <Text style={styles.subheading}>Structured Instant Matches</Text>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.enterBtn}
          onPress={handleEnter}
          activeOpacity={0.8}
        >
          <Text style={styles.enterText}>Enter App</Text>
        </TouchableOpacity>

        {/* System status row */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <BrandedIcon name="connection" size={14} color={colors.accent} />
            <Text style={styles.statusText}>
              {systemStatus === 'checking' ? 'Connecting...' : 'System Stable'}
            </Text>
          </View>
          {lastSync !== null && (
            <View style={styles.statusItem}>
              <BrandedIcon name="sync" size={14} color={colors.textMuted} />
              <Text style={styles.statusText}>Last Sync: {lastSync}s</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Footer */}
      <Text style={styles.footerText}>Powered by PeopleStar</Text>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtGeometryWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    overflow: 'hidden',
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    zIndex: 1,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 16,
    color: c.textMuted,
    letterSpacing: 0.5,
  },
  enterBtn: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 30,
    marginTop: 8,
  },
  enterText: {
    color: 'white',
    fontSize: 18,
    fontFamily: FONT_DISPLAY_EXTRABOLD,
    letterSpacing: 1.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontFamily: FONT_BODY_REGULAR,
    fontSize: 12,
    color: c.textMuted,
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    color: c.textMuted,
    fontSize: 10,
    fontFamily: FONT_BODY_MEDIUM,
    letterSpacing: 0.5,
    opacity: 0.5,
  },
});
