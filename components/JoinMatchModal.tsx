import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface JoinMatchModalProps {
    visible: boolean;
    onClose: () => void;
}

const API_URL = 'https://peoplestar.com/Chipleball/api';

export function JoinMatchModal({ visible, onClose }: JoinMatchModalProps) {
    const router = useRouter();
    const [shareCode, setShareCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        const code = shareCode.trim().toUpperCase();
        if (code.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter a 6-character share code');
            return;
        }

        setLoading(true);

        try {
            const userId = await AsyncStorage.getItem('user_id') || '';
            
            const response = await fetch(`${API_URL}/collab_join_match.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    share_code: code,
                    user_id: userId
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                onClose();
                setShareCode('');
                
                // Navigate to the game screen with full schedule from the collab session
                router.push({
                    pathname: '/(tabs)/game',
                    params: {
                        groupName: data.session.group_name,
                        shareCode: data.session.share_code,
                        sessionId: data.session.id,
                        isCollaborator: 'true',
                        schedule: JSON.stringify(data.schedule),
                        collabScores: JSON.stringify(data.scores || {}),
                        players: JSON.stringify(data.players || [])
                    }
                });
            } else {
                Alert.alert('Error', data.message || 'Could not join match');
            }
        } catch (error) {
            console.error('Join error:', error);
            Alert.alert('Error', 'Network error. Please try again.');
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
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.instructions}>
                        Enter the 6-character code shared by the match host to view live scores and help keep score.
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="ABC123"
                            placeholderTextColor="#999"
                            value={shareCode}
                            onChangeText={(text) => setShareCode(text.toUpperCase())}
                            autoCapitalize="characters"
                            maxLength={6}
                            autoFocus
                        />
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
                                <Ionicons name="enter" size={24} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.joinBtnText}>JOIN MATCH</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.features}>
                        <View style={styles.feature}>
                            <Ionicons name="eye" size={18} color="#87ca37" />
                            <Text style={styles.featureText}>See live score updates</Text>
                        </View>
                        <View style={styles.feature}>
                            <Ionicons name="pencil" size={18} color="#87ca37" />
                            <Text style={styles.featureText}>Help keep score</Text>
                        </View>
                        <View style={styles.feature}>
                            <Ionicons name="people" size={18} color="#87ca37" />
                            <Text style={styles.featureText}>See who's connected</Text>
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
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: 'white',
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
        fontWeight: '900',
        color: '#1b3358',
    },
    closeBtn: {
        padding: 5,
    },
    instructions: {
        fontSize: 14,
        color: '#666',
        marginBottom: 25,
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#f0f2f5',
        padding: 20,
        borderRadius: 12,
        fontSize: 32,
        fontWeight: '900',
        color: '#1b3358',
        textAlign: 'center',
        letterSpacing: 8,
        borderWidth: 2,
        borderColor: '#87ca37',
    },
    joinBtn: {
        backgroundColor: '#87ca37',
        padding: 18,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
    },
    joinBtnText: {
        color: 'white',
        fontWeight: '900',
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
        color: '#666',
        fontWeight: '600',
    },
});
