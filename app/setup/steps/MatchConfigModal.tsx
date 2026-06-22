import React, { useMemo } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { FONT_BODY_SEMIBOLD, FONT_BODY_REGULAR } from '@/constants/theme';
import { SetupState, SetupAction } from '../types/setupTypes';
import { createSetupStyles } from '../styles/setupStyles';
import { BrandedIcon } from '@/components/BrandedIcon';
import { storeNavData } from '@/utils/navData';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = '/api';

interface MatchConfigModalProps {
  state: SetupState;
  dispatch: React.Dispatch<SetupAction>;
}

export function MatchConfigModal({ state, dispatch }: MatchConfigModalProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createSetupStyles(colors, false), [colors]);

  const courtCount = Math.floor(state.players.length / 4);
  const teamCount = Math.floor(state.players.length / 2);
  const fixedRoundCount =
    teamCount > 1 ? (teamCount % 2 === 0 ? teamCount - 1 : teamCount) : 0;
  const fixedGameCount = (teamCount * (teamCount - 1)) / 2;

  const generateSchedule = async () => {
    try {
      dispatch({ type: 'SET_CONFIG_MODAL_VISIBLE', payload: false });
      if (state.groupName) {
        await AsyncStorage.removeItem(`scores_${state.groupName}`);
      }

      const teamsPayload = state.isFixedTeams
        ? Array.from({ length: Math.floor(state.players.length / 2) }, (_, i) => ({
            id: `team-${i}`,
            player1: {
              id: state.players[i * 2].id,
              first_name: state.players[i * 2].first_name,
              gender: state.players[i * 2].gender,
            },
            player2: {
              id: state.players[i * 2 + 1].id,
              first_name: state.players[i * 2 + 1].first_name,
              gender: state.players[i * 2 + 1].gender,
            },
          }))
        : undefined;

      const payload = state.isFixedTeams
        ? {
            group_key: state.groupKey,
            mode: 'fixed_teams',
            teams: teamsPayload,
            players: state.players.map((p) => ({
              id: p.id,
              first_name: p.first_name,
              gender: p.gender,
            })),
          }
        : {
            group_key: state.groupKey,
            round_configs: state.roundsConfig,
            group: state.groupName,
            players: state.players.map((p) => ({
              id: p.id,
              first_name: p.first_name,
              gender: p.gender,
            })),
          };

      const res = await fetch(`${API_URL}/generate_schedule.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const navId = await storeNavData({
          schedule: data.schedule,
          players: state.players,
          isFixedTeams: state.isFixedTeams,
          teams: teamsPayload,
        });
        router.push({
          pathname: '/(tabs)/game',
          params: {
            navId,
            groupName: state.groupName,
            groupKey: state.groupKey,
            courtName: state.courtName,
            courtId: (state.courtId || '').toString(),
            isFixedTeams: state.isFixedTeams.toString(),
          },
        });
      } else {
        Alert.alert('Error', data.message || 'Generation failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error.');
    }
  };

  return (
    <Modal visible={state.configModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>MATCH SETUP</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>{state.players.length} Players</Text>
              <Text style={styles.infoBoxText}>·</Text>
              {state.isFixedTeams ? (
                <Text style={styles.infoBoxText}>{teamCount} Teams</Text>
              ) : (
                <Text style={styles.infoBoxText}>{courtCount} Courts</Text>
              )}
            </View>

            {state.isFixedTeams ? (
              <>
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxText}>
                    {fixedRoundCount} Rounds · {fixedGameCount} Games
                  </Text>
                </View>
                <View
                  style={{
                    marginVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <Text style={[styles.label, { marginBottom: 8 }]}>
                    TEAM PAIRINGS (by roster order)
                  </Text>
                  {Array.from({ length: teamCount }, (_, i) => (
                    <View key={i} style={[styles.roundConfigRow, { justifyContent: 'flex-start', gap: 10 }]}>
                      <Text style={[styles.roundNum, { width: 50 }]}>Team {i + 1}</Text>
                      <Text
                        style={{
                          fontFamily: FONT_BODY_SEMIBOLD,
                          fontSize: 14,
                          color: colors.text,
                          flex: 1,
                        }}
                      >
                        {state.players[i * 2]?.first_name || '?'} &{' '}
                        {state.players[i * 2 + 1]?.first_name || '?'}
                      </Text>
                    </View>
                  ))}
                  <Text
                    style={{
                      fontFamily: FONT_BODY_REGULAR,
                      fontSize: 11,
                      color: colors.textMuted,
                      marginTop: 4,
                    }}
                  >
                    Reorder players on the roster to change pairings
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.counterRow}>
                  <Text style={styles.label}>ROUNDS:</Text>
                  <View style={styles.roundControls}>
                    <TouchableOpacity
                      onPress={() => dispatch({ type: 'REMOVE_ROUND' })}
                      style={styles.roundBtn}
                    >
                      <BrandedIcon name="minus" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.roundCountText}>{state.roundsConfig.length}</Text>
                    <TouchableOpacity
                      onPress={() => dispatch({ type: 'ADD_ROUND' })}
                      style={styles.roundBtn}
                    >
                      <BrandedIcon name="add" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View
                  style={{
                    maxHeight: 200,
                    marginVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                  }}
                >
                  <ScrollView contentContainerStyle={{ padding: 10 }} nestedScrollEnabled>
                    {state.roundsConfig.map((conf, index) => (
                      <View key={index} style={styles.roundConfigRow}>
                        <Text style={styles.roundNum}>#{index + 1}</Text>
                        <View style={styles.toggleGroup}>
                          {(['mixed', 'gender', 'mixer'] as const).map((t) => (
                            <TouchableOpacity
                              key={t}
                              style={[
                                styles.smallTypeBtn,
                                conf.type === t && styles.smallTypeActive,
                              ]}
                              onPress={() =>
                                dispatch({
                                  type: 'UPDATE_ROUND_TYPE',
                                  payload: { index, type: t },
                                })
                              }
                            >
                              <Text
                                style={[
                                  styles.smallTypeText,
                                  conf.type === t && { color: colors.bg },
                                ]}
                              >
                                {t.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
            <TouchableOpacity style={styles.startMatchBtn} onPress={generateSchedule}>
              <Text style={styles.startMatchText}>GENERATE MATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => dispatch({ type: 'SET_CONFIG_MODAL_VISIBLE', payload: false })}
              style={styles.closeModalBtn}
            >
              <Text style={styles.closeText}>CANCEL</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
