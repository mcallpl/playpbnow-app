import { useEffect } from 'react';

const API_URL = 'https://peoplestar.com/Chipleball/api';

interface ScoreSyncHookParams {
    isCollaborator: boolean;
    shareCode: string;
    setScores: (scores: any) => void;
}

export function useScoreSync({ isCollaborator, shareCode, setScores }: ScoreSyncHookParams) {
    // Poll for score updates if collaborator
    useEffect(() => {
        if (!isCollaborator || !shareCode) return;

        console.log('🔄 Starting score sync polling...');

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}/get_live_session.php?share_code=${shareCode}`);
                const data = await response.json();

                if (data.status === 'success') {
                    // Update scores from server - MERGE with existing, don't replace
                    setScores(prevScores => {
                        const updatedScores = { ...prevScores };
                        data.schedule.forEach((round: any, roundIdx: number) => {
                            round.games.forEach((game: any, gameIdx: number) => {
                                const key1 = `${roundIdx}_${gameIdx}_t1`;
                                const key2 = `${roundIdx}_${gameIdx}_t2`;
                                
                                // Only update if there's a new non-zero value from server
                                // AND we don't already have a value (don't overwrite partial input)
                                if (game.s1 && game.s1 > 0) {
                                    // Only update if empty OR different from server
                                    if (!prevScores[key1] || prevScores[key1] === '' || prevScores[key1] !== game.s1.toString()) {
                                        updatedScores[key1] = game.s1.toString();
                                    }
                                }
                                if (game.s2 && game.s2 > 0) {
                                    // Only update if empty OR different from server
                                    if (!prevScores[key2] || prevScores[key2] === '' || prevScores[key2] !== game.s2.toString()) {
                                        updatedScores[key2] = game.s2.toString();
                                    }
                                }
                            });
                        });
                        return updatedScores;
                    });
                }
            } catch (error) {
                console.error('Poll error:', error);
            }
        }, 500); // Poll every 500ms for tight sync

        return () => {
            console.log('🛑 Stopping score sync polling');
            clearInterval(pollInterval);
        };
    }, [isCollaborator, shareCode]);

    // Function to sync a score update to the server
    const syncScoreToServer = async (
        sessionId: string,
        roundNum: number,
        courtNum: number,
        s1: number,
        s2: number
    ) => {
        try {
            await fetch(`${API_URL}/update_live_score.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    round_num: roundNum,
                    court_num: courtNum,
                    s1,
                    s2
                })
            });
            console.log('✅ Score synced to server');
        } catch (error) {
            console.error('Failed to sync score:', error);
        }
    };

    return { syncScoreToServer };
}
