/**
 * NAME THE COURTS (2026-10-31). One window, used from the match screen and
 * from match setup, so naming works the same everywhere.
 *
 * Name the first court and the rest follow (D -> E, F; 34 -> 35, 36) unless
 * they were typed by hand. Any court can be changed on its own. "Back to
 * 1, 2, 3..." is the undo. Nothing is applied until SAVE.
 */
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FONT_BODY_BOLD, FONT_BODY_SEMIBOLD, FONT_DISPLAY_EXTRABOLD } from '@/constants/theme';
import { applyCourtLabelEdit, courtLabelAt, COURT_LABEL_MAX } from '@/utils/courtLabels';

interface Props {
    visible: boolean;
    courtCount: number;
    /** The names in use now (empty = 1, 2, 3...). */
    labels: string[];
    onCancel: () => void;
    /** Called with one name per court (defaults filled in). */
    onSave: (labels: string[]) => void;
}

export function CourtNamesModal({ visible, courtCount, labels, onCancel, onSave }: Props) {
    const { colors } = useTheme();
    const [draft, setDraft] = useState<string[]>([]);
    const [manual, setManual] = useState<boolean[]>([]);

    useEffect(() => {
        if (!visible) return;
        setDraft(Array.from({ length: courtCount }, (_, i) => courtLabelAt(labels, i)));
        setManual(Array.from({ length: courtCount }, () => false));
    }, [visible, courtCount]); // eslint-disable-line react-hooks/exhaustive-deps

    const edit = (i: number, text: string) => {
        // The box shows exactly what was typed; later courts that were not
        // typed by hand follow on from it.
        const r = applyCourtLabelEdit(draft, manual, i, text, courtCount);
        const shown = [...r.labels];
        shown[i] = text.slice(0, COURT_LABEL_MAX + 6);
        setDraft(shown);
        setManual(r.manual);
    };

    const s = styles(colors);
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={s.overlay}><View style={s.content}>
                <Text style={s.title}>NAME THE COURTS</Text>
                <Text style={s.hint}>
                    For this match. Name the first court and the rest follow (D, E, F or 34, 35, 36). Change any court on its own.
                </Text>
                <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                    {draft.map((v, i) => (
                        <View key={i} style={s.row}>
                            <Text style={s.rowLabel}>COURT {i + 1}</Text>
                            <Text style={s.crt}>CRT</Text>
                            <TextInput style={s.input} value={v}
                                onChangeText={(t) => edit(i, t)} selectTextOnFocus
                                autoCapitalize="characters" autoCorrect={false}
                                placeholder={String(i + 1)} placeholderTextColor={colors.inputPlaceholder}
                                accessibilityLabel={`Name for court ${i + 1}`} />
                        </View>
                    ))}
                </ScrollView>
                <TouchableOpacity accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 10 }}
                    onPress={() => {
                        setDraft(Array.from({ length: courtCount }, (_, i) => String(i + 1)));
                        setManual(Array.from({ length: courtCount }, () => false));
                    }}>
                    <Text style={s.reset}>Back to 1, 2, 3...</Text>
                </TouchableOpacity>
                <View style={s.buttons}>
                    <TouchableOpacity onPress={onCancel} style={[s.btn, { backgroundColor: colors.surfaceLight }]}>
                        <Text style={s.btnText}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onSave(Array.from({ length: courtCount }, (_, i) => courtLabelAt(draft, i)))}
                        style={[s.btn, { backgroundColor: colors.accent }]}>
                        <Text style={[s.btnText, { color: colors.accentText }]}>SAVE</Text>
                    </TouchableOpacity>
                </View>
            </View></View>
        </Modal>
    );
}

const styles = (c: any) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: c.modalBg, padding: 24, borderRadius: 16, width: '90%', maxWidth: 520, maxHeight: '90%' },
    title: { fontSize: 18, fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.text, marginBottom: 12, textAlign: 'center' },
    hint: { color: c.textMuted, fontFamily: FONT_BODY_BOLD, fontSize: 12, marginBottom: 12, textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    rowLabel: { color: c.textMuted, fontFamily: FONT_BODY_BOLD, fontSize: 12, width: 72 },
    crt: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: c.textMuted },
    input: { flex: 1, backgroundColor: c.inputBg, padding: 12, borderRadius: 8, fontSize: 14, fontFamily: FONT_BODY_BOLD, borderWidth: 1, borderColor: c.inputBorder, color: c.inputText },
    reset: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 13, color: c.accent },
    buttons: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
    btnText: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 14, color: c.text },
});
