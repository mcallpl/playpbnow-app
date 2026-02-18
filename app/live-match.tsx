import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScoreUpdateToast } from '../components/ScoreUpdateToast';

const API_URL = 'https://peoplestar.com/Chipleball/api';
const POLL_INTERVAL = 3000; // 3 seconds

interface Match {
    id: number;
    round_num: number;
    court_num: number;
    p1_name: string;
    p2_name: string;
    p3_name: string;
    p4_name: string;
    s1: number;
    s2: number;
}

export default function LiveMatchScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    
    const sessionId = params.sessionId as string;
    const shareCode = params.shareCode as string;
    const groupName = params.groupName as string;
    const matchTitle = params.matchTitle as string;
    const isOwner = params.isOwner === 'true';
    
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [userId, setUserId] = useState('');
    
    // Toast notification state
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [recentlyChangedIds, setRecentlyChangedIds] = useState<number[]>([]);
    const previousMatchesRef = useRef<Match[]>([]);

    // Fetch match data
    const fetchMatchData = async () => {
        try {
            const uid = await AsyncStorage.getItem('user_id');
            
            const response = await fetch(`${API_URL}/join_match.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    share_code: shareCode,
                    user_id: uid
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                const newMatches = data.matches;
                
                // Detect changes and show notification
                if (previousMatchesRef.current.length > 0 && !loading) {
                    const changes = detectScoreChanges(previousMatchesRef.current, newMatches);
                    if (changes.length > 0) {
                        const change = changes[0]; // Show first change
                        setToastMessage(change);
                        setToastVisible(true);
                    }
                }
                
                previousMatchesRef.current = newMatches;
                setMatches(newMatches);
                setUserId(uid || '');
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // Detect what changed between old and new matches
    const detectScoreChanges = (oldMatches: Match[], newMatches: Match[]): string[] => {
        const changes: string[] = [];
        const changedIds: number[] = [];
        
        newMatches.forEach(newMatch => {
            const oldMatch = oldMatches.find(m => m.id === newMatch.id);
            
            if (oldMatch) {
                // Check if scores changed
                if (oldMatch.s1 !== newMatch.s1 || oldMatch.s2 !== newMatch.s2) {
                    const roundCourt = `Round ${newMatch.round_num}, Court ${newMatch.court_num}`;
                    const score = `${newMatch.s1}-${newMatch.s2}`;
                    changes.push(`${roundCourt}: ${score} updated!`);
                    changedIds.push(newMatch.id);
                }
            } else {
                // New match added
                changes.push(`New match added: Round ${newMatch.round_num}`);
                changedIds.push(newMatch.id);
            }
        });
        
        // Highlight changed matches
        if (changedIds.length > 0) {
            setRecentlyChangedIds(changedIds);
            // Clear highlight after 5 seconds
            setTimeout(() => {
                setRecentlyChangedIds([]);
            }, 5000);
        }
        
        return changes;
    };

    // Initial load
    useEffect(() => {
        fetchMatchData();
    }, []);

    // Polling - fetch every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchMatchData();
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [shareCode]);

    const renderMatch = ({ item }: { item: Match }) => {
        const isT1Win = item.s1 > item.s2;
        const isRecentlyChanged = recentlyChangedIds.includes(item.id);
        
        return (
            <View style={[
                styles.matchCard,
                isRecentlyChanged && styles.matchCardHighlight
            ]}>
                <View style={styles.matchHeader}>
                    <Text style={styles.matchLabel}>
                        Round {item.round_num} - Court {item.court_num}
                    </Text>
                    {isRecentlyChanged && (
                        <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>UPDATED</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.teamBlock, styles.teamBlockBlue]}>
                    <View style={styles.teamNames}>
                        <Text style={styles.teamText} numberOfLines={1}>{item.p1_name}</Text>
                        <Text style={styles.teamText} numberOfLines={1}>{item.p2_name}</Text>
                    </View>
                    <Text style={[styles.teamScore, isT1Win ? styles.scoreWin : styles.scoreLose]}>
                        {item.s1}
                    </Text>
                </View>

                <View style={[styles.teamBlock, styles.teamBlockRed]}>
                    <View style={styles.teamNames}>
                        <Text style={styles.teamText} numberOfLines={1}>{item.p3_name}</Text>
                        <Text style={styles.teamText} numberOfLines={1}>{item.p4_name}</Text>
                    </View>
                    <Text style={[styles.teamScore, !isT1Win ? styles.scoreWin : styles.scoreLose]}>
                        {item.s2}
                    </Text>
                </View>
            </View>
        );
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diff < 10) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Score Update Toast */}
            <ScoreUpdateToast 
                visible={toastVisible}
                message={toastMessage}
                onHide={() => setToastVisible(false)}
            />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{matchTitle || groupName}</Text>
                    <Text style={styles.subtitle}>LIVE MATCH</Text>
                </View>
                <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            <View style={styles.infoBar}>
                <View style={styles.shareCodeContainer}>
                    <Ionicons name="link" size={16} color="#87ca37" />
                    <Text style={styles.shareCodeText}>{shareCode}</Text>
                </View>
                <Text style={styles.lastUpdateText}>
                    Updated {formatTime(lastUpdate)}
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#87ca37" />
                    <Text style={styles.loadingText}>Loading match...</Text>
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMatch}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="tennisball-outline" size={64} color="#666" />
                            <Text style={styles.emptyText}>No scores yet</Text>
                            <Text style={styles.emptySubtext}>
                                Scores will appear here as they're entered
                            </Text>
                        </View>
                    }
                />
            )}

            {isOwner && (
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.editBtn}
                        onPress={() => {
                            router.push({
                                pathname: '/(tabs)/game',
                                params: { groupName }
                            });
                        }}
                    >
                        <Ionicons name="pencil" size={20} color="white" />
                        <Text style={styles.editBtnText}>EDIT SCORES</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b3358',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#152945',
    },
    backBtn: {
        padding: 8,
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
        fontStyle: 'italic',
    },
    subtitle: {
        fontSize: 12,
        color: '#87ca37',
        fontWeight: 'bold',
        marginTop: 2,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,0,0,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4444',
    },
    liveText: {
        color: '#ff4444',
        fontSize: 12,
        fontWeight: '900',
    },
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    shareCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    shareCodeText: {
        color: '#87ca37',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    lastUpdateText: {
        color: '#999',
        fontSize: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        marginTop: 15,
        fontSize: 16,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    matchCard: {
        backgroundColor: '#2c3e50',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#34495e',
    },
    matchCardHighlight: {
        borderColor: '#87ca37',
        borderWidth: 2,
        backgroundColor: 'rgba(135, 202, 55, 0.1)',
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    matchLabel: {
        color: '#bbb',
        fontWeight: 'bold',
        fontSize: 12,
    },
    newBadge: {
        backgroundColor: '#87ca37',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    newBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
    },
    teamBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    teamBlockBlue: {
        backgroundColor: 'rgba(52, 152, 219, 0.15)',
        borderLeftWidth: 4,
        borderLeftColor: '#3498db',
    },
    teamBlockRed: {
        backgroundColor: 'rgba(231, 76, 60, 0.15)',
        borderLeftWidth: 4,
        borderLeftColor: '#e74c3c',
    },
    teamNames: {
        flex: 1,
    },
    teamText: {
        color: '#eee',
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    teamScore: {
        fontSize: 24,
        fontWeight: '900',
    },
    scoreWin: {
        color: '#87ca37',
    },
    scoreLose: {
        color: '#999',
        opacity: 0.7,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptySubtext: {
        color: '#999',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#1b3358',
    },
    editBtn: {
        backgroundColor: '#87ca37',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    editBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
});
