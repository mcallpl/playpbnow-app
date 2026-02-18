import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { 
    ActivityIndicator,
    Image,
    Modal, 
    StyleSheet, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View 
} from 'react-native';

interface ReportModalProps {
    visible: boolean;
    onClose: () => void;
    reportTitle: string;
    setReportTitle: (val: string) => void;
    selectedDate: Date;
    generatingImg: boolean;
    generatedImageUrl: string | null;
    onGenerateReport: () => void;
    onShareImage: () => void;
    adjustDate: (days: number) => void;
    adjustTime: (direction: number) => void;
    getFormattedDateStr: (date: Date) => string;
    setGeneratedImageUrl: (val: string | null) => void;
}

export function ReportModal({
    visible,
    onClose,
    reportTitle,
    setReportTitle,
    selectedDate,
    generatingImg,
    generatedImageUrl,
    onGenerateReport,
    onShareImage,
    adjustDate,
    adjustTime,
    getFormattedDateStr,
    setGeneratedImageUrl
}: ReportModalProps) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>GENERATE HD REPORT</Text>
                    
                    <Text style={styles.label}>Match Title</Text>
                    <TextInput 
                        style={styles.modalInput} 
                        value={reportTitle} 
                        onChangeText={(t) => { 
                            setReportTitle(t); 
                            setGeneratedImageUrl(null); 
                        }} 
                        placeholder="Enter Title"
                    />

                    <Text style={styles.label}>Date & Time</Text>
                    
                    <View style={styles.datePickerContainer}>
                        <View style={styles.dateRow}>
                            <TouchableOpacity 
                                onPress={() => { 
                                    adjustDate(-1); 
                                    setGeneratedImageUrl(null); 
                                }} 
                                style={styles.arrowBtn}
                            >
                                <Ionicons name="chevron-back" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.dateValue}>DAY</Text>
                            <TouchableOpacity 
                                onPress={() => { 
                                    adjustDate(1); 
                                    setGeneratedImageUrl(null); 
                                }} 
                                style={styles.arrowBtn}
                            >
                                <Ionicons name="chevron-forward" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.dateRow}>
                            <TouchableOpacity 
                                onPress={() => { 
                                    adjustTime(-1); 
                                    setGeneratedImageUrl(null); 
                                }} 
                                style={styles.arrowBtn}
                            >
                                <Ionicons name="chevron-back" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.dateValue}>TIME</Text>
                            <TouchableOpacity 
                                onPress={() => { 
                                    adjustTime(1); 
                                    setGeneratedImageUrl(null); 
                                }} 
                                style={styles.arrowBtn}
                            >
                                <Ionicons name="chevron-forward" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <Text style={styles.previewText}>{getFormattedDateStr(selectedDate)}</Text>

                    {generatingImg ? (
                        <View style={styles.previewContainer}>
                            <ActivityIndicator size="large" color="#1b3358" />
                        </View>
                    ) : generatedImageUrl ? (
                        <View style={styles.previewContainer}>
                            <Image 
                                source={{ uri: generatedImageUrl }} 
                                style={styles.previewImage} 
                                resizeMode="contain" 
                            />
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.generateBtn} onPress={onGenerateReport}>
                            <Text style={styles.generateBtnText}>REFRESH PREVIEW</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={[styles.modalBtn, styles.cancelBtn]}
                        >
                            <Text style={styles.modalBtnText}>CANCEL</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={onShareImage} 
                            style={[
                                styles.modalBtn, 
                                styles.saveBtn, 
                                !generatedImageUrl && {opacity: 0.5}
                            ]}
                            disabled={!generatedImageUrl}
                        >
                            <Text style={[styles.modalBtnText, {color:'white'}]}>SHARE NOW</Text>
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
    previewContainer: { 
        height: 200, 
        backgroundColor: '#eee', 
        borderRadius: 10, 
        marginBottom: 15, 
        justifyContent: 'center', 
        alignItems: 'center', 
        overflow: 'hidden' 
    },
    previewImage: { width: '100%', height: '100%' },
    generateBtn: { padding: 15, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center', marginBottom: 15 },
    generateBtnText: { fontWeight: 'bold', color: '#666' },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
    modalBtn: { flex: 1, padding: 15, borderRadius: 15, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#ccc' },
    saveBtn: { backgroundColor: '#1b3358' },
    modalBtnText: { fontWeight: '900', fontSize: 14 }
});
