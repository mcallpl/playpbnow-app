import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MatchRecord } from '../hooks/useHeadToHead';

export interface HistoryModalProps {
    visible: boolean;
    onClose: () => void;
    history: MatchRecord[];
    sessionLabel: string;
    isGlobal: boolean;
    deviceId: string;
    onDeleteSession: () => void;
    onSaveMatch: (match: MatchRecord, s1: number, s2: number, names: any) => void;
    onDeleteMatch: (match: MatchRecord) => void;
    canDeleteSession: boolean;
}

export function HistoryModal({ 
    visible, 
    onClose, 
    history, 
    sessionLabel, 
    isGlobal, 
    deviceId,
    onDeleteSession,
    onSaveMatch,
    onDeleteMatch,
    canDeleteSession
}: HistoryModalProps) {

    const insets = useSafeAreaInsets();

    const [editTargetId, setEditTargetId] = useState<string | null>(null);
    const [editOriginalMatch, setEditOriginalMatch] = useState<MatchRecord | null>(null);
    
    const [editData, setEditData] = useState({
        s1: '', s2: '', 
        p1_name: '', p2_name: '', 
        p3_name: '', p4_name: ''
    });

    const startEditing = (match: any) => {
        setEditTargetId(match._uniqueId);
        setEditOriginalMatch(match);
        
        setEditData({ 
            s1: match.s1.toString(), 
            s2: match.s2.toString(),
            p1_name: match.p1_name || '',
            p2_name: match.p2_name || '',
            p3_name: match.p3_name || '',
            p4_name: match.p4_name || ''
        });
    };

    const saveEdit = () => {
        if (!editOriginalMatch) return;
        
        if (!editOriginalMatch.group) {
            Alert.alert("Error", "Cannot save. Missing group information.");
            return;
        }

        const s1Val = parseInt(editData.s1);
        const s2Val = parseInt(editData.s2);
        if (isNaN(s1Val) || isNaN(s2Val)) { 
            Alert.alert("Error", "Invalid scores."); 
            return; 
        }
        onSaveMatch(editOriginalMatch, s1Val, s2Val, editData);
        setEditTargetId(null);
        setEditOriginalMatch(null);
    };

    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // ✅ FIXED: Use stored round_num and court_num from database
    const processedSections = useMemo(() => {
        if (!history || history.length === 0) return [];

        // Simply label each match with its stored round/court numbers
        const labeledMatches = history.map((m: any, index) => {
            const roundNum = m.round_num || 1;
            const courtNum = m.court_num || 1;
            const label = `Round ${roundNum} - ${getOrdinal(courtNum)} Court`;
            const uniqueId = `${m.id || m.timestamp}-${index}`;
            return { ...m, derivedLabel: label, _uniqueId: uniqueId };
        });

        return [{
            title: sessionLabel,
            data: labeledMatches
        }];
    }, [history, sessionLabel]);

    const renderHistoryCard = ({ item }: { item: any }) => {
        const isEditingThisRow = editTargetId === item._uniqueId;
        const isT1Win = item.s1 > item.s2;
        
        // GLOBAL mode is always read-only, MINE mode allows editing
        const canEdit = !isGlobal;
        const displayLabel = item.derivedLabel || 'Game';

        if (isEditingThisRow) {
            return (
                <View style={[styles.visualCard, { borderColor: '#87ca37', borderWidth: 2 }]}>
                    <View style={styles.visualHeader}>
                        <Text style={styles.visualLabel}>{displayLabel}</Text>
                        <View style={{flexDirection:'row', gap:15}}>
                            <TouchableOpacity onPress={saveEdit}><Ionicons name="checkmark-circle" size={28} color="#87ca37" /></TouchableOpacity>
                            <TouchableOpacity onPress={() => { setEditTargetId(null); setEditOriginalMatch(null); }}><Ionicons name="close-circle" size={28} color="#ccc" /></TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.teamBlock, styles.teamBlockBlue]}>
                        <View style={styles.teamNames}>
                            <TextInput style={styles.editNameInput} value={editData.p1_name} onChangeText={(t) => setEditData({...editData, p1_name: t})} placeholder="Player 1" placeholderTextColor="#666"/>
                            <TextInput style={styles.editNameInput} value={editData.p2_name} onChangeText={(t) => setEditData({...editData, p2_name: t})} placeholder="Player 2" placeholderTextColor="#666"/>
                        </View>
                        <TextInput style={styles.editInput} value={editData.s1} onChangeText={(t) => setEditData({...editData, s1: t})} keyboardType="numeric" maxLength={2} selectTextOnFocus />
                    </View>

                    <View style={[styles.teamBlock, styles.teamBlockRed]}>
                        <View style={styles.teamNames}>
                            <TextInput style={styles.editNameInput} value={editData.p3_name} onChangeText={(t) => setEditData({...editData, p3_name: t})} placeholder="Player 3" placeholderTextColor="#666"/>
                            <TextInput style={styles.editNameInput} value={editData.p4_name} onChangeText={(t) => setEditData({...editData, p4_name: t})} placeholder="Player 4" placeholderTextColor="#666"/>
                        </View>
                        <TextInput style={styles.editInput} value={editData.s2} onChangeText={(t) => setEditData({...editData, s2: t})} keyboardType="numeric" maxLength={2} selectTextOnFocus />
                    </View>
                </View>
            );
        } else {
            return (
                <View style={styles.visualCard}>
                    <View style={styles.visualHeader}>
                        <Text style={styles.visualLabel}>{displayLabel}</Text>
                        <View style={{flexDirection:'row', gap:15}}>
                        {canEdit && (
                            <>
                                <TouchableOpacity onPress={() => startEditing(item)}><Ionicons name="pencil" size={18} color="#aaa" /></TouchableOpacity>
                                <TouchableOpacity onPress={() => onDeleteMatch(item)}><Ionicons name="trash" size={18} color="#ff6961" /></TouchableOpacity>
                            </>
                        )}
                        </View>
                    </View>

                    <View style={[styles.teamBlock, styles.teamBlockBlue]}>
                        <View style={styles.teamNames}>
                            <Text style={styles.teamText} numberOfLines={1}>{item.p1_name}</Text>
                            <Text style={styles.teamText} numberOfLines={1}>{item.p2_name}</Text>
                        </View>
                        <Text style={[styles.teamScore, isT1Win ? styles.scoreWin : styles.scoreLose]}>{item.s1}</Text>
                    </View>

                    <View style={[styles.teamBlock, styles.teamBlockRed]}>
                        <View style={styles.teamNames}>
                            <Text style={styles.teamText} numberOfLines={1}>{item.p3_name}</Text>
                            <Text style={styles.teamText} numberOfLines={1}>{item.p4_name}</Text>
                        </View>
                        <Text style={[styles.teamScore, !isT1Win ? styles.scoreWin : styles.scoreLose]}>{item.s2}</Text>
                    </View>
                </View>
            );
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen">
            <View style={styles.container}>
                <View style={[styles.compHeader, { paddingTop: insets.top + 40 }]}>
                    <TouchableOpacity 
                        onPress={onClose} 
                        hitSlop={{top:40, bottom:40, left:40, right:40}}
                        style={styles.closeBtn}
                    >
                        <Ionicons name="close" size={36} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.compTitle}>GAME HISTORY</Text>
                    <View style={{width:36}} />
                </View>

                <View style={styles.sessionRow}>
                    {canDeleteSession && (
                        <TouchableOpacity onPress={onDeleteSession} style={styles.deleteSessionBtnFull}>
                            <Ionicons name="trash-bin" size={20} color="white" style={{marginRight:8}} />
                            <Text style={styles.deleteSessionText}>DELETE ENTIRE MATCH</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.compSubtitle}>{sessionLabel}</Text>

                <SectionList
                    sections={processedSections}
                    keyExtractor={(item) => item._uniqueId}
                    renderItem={renderHistoryCard}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    stickySectionHeadersEnabled={false}
                    ListEmptyComponent={<Text style={styles.empty}>No matches found.</Text>}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1b3358' },
    compHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingBottom: 20, 
        alignItems: 'center', 
        backgroundColor: '#152945',
        zIndex: 10
    },
    closeBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    compTitle: { color: 'white', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
    compSubtitle: { color: '#87ca37', textAlign: 'center', fontWeight: 'bold', marginVertical: 10, fontSize: 14 },
    sessionRow: { paddingHorizontal: 20, marginTop: 10 },
    deleteSessionBtnFull: { backgroundColor: '#ff6961', padding: 12, borderRadius: 8, alignItems: 'center', flexDirection:'row', justifyContent:'center' },
    deleteSessionText: { color:'white', fontWeight:'900' },
    visualCard: { backgroundColor: '#2c3e50', padding: 10, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#34495e' },
    visualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    visualLabel: { color: '#bbb', fontWeight: 'bold', fontSize: 12 },
    teamBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 4 },
    teamBlockBlue: { backgroundColor: 'rgba(52, 152, 219, 0.15)', borderLeftWidth: 4, borderLeftColor: '#3498db' },
    teamBlockRed: { backgroundColor: 'rgba(231, 76, 60, 0.15)', borderLeftWidth: 4, borderLeftColor: '#e74c3c' },
    teamNames: { flex: 1 },
    teamText: { color: '#eee', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
    teamScore: { fontSize: 24, fontWeight: '900' },
    scoreWin: { color: '#87ca37' },
    scoreLose: { color: '#999', opacity: 0.7 },
    editInput: { backgroundColor: 'white', width: 50, height: 40, borderRadius: 5, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#1b3358' },
    editNameInput: { backgroundColor: 'white', color:'#1b3358', fontWeight:'bold', fontSize:14, padding:4, borderRadius: 4, minWidth:100, marginBottom:4 },
    empty: { color: 'white', textAlign: 'center', marginTop: 50, opacity: 0.5 }
});