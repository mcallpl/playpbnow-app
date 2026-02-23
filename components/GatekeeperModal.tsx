import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrandedIcon } from './BrandedIcon';
import { BlurView } from 'expo-blur';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

interface GatekeeperModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (newId: string) => void;
}

export function GatekeeperModal({ visible, onClose, onSuccess }: GatekeeperModalProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleSave = async () => {
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanNumber.length < 10) {
            Alert.alert("Invalid Number", "Please enter a valid 10-digit phone number.");
            return;
        }

        setLoading(true);
        const newId = `phone_${cleanNumber}`;

        try {
            await AsyncStorage.setItem('device_id', newId);
            Alert.alert("Success!", "Your ID is saved. Scoring and sharing features are now unlocked.");
            onSuccess(newId);
            onClose();
        } catch (error) {
            Alert.alert("Error", "Could not save phone number.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                    <View style={styles.content}>
                        <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
                            <BrandedIcon name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>

                        <Text style={styles.title}>Unlock Features</Text>

                        <Text style={styles.subtitle}>
                            To enter scores and share match reports via text, please register your cell phone number.
                            {"\n\n"}
                            This creates a permanent ID so you never lose your history.
                        </Text>

                        <View style={styles.inputContainer}>
                            <View style={{marginRight: 10}}>
                                <BrandedIcon name="phone" size={20} color={colors.textMuted} />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="(555) 123-4567"
                                placeholderTextColor={colors.inputPlaceholder}
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                            />
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color={colors.text} />
                            ) : (
                                <Text style={styles.saveBtnText}>UNLOCK NOW</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
                            <Text style={styles.skipText}>Look around only</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', padding: 20 },
    content: { backgroundColor: c.modalBg, borderRadius: 20, padding: 25, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    closeIcon: { alignSelf: 'flex-end', padding: 5 },
    title: { fontSize: 22, fontFamily: FONT_DISPLAY_EXTRABOLD, color: c.text, marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 15, color: c.textSoft, textAlign: 'center', marginBottom: 25, lineHeight: 22, fontFamily: FONT_BODY_REGULAR },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 15, height: 50, marginBottom: 20, borderWidth: 1, borderColor: c.inputBorder },
    input: { flex: 1, fontSize: 16, color: c.inputText, fontFamily: FONT_BODY_BOLD },
    saveBtn: { backgroundColor: c.accent, paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    saveBtnText: { color: c.text, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 16, letterSpacing: 1 },
    skipBtn: { alignItems: 'center', padding: 10 },
    skipText: { color: c.textMuted, fontFamily: FONT_BODY_BOLD },
});
