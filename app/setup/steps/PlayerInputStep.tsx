import React, { useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Alert } from '@/utils/crossAlert';
import { BrandedIcon } from '@/components/BrandedIcon';
import { useTheme } from '@/context/ThemeContext';
import { SetupState, SetupAction, SearchResult } from '../types/setupTypes';
import { createSetupStyles } from '../styles/setupStyles';

const API_URL = 'https://playpbnow.com/api';

interface PlayerInputStepProps {
  state: SetupState;
  dispatch: React.Dispatch<SetupAction>;
}

export function PlayerInputStep({ state, dispatch }: PlayerInputStepProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSetupStyles(colors, false), [colors]);
  const nameInputRef = useRef<TextInput>(null);
  // Cross-platform duplicate-name prompt (Alert.alert with multiple buttons is not
  // supported on React Native Web, so we use an in-app modal instead).
  const [dupPrompt, setDupPrompt] = useState<{
    name: string;
    gender: 'male' | 'female';
    phone: string | null;
    existing: any;
  } | null>(null);

  const searchGlobalPlayers = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
        dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', payload: false });
        return;
      }
      dispatch({ type: 'SET_IS_SEARCHING', payload: true });
      try {
        const res = await fetch(`${API_URL}/search_players.php?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status === 'success' && data.results.length > 0) {
          const existingIds = new Set(state.players.map((p) => p.id));
          const filtered = data.results.filter((r: SearchResult) => !existingIds.has(r.player_key));
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: filtered });
          dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', payload: filtered.length > 0 });
        } else {
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
          dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', payload: false });
        }
      } catch (e) {
        // Error details logged in development mode only
      } finally {
        dispatch({ type: 'SET_IS_SEARCHING', payload: false });
      }
    },
    [state.players, dispatch]
  );

  const handleNameChange = (text: string) => {
    const capitalized = text
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    dispatch({ type: 'SET_NEW_PLAYER_NAME', payload: capitalized });
    searchGlobalPlayers(capitalized);
  };

  const addExistingPlayer = async (result: SearchResult) => {
    try {
      const res = await fetch(`${API_URL}/add_player.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_key: state.groupKey, existing_player_id: result.id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        try {
          const rosterRes = await fetch(`${API_URL}/get_players.php?group_key=${state.groupKey}`);
          const rosterData = await rosterRes.json();
          if (rosterData.status === 'success') {
            dispatch({ type: 'SET_PLAYERS', payload: rosterData.players || [] });
          }
        } catch (e) {
          dispatch({
            type: 'ADD_PLAYER',
            payload: {
              id: result.player_key,
              db_id: result.id,
              first_name: result.first_name,
              last_name: result.last_name,
              gender: result.gender,
              home_court_name: result.home_court_name,
              wins: result.wins,
              losses: result.losses,
              win_pct: result.win_pct,
              groups: result.groups,
              is_verified: result.is_verified,
            },
          });
        }
        dispatch({ type: 'SET_NEW_PLAYER_NAME', payload: '' });
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
        dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', payload: false });
        dispatch({ type: 'SET_SHOW_PHONE_INPUT', payload: false });
        dispatch({ type: 'SET_NEW_PLAYER_PHONE', payload: '' });
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to add player');
    }
  };

  const addPlayerForceNew = async (
    name: string,
    gender: 'male' | 'female',
    phone: string | null
  ) => {
    try {
      const pk = 'pk_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
      const res = await fetch(`${API_URL}/add_player.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_key: state.groupKey,
          first_name: name,
          gender,
          player_key: pk,
          cell_phone: phone,
          force_new: true,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        dispatch({
          type: 'ADD_PLAYER',
          payload: {
            id: data.player_key || pk,
            first_name: data.first_name || name,
            gender,
            home_court_name: null,
          },
        });
        dispatch({ type: 'SET_NEW_PLAYER_NAME', payload: '' });
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
        dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', payload: false });
        dispatch({ type: 'SET_SHOW_PHONE_INPUT', payload: false });
        dispatch({ type: 'SET_NEW_PLAYER_PHONE', payload: '' });
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to add player');
    }
  };

  const addNewPlayer = async () => {
    if (state.isAdding) return;
    if (!state.newPlayerName.trim()) {
      Alert.alert('Enter Name', 'Please enter a player name.');
      return;
    }
    dispatch({ type: 'SET_IS_ADDING', payload: true });
    try {
      const pk = 'pk_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
      const phone = state.newPlayerPhone.trim() || null;
      const name = state.newPlayerName.trim();
      const gender = state.newPlayerGender;
      const res = await fetch(`${API_URL}/add_player.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_key: state.groupKey,
          first_name: name,
          gender,
          player_key: pk,
          cell_phone: phone,
        }),
      });
      const data = await res.json();
      if (data.status === 'duplicate_name') {
        const existing = data.existing_players[0];
        // Show a cross-platform modal (works on web + native) instead of a
        // multi-button Alert.alert, which crashes React Native Web.
        setDupPrompt({ name, gender, phone, existing });
      } else if (data.status === 'success') {
        try {
          const rosterRes = await fetch(`${API_URL}/get_players.php?group_key=${state.groupKey}`);
          const rosterData = await rosterRes.json();
          if (rosterData.status === 'success') {
            dispatch({ type: 'SET_PLAYERS', payload: rosterData.players || [] });
          }
        } catch (e) {
          dispatch({
            type: 'ADD_PLAYER',
            payload: {
              id: data.player_key || pk,
              first_name: data.first_name || name,
              gender,
              home_court_name: null,
            },
          });
        }
        dispatch({ type: 'SET_NEW_PLAYER_NAME', payload: '' });
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
        dispatch({ type: 'SET_SHOW_SEARCH_RESULTS', payload: false });
        dispatch({ type: 'SET_SHOW_PHONE_INPUT', payload: false });
        dispatch({ type: 'SET_NEW_PLAYER_PHONE', payload: '' });
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (e) {
      dispatch({
        type: 'ADD_PLAYER',
        payload: {
          id: Date.now().toString(),
          first_name: state.newPlayerName.trim(),
          gender: state.newPlayerGender,
        },
      });
      dispatch({ type: 'SET_NEW_PLAYER_NAME', payload: '' });
      dispatch({ type: 'SET_SHOW_PHONE_INPUT', payload: false });
      dispatch({ type: 'SET_NEW_PLAYER_PHONE', payload: '' });
    } finally {
      dispatch({ type: 'SET_IS_ADDING', payload: false });
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  };

  return (
    <View style={styles.inputArea}>
      <View style={styles.inputRow}>
        <TextInput
          ref={nameInputRef}
          style={styles.input}
          placeholder="Search or add player..."
          placeholderTextColor={colors.inputPlaceholder}
          value={state.newPlayerName}
          onChangeText={handleNameChange}
          onSubmitEditing={state.isAdding ? undefined : addNewPlayer}
          returnKeyType="done"
          blurOnSubmit={false}
          editable={!state.isAdding}
          autoCapitalize="words"
        />
        <Pressable
          style={[
            styles.genderBtn,
            state.newPlayerGender === 'male' ? styles.maleActive : styles.femaleActive,
          ]}
          onPress={() => {
            dispatch({
              type: 'SET_NEW_PLAYER_GENDER',
              payload: state.newPlayerGender === 'male' ? 'female' : 'male',
            });
          }}
          disabled={state.isAdding}
        >
          <BrandedIcon
            name={state.newPlayerGender === 'male' ? 'gender-male' : 'gender-female'}
            size={20}
            color="white"
          />
        </Pressable>
        <TouchableOpacity
          style={[styles.addBtn, state.isAdding && { opacity: 0.5 }]}
          onPress={addNewPlayer}
          disabled={state.isAdding}
        >
          {state.isAdding ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <BrandedIcon name="add" size={24} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {state.showSearchResults && (
        <View style={styles.searchDropdown}>
          {state.searchResults.slice(0, 5).map((result) => (
            <TouchableOpacity
              key={result.id}
              style={styles.searchRow}
              onPress={() => addExistingPlayer(result)}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <BrandedIcon
                    name={result.gender === 'female' ? 'gender-female' : 'gender-male'}
                    size={16}
                    color={result.gender === 'female' ? colors.female : colors.male}
                  />
                  <Text style={styles.searchName}>
                    {result.first_name} {result.last_name}
                  </Text>
                  {result.is_verified && (
                    <BrandedIcon name="confirm" size={12} color={colors.accent} />
                  )}
                </View>
                <Text style={styles.searchMeta}>
                  {result.source}
                  {result.groups.length > 0 ? ` · ${result.groups.join(', ')}` : ''}
                  {result.wins + result.losses > 0 ? ` · ${result.wins}W-${result.losses}L` : ''}
                </Text>
              </View>
              <BrandedIcon name="add" size={24} color={colors.accent} />
            </TouchableOpacity>
          ))}
          {state.isSearching && (
            <ActivityIndicator size="small" color={colors.secondary} style={{ padding: 10 }} />
          )}
        </View>
      )}

      <Modal
        visible={!!dupPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setDupPrompt(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              Player Already Exists
            </Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 20, lineHeight: 20 }}>
              {dupPrompt
                ? `"${dupPrompt.existing.first_name}" is already in this group. Is this the same person?`
                : ''}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.accent, borderRadius: 10, padding: 14, marginBottom: 10 }}
              onPress={() => {
                if (!dupPrompt) return;
                const e = dupPrompt.existing;
                setDupPrompt(null);
                addExistingPlayer({
                  id: e.id,
                  player_key: e.player_key,
                  first_name: e.first_name,
                  last_name: e.last_name || '',
                  gender: e.gender,
                  home_court_name: null,
                  wins: 0,
                  losses: 0,
                  win_pct: 0,
                  groups: [],
                  is_verified: false,
                  source: 'duplicate',
                });
              }}
            >
              <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '700' }}>
                Same Person
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: colors.inputBg || colors.bg, borderRadius: 10, padding: 14, marginBottom: 10 }}
              onPress={() => {
                if (!dupPrompt) return;
                const { name, gender, phone } = dupPrompt;
                setDupPrompt(null);
                addPlayerForceNew(name, gender, phone);
              }}
            >
              <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>
                Different Person
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 12 }} onPress={() => setDupPrompt(null)}>
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
