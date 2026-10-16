/**
 * The long court list, made quick: a search box (name, city or state, any
 * order), the user's own courts at the top, and everything else nearest
 * first once the phone's location is known. Only the rows on screen are
 * drawn, so 1,300+ courts open instantly.
 *
 * Location is read silently when the user has already allowed it; otherwise
 * a "Show nearest first" button asks, and nothing is asked until it is tapped.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { BrandedIcon } from './BrandedIcon';
import { Alert } from '../utils/crossAlert';
import { useTheme } from '../context/ThemeContext';
import { useBeaconStatus } from '../context/BeaconContext';
import { ThemeColors, FONT_BODY_REGULAR, FONT_BODY_SEMIBOLD, FONT_BODY_BOLD, FONT_DISPLAY_EXTRABOLD } from '../constants/theme';
import { orderCourts, PickableCourt } from '../utils/courtSearch';

interface Props<C extends PickableCourt> {
  courts: C[];
  selectedId: number | null;
  onSelect: (court: C) => void;
  /** Courts this user already plays at (their groups' courts). Shown first. */
  myCourtIds?: (number | null | undefined)[];
  /** Rows drawn above the list, such as "No Court". */
  header?: React.ReactNode;
  maxHeight?: number;
}

export function CourtPickerList<C extends PickableCourt>({ courts, selectedId, onSelect, myCourtIds = [], header, maxHeight = 400 }: Props<C>) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const { location, requestLocation } = useBeaconStatus();
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);

  // Already allowed: use it without a prompt.
  useEffect(() => {
    if (location) return;
    let alive = true;
    Location.getForegroundPermissionsAsync()
      .then(p => { if (alive && p.granted) requestLocation(); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const rows = useMemo(
    () => orderCourts(courts, { query, myCourtIds: [...myCourtIds, selectedId], location }),
    [courts, query, myCourtIds, selectedId, location],
  );
  const firstOther = rows.findIndex(r => !r.mine);

  // Asks in this screen's own words; the shared prompt talks about beacons.
  const askLocation = async () => {
    setAsking(true);
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.granted) { await requestLocation(); return; }
      Alert.alert(
        'Location is off for PlayPBNow',
        'To list the courts nearest you first, allow location for PlayPBNow in Settings. You can still type a court name or city to find it.',
        [{ text: 'Not Now', style: 'cancel' }, ...(Platform.OS === 'web' ? [] : [{ text: 'Open Settings', onPress: () => Linking.openSettings() }])],
      );
    } catch {
      // No location on this device: the search box still works.
    } finally { setAsking(false); }
  };

  return (
    <View>
      <View style={s.searchRow}>
        <BrandedIcon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Type a court name or city"
          placeholderTextColor={colors.inputPlaceholder}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {!!query && Platform.OS !== 'ios' && (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search" style={{ padding: 4 }}>
            <BrandedIcon name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {location ? (
        <Text style={s.hint}>Nearest to you first.</Text>
      ) : (
        <TouchableOpacity style={s.nearBtn} onPress={askLocation} disabled={asking}>
          <BrandedIcon name="location" size={16} color={colors.accent} />
          <Text style={s.nearText}>{asking ? 'Finding you…' : 'Show nearest first'}</Text>
        </TouchableOpacity>
      )}
      <FlatList
        style={{ maxHeight }}
        data={rows}
        keyExtractor={r => String(r.court.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
        nestedScrollEnabled
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={7}
        ListHeaderComponent={<>{header}</>}
        ListEmptyComponent={<Text style={s.empty}>No courts match "{query.trim()}". Try fewer letters, or add it with Add New Location.</Text>}
        renderItem={({ item, index }) => {
          const c = item.court;
          const sel = selectedId === c.id;
          return (
            <>
              {index === 0 && item.mine && <Text style={s.section}>YOUR COURTS</Text>}
              {index === firstOther && firstOther > 0 && <Text style={s.section}>{location ? 'NEAREST' : 'ALL COURTS'}</Text>}
              <TouchableOpacity style={[s.row, sel && s.rowSel]} onPress={() => onSelect(c)}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, sel && { color: colors.accent, fontFamily: FONT_DISPLAY_EXTRABOLD }]} numberOfLines={1}>{c.name}</Text>
                  {(c.city || c.state || item.dist != null) && (
                    <Text style={s.city} numberOfLines={1}>
                      {[c.city, c.state].filter(Boolean).join(', ')}
                      {item.dist != null ? `${c.city || c.state ? ' · ' : ''}${item.dist < 10 ? item.dist.toFixed(1) : Math.round(item.dist)} mi` : ''}
                    </Text>
                  )}
                </View>
                {sel && <BrandedIcon name="confirm" size={22} color={colors.accent} />}
              </TouchableOpacity>
            </>
          );
        }}
      />
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12,
    backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder, marginBottom: 8,
  },
  search: { flex: 1, paddingVertical: 12, color: c.text, fontFamily: FONT_BODY_REGULAR, fontSize: 16 },
  hint: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: c.textMuted, marginBottom: 6, textAlign: 'center' },
  nearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, marginBottom: 4 },
  nearText: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: c.accent },
  section: { fontFamily: FONT_BODY_BOLD, fontSize: 11, letterSpacing: 1.5, color: c.textMuted, marginTop: 10, marginBottom: 4, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  rowSel: { backgroundColor: c.accentSoft, borderRadius: 8 },
  name: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 16, color: c.text },
  city: { fontFamily: FONT_BODY_REGULAR, fontSize: 13, color: c.textMuted, marginTop: 2 },
  empty: { fontFamily: FONT_BODY_REGULAR, fontSize: 14, color: c.textMuted, padding: 16, textAlign: 'center' },
});
