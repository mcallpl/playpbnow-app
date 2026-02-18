import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ✅ FIXED: Absolute imports
import { MatchCard } from '@/components/MatchCard';
import { MatchRecord } from '@/hooks/useHeadToHead';

interface FilteredGamesModalProps {
    visible: boolean;
    onClose: () => void;
    games: MatchRecord[];
    title: string;
}

export function FilteredGamesModal({ visible, onClose, games, title }: FilteredGamesModalProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            presentationStyle="pageSheet" 
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 20 }]}>
                
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={styles.closeBtn} 
                        hitSlop={{top:20, bottom:20, left:20, right:20}} 
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.placeholder} />
                </View>
                
                <FlatList
                    data={games}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item }) => <MatchCard match={item} />}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No games found.</Text>}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1b3358' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#152945'
    },
    closeBtn: { padding: 5 },
    title: { color: 'white', fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
    placeholder: { width: 40 },
    listContent: { padding: 20, paddingBottom: 60 },
    emptyText: { color: '#aaa', textAlign: 'center', marginTop: 30, fontSize: 16 }
});