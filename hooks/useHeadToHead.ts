import { useEffect, useMemo, useState } from 'react';

export interface RosterItem {
    id: string;
    name: string;
}

export interface MatchRecord {
    id?: string | number;
    group?: string;
    batch_id?: string;
    timestamp: number;
    date?: string;
    p1: string; p2: string; p3: string; p4: string;
    p1_name: string; p2_name: string; p3_name: string; p4_name: string;
    s1: number; s2: number;
    label?: string;
    device_id?: string | number;
    match_title?: string;
    isYours?: boolean;
}

export const useHeadToHead = (
    groupName: string,
    history: MatchRecord[],
    roster: RosterItem[],
    deviceId: string,
    isGlobal: boolean
) => {
    const [p1, setP1] = useState<RosterItem | null>(null);
    const [p2, setP2] = useState<RosterItem | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [filteredMatches, setFilteredMatches] = useState<MatchRecord[]>([]);

    // Build opponent map using player IDs
    const opponentMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        history.forEach(m => {
            // Use IDs directly
            const team1 = [m.p1, m.p2].filter(k => k);
            const team2 = [m.p3, m.p4].filter(k => k);

            team1.forEach(playerKey => {
                if (!map.has(playerKey)) map.set(playerKey, new Set());
                team2.forEach(oppKey => map.get(playerKey)?.add(oppKey));
            });
            team2.forEach(playerKey => {
                if (!map.has(playerKey)) map.set(playerKey, new Set());
                team1.forEach(oppKey => map.get(playerKey)?.add(oppKey));
            });
        });
        return map;
    }, [history]);

    console.log('🗺️ OpponentMap size:', opponentMap.size);
    console.log('🗺️ Sample keys:', Array.from(opponentMap.keys()).slice(0, 5));
    console.log('🗺️ History length:', history.length);
    console.log('🗺️ Sample history p1:', history[0]?.p1, 'p1_name:', history[0]?.p1_name);

    useEffect(() => {
        if (p1 && p2) {
            calculateStats(p1.id, p2.id);
        } else {
            setStats(null);
            setFilteredMatches([]);
        }
    }, [p1, p2, history]);

    const calculateStats = (id1: string, id2: string) => {
        let p1_wins = 0;
        let p2_wins = 0;
        let total = 0;
        let diff = 0;
        const matches: MatchRecord[] = [];

        history.forEach(m => {
            // Use IDs from match record
            const ids = [m.p1, m.p2, m.p3, m.p4];

            const p1Index = ids.indexOf(id1);
            const p2Index = ids.indexOf(id2);

            if (p1Index === -1 || p2Index === -1) return;

            const p1Team = p1Index <= 1 ? 1 : 2;
            const p2Team = p2Index <= 1 ? 1 : 2;

            // Skip if they're on the same team
            if (p1Team === p2Team) return;

            const safeMatch = {
                ...m,
                s1: Number(m.s1),
                s2: Number(m.s2),
                timestamp: Number(m.timestamp)
            };

            matches.push(safeMatch);
            total++;

            const winningTeam = safeMatch.s1 > safeMatch.s2 ? 1 : 2;

            if (p1Team === winningTeam) p1_wins++;
            else p2_wins++;

            if (p1Team === 1) diff += (safeMatch.s1 - safeMatch.s2);
            else diff += (safeMatch.s2 - safeMatch.s1);
        });

        setStats({ p1_wins, p2_wins, total, diff });
        setFilteredMatches(matches.sort((a, b) => b.timestamp - a.timestamp));
    };

    const getOptionsForP1 = () => {
        if (p2) {
            const opponents = opponentMap.get(p2.id);
            if (!opponents) return [];
            return roster.filter(r => opponents.has(r.id));
        }
        return roster;
    };

    const getOptionsForP2 = () => {
        if (p1) {
            const opponents = opponentMap.get(p1.id);
            if (!opponents) return [];
            return roster.filter(r => opponents.has(r.id));
        }
        return roster;
    };

    const reset = () => {
        setP1(null);
        setP2(null);
        setStats(null);
        setFilteredMatches([]);
    };

    return {
        p1, setP1,
        p2, setP2,
        stats,
        filteredMatches, 
        reset,
        getOptionsForP1,
        getOptionsForP2
    };
};