/**
 * Local shuffle scheduler tests — sit-out balance and courts (UAT C-M2 / C-M3)
 *
 * buildLocalSchedule is the pure scheduler behind the game screen's SHUFFLE
 * button. Before this suite it had no sit-out memory at all: with 9 players
 * the same person could sit every round, and mixed mode could bench 4 of 8.
 * It also had no notion of courts. It is exported from hooks/useGameLogic so
 * it can be exercised directly, without the 1,400-line screen around it.
 */

import { buildLocalSchedule, Player, RoundData } from '../hooks/useGameLogic';

const player = (id: string, gender: 'male' | 'female' = 'male'): Player => ({
  id,
  first_name: `P${id}`,
  gender,
});

/** n players, alternating M/F starting with male, ids "1".."n". */
const makePlayers = (n: number, males?: number): Player[] =>
  Array.from({ length: n }, (_, i) => {
    const gender = males === undefined ? (i % 2 === 0 ? 'male' : 'female') : i < males ? 'male' : 'female';
    return player(String(i + 1), gender);
  });

const rounds = (n: number, type: 'mixed' | 'gender' | 'mixer') =>
  Array.from({ length: n }, (_, i) => ({ id: String(i + 1), type }));

/** Sit-out count per player id across the whole schedule. */
const sitCounts = (schedule: RoundData[], players: Player[]) => {
  const counts: Record<string, number> = {};
  players.forEach(p => (counts[p.id] = 0));
  schedule.forEach(r => r.byes.forEach(p => counts[p.id]++));
  return counts;
};

const playersInRound = (round: RoundData) => [
  ...round.games.flatMap(g => [...g.team1, ...g.team2]),
  ...round.byes,
];

describe('buildLocalSchedule', () => {
  describe('every player is accounted for every round', () => {
    it.each([
      [8, 'mixer'],
      [9, 'mixer'],
      [10, 'mixed'],
      [7, 'gender'],
    ] as const)('%i players, %s rounds: no one is dropped or duplicated', (n, type) => {
      const players = makePlayers(n);
      const schedule = buildLocalSchedule(players, rounds(4, type));
      expect(schedule).toHaveLength(4);
      schedule.forEach(round => {
        const ids = playersInRound(round).map(p => p.id).sort();
        expect(ids).toEqual(players.map(p => p.id).sort());
      });
    });
  });

  describe('sit-out balance (C-M2)', () => {
    it('8 players on 2 courts never bench anyone in mixed mode', () => {
      const players = makePlayers(8); // 4M / 4F
      const schedule = buildLocalSchedule(players, rounds(6, 'mixed'));
      schedule.forEach(round => {
        expect(round.games).toHaveLength(2);
        expect(round.byes).toHaveLength(0);
      });
    });

    it('9 players, 4 mixer rounds: nobody sits twice while someone has never sat', () => {
      const players = makePlayers(9);
      const schedule = buildLocalSchedule(players, rounds(4, 'mixer'));
      const counts = Object.values(sitCounts(schedule, players));
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      // exactly one sitter per round
      schedule.forEach(round => expect(round.byes).toHaveLength(1));
    });

    it('5 players (3M/2F), 4 mixed rounds: women sit too — no player sits twice', () => {
      const players = makePlayers(5, 3);
      const schedule = buildLocalSchedule(players, rounds(4, 'mixed'));
      const counts = sitCounts(schedule, players);
      Object.values(counts).forEach(c => expect(c).toBeLessThanOrEqual(1));
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(4);
    });

    it('10 players over 10 mixer rounds spreads 20 sit-outs evenly (2 each)', () => {
      const players = makePlayers(10);
      const schedule = buildLocalSchedule(players, rounds(10, 'mixer'));
      const counts = sitCounts(schedule, players);
      Object.values(counts).forEach(c => expect(c).toBe(2));
    });
  });

  describe('courts (C-M3)', () => {
    it('caps games per round and benches the rest', () => {
      const players = makePlayers(12);
      const schedule = buildLocalSchedule(players, rounds(3, 'mixer'), 2);
      schedule.forEach(round => {
        expect(round.games).toHaveLength(2);
        expect(round.byes).toHaveLength(4);
      });
    });

    it('balances the extra sit-outs a court cap creates', () => {
      const players = makePlayers(12);
      const schedule = buildLocalSchedule(players, rounds(6, 'mixer'), 2);
      // 6 rounds × 4 sitters = 24 sit-outs over 12 players → exactly 2 each
      const counts = sitCounts(schedule, players);
      Object.values(counts).forEach(c => expect(c).toBe(2));
    });

    it('a court cap above the natural maximum changes nothing', () => {
      const players = makePlayers(8);
      const schedule = buildLocalSchedule(players, rounds(2, 'mixer'), 5);
      schedule.forEach(round => {
        expect(round.games).toHaveLength(2);
        expect(round.byes).toHaveLength(0);
      });
    });

    it('courts=0 / undefined mean one court per four players', () => {
      const players = makePlayers(8);
      for (const courts of [0, undefined]) {
        const schedule = buildLocalSchedule(players, rounds(2, 'mixer'), courts);
        schedule.forEach(round => expect(round.games).toHaveLength(2));
      }
    });
  });

  describe('existing rules still hold', () => {
    it('never puts two men against two women', () => {
      const players = makePlayers(8);
      const isF = (p: Player) => (p.gender || '').startsWith('f');
      const schedule = buildLocalSchedule(players, rounds(6, 'mixer'));
      schedule.forEach(round =>
        round.games.forEach(g => {
          const t1AllM = g.team1.every(p => !isF(p));
          const t1AllF = g.team1.every(isF);
          const t2AllM = g.team2.every(p => !isF(p));
          const t2AllF = g.team2.every(isF);
          expect((t1AllM && t2AllF) || (t1AllF && t2AllM)).toBe(false);
        })
      );
    });

    it('mixed rounds pair a man with a woman on each team when the pool allows it', () => {
      const players = makePlayers(8); // 4M / 4F
      const isF = (p: Player) => (p.gender || '').startsWith('f');
      const schedule = buildLocalSchedule(players, rounds(3, 'mixed'));
      schedule.forEach(round =>
        round.games.forEach(g => {
          expect(g.team1.filter(isF)).toHaveLength(1);
          expect(g.team2.filter(isF)).toHaveLength(1);
        })
      );
    });
  });
});
