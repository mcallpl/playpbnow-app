import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BrandedIcon } from './BrandedIcon';

/**
 * Cross-platform date + time picker.
 *
 * Web: renders the browser's native <input type="date"> / <input type="time">.
 *   On iOS/Android Safari/Chrome this pops the system date/time WHEEL, so the
 *   user jumps straight to any time instead of tapping a +/- stepper 15 min at a
 *   time. `colorScheme: dark` themes the native popup to match the app.
 * Native (iOS/Android app): keeps the familiar chevron stepper (15-min step) so
 *   there's no behavior change or new native dependency.
 */
interface Props {
  date: Date;
  onChange: (d: Date) => void;
  colors: {
    text: string;
    inputBg?: string;
    inputText?: string;
    border?: string;
    accent: string;
  };
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function SmartDateTimePicker({ date, onChange, colors }: Props) {
  if (Platform.OS === 'web') {
    const dateVal = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const timeVal = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

    const inputStyle: any = {
      flex: 1,
      minWidth: 0,
      boxSizing: 'border-box',
      backgroundColor: colors.inputBg || '#0f1b2d',
      color: colors.inputText || colors.text || '#fff',
      border: `1px solid ${colors.border || 'rgba(255,255,255,0.12)'}`,
      borderRadius: 12,
      padding: '14px 12px',
      fontSize: 16,
      fontWeight: 700,
      fontFamily: 'inherit',
      colorScheme: 'dark',
      outline: 'none',
      cursor: 'pointer',
    };

    const onDate = (e: any) => {
      const parts = String(e.target.value).split('-').map(Number);
      if (parts.length !== 3 || !parts[0]) return;
      const nd = new Date(date);
      nd.setFullYear(parts[0], parts[1] - 1, parts[2]);
      onChange(nd);
    };
    const onTime = (e: any) => {
      const parts = String(e.target.value).split(':').map(Number);
      if (parts.length < 2 || Number.isNaN(parts[0])) return;
      const nd = new Date(date);
      nd.setHours(parts[0], parts[1], 0, 0);
      onChange(nd);
    };

    // Raw DOM inputs — react-native-web renders lowercase JSX as real DOM nodes.
    return (
      <View style={styles.webRow}>
        {React.createElement('input', {
          type: 'date',
          value: dateVal,
          onChange: onDate,
          style: { ...inputStyle, flex: 1.2 },
          'aria-label': 'Match date',
        })}
        {React.createElement('input', {
          type: 'time',
          value: timeVal,
          step: 300,
          onChange: onTime,
          style: inputStyle,
          'aria-label': 'Match time',
        })}
      </View>
    );
  }

  // ── Native fallback: chevron steppers (unchanged behavior) ──
  const adjustDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onChange(d);
  };
  const adjustTime = (direction: number) => {
    const d = new Date(date);
    const m = d.getMinutes();
    if (direction > 0) d.setMinutes(m + (15 - (m % 15)));
    else {
      const r = m % 15;
      d.setMinutes(m - (r === 0 ? 15 : r));
    }
    d.setSeconds(0);
    onChange(d);
  };

  const row: any = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: colors.inputBg || 'rgba(255,255,255,0.06)',
    padding: 10,
    borderRadius: 10,
  };
  const arrow: any = { backgroundColor: colors.accent, padding: 10, borderRadius: 8 };
  const val: any = { fontWeight: '900', color: colors.text, fontSize: 14 };

  return (
    <View>
      <View style={row}>
        <TouchableOpacity onPress={() => adjustDate(-1)} style={arrow}>
          <BrandedIcon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={val}>
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => adjustDate(1)} style={arrow}>
          <BrandedIcon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={row}>
        <TouchableOpacity onPress={() => adjustTime(-1)} style={arrow}>
          <BrandedIcon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={val}>
          {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
        <TouchableOpacity onPress={() => adjustTime(1)} style={arrow}>
          <BrandedIcon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
});
