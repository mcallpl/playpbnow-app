/**
 * Tournament standings tests
 *
 * utils/standings.ts decides who is seeded where, who reaches the semifinals,
 * and who plays for gold — the part of the game screen where a wrong answer is
 * both visible to every player in the room and impossible to argue with after
 * the fact. It is pure, so it can be tested directly rather than through the
 * 1,374-line screen that consumes it.
 */

import {
  calculateTeamStandings,
  generateSemifinals,
  generateFinals,
  calculateIndividualStandings,
  pairIndividualsIntoTeams,
  TeamStanding,
  IndividualStanding,
} from '../utils/standings';
import { Player, RoundData } from '../hooks/useGameLogic';

const p = (id: string): Player => ({ id, first_name: `P${id}` });
const [p1, p2, p3, p4, p5, p6, p7, p8] = ['1', '2', '3', '4', '5', '6', '7', '8'].map(p);

/** One round holding the given team pairings. */
const round = (games: [Player[], Player[]][], type = 'mixed'): RoundData => ({
  id: `r-${type}-${games.length}`,
  type,
  byes: [],
  games: games.map((g, i) => ({ id: `g${i}`, team1: g[0], team2: g[1] })),
});

/** Scores keyed the way the screen keys them: `${round}_${game}_t1|t2`. */
const score = (r: number, g: number, t1: number, t2: number) => ({
  [`${r}_${g}_t1`]: String(t1),
  [`${r}_${g}_t2`]: String(t2),
});

describe('calculateTeamStandings', () => {
  it('records wins, losses and point differential', () => {
    const schedule = [round([[[p1, p2], [p3, p4]]])];
    const scores = score(0, 0, 11, 6);

    const [first, second] = calculateTeamStandings(schedule, scores, 1);

    expect(first.players.map(x => x.id)).toEqual(['1', '2']);
    expect(first).toMatchObject({ wins: 1, losses: 0, pointDiff: 5, winPct: 100, seed: 1 });
    expect(second).toMatchObject({ wins: 0, losses: 1, pointDiff: -5, winPct: 0, seed: 2 });
  });

  it('ignores unscored games', () => {
    const schedule = [round([[[p1, p2], [p3, p4]]])];

    expect(calculateTeamStandings(schedule, {}, 1)).toEqual([]);
  });

  it('excludes playoff rounds from the round-robin table', () => {
    const schedule = [
      round([[[p1, p2], [p3, p4]]]),
      round([[[p1, p2], [p3, p4]]], 'semifinal'),
    ];
    const scores = { ...score(0, 0, 11, 9), ...score(1, 0, 2, 11) };

    // roundRobinCount = 1, so the semifinal loss must not appear
    const [first] = calculateTeamStandings(schedule, scores, 1);

    expect(first).toMatchObject({ wins: 1, losses: 0, pointDiff: 2 });
  });

  it('identifies a team by its players regardless of side or order', () => {
    // same pair, listed in the other order and on the other side of the net
    const schedule = [
      round([[[p1, p2], [p3, p4]]]),
      round([[[p3, p4], [p2, p1]]]),
    ];
    const scores = { ...score(0, 0, 11, 5), ...score(1, 0, 4, 11) };

    const standings = calculateTeamStandings(schedule, scores, 2);

    expect(standings).toHaveLength(2);
    expect(standings[0]).toMatchObject({ wins: 2, losses: 0 });
  });

  describe('tiebreakers', () => {
    it('ranks on win percentage first', () => {
      const schedule = [
        round([[[p1, p2], [p3, p4]], [[p5, p6], [p7, p8]]]),
        round([[[p1, p2], [p5, p6]], [[p3, p4], [p7, p8]]]),
      ];
      const scores = {
        ...score(0, 0, 11, 0), // 1/2 beat 3/4 by 11
        ...score(0, 1, 11, 9), // 5/6 beat 7/8 by 2
        ...score(1, 0, 11, 9), // 1/2 beat 5/6
        ...score(1, 1, 11, 9), // 3/4 beat 7/8
      };

      const standings = calculateTeamStandings(schedule, scores, 2);

      expect(standings[0].players.map(x => x.id)).toEqual(['1', '2']); // 2-0
      expect(standings[3].players.map(x => x.id)).toEqual(['7', '8']); // 0-2
    });

    it('uses head-to-head before point differential when records are level', () => {
      // Both teams finish 1-1. A/B lose big to C/D but beat E/F; the point
      // differential favours the other team, so only head-to-head can decide.
      const schedule = [
        round([[[p1, p2], [p3, p4]]]),
        round([[[p3, p4], [p1, p2]]]),
      ];
      const scores = {
        ...score(0, 0, 11, 1), // 1/2 beat 3/4 by 10
        ...score(1, 0, 11, 9), // 3/4 beat 1/2 by 2
      };

      const standings = calculateTeamStandings(schedule, scores, 2);

      // split head-to-head (1-1 each), so it falls through to point diff:
      // 1/2 are +8 overall, 3/4 are -8
      expect(standings[0].players.map(x => x.id)).toEqual(['1', '2']);
    });

    it('puts the head-to-head winner ahead of a better point differential', () => {
      const schedule = [
        round([[[p1, p2], [p3, p4]], [[p5, p6], [p7, p8]]]),
        round([[[p1, p2], [p5, p6]], [[p3, p4], [p7, p8]]]),
      ];
      const scores = {
        ...score(0, 0, 11, 9), //  1/2 beat 3/4 head-to-head, narrowly
        ...score(0, 1, 11, 9),
        ...score(1, 0, 0, 11), //  1/2 lose badly     -> 1-1, diff -9
        ...score(1, 1, 11, 0), //  3/4 win big        -> 1-1, diff +9
      };

      const standings = calculateTeamStandings(schedule, scores, 2);
      const rank = (ids: string[]) =>
        standings.findIndex(s => s.players.map(x => x.id).join() === ids.join());

      // 3/4 have the far better differential, but 1/2 own the head-to-head
      expect(rank(['1', '2'])).toBeLessThan(rank(['3', '4']));
    });

    it('falls back to point differential when the teams never met', () => {
      const schedule = [
        round([[[p1, p2], [p5, p6]], [[p3, p4], [p7, p8]]]),
      ];
      const scores = {
        ...score(0, 0, 11, 9), // 1/2 win by 2
        ...score(0, 1, 11, 2), // 3/4 win by 9
      };

      const standings = calculateTeamStandings(schedule, scores, 1);

      expect(standings[0].players.map(x => x.id)).toEqual(['3', '4']);
    });
  });

  it('numbers seeds from 1 with no gaps', () => {
    const schedule = [round([[[p1, p2], [p3, p4]], [[p5, p6], [p7, p8]]])];
    const scores = { ...score(0, 0, 11, 4), ...score(0, 1, 11, 7) };

    const standings = calculateTeamStandings(schedule, scores, 1);

    expect(standings.map(s => s.seed)).toEqual([1, 2, 3, 4]);
    expect(standings.map(s => s.teamIndex)).toEqual([0, 1, 2, 3]);
  });
});

describe('generateSemifinals', () => {
  const seeded = (): TeamStanding[] =>
    [[p1, p2], [p3, p4], [p5, p6], [p7, p8]].map((players, i) => ({
      teamIndex: i,
      teamKey: players.map(x => x.id).join('-'),
      players,
      wins: 0,
      losses: 0,
      pointDiff: 0,
      winPct: 0,
      seed: i + 1,
    }));

  it('pairs 1v4 and 2v3', () => {
    const [sf1, sf2] = generateSemifinals(seeded());

    expect(sf1.games[0].team1.map(x => x.id)).toEqual(['1', '2']); // seed 1
    expect(sf1.games[0].team2.map(x => x.id)).toEqual(['7', '8']); // seed 4
    expect(sf2.games[0].team1.map(x => x.id)).toEqual(['3', '4']); // seed 2
    expect(sf2.games[0].team2.map(x => x.id)).toEqual(['5', '6']); // seed 3
  });

  it('marks both rounds as semifinals', () => {
    expect(generateSemifinals(seeded()).map(r => r.type)).toEqual([
      'semifinal',
      'semifinal',
    ]);
  });

  it('returns nothing when there are fewer than four teams', () => {
    expect(generateSemifinals(seeded().slice(0, 3))).toEqual([]);
  });
});

describe('generateFinals', () => {
  const semis = (): RoundData[] => [
    round([[[p1, p2], [p7, p8]]], 'semifinal'),
    round([[[p3, p4], [p5, p6]]], 'semifinal'),
  ];

  it('sends both winners to gold and both losers to bronze', () => {
    const scores = { ...score(0, 0, 11, 8), ...score(1, 0, 7, 11) };

    const [bronze, gold] = generateFinals(semis(), scores, 0);

    expect(gold.type).toBe('gold');
    expect(gold.games[0].team1.map(x => x.id)).toEqual(['1', '2']);
    expect(gold.games[0].team2.map(x => x.id)).toEqual(['5', '6']);

    expect(bronze.type).toBe('bronze');
    expect(bronze.games[0].team1.map(x => x.id)).toEqual(['7', '8']);
    expect(bronze.games[0].team2.map(x => x.id)).toEqual(['3', '4']);
  });

  it('returns bronze before gold so the gold match closes the day', () => {
    const scores = { ...score(0, 0, 11, 8), ...score(1, 0, 11, 8) };

    expect(generateFinals(semis(), scores, 0).map(r => r.type)).toEqual([
      'bronze',
      'gold',
    ]);
  });

  it('reads the semifinals from the given offset', () => {
    const schedule = [
      round([[[p1, p2], [p3, p4]]]), // a round-robin round first
      ...semis(),
    ];
    const scores = { ...score(1, 0, 11, 8), ...score(2, 0, 11, 8) };

    const [, gold] = generateFinals(schedule, scores, 1);

    expect(gold.games[0].team1.map(x => x.id)).toEqual(['1', '2']);
    expect(gold.games[0].team2.map(x => x.id)).toEqual(['3', '4']);
  });

  it('returns nothing when the semifinal rounds are missing', () => {
    expect(generateFinals(semis(), {}, 5)).toEqual([]);
  });

  it('refuses to build finals from an unscored semifinal', () => {
    // Used to compare with `>=`, so an unentered semifinal read 0-0 and sent
    // team1 to the gold match without playing for it.
    expect(generateFinals(semis(), {}, 0)).toEqual([]);
  });

  it('refuses to build finals when only one semifinal is scored', () => {
    expect(generateFinals(semis(), score(0, 0, 11, 8), 0)).toEqual([]);
  });

  it('refuses to build finals from a tied semifinal', () => {
    const scores = { ...score(0, 0, 9, 9), ...score(1, 0, 11, 8) };

    expect(generateFinals(semis(), scores, 0)).toEqual([]);
  });
});

describe('calculateIndividualStandings', () => {
  it('credits every player on the winning team', () => {
    const schedule = [round([[[p1, p2], [p3, p4]]])];
    const scores = score(0, 0, 11, 6);

    const standings = calculateIndividualStandings(schedule, scores, 1);

    const byId = Object.fromEntries(standings.map(s => [s.playerId, s]));
    expect(byId['1']).toMatchObject({ wins: 1, losses: 0, pointDiff: 5 });
    expect(byId['2']).toMatchObject({ wins: 1, losses: 0, pointDiff: 5 });
    expect(byId['3']).toMatchObject({ wins: 0, losses: 1, pointDiff: -5 });
    expect(byId['4']).toMatchObject({ wins: 0, losses: 1, pointDiff: -5 });
  });

  it('follows a player across changing partners', () => {
    const schedule = [
      round([[[p1, p2], [p3, p4]]]),
      round([[[p1, p3], [p2, p4]]]),
    ];
    const scores = { ...score(0, 0, 11, 5), ...score(1, 0, 11, 7) };

    const standings = calculateIndividualStandings(schedule, scores, 2);
    const byId = Object.fromEntries(standings.map(s => [s.playerId, s]));

    expect(byId['1']).toMatchObject({ wins: 2, losses: 0, pointDiff: 10 });
    expect(byId['4']).toMatchObject({ wins: 0, losses: 2, pointDiff: -10 });
    expect(byId['2']).toMatchObject({ wins: 1, losses: 1 });
    expect(byId['3']).toMatchObject({ wins: 1, losses: 1 });
  });

  it('ignores unscored games and seeds from 1', () => {
    const schedule = [round([[[p1, p2], [p3, p4]]])];
    const scores = score(0, 0, 11, 2);

    const standings = calculateIndividualStandings(schedule, scores, 1);

    expect(standings.map(s => s.seed)).toEqual([1, 2, 3, 4]);
    expect(calculateIndividualStandings(schedule, {}, 1)).toEqual([]);
  });
});

describe('pairIndividualsIntoTeams', () => {
  const ranked = (n: number): IndividualStanding[] =>
    Array.from({ length: n }, (_, i) => ({
      playerId: String(i + 1),
      player: p(String(i + 1)),
      wins: n - i,
      losses: i,
      pointDiff: (n - i) * 2,
      winPct: 0,
      seed: i + 1,
    }));

  it('pairs 1+2, 3+4, 5+6, 7+8', () => {
    const teams = pairIndividualsIntoTeams(ranked(8));

    expect(teams.map(t => t.players.map(x => x.id))).toEqual([
      ['1', '2'],
      ['3', '4'],
      ['5', '6'],
      ['7', '8'],
    ]);
    expect(teams.map(t => t.seed)).toEqual([1, 2, 3, 4]);
  });

  it('uses only the top eight when more players are ranked', () => {
    const teams = pairIndividualsIntoTeams(ranked(12));

    expect(teams).toHaveLength(4);
    expect(teams.flatMap(t => t.players.map(x => x.id))).not.toContain('9');
  });

  it('returns nothing below eight players, so no partial bracket is built', () => {
    expect(pairIndividualsIntoTeams(ranked(7))).toEqual([]);
  });

  it('starts the new teams with a clean record', () => {
    pairIndividualsIntoTeams(ranked(8)).forEach(t =>
      expect(t).toMatchObject({ wins: 0, losses: 0, pointDiff: 0, winPct: 0 })
    );
  });
});
