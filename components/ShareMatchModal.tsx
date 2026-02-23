import { BrandedIcon } from '../components/BrandedIcon';
import React, { useMemo } from 'react';
import {
    Alert,
    Modal,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM, FONT_BODY_BOLD, FONT_BODY_SEMIBOLD } from '../constants/theme';

interface ShareMatchModalProps {
    visible: boolean;
    onClose: () => void;
    shareCode: string;
    matchTitle: string;
}

export function ShareMatchModal({ visible, onClose, shareCode, matchTitle }: ShareMatchModalProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join my pickleball match "${matchTitle}"!\n\nEnter code: ${shareCode}\n\nDownload Play PB Now to join and see live scores!`,
                title: 'Join My Match'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const copyToClipboard = () => {
        // Note: Expo Clipboard requires expo-clipboard package
        // For now, just show alert
        Alert.alert(
            'Share Code',
            `Code: ${shareCode}\n\nShare this code with others so they can view and score this match live!`,
            [{ text: 'OK' }]
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>SHARE LIVE MATCH</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <BrandedIcon name="close" size={28} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>{matchTitle}</Text>

                    <View style={styles.codeContainer}>
                        <Text style={styles.codeLabel}>Share Code</Text>
                        <Text style={styles.code}>{shareCode}</Text>
                    </View>

                    <Text style={styles.instructions}>
                        Share this code with other players. They can enter it in the app to view live scores and help keep score!
                    </Text>

                    <View style={styles.buttons}>
                        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                            <BrandedIcon name="share" size={24} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.shareBtnText}>SHARE CODE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.copyBtn} onPress={copyToClipboard}>
                            <BrandedIcon name="copy" size={20} color={colors.surface} style={{ marginRight: 8 }} />
                            <Text style={styles.copyBtnText}>COPY</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.features}>
                        <View style={styles.feature}>
                            <BrandedIcon name="eye" size={20} color={colors.accent} />
                            <Text style={styles.featureText}>Live score updates</Text>
                        </View>
                        <View style={styles.feature}>
                            <BrandedIcon name="edit" size={20} color={colors.accent} />
                            <Text style={styles.featureText}>Collaborative scoring</Text>
                        </View>
                        <View style={styles.feature}>
                            <BrandedIcon name="groups" size={20} color={colors.accent} />
                            <Text style={styles.featureText}>View who's connected</Text>
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
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: c.modalBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 25,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        color: c.text,
    },
    closeBtn: {
        padding: 5,
    },
    subtitle: {
        fontSize: 14,
        color: c.textMuted,
        marginBottom: 20,
        fontFamily: FONT_BODY_SEMIBOLD,
    },
    codeContainer: {
        backgroundColor: c.inputBg,
        borderRadius: 15,
        padding: 25,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: c.accent,
    },
    codeLabel: {
        fontSize: 12,
        color: c.textMuted,
        fontFamily: FONT_BODY_BOLD,
        marginBottom: 10,
    },
    code: {
        fontSize: 48,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        color: c.text,
        letterSpacing: 8,
    },
    instructions: {
        fontSize: 14,
        color: c.textMuted,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 20,
        fontFamily: FONT_BODY_REGULAR,
    },
    buttons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 25,
    },
    shareBtn: {
        flex: 2,
        backgroundColor: c.accent,
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareBtnText: {
        color: 'white',
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontSize: 16,
    },
    copyBtn: {
        flex: 1,
        backgroundColor: c.surfaceLight,
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyBtnText: {
        color: c.text,
        fontFamily: FONT_DISPLAY_EXTRABOLD,
        fontSize: 14,
    },
    features: {
        gap: 12,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 14,
        color: c.textMuted,
        fontFamily: FONT_BODY_SEMIBOLD,
    },
});
