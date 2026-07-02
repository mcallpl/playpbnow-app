import React, { useMemo } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FONT_BODY_SEMIBOLD, FONT_BODY_REGULAR, FONT_BODY_MEDIUM } from '@/constants/theme';
import { SetupState, SetupAction } from '../types/setupTypes';
import { createSetupStyles } from '../styles/setupStyles';
import { BrandedIcon } from '@/components/BrandedIcon';

const API_URL = 'https://peoplestar.com/PlayPBNow/api';

interface EditPlayerModalProps {
  state: SetupState;
  dispatch: React.Dispatch<SetupAction>;
}

export function EditPlayerModal({ state, dispatch }: EditPlayerModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSetupStyles(colors, false), [colors]);

  const saveEditPlayer = async () => {
    if (!state.editingPlayer || !state.editName.trim()) return;
    const duprVal = state.editDupr.trim();
    if (duprVal) {
      const num = parseFloat(duprVal);
      if (isNaN(num) || num < 1.0 || num > 8.0) {
        Alert.alert('Invalid DUPR', 'DUPR rating must be between 1.0 and 8.0');
        return;
      }
    }
    const selectedCourt = state.allCourts.find((c) => c.id === state.editHomeCourtId);
    const updatedPlayer = {
      ...state.editingPlayer,
      first_name: state.editName.trim(),
      last_name: state.editLastName.trim(),
      gender: state.editGender,
      cell_phone: state.editPhone.trim() || undefined,
      dupr_rating: duprVal || undefined,
      home_court_id: state.editHomeCourtId,
      home_court_name: selectedCourt ? selectedCourt.name : null,
    };
    dispatch({ type: 'UPDATE_PLAYER', payload: updatedPlayer });
    try {
      await fetch(`${API_URL}/update_player.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_key: state.editingPlayer.id,
          first_name: state.editName.trim(),
          last_name: state.editLastName.trim(),
          gender: state.editGender,
          cell_phone: state.editPhone.trim() || null,
          dupr_rating: duprVal || null,
          home_court_id: state.editHomeCourtId || '',
        }),
      });
    } catch (e) {
      // Error details logged in development mode only
    }
    dispatch({ type: 'SET_EDITING_PLAYER', payload: null });
  };

  return (
    <Modal visible={!!state.editingPlayer} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>EDIT PLAYER</Text>

            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.modalInput}
              value={state.editName}
              onChangeText={(text) => dispatch({ type: 'SET_EDIT_NAME', payload: text })}
              autoFocus
              placeholder="First name"
              placeholderTextColor={colors.inputPlaceholder}
            />

            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.modalInput}
              value={state.editLastName}
              onChangeText={(text) => dispatch({ type: 'SET_EDIT_LAST_NAME', payload: text })}
              placeholder="Last name"
              placeholderTextColor={colors.inputPlaceholder}
            />

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 }}>
              <Pressable
                onPress={() => dispatch({ type: 'SET_EDIT_GENDER', payload: 'male' })}
                style={[styles.editGenderBtn, state.editGender === 'male' && { backgroundColor: colors.male }]}
              >
                <BrandedIcon
                  name="gender-male"
                  size={18}
                  color={state.editGender === 'male' ? 'white' : colors.textMuted}
                />
                <Text
                  style={{
                    color: state.editGender === 'male' ? 'white' : colors.textMuted,
                    fontFamily: FONT_BODY_SEMIBOLD,
                    fontSize: 14,
                  }}
                >
                  Male
                </Text>
              </Pressable>
              <Pressable
                onPress={() => dispatch({ type: 'SET_EDIT_GENDER', payload: 'female' })}
                style={[styles.editGenderBtn, state.editGender === 'female' && { backgroundColor: colors.female }]}
              >
                <BrandedIcon
                  name="gender-female"
                  size={18}
                  color={state.editGender === 'female' ? 'white' : colors.textMuted}
                />
                <Text
                  style={{
                    color: state.editGender === 'female' ? 'white' : colors.textMuted,
                    fontFamily: FONT_BODY_SEMIBOLD,
                    fontSize: 14,
                  }}
                >
                  Female
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Cell Phone</Text>
            <TextInput
              style={styles.modalInput}
              value={state.editPhone}
              onChangeText={(text) => dispatch({ type: 'SET_EDIT_PHONE', payload: text })}
              placeholder="(optional)"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>DUPR Rating</Text>
            <TextInput
              style={styles.modalInput}
              value={state.editDupr}
              onChangeText={(text) => dispatch({ type: 'SET_EDIT_DUPR', payload: text })}
              placeholder="1.0 - 8.0 (optional)"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Home Court</Text>
            <TouchableOpacity
              style={[
                styles.modalInput,
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
              ]}
              onPress={() => {
                dispatch({ type: 'SET_SHOW_COURT_PICKER', payload: !state.showCourtPicker });
                dispatch({ type: 'SET_COURT_SEARCH_TEXT', payload: '' });
              }}
            >
              <Text
                style={{
                  color: state.editHomeCourtId ? colors.inputText : colors.inputPlaceholder,
                  fontFamily: FONT_BODY_MEDIUM,
                  fontSize: 16,
                }}
              >
                {state.editHomeCourtId
                  ? state.allCourts.find((c) => c.id === state.editHomeCourtId)?.name || 'Unknown'
                  : '(optional)'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {state.showCourtPicker ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {state.showCourtPicker && (
              <View
                style={{
                  backgroundColor: colors.surfaceLight,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  marginBottom: 10,
                  maxHeight: 200,
                }}
              >
                <TextInput
                  style={[styles.modalInput, { margin: 8, marginBottom: 4 }]}
                  value={state.courtSearchText}
                  onChangeText={(text) => dispatch({ type: 'SET_COURT_SEARCH_TEXT', payload: text })}
                  placeholder="Search courts..."
                  placeholderTextColor={colors.inputPlaceholder}
                  autoFocus
                />
                <ScrollView nestedScrollEnabled style={{ maxHeight: 140 }}>
                  {state.editHomeCourtId && (
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderColor: colors.border,
                      }}
                      onPress={() => {
                        dispatch({ type: 'SET_EDIT_HOME_COURT_ID', payload: null });
                        dispatch({ type: 'SET_SHOW_COURT_PICKER', payload: false });
                      }}
                    >
                      <Text
                        style={{
                          color: colors.danger,
                          fontFamily: FONT_BODY_SEMIBOLD,
                          fontSize: 14,
                        }}
                      >
                        Clear Home Court
                      </Text>
                    </TouchableOpacity>
                  )}
                  {state.allCourts
                    .filter(
                      (c) =>
                        !state.courtSearchText ||
                        c.name.toLowerCase().includes(state.courtSearchText.toLowerCase()) ||
                        (c.city && c.city.toLowerCase().includes(state.courtSearchText.toLowerCase()))
                    )
                    .map((court) => (
                      <TouchableOpacity
                        key={court.id}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderColor: colors.border,
                          backgroundColor:
                            court.id === state.editHomeCourtId ? colors.accentSoft : 'transparent',
                        }}
                        onPress={() => {
                          dispatch({ type: 'SET_EDIT_HOME_COURT_ID', payload: court.id });
                          dispatch({ type: 'SET_SHOW_COURT_PICKER', payload: false });
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FONT_BODY_SEMIBOLD,
                            fontSize: 14,
                            color: colors.text,
                          }}
                        >
                          {court.name}
                        </Text>
                        {court.city && (
                          <Text
                            style={{
                              fontFamily: FONT_BODY_REGULAR,
                              fontSize: 11,
                              color: colors.textMuted,
                            }}
                          >
                            {court.city}
                            {court.state ? `, ${court.state}` : ''}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1, backgroundColor: colors.border }]}
                onPress={() => dispatch({ type: 'SET_EDITING_PLAYER', payload: null })}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1, backgroundColor: colors.accent }]}
                onPress={saveEditPlayer}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
