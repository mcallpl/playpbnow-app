import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { storeNavData } from '../utils/navData';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { BrandedIcon } from '../components/BrandedIcon';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

interface JoinMatchModalProps {
    visible: boolean;
    onClose: () => void;
}

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

export function JoinMatchModal({ visible, onClose }: JoinMatchModalProps) {
    const router = useRouter();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [shareCode, setShareCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Strip everything except letters A-Z (codes are alpha-only, no I or O)
    const cleanCode = (text: string) => text.replace(/[^A-Za-z]/g, '').toUpperCase();

    const handleJoin = async () => {
        setErrorMessage('');
        const code = cleanCode(shareCode);
        if (code.length !== 6) {
            setErrorMessage('Please enter a 6-letter share code (letters only, no numbers).');
            return;
        }

        setLoading(true);

        try {
            const userId = await AsyncStorage.getItem('user_id') || '';

            console.log(`[JoinMatch] Sending code: "${code}" to ${API_URL}/collab_join_match.php`);

            const response = await fetch(`${API_URL}/collab_join_match.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    share_code: code,
                    user_id: userId
                })
            });

            const responseText = await response.text();
            console.log(`[JoinMatch] Response (${response.status}): ${responseText.substring(0, 500)}`);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseErr) {
                console.error('[JoinMatch] Failed to parse JSON:', responseText.substring(0, 200));
                setErrorMessage('Server returned an unexpected response. Please try again.');
                return;
            }

            if (data.status === 'success') {
                onClose();
                setShareCode('');
                setErrorMessage('');

                // Navigate to the game screen with full schedule from the collab session
                const navId = await storeNavData({
                    schedule: data.schedule,
                    players: data.players || [],
                    collabScores: data.scores || {}
                });
                router.push({
                    pathname: '/(tabs)/game',
                    params: {
                        navId,
                        groupName: data.session.group_name,
                        shareCode: data.session.share_code,
                        sessionId: data.session.id,
                        isCollaborator: 'true',
                    }
                });
            } else {
                const serverMsg = data.message || 'Unknown error';
                console.error(`[JoinMatch] Server error: ${serverMsg}`);
                setErrorMessage(serverMsg);
            }
        } catch (error) {
            console.error('[JoinMatch] Network error:', error);
            setErrorMessage('Could not connect to the server. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>JOIN LIVE MATCH</Text>
                        <TouchableOpacity onPress={() => { setErrorMessage(''); onClose(); }} style={styles.closeBtn}>
                            <BrandedIcon name="close" size={28} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.instructions}>
                        Enter the 6-letter code shared by the match host to view live scores and help keep score.
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, errorMessage ? { borderColor: '#ff4444' } : null]}
                            placeholder="ABCDEF"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={shareCode}
                            onChangeText={(text) => { setShareCode(cleanCode(text)); setErrorMessage(''); }}
                            autoCapitalize="characters"
                            maxLength={6}
                            autoFocus
                        />
                        {errorMessage ? (
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        ) : null}
                    </View>

                    <TouchableOpacity
                        style={[styles.joinBtn, loading && { opacity: 0.6 }]}
                        onPress={handleJoin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <BrandedIcon name="enter" size={24} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.joinBtnText}>JOIN MATCH</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.features}>
                        <View style={styles.feature}>
                            <BrandedIcon name="eye" size={18} color={colors.accent} />
                            <Text style={styles.featureText}>See live score updates</Text>
                        </View>
                        <View style={styles.feature}>
                            <BrandedIcon name="edit" size={18} color={colors.accent} />
                            <Text style={styles.featureText}>Help keep score</Text>
                        </View>
                        <View style={styles.feature}>
                            <BrandedIcon name="groups" size={18} color={colors.accent} />
                            <Text style={styles.featureText}>See who's connected</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: c.modalOverlay,
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: c.modalBg,
        borderRadius: 20,
        padding: 25,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        color: c.text,
    },
    closeBtn: {
        padding: 5,
    },
    instructions: {
        fontSize: 14,
        color: c.textMuted,
        marginBottom: 25,
        lineHeight: 20,
        fontFamily: FONT_BODY_REGULAR,
    },
    inputContainer: {
        marginBottom: 20,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 14,
        fontFamily: FONT_BODY_SEMIBOLD,
        textAlign: 'center',
        marginTop: 10,
    },
    input: {
        backgroundColor: c.inputBg,
        padding: 20,
        borderRadius: 12,
        fontSize: 32,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        color: c.inputText,
        textAlign: 'center',
        letterSpacing: 8,
        borderWidth: 2,
        borderColor: c.accent,
    },
    joinBtn: {
        backgroundColor: c.accent,
        padding: 18,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
    },
    joinBtnText: {
        color: 'white',
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontSize: 16,
    },
    features: {
        gap: 12,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontSize: 13,
        color: c.textMuted,
        fontFamily: FONT_BODY_SEMIBOLD,
    },
});
