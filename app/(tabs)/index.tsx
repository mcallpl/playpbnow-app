import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import {
  ThemeColors,
  FONT_DISPLAY_EXTRABOLD,
  FONT_BODY_BOLD,
} from '../../constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleEnter = () => {
    router.replace('/groups');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.contentContainer}>
        <Image
          source={require('../../assets/images/PlayPBNow-Logo-SMALL.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.enterBtn}
          onPress={handleEnter}
          activeOpacity={0.8}
        >
          <Text style={styles.enterText}>ENTER APP</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>POWERED BY PEOPLESTAR</Text>
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
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  enterBtn: {
    backgroundColor: c.accent,
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 35,
  },
  enterText: {
    color: 'white',
    fontSize: 22,
    fontFamily: FONT_DISPLAY_EXTRABOLD,
    letterSpacing: 2,
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    color: c.textMuted,
    fontSize: 10,
    fontFamily: FONT_BODY_BOLD,
    letterSpacing: 1,
  }
});
