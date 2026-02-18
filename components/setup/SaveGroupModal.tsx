import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface SaveGroupModalProps {
    visible: boolean;
    onClose: () => void;
    saveAsName: string;
    setSaveAsName: (name: string) => void;
    onSave: () => void;
    groupName: string;
}

export function SaveGroupModal({ 
    visible, 
    onClose, 
    saveAsName, 
    setSaveAsName, 
    onSave,
    groupName 
}: SaveGroupModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Save Roster As</Text>
                    
                    <Text style={styles.hint}>
                        Same name = update • Different name = create new
                    </Text>
                    
                    <TextInput
                        style={styles.input}
                        placeholder="Enter group name..."
                        value={saveAsName}
                        onChangeText={setSaveAsName}
                        autoFocus
                    />

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                            <Text style={styles.btnText}>CANCEL</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={onSave}>
                            <Text style={[styles.btnText, { color: 'white' }]}>SAVE GROUP</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1b3358',
        marginBottom: 10,
        textAlign: 'center'
    },
    hint: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic'
    },
    input: {
        backgroundColor: '#f0f2f5',
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10
    },
    btn: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    cancelBtn: {
        backgroundColor: '#ddd'
    },
    saveBtn: {
        backgroundColor: '#1b3358'
    },
    btnText: {
        fontWeight: 'bold',
        fontSize: 14
    }
});
