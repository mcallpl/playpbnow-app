import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Linking,
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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail || !password) {
            Alert.alert('Missing Fields', 'Please enter your email and password.');
            return;
        }

        if (mode === 'register' && !firstName.trim()) {
            Alert.alert('Missing Name', 'Please enter your first name.');
            return;
        }

        if (mode === 'register' && password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const body: any = {
                mode,
                email: trimmedEmail,
                password,
                device_info: Platform.OS,
            };
            if (mode === 'register') {
                body.first_name = firstName.trim();
                body.last_name = lastName.trim();
                if (phone.trim()) body.phone = phone.trim();
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
                if (data.user.email) pairs.push(['user_email', data.user.email]);
                if (data.user.first_name) pairs.push(['user_first_name', data.user.first_name]);
                if (data.user.last_name) pairs.push(['user_last_name', data.user.last_name]);
                await AsyncStorage.multiSet(pairs);

                setLoading(false);
                router.replace('/(tabs)/groups');
            } else {
                setLoading(false);
                Alert.alert('Error', data.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            setLoading(false);
            console.error('Login error:', error);
            Alert.alert('Error', 'Network error. Please check your connection and try again.');
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
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

                                <Text style={styles.label}>PHONE NUMBER</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="(optional)"
                                    placeholderTextColor={colors.inputPlaceholder}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    autoComplete="tel"
                                    textContentType="telephoneNumber"
                                />
                            </>
                        )}

                        <Text style={styles.label}>EMAIL</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.inputPlaceholder}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            value={email}
                            onChangeText={setEmail}
                        />

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
});
