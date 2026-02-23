import { BrandedIcon } from '../../components/BrandedIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    InputAccessoryView,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupSelector } from '../../components/GroupSelector';
import { PlayerInput } from '../../components/PlayerInput';
import { PlayerRow } from '../../components/PlayerRow';
import {
    ThemeColors,
    FONT_DISPLAY_BOLD,
    FONT_DISPLAY_EXTRABOLD,
    FONT_BODY_REGULAR,
    FONT_BODY_MEDIUM,
    FONT_BODY_BOLD,
    FONT_BODY_SEMIBOLD,
} from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { usePlayerManagement } from '../../hooks/usePlayerManagement';
import { usePlayerSelection } from '../../hooks/usePlayerSelection';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export default function PlayersScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    // Hooks
    const { players, loading: playersLoading, maleCount, femaleCount, loadPlayers, updatePlayer, deletePlayer } = usePlayerManagement();
    const { groups, loadGroups, addPlayersToGroup } = useGroupManagement();
    const { selectionMode, selectedPlayerIds, toggleSelectionMode, togglePlayerSelection, clearSelection, isSelected } = usePlayerSelection();

    // Edit modal state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<any>(null);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [cellPhone, setCellPhone] = useState('');
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [duprRating, setDuprRating] = useState('');
    const [homeCourtId, setHomeCourtId] = useState<number | null>(null);
    const [homeCourtName, setHomeCourtName] = useState('');
    const [showCourtPicker, setShowCourtPicker] = useState(false);
    const [courts, setCourts] = useState<Array<{ id: number; name: string; city: string; state: string }>>([]);

    // Merge modal state
    const [mergeModalVisible, setMergeModalVisible] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [mergeProgress, setMergeProgress] = useState('');
    const [notDuplicatePairs, setNotDuplicatePairs] = useState<Array<{player_id_1: number; player_id_2: number}>>([]);
    const [selectedMergeIds, setSelectedMergeIds] = useState<Record<string, number[]>>({}); // group name -> selected IDs to merge

    // Group selection state
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

    // Helper to check if two players are marked as not-duplicates
    const isNotDuplicate = useCallback((id1: number, id2: number) => {
        const a = Math.min(id1, id2);
        const b = Math.max(id1, id2);
        return notDuplicatePairs.some(p =>
            p.player_id_1 === a && p.player_id_2 === b
        );
    }, [notDuplicatePairs]);

    // Detect duplicates from loaded players, filtering out confirmed non-duplicates
    const duplicateGroups = useMemo(() => {
        const nameMap: Record<string, any[]> = {};
        players.forEach(p => {
            const key = (p.first_name || '').trim().toLowerCase();
            if (!key) return;
            if (!nameMap[key]) nameMap[key] = [];
            nameMap[key].push(p);
        });

        // For each name group, split into sub-groups based on not-duplicate pairs
        const result: Array<{ name: string; players: any[]; count: number }> = [];

        Object.entries(nameMap).forEach(([, list]) => {
            if (list.length <= 1) return;

            // Build clusters: players not marked as different belong together as potential duplicates
            const clusters: any[][] = [];
            const assigned = new Set<number>();

            for (const player of list) {
                if (assigned.has(player.id)) continue;

                const cluster = [player];
                assigned.add(player.id);

                for (const other of list) {
                    if (assigned.has(other.id)) continue;
                    // Check if this player is marked as NOT a duplicate of anyone in the cluster
                    const isDifferent = cluster.some(cp => isNotDuplicate(cp.id, other.id));
                    if (!isDifferent) {
                        cluster.push(other);
                        assigned.add(other.id);
                    }
                }

                if (cluster.length > 1) {
                    clusters.push(cluster);
                }
            }

            clusters.forEach(cluster => {
                result.push({
                    name: cluster[0].first_name,
                    players: cluster,
                    count: cluster.length
                });
            });
        });

        return result.sort((a, b) => b.count - a.count);
    }, [players, isNotDuplicate]);

    const totalDuplicates = useMemo(() =>
        duplicateGroups.reduce((sum, g) => sum + g.count - 1, 0),
    [duplicateGroups]);

    // Load courts for dropdown
    const loadCourts = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/get_courts.php`);
            const data = await res.json();
            if (data.status === 'success') {
                setCourts(data.courts || []);
            }
        } catch (e) {
            console.error('Error loading courts:', e);
        }
    }, []);

    // Load not-duplicate pairs
    const loadNotDuplicates = useCallback(async () => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) return;
            const res = await fetch(`${API_URL}/get_not_duplicates.php?user_id=${userId}`);
            const data = await res.json();
            if (data.status === 'success') {
                setNotDuplicatePairs(data.pairs || []);
            }
        } catch (e) {
            console.error('Error loading not-duplicate pairs:', e);
        }
    }, []);

    // Load data on focus
    useFocusEffect(
        useCallback(() => {
            loadPlayers();
            loadGroups();
            loadNotDuplicates();
            loadCourts();
        }, [])
    );

    // Add new player
    const handleAddPlayer = async (name: string, playerGender: 'male' | 'female') => {
        try {
            const userId = await AsyncStorage.getItem('user_id');
            if (!userId) {
                Alert.alert('Error', 'Please login first');
                return;
            }
            Alert.alert('Info', 'Please select a group from the Groups tab first, then add players there.');
        } catch (error) {
            console.error('Error adding player:', error);
        }
    };

    // Open edit modal
    const handleEditPlayer = (player: any) => {
        setEditingPlayer(player);
        setFirstName(player.first_name);
        setLastName(player.last_name || '');
        setCellPhone(player.cell_phone || '');
        setGender(player.gender?.toLowerCase().startsWith('f') ? 'female' : 'male');
        setDuprRating(player.dupr_rating ? String(player.dupr_rating) : '');
        setHomeCourtId(player.home_court_id ? Number(player.home_court_id) : null);
        setHomeCourtName(player.home_court_name || '');
        setShowCourtPicker(false);
        setEditModalVisible(true);
    };

    // Save player edits
    const handleSavePlayer = async () => {
        if (!editingPlayer) return;
        Keyboard.dismiss();
        const updates: any = {
            first_name: firstName,
            last_name: lastName,
            cell_phone: cellPhone,
            gender: gender,
            home_court_id: homeCourtId || '',
        };
        if (duprRating !== '') {
            const rating = parseFloat(duprRating);
            if (rating >= 1.0 && rating <= 8.0) {
                updates.dupr_rating = rating;
            } else {
                Alert.alert('Invalid DUPR', 'DUPR rating must be between 1.00 and 8.00');
                return;
            }
        } else {
            updates.dupr_rating = '';
        }
        const success = await updatePlayer(editingPlayer.id, updates);
        if (success) {
            setEditModalVisible(false);
        }
    };

    // Delete player
    const handleDeletePlayer = async (player: any) => {
        await deletePlayer(player.id, player.first_name);
    };

    // Toggle a player selection for merge within a group
    const toggleMergeSelection = (groupName: string, playerId: number) => {
        setSelectedMergeIds(prev => {
            const key = groupName.toLowerCase();
            const current = prev[key] || [];
            const updated = current.includes(playerId)
                ? current.filter(id => id !== playerId)
                : [...current, playerId];
            return { ...prev, [key]: updated };
        });
    };

    // Execute the actual merge API calls
    const executeMerge = async (keepPlayer: any, mergeTargets: any[], preferredPhone: string | null, groupKey: string) => {
        setIsMerging(true);
        let mergedCount = 0;

        for (const target of mergeTargets) {
            setMergeProgress(`Merging "${target.first_name}" (ID: ${target.id}) into ID: ${keepPlayer.id}...`);
            try {
                const body: any = { keep_id: keepPlayer.id, merge_id: target.id };
                if (preferredPhone !== null) {
                    body.preferred_phone = preferredPhone;
                }
                const res = await fetch(`${API_URL}/merge_players.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.status === 'success') mergedCount++;
                else console.warn('Merge failed:', data.message);
            } catch (e) {
                console.error('Merge error:', e);
            }
        }

        setIsMerging(false);
        setMergeProgress('');
        setSelectedMergeIds(prev => ({ ...prev, [groupKey]: [] }));
        Alert.alert('Merge Complete', `Merged ${mergedCount} duplicate "${keepPlayer.first_name}" record${mergedCount !== 1 ? 's' : ''}.`);
        loadPlayers();
    };

    // Merge selected players in a group (keep oldest, merge rest)
    const mergeSelectedInGroup = async (group: { name: string; players: any[]; count: number }) => {
        const key = group.name.toLowerCase();
        const selected = selectedMergeIds[key] || [];

        if (selected.length < 2) {
            Alert.alert('Select Players', 'Select at least 2 players to merge together.');
            return;
        }

        const selectedPlayers = group.players
            .filter((p: any) => selected.includes(p.id))
            .sort((a: any, b: any) => a.id - b.id);

        const keepPlayer = selectedPlayers[0];
        const mergeTargets = selectedPlayers.slice(1);

        // Collect all unique phone numbers across selected players
        const allPhones: string[] = [];
        selectedPlayers.forEach((p: any) => {
            if (p.cell_phone && !allPhones.includes(p.cell_phone)) {
                allPhones.push(p.cell_phone);
            }
        });

        if (allPhones.length > 1) {
            // Multiple different phone numbers — ask which to keep
            const phoneButtons = allPhones.map(phone => ({
                text: phone,
                onPress: () => executeMerge(keepPlayer, mergeTargets, phone, key)
            }));
            phoneButtons.push({
                text: 'No Phone',
                onPress: () => executeMerge(keepPlayer, mergeTargets, '', key)
            });

            Alert.alert(
                'Which Phone Number?',
                `These "${group.name}" records have different phone numbers. Which one should the merged player keep?`,
                [{ text: 'Cancel', style: 'cancel' as const }, ...phoneButtons]
            );
        } else {
            // 0 or 1 phone — straightforward merge
            Alert.alert(
                'Merge Players',
                `Merge ${mergeTargets.length} record${mergeTargets.length !== 1 ? 's' : ''} into "${keepPlayer.first_name}"${keepPlayer.last_name ? ' ' + keepPlayer.last_name : ''}?\n\nMatch history and stats will be preserved.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Merge',
                        style: 'destructive',
                        onPress: () => executeMerge(keepPlayer, mergeTargets, null, key)
                    }
                ]
            );
        }
    };

    // Mark all unselected players in a group as "not the same person" as the selected ones
    const markNotDuplicate = async (group: { name: string; players: any[]; count: number }) => {
        const key = group.name.toLowerCase();
        const selected = selectedMergeIds[key] || [];

        if (selected.length === 0) {
            // No selection: mark ALL players in this group as different from each other
            Alert.alert(
                'Mark All as Different',
                `Mark all "${group.name}" entries as different people? This will stop showing them as duplicates.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Yes, All Different',
                        onPress: async () => {
                            setIsMerging(true);
                            setMergeProgress('Marking as different people...');
                            for (let i = 0; i < group.players.length; i++) {
                                for (let j = i + 1; j < group.players.length; j++) {
                                    try {
                                        await fetch(`${API_URL}/mark_not_duplicate.php`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                player_id_1: group.players[i].id,
                                                player_id_2: group.players[j].id
                                            })
                                        });
                                    } catch (e) { console.error('Mark not-dup error:', e); }
                                }
                            }
                            setIsMerging(false);
                            setMergeProgress('');
                            loadNotDuplicates();
                            Alert.alert('Done', `All "${group.name}" entries are now marked as different people.`);
                        }
                    }
                ]
            );
            return;
        }

        // Selected players: mark UNselected as different from EACH selected
        const unselected = group.players.filter((p: any) => !selected.includes(p.id));
        if (unselected.length === 0) return;

        setIsMerging(true);
        setMergeProgress('Marking as different people...');

        for (const sel of selected) {
            for (const unsPlayer of unselected) {
                try {
                    await fetch(`${API_URL}/mark_not_duplicate.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            player_id_1: sel,
                            player_id_2: unsPlayer.id
                        })
                    });
                } catch (e) { console.error('Mark not-dup error:', e); }
            }
        }

        setIsMerging(false);
        setMergeProgress('');
        setSelectedMergeIds(prev => ({ ...prev, [key]: [] }));
        loadNotDuplicates();
    };

    // Check if all players across all groups are selected
    const allSelected = useMemo(() => {
        return duplicateGroups.every(group => {
            const key = group.name.toLowerCase();
            const selected = selectedMergeIds[key] || [];
            return group.players.every((p: any) => selected.includes(p.id));
        });
    }, [duplicateGroups, selectedMergeIds]);

    // Select All / Deselect All
    const toggleSelectAll = () => {
        if (allSelected) {
            // Deselect all
            setSelectedMergeIds({});
        } else {
            // Select all players in every group
            const newSelected: Record<string, number[]> = {};
            duplicateGroups.forEach(group => {
                const key = group.name.toLowerCase();
                newSelected[key] = group.players.map((p: any) => p.id);
            });
            setSelectedMergeIds(newSelected);
        }
    };

    // Count how many groups have 2+ selected (ready to merge)
    const mergeReadyCount = useMemo(() => {
        return duplicateGroups.filter(group => {
            const key = group.name.toLowerCase();
            const selected = selectedMergeIds[key] || [];
            return selected.length >= 2;
        }).length;
    }, [duplicateGroups, selectedMergeIds]);

    // Merge all groups that have 2+ selected players
    const mergeAllSelected = async () => {
        const groupsToMerge = duplicateGroups.filter(group => {
            const key = group.name.toLowerCase();
            const selected = selectedMergeIds[key] || [];
            return selected.length >= 2;
        });

        if (groupsToMerge.length === 0) {
            Alert.alert('Nothing to Merge', 'Select at least 2 players in a group to merge.');
            return;
        }

        const totalToMerge = groupsToMerge.reduce((sum, group) => {
            const key = group.name.toLowerCase();
            return sum + (selectedMergeIds[key] || []).length - 1;
        }, 0);

        Alert.alert(
            'Merge All Selected',
            `This will merge ${totalToMerge} duplicate record${totalToMerge !== 1 ? 's' : ''} across ${groupsToMerge.length} name${groupsToMerge.length !== 1 ? 's' : ''}. For each name, the oldest selected record is kept.\n\nMatch history and stats will be combined.\n\nContinue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Merge',
                    style: 'destructive',
                    onPress: async () => {
                        setIsMerging(true);
                        let totalMerged = 0;
                        for (const group of groupsToMerge) {
                            const key = group.name.toLowerCase();
                            const selected = selectedMergeIds[key] || [];
                            const selectedPlayers = group.players
                                .filter((p: any) => selected.includes(p.id))
                                .sort((a: any, b: any) => a.id - b.id);

                            const keepPlayer = selectedPlayers[0];
                            const firstPhone = selectedPlayers.find((p: any) => p.cell_phone)?.cell_phone || null;

                            for (let i = 1; i < selectedPlayers.length; i++) {
                                setMergeProgress(`Merging "${group.name}" (${i}/${selectedPlayers.length - 1})...`);
                                try {
                                    const body: any = { keep_id: keepPlayer.id, merge_id: selectedPlayers[i].id };
                                    if (firstPhone) body.preferred_phone = firstPhone;
                                    const res = await fetch(`${API_URL}/merge_players.php`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body)
                                    });
                                    const data = await res.json();
                                    if (data.status === 'success') totalMerged++;
                                } catch (e) { console.error('Merge error:', e); }
                            }
                        }
                        setIsMerging(false);
                        setMergeProgress('');
                        setSelectedMergeIds({});
                        setMergeModalVisible(false);
                        Alert.alert('All Done!', `Merged ${totalMerged} duplicate player record${totalMerged !== 1 ? 's' : ''}.`);
                        loadPlayers();
                    }
                }
            ]
        );
    };

    // Merge from edit modal — merge current player into another
    const handleMergeFromEdit = () => {
        if (!editingPlayer) return;
        const sameName = players.filter(
            p => p.id !== editingPlayer.id &&
                 p.first_name.trim().toLowerCase() === editingPlayer.first_name.trim().toLowerCase()
        );

        if (sameName.length === 0) {
            Alert.alert('No Match', `No other players named "${editingPlayer.first_name}" found.`);
            return;
        }

        const target = sameName[0];
        Alert.alert(
            'Merge Players',
            `Merge "${editingPlayer.first_name}" (ID: ${editingPlayer.id}) into "${target.first_name}" (ID: ${target.id})?\n\nAll match history will be combined. The merged record will be deleted.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Merge',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_URL}/merge_players.php`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ keep_id: target.id, merge_id: editingPlayer.id })
                            });
                            const data = await res.json();
                            if (data.status === 'success') {
                                setEditModalVisible(false);
                                Alert.alert('Merged', data.message);
                                loadPlayers();
                            } else {
                                Alert.alert('Error', data.message);
                            }
                        } catch (e) { Alert.alert('Error', 'Merge failed'); }
                    }
                }
            ]
        );
    };

    // Add selected players to group
    const handleAddToGroup = async () => {
        if (!selectedGroupId || selectedPlayerIds.length === 0) return;
        const success = await addPlayersToGroup(selectedPlayerIds, selectedGroupId);
        if (success) {
            clearSelection();
            setSelectedGroupId(null);
            toggleSelectionMode();
        }
    };

    // Create match with selected players
    const handleCreateMatch = () => {
        if (selectedPlayerIds.length < 4) {
            Alert.alert('Not Enough Players', 'You need at least 4 players to create a match.');
            return;
        }
        const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));
        const formattedPlayers = selectedPlayers.map(p => ({
            id: p.player_key || p.id.toString(),
            first_name: p.first_name,
            last_name: p.last_name || '',
            gender: p.gender?.toLowerCase().startsWith('f') ? 'female' : 'male'
        }));
        router.push({
            pathname: '/setup',
            params: {
                groupName: 'Quick Match',
                groupKey: `quick_${Date.now()}`,
                preselectedPlayers: JSON.stringify(formattedPlayers)
            }
        });
        clearSelection();
        toggleSelectionMode();
    };

    // Render player row
    const renderPlayer = ({ item }: { item: any }) => (
        <PlayerRow
            player={item}
            selectionMode={selectionMode}
            isSelected={isSelected(item.id)}
            onToggleSelect={() => togglePlayerSelection(item.id)}
            onEdit={() => handleEditPlayer(item)}
            onDelete={() => handleDeletePlayer(item)}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>PLAYERS</Text>
                    <Text style={styles.headerSub}>
                        {players.length} PLAYERS: {femaleCount} FEMALES & {maleCount} MALES
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.selectBtn, selectionMode && styles.selectBtnActive]}
                    onPress={toggleSelectionMode}
                >
                    <BrandedIcon name={selectionMode ? 'close' : 'confirm'} size={20} color={colors.text} />
                    <Text style={styles.selectBtnText}>
                        {selectionMode ? 'CANCEL' : 'SELECT'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Duplicate Warning Banner */}
            {totalDuplicates > 0 && !selectionMode && (
                <TouchableOpacity style={styles.dupBanner} onPress={() => setMergeModalVisible(true)}>
                    <BrandedIcon name="warning" size={20} color={colors.text} />
                    <Text style={styles.dupBannerText}>
                        {totalDuplicates} duplicate player{totalDuplicates !== 1 ? 's' : ''} found
                    </Text>
                    <View style={styles.dupBannerBtn}>
                        <Text style={styles.dupBannerBtnText}>REVIEW & MERGE</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Player Input - ALWAYS VISIBLE AT TOP */}
            <PlayerInput onAddPlayer={handleAddPlayer} />

            {/* Player List */}
            {playersLoading ? (
                <ActivityIndicator size="large" color={colors.secondary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={players}
                    renderItem={renderPlayer}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[
                        styles.listContent,
                        selectionMode && selectedPlayerIds.length > 0 && styles.listContentWithSelector
                    ]}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            No players yet. Add players when creating groups.
                        </Text>
                    }
                />
            )}

            {/* Group Selector - Shows when players are selected */}
            {selectionMode && (
                <GroupSelector
                    groups={groups}
                    selectedGroupId={selectedGroupId}
                    selectedCount={selectedPlayerIds.length}
                    onSelectGroup={setSelectedGroupId}
                    onAddToGroup={handleAddToGroup}
                    onCreateMatch={handleCreateMatch}
                />
            )}

            {/* Merge Duplicates Modal */}
            <Modal visible={mergeModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.mergeContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Duplicate Players</Text>
                            <TouchableOpacity onPress={() => { setMergeModalVisible(false); setSelectedMergeIds({}); }} disabled={isMerging}>
                                <BrandedIcon name="close" size={28} color={isMerging ? colors.border : colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {isMerging ? (
                            <View style={styles.mergingOverlay}>
                                <ActivityIndicator size="large" color={colors.accent} />
                                <Text style={styles.mergingText}>Processing...</Text>
                                <Text style={styles.mergingProgress}>{mergeProgress}</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.mergeScroll}>
                                <Text style={styles.mergeIntro}>
                                    Select which players are the same person, then tap MERGE. If two players share a name but are different people, tap "Not Same Person" to stop flagging them.
                                </Text>

                                {duplicateGroups.length > 0 && (
                                    <View style={styles.topActionRow}>
                                        <TouchableOpacity style={styles.selectAllBtn} onPress={toggleSelectAll}>
                                            <BrandedIcon name={allSelected ? 'checkbox' : 'checkbox-empty'} size={20} color={colors.text} />
                                            <Text style={styles.selectAllBtnText}>
                                                {allSelected ? 'DESELECT ALL' : 'SELECT ALL'}
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.mergeAllBtn, mergeReadyCount === 0 && styles.btnDisabled]}
                                            onPress={mergeAllSelected}
                                            disabled={mergeReadyCount === 0}
                                        >
                                            <BrandedIcon name="merge" size={20} color={colors.text} />
                                            <Text style={styles.mergeAllBtnText}>
                                                MERGE{mergeReadyCount > 0 ? ` (${mergeReadyCount})` : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {duplicateGroups.map((group, idx) => {
                                    const key = group.name.toLowerCase();
                                    const selected = selectedMergeIds[key] || [];

                                    return (
                                        <View key={idx} style={styles.dupGroupCard}>
                                            <View style={styles.dupGroupHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.dupGroupName}>"{group.name}"</Text>
                                                    <Text style={styles.dupGroupCount}>
                                                        {group.count} records — tap to select same person
                                                    </Text>
                                                </View>
                                            </View>

                                            {group.players.map((p: any) => {
                                                const isChecked = selected.includes(p.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={p.id}
                                                        style={[styles.dupPlayerRow, isChecked && styles.dupPlayerRowSelected]}
                                                        onPress={() => toggleMergeSelection(group.name, p.id)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <BrandedIcon
                                                            name={isChecked ? 'checkbox' : 'checkbox-empty'}
                                                            size={22}
                                                            color={isChecked ? colors.accent : colors.inputBorder}
                                                        />
                                                        <View style={styles.dupPlayerInfo}>
                                                            <Text style={styles.dupPlayerName}>
                                                                {p.first_name}{p.last_name ? ' ' + p.last_name : ''}
                                                            </Text>
                                                            <Text style={styles.dupPlayerMeta}>
                                                                {p.wins || 0}W / {p.losses || 0}L
                                                                {p.cell_phone ? `  •  ${p.cell_phone}` : ''}
                                                                {p.dupr_rating ? `  •  DUPR: ${Number(p.dupr_rating).toFixed(2)}` : ''}
                                                            </Text>
                                                            {p.group_names && (
                                                                <Text style={styles.dupPlayerGroups}>
                                                                    Groups: {p.group_names}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}

                                            <View style={styles.dupActionRow}>
                                                <TouchableOpacity
                                                    style={[styles.mergeGroupBtn, selected.length < 2 && styles.btnDisabled]}
                                                    onPress={() => mergeSelectedInGroup(group)}
                                                    disabled={selected.length < 2}
                                                >
                                                    <BrandedIcon name="merge" size={16} color={colors.text} />
                                                    <Text style={styles.mergeGroupBtnText}>
                                                        MERGE{selected.length >= 2 ? ` (${selected.length})` : ''}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.notSameBtn}
                                                    onPress={() => markNotDuplicate(group)}
                                                >
                                                    <BrandedIcon name="groups" size={16} color={colors.textMuted} />
                                                    <Text style={styles.notSameBtnText}>Not Same Person</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}

                                <View style={{ height: 30 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Done toolbar for numeric keyboards */}
            {Platform.OS === 'ios' && (
                <InputAccessoryView nativeID="doneToolbar">
                    <View style={styles.accessoryBar}>
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.doneButton}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </InputAccessoryView>
            )}

            {/* Edit Player Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={0}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Player</Text>
                            <TouchableOpacity onPress={() => { setEditModalVisible(false); setShowCourtPicker(false); }}>
                                <BrandedIcon name="close" size={28} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
                            {!showCourtPicker ? (
                                <>
                                    <Text style={styles.label}>First Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="First Name"
                                        placeholderTextColor={colors.inputPlaceholder}
                                        returnKeyType="next"
                                    />

                                    <Text style={styles.label}>Last Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder="Last Name (optional)"
                                        placeholderTextColor={colors.inputPlaceholder}
                                        returnKeyType="next"
                                    />

                                    <Text style={styles.label}>Phone Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={cellPhone}
                                        onChangeText={setCellPhone}
                                        placeholder="(XXX) XXX-XXXX"
                                        placeholderTextColor={colors.inputPlaceholder}
                                        keyboardType="phone-pad"
                                        inputAccessoryViewID="doneToolbar"
                                    />

                                    <Text style={styles.label}>Gender</Text>
                                    <View style={styles.genderRow}>
                                        <TouchableOpacity
                                            style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                                            onPress={() => setGender('male')}
                                        >
                                            <BrandedIcon name="gender-male" size={20} color={gender === 'male' ? colors.text : colors.textMuted} />
                                            <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextActive]}>Male</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                                            onPress={() => setGender('female')}
                                        >
                                            <BrandedIcon name="gender-female" size={20} color={gender === 'female' ? colors.text : colors.textMuted} />
                                            <Text style={[styles.genderBtnText, gender === 'female' && styles.genderBtnTextActive]}>Female</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.label}>Home Court</Text>
                                    <TouchableOpacity
                                        style={styles.courtSelector}
                                        onPress={() => { Keyboard.dismiss(); setShowCourtPicker(true); }}
                                    >
                                        <BrandedIcon name="location" size={20} color={homeCourtId ? colors.secondary : colors.textSoft} />
                                        <Text style={[styles.courtSelectorText, !homeCourtId && { color: colors.textSoft }]}>
                                            {homeCourtName || 'Select a court...'}
                                        </Text>
                                        <BrandedIcon name="chevron-right" size={18} color={colors.textSoft} />
                                    </TouchableOpacity>

                                    <Text style={styles.label}>DUPR Rating</Text>
                                    <View style={styles.duprInputRow}>
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            value={duprRating}
                                            onChangeText={setDuprRating}
                                            placeholder="e.g. 3.50 (1.00 - 8.00)"
                                            placeholderTextColor={colors.inputPlaceholder}
                                            keyboardType="decimal-pad"
                                            maxLength={4}
                                            inputAccessoryViewID="doneToolbar"
                                        />
                                        {duprRating !== '' && (
                                            <TouchableOpacity
                                                style={styles.duprClearBtn}
                                                onPress={() => setDuprRating('')}
                                            >
                                                <BrandedIcon name="close" size={22} color={colors.textSoft} />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlayer}>
                                        <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                                    </TouchableOpacity>

                                    {/* Merge button — only show if duplicates exist for this name */}
                                    {editingPlayer && players.filter(
                                        p => p.id !== editingPlayer.id &&
                                             p.first_name.trim().toLowerCase() === editingPlayer.first_name.trim().toLowerCase()
                                    ).length > 0 && (
                                        <TouchableOpacity style={styles.mergeEditBtn} onPress={handleMergeFromEdit}>
                                            <BrandedIcon name="merge" size={18} color={colors.danger} />
                                            <Text style={styles.mergeEditBtnText}>Merge with duplicate...</Text>
                                        </TouchableOpacity>
                                    )}

                                    <View style={{ height: 40 }} />
                                </>
                            ) : (
                                /* Court Picker View */
                                <>
                                    <View style={styles.courtPickerHeader}>
                                        <TouchableOpacity onPress={() => setShowCourtPicker(false)} style={styles.courtBackBtn}>
                                            <BrandedIcon name="back" size={22} color={colors.secondary} />
                                            <Text style={styles.courtBackText}>Back</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.courtPickerTitle}>Select Court</Text>
                                    </View>

                                    {/* No court option */}
                                    <TouchableOpacity
                                        style={[styles.courtOption, !homeCourtId && styles.courtOptionSelected]}
                                        onPress={() => {
                                            setHomeCourtId(null);
                                            setHomeCourtName('');
                                            setShowCourtPicker(false);
                                        }}
                                    >
                                        <BrandedIcon name="close" size={20} color={colors.textSoft} />
                                        <Text style={styles.courtOptionText}>No Court</Text>
                                        {!homeCourtId && <BrandedIcon name="checkmark" size={20} color={colors.accent} />}
                                    </TouchableOpacity>

                                    {courts.map((court) => (
                                        <TouchableOpacity
                                            key={court.id}
                                            style={[styles.courtOption, homeCourtId === court.id && styles.courtOptionSelected]}
                                            onPress={() => {
                                                setHomeCourtId(court.id);
                                                setHomeCourtName(court.name);
                                                setShowCourtPicker(false);
                                            }}
                                        >
                                            <BrandedIcon name="location" size={20} color={colors.secondary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.courtOptionText}>{court.name}</Text>
                                                {(court.city || court.state) && (
                                                    <Text style={styles.courtOptionSub}>
                                                        {[court.city, court.state].filter(Boolean).join(', ')}
                                                    </Text>
                                                )}
                                            </View>
                                            {homeCourtId === court.id && <BrandedIcon name="checkmark" size={20} color={colors.accent} />}
                                        </TouchableOpacity>
                                    ))}

                                    <View style={{ height: 40 }} />
                                </>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
        backgroundColor: c.surface,
        padding: 20,
        paddingTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: { color: c.text, fontSize: 20, fontFamily: FONT_DISPLAY_EXTRABOLD },
    headerSub: { color: c.accent, fontSize: 10, fontFamily: FONT_BODY_BOLD, textTransform: 'uppercase' },
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: c.secondary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20
    },
    selectBtnActive: { backgroundColor: c.danger },
    selectBtnText: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 12 },
    listContent: { padding: 20, paddingBottom: 150 },
    listContentWithSelector: { paddingBottom: 250 },
    emptyText: { textAlign: 'center', marginTop: 50, color: c.textSoft, fontSize: 16, fontFamily: FONT_BODY_REGULAR },

    // Duplicate banner
    dupBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.danger,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginHorizontal: 15,
        marginTop: 10,
        borderRadius: 12,
        gap: 10,
    },
    dupBannerText: { flex: 1, color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 13 },
    dupBannerBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    dupBannerBtnText: { color: c.text, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 11 },

    // Merge modal
    mergeContainer: { backgroundColor: c.modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    mergeScroll: { paddingHorizontal: 20 },
    mergeIntro: { color: c.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 15, fontFamily: FONT_BODY_REGULAR },
    dupGroupCard: {
        backgroundColor: c.card,
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: c.border,
    },
    dupGroupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dupGroupName: { fontSize: 16, fontFamily: FONT_DISPLAY_BOLD, color: c.text },
    dupGroupCount: { fontSize: 12, color: c.textSoft, marginTop: 2, fontFamily: FONT_BODY_REGULAR },
    mergeGroupBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: c.danger,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    mergeGroupBtnText: { color: c.text, fontFamily: FONT_DISPLAY_BOLD, fontSize: 12 },
    dupPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: c.border,
        gap: 10,
    },
    dupPlayerRowSelected: {
        backgroundColor: c.accentSoft,
        borderRadius: 8,
    },
    dupPlayerInfo: { flex: 1 },
    dupPlayerName: { fontSize: 14, fontFamily: FONT_BODY_SEMIBOLD, color: c.text },
    dupPlayerMeta: { fontSize: 11, color: c.textMuted, marginTop: 2, fontFamily: FONT_BODY_REGULAR },
    dupPlayerGroups: { fontSize: 10, color: c.textSoft, marginTop: 2, fontFamily: FONT_BODY_REGULAR },
    dupActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingTop: 10,
    },
    notSameBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: c.surfaceLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.inputBorder,
    },
    notSameBtnText: { color: c.textMuted, fontFamily: FONT_BODY_SEMIBOLD, fontSize: 12 },
    btnDisabled: { opacity: 0.4 },
    topActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    selectAllBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: c.secondary,
        padding: 14,
        borderRadius: 12,
    },
    selectAllBtnText: { color: c.text, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 13 },
    mergeAllBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: c.danger,
        padding: 14,
        borderRadius: 12,
    },
    mergeAllBtnText: { color: c.text, fontFamily: FONT_DISPLAY_EXTRABOLD, fontSize: 13 },
    mergingOverlay: { padding: 40, alignItems: 'center', gap: 15 },
    mergingText: { fontSize: 16, fontFamily: FONT_BODY_BOLD, color: c.text },
    mergingProgress: { fontSize: 13, color: c.textMuted, textAlign: 'center', fontFamily: FONT_BODY_REGULAR },

    // Done toolbar for numeric keyboards
    accessoryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceLight,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    doneButton: {
        backgroundColor: c.secondary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    doneButtonText: { color: c.text, fontFamily: FONT_BODY_BOLD, fontSize: 15 },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: c.modalOverlay, justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: c.modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border },
    modalTitle: { fontSize: 20, fontFamily: FONT_DISPLAY_BOLD, color: c.text },
    modalBody: { padding: 20 },
    label: { fontSize: 14, fontFamily: FONT_BODY_SEMIBOLD, color: c.textMuted, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: c.inputBg, borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: c.inputBorder, color: c.inputText, fontFamily: FONT_BODY_REGULAR },
    genderRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder },
    genderBtnActive: { backgroundColor: c.secondary, borderColor: c.secondary },
    genderBtnText: { fontSize: 14, fontFamily: FONT_BODY_SEMIBOLD, color: c.textMuted },
    genderBtnTextActive: { color: c.text },
    duprInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    duprClearBtn: { padding: 4 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 25, padding: 15, marginTop: 20, alignItems: 'center' },
    saveBtnText: { color: isDark ? '#000000' : '#ffffff', fontSize: 16, fontFamily: FONT_DISPLAY_BOLD },

    // Court selector in edit modal
    courtSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: c.inputBorder,
        gap: 10,
    },
    courtSelectorText: { flex: 1, fontSize: 16, color: c.text, fontFamily: FONT_BODY_REGULAR },

    // Court picker view
    courtPickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    courtBackBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    courtBackText: { color: c.secondary, fontSize: 16, fontFamily: FONT_BODY_SEMIBOLD },
    courtPickerTitle: { fontSize: 18, fontFamily: FONT_DISPLAY_BOLD, color: c.text },
    courtOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        gap: 12,
    },
    courtOptionSelected: {
        backgroundColor: c.accentSoft,
        borderRadius: 8,
    },
    courtOptionText: { fontSize: 15, fontFamily: FONT_BODY_SEMIBOLD, color: c.text },
    courtOptionSub: { fontSize: 12, color: c.textSoft, marginTop: 2, fontFamily: FONT_BODY_REGULAR },

    // Merge from edit
    mergeEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 15,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.danger,
        borderStyle: 'dashed',
    },
    mergeEditBtnText: { color: c.danger, fontFamily: FONT_BODY_SEMIBOLD, fontSize: 14 },
});
