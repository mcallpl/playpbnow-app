import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
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
import { useGroupManagement } from '../../hooks/useGroupManagement';
import { usePlayerManagement } from '../../hooks/usePlayerManagement';
import { usePlayerSelection } from '../../hooks/usePlayerSelection';

const API_URL = 'https://peoplestar.com/Chipleball/api';

export default function PlayersScreen() {
    const router = useRouter();

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
        setEditModalVisible(true);
    };

    // Save player edits
    const handleSavePlayer = async () => {
        if (!editingPlayer) return;
        const updates: any = {
            first_name: firstName,
            last_name: lastName,
            cell_phone: cellPhone,
            gender: gender,
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

        Alert.alert(
            'Merge Players',
            `Merge ${mergeTargets.length} record${mergeTargets.length !== 1 ? 's' : ''} into "${keepPlayer.first_name}"${keepPlayer.last_name ? ' ' + keepPlayer.last_name : ''} (ID: ${keepPlayer.id})?\n\nMatch history and stats will be preserved.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Merge',
                    style: 'destructive',
                    onPress: async () => {
                        setIsMerging(true);
                        let mergedCount = 0;

                        for (const target of mergeTargets) {
                            setMergeProgress(`Merging "${target.first_name}" (ID: ${target.id}) into ID: ${keepPlayer.id}...`);
                            try {
                                const res = await fetch(`${API_URL}/merge_players.php`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ keep_id: keepPlayer.id, merge_id: target.id })
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
                        setSelectedMergeIds(prev => ({ ...prev, [key]: [] }));
                        Alert.alert('Merge Complete', `Merged ${mergedCount} duplicate "${group.name}" record${mergedCount !== 1 ? 's' : ''}.`);
                        loadPlayers();
                    }
                }
            ]
        );
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

    // Merge ALL duplicate groups at once
    const mergeAllDuplicates = async () => {
        Alert.alert(
            'Merge All Duplicates',
            `This will merge ${totalDuplicates} duplicate player record${totalDuplicates !== 1 ? 's' : ''} across ${duplicateGroups.length} name${duplicateGroups.length !== 1 ? 's' : ''}. For each name, the oldest record is kept and all duplicates are merged into it.\n\nMatch history and stats will be preserved.\n\nContinue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Merge All',
                    style: 'destructive',
                    onPress: async () => {
                        setIsMerging(true);
                        let totalMerged = 0;
                        for (const group of duplicateGroups) {
                            const sorted = [...group.players].sort((a: any, b: any) => a.id - b.id);
                            const keepPlayer = sorted[0];
                            for (let i = 1; i < sorted.length; i++) {
                                setMergeProgress(`Merging "${group.name}" (${i}/${sorted.length - 1})...`);
                                try {
                                    const res = await fetch(`${API_URL}/merge_players.php`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ keep_id: keepPlayer.id, merge_id: sorted[i].id })
                                    });
                                    const data = await res.json();
                                    if (data.status === 'success') totalMerged++;
                                } catch (e) { console.error('Merge error:', e); }
                            }
                        }
                        setIsMerging(false);
                        setMergeProgress('');
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
                    <Ionicons name={selectionMode ? 'close' : 'checkmark-done'} size={20} color="white" />
                    <Text style={styles.selectBtnText}>
                        {selectionMode ? 'CANCEL' : 'SELECT'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Duplicate Warning Banner */}
            {totalDuplicates > 0 && !selectionMode && (
                <TouchableOpacity style={styles.dupBanner} onPress={() => setMergeModalVisible(true)}>
                    <Ionicons name="warning" size={20} color="white" />
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
                <ActivityIndicator size="large" color="#4a90e2" style={{ marginTop: 50 }} />
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
                                <Ionicons name="close" size={28} color={isMerging ? '#ccc' : '#666'} />
                            </TouchableOpacity>
                        </View>

                        {isMerging ? (
                            <View style={styles.mergingOverlay}>
                                <ActivityIndicator size="large" color="#87ca37" />
                                <Text style={styles.mergingText}>Processing...</Text>
                                <Text style={styles.mergingProgress}>{mergeProgress}</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.mergeScroll}>
                                <Text style={styles.mergeIntro}>
                                    Select which players are the same person, then tap MERGE. If two players share a name but are different people, tap "Not Same Person" to stop flagging them.
                                </Text>

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
                                                        <Ionicons
                                                            name={isChecked ? 'checkbox' : 'square-outline'}
                                                            size={22}
                                                            color={isChecked ? '#87ca37' : '#ccc'}
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
                                                    <Ionicons name="git-merge" size={16} color="white" />
                                                    <Text style={styles.mergeGroupBtnText}>
                                                        MERGE{selected.length >= 2 ? ` (${selected.length})` : ''}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.notSameBtn}
                                                    onPress={() => markNotDuplicate(group)}
                                                >
                                                    <Ionicons name="people" size={16} color="#666" />
                                                    <Text style={styles.notSameBtnText}>Not Same Person</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}

                                {duplicateGroups.length > 1 && (
                                    <TouchableOpacity style={styles.mergeAllBtn} onPress={mergeAllDuplicates}>
                                        <Ionicons name="git-merge" size={20} color="white" />
                                        <Text style={styles.mergeAllBtnText}>
                                            MERGE ALL ({totalDuplicates} duplicate{totalDuplicates !== 1 ? 's' : ''})
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                <View style={{ height: 30 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Edit Player Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Player</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="First Name"
                            />

                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Last Name (optional)"
                            />

                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={cellPhone}
                                onChangeText={setCellPhone}
                                placeholder="(XXX) XXX-XXXX"
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.label}>Gender</Text>
                            <View style={styles.genderRow}>
                                <TouchableOpacity
                                    style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                                    onPress={() => setGender('male')}
                                >
                                    <Ionicons name="man" size={20} color={gender === 'male' ? 'white' : '#666'} />
                                    <Text style={[styles.genderBtnText, gender === 'male' && styles.genderBtnTextActive]}>Male</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                                    onPress={() => setGender('female')}
                                >
                                    <Ionicons name="woman" size={20} color={gender === 'female' ? 'white' : '#666'} />
                                    <Text style={[styles.genderBtnText, gender === 'female' && styles.genderBtnTextActive]}>Female</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>DUPR Rating</Text>
                            <View style={styles.duprInputRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={duprRating}
                                    onChangeText={setDuprRating}
                                    placeholder="e.g. 3.50 (1.00 - 8.00)"
                                    keyboardType="decimal-pad"
                                    maxLength={4}
                                />
                                {duprRating !== '' && (
                                    <TouchableOpacity
                                        style={styles.duprClearBtn}
                                        onPress={() => setDuprRating('')}
                                    >
                                        <Ionicons name="close-circle" size={22} color="#999" />
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
                                    <Ionicons name="git-merge" size={18} color="#ff6b35" />
                                    <Text style={styles.mergeEditBtnText}>Merge with duplicate...</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    header: {
        backgroundColor: '#1b3358',
        padding: 20,
        paddingTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
    headerSub: { color: '#87ca37', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    selectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#4a90e2',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20
    },
    selectBtnActive: { backgroundColor: '#e74c3c' },
    selectBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    listContent: { padding: 20, paddingBottom: 150 },
    listContentWithSelector: { paddingBottom: 250 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },

    // Duplicate banner
    dupBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ff6b35',
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginHorizontal: 15,
        marginTop: 10,
        borderRadius: 12,
        gap: 10,
    },
    dupBannerText: { flex: 1, color: 'white', fontWeight: '700', fontSize: 13 },
    dupBannerBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    dupBannerBtnText: { color: 'white', fontWeight: '900', fontSize: 11 },

    // Merge modal
    mergeContainer: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    mergeScroll: { paddingHorizontal: 20 },
    mergeIntro: { color: '#666', fontSize: 13, lineHeight: 19, marginBottom: 15 },
    dupGroupCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    dupGroupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dupGroupName: { fontSize: 16, fontWeight: '800', color: '#1b3358' },
    dupGroupCount: { fontSize: 12, color: '#999', marginTop: 2 },
    mergeGroupBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#ff6b35',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    mergeGroupBtnText: { color: 'white', fontWeight: '800', fontSize: 12 },
    dupPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 10,
    },
    dupPlayerRowSelected: {
        backgroundColor: '#e8f5e9',
        borderRadius: 8,
    },
    dupPlayerInfo: { flex: 1 },
    dupPlayerName: { fontSize: 14, fontWeight: '600', color: '#333' },
    dupPlayerMeta: { fontSize: 11, color: '#666', marginTop: 2 },
    dupPlayerGroups: { fontSize: 10, color: '#999', marginTop: 2, fontStyle: 'italic' },
    dupActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    notSameBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    notSameBtnText: { color: '#666', fontWeight: '600', fontSize: 12 },
    btnDisabled: { opacity: 0.4 },
    mergeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#e74c3c',
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
    },
    mergeAllBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
    mergingOverlay: { padding: 40, alignItems: 'center', gap: 15 },
    mergingText: { fontSize: 16, fontWeight: '700', color: '#1b3358' },
    mergingProgress: { fontSize: 13, color: '#666', textAlign: 'center' },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1b3358' },
    modalBody: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
    genderRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
    genderBtnActive: { backgroundColor: '#4a90e2', borderColor: '#4a90e2' },
    genderBtnText: { fontSize: 14, fontWeight: '600', color: '#666' },
    genderBtnTextActive: { color: 'white' },
    duprInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    duprClearBtn: { padding: 4 },
    saveBtn: { backgroundColor: '#87ca37', borderRadius: 25, padding: 15, marginTop: 20, alignItems: 'center' },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

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
        borderColor: '#ff6b35',
        borderStyle: 'dashed',
    },
    mergeEditBtnText: { color: '#ff6b35', fontWeight: '600', fontSize: 14 },
});
