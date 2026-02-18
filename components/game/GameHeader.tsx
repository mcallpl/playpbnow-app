import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface GameHeaderProps {
    groupName: string;
    winningScore: number;  // ← Already a string, not number
    setWinningScore: (val: string) => void;
    loading: boolean;
    isMatchScored: boolean;
    setIsMatchScored: (val: boolean) => void;
    onShuffle: () => void;
    onAddPlayer: () => void;
    onBack: () => void;
}

export function GameHeader({
    groupName,
    winningScore,
    setWinningScore,
    loading,
    isMatchScored,
    setIsMatchScored,
    onShuffle,
    onAddPlayer,
    onBack
}: GameHeaderProps) {
    return (
        <>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    
                    <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
                        {groupName ? groupName.toUpperCase() : "MATCH SETUP"}
                    </Text>
                    
                    <View style={{width: 30}} />
                </View>

                <View style={styles.controlsRow}>
                    <View style={styles.wtsContainer}>
                        <Text style={styles.wtsLabel}>PLAY TO:</Text>
                        <TextInput 
                            style={styles.wtsInput}
                            keyboardType="numeric"
                            value={winningScore.toString()}
                            onChangeText={setWinningScore}
                            maxLength={2}
                        />
                    </View>

                    <View style={styles.headerRightControls}>
                        <TouchableOpacity onPress={onShuffle} style={styles.shuffleBtn} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="shuffle" size={24} color="#fff" />
                            )}
                        </TouchableOpacity>
                        
                        <Switch 
                            value={isMatchScored} 
                            onValueChange={setIsMatchScored}
                            trackColor={{false: '#777', true: '#87ca37'}}
                            thumbColor={'white'} 
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                    </View>
                </View>
            </View>

            <View style={styles.subHeaderAction}>
                <TouchableOpacity onPress={onAddPlayer} style={styles.addPlayerBtn}>
                    <Ionicons name="person-add" size={16} color="white" />
                    <Text style={styles.addPlayerText}>ADD PLAYER</Text>
                </TouchableOpacity>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: { 
        paddingHorizontal: 15, 
        paddingVertical: 10,
        backgroundColor: '#152945', 
        borderBottomWidth: 1, 
        borderColor: 'rgba(255,255,255,0.1)' 
    },
    titleRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 10 
    },
    backButton: { padding: 5 },
    headerTitle: { 
        color: 'white', 
        fontWeight: '900', 
        fontSize: 20, 
        fontStyle: 'italic', 
        textTransform: 'uppercase',
        flex: 1,
        textAlign: 'center' 
    },
    controlsRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    wtsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    wtsLabel: { color: '#87ca37', fontSize: 12, fontWeight: 'bold' },
    wtsInput: { 
        backgroundColor: '#fff', 
        color: '#1b3358', 
        fontWeight: '900', 
        fontSize: 14, 
        paddingVertical: 4, 
        paddingHorizontal: 8, 
        borderRadius: 6, 
        minWidth: 40, 
        textAlign: 'center' 
    },
    headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    shuffleBtn: { padding: 5 },
    subHeaderAction: { alignItems: 'center', marginVertical: 10 },
    addPlayerBtn: { 
        flexDirection: 'row', 
        backgroundColor: '#34495e', 
        padding: 8, 
        paddingHorizontal: 15, 
        borderRadius: 20, 
        alignItems: 'center', 
        gap: 5 
    },
    addPlayerText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});
