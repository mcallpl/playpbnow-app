import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const API_URL = 'https://peoplestar.com/Chipleball/api';

export default function LoginScreen() {
    const router = useRouter();
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
            console.log('📞 Sending code to:', phone);
            
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
            console.log('🔐 Verifying code...');
            
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
            console.log('📥 Verify response:', data);

            if (data.status === 'success') {
                console.log('✅ Verification successful!');
                
                // Save session data
                await AsyncStorage.setItem('session_token', data.session_token);
                await AsyncStorage.setItem('user_id', data.user.id.toString());
                await AsyncStorage.setItem('user_phone', data.user.phone);
                
                console.log('💾 Session saved:', {
                    token: data.session_token.substring(0, 10) + '...',
                    userId: data.user.id,
                    phone: data.user.phone
                });
                
                setLoading(false);
                
                console.log('🚀 Navigating to home...');
                
                // Use replace to completely reset navigation stack
                router.replace('/(tabs)/groups');
                
            } else {
                setLoading(false);
                Alert.alert('Invalid Code', data.message || 'Please check your code and try again');
            }
        } catch (error) {
            setLoading(false);
            console.error('❌ Verify error:', error);
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
                        source={{ uri: `${API_URL}/images/PlayPBNow-Logo-SMALL.png` }}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.subtitle}>Pickleball Match Tracking</Text>
                </View>

                {!codeSent ? (
                    <>
                        <View style={styles.form}>
                            <Text style={styles.label}>Enter your phone number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="(555) 555-5555"
                                placeholderTextColor="#999"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={handlePhoneChange}
                                maxLength={14}
                                autoFocus
                            />
                            <Text style={styles.hint}>
                                We'll send you a verification code
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={sendVerificationCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>SEND CODE</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.form}>
                            <Text style={styles.label}>Enter verification code</Text>
                            <Text style={styles.phoneDisplay}>{phone}</Text>
                            
                            <TextInput
                                style={styles.codeInput}
                                placeholder="000000"
                                placeholderTextColor="#999"
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
                                <ActivityIndicator color="white" />
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1b3358' },
    content: { flex: 1, padding: 30, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 0 },
    logo: { width: 240, height: 240, marginTop: 0 },
    subtitle: { fontSize: 13, color: '#87ca37', fontWeight: 'bold', marginTop: -40, marginBottom: 15 },
    form: { marginBottom: 30 },
    label: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    input: { backgroundColor: 'white', padding: 18, borderRadius: 12, fontSize: 20, fontWeight: 'bold', color: '#1b3358', textAlign: 'center', letterSpacing: 2 },
    codeInput: { backgroundColor: 'white', padding: 18, borderRadius: 12, fontSize: 32, fontWeight: 'bold', color: '#1b3358', textAlign: 'center', letterSpacing: 8, marginBottom: 15 },
    hint: { color: '#ccc', fontSize: 13, textAlign: 'center', marginTop: 10 },
    phoneDisplay: { color: '#87ca37', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    changeNumber: { color: '#87ca37', textAlign: 'center', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
    button: { backgroundColor: '#87ca37', padding: 18, borderRadius: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    resendBtn: { marginTop: 20, padding: 10, alignItems: 'center' },
    resendText: { color: 'white', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
    footer: { marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    footerText: { color: '#999', fontSize: 11, textAlign: 'center', lineHeight: 16 }
});
