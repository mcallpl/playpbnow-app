/**
 * A one-time "What's new" note (2026-10-31). Shown once per device per note
 * id, until the user taps SHOW ME or GOT IT. Reusable: give the next feature
 * its own id and text.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { FONT_BODY_BOLD, FONT_BODY_SEMIBOLD, FONT_BODY_REGULAR } from '@/constants/theme';

interface Props {
    id: string;
    title: string;
    body: string;
    onShowMe?: () => void;
}

export function WhatsNewCard({ id, title, body, onShowMe }: Props) {
    const { colors } = useTheme();
    const key = `whats_new_seen_${id}`;
    const [show, setShow] = useState(false);
    useEffect(() => {
        AsyncStorage.getItem(key).then(v => setShow(!v)).catch(() => setShow(false));
    }, [key]);
    if (!show) return null;
    const done = () => { setShow(false); AsyncStorage.setItem(key, '1').catch(() => {}); };
    return (
        <View style={{ marginHorizontal: 16, marginVertical: 8, padding: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent, gap: 6 }}>
            <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 11, letterSpacing: 1, color: colors.accent }}>NEW</Text>
            <Text style={{ fontFamily: FONT_BODY_BOLD, fontSize: 15, color: colors.text }}>{title}</Text>
            <Text style={{ fontFamily: FONT_BODY_REGULAR, fontSize: 13, color: colors.textMuted }}>{body}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {onShowMe && (
                    <TouchableOpacity accessibilityRole="button" onPress={() => { done(); onShowMe(); }}
                        style={{ backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16 }}>
                        <Text style={{ fontFamily: FONT_BODY_SEMIBOLD, fontSize: 12, color: colors.accentText }}>SHOW ME</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity accessibilityRole="button" onPress={done}
                    style={{ backgroundColor: colors.surfaceLight, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16 }}>
                    <Text style={{ fontFamily: FONT_BODY_SEMIBOLD, fontSize: 12, color: colors.text }}>GOT IT</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
