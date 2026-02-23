import { BrandedIcon } from '../components/BrandedIcon';
import React, { useMemo } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

export interface UniversalSession {
    group: string;
    id: string;
    timestamp: number;
    label: string;
    device_id?: string | number;
    isYours?: boolean; // <--- NEW: Explicit ownership flag
}

interface SessionSelectModalProps {
    visible: boolean;
    onClose: () => void;
    sessions: UniversalSession[];
    selectedId: string;
    onSelectPodium: (session: UniversalSession | 'all') => void; // Text area click
    onSelectHistory: (session: UniversalSession) => void; // Icon click
    isGlobal: boolean;
    currentDeviceId: string;
}

export function SessionSelectModal({
    visible,
    onClose,
    sessions,
    selectedId,
    onSelectPodium,
    onSelectHistory,
    isGlobal,
    currentDeviceId
}: SessionSelectModalProps) {

    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const renderItem = ({ item }: { item: UniversalSession | string }) => {
        const isAll = typeof item === 'string';
        const label = isAll ? 'ALL TIME' : (item as UniversalSession).label;
        const id = isAll ? 'all' : (item as UniversalSession).id;
        const isSelected = id === selectedId;

        let showPencil = false;

        if (!isAll) {
            // MINE mode = pencil, GLOBAL mode = eye (always)
            showPencil = !isGlobal;
        }

        return (
            <View style={[styles.optionRow, isSelected && styles.optionSelected]}>
                <TouchableOpacity
                    style={styles.textContainer}
                    onPress={() => onSelectPodium(isAll ? 'all' : (item as UniversalSession))}
                >
                    <Text style={[
                        styles.optionText,
                        isSelected && { color: colors.text },
                    ]}>{label}</Text>
                </TouchableOpacity>

                {!isAll && showPencil && (
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => onSelectHistory(item as UniversalSession)}
                    >
                        <BrandedIcon
                            name="edit"
                            size={22}
                            color={isSelected ? colors.text : colors.accent}
                        />
                    </TouchableOpacity>
                )}

                {!isAll && !showPencil && (
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => onSelectHistory(item as UniversalSession)}
                    >
                        <BrandedIcon
                            name="eye"
                            size={22}
                            color={colors.accent}
                        />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
                    <Text style={styles.title}>SELECT SESSION</Text>
                    <FlatList
                        data={['all', ...sessions]}
                        keyExtractor={(item) => (typeof item === 'string' ? 'all' : item.id)}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        style={{ flexGrow: 0, maxHeight: '85%' }}
                    />
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>CLOSE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'center', padding: 20 },
    content: { backgroundColor: c.modalBg, borderRadius: 20, padding: 20, maxHeight: '90%' },
    title: { fontSize: 20, fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.text, marginBottom: 20, textAlign: 'center' },
    optionRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: c.border, paddingVertical: 12 },
    optionSelected: { backgroundColor: c.surface, borderRadius: 10 },
    textContainer: { flex: 1, paddingHorizontal: 15 },
    optionText: { fontSize: 16, fontFamily: FONT_BODY_BOLD, color: c.textMuted, textAlign: 'center' },
    iconBtn: { padding: 10, paddingRight: 15 },
    closeBtn: { marginTop: 15, padding: 15, alignItems: 'center', backgroundColor: c.surfaceLight, borderRadius: 10 },
    closeText: { color: c.textSoft, fontFamily: FONT_BODY_BOLD }
});
