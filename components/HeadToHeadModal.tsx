import { FilteredGamesModal } from '@/components/FilteredGamesModal';
import { MatchRecord, RosterItem, useHeadToHead } from '@/hooks/useHeadToHead';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

interface HeadToHeadProps {
    visible: boolean;
    onClose: () => void;
    groupName: string;
    history: MatchRecord[];
    roster: RosterItem[];
    deviceId: string;
    isGlobal: boolean;
}

export default function HeadToHeadModal({
    visible,
    onClose,
    groupName,
    history,
    roster,
    deviceId,
    isGlobal
}: HeadToHeadProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const {
        p1, setP1,
        p2, setP2,
        stats,
        filteredMatches,
        reset,
        getOptionsForP1,
        getOptionsForP2
    } = useHeadToHead(groupName, history, roster, deviceId, isGlobal);

    const [pickingFor, setPickingFor] = useState<'p1'|'p2'|null>(null);
    const [rosterSearch, setRosterSearch] = useState('');
    const [showGamesList, setShowGamesList] = useState(false);

    const handleReset = () => {
        reset();
        setRosterSearch('');
    };

    const getFilteredRoster = () => {
        let data: RosterItem[] = [];
        if (pickingFor === 'p1') {
            data = getOptionsForP1();
        } else {
            data = getOptionsForP2();
        }

        if (rosterSearch) {
            const lower = rosterSearch.toLowerCase();
            data = data.filter(r => r.name.toLowerCase().includes(lower));
        }

        return data.sort((a,b) => a.name.localeCompare(b.name));
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" transparent={false}>
            <View style={[styles.container, { paddingTop: insets.top }]}>

                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <Ionicons name="close" size={32} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>HEAD TO HEAD</Text>
                    <TouchableOpacity onPress={handleReset} style={styles.headerBtn}>
                        <Ionicons name="refresh" size={28} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.subtitle}>
                    DATA SOURCE: {isGlobal ? 'GLOBAL' : 'MY ENTRIES'}
                </Text>

                <View style={styles.selectors}>
                    <TouchableOpacity style={styles.selectorBtn} onPress={() => { setPickingFor('p1'); setRosterSearch(''); }}>
                        <Text style={styles.selectorText}>{p1 ? p1.name : "Select Player 1"}</Text>
                    </TouchableOpacity>
                    <Text style={styles.vsText}>VS</Text>
                    <TouchableOpacity style={styles.selectorBtn} onPress={() => { setPickingFor('p2'); setRosterSearch(''); }}>
                        <Text style={styles.selectorText}>{p2 ? p2.name : "Select Player 2"}</Text>
                    </TouchableOpacity>
                </View>

                {stats && p1 && p2 ? (
                    <View style={styles.resultContainer}>
                        <View style={styles.statRow}>
                            <Text style={[styles.statNum, {color: colors.accent}]}>{stats.p1_wins}</Text>
                            <Text style={styles.statLabel}>WINS</Text>
                            <Text style={[styles.statNum, {color: colors.female}]}>{stats.p2_wins}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => setShowGamesList(true)}
                            disabled={stats.total === 0}
                            style={styles.clickableArea}
                        >
                            <Text style={[styles.totalGames, stats.total > 0 && styles.clickableText]}>
                                {stats.total} Games Played Against Each Other
                            </Text>
                            {stats.total > 0 && <Text style={styles.tapHint}>(Tap to view games)</Text>}
                        </TouchableOpacity>

                        <Text style={styles.diffText}>
                            {stats.diff > 0 ? `${p1.name} leads by ${stats.diff} pts` :
                             stats.diff < 0 ? `${p2.name} leads by ${Math.abs(stats.diff)} pts` :
                             "Points are tied!"}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.instruction}>Select two players to compare history.</Text>
                )}

                {pickingFor && (
                    <View style={[styles.overlay, { paddingTop: insets.top + 60 }]}>
                        <View style={styles.overlayHeader}>
                            <View style={styles.overlayTitleContainer}>
                                <Text style={styles.overlayTitle}>
                                    Select {pickingFor === 'p1' ? 'Player 1' : 'Player 2'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setPickingFor(null)} style={styles.closeOverlayBtn}>
                                <Ionicons name="close" size={30} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchBox}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Type name to filter..."
                                placeholderTextColor={colors.inputPlaceholder}
                                value={rosterSearch}
                                onChangeText={setRosterSearch}
                                autoFocus
                            />
                            {rosterSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setRosterSearch('')} style={styles.clearSearch}>
                                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={getFilteredRoster()}
                            keyExtractor={i => i.id}
                            renderItem={({item}) => (
                                <TouchableOpacity style={styles.rosterRow} onPress={() => {
                                    if(pickingFor === 'p1') setP1(item);
                                    else setP2(item);
                                    setPickingFor(null);
                                    setRosterSearch('');
                                }}>
                                    <Text style={styles.rosterText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>
                                    No players found. (Try clearing the other selection)
                                </Text>
                            }
                        />
                    </View>
                )}

                <FilteredGamesModal
                    visible={showGamesList}
                    onClose={() => setShowGamesList(false)}
                    games={filteredMatches}
                    title={p1 && p2 ? `${p1.name} vs ${p2.name}` : 'Games'}
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
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
        zIndex: 100,
    },
    headerBtn: { padding: 10 },
    title: {
        color: c.text,
        fontSize: 20,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontStyle: 'italic',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10
    },
    subtitle: { color: c.accent, textAlign: 'center', fontFamily: FONT_BODY_BOLD, marginBottom: 20, fontSize: 12 },
    selectors: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 20 },
    selectorBtn: { backgroundColor: c.card, padding: 15, borderRadius: 10, width: '40%', alignItems: 'center' },
    selectorText: { fontFamily: FONT_BODY_BOLD, color: c.text },
    vsText: { color: c.accent, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 24, fontStyle: 'italic' },
    resultContainer: { alignItems: 'center', marginTop: 30 },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 10 },
    statNum: { fontSize: 60, fontFamily: FONT_DISPLAY_EXTRABOLD },
    statLabel: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 12, opacity: 0.5 },
    clickableArea: { padding: 15, alignItems: 'center' },
    totalGames: { color: c.text, fontSize: 16, fontFamily: FONT_BODY_BOLD },
    clickableText: { textDecorationLine: 'underline', color: c.accent },
    tapHint: { color: c.accent, fontSize: 10, marginTop: 4, fontStyle:'italic', fontFamily: FONT_BODY_REGULAR },
    diffText: { color: c.textSoft, fontStyle: 'italic', marginTop: 5, fontFamily: FONT_BODY_REGULAR },
    instruction: { textAlign: 'center', color: c.text, opacity: 0.5, marginTop: 50, fontFamily: FONT_BODY_REGULAR },
    overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: c.modalBg, padding: 20 },
    overlayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    overlayTitleContainer: { flex: 1 },
    overlayTitle: {
        fontSize: 24,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        color: c.text,
        marginRight: 10
    },
    closeOverlayBtn: { padding: 10 },
    searchBox: { flexDirection:'row', alignItems:'center', backgroundColor: c.inputBg, borderRadius: 8, marginBottom: 10 },
    searchInput: { flex:1, padding: 15, fontSize: 16, fontFamily: FONT_BODY_BOLD, color: c.inputText },
    clearSearch: { padding: 15 },
    rosterRow: { padding: 15, borderBottomWidth: 1, borderColor: c.border },
    rosterText: { fontSize: 18, fontFamily: FONT_BODY_BOLD, color: c.text },
    emptyText: { textAlign:'center', marginTop:20, color: c.textMuted, fontFamily: FONT_BODY_REGULAR }
});
