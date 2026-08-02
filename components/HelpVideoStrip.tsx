/**
 * HELP: prominent how-to video strip.
 *
 * Sits at the top of the Help tab so the videos are the first thing seen rather
 * than buried under the topic accordions.
 *
 * Playback deliberately uses NO native video module. Adding expo-video/expo-av
 * would be a native dependency, which cannot ship over-the-air — it would force
 * a new build and a store submission. Instead:
 *   web    — a real <video> element in a modal (react-native-web renders to the
 *            DOM, so createElement('video') is a genuine DOM node)
 *   native — hand off to the system player via Linking, which gives full-screen
 *            playback with native controls and costs nothing to ship
 */
import React, { useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BrandedIcon } from './BrandedIcon';
import {
  HELP_VIDEOS,
  HelpVideo,
  formatDuration,
  posterUrl,
  videoUrl,
} from '../utils/helpVideos';
import {
  ThemeColors,
  FONT_DISPLAY_BOLD,
  FONT_DISPLAY_EXTRABOLD,
  FONT_BODY_REGULAR,
  FONT_BODY_SEMIBOLD,
} from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export const HelpVideoStrip: React.FC = () => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [playing, setPlaying] = useState<HelpVideo | null>(null);

  const open = (v: HelpVideo) => {
    if (Platform.OS === 'web') {
      setPlaying(v);
    } else {
      Linking.openURL(videoUrl(v.slug)).catch(() => {});
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.playBadge}>
            <BrandedIcon name="start" size={14} color={colors.accentText} />
          </View>
          <Text style={styles.heading}>HOW-TO VIDEOS</Text>
        </View>
        <Text style={styles.count}>{HELP_VIDEOS.length}</Text>
      </View>
      <Text style={styles.subheading}>
        Short walkthroughs — tap any one to watch
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {HELP_VIDEOS.map((v) => (
          <TouchableOpacity
            key={v.slug}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => open(v)}
          >
            <View style={styles.posterWrap}>
              <Image
                source={{ uri: posterUrl(v.slug) }}
                style={styles.poster}
                resizeMode="cover"
              />
              <View style={styles.playOverlay}>
                <View style={styles.playCircle}>
                  <BrandedIcon name="start" size={20} color={colors.accentText} />
                </View>
              </View>
              <View style={styles.durationPill}>
                <Text style={styles.durationText}>{formatDuration(v.seconds)}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{v.title}</Text>
            <Text style={styles.cardBlurb} numberOfLines={2}>{v.blurb}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Web-only inline player. Native never sets `playing`. */}
      <Modal
        visible={!!playing}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaying(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{playing?.title}</Text>
              <TouchableOpacity onPress={() => setPlaying(null)} style={styles.closeBtn}>
                <BrandedIcon name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {playing && Platform.OS === 'web'
              ? React.createElement('video', {
                  src: videoUrl(playing.slug),
                  poster: posterUrl(playing.slug),
                  controls: true,
                  autoPlay: true,
                  playsInline: true,
                  style: {
                    width: '100%',
                    maxHeight: '78vh',
                    borderRadius: 12,
                    backgroundColor: '#000',
                  },
                })
              : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      paddingTop: 4,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginBottom: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    playBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heading: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 15,
      color: c.text,
      letterSpacing: 0.6,
    },
    count: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 12,
      color: c.accent,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      overflow: 'hidden',
    },
    subheading: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 12.5,
      color: c.textMuted,
      paddingHorizontal: 16,
      marginTop: 4,
      marginBottom: 12,
    },
    strip: { paddingHorizontal: 16, gap: 12 },
    card: { width: 168 },
    posterWrap: {
      width: 168,
      height: 116,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    poster: { width: '100%', height: '100%' },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationPill: {
      position: 'absolute',
      right: 6,
      bottom: 6,
      backgroundColor: 'rgba(0,0,0,0.72)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    durationText: {
      fontFamily: FONT_BODY_SEMIBOLD,
      fontSize: 11,
      color: '#fff',
    },
    cardTitle: {
      fontFamily: FONT_DISPLAY_BOLD,
      fontSize: 13.5,
      color: c.text,
      marginTop: 8,
    },
    cardBlurb: {
      fontFamily: FONT_BODY_REGULAR,
      fontSize: 11.5,
      color: c.textMuted,
      marginTop: 2,
      lineHeight: 15,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.88)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: { width: '100%', maxWidth: 520 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    modalTitle: {
      fontFamily: FONT_DISPLAY_EXTRABOLD,
      fontSize: 17,
      color: '#fff',
    },
    closeBtn: { padding: 6 },
  });
