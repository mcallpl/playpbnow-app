import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
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

    // Group selection state
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

    // Load data on focus
    useFocusEffect(
        useCallback(() => {
            loadPlayers();
            loadGroups();
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

            // For now, we need a group to add a player
            // Later we can create a "Global Players" group or modify the API
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
        setEditModalVisible(true);
    };

    // Save player edits
    const handleSavePlayer = async () => {
        if (!editingPlayer) return;

        const success = await updatePlayer(editingPlayer.id, {
            first_name: firstName,
            last_name: lastName,
            cell_phone: cellPhone,
            gender: gender,
        });

        if (success) {
            setEditModalVisible(false);
        }
    };

    // Delete player
    const handleDeletePlayer = async (player: any) => {
        await deletePlayer(player.id, player.first_name);
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

        // Get selected player objects
        const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.id));

        // Format players for the match setup screen (same format as setup.tsx expects)
        const formattedPlayers = selectedPlayers.map(p => ({
            id: p.player_key || p.id.toString(),
            first_name: p.first_name,
            last_name: p.last_name || '',
            gender: p.gender?.toLowerCase().startsWith('f') ? 'female' : 'male'
        }));

        // Navigate to match setup screen with these players
        router.push({
            pathname: '/setup',
            params: {
                groupName: 'Quick Match',
                groupKey: `quick_${Date.now()}`,
                preselectedPlayers: JSON.stringify(formattedPlayers)
            }
        });

        // Clear selection
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

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlayer}>
                                <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                            </TouchableOpacity>
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
    saveBtn: { backgroundColor: '#87ca37', borderRadius: 25, padding: 15, marginTop: 20, alignItems: 'center' },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
