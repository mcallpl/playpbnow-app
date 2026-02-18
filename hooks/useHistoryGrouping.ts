import { useMemo } from 'react';
import { MatchRecord } from './useHeadToHead'; // Adjust path if necessary

export const useHistoryGrouping = (history: MatchRecord[], sessionLabel: string) => {

    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const sections = useMemo(() => {
        if (!history || history.length === 0) return [];

        // 1. Group Matches strictly by Batch ID (or fallback to Date/Time)
        const groups: { [key: string]: MatchRecord[] } = {};
        
        history.forEach(match => {
            let key = match.batch_id;
            
            // Fallback: If no batch_id, group by specific hour to prevent session bleed
            if (!key) {
                const d = new Date(match.timestamp * 1000);
                key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
            }
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(match);
        });

        // 2. Process each group independently (Resets Round to 1 for each group)
        const processedGroups = Object.keys(groups).map(key => {
            // Sort Oldest -> Newest to calculate rounds naturally
            const sessionMatches = [...groups[key]].sort((a, b) => a.timestamp - b.timestamp);

            let currentRound = 1;
            let currentCourt = 1;
            let playersInRound = new Set<string>();

            const labeledMatches = sessionMatches.map((m, index) => {
                const p1 = (m.p1_name || m.p1 || '').trim().toLowerCase();
                const p2 = (m.p2_name || m.p2 || '').trim().toLowerCase();
                const p3 = (m.p3_name || m.p3 || '').trim().toLowerCase();
                const p4 = (m.p4_name || m.p4 || '').trim().toLowerCase();
                
                const currentPlayers = [p1, p2, p3, p4].filter(x => x);
                const hasOverlap = currentPlayers.some(player => playersInRound.has(player));

                // If players overlap, increment the round
                if (hasOverlap) {
                    currentRound++;
                    currentCourt = 1;
                    playersInRound.clear();
                }
                currentPlayers.forEach(p => playersInRound.add(p));

                const label = `Round ${currentRound} - ${getOrdinal(currentCourt)} Court`;
                currentCourt++;

                // Ensure unique ID for FlatList
                const uniqueId = m.id || `${m.timestamp}-${index}`;

                return { ...m, derivedLabel: label, _uniqueId: uniqueId };
            });

            // Return Section (Reverse data to show newest game at top of session)
            return {
                title: sessionLabel, 
                data: labeledMatches.reverse() 
            };
        });

        // 3. Reverse sections to show Newest Session at top of list
        return processedGroups.reverse();

    }, [history, sessionLabel]);

    return sections;
};