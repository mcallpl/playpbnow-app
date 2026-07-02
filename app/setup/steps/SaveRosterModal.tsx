import React, { useMemo } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { SetupState, SetupAction } from '../types/setupTypes';
import { createSetupStyles } from '../styles/setupStyles';
import { BrandedIcon } from '@/components/BrandedIcon';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

interface SaveRosterModalProps {
  state: SetupState;
  dispatch: React.Dispatch<SetupAction>;
}

export function SaveRosterModal({ state, dispatch }: SaveRosterModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSetupStyles(colors, false), [colors]);

  const handleSmartSave = async () => {
    const name = state.saveAsName.trim();
    if (!name) {
      Alert.alert('Error', 'Enter a group name.');
      return;
    }
    if (!state.groupKey || !state.deviceId) {
      Alert.alert(
        'Error',
        `Missing group info (key: ${state.groupKey}, device: ${state.deviceId})`
      );
      return;
    }
    try {
      const payload = {
        group_key: state.groupKey,
        user_id: state.deviceId,
        new_name: name,
        players: state.players,
      };
      const res = await fetch(`${API_URL}/save_group_roster.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert('Error', 'Invalid server response: ' + text.substring(0, 100));
        return;
      }
      if (data.status === 'success') {
        dispatch({ type: 'SET_SAVE_MODAL_VISIBLE', payload: false });
        if (data.group_key !== state.groupKey) {
          dispatch({ type: 'SET_GROUP_KEY', payload: data.group_key });
          dispatch({ type: 'SET_GROUP_NAME', payload: data.group_name });
          await AsyncStorage.setItem('active_group_key', data.group_key);
          await AsyncStorage.setItem('active_group_name', data.group_name);
        } else if (data.group_name !== state.groupName) {
          dispatch({ type: 'SET_GROUP_NAME', payload: data.group_name });
          await AsyncStorage.setItem('active_group_name', data.group_name);
        }
        Alert.alert(
          'Saved!',
          name === state.groupName
            ? 'Group roster updated.'
            : `New group "${name}" created.`
        );
      } else {
        Alert.alert('Error', data.message || 'Unknown error');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save: ' + (e.message || e));
    }
  };

  return (
    <Modal visible={state.saveModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>SAVE ROSTER</Text>
          <TextInput
            style={styles.modalInput}
            value={state.saveAsName}
            onChangeText={(text) => dispatch({ type: 'SET_SAVE_AS_NAME', payload: text })}
            placeholderTextColor={colors.inputPlaceholder}
          />
          <TouchableOpacity style={styles.saveOptionBtn} onPress={handleSmartSave}>
            <BrandedIcon name="save" size={24} color={colors.bg} />
            <Text style={styles.saveOptionText}>SAVE GROUP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => dispatch({ type: 'SET_SAVE_MODAL_VISIBLE', payload: false })}
            style={styles.closeModalBtn}
          >
            <Text style={styles.closeText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
