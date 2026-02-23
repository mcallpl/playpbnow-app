import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandedIcon } from './BrandedIcon';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_BODY_MEDIUM } from '../constants/theme';

// --- InfoBox: guidance / explanation (1-2 lines) ---

interface InfoBoxProps {
  text: string;
  icon?: string;
}

export function InfoBox({ text, icon = 'info' }: InfoBoxProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createInfoStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <BrandedIcon name={icon} size={18} color={colors.accent} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const createInfoStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: c.accent,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  text: {
    flex: 1,
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 13,
    color: c.textSoft,
    lineHeight: 18,
  },
});

// --- StatusBox: connectivity / sync / live indicators ---

interface StatusBoxProps {
  label: string;
  status: 'connected' | 'syncing' | 'disconnected';
  detail?: string;
}

const STATUS_COLORS: Record<StatusBoxProps['status'], string> = {
  connected: '#87ca37',
  syncing: '#ffd23f',
  disconnected: '#ff4757',
};

export function StatusBox({ label, status, detail }: StatusBoxProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStatusStyles(colors), [colors]);
  const dotColor = STATUS_COLORS[status];

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label}>{label}</Text>
      {detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

const createStatusStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.glassBg,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 13,
    color: c.text,
  },
  detail: {
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 12,
    color: c.textMuted,
    marginLeft: 'auto',
  },
});

// --- WarningBox: rare caution (force update, leaving lobby, etc.) ---

interface WarningBoxProps {
  text: string;
  icon?: string;
}

export function WarningBox({ text, icon = 'warning' }: WarningBoxProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWarningStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <BrandedIcon name={icon} size={18} color={colors.danger} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const createWarningStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `rgba(255,71,87,0.08)`,
    borderLeftWidth: 3,
    borderLeftColor: c.danger,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  text: {
    flex: 1,
    fontFamily: FONT_BODY_MEDIUM,
    fontSize: 13,
    color: c.textSoft,
    lineHeight: 18,
  },
});
