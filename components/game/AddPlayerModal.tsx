import React from 'react';
import { 
    ActivityIndicator,
    FlatList,
    Modal, 
    StyleSheet, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View 
} from 'react-native';

interface AddPlayerModalProps {
    visible: boolean;
    onClose: () => void;
    newPlayerName: string;
    setNewPlayerName: (val: string) => void;
    searchResults: any[];
    isSearching: boolean;
    onAddPlayer: (existingPlayer?: any) => void;
}

export function AddPlayerModal({
    visible,
    onClose,
    newPlayerName,
    setNewPlayerName,
    searchResults,
    isSearching,
    onAddPlayer
}: AddPlayerModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add Player</Text>
                    <TextInput 
                        style={styles.modalInput} 
                        placeholder="Type name to search..." 
                        value={newPlayerName} 
                        onChangeText={setNewPlayerName} 
                        autoFocus
                    />
                    
                    {isSearching && <ActivityIndicator color="#1b3358" />}
                    
                    {searchResults.length > 0 && (
                        <View style={styles.searchResultsContainer}>
                            <Text style={styles.searchLabel}>Found Global Players:</Text>
                            <FlatList 
                                data={searchResults}
                                keyExtractor={i => i.id}
                                renderItem={({item}) => (
                                    <TouchableOpacity 
                                        style={styles.searchItem} 
                                        onPress={() => onAddPlayer(item)}
                                    >
                                        <Text style={styles.searchName}>{item.name}</Text>
                                        <Text style={styles.searchSource}>from {item.source}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}

                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={[styles.modalBtn, styles.cancelBtn]}
                        >
                            <Text style={styles.modalBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => onAddPlayer()} 
                            style={[styles.modalBtn, styles.saveBtn]}
                        >
                            <Text style={styles.modalBtnText}>Add New</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', padding: 25, borderRadius: 20, maxHeight: '90%' },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1b3358', marginBottom: 20, textAlign: 'center' },
    modalInput: { backgroundColor: '#f0f2f5', padding: 15, borderRadius: 10, fontSize: 16, fontWeight: 'bold', marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
    searchResultsContainer: { maxHeight: 150, marginBottom: 15 },
    searchLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 5 },
    searchItem: { 
        padding: 10, 
        borderBottomWidth: 1, 
        borderColor: '#eee', 
        backgroundColor: '#f9f9f9', 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    searchName: { fontWeight: 'bold', color: '#1b3358' },
    searchSource: { fontSize: 10, color: '#888' },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    modalBtn: { flex: 1, padding: 15, borderRadius: 15, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#ccc' },
    saveBtn: { backgroundColor: '#1b3358' },
    modalBtnText: { fontWeight: '900', fontSize: 14 }
});
