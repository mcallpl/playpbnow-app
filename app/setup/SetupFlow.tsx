import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Alert } from '@/utils/crossAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BrandedIcon } from '@/components/BrandedIcon';
import { useTheme } from '@/context/ThemeContext';
import { FONT_BODY_BOLD, FONT_DISPLAY_BOLD, FONT_DISPLAY_EXTRABOLD } from '@/constants/theme';
import { useSetupState } from './hooks/useSetupState';
import { Player, Court } from './types/setupTypes';
import { createSetupStyles } from './styles/setupStyles';
import { PlayerInputStep } from './steps/PlayerInputStep';
import { PlayerListStep } from './steps/PlayerListStep';
import { EditPlayerModal } from './steps/EditPlayerModal';
import { SaveRosterModal } from './steps/SaveRosterModal';
import { MatchConfigModal } from './steps/MatchConfigModal';

const API_URL = 'https://playpbnow.com/api';

export default function SetupFlow() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createSetupStyles(colors, isDark), [colors, isDark]);
  const { state, dispatch } = useSetupState();

  const nameInputRef = useRef<any>(null);
  const listRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        let did = await AsyncStorage.getItem('user_id');
        if (!did) {
          Alert.alert('Error', 'Please login first');
          return;
        }
        dispatch({ type: 'SET_DEVICE_ID', payload: did });

        let gKey = params.groupKey as string || '';
        let gName = params.groupName as string || '';
        if (!gKey) {
          Alert.alert('Error', 'Group not loaded properly. Please go back and select again.');
          return;
        }
        dispatch({ type: 'SET_GROUP_KEY', payload: gKey });
        if (gName) dispatch({ type: 'SET_GROUP_NAME', payload: gName });
        if (params.groupId) dispatch({ type: 'SET_GROUP_ID', payload: params.groupId as string });

        if (params.courtId) dispatch({ type: 'SET_COURT_ID', payload: parseInt(params.courtId as string) });
        if (params.courtName) dispatch({ type: 'SET_COURT_NAME', payload: params.courtName as string });

        // Load all courts for edit player dropdown
        try {
          const courtsRes = await fetch(`${API_URL}/get_courts.php`);
          if (!courtsRes.ok) {
            return;
          }
          const courtsData = await courtsRes.json();
          if (courtsData.status === 'success') {
            dispatch({ type: 'SET_ALL_COURTS', payload: courtsData.courts || [] });
          }
        } catch (e) {
          // Error details logged in development mode only
        }

        // Load preselected players from navData (AsyncStorage) or legacy URL params
        if (params.navId) {
          const { getNavData } = await import('@/utils/navData');
          const navData = await getNavData(params.navId as string);
          if (navData?.preselectedPlayers) {
            dispatch({ type: 'SET_PLAYERS', payload: navData.preselectedPlayers });
            return;
          }
        }
        if (params.preselectedPlayers) {
          try {
            dispatch({
              type: 'SET_PLAYERS',
              payload: JSON.parse(params.preselectedPlayers as string),
            });
            return;
          } catch (e) {}
        }

        if (gKey) {
          try {
            const res = await fetch(`${API_URL}/get_players.php?group_key=${gKey}`);
            const data = await res.json();
            if (data.status === 'success') {
              dispatch({ type: 'SET_PLAYERS', payload: data.players || [] });
            } else {
              dispatch({ type: 'SET_PLAYERS', payload: [] });
            }
          } catch (e) {
            dispatch({ type: 'SET_PLAYERS', payload: [] });
          }
        }
      };
      load()
        .then(() => {
          setTimeout(() => nameInputRef.current?.focus(), 300);
        })
        .catch((err) => {
          setTimeout(() => nameInputRef.current?.focus(), 300);
        });
      // Also focus whenever this screen regains focus
      setTimeout(() => nameInputRef.current?.focus(), 500);
    }, [params.groupId, params.groupName, params.groupKey])
  );

  const handleSavePress = () => {
    dispatch({ type: 'SET_SAVE_AS_NAME', payload: state.groupName });
    dispatch({ type: 'SET_SAVE_MODAL_VISIBLE', payload: true });
  };

  // PlayerListStep calls onDragEnd(data) with the reordered ARRAY — do not
  // destructure {data} here. The old signature received the array, read .data
  // (undefined), wiped the roster, and crashed the next render on
  // state.players.filter ("Cannot read property 'filter' of undefined").
  const handleDragEnd = (data: Player[]) => {
    if (!Array.isArray(data) || data.length === 0) return; // never wipe the roster
    dispatch({ type: 'SET_PLAYERS_ORDER', payload: data });
    if (state.groupKey && state.deviceId) {
      fetch(`${API_URL}/save_players.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_key: state.groupKey,
          user_id: state.deviceId,
          players: data,
        }),
      }).catch(() => {});
    }
  };

  const handleSetupPress = () => {
    if (state.players.length < 4) {
      Alert.alert('Not Enough Players', 'You need at least 4 players.');
      return;
    }
    if (state.isFixedTeams && state.players.length % 2 !== 0) {
      Alert.alert(
        'Odd Player Count',
        'Fixed Teams requires an even number of players. Every player needs a partner.'
      );
      return;
    }
    dispatch({ type: 'SET_CONFIG_MODAL_VISIBLE', payload: true });
  };

  const openEditPlayer = (player: Player) => {
    dispatch({ type: 'SET_EDITING_PLAYER', payload: player });
    dispatch({ type: 'SET_EDIT_NAME', payload: player.first_name });
    dispatch({ type: 'SET_EDIT_LAST_NAME', payload: player.last_name || '' });
    dispatch({
      type: 'SET_EDIT_GENDER',
      payload: (player.gender?.toLowerCase() || '').startsWith('f') ? 'female' : 'male',
    });
    dispatch({ type: 'SET_EDIT_PHONE', payload: player.cell_phone || '' });
    dispatch({ type: 'SET_EDIT_DUPR', payload: player.dupr_rating || '' });
    dispatch({ type: 'SET_EDIT_HOME_COURT_ID', payload: player.home_court_id || null });
    dispatch({ type: 'SET_SHOW_COURT_PICKER', payload: false });
    dispatch({ type: 'SET_COURT_SEARCH_TEXT', payload: '' });
  };

  const maleCount = state.players.filter((p) => p.gender === 'male').length;
  const femaleCount = state.players.filter((p) => p.gender === 'female').length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/groups')}
              style={styles.backBtn}
            >
              <BrandedIcon name="back" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {state.groupName ? state.groupName.toUpperCase() : 'NEW GROUP'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleSavePress} style={styles.saveHeaderBtn}>
              <Text style={styles.saveHeaderText}>SAVE</Text>
            </TouchableOpacity>
          </View>

          {/* Player count chips */}
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.chipText, { color: colors.accent }]}>
                {state.players.length} Players
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: 'rgba(79,172,254,0.1)' }]}>
              <Text style={[styles.chipText, { color: colors.male }]}>{maleCount} M</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: 'rgba(247,140,162,0.1)' }]}>
              <Text style={[styles.chipText, { color: colors.female }]}>{femaleCount} F</Text>
            </View>
          </View>

          {/* MODE SELECTOR */}
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeBtn, !state.isFixedTeams && styles.modeBtnActive]}
              onPress={() => dispatch({ type: 'SET_IS_FIXED_TEAMS', payload: false })}
              activeOpacity={0.7}
            >
              <BrandedIcon
                name="shuffle"
                size={18}
                color={!state.isFixedTeams ? colors.bg : colors.textMuted}
              />
              <Text style={[styles.modeBtnText, !state.isFixedTeams && styles.modeBtnTextActive]}>
                ROTATING PARTNERS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, state.isFixedTeams && styles.modeBtnActive]}
              onPress={() => dispatch({ type: 'SET_IS_FIXED_TEAMS', payload: true })}
              activeOpacity={0.7}
            >
              <BrandedIcon
                name="link"
                size={18}
                color={state.isFixedTeams ? colors.bg : colors.textMuted}
              />
              <Text style={[styles.modeBtnText, state.isFixedTeams && styles.modeBtnTextActive]}>
                FIXED TEAMS
              </Text>
            </TouchableOpacity>
          </View>
          {state.isFixedTeams && (
            <Text style={styles.toggleInfo}>
              {Math.floor(state.players.length / 2)} teams ·{' '}
              {Math.floor(state.players.length / 2) > 1
                ? Math.floor(state.players.length / 2) % 2 === 0
                  ? Math.floor(state.players.length / 2) - 1
                  : Math.floor(state.players.length / 2)
                : 0}{' '}
              rounds ·{' '}
              {(Math.floor(state.players.length / 2) *
                (Math.floor(state.players.length / 2) - 1)) /
                2}{' '}
              games
            </Text>
          )}

          {/* ACTION BUTTONS */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.createMatchBtn} onPress={handleSetupPress}>
              <BrandedIcon name="game-controller" size={18} color={colors.bg} />
              <Text style={styles.createMatchBtnText}>CREATE MATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editPlayersBtn}
              onPress={() => router.push('/(tabs)/players')}
            >
              <BrandedIcon name="groups" size={18} color={colors.textSoft} />
              <Text style={styles.editPlayersBtnText}>ALL PLAYERS</Text>
            </TouchableOpacity>
          </View>

          {/* PLAYER INPUT WITH GLOBAL SEARCH */}
          <PlayerInputStep state={state} dispatch={dispatch} />

          {/* PLAYER LIST */}
          <PlayerListStep
            state={state}
            dispatch={dispatch}
            listRef={listRef}
            onEditPlayer={openEditPlayer}
            onDragEnd={handleDragEnd}
          />

          {/* MODALS */}
          <EditPlayerModal state={state} dispatch={dispatch} />
          <SaveRosterModal state={state} dispatch={dispatch} />
          <MatchConfigModal state={state} dispatch={dispatch} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
