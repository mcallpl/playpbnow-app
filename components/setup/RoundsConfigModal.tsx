import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RoundConfig } from '../../hooks/useSetupState';

interface RoundsConfigModalProps {
    visible: boolean;
    onClose: () => void;
    roundsConfig: RoundConfig[];
    onAddRound: () => void;
    onRemoveRound: () => void;
    onUpdateRoundType: (index: number, type: 'mixed' | 'gender' | 'mixer') => void;
    onGenerate: () => void;
}

export function RoundsConfigModal({
    visible,
    onClose,
    roundsConfig,
    onAddRound,
    onRemoveRound,
    onUpdateRoundType,
    onGenerate
}: RoundsConfigModalProps) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.title}>CONFIGURE ROUNDS</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content}>
                    <Text style={styles.infoText}>
                        Configure the type for each round. Same-gender rounds pair males with males and females with females.
                    </Text>

                    {roundsConfig.map((round, index) => (
                        <View key={index} style={styles.roundRow}>
                            <Text style={styles.roundLabel}>Round {index + 1}</Text>
                            <View style={styles.typeButtons}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, round.type === 'mixed' && styles.typeBtnActive]}
                                    onPress={() => onUpdateRoundType(index, 'mixed')}
                                >
                                    <Text style={[styles.typeBtnText, round.type === 'mixed' && styles.typeBtnTextActive]}>
                                        MIXED
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[styles.typeBtn, round.type === 'gender' && styles.typeBtnActive]}
                                    onPress={() => onUpdateRoundType(index, 'gender')}
                                >
                                    <Text style={[styles.typeBtnText, round.type === 'gender' && styles.typeBtnTextActive]}>
                                        SAME GENDER
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={[styles.typeBtn, round.type === 'mixer' && styles.typeBtnActive]}
                                    onPress={() => onUpdateRoundType(index, 'mixer')}
                                >
                                    <Text style={[styles.typeBtnText, round.type === 'mixer' && styles.typeBtnTextActive]}>
                                        MIXER
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    <View style={styles.roundControls}>
                        <TouchableOpacity style={styles.roundBtn} onPress={onAddRound}>
                            <Ionicons name="add-circle-outline" size={24} color="#87ca37" />
                            <Text style={styles.roundBtnText}>Add Round</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.roundBtn, roundsConfig.length <= 1 && styles.disabled]} 
                            onPress={onRemoveRound}
                            disabled={roundsConfig.length <= 1}
                        >
                            <Ionicons name="remove-circle-outline" size={24} color="#d32f2f" />
                            <Text style={styles.roundBtnText}>Remove Round</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.generateBtn} onPress={onGenerate}>
                        <Text style={styles.generateBtnText}>GENERATE SCHEDULE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b3358'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#152945',
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    closeBtn: {
        padding: 5
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic'
    },
    content: {
        flex: 1,
        padding: 20
    },
    infoText: {
        color: '#ccc',
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20
    },
    roundRow: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15
    },
    roundLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1b3358',
        marginBottom: 10
    },
    typeButtons: {
        flexDirection: 'row',
        gap: 8
    },
    typeBtn: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#f0f2f5',
        alignItems: 'center'
    },
    typeBtnActive: {
        backgroundColor: '#87ca37'
    },
    typeBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666'
    },
    typeBtnTextActive: {
        color: 'white'
    },
    roundControls: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20
    },
    roundBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 10,
        gap: 8
    },
    disabled: {
        opacity: 0.3
    },
    roundBtnText: {
        color: 'white',
        fontWeight: 'bold'
    },
    footer: {
        padding: 20,
        backgroundColor: '#152945',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    generateBtn: {
        backgroundColor: '#87ca37',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center'
    },
    generateBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5
    }
});
