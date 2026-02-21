import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import {
    ThemeColors,
    FONT_DISPLAY_BOLD,
    FONT_DISPLAY_EXTRABOLD,
    FONT_BODY_REGULAR,
    FONT_BODY_MEDIUM,
    FONT_BODY_BOLD,
    FONT_BODY_SEMIBOLD,
} from '../constants/theme';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export default function LoginScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const formatPhoneNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '');

        if (cleaned.length <= 3) {
            return cleaned;
        } else if (cleaned.length <= 6) {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
        } else {
            return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
        }
    };

    const handlePhoneChange = (text: string) => {
        const formatted = formatPhoneNumber(text);
        setPhone(formatted);
    };

    const sendVerificationCode = async () => {
        if (phone.replace(/\D/g, '').length !== 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/send_verification_code.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });

            const data = await response.json();

            if (data.status === 'success') {
                setCodeSent(true);
                Alert.alert('Code Sent', `A 6-digit code has been sent to ${phone}`);
            } else {
                Alert.alert('Error', data.message || 'Failed to send code');
            }
        } catch (error) {
            console.error('Send code error:', error);
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async () => {
        if (code.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/verify_code.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    code,
                    device_info: Platform.OS
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                await AsyncStorage.setItem('session_token', data.session_token);
                await AsyncStorage.setItem('user_id', data.user.id.toString());
                await AsyncStorage.setItem('user_phone', data.user.phone);

                setLoading(false);
                router.replace('/(tabs)/groups');
            } else {
                setLoading(false);
                Alert.alert('Invalid Code', data.message || 'Please check your code and try again');
            }
        } catch (error) {
            setLoading(false);
            console.error('Verify error:', error);
            Alert.alert('Error', 'Network error. Please try again.');
        }
    };

    const resetForm = () => {
        setCodeSent(false);
        setCode('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <Image
                        source={require('../assets/images/PlayPBNow-Logo-SMALL.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.subtitle}>MATCH TRACKING</Text>
                </View>

                {!codeSent ? (
                    <>
                        <View style={styles.form}>
                            <Text style={styles.label}>PHONE NUMBER</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="(555) 555-5555"
                                placeholderTextColor={colors.inputPlaceholder}
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={handlePhoneChange}
                                maxLength={14}
                                autoFocus
                            />
                            <Text style={styles.hint}>
                                We'll send a 6-digit verification code via SMS
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={sendVerificationCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.bg} />
                            ) : (
                                <Text style={styles.buttonText}>SEND CODE</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.form}>
                            <Text style={styles.label}>VERIFICATION CODE</Text>
                            <Text style={styles.phoneDisplay}>{phone}</Text>

                            <TextInput
                                style={styles.codeInput}
                                placeholder="000000"
                                placeholderTextColor={colors.inputPlaceholder}
                                keyboardType="number-pad"
                                value={code}
                                onChangeText={setCode}
                                maxLength={6}
                                autoFocus
                            />

                            <TouchableOpacity onPress={resetForm}>
                                <Text style={styles.changeNumber}>Change number</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={verifyCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.bg} />
                            ) : (
                                <Text style={styles.buttonText}>VERIFY & LOGIN</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendBtn}
                            onPress={sendVerificationCode}
                            disabled={loading}
                        >
                            <Text style={styles.resendText}>Resend code</Text>
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        By continuing, you agree to receive SMS messages for verification
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { flex: 1, padding: 32, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 0 },
    logo: { width: 240, height: 240, marginTop: 0 },
    subtitle: {
        fontSize: 13,
        color: c.textMuted,
        fontFamily: FONT_BODY_MEDIUM,
        letterSpacing: 3,
        marginTop: -40,
        marginBottom: 24,
    },
    form: { marginBottom: 30 },
    label: {
        color: c.textMuted,
        fontSize: 12,
        fontFamily: FONT_BODY_SEMIBOLD,
        letterSpacing: 1.5,
        marginBottom: 10,
    },
    input: {
        backgroundColor: c.inputBg,
        borderWidth: 1,
        borderColor: c.glassStroke,
        padding: 18,
        borderRadius: 16,
        fontSize: 22,
        fontFamily: FONT_BODY_SEMIBOLD,
        color: c.inputText,
        textAlign: 'center',
        letterSpacing: 2,
    },
    codeInput: {
        backgroundColor: c.inputBg,
        borderWidth: 1,
        borderColor: c.glassStroke,
        padding: 18,
        borderRadius: 16,
        fontSize: 32,
        fontFamily: FONT_DISPLAY_BOLD,
        color: c.inputText,
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: 15,
    },
    hint: {
        color: c.textMuted,
        fontSize: 12,
        fontFamily: FONT_BODY_REGULAR,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 18,
    },
    phoneDisplay: {
        color: c.accent,
        fontSize: 18,
        fontFamily: FONT_DISPLAY_BOLD,
        textAlign: 'center',
        marginBottom: 20,
    },
    changeNumber: {
        color: c.accent,
        textAlign: 'center',
        fontSize: 14,
        fontFamily: FONT_BODY_BOLD,
        textDecorationLine: 'underline',
    },
    button: {
        backgroundColor: c.accent,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: {
        color: c.bg,
        fontSize: 16,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        letterSpacing: 1,
    },
    resendBtn: { marginTop: 20, padding: 10, alignItems: 'center' },
    resendText: {
        color: c.textSoft,
        fontSize: 14,
        fontFamily: FONT_BODY_BOLD,
        textDecorationLine: 'underline',
    },
    footer: {
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: c.border,
    },
    footerText: {
        color: c.textMuted,
        fontSize: 11,
        fontFamily: FONT_BODY_REGULAR,
        textAlign: 'center',
        lineHeight: 16,
    },
});
