import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
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

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

export default function LoginScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Forgot password state
    const [resetStep, setResetStep] = useState<'none' | 'phone' | 'code' | 'newpass'>('none');
    const [resetPhone, setResetPhone] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirm, setResetConfirm] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleSubmit = async () => {
        setErrorMessage('');

        if (mode === 'login') {
            if (!email.trim() || !password) {
                setErrorMessage('Please enter your email (or phone) and password.');
                return;
            }
        } else {
            // Register mode: email + password required, phone optional
            if (!email.trim() || !password) {
                setErrorMessage('Email and password are required.');
                return;
            }
            if (!firstName.trim()) {
                setErrorMessage('Please enter your first name.');
                return;
            }
            if (password.length < 6) {
                setErrorMessage('Password must be at least 6 characters.');
                return;
            }
        }

        setLoading(true);
        try {
            const body: any = {
                mode,
                password,
                device_info: Platform.OS,
            };
            if (mode === 'login') {
                // The email field doubles as "email or phone" for login
                const loginId = email.trim();
                const looksLikePhone = /^[\d\s()+\-]+$/.test(loginId) && loginId.replace(/\D/g, '').length >= 10;
                if (looksLikePhone) {
                    body.phone = loginId;
                } else {
                    body.email = loginId;
                }
            } else {
                // Register mode: email required, phone optional
                body.email = email.trim();
                if (phone.trim()) body.phone = phone.trim();
                body.first_name = firstName.trim();
                body.last_name = lastName.trim();
            }

            const response = await fetch(`${API_URL}/email_login.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.status === 'success') {
                const pairs: [string, string][] = [
                    ['session_token', data.session_token],
                    ['user_id', data.user.id.toString()],
                ];
                if (data.user.phone) pairs.push(['user_phone', data.user.phone]);
                if (data.user.email) pairs.push(['user_email', data.user.email]);
                if (data.user.first_name) pairs.push(['user_first_name', data.user.first_name]);
                if (data.user.last_name) pairs.push(['user_last_name', data.user.last_name]);
                await AsyncStorage.multiSet(pairs);

                setLoading(false);
                router.replace('/(tabs)/groups');
            } else {
                setLoading(false);
                setErrorMessage(data.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            setLoading(false);
            console.error('Login error:', error);
            setErrorMessage('Network error. Please check your connection and try again.');
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setErrorMessage('');
    };

    const startForgotPassword = () => {
        setResetPhone(phone.trim());
        setResetStep('phone');
    };

    const cancelReset = () => {
        setResetStep('none');
        setResetPhone('');
        setResetCode('');
        setResetPassword('');
        setResetConfirm('');
    };

    const handleRequestCode = async () => {
        if (!resetPhone.trim()) {
            Alert.alert('Error', 'Please enter your phone number.');
            return;
        }
        setResetLoading(true);
        try {
            const res = await fetch(`${API_URL}/forgot_password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'request_code', phone: resetPhone.trim() }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setResetStep('code');
            } else {
                Alert.alert('Error', data.message);
            }
        } catch {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (resetCode.trim().length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit code.');
            return;
        }
        setResetLoading(true);
        try {
            const res = await fetch(`${API_URL}/forgot_password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_code', phone: resetPhone.trim(), code: resetCode.trim() }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setResetStep('newpass');
            } else {
                Alert.alert('Error', data.message);
            }
        } catch {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (resetPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }
        if (resetPassword !== resetConfirm) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }
        setResetLoading(true);
        try {
            const res = await fetch(`${API_URL}/forgot_password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset_password',
                    phone: resetPhone.trim(),
                    code: resetCode.trim(),
                    new_password: resetPassword,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                Alert.alert('Success', 'Your password has been reset. You can now sign in.');
                cancelReset();
            } else {
                Alert.alert('Error', data.message);
            }
        } catch {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <Image
                            source={require('../assets/images/PPBN-Logo-SMALL.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.subtitle}>MATCH TRACKING</Text>
                    </View>

                    <View style={styles.form}>
                        {mode === 'register' && (
                            <>
                                <Text style={styles.label}>FIRST NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="First name"
                                    placeholderTextColor={colors.inputPlaceholder}
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    autoCapitalize="words"
                                    autoComplete="given-name"
                                    textContentType="givenName"
                                />

                                <Text style={styles.label}>LAST NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Last name (optional)"
                                    placeholderTextColor={colors.inputPlaceholder}
                                    value={lastName}
                                    onChangeText={setLastName}
                                    autoCapitalize="words"
                                    autoComplete="family-name"
                                    textContentType="familyName"
                                />
                            </>
                        )}

                        <Text style={styles.label}>EMAIL{mode === 'login' ? ' OR PHONE' : ''}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={mode === 'login' ? 'Email or phone number' : 'Email address'}
                            placeholderTextColor={colors.inputPlaceholder}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            value={email}
                            onChangeText={setEmail}
                        />

                        {mode === 'register' && (
                            <>
                                <Text style={styles.label}>PHONE NUMBER</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Optional"
                                    placeholderTextColor={colors.inputPlaceholder}
                                    keyboardType="phone-pad"
                                    autoComplete="tel"
                                    textContentType="telephoneNumber"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </>
                        )}

                        <Text style={styles.label}>PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={mode === 'register' ? '6+ characters' : 'Your password'}
                            placeholderTextColor={colors.inputPlaceholder}
                            secureTextEntry
                            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                            textContentType={mode === 'register' ? 'newPassword' : 'password'}
                            value={password}
                            onChangeText={setPassword}
                            onSubmitEditing={handleSubmit}
                            returnKeyType="go"
                        />
                    </View>

                    {mode === 'login' && (
                        <TouchableOpacity style={styles.forgotBtn} onPress={startForgotPassword}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}

                    {errorMessage !== '' && (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.bg} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.toggleBtn} onPress={toggleMode}>
                        <Text style={styles.toggleText}>
                            {mode === 'login'
                                ? "Don't have an account? Create one"
                                : 'Already have an account? Sign in'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            By continuing, you agree to our{' '}
                            <Text style={styles.footerLink} onPress={() => {
                                const url = 'https://peoplestar.com/PlayPBNow/api/terms.html';
                                Platform.OS === 'web' ? window.open(url, '_blank') : Linking.openURL(url);
                            }}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={styles.footerLink} onPress={() => {
                                const url = 'https://peoplestar.com/PlayPBNow/api/privacy.html';
                                Platform.OS === 'web' ? window.open(url, '_blank') : Linking.openURL(url);
                            }}>Privacy Policy</Text>.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal animationType="slide" transparent visible={resetStep !== 'none'} onRequestClose={cancelReset}>
                <View style={styles.resetOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
                        <View style={styles.resetCard}>
                            <Text style={styles.resetTitle}>
                                {resetStep === 'phone' ? 'Reset Password' : resetStep === 'code' ? 'Enter Code' : 'New Password'}
                            </Text>

                            {resetStep === 'phone' && (
                                <>
                                    <Text style={styles.resetHint}>Enter your phone number and we'll text you a 6-digit reset code.</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="(949) 735-9415"
                                        placeholderTextColor={colors.inputPlaceholder}
                                        keyboardType="phone-pad"
                                        value={resetPhone}
                                        onChangeText={setResetPhone}
                                    />
                                    <TouchableOpacity
                                        style={[styles.button, { marginTop: 16 }, resetLoading && styles.buttonDisabled]}
                                        onPress={handleRequestCode}
                                        disabled={resetLoading}
                                    >
                                        {resetLoading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>SEND CODE</Text>}
                                    </TouchableOpacity>
                                </>
                            )}

                            {resetStep === 'code' && (
                                <>
                                    <Text style={styles.resetHint}>Enter the 6-digit code we just texted you.</Text>
                                    <TextInput
                                        style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                                        placeholder="000000"
                                        placeholderTextColor={colors.inputPlaceholder}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={resetCode}
                                        onChangeText={setResetCode}
                                    />
                                    <TouchableOpacity
                                        style={[styles.button, { marginTop: 16 }, resetLoading && styles.buttonDisabled]}
                                        onPress={handleVerifyCode}
                                        disabled={resetLoading}
                                    >
                                        {resetLoading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>VERIFY</Text>}
                                    </TouchableOpacity>
                                </>
                            )}

                            {resetStep === 'newpass' && (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="New password (6+ characters)"
                                        placeholderTextColor={colors.inputPlaceholder}
                                        secureTextEntry
                                        value={resetPassword}
                                        onChangeText={setResetPassword}
                                        autoCapitalize="none"
                                    />
                                    <TextInput
                                        style={[styles.input, { marginTop: 12 }]}
                                        placeholder="Confirm new password"
                                        placeholderTextColor={colors.inputPlaceholder}
                                        secureTextEntry
                                        value={resetConfirm}
                                        onChangeText={setResetConfirm}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity
                                        style={[styles.button, { marginTop: 16 }, resetLoading && styles.buttonDisabled]}
                                        onPress={handleResetPassword}
                                        disabled={resetLoading}
                                    >
                                        {resetLoading ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.buttonText}>RESET PASSWORD</Text>}
                                    </TouchableOpacity>
                                </>
                            )}

                            <TouchableOpacity style={styles.toggleBtn} onPress={cancelReset}>
                                <Text style={styles.forgotText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    keyboardView: { flex: 1 },
    content: { flexGrow: 1, padding: 32, justifyContent: 'center' },
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
    form: { marginBottom: 24 },
    label: {
        color: c.textMuted,
        fontSize: 12,
        fontFamily: FONT_BODY_SEMIBOLD,
        letterSpacing: 1.5,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: c.inputBg,
        borderWidth: 1,
        borderColor: c.glassStroke,
        padding: 16,
        borderRadius: 16,
        fontSize: 16,
        fontFamily: FONT_BODY_REGULAR,
        color: c.inputText,
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
    toggleBtn: {
        marginTop: 20,
        padding: 10,
        alignItems: 'center',
    },
    toggleText: {
        color: c.accent,
        fontSize: 14,
        fontFamily: FONT_BODY_BOLD,
    },
    footer: {
        marginTop: 30,
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
    footerLink: {
        color: c.accent,
        fontFamily: FONT_BODY_BOLD,
        textDecorationLine: 'underline',
    },
    errorBanner: {
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 38, 0.3)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        fontFamily: FONT_BODY_MEDIUM,
        textAlign: 'center',
        lineHeight: 20,
    },
    forgotBtn: {
        alignItems: 'flex-end',
        marginBottom: 16,
        marginTop: -8,
    },
    forgotText: {
        color: c.textMuted,
        fontSize: 13,
        fontFamily: FONT_BODY_MEDIUM,
    },
    resetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    resetCard: {
        backgroundColor: c.bg,
        borderRadius: 20,
        padding: 28,
    },
    resetTitle: {
        fontSize: 22,
        fontFamily: FONT_DISPLAY_BOLD,
        color: c.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    resetHint: {
        fontSize: 14,
        fontFamily: FONT_BODY_REGULAR,
        color: c.textMuted,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
});
