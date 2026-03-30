// Team standings calculator for Fixed Teams tournament mode

interface Player {
    id: string;
    first_name: string;
    gender?: string;
}

interface RoundData {
    id: string;
    type: string;
    games: { team1: Player[]; team2: Player[]; }[];
    byes: Player[];
}

export interface TeamStanding {
    teamIndex: number;
    teamKey: string; // sorted player IDs joined
    players: Player[];
    wins: number;
    losses: number;
    pointDiff: number;
    winPct: number;
    seed: number;
}

// Build a unique key for a team (pair of players) by sorting their IDs
const teamKey = (players: Player[]): string =>
    players.map(p => p.id).sort().join('-');

/**
 * Calculate team standings from round-robin scores.
 * Only considers rounds up to roundRobinCount (excludes playoff rounds).
 */
export function calculateTeamStandings(
    schedule: RoundData[],
    scores: Record<string, string>,
    roundRobinCount: number
): TeamStanding[] {
    const stats: Record<string, TeamStanding> = {};

    // Process only round-robin rounds
    for (let rIdx = 0; rIdx < roundRobinCount && rIdx < schedule.length; rIdx++) {
        const round = schedule[rIdx];
        round.games.forEach((game, gIdx) => {
            const s1 = parseInt(scores[`${rIdx}_${gIdx}_t1`] || '0');
            const s2 = parseInt(scores[`${rIdx}_${gIdx}_t2`] || '0');
            if (s1 === 0 && s2 === 0) return; // unscored

            const t1Key = teamKey(game.team1);
            const t2Key = teamKey(game.team2);

            if (!stats[t1Key]) stats[t1Key] = { teamIndex: 0, teamKey: t1Key, players: game.team1, wins: 0, losses: 0, pointDiff: 0, winPct: 0, seed: 0 };
            if (!stats[t2Key]) stats[t2Key] = { teamIndex: 0, teamKey: t2Key, players: game.team2, wins: 0, losses: 0, pointDiff: 0, winPct: 0, seed: 0 };

            const diff = s1 - s2;
            if (s1 > s2) {
                stats[t1Key].wins++;
                stats[t2Key].losses++;
            } else if (s2 > s1) {
                stats[t2Key].wins++;
                stats[t1Key].losses++;
            }
            stats[t1Key].pointDiff += diff;
            stats[t2Key].pointDiff -= diff;
        });
    }

    // Calculate win percentage
    const standings = Object.values(stats).map(s => ({
        ...s,
        winPct: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0,
    }));

    // Sort: winPct desc, then head-to-head, then pointDiff desc
    standings.sort((a, b) => {
        if (b.winPct !== a.winPct) return b.winPct - a.winPct;

        // Head-to-head tiebreaker: check if these two teams played each other
        const h2h = getHeadToHead(a.teamKey, b.teamKey, schedule, scores, roundRobinCount);
        if (h2h !== 0) return h2h; // positive = a wins h2h, negative = b wins

        // Point differential
        return b.pointDiff - a.pointDiff;
    });

    // Assign seeds
    standings.forEach((s, i) => { s.seed = i + 1; s.teamIndex = i; });

    return standings;
}

/**
 * Head-to-head comparison: returns positive if teamA beat teamB, negative if B beat A, 0 if tied/didn't play
 */
function getHeadToHead(
    teamAKey: string,
    teamBKey: string,
    schedule: RoundData[],
    scores: Record<string, string>,
    roundRobinCount: number
): number {
    let aWins = 0, bWins = 0;

    for (let rIdx = 0; rIdx < roundRobinCount && rIdx < schedule.length; rIdx++) {
        schedule[rIdx].games.forEach((game, gIdx) => {
            const t1Key = teamKey(game.team1);
            const t2Key = teamKey(game.team2);
            const s1 = parseInt(scores[`${rIdx}_${gIdx}_t1`] || '0');
            const s2 = parseInt(scores[`${rIdx}_${gIdx}_t2`] || '0');

            if (t1Key === teamAKey && t2Key === teamBKey) {
                if (s1 > s2) aWins++; else if (s2 > s1) bWins++;
            } else if (t1Key === teamBKey && t2Key === teamAKey) {
                if (s1 > s2) bWins++; else if (s2 > s1) aWins++;
            }
        });
    }

    return bWins - aWins; // negative means A is better (for sort: return negative to rank A higher)
}

/**
 * Generate semifinal rounds from standings.
 * SF1: #1 seed vs #4 seed, SF2: #2 seed vs #3 seed
 */
export function generateSemifinals(standings: TeamStanding[]): RoundData[] {
    if (standings.length < 4) return [];

    const sf1: RoundData = {
        id: `playoff-sf1-${Date.now()}`,
        type: 'semifinal',
        games: [{
            team1: standings[0].players,
            team2: standings[3].players,
        }],
        byes: [],
    };
    const sf2: RoundData = {
        id: `playoff-sf2-${Date.now()}`,
        type: 'semifinal',
        games: [{
            team1: standings[1].players,
            team2: standings[2].players,
        }],
        byes: [],
    };
    return [sf1, sf2];
}

/**
 * Generate gold and bronze match rounds from semifinal results.
 */
export function generateFinals(
    schedule: RoundData[],
    scores: Record<string, string>,
    semiStartIndex: number
): RoundData[] {
    const sf1Round = schedule[semiStartIndex];
    const sf2Round = schedule[semiStartIndex + 1];
    if (!sf1Round || !sf2Round) return [];

    const sf1s1 = parseInt(scores[`${semiStartIndex}_0_t1`] || '0');
    const sf1s2 = parseInt(scores[`${semiStartIndex}_0_t2`] || '0');
    const sf2s1 = parseInt(scores[`${semiStartIndex + 1}_0_t1`] || '0');
    const sf2s2 = parseInt(scores[`${semiStartIndex + 1}_0_t2`] || '0');

    const sf1Winner = sf1s1 >= sf1s2 ? sf1Round.games[0].team1 : sf1Round.games[0].team2;
    const sf1Loser = sf1s1 >= sf1s2 ? sf1Round.games[0].team2 : sf1Round.games[0].team1;
    const sf2Winner = sf2s1 >= sf2s2 ? sf2Round.games[0].team1 : sf2Round.games[0].team2;
    const sf2Loser = sf2s1 >= sf2s2 ? sf2Round.games[0].team2 : sf2Round.games[0].team1;

    const goldMatch: RoundData = {
        id: `playoff-gold-${Date.now()}`,
        type: 'gold',
        games: [{ team1: sf1Winner, team2: sf2Winner }],
        byes: [],
    };
    const bronzeMatch: RoundData = {
        id: `playoff-bronze-${Date.now()}`,
        type: 'bronze',
        games: [{ team1: sf1Loser, team2: sf2Loser }],
        byes: [],
    };
    return [bronzeMatch, goldMatch]; // bronze first, then gold (grand finale)
}
