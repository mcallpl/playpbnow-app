import { useState } from 'react';

export function usePlayerSelection() {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        if (selectionMode) {
            // Turning off - clear selections
            setSelectedPlayerIds([]);
        }
    };

    const togglePlayerSelection = (playerId: number) => {
        if (selectedPlayerIds.includes(playerId)) {
            setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
        } else {
            setSelectedPlayerIds([...selectedPlayerIds, playerId]);
        }
    };

    const selectAll = (allPlayerIds: number[]) => {
        setSelectedPlayerIds(allPlayerIds);
    };

    const clearSelection = () => {
        setSelectedPlayerIds([]);
    };

    const isSelected = (playerId: number) => {
        return selectedPlayerIds.includes(playerId);
    };

    return {
        selectionMode,
        selectedPlayerIds,
        toggleSelectionMode,
        togglePlayerSelection,
        selectAll,
        clearSelection,
        isSelected
    };
}
