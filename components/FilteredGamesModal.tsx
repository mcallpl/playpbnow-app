import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';
// FIXED: Absolute imports
import { MatchCard } from '@/components/MatchCard';
import { MatchRecord } from '@/hooks/useHeadToHead';

interface FilteredGamesModalProps {
    visible: boolean;
    onClose: () => void;
    games: MatchRecord[];
    title: string;
}

export function FilteredGamesModal({ visible, onClose, games, title }: FilteredGamesModalProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 20 }]}>

                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeBtn}
                        hitSlop={{top:20, bottom:20, left:20, right:20}}
                    >
                        <Ionicons name="close" size={30} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.placeholder} />
                </View>

                <FlatList
                    data={games}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item }) => <MatchCard match={item} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No games found.</Text>}
                />
            </View>
        </Modal>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        backgroundColor: c.surfaceLight
    },
    closeBtn: { padding: 5 },
    title: { color: c.text, fontSize: 18, fontFamily: FONT_DISPLAY_EXTRABOLD, fontStyle: 'italic' },
    placeholder: { width: 40 },
    listContent: { padding: 20, paddingBottom: 60 },
    emptyText: { color: c.textSoft, textAlign: 'center', marginTop: 30, fontSize: 16, fontFamily: FONT_BODY_REGULAR }
});
