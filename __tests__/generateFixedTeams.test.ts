/**
 * Fixed-teams round-robin scheduler tests
 *
 * generateFixedTeamsLocal builds the whole schedule for a fixed-teams
 * tournament using the circle method. If it repeats a pairing, drops one, or
 * hands the same team two byes, a group finds out mid-session with no way to
 * fix it. It is pure and exported, so it is tested directly rather than through
 * the 1,374-line game screen that calls it.
 */

import { generateFixedTeamsLocal, Player } from '../hooks/useGameLogic';

const player = (id: string, gender = 'male'): Player => ({
  id,
  first_name: `P${id}`,
  gender,
});

/** n teams, each a distinct pair: team k is players (2k+1, 2k+2). */
const makeTeams = (n: number) =>
  Array.from({ length: n }, (_, k) => ({
    player1: player(String(k * 2 + 1)),
    player2: player(String(k * 2 + 2)),
  }));

/** Canonical key for a match-up, order-independent on both axes. */
const pairKey = (g: { team1: Player[]; team2: Player[] }) =>
  [
    g.team1.map(p => p.id).sort().join('+'),
    g.team2.map(p => p.id).sort().join('+'),
  ]
    .sort()
    .join(' vs ');

describe('generateFixedTeamsLocal', () => {
  describe('degenerate input', () => {
    it.each([0, 1])('returns no schedule for %i team(s)', n => {
      expect(generateFixedTeamsLocal(makeTeams(n))).toEqual([]);
    });
  });

  describe('even number of teams', () => {
    it('plays every team in every round, with no byes', () => {
      const schedule = generateFixedTeamsLocal(makeTeams(4));

      expect(schedule).toHaveLength(3); // n-1 rounds
      schedule.forEach(round => {
        expect(round.games).toHaveLength(2); // n/2 games
        expect(round.byes).toEqual([]);

        const ids = round.games.flatMap(g => [...g.team1, ...g.team2]).map(p => p.id);
        expect(new Set(ids).size).toBe(8); // nobody plays twice in a round
      });
    });

    it.each([4, 6, 8])('pairs every team with every other exactly once (%i teams)', n => {
      const schedule = generateFixedTeamsLocal(makeTeams(n));
      const seen = schedule.flatMap(r => r.games).map(pairKey);

      expect(seen).toHaveLength((n * (n - 1)) / 2); // every combination
      expect(new Set(seen).size).toBe(seen.length); // no repeats
    });

    it('keeps each team together across the whole schedule', () => {
      const schedule = generateFixedTeamsLocal(makeTeams(6));

      schedule
        .flatMap(r => r.games)
        .flatMap(g => [g.team1, g.team2])
        .forEach(team => {
          const [a, b] = team.map(p => Number(p.id)).sort((x, y) => x - y);
          // team k is always (2k+1, 2k+2) — partners never swap
          expect(b).toBe(a + 1);
          expect(a % 2).toBe(1);
        });
    });
  });

  describe('odd number of teams', () => {
    it('gives exactly one team a bye each round', () => {
      const schedule = generateFixedTeamsLocal(makeTeams(5));

      expect(schedule).toHaveLength(5); // (n+1)-1 rounds once padded
      schedule.forEach(round => {
        expect(round.games).toHaveLength(2);
        expect(round.byes).toHaveLength(2); // the two players of one team
      });
    });

    it('never puts the placeholder BYE team on court', () => {
      const schedule = generateFixedTeamsLocal(makeTeams(7));

      const onCourt = schedule
        .flatMap(r => r.games)
        .flatMap(g => [...g.team1, ...g.team2])
        .map(p => p.id);

      expect(onCourt).not.toContain('BYE');
    });

    it('rotates the bye so every team sits out exactly once', () => {
      const schedule = generateFixedTeamsLocal(makeTeams(5));

      const byeTeams = schedule.map(r => r.byes.map(p => p.id).sort().join('+'));

      expect(byeTeams).toHaveLength(5);
      expect(new Set(byeTeams).size).toBe(5); // nobody sits out twice
    });

    it.each([3, 5, 7])('still pairs every real team exactly once (%i teams)', n => {
      const schedule = generateFixedTeamsLocal(makeTeams(n));
      const seen = schedule.flatMap(r => r.games).map(pairKey);

      expect(seen).toHaveLength((n * (n - 1)) / 2);
      expect(new Set(seen).size).toBe(seen.length);
    });
  });

  describe('round shape', () => {
    it('marks every round as fixed and gives each game a distinct id', () => {
      const schedule = generateFixedTeamsLocal(makeTeams(6));

      expect(schedule.every(r => r.type === 'fixed')).toBe(true);

      const ids = schedule.flatMap(r => r.games).map(g => g.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('does not mutate the caller\'s team list', () => {
      const teams = makeTeams(5); // odd, so a BYE placeholder gets appended
      const before = teams.length;

      generateFixedTeamsLocal(teams);

      expect(teams).toHaveLength(before);
      expect(teams.map(t => t.player1.id)).not.toContain('BYE');
    });
  });
});
