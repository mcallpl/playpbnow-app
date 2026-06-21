import React, { useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  Platform,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { BrandedIcon } from '../../components/BrandedIcon';
import { useTheme } from '../../context/ThemeContext';
import { FONT_BODY_BOLD, FONT_BODY_REGULAR, FONT_BODY_SEMIBOLD, FONT_DISPLAY_BOLD } from '../../constants/theme';
import { Player, SetupState, SetupAction } from '../types/setupTypes';
import { createSetupStyles } from '../styles/setupStyles';

interface PlayerListStepProps {
  state: SetupState;
  dispatch: React.Dispatch<SetupAction>;
  listRef: React.RefObject<any>;
  onEditPlayer: (player: Player) => void;
  onDragEnd: (data: Player[]) => void;
}

export function PlayerListStep({
  state,
  dispatch,
  listRef,
  onEditPlayer,
  onDragEnd,
}: PlayerListStepProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSetupStyles(colors, false), [colors]);

  const renderPlayerRow = (item: Player, drag: () => void, isActive: boolean, index?: number) => {
    const totalGames = (item.wins || 0) + (item.losses || 0);
    const hasStats = totalGames > 0;
    const idx = index ?? 0;
    const isEven = idx % 2 === 0;
    const isFirstOfPair = state.isFixedTeams && isEven;
    const isSecondOfPair = state.isFixedTeams && !isEven;
    const teamNum = Math.floor(idx / 2) + 1;

    return (
      <View>
        {isFirstOfPair && (
          <Text
            style={{
              fontFamily: FONT_BODY_BOLD,
              fontSize: 10,
              color: colors.accent,
              letterSpacing: 1,
              marginBottom: 4,
              marginLeft: 4,
            }}
          >
            TEAM {teamNum}
          </Text>
        )}
        <View
          style={[
            styles.playerRow,
            isActive && { backgroundColor: colors.cardHover, elevation: 5 },
            isFirstOfPair && { marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
            isSecondOfPair && { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
          ]}
        >
          <View style={styles.playerInfo}>
            {Platform.OS === 'web' && index !== undefined ? (
              <View style={{ marginRight: 8, gap: 0 }}>
                <Pressable
                  onPress={() => movePlayer(index, 'up')}
                  style={{ opacity: index === 0 ? 0.2 : 1, paddingHorizontal: 6, paddingVertical: 2 }}
                >
                  <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '700' }}>▲</Text>
                </Pressable>
                <Pressable
                  onPress={() => movePlayer(index, 'down')}
                  style={{
                    opacity: index === state.players.length - 1 ? 0.2 : 1,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '700' }}>▼</Text>
                </Pressable>
              </View>
            ) : Platform.OS !== 'web' ? (
              <Pressable onPressIn={drag} hitSlop={20} style={styles.dragHandle}>
                <BrandedIcon name="menu" size={24} color={colors.textMuted} />
              </Pressable>
            ) : null}
            <View
              style={[
                styles.genderIcon,
                {
                  backgroundColor:
                    item.gender === 'female' ? 'rgba(247,140,162,0.15)' : 'rgba(79,172,254,0.15)',
                },
              ]}
            >
              <BrandedIcon
                name={item.gender === 'female' ? 'gender-female' : 'gender-male'}
                size={16}
                color={item.gender === 'female' ? colors.female : colors.male}
              />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.playerName}>
                  {item.first_name}
                  {item.last_name ? ` ${item.last_name}` : ''}
                </Text>
                {item.is_verified && <BrandedIcon name="confirm" size={14} color={colors.accent} />}
              </View>
              <Text style={styles.playerStats}>
                {item.dupr_rating ? `DUPR ${item.dupr_rating}` : ''}
                {item.dupr_rating && hasStats ? ' · ' : ''}
                {hasStats ? `${item.wins}W-${item.losses}L · ${(item.win_pct || 0).toFixed(0)}%` : ''}
                {(hasStats || item.dupr_rating) && item.home_court_name ? ' · ' : ''}
                {item.home_court_name || ''}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => onEditPlayer(item)}>
              <BrandedIcon name="edit" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch({ type: 'REMOVE_PLAYER', payload: item.id })}>
              <BrandedIcon name="close" size={22} color={colors.danger} style={{ opacity: 0.5 }} />
            </TouchableOpacity>
          </View>
        </View>
        {isFirstOfPair && idx + 1 < state.players.length && (
          <View style={{ alignItems: 'center', marginVertical: -4, zIndex: 1 }}>
            <View
              style={{
                backgroundColor: colors.accent,
                borderRadius: 10,
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BrandedIcon name="link" size={14} color={colors.bg} />
            </View>
          </View>
        )}
        {isSecondOfPair && <View style={{ height: 8 }} />}
      </View>
    );
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= state.players.length) return;
    const updated = [...state.players];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    dispatch({ type: 'SET_PLAYERS_ORDER', payload: updated });
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<Player>) => (
    <ScaleDecorator>{renderPlayerRow(item, drag, isActive, getIndex())}</ScaleDecorator>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <FlatList
          ref={listRef}
          data={state.players}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => renderPlayerRow(item, () => {}, false, index)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No players added yet. Type a name above to search or create.
            </Text>
          }
        />
      ) : (
        <DraggableFlatList
          ref={listRef}
          data={state.players}
          onDragEnd={({ data }) => onDragEnd(data)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No players added yet. Type a name above to search or create.
            </Text>
          }
        />
      )}
    </>
  );
}
