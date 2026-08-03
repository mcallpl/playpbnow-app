/**
 * useSetupState Hook Tests
 *
 * Covers the reducer behind the match-setup flow —
 * app/setup/hooks/useSetupState.ts, the one SetupFlow actually mounts.
 *
 * Note there are two hooks by this name. The other, hooks/useSetupState.ts, is
 * a params-based leftover whose function nothing calls any more; only its Player
 * and RoundConfig types are still imported (by components/setup/*). The suite
 * that used to live here targeted that dead one, and described a signup wizard
 * neither of them implements — see __tests__/pending/SignupWizard.test.ts.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSetupState } from '../app/setup/hooks/useSetupState';
import { initialSetupState } from '../app/setup/types/setupTypes';

const player = (id: string, first = 'Player') =>
  ({ id, first_name: first, gender: 'male' } as any);

describe('useSetupState', () => {
  describe('Initial state', () => {
    it('starts from initialSetupState', () => {
      const { result } = renderHook(() => useSetupState());
      expect(result.current.state).toEqual(initialSetupState);
    });

    it('starts with an empty roster and six mixed rounds', () => {
      const { result } = renderHook(() => useSetupState());
      expect(result.current.state.players).toEqual([]);
      expect(result.current.state.roundsConfig).toHaveLength(6);
      expect(result.current.state.roundsConfig.every(r => r.type === 'mixed')).toBe(true);
    });
  });

  describe('Group identity', () => {
    it.each([
      ['SET_GROUP_ID', 'groupId', '42'],
      ['SET_GROUP_NAME', 'groupName', 'Tuesday Night'],
      ['SET_GROUP_KEY', 'groupKey', 'abc123'],
      ['SET_DEVICE_ID', 'deviceId', 'phone_xyz'],
      ['SET_COURT_NAME', 'courtName', 'Court 3'],
    ])('%s updates %s', (type, field, payload) => {
      const { result } = renderHook(() => useSetupState());

      act(() => result.current.dispatch({ type, payload } as any));

      expect((result.current.state as any)[field]).toBe(payload);
    });
  });

  describe('Roster', () => {
    it('ADD_PLAYER puts the newest player first', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => result.current.dispatch({ type: 'ADD_PLAYER', payload: player('1', 'Ann') }));
      act(() => result.current.dispatch({ type: 'ADD_PLAYER', payload: player('2', 'Bob') }));

      expect(result.current.state.players.map(p => p.id)).toEqual(['2', '1']);
    });

    it('REMOVE_PLAYER removes only the matching id', () => {
      const { result } = renderHook(() => useSetupState());

      act(() =>
        result.current.dispatch({
          type: 'SET_PLAYERS',
          payload: [player('1'), player('2'), player('3')],
        })
      );
      act(() => result.current.dispatch({ type: 'REMOVE_PLAYER', payload: '2' }));

      expect(result.current.state.players.map(p => p.id)).toEqual(['1', '3']);
    });

    it('UPDATE_PLAYER replaces in place without reordering', () => {
      const { result } = renderHook(() => useSetupState());

      act(() =>
        result.current.dispatch({
          type: 'SET_PLAYERS',
          payload: [player('1', 'Ann'), player('2', 'Bob')],
        })
      );
      act(() =>
        result.current.dispatch({ type: 'UPDATE_PLAYER', payload: player('2', 'Robert') })
      );

      expect(result.current.state.players.map(p => p.first_name)).toEqual(['Ann', 'Robert']);
    });

    it('SET_PLAYERS_ORDER reorders the roster', () => {
      const { result } = renderHook(() => useSetupState());

      act(() =>
        result.current.dispatch({
          type: 'SET_PLAYERS',
          payload: [player('1'), player('2'), player('3')],
        })
      );
      act(() =>
        result.current.dispatch({
          type: 'SET_PLAYERS_ORDER',
          payload: [player('3'), player('1'), player('2')],
        })
      );

      expect(result.current.state.players.map(p => p.id)).toEqual(['3', '1', '2']);
    });

    it('SET_PLAYERS_ORDER ignores a non-array payload rather than wiping the roster', () => {
      // A wiped roster crashes every players.filter/map downstream, so the
      // reducer deliberately no-ops instead of trusting the payload.
      const { result } = renderHook(() => useSetupState());

      act(() =>
        result.current.dispatch({ type: 'SET_PLAYERS', payload: [player('1'), player('2')] })
      );
      const before = result.current.state.players;

      act(() =>
        result.current.dispatch({ type: 'SET_PLAYERS_ORDER', payload: undefined } as any)
      );

      expect(result.current.state.players).toBe(before);
    });
  });

  describe('Rounds', () => {
    it('ADD_ROUND appends a mixed round', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => result.current.dispatch({ type: 'ADD_ROUND' } as any));

      expect(result.current.state.roundsConfig).toHaveLength(7);
      expect(result.current.state.roundsConfig[6]).toEqual({ type: 'mixed' });
    });

    it('REMOVE_ROUND drops the last round', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => result.current.dispatch({ type: 'REMOVE_ROUND' } as any));

      expect(result.current.state.roundsConfig).toHaveLength(5);
    });

    it('REMOVE_ROUND never goes below one round', () => {
      const { result } = renderHook(() => useSetupState());

      for (let i = 0; i < 10; i++) {
        act(() => result.current.dispatch({ type: 'REMOVE_ROUND' } as any));
      }

      expect(result.current.state.roundsConfig).toHaveLength(1);
    });

    it('UPDATE_ROUND_TYPE changes only the round at that index', () => {
      const { result } = renderHook(() => useSetupState());

      act(() =>
        result.current.dispatch({
          type: 'UPDATE_ROUND_TYPE',
          payload: { index: 2, type: 'gender' },
        } as any)
      );

      expect(result.current.state.roundsConfig[2].type).toBe('gender');
      expect(result.current.state.roundsConfig.filter(r => r.type === 'gender')).toHaveLength(1);
    });
  });

  describe('Reset and unknown actions', () => {
    it('RESET returns everything to the initial state', () => {
      const { result } = renderHook(() => useSetupState());

      act(() => result.current.dispatch({ type: 'SET_GROUP_NAME', payload: 'Tuesday' }));
      act(() => result.current.dispatch({ type: 'ADD_PLAYER', payload: player('1') }));
      act(() => result.current.dispatch({ type: 'SET_LOADING', payload: true }));

      act(() => result.current.dispatch({ type: 'RESET' } as any));

      expect(result.current.state).toEqual(initialSetupState);
    });

    it('an unrecognised action leaves the state untouched', () => {
      const { result } = renderHook(() => useSetupState());
      const before = result.current.state;

      act(() => result.current.dispatch({ type: 'NOT_A_REAL_ACTION' } as any));

      expect(result.current.state).toBe(before);
    });

    it('never mutates the previous state object', () => {
      const { result } = renderHook(() => useSetupState());
      const before = result.current.state;

      act(() => result.current.dispatch({ type: 'SET_GROUP_NAME', payload: 'Tuesday' }));

      expect(before.groupName).toBe('');
      expect(result.current.state).not.toBe(before);
    });
  });
});
