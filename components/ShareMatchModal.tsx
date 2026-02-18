import { Ionicons } from '@expo/vector-icons';
import React from 'react';
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

interface ShareMatchModalProps {
    visible: boolean;
    onClose: () => void;
    shareCode: string;
    matchTitle: string;
}

export function ShareMatchModal({ visible, onClose, shareCode, matchTitle }: ShareMatchModalProps) {
    const insets = useSafeAreaInsets();

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
                            <Ionicons name="close" size={28} color="#666" />
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
                            <Ionicons name="share-social" size={24} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.shareBtnText}>SHARE CODE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.copyBtn} onPress={copyToClipboard}>
                            <Ionicons name="copy" size={20} color="#1b3358" style={{ marginRight: 8 }} />
                            <Text style={styles.copyBtnText}>COPY</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.features}>
                        <View style={styles.feature}>
                            <Ionicons name="eye" size={20} color="#87ca37" />
                            <Text style={styles.featureText}>Live score updates</Text>
                        </View>
                        <View style={styles.feature}>
                            <Ionicons name="pencil" size={20} color="#87ca37" />
                            <Text style={styles.featureText}>Collaborative scoring</Text>
                        </View>
                        <View style={styles.feature}>
                            <Ionicons name="people" size={20} color="#87ca37" />
                            <Text style={styles.featureText}>View who's connected</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
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
        fontWeight: '900',
        color: '#1b3358',
    },
    closeBtn: {
        padding: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        fontWeight: '600',
    },
    codeContainer: {
        backgroundColor: '#f0f2f5',
        borderRadius: 15,
        padding: 25,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#87ca37',
    },
    codeLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    code: {
        fontSize: 48,
        fontWeight: '900',
        color: '#1b3358',
        letterSpacing: 8,
    },
    instructions: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 20,
    },
    buttons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 25,
    },
    shareBtn: {
        flex: 2,
        backgroundColor: '#87ca37',
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
    },
    copyBtn: {
        flex: 1,
        backgroundColor: '#e0e0e0',
        padding: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyBtnText: {
        color: '#1b3358',
        fontWeight: '900',
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
        color: '#666',
        fontWeight: '600',
    },
});
