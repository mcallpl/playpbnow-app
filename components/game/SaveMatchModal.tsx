import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface SaveMatchModalProps {
    visible: boolean;
    onClose: () => void;
    saveTitle: string;
    setSaveTitle: (val: string) => void;
    selectedDate: Date;
    onSave: () => void;
    adjustDate: (days: number) => void;
    adjustTime: (direction: number) => void;
    getFormattedDateStr: (date: Date) => string;
    isSaving: boolean;
}

export function SaveMatchModal({
    visible,
    onClose,
    saveTitle,
    setSaveTitle,
    selectedDate,
    onSave,
    adjustDate,
    adjustTime,
    getFormattedDateStr,
    isSaving
}: SaveMatchModalProps) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>SAVE MATCH RESULTS</Text>
                    
                    <Text style={styles.label}>Match Title</Text>
                    <TextInput 
                        style={styles.modalInput} 
                        value={saveTitle} 
                        onChangeText={setSaveTitle} 
                        placeholder="Enter Title"
                    />

                    <Text style={styles.label}>Scheduled Date & Time</Text>
                    
                    <View style={styles.datePickerContainer}>
                        <View style={styles.dateRow}>
                            <TouchableOpacity onPress={() => adjustDate(-1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-back" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.dateValue}>DAY</Text>
                            <TouchableOpacity onPress={() => adjustDate(1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-forward" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.dateRow}>
                            <TouchableOpacity onPress={() => adjustTime(-1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-back" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.dateValue}>TIME</Text>
                            <TouchableOpacity onPress={() => adjustTime(1)} style={styles.arrowBtn}>
                                <Ionicons name="chevron-forward" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <Text style={styles.previewText}>{getFormattedDateStr(selectedDate)}</Text>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity onPress={onClose} style={[styles.modalBtn, styles.cancelBtn]}>
                            <Text style={styles.modalBtnText}>CANCEL</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={onSave} 
                            style={[styles.modalBtn, styles.saveBtn, isSaving && {opacity: 0.5}]}
                            disabled={isSaving}
                        >
                            <Text style={[styles.modalBtnText, {color:'white'}]}>
                                {isSaving ? 'SAVING...' : 'CONFIRM SAVE'}
                            </Text>
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
    label: { color: '#666', fontWeight: 'bold', marginBottom: 5, fontSize: 12 },
    modalInput: { backgroundColor: '#f0f2f5', padding: 15, borderRadius: 10, fontSize: 16, fontWeight: 'bold', marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
    datePickerContainer: { marginBottom: 10 },
    dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, backgroundColor: '#f0f2f5', padding: 10, borderRadius: 10 },
    arrowBtn: { backgroundColor: '#1b3358', padding: 10, borderRadius: 8 },
    dateValue: { fontWeight: '900', color: '#1b3358', fontSize: 14 },
    previewText: { textAlign: 'center', color: '#87ca37', fontWeight: 'bold', fontSize: 16, marginBottom: 10 },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    modalBtn: { flex: 1, padding: 15, borderRadius: 15, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#ccc' },
    saveBtn: { backgroundColor: '#1b3358' },
    modalBtnText: { fontWeight: '900', fontSize: 14 }
});
