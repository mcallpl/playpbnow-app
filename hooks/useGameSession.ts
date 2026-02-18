import { useState } from 'react';
import { Alert } from 'react-native';

const API_URL = 'https://peoplestar.com/Chipleball/api';

interface GameSessionHookResult {
    sessionId: string;
    shareCode: string;
    isLiveSession: boolean;
    isCollaborator: boolean;
    createLiveSession: (groupName: string, groupKey: string, userId: string, players: any[], schedule: any[]) => Promise<void>;
    loadSharedSession: (shareCode: string, setSchedule: (schedule: any[]) => void, setScores: (scores: any) => void) => Promise<void>;
}

export function useGameSession(
    incomingShareCode?: string
): GameSessionHookResult {
    const [sessionId, setSessionId] = useState('');
    const [shareCode, setShareCode] = useState('');
    const [isLiveSession, setIsLiveSession] = useState(false);
    const [isCollaborator] = useState(!!incomingShareCode);

    const createLiveSession = async (
        groupName: string,
        groupKey: string,
        userId: string,
        players: any[],
        schedule: any[]
    ) => {
        if (sessionId) return; // Already created

        try {
            console.log('🎾 Creating live session...');
            
            const response = await fetch(`${API_URL}/create_live_session.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_name: groupName,
                    group_key: groupKey,
                    user_id: userId,
                    players: players,
                    schedule: schedule
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                setSessionId(data.session.batch_id);
                setShareCode(data.session.share_code);
                setIsLiveSession(true);
                console.log('✅ Live session created:', data.session.share_code);
            } else {
                console.error('Failed to create session:', data.message);
            }
        } catch (error) {
            console.error('Error creating live session:', error);
        }
    };

    const loadSharedSession = async (
        code: string,
        setSchedule: (schedule: any[]) => void,
        setScores: (scores: any) => void
    ) => {
        try {
            console.log('🔗 Loading shared session:', code);

            const response = await fetch(`${API_URL}/get_live_session.php?share_code=${code}`);
            const data = await response.json();

            if (data.status === 'success') {
                setSessionId(data.session.batch_id);
                setShareCode(data.session.share_code);
                setSchedule(data.schedule);
                setIsLiveSession(true);

                // Load scores from database - skip zeros
                const loadedScores: any = {};
                data.schedule.forEach((round: any, roundIdx: number) => {
                    round.games.forEach((game: any, gameIdx: number) => {
                        const s1 = game.s1;
                        const s2 = game.s2;
                        
                        // Only set if non-zero (avoids showing "0")
                        if (s1 && parseInt(s1) > 0) {
                            loadedScores[`${roundIdx}_${gameIdx}_t1`] = s1.toString();
                        }
                        if (s2 && parseInt(s2) > 0) {
                            loadedScores[`${roundIdx}_${gameIdx}_t2`] = s2.toString();
                        }
                    });
                });
                setScores(loadedScores);

                console.log('✅ Loaded shared session with', data.schedule.length, 'rounds');
            } else {
                Alert.alert('Error', data.message || 'Could not load shared match');
            }
        } catch (error) {
            console.error('Failed to load shared session:', error);
            Alert.alert('Error', 'Could not load shared match');
        }
    };

    return {
        sessionId,
        shareCode,
        isLiveSession,
        isCollaborator,
        createLiveSession,
        loadSharedSession
    };
}
