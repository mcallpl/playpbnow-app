import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text, TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
                        isSelected && { color: 'white' },
                        showPencil && !isSelected && { fontWeight: '900', color: '#1b3358' }
                    ]}>{label}</Text>
                </TouchableOpacity>

                {!isAll && showPencil && (
                    <TouchableOpacity 
                        style={styles.iconBtn}
                        onPress={() => onSelectHistory(item as UniversalSession)}
                    >
                        <Ionicons 
                            name="pencil" 
                            size={22} 
                            color={isSelected ? "white" : "#87ca37"} 
                        />
                    </TouchableOpacity>
                )}
                
                {!isAll && !showPencil && (
                    <TouchableOpacity 
                        style={styles.iconBtn}
                        onPress={() => onSelectHistory(item as UniversalSession)}
                    >
                        <Ionicons 
                            name="eye" 
                            size={22} 
                            color="#87ca37"
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

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    content: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '90%' },
    title: { fontSize: 20, fontWeight: '900', color: '#1b3358', marginBottom: 20, textAlign: 'center' },
    optionRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 12 },
    optionSelected: { backgroundColor: '#1b3358', borderRadius: 10 },
    textContainer: { flex: 1, paddingHorizontal: 15 },
    optionText: { fontSize: 16, fontWeight: 'bold', color: '#666', textAlign: 'center' },
    iconBtn: { padding: 10, paddingRight: 15 },
    closeBtn: { marginTop: 15, padding: 15, alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: 10 },
    closeText: { color: '#999', fontWeight: 'bold' }
});