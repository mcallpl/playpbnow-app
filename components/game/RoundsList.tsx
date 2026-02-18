import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Player } from '../../hooks/useGameLogic';

interface RoundsListProps {
    schedule: any[];
    scores: any;
    inputRefs: any;
    flatListRef: any;
    isMatchScored: boolean;
    swapSource: any;
    editingPlayer: any;
    partnerCounts: any;
    handleScoreChange: (rIdx: number, gIdx: number, team: "t1" | "t2", val: string) => void;
    handlePlayerTap: (r: number, g: number, t: number, p: number) => void;
    handlePlayerNameChange: (r: number, g: number, t: number, p: number, name: string) => void;
    setSwapSource: (val: any) => void;
    setEditingPlayer: (val: any) => void;
}

export function RoundsList(props: RoundsListProps) {
    const {
        schedule, scores, inputRefs, flatListRef, isMatchScored,
        swapSource, editingPlayer, partnerCounts,
        handleScoreChange, handlePlayerTap, handlePlayerNameChange,
        setSwapSource, setEditingPlayer
    } = props;

    const renderPlayerBox = (
        player: Player | undefined, 
        rIdx: number, 
        gIdx: number, 
        tIdx: number, 
        pIdx: number, 
        isTeamConflict: boolean
    ) => {
        if (!player) return <View style={styles.emptyBox} />;

        const genderStr = (player.gender || '').toLowerCase();
        const isFemale = genderStr.startsWith('f');
        const isSelected = swapSource?.r === rIdx && swapSource?.g === gIdx && 
                          swapSource?.t === tIdx && swapSource?.p === pIdx;
        const isEditing = editingPlayer?.r === rIdx && editingPlayer?.g === gIdx && 
                         editingPlayer?.t === tIdx && editingPlayer?.p === pIdx;

        let bg = isFemale ? '#ffc0cb' : '#add8e6';
        let txt = '#1b3358';

        if (isTeamConflict) { bg = '#ffa500'; txt = 'white'; }
        if (isSelected) { bg = '#ffff00'; txt = 'black'; }

        return (
            <TouchableOpacity
                style={[styles.playerBox, { backgroundColor: bg }, isSelected && styles.selectedBox]}
                onPress={() => {
                    if (isEditing) return;
                    handlePlayerTap(rIdx, gIdx, tIdx, pIdx);
                }}
                onLongPress={() => {
                    setSwapSource(null);
                    setEditingPlayer({ r: rIdx, g: gIdx, t: tIdx, p: pIdx });
                }}
                activeOpacity={0.7}
            >
                {isEditing ? (
                    <TextInput
                        style={[styles.pText, { color: txt, width: '100%', textAlign: 'center', padding: 2 }]}
                        value={player.first_name}
                        onChangeText={(name) => handlePlayerNameChange(rIdx, gIdx, tIdx, pIdx, name)}
                        onBlur={() => setEditingPlayer(null)}
                        autoFocus
                        selectTextOnFocus
                    />
                ) : (
                    <Text style={[styles.pText, { color: txt }]} numberOfLines={1}>
                        {player.first_name}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    const renderGame = (game: any, rIdx: number, gIdx: number) => {
        let t1Conflict = false;
        if (game.team1.length === 2) {
            const key = [game.team1[0].id, game.team1[1].id].sort().join('-');
            if ((partnerCounts[key] || 0) > 1) t1Conflict = true;
        }

        let t2Conflict = false;
        if (game.team2.length === 2) {
            const key = [game.team2[0].id, game.team2[1].id].sort().join('-');
            if ((partnerCounts[key] || 0) > 1) t2Conflict = true;
        }

        return (
            <View key={gIdx} style={styles.gameRow}>
                {isMatchScored && (
                    <View style={styles.sideScoreContainer}>
                        <TextInput
                            ref={(el) => { inputRefs.current[`${rIdx}_${gIdx}_t1`] = el as TextInput | null; }}
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="-"
                            value={scores[`${rIdx}_${gIdx}_t1`] || ''}
                            onChangeText={(t) => handleScoreChange(rIdx, gIdx, 't1', t)}
                            returnKeyType="next"
                        />
                    </View>
                )}

                <View style={styles.teamWrapper}>
                    <View style={styles.teamContainer}>
                        {renderPlayerBox(game.team1[0], rIdx, gIdx, 1, 0, t1Conflict)}
                        {renderPlayerBox(game.team1[1], rIdx, gIdx, 1, 1, t1Conflict)}
                    </View>
                </View>

                <View style={styles.centerVS}>
                    <Text style={styles.vsText}>VS</Text>
                    <Text style={styles.crtText}>CRT {gIdx + 1}</Text>
                </View>

                <View style={styles.teamWrapper}>
                    <View style={styles.teamContainer}>
                        {renderPlayerBox(game.team2[0], rIdx, gIdx, 2, 0, t2Conflict)}
                        {renderPlayerBox(game.team2[1], rIdx, gIdx, 2, 1, t2Conflict)}
                    </View>
                </View>

                {isMatchScored && (
                    <View style={styles.sideScoreContainer}>
                        <TextInput
                            ref={(el) => { inputRefs.current[`${rIdx}_${gIdx}_t2`] = el as TextInput | null; }}
                            style={styles.scoreInput}
                            keyboardType="numeric"
                            placeholder="-"
                            value={scores[`${rIdx}_${gIdx}_t2`] || ''}
                            onChangeText={(t) => handleScoreChange(rIdx, gIdx, 't2', t)}
                            returnKeyType="next"
                        />
                    </View>
                )}
            </View>
        );
    };

    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return (
        <FlatList
            ref={flatListRef}
            data={schedule}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 100}}>
                    <Text style={{color:'white', fontWeight:'bold', fontSize:18}}>No Matches Generated</Text>
                    <Text style={{color:'#ccc', marginTop:10}}>Try changing the setup or shuffling.</Text>
                </View>
            }
            renderItem={({ item, index }) => (
                <View style={styles.roundBlock}>
                    <View style={styles.roundHeader}>
                        <Text style={styles.roundTitle}>
                            ROUND {index + 1} ({item.type === 'gender' ? 'SAME GENDER' : (item.type === 'mixed' ? 'MIXED DOUBLES' : 'MIXER')})
                        </Text>
                    </View>
                    <View style={styles.separator} />
                    {item.games.map((game: any, gIdx: number) => renderGame(game, index, gIdx))}
                    
                    {item.byes && item.byes.length > 0 && (
                        <View style={styles.byeRow}>
                            <Text style={styles.byeLabel}>BYES:</Text>
                            {item.byes.map((p: { id: string; first_name: string }) => (
                                <Text key={p.id} style={styles.byeName}>{p.first_name} </Text>
                            ))}
                        </View>
                    )}
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    listContent: { padding: 15, paddingBottom: 120 },
    roundBlock: { marginBottom: 25, backgroundColor: 'white', borderRadius: 15, padding: 15 },
    roundHeader: { marginBottom: 10 },
    roundTitle: { color: '#1b3358', fontWeight: 'bold', fontSize: 16, opacity: 0.7 },
    separator: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
    gameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, height: 110 },
    sideScoreContainer: { width: 50, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    teamWrapper: { flex: 1, height: '100%', borderColor: '#eee', borderWidth: 1, borderRadius: 8, padding: 2, marginHorizontal: 2 },
    teamContainer: { flex: 1, flexDirection: 'column', justifyContent: 'space-between', gap: 2 },
    centerVS: { width: 40, justifyContent: 'center', alignItems: 'center' },
    playerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
    selectedBox: { borderWidth: 3, borderColor: '#1b3358' },
    emptyBox: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 6 },
    pText: { fontWeight: '700', fontSize: 16 },
    vsText: { color: '#ccc', fontWeight: '900', fontSize: 18 },
    crtText: { fontWeight: 'bold', color: '#1b3358', opacity: 0.4, fontSize: 10, marginTop: 4 },
    scoreInput: { 
        width: 45, 
        height: 45, 
        backgroundColor: '#f0f2f5', 
        borderRadius: 8, 
        textAlign: 'center', 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: '#1b3358', 
        borderWidth: 1, 
        borderColor: '#ddd', 
        elevation: 2 
    },
    byeRow: { 
        flexDirection: 'row', 
        marginTop: 15, 
        alignItems: 'center', 
        gap: 5, 
        paddingTop: 10, 
        borderTopWidth: 1, 
        borderColor: '#eee' 
    },
    byeLabel: { color: '#1b3358', opacity: 0.7, fontSize: 12, fontWeight: 'bold' },
    byeName: { color: '#1b3358', fontSize: 12, fontWeight: 'bold' }
});
