import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export interface LeaderboardItem {
  id: string;
  name: string;
  w: number;
  l: number;
  diff: number;
  pct: number;
  badges: string[];
  rank?: string;
  dupr?: number | null;
}

export interface RosterItem {
  id: string;
  name: string;
}

export interface SessionOption {
    id: string;
    timestamp: number;
    label?: string; 
}

export interface UniversalSession {
    group: string;
    id: string;
    timestamp: number;
    label: string; 
    device_id?: string | number; 
    isYours?: boolean;
}

export const useLeaderboardLogic = (
    localHistory: any[] | undefined,
    localRoster: any[] | undefined
) => {
    const [groupName, setGroupName] = useState('');
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [history, setHistory] = useState<any[]>([]); 
    const [allSessions, setAllSessions] = useState<SessionOption[]>([]); 
    const [roster, setRoster] = useState<RosterItem[]>([]);
    const [universalSessions, setUniversalSessions] = useState<UniversalSession[]>([]);
    
    const [selectedBatchId, setSelectedBatchId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [isGlobal, setIsGlobal] = useState(false); 
    const [deviceId, setDeviceId] = useState(''); // Actually user_id now
    const [sortMode, setSortMode] = useState<'pct' | 'diff' | 'wins'>('pct');

    // --- 1. INITIALIZATION - GET USER_ID ---
    useEffect(() => {
        const getID = async () => {
            const id = await AsyncStorage.getItem('user_id');
            if (id) {
                setDeviceId(id); // Store as deviceId for now (legacy variable name)
            }
        };
        getID();
    }, []);

    // --- 2. LOCAL DATA BRIDGE ---
    useEffect(() => {
        if (localHistory && localHistory.length > 0 && localRoster) {
            setLoading(true);
            
            const cleanRoster: RosterItem[] = localRoster.map((p: any) => ({
                id: p.id,
                name: p.first_name + (p.last_name ? ' ' + p.last_name : '')
            }));
            setRoster(cleanRoster);

            const getName = (id: string) => cleanRoster.find(r => r.id === id)?.name || 'Unknown';

            const formattedHistory = localHistory.map((h: any) => {
                const p1Id = h.team1?.[0]?.id;
                const p2Id = h.team1?.[1]?.id;
                const p3Id = h.team2?.[0]?.id;
                const p4Id = h.team2?.[1]?.id;

                const safeId = h.id || `temp_local_${Date.now()}_${Math.random()}`;

                return {
                    id: safeId,
                    match_id: safeId, 
                    timestamp: new Date().getTime() / 1000, 
                    group: groupName || 'Current Session',
                    p1: p1Id, p2: p2Id, p3: p3Id, p4: p4Id,
                    s1: h.score_team1 || 0,
                    s2: h.score_team2 || 0,
                    p1_name: getName(p1Id),
                    p2_name: getName(p2Id),
                    p3_name: getName(p3Id),
                    p4_name: getName(p4Id),
                    is_local_unsaved: true,
                    isYours: true
                };
            });
            setHistory(formattedHistory);
            calculateLeaderboard(cleanRoster, formattedHistory);
            setLoading(false);
        }
    }, [localHistory, localRoster]);

    // --- 3. HELPER: CALCULATE STATS ---
    const calculateLeaderboard = (currentRoster: RosterItem[], currentHistory: any[]) => {
        const stats: {[key: string]: LeaderboardItem} = {};
        
        currentRoster.forEach(p => {
            stats[p.id] = { id: p.id, name: p.name, w: 0, l: 0, diff: 0, pct: 0, badges: [] };
        });

        currentHistory.forEach(m => {
            const s1 = parseInt(String(m.s1));
            const s2 = parseInt(String(m.s2));
            if (s1 === 0 && s2 === 0) return; 

            const diff = s1 - s2;
            const updateStat = (pid: string | undefined, isWin: boolean, d: number) => {
                if (!pid || !stats[pid]) return;
                if (isWin) stats[pid].w++; else stats[pid].l++;
                stats[pid].diff += d;
            };

            updateStat(m.p1, s1 > s2, diff);
            updateStat(m.p2, s1 > s2, diff);
            updateStat(m.p3, s2 > s1, -diff);
            updateStat(m.p4, s2 > s1, -diff);
        });

        const lbArray = Object.values(stats).map(s => {
            const total = s.w + s.l;
            return {
                ...s,
                pct: total > 0 ? Math.round((s.w / total) * 100) : 0
            };
        }).filter(s => s.w + s.l > 0); 

        setLeaderboard(lbArray);
    };

    // --- 4. API ACTIONS ---
    const fetchUniversalSessions = async (uid: string, globalMode: boolean) => {
        try {
            const userParam = globalMode ? '' : uid;
            const res = await fetch(`${API_URL}/get_universal_sessions.php?user_id=${encodeURIComponent(userParam)}&is_global=${globalMode}`);
            const responseText = await res.text();
            console.log('📥 Sessions response:', responseText);
            const data = JSON.parse(responseText);            
            if (data.status === 'success') {
                const sessions = data.sessions || [];
                
                const finalSessions = sessions.map((s: any) => ({
                    ...s,
                    isYours: globalMode ? (s.isYours || false) : true
                }));
                
                setUniversalSessions(finalSessions);

                if (!groupName && finalSessions.length > 0) {
                    const latest = finalSessions[0];
                    setGroupName(latest.group);
                    await AsyncStorage.setItem('active_group_name', latest.group);
                    fetchLeaderboard(latest.group, uid, globalMode, 'all');
                }
            }
        } catch (e) { console.error("Session fetch error", e); }
    };

    const fetchLeaderboard = async (targetGroup: string, uid: string, globalMode: boolean, explicitBatchId?: string) => {
        try {
            const idParam = globalMode ? '' : uid;
            const batchToUse = explicitBatchId !== undefined ? explicitBatchId : selectedBatchId;
            const url = `${API_URL}/get_leaderboard.php?group=${encodeURIComponent(targetGroup)}&batch_id=${encodeURIComponent(batchToUse)}&user_id=${encodeURIComponent(idParam)}&is_global=${globalMode}`;
            
            console.log('📊 Fetching leaderboard:', { globalMode, idParam, url });
            
            const res = await fetch(url);
            const data = await res.json();
                       
            if (data.status === 'success') {
                const cleanLeaderboard = (data.leaderboard || []).filter((p: LeaderboardItem) => p.name !== 'Unknown');
                const cleanRoster = (data.roster || []).filter((p: RosterItem) => p.name !== 'Unknown');

                setLeaderboard(cleanLeaderboard);
                
                const safeHistory = (data.history || []).map((h: any) => {
                    const robustId = h.match_id || h.id || h._id; 
                    
                    return {
                        ...h,
                        id: robustId ? String(robustId) : '', 
                        match_id: robustId ? String(robustId) : '',
                        original_id: robustId ? String(robustId) : '',
                        group: h._source_group || h.group || targetGroup,
                        group_key: h._source_key || h.group_key || targetGroup,
                        isYours: h.isYours || false,
                        device_id: h.device_id || '',
                        is_local_unsaved: false 
                    };
                });

                console.log('📊 Loaded history:', safeHistory.length, 'matches');

                setHistory(safeHistory);
                setRoster(cleanRoster);
                setAllSessions(data.sessions || []);
            } else {
                setLeaderboard([]);
                setHistory([]);
            }
        } catch (e) { console.error("Fetch error:", e); } 
        finally { setLoading(false); }
    };

    const saveMatchUpdate = async (match: any, newS1: number, newS2: number, names: any) => {
        if (match.is_local_unsaved) {
            Alert.alert("Cannot Update", "This match hasn't been saved to the server yet.");
            return;
        }

        if (!match.isYours) {
            Alert.alert("Cannot Edit", "You can only edit matches you created.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                match_id: match.id,
                batch_id: match.batch_id || '',
                group: match.group_key || match.group || groupName,
                timestamp: match.timestamp,
                p1: match.p1_key || match.p1,
                p2: match.p2_key || match.p2,
                p3: match.p3_key || match.p3,
                p4: match.p4_key || match.p4,
                new_s1: newS1,
                new_s2: newS2,
                p1_name: (names.p1_name || '').trim(),
                p2_name: (names.p2_name || '').trim(),
                p3_name: (names.p3_name || '').trim(),
                p4_name: (names.p4_name || '').trim()
            };
              
            const res = await fetch(`${API_URL}/update_match.php`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            
            if (data.status === 'success') {
                Alert.alert("Success!", "Match updated!");
                fetchLeaderboard(groupName, deviceId, isGlobal, selectedBatchId);
            } else {
                Alert.alert("Update Failed", data.message); 
            }
        } catch (e: any) { 
            Alert.alert("Error", `Network failed: ${e.message}`); 
        } 
        finally { setLoading(false); }
    };

    const deleteMatch = async (match: any) => {
        if (!match.isYours) {
            Alert.alert("Cannot Delete", "You can only delete matches you created.");
            return;
        }

        Alert.alert("Delete Game", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                setLoading(true);
                try {
                    const targetId = match.original_id || match.match_id || match.id;
                    const res = await fetch(`${API_URL}/delete_match.php`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            id: targetId,
                            match_id: targetId,
                            group: match.group || groupName,
                            timestamp: match.timestamp,
                            p1: match.p1, p2: match.p2,
                            p3: match.p3, p4: match.p4
                        })
                    });
                    const data = await res.json();
                    if (data.status === 'success') {
                        fetchLeaderboard(groupName, deviceId, isGlobal, selectedBatchId);
                    } else { Alert.alert("Error", data.message); }
                } catch (e) { Alert.alert("Error", "Network error."); } 
                finally { setLoading(false); }
            }}
        ]);
    };

    const deleteSession = async () => {
        if (selectedBatchId === 'all') return;
        
        const currentSession = universalSessions.find((s: any) => s.id === selectedBatchId);
        if (!currentSession?.isYours) {
            Alert.alert("Cannot Delete", "You can only delete sessions you created.");
            return;
        }

        Alert.alert(
            "Delete Session",
            "This deletes ALL games in this session.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const res = await fetch(`${API_URL}/delete_session.php`, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    group: groupName,
                                    batch_id: selectedBatchId
                                })
                            });
                            const data = await res.json();
                            if (data.status === 'success') {
                                setSelectedBatchId('all');
                                fetchLeaderboard(groupName, deviceId, isGlobal, 'all');
                                fetchUniversalSessions(deviceId, isGlobal); 
                            } else {
                                Alert.alert("Error", data.message);
                            }
                        } catch (e) { Alert.alert("Error", "Network error."); } 
                        finally { setLoading(false); }
                    }
                }
            ]
        );
    };

    return {
        groupName, setGroupName,
        leaderboard,
        history,
        roster,
        allSessions,
        universalSessions,
        selectedBatchId, setSelectedBatchId,
        loading, setLoading,
        isGlobal, setIsGlobal,
        deviceId, setDeviceId,
        sortMode, setSortMode,
        fetchLeaderboard,
        fetchUniversalSessions,
        saveMatchUpdate,
        deleteMatch,
        deleteSession
    };
};
