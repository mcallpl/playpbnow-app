import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

export interface Player {
    id: string;
    first_name: string;
    last_name?: string;
    gender?: string;
}

export interface GameData {
    id: string;
    team1: Player[];
    team2: Player[];
    score_team1?: number;
    score_team2?: number;
}

export interface RoundData {
    id: string;
    games: GameData[];
    byes: Player[];
    type: string;
}

// ── RULE: 2 males NEVER play 2 females ──────────────────────────
function isGenderIllegal(t1: Player[], t2: Player[]): boolean {
    const t1AllMale  = t1.every(p => !(p.gender || '').toLowerCase().startsWith('f'));
    const t1AllFemale= t1.every(p =>  (p.gender || '').toLowerCase().startsWith('f'));
    const t2AllMale  = t2.every(p => !(p.gender || '').toLowerCase().startsWith('f'));
    const t2AllFemale= t2.every(p =>  (p.gender || '').toLowerCase().startsWith('f'));
    return (t1AllMale && t2AllFemale) || (t1AllFemale && t2AllMale);
}

// Generate a fixed-teams round-robin schedule using the circle method
export const generateFixedTeamsLocal = (teams: { player1: Player; player2: Player }[]): RoundData[] => {
    const n = teams.length;
    if (n < 2) return [];

    const teamList = [...teams];
    const hasBye = n % 2 !== 0;
    if (hasBye) teamList.push({ player1: { id: 'BYE', first_name: 'BYE', gender: '' } as Player, player2: { id: 'BYE', first_name: 'BYE', gender: '' } as Player });
    const total = teamList.length;
    const numRounds = total - 1;
    const schedule: RoundData[] = [];

    for (let round = 0; round < numRounds; round++) {
        const games: GameData[] = [];
        const byes: Player[] = [];
        for (let i = 0; i < total / 2; i++) {
            let homeIdx: number, awayIdx: number;
            if (i === 0) {
                homeIdx = 0;
                awayIdx = (round % (total - 1)) + 1;
            } else {
                homeIdx = ((round + i) % (total - 1)) + 1;
                awayIdx = ((round + total - 1 - i) % (total - 1)) + 1;
            }
            const t1 = teamList[homeIdx];
            const t2 = teamList[awayIdx];
            if (t1.player1.id === 'BYE') { byes.push(t2.player1, t2.player2); continue; }
            if (t2.player1.id === 'BYE') { byes.push(t1.player1, t1.player2); continue; }
            games.push({
                id: `fg-${round}-${i}-${Math.random().toString(36).substr(2, 6)}`,
                team1: [t1.player1, t1.player2],
                team2: [t2.player1, t2.player2],
            });
        }
        schedule.push({ id: `fr-${round}-${Date.now()}`, type: 'fixed', games, byes });
    }
    return schedule;
};

export const useGameLogic = (
    initialScheduleJson: string | undefined,
    playersData: Player[],
    currentRoster: Player[],
    groupName: string,
    isFixedTeams: boolean = false
) => {
    const [schedule, setSchedule] = useState<RoundData[]>([]);
    const [loading, setLoading] = useState(false);
    // swapSource tracks which player spot was first tapped (tap-to-swap)
    const [swapSource, setSwapSource] = useState<{r: number, g: number, t: number, p: number} | null>(null);

    // ── INIT SCHEDULE ────────────────────────────────────────────
    useEffect(() => {
        if (!initialScheduleJson) return;
        try {
            const parsed = JSON.parse(initialScheduleJson);
            const safeSchedule = parsed.map((round: any, rIdx: number) => ({
                ...round,
                id: round.id || `round-${rIdx}`,
                games: round.games.map((g: any, gIdx: number) => ({
                    ...g,
                    id: g.id || `game-${rIdx}-${gIdx}-${Date.now()}`,
                    score_team1: g.score_team1 || 0,
                    score_team2: g.score_team2 || 0
                }))
            }));
            setSchedule(safeSchedule);
        } catch (e) {
            Alert.alert('Error', 'Could not load match schedule.');
        }
    }, [initialScheduleJson]);

    // ── PARTNER CONFLICT: counts how many times each pair plays together ──
    // Used to turn player boxes orange when a pair appears more than once
    const partnerCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        schedule.forEach((round) => {
            round.games.forEach((game) => {
                [game.team1, game.team2].forEach((team) => {
                    if (team.length === 2) {
                        const key = [team[0].id, team[1].id].sort().join('-');
                        counts[key] = (counts[key] || 0) + 1;
                    }
                });
            });
        });
        return counts;
    }, [schedule]);

    // ── RULE 1: SWAP PLAYERS (tap-to-swap, same round only) ─────
    // Rule 1a: Swaps only within the same round
    // Rule 1b: Dropped player goes to source spot; source player goes to target spot
    const handlePlayerTap = (rIdx: number, gIdx: number, tIdx: number, pIdx: number) => {
        if (!swapSource) {
            // First tap: select this player
            setSwapSource({ r: rIdx, g: gIdx, t: tIdx, p: pIdx });
            return;
        }

        // Tapping same spot: deselect
        if (swapSource.r === rIdx && swapSource.g === gIdx && swapSource.t === tIdx && swapSource.p === pIdx) {
            setSwapSource(null);
            return;
        }

        // Rule 1a: only within same round
        if (swapSource.r !== rIdx) {
            Alert.alert('Locked', 'You can only swap players within the same round.');
            setSwapSource(null);
            return;
        }

        const newSchedule = JSON.parse(JSON.stringify(schedule));
        const round = newSchedule[rIdx];

        const getPlayer = (g: number, t: number, p: number): Player =>
            t === 1 ? round.games[g].team1[p] : round.games[g].team2[p];
        const setPlayer = (g: number, t: number, p: number, val: Player) => {
            if (t === 1) round.games[g].team1[p] = val;
            else round.games[g].team2[p] = val;
        };

        // Rule 1b: true swap — each goes to the other's spot
        const srcPlayer = getPlayer(swapSource.g, swapSource.t, swapSource.p);
        const tgtPlayer = getPlayer(gIdx, tIdx, pIdx);
        setPlayer(swapSource.g, swapSource.t, swapSource.p, tgtPlayer);
        setPlayer(gIdx, tIdx, pIdx, srcPlayer);

        setSchedule(newSchedule);
        setSwapSource(null);
    };

    // ── RULE 4: EDIT PLAYER NAME INLINE ─────────────────────────
    const handlePlayerNameChange = (rIdx: number, gIdx: number, tIdx: number, pIdx: number, newName: string) => {
        const newSchedule = JSON.parse(JSON.stringify(schedule));
        const round = newSchedule[rIdx];
        if (tIdx === 1) {
            round.games[gIdx].team1[pIdx].first_name = newName;
        } else {
            round.games[gIdx].team2[pIdx].first_name = newName;
        }
        setSchedule(newSchedule);
    };

    const history = useMemo(() => {
        const flatMatches: any[] = [];
        schedule.forEach((round, rIdx) => {
            round.games.forEach((game) => {
                flatMatches.push({
                    ...game,
                    round_number: rIdx + 1,
                    timestamp: new Date().toISOString()
                });
            });
        });
        return flatMatches;
    }, [schedule]);

    const updateGame = (gameId: string, updates: Partial<GameData>) => {
        const newSchedule = [...schedule];
        for (let r = 0; r < newSchedule.length; r++) {
            const idx = newSchedule[r].games.findIndex(g => g.id === gameId);
            if (idx !== -1) {
                newSchedule[r].games[idx] = { ...newSchedule[r].games[idx], ...updates };
                setSchedule(newSchedule);
                break;
            }
        }
    };

    // ── LOCAL SHUFFLE ────────────────────────────────────────────
    // Rules enforced:
    // - 2 players may NOT be on the same team more than once per match
    // - 2 males NEVER play 2 females
    const generateLocalSchedule = (
        allPlayers: Player[],
        roundConfigs: { id: string; type: string }[]
    ): RoundData[] => {
        const newSchedule: RoundData[] = [];
        // Track all pairs that have played together so far in THIS match
        const partnerHistory = new Map<string, number>();

        const pairKey = (p1: Player, p2: Player) =>
            [p1.id, p2.id].sort().join('-');

        const getPairCount = (p1: Player, p2: Player) =>
            partnerHistory.get(pairKey(p1, p2)) || 0;

        const addPair = (p1: Player, p2: Player) => {
            const k = pairKey(p1, p2);
            partnerHistory.set(k, (partnerHistory.get(k) || 0) + 1);
        };

        const isMale   = (p: Player) => !(p.gender || '').toLowerCase().startsWith('f');
        const isFemale = (p: Player) =>  (p.gender || '').toLowerCase().startsWith('f');

        // Try to build a valid 4-player game; returns null if impossible
        const tryMakeGame = (a: Player, b: Player, c: Player, d: Player): GameData | null => {
            // Rule: no pair may have played together before
            if (getPairCount(a, b) >= 1 || getPairCount(c, d) >= 1) return null;
            // Rule: 2 males NEVER play 2 females
            if (isGenderIllegal([a, b], [c, d])) return null;
            return {
                id: Math.random().toString(36).substr(2, 9),
                team1: [a, b], team2: [c, d],
                score_team1: 0, score_team2: 0
            };
        };

        // Shuffle pool and attempt to build all games in one pass; retry up to maxRetries
        const processPool = (pool: Player[], maxRetries = 200) => {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                const shuffled = [...pool].sort(() => Math.random() - 0.5);
                const games: GameData[] = [];
                let valid = true;

                for (let i = 0; i + 3 < shuffled.length; i += 4) {
                    const game = tryMakeGame(
                        shuffled[i], shuffled[i + 1],
                        shuffled[i + 2], shuffled[i + 3]
                    );
                    if (!game) { valid = false; break; }
                    games.push(game);
                }

                if (valid) {
                    const leftovers = shuffled.slice(Math.floor(shuffled.length / 4) * 4);
                    return { games, leftovers };
                }
            }

            // Fallback: allow repeats but still enforce gender rule
            const shuffled = [...pool].sort(() => Math.random() - 0.5);
            const games: GameData[] = [];
            for (let i = 0; i + 3 < shuffled.length; i += 4) {
                // Still enforce gender rule even in fallback
                let a = shuffled[i], b = shuffled[i+1], c = shuffled[i+2], d = shuffled[i+3];
                if (isGenderIllegal([a,b],[c,d])) {
                    // try swapping b and c
                    [b, c] = [c, b];
                }
                games.push({
                    id: Math.random().toString(36).substr(2, 9),
                    team1: [a, b], team2: [c, d],
                    score_team1: 0, score_team2: 0
                });
            }
            return { games, leftovers: shuffled.slice(Math.floor(shuffled.length / 4) * 4) };
        };

        for (const config of roundConfigs) {
            let roundGames: GameData[] = [];
            let roundByes: Player[] = [];

            if (config.type === 'gender') {
                const men   = allPlayers.filter(isMale);
                const women = allPlayers.filter(isFemale);
                const others = allPlayers.filter(p => !isMale(p) && !isFemale(p));

                const mResult = processPool(men);
                const fResult = processPool(women);
                const oResult = processPool([...others, ...mResult.leftovers, ...fResult.leftovers]);

                roundGames = [...mResult.games, ...fResult.games, ...oResult.games];
                roundByes  = oResult.leftovers;

            } else if (config.type === 'mixed') {
                // Mixed: enforce 1M+1F per team where possible
                const men   = allPlayers.filter(isMale);
                const women = allPlayers.filter(isFemale);
                let bestGames: GameData[] = [];
                let bestByes: Player[] = [...allPlayers];

                for (let attempt = 0; attempt < 200; attempt++) {
                    const mCopy = [...men].sort(() => Math.random() - 0.5);
                    const wCopy = [...women].sort(() => Math.random() - 0.5);
                    const games: GameData[] = [];
                    let valid = true;

                    while (mCopy.length >= 2 && wCopy.length >= 2) {
                        const m1 = mCopy.pop()!; const f1 = wCopy.pop()!;
                        const m2 = mCopy.pop()!; const f2 = wCopy.pop()!;
                        const game = tryMakeGame(m1, f1, m2, f2);
                        if (!game) { valid = false; break; }
                        games.push(game);
                    }

                    if (valid) {
                        // Put any leftover M or F into additional games via processPool
                        const leftovers = [...mCopy, ...wCopy];
                        if (leftovers.length >= 4) {
                            const extra = processPool(leftovers);
                            bestGames = [...games, ...extra.games];
                            bestByes = extra.leftovers;
                        } else {
                            bestGames = games;
                            bestByes = leftovers;
                        }
                        break;
                    }

                    // Track best attempt (most games) even if not fully valid
                    if (games.length > bestGames.length) {
                        bestGames = games;
                        const usedIds = new Set(games.flatMap(g => [...g.team1, ...g.team2].map(p => p.id)));
                        bestByes = allPlayers.filter(p => !usedIds.has(p.id));
                    }
                }

                if (bestGames.length === 0) {
                    // fallback to any pool
                    const result = processPool(allPlayers);
                    bestGames = result.games;
                    bestByes = result.leftovers;
                }

                roundGames = bestGames;
                roundByes = bestByes;

            } else {
                // Mixer
                const result = processPool(allPlayers);
                roundGames = result.games;
                roundByes  = result.leftovers;
            }

            roundGames.forEach(g => {
                addPair(g.team1[0], g.team1[1]);
                addPair(g.team2[0], g.team2[1]);
            });

            newSchedule.push({
                id: `round-${newSchedule.length}`,
                type: config.type,
                games: roundGames,
                byes: roundByes
            });
        }

        return newSchedule;
    };

    const performShuffle = async (): Promise<boolean> => {
        // Build the most complete player list: prefer currentRoster, fall back to playersData,
        // then extract from the schedule itself as last resort
        let rosterToUse = currentRoster.length > 0 ? currentRoster : playersData;
        console.log('Shuffle: currentRoster=' + currentRoster.length + ' playersData=' + playersData.length + ' schedule=' + schedule.length);
        if (rosterToUse.length === 0 && schedule.length > 0) {
            const seen = new Set<string>();
            const extracted: Player[] = [];
            schedule.forEach(round => {
                [...round.games.flatMap(g => [...g.team1, ...g.team2]), ...round.byes].forEach(p => {
                    if (!seen.has(p.id)) { seen.add(p.id); extracted.push(p); }
                });
            });
            rosterToUse = extracted;
            console.log('Shuffle: extracted ' + extracted.length + ' players from schedule');
        }
        if (rosterToUse.length === 0) {
            Alert.alert('Error', 'No player data available to shuffle.');
            return false;
        }

        // Fixed teams mode: extract teams from schedule and regenerate with shuffled round order
        if (isFixedTeams) {
            setLoading(true);
            return new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    try {
                        // Extract fixed teams from the current schedule
                        const teamMap = new Map<string, { player1: Player; player2: Player }>();
                        schedule.forEach(round => {
                            round.games.forEach(game => {
                                if (game.team1.length === 2) {
                                    const key = [game.team1[0].id, game.team1[1].id].sort().join('-');
                                    if (!teamMap.has(key)) teamMap.set(key, { player1: game.team1[0], player2: game.team1[1] });
                                }
                                if (game.team2.length === 2) {
                                    const key = [game.team2[0].id, game.team2[1].id].sort().join('-');
                                    if (!teamMap.has(key)) teamMap.set(key, { player1: game.team2[0], player2: game.team2[1] });
                                }
                            });
                        });
                        const teams = Array.from(teamMap.values());
                        // Shuffle team order for variety
                        for (let i = teams.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [teams[i], teams[j]] = [teams[j], teams[i]];
                        }
                        const newSchedule = generateFixedTeamsLocal(teams);
                        setSchedule(newSchedule);
                        setSwapSource(null);
                    } catch (e: any) {
                        Alert.alert('Error', 'Shuffle failed: ' + e.message);
                    } finally {
                        setLoading(false);
                    }
                    resolve(true);
                }, 100);
            });
        }

        const currentRoundConfigs = schedule.length > 0
            ? schedule.map((r, i) => ({ id: (i + 1).toString(), type: r.type }))
            : Array(5).fill(null).map((_, i) => ({ id: (i + 1).toString(), type: 'mixer' }));

        console.log('Shuffle: ' + rosterToUse.length + ' players, ' + currentRoundConfigs.length + ' rounds');
        setLoading(true);

        return new Promise<boolean>((resolve) => {
            setTimeout(() => {
                try {
                    const newSchedule = generateLocalSchedule(rosterToUse, currentRoundConfigs);
                    console.log('Shuffle result: ' + newSchedule.length + ' rounds, games per round: ' + newSchedule.map(r => r.games.length).join(','));
                    setSchedule(newSchedule);
                    setSwapSource(null);
                } catch (e: any) {
                    console.error('Shuffle error:', e);
                    Alert.alert('Error', 'Shuffle failed: ' + e.message);
                } finally {
                    setLoading(false);
                }
                resolve(true);
            }, 100);
        });
    };

    return {
        schedule,
        setSchedule,
        loading,
        swapSource,
        setSwapSource,
        partnerCounts,
        handlePlayerTap,
        handlePlayerNameChange,
        performShuffle,
        updateGame,
        history,
        players: playersData
    };
};
