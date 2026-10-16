/**
 * Import a list of players: paste names (one per line, with or without M/F),
 * or on the web pick a .xlsx / .csv / .txt file. The organizer reviews the
 * list, taps Male or Female for anyone the list did not say, and confirms.
 *
 * This is a plain View, not a Modal, so the Groups tab can show it inside its
 * existing New Group modal and the group screen can wrap it in its own.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InputAccessoryView, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BrandedIcon } from './BrandedIcon';
import { useTheme } from '../context/ThemeContext';
import {
  ThemeColors,
  FONT_DISPLAY_EXTRABOLD,
  FONT_BODY_REGULAR,
  FONT_BODY_SEMIBOLD,
  FONT_BODY_BOLD,
} from '../constants/theme';
import { ImportGender, ImportRow, parseGrid, parsePlayerText, shortNames } from '../utils/playerImport';
import { readSpreadsheetFile } from '../utils/readSpreadsheetFile';

const MAX_ROWS = 200;
const ACCESSORY_ID = 'importPlayersBar';

interface Props {
  /** Names already in the target group; those rows are skipped, not duplicated. */
  existingNames?: string[];
  /** Button label for the final step, given the number of players. */
  confirmLabel: (count: number) => string;
  onConfirm: (rows: { name: string; gender: ImportGender }[]) => void;
  onCancel: () => void;
  /** Rows to start the review with (reopening an import that was already set up). */
  initialRows?: ImportRow[];
  busy?: boolean;
  busyText?: string;
}

export function ImportPlayersPanel({ existingNames = [], confirmLabel, onConfirm, onCancel, initialRows, busy, busyText }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [stage, setStage] = useState<'input' | 'review'>(initialRows && initialRows.length ? 'review' : 'input');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ImportRow[]>(initialRows || []);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState('');
  // "Chip M" (first name + last initial) is the default; "Chip McAllister" keeps the full name.
  const [useShort, setUseShort] = useState(true);
  const fileRef = useRef<any>(null);
  // While the keyboard is up the paste box gets shorter and the panel scrolls,
  // so NEXT is never trapped under the keyboard. (On a phone, Return in this
  // box only starts a new line, so it can never be the way forward.)
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const shorts = useMemo(() => shortNames(rows.map(r => r.name), existingNames), [rows, existingNames]);
  const finalName = (i: number) => (useShort ? shorts[i] : rows[i].name);

  const takeResult = (parsed: { rows: ImportRow[]; duplicates: string[] }) => {
    // Skipped only when the name as pasted is already in the group. A full
    // name whose SHORT form is taken ("Greg Stone" vs an existing "Greg S")
    // may be a different person, so it is kept and lengthened ("Greg St").
    const have = new Set(existingNames.map(n => n.trim().toLowerCase()));
    const fresh: ImportRow[] = [];
    const already: ImportRow[] = [];
    parsed.rows.forEach(r => (have.has(r.name.toLowerCase()) ? already : fresh).push(r));
    const plain = shortNames(fresh.map(r => r.name));
    const sn = shortNames(fresh.map(r => r.name), existingNames);
    const lengthened = fresh.filter((r, i) => sn[i] !== plain[i] && have.has(plain[i].toLowerCase()));
    const kept = fresh.slice(0, MAX_ROWS);
    const n: string[] = [];
    if (already.length) n.push(`Already in this group, skipped: ${already.map(r => r.name).join(', ')}`);
    if (parsed.duplicates.length) n.push(`Listed twice, kept once: ${parsed.duplicates.join(', ')}`);
    lengthened.forEach((r) => {
      const i = fresh.indexOf(r);
      n.push(`${plain[i]} is already in this group, so ${r.name} will be added as ${sn[i]}. Remove ${r.name} below if that is the same person.`);
    });
    if (fresh.length > MAX_ROWS) n.push(`Only the first ${MAX_ROWS} names were kept.`);
    if (!kept.length) {
      setError(already.length ? 'Everyone on that list is already in this group.' : 'No names found. Put one player on each line.');
      return;
    }
    setError('');
    setRows(kept);
    setNotes(n);
    setStage('review');
  };

  const readPasted = () => { Keyboard.dismiss(); takeResult(parsePlayerText(text)); };

  const onFilePicked = async (e: any) => {
    const file: File | undefined = e?.target?.files?.[0];
    if (e?.target) e.target.value = '';
    if (!file) return;
    try {
      const content = await readSpreadsheetFile(file);
      takeResult(content.kind === 'grid' ? parseGrid(content.grid) : parsePlayerText(content.text));
    } catch (err: any) {
      setError(err?.message || "We couldn't read that file.");
    }
  };

  const setGender = (i: number, g: ImportGender) => setRows(prev => prev.map((r, j) => (j === i ? { ...r, gender: g } : r)));
  const removeRow = (i: number) => setRows(prev => prev.filter((_, j) => j !== i));
  const fillBlanks = (g: ImportGender) => setRows(prev => prev.map(r => (r.gender ? r : { ...r, gender: g })));

  const missing = rows.filter(r => !r.gender).length;
  const males = rows.filter(r => r.gender === 'male').length;
  const females = rows.filter(r => r.gender === 'female').length;
  const blockReason = busy ? '' : rows.length === 0 ? 'Add at least one player.' : missing > 0 ? `${missing} player${missing === 1 ? ' still needs' : 's still need'} Male or Female.` : '';

  if (stage === 'input') {
    return (
      <View style={s.shell}>
        {/* Pinned above the scrolling part, so a small screen can't scroll it away. */}
        {keyboardUp && (
          <View style={s.typingBar}>
            <TouchableOpacity style={s.typingDone} onPress={() => Keyboard.dismiss()}>
              <Text style={s.typingDoneText}>DONE TYPING</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.typingNext, !text.trim() && { opacity: 0.5 }]} onPress={readPasted} disabled={!text.trim()}>
              <Text style={s.goText}>NEXT</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView style={s.shell} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!keyboardUp && <Text style={s.title}>IMPORT PLAYERS</Text>}
        {!keyboardUp && <Text style={s.help}>
          Paste your list with one player on each line. To include gender, put it after a comma: Jane Smith, F. You can also copy the Name and Gender columns straight out of a spreadsheet and paste them here.
        </Text>}
        <TextInput
          style={[s.paste, keyboardUp && s.pasteTyping]}
          inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
          multiline
          value={text}
          onChangeText={t => { setText(t); if (error) setError(''); }}
          placeholder={'Jane Smith, F\nBob Jones, M\nMaria Lopez'}
          placeholderTextColor={colors.inputPlaceholder}
          autoCapitalize="words"
          autoCorrect={false}
          textAlignVertical="top"
        />
        {Platform.OS === 'web' && (
          <>
            {React.createElement('input', {
              ref: fileRef,
              type: 'file',
              accept: '.xlsx,.csv,.txt,.tsv,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              style: { display: 'none' },
              onChange: onFilePicked,
            })}
            <TouchableOpacity style={s.secondaryBtn} onPress={() => fileRef.current?.click()}>
              <BrandedIcon name="document" size={18} color={colors.text} />
              <Text style={s.secondaryBtnText}>CHOOSE A SPREADSHEET FILE</Text>
            </TouchableOpacity>
            <Text style={s.fine}>Excel (.xlsx), CSV or a text file. The first sheet is used.</Text>
          </>
        )}
        {!!error && <Text style={s.error}>{error}</Text>}
        <View style={s.buttons}>
          <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={onCancel}>
            <Text style={s.cancelText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.goBtn, !text.trim() && { opacity: 0.5 }]} onPress={readPasted} disabled={!text.trim()}>
            <Text style={s.goText}>NEXT</Text>
          </TouchableOpacity>
        </View>
        {!text.trim() && <Text style={s.why}>Paste a list{Platform.OS === 'web' ? ' or choose a file' : ''} to continue.</Text>}
        </ScrollView>
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={ACCESSORY_ID}>
            <View style={s.accessoryBar}>
              <TouchableOpacity style={s.accessoryBtn} onPress={() => Keyboard.dismiss()}>
                <Text style={s.accessoryDone}>Done</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={s.accessoryBtn} onPress={readPasted} disabled={!text.trim()}>
                <Text style={[s.accessoryNext, !text.trim() && { opacity: 0.4 }]}>Next</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={s.title}>CHECK YOUR LIST</Text>
      <Text style={s.help}>
        {rows.length} player{rows.length === 1 ? '' : 's'} · {males} Male · {females} Female{missing ? ` · ${missing} not set` : ''}
      </Text>
      <View style={s.fillRow}>
        <Text style={s.fillLabel}>Names</Text>
        <TouchableOpacity style={[s.fillBtn, { borderColor: colors.accent }, useShort && { backgroundColor: colors.accent }]} onPress={() => setUseShort(true)}>
          <Text style={[s.fillBtnText, { color: useShort ? colors.accentText : colors.accent }]}>Chip M</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.fillBtn, { borderColor: colors.accent }, !useShort && { backgroundColor: colors.accent }]} onPress={() => setUseShort(false)}>
          <Text style={[s.fillBtnText, { color: !useShort ? colors.accentText : colors.accent }]}>Chip McAllister</Text>
        </TouchableOpacity>
      </View>
      {missing > 0 && (
        <View style={s.fillRow}>
          <Text style={s.fillLabel}>Set everyone not set to</Text>
          <TouchableOpacity style={[s.fillBtn, { borderColor: colors.male }]} onPress={() => fillBlanks('male')}>
            <Text style={[s.fillBtnText, { color: colors.male }]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.fillBtn, { borderColor: colors.female }]} onPress={() => fillBlanks('female')}>
            <Text style={[s.fillBtnText, { color: colors.female }]}>Female</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView style={s.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {rows.map((r, i) => (
          <View key={r.name + i} style={[s.row, !r.gender && s.rowMissing]}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowName} numberOfLines={1}>{finalName(i)}</Text>
              {useShort && shorts[i] !== r.name && <Text style={s.rowFull} numberOfLines={1}>{r.name}</Text>}
            </View>
            <TouchableOpacity
              style={[s.gBtn, r.gender === 'male' && { backgroundColor: colors.male, borderColor: colors.male }]}
              onPress={() => setGender(i, 'male')}
              accessibilityLabel={`${r.name} is male`}
            >
              <Text style={[s.gText, r.gender === 'male' && s.gTextOn]}>M</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.gBtn, r.gender === 'female' && { backgroundColor: colors.female, borderColor: colors.female }]}
              onPress={() => setGender(i, 'female')}
              accessibilityLabel={`${r.name} is female`}
            >
              <Text style={[s.gText, r.gender === 'female' && s.gTextOn]}>F</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.removeBtn} onPress={() => removeRow(i)} accessibilityLabel={`Remove ${r.name}`}>
              <BrandedIcon name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {notes.map(n => <Text key={n} style={s.fine}>{n}</Text>)}
      <View style={s.buttons}>
        <TouchableOpacity style={[s.btn, s.cancelBtn]} onPress={() => setStage('input')} disabled={busy}>
          <Text style={s.cancelText}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, s.goBtn, (!!blockReason || busy) && { opacity: 0.5 }]}
          onPress={() => onConfirm(rows.map((r, i) => ({ name: finalName(i), gender: r.gender as ImportGender })))}
          disabled={!!blockReason || busy}
        >
          {busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={s.goText}>{confirmLabel(rows.length)}</Text>}
        </TouchableOpacity>
      </View>
      {busy && !!busyText && <Text style={s.fine}>{busyText}</Text>}
      {!!blockReason && <Text style={s.why}>{blockReason}</Text>}
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  title: { fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 20, color: c.text, marginBottom: 6, textAlign: 'center' },
  help: { fontFamily: FONT_BODY_REGULAR, fontSize: 13, color: c.textSoft, lineHeight: 19, marginBottom: 12, textAlign: 'center' },
  shell: { flexShrink: 1, flexGrow: 0 },
  pasteTyping: { minHeight: 110, maxHeight: 150 },
  typingBar: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typingDone: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder },
  typingDoneText: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: c.text },
  typingNext: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: c.accent },
  accessoryBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#d1d4da', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#a3a7ae' },
  accessoryBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  accessoryDone: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 16, color: '#007aff' },
  accessoryNext: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: '#007aff' },
  paste: {
    minHeight: 160, maxHeight: 260, borderRadius: 12, padding: 12, backgroundColor: c.inputBg,
    borderWidth: 1, borderColor: c.inputBorder, color: c.text, fontFamily: FONT_BODY_REGULAR, fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg,
  },
  secondaryBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: c.text },
  fine: { fontFamily: FONT_BODY_REGULAR, fontSize: 12, color: c.textMuted, marginTop: 8, textAlign: 'center' },
  error: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 13, color: c.danger, marginTop: 10, textAlign: 'center' },
  why: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 12, color: c.textMuted, marginTop: 8, textAlign: 'right' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder },
  cancelText: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: c.textMuted },
  goBtn: { backgroundColor: c.accent },
  goText: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: c.accentText },
  fillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  fillLabel: { fontFamily: FONT_BODY_REGULAR, fontSize: 13, color: c.textSoft },
  fillBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  fillBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 13 },
  list: { maxHeight: 320 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 10, marginBottom: 6, backgroundColor: c.inputBg, borderWidth: 1, borderColor: 'transparent',
  },
  rowMissing: { borderColor: c.danger },
  rowName: { fontFamily: FONT_BODY_SEMIBOLD, fontSize: 15, color: c.text },
  rowFull: { fontFamily: FONT_BODY_REGULAR, fontSize: 11, color: c.textMuted, marginTop: 1 },
  gBtn: { width: 36, height: 32, borderRadius: 8, borderWidth: 1, borderColor: c.inputBorder, alignItems: 'center', justifyContent: 'center' },
  gText: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: c.textMuted },
  gTextOn: { color: '#ffffff' },
  removeBtn: { padding: 6 },
});
