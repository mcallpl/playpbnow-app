/**
 * In-app dialogs for the web (2026-10-31).
 *
 * On the web every Alert.alert used to open the browser's own popup: the page
 * address as its title, generic OK / Cancel buttons, and for three choices a
 * chain of popups ("OK = Delete (Cancel to see other options)"). This draws
 * the same alerts as a PlayPBNow dialog with the real button labels. Phones
 * keep their native alerts. If this host is not mounted, utils/crossAlert
 * falls back to the browser popups, so no alert can ever be lost.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { AlertButton } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FONT_BODY_REGULAR, FONT_BODY_SEMIBOLD, FONT_DISPLAY_BOLD } from '@/constants/theme';
import { registerAlertHost, type WebDialog } from '@/utils/crossAlert';

export function AlertHost() {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [queue, setQueue] = useState<WebDialog[]>([]);

  useEffect(() => {
    registerAlertHost((d) => setQueue((q) => [...q, d]));
    return () => registerAlertHost(null);
  }, []);

  const current = queue[0];
  if (!current) return null;

  const buttons: AlertButton[] = current.buttons && current.buttons.length ? current.buttons : [{ text: 'OK' }];
  const press = (b?: AlertButton) => {
    setQueue((q) => q.slice(1));
    // after the dialog closes, like a native alert
    setTimeout(() => b?.onPress?.(), 0);
  };
  const cancel = buttons.find((b) => b.style === 'cancel');
  // Cancel first (left), the main action last (right), like the phones.
  const ordered = [...buttons.filter((b) => b.style === 'cancel'), ...buttons.filter((b) => b.style !== 'cancel')];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => press(cancel)}>
      <View style={s.overlay}>
        <View style={s.card} accessibilityRole="alert">
          <Text style={s.title}>{current.title}</Text>
          {!!current.message && (
            <ScrollView style={{ maxHeight: 320, flexGrow: 0 }}>
              <Text style={s.message}>{current.message}</Text>
            </ScrollView>
          )}
          <View style={[s.buttons, ordered.length > 2 && s.buttonsStacked]}>
            {ordered.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDanger = b.style === 'destructive';
              const isMain = !isCancel && !isDanger && i === ordered.length - 1;
              return (
                <TouchableOpacity key={`${b.text}-${i}`} accessibilityRole="button" onPress={() => press(b)}
                  style={[s.btn, ordered.length > 2 && s.btnStacked,
                    { backgroundColor: isDanger ? colors.danger : isMain ? colors.accent : colors.surfaceLight }]}>
                  <Text style={[s.btnText, { color: isDanger ? '#ffffff' : isMain ? colors.accentText : colors.text }]}>
                    {b.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (c: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: c.modalBg, borderRadius: 16, padding: 22 },
  title: { fontFamily: FONT_DISPLAY_BOLD, fontSize: 18, color: c.text, marginBottom: 8 },
  message: { fontFamily: FONT_BODY_REGULAR, fontSize: 15, lineHeight: 21, color: c.textMuted },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  buttonsStacked: { flexDirection: 'column' },
  btn: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnStacked: { flex: 0 },
  btnText: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 15, textAlign: 'center' },
});
