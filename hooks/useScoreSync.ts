import { Dispatch, SetStateAction, useEffect } from 'react';

const API_URL = '/api';

type ScoreMap = Record<string, string>;

interface ScoreSyncHookParams {
    isCollaborator: boolean;
    shareCode: string;
    setScores: Dispatch<SetStateAction<ScoreMap>>;
}

export function useScoreSync({ isCollaborator, shareCode, setScores }: ScoreSyncHookParams) {
    // Poll for score updates if collaborator
    useEffect(() => {
        if (!isCollaborator || !shareCode) return;

        let pollInterval: NodeJS.Timeout | null = null;
        let pollCount = 0;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 3;
        const BASE_INTERVAL = 10000; // 10 seconds (improved from 500ms for efficiency)
        const MAX_BACKOFF_INTERVAL = 60000; // 60 seconds max

        console.log('🔄 Starting score sync polling (10s interval)...');

        const startPolling = (interval: number = BASE_INTERVAL) => {
            pollInterval = setInterval(async () => {
                pollCount++;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                    const response = await fetch(`${API_URL}/get_live_session.php?share_code=${shareCode}`, {
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        consecutiveErrors++;
                        console.warn(`[Poll #${pollCount}] HTTP ${response.status}`);

                        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                            console.error(`[Poll #${pollCount}] ${consecutiveErrors} consecutive errors, implementing exponential backoff`);
                            clearInterval(pollInterval!);
                            const nextInterval = Math.min(interval * 2, MAX_BACKOFF_INTERVAL);
                            startPolling(nextInterval);
                        }
                        return;
                    }

                    const data = await response.json();

                    if (data.status === 'success') {
                        consecutiveErrors = 0; // Reset error counter on success

                        // Update scores from server - MERGE with existing, don't replace
                        setScores((prevScores: ScoreMap) => {
                            const updatedScores = { ...prevScores };
                            data.schedule?.forEach((round: any, roundIdx: number) => {
                                round.games?.forEach((game: any, gameIdx: number) => {
                                    const key1 = `${roundIdx}_${gameIdx}_t1`;
                                    const key2 = `${roundIdx}_${gameIdx}_t2`;

                                    // Only update if there's a new non-zero value from server
                                    // AND we don't already have a value (don't overwrite partial input)
                                    if (game.s1 && game.s1 > 0) {
                                        if (!prevScores[key1] || prevScores[key1] === '' || prevScores[key1] !== game.s1.toString()) {
                                            updatedScores[key1] = game.s1.toString();
                                        }
                                    }
                                    if (game.s2 && game.s2 > 0) {
                                        if (!prevScores[key2] || prevScores[key2] === '' || prevScores[key2] !== game.s2.toString()) {
                                            updatedScores[key2] = game.s2.toString();
                                        }
                                    }
                                });
                            });
                            return updatedScores;
                        });
                    } else if (data.status === 'error') {
                        consecutiveErrors++;
                        console.warn(`[Poll #${pollCount}] Server error: ${data.message}`);
                    }
                } catch (error) {
                    consecutiveErrors++;
                    if (error instanceof Error && error.name === 'AbortError') {
                        console.warn(`[Poll #${pollCount}] Request timeout`);
                    } else {
                        console.error(`[Poll #${pollCount}] Error:`, error);
                    }

                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        console.error(`[Poll #${pollCount}] ${consecutiveErrors} consecutive errors, implementing exponential backoff`);
                        clearInterval(pollInterval!);
                        const nextInterval = Math.min(interval * 2, MAX_BACKOFF_INTERVAL);
                        startPolling(nextInterval);
                    }
                }
            }, interval);
        };

        startPolling();

        return () => {
            if (pollInterval) {
                console.log('🛑 Stopping score sync polling');
                clearInterval(pollInterval);
            }
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
