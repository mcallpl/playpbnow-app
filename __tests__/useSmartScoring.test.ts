/**
 * useSmartScoring — score input validation (UAT C-M10 / C-L5)
 *
 * The score boxes use a numeric keyboard, which on iOS still offers "-" and
 * "." and on web accepts anything. Whatever was typed used to be stored as-is
 * and save_scores.php cast it to 0, so "-5" quietly became a 0-point game.
 * These tests pin the digits-only contract and the auto-fill rules around it.
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSmartScoring } from '../hooks/useSmartScoring';

const schedule = [
  {
    id: 'round-0',
    type: 'mixer',
    byes: [],
    games: [
      { id: 'g0', team1: [], team2: [] },
      { id: 'g1', team1: [], team2: [] },
    ],
  },
];

const setup = () => renderHook(() => useSmartScoring('TestGroup', schedule));

describe('useSmartScoring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('digit stripping (C-M10)', () => {
    it('drops a leading minus sign', () => {
      const { result } = setup();
      let r: any;
      act(() => {
        r = result.current.handleScoreChange(0, 0, 't1', '-5');
      });
      expect(result.current.scores['0_0_t1']).toBe('5');
      expect(r.s1).toBe('5');
    });

    it('drops letters and punctuation entirely', () => {
      const { result } = setup();
      act(() => {
        result.current.handleScoreChange(0, 0, 't1', 'a');
      });
      expect(result.current.scores['0_0_t1']).toBe('');
      act(() => {
        result.current.handleScoreChange(0, 0, 't1', '1.');
      });
      expect(result.current.scores['0_0_t1']).toBe('1');
    });

    it('rejects a third digit', () => {
      const { result } = setup();
      let r: any;
      act(() => {
        r = result.current.handleScoreChange(0, 0, 't1', '115');
      });
      expect(r).toBeNull();
      expect(result.current.scores['0_0_t1']).toBeUndefined();
    });

    it('never stores anything but digits, whatever comes in', () => {
      const { result } = setup();
      for (const junk of ['--', '+7', ' 9', '3-', 'x1y']) {
        act(() => {
          result.current.handleScoreChange(0, 1, 't2', junk);
        });
        expect(result.current.scores['0_1_t2'] ?? '').toMatch(/^[0-9]*$/);
      }
    });
  });

  describe('auto-fill still works on the cleaned value', () => {
    it('a losing score auto-fills PLAY TO (11) for the opponent', () => {
      const { result } = setup();
      let r: any;
      act(() => {
        r = result.current.handleScoreChange(0, 0, 't1', '-5');
      });
      expect(result.current.scores['0_0_t2']).toBe('11');
      expect(r.changed).toBe(true);
      expect(r.s2).toBe('11');
    });

    it('"1" waits for a second digit (could be 11)', () => {
      const { result } = setup();
      let r: any;
      act(() => {
        r = result.current.handleScoreChange(0, 0, 't1', '1');
      });
      expect(r.changed).toBe(false);
      expect(result.current.scores['0_0_t2']).toBeUndefined();
    });
  });

  describe('PLAY TO (C-L5)', () => {
    it('ignores non-numeric and out-of-range values', () => {
      const { result } = setup();
      act(() => result.current.setWinningScore('abc'));
      expect(result.current.winningScore).toBe(11);
      act(() => result.current.setWinningScore('0'));
      expect(result.current.winningScore).toBe(11);
      act(() => result.current.setWinningScore('15'));
      expect(result.current.winningScore).toBe(15);
    });
  });

  /**
   * UAT 2026-09-04 (#17) — the AsyncStorage restore must never land on top of a
   * server pull. groupName is not stable at mount and the legacy key is not
   * match-specific, so an unconditional replace could drop a PREVIOUS match's
   * scores over freshly pulled live ones (which self-heal then pushed to the
   * server as phantom scores).
   */
  describe('cache vs server pull (#17)', () => {
    afterEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(() => Promise.resolve(null));
      (AsyncStorage.setItem as jest.Mock).mockClear();
    });

    it('restores the cache normally on a cold start', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
        Promise.resolve(k.startsWith('scores_') ? JSON.stringify({ '0_0_t1': '11' }) : null)
      );
      const { result } = renderHook(() => useSmartScoring('TestGroup', schedule));
      await act(async () => { await Promise.resolve(); });
      expect(result.current.scores['0_0_t1']).toBe('11');
    });

    it('does NOT let the cache replace scores once the server has been pulled', async () => {
      let release: (v: any) => void = () => {};
      (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
        k.startsWith('scores_')
          ? new Promise((res) => { release = res; })
          : Promise.resolve(null)
      );
      const { result } = renderHook(() => useSmartScoring('TestGroup', schedule));
      // The live pull lands first...
      act(() => {
        result.current.markServerPulled();
        result.current.setScores({ '0_0_t1': '7' });
      });
      // ...and the stale cache read only comes back afterwards.
      await act(async () => { release(JSON.stringify({ '0_0_t1': '11', '0_1_t1': '9' })); await Promise.resolve(); });
      expect(result.current.scores['0_0_t1']).toBe('7');
      expect(result.current.scores['0_1_t1']).toBeUndefined();
    });

    it('scopes the cache to the share code when the match is live', async () => {
      const { result } = renderHook(() => useSmartScoring('TestGroup', schedule, undefined, 'ABC123'));
      expect(result.current.scoresStorageKey).toBe('scores_TestGroup__ABC123');
      act(() => { result.current.handleScoreChange(0, 0, 't1', '5'); });
      const wroteScoped = (AsyncStorage.setItem as jest.Mock).mock.calls
        .some((c: any[]) => c[0] === 'scores_TestGroup__ABC123');
      expect(wroteScoped).toBe(true);
    });
  });
});
