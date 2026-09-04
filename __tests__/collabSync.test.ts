/**
 * Connected scoring — the merge / clear / pending / schedule-adoption rules.
 *
 * These are the decisions that decide whether a score survives when two or more
 * phones are scoring one match. Each block pins a defect found in the 2026-09-04
 * UAT so it cannot come back:
 *
 *  - an explicit clear from the server must reach every device (and must NOT be
 *    resurrected by self-heal);
 *  - a value this device typed and the server has not confirmed must never be
 *    blanked by a poll;
 *  - a host schedule edit must only DESTROY local scores when the server says it
 *    actually reset them (scores_reset_at), and must degrade to the old
 *    behaviour when an older API omits the field.
 */

import {
    buildServerState,
    buildNonEmptyServerScores,
    computeMergeChanges,
    computeGamesToHeal,
    computeMissingOnServer,
    shouldReplaceScoresOnScheduleChange,
    normalizeSchedule,
    scheduleSignature,
    countUnsynced,
} from '../hooks/useCollaborativeScoring';
import { scoresCacheKey } from '../hooks/useSmartScoring';

const S = (arr: string[]) => new Set<string>(arr);

describe('buildServerState', () => {
    it('keeps an explicit clear as an empty string (somebody erased it)', () => {
        const state = buildServerState([
            { round_idx: 0, game_idx: 0, s1_str: '11', s2_str: '' },
        ]);
        expect(state).toEqual({ '0_0_t1': '11', '0_0_t2': '' });
    });

    it('treats a missing/null value as an empty string, not undefined', () => {
        const state = buildServerState([{ round_idx: 1, game_idx: 2, s1_str: null }]);
        expect(state['1_2_t1']).toBe('');
        expect(state['1_2_t2']).toBe('');
    });

    it('handles no updates at all', () => {
        expect(buildServerState(undefined)).toEqual({});
        expect(buildServerState([])).toEqual({});
    });

    it('buildNonEmptyServerScores drops the blanks (what a first join adopts)', () => {
        const scores = buildNonEmptyServerScores([
            { round_idx: 0, game_idx: 0, s1_str: '11', s2_str: '' },
        ]);
        expect(scores).toEqual({ '0_0_t1': '11' });
    });
});

describe('computeMergeChanges (server → local)', () => {
    it('applies a value another device entered', () => {
        const { changes } = computeMergeChanges({}, { '0_0_t1': '11' }, S([]), S([]));
        expect(changes).toEqual({ '0_0_t1': '11' });
    });

    it('applies an explicit CLEAR — a delete has to reach every device', () => {
        const { changes } = computeMergeChanges({ '0_0_t1': '11' }, { '0_0_t1': '' }, S([]), S([]));
        expect(changes).toEqual({ '0_0_t1': '' });
    });

    it('never touches a key this device just typed', () => {
        const { changes } = computeMergeChanges(
            { '0_0_t1': '9' }, { '0_0_t1': '11' }, S(['0_0_t1']), S([])
        );
        expect(changes).toEqual({});
    });

    it('never blanks a value of ours the server has not confirmed yet', () => {
        const { changes, confirmed } = computeMergeChanges(
            { '0_0_t1': '7' }, { '0_0_t1': '' }, S([]), S(['0_0_t1'])
        );
        expect(changes).toEqual({});
        expect(confirmed).toEqual([]);
    });

    it('reports a pending key as confirmed once the server agrees', () => {
        const { changes, confirmed } = computeMergeChanges(
            { '0_0_t1': '7' }, { '0_0_t1': '7' }, S([]), S(['0_0_t1'])
        );
        expect(changes).toEqual({});
        expect(confirmed).toEqual(['0_0_t1']);
    });

    it('leaves keys the server does not know about alone', () => {
        const { changes } = computeMergeChanges({ '3_0_t1': '5' }, {}, S([]), S([]));
        expect(changes).toEqual({});
    });
});

describe('computeGamesToHeal (local → server)', () => {
    it('re-pushes a local score the server never received', () => {
        expect(computeGamesToHeal({ '2_1_t1': '11' }, {}, S([]), S([]))).toEqual(['2_1']);
    });

    it('does NOT resurrect a score another scorer deliberately erased', () => {
        expect(computeGamesToHeal(
            { '0_0_t1': '11' }, { '0_0_t1': '' }, S([]), S([])
        )).toEqual([]);
    });

    it('DOES re-push our own unconfirmed value over an empty server record', () => {
        expect(computeGamesToHeal(
            { '0_0_t1': '11' }, { '0_0_t1': '' }, S([]), S(['0_0_t1'])
        )).toEqual(['0_0']);
    });

    it('leaves a game alone when the server already has the value', () => {
        expect(computeGamesToHeal(
            { '0_0_t1': '11' }, { '0_0_t1': '11' }, S([]), S([])
        )).toEqual([]);
    });

    it('lets the server win when it holds a DIFFERENT value', () => {
        expect(computeGamesToHeal(
            { '0_0_t1': '9' }, { '0_0_t1': '11' }, S([]), S([])
        )).toEqual([]);
    });

    it('skips a key that is in flight from this device', () => {
        expect(computeGamesToHeal(
            { '0_0_t1': '11' }, {}, S(['0_0_t1']), S([])
        )).toEqual([]);
    });

    it('respects the per-poll budget', () => {
        const local: { [k: string]: string } = {};
        for (let g = 0; g < 10; g++) local[`0_${g}_t1`] = '11';
        expect(computeGamesToHeal(local, {}, S([]), S([]), 4)).toHaveLength(4);
    });
});

describe('shouldReplaceScoresOnScheduleChange (#6)', () => {
    it('falls back to the old destructive behaviour when the field is absent', () => {
        expect(shouldReplaceScoresOnScheduleChange(false, undefined, null)).toBe(true);
    });

    it('does NOT wipe when the server has never reset the scores', () => {
        expect(shouldReplaceScoresOnScheduleChange(true, null, null)).toBe(false);
        expect(shouldReplaceScoresOnScheduleChange(true, '', null)).toBe(false);
    });

    it('wipes only when the reset stamp is NEW', () => {
        expect(shouldReplaceScoresOnScheduleChange(true, '2026-09-04 10:00:00', null)).toBe(true);
        expect(shouldReplaceScoresOnScheduleChange(true, '2026-09-04 10:00:00', '2026-09-04 09:00:00')).toBe(true);
    });

    it('does not wipe again for a stamp already seen (a swap or rename)', () => {
        expect(shouldReplaceScoresOnScheduleChange(true, '2026-09-04 10:00:00', '2026-09-04 10:00:00')).toBe(false);
    });

    it('compares numeric stamps as strings, not by identity', () => {
        expect(shouldReplaceScoresOnScheduleChange(true, 1757000000, '1757000000')).toBe(false);
        expect(shouldReplaceScoresOnScheduleChange(true, 1757000001, '1757000000')).toBe(true);
    });
});

describe('computeMissingOnServer (resume / re-join healing)', () => {
    it('returns only the local values the server does not have', () => {
        const missing = computeMissingOnServer(
            { a: '11', b: '5', c: '' },
            { a: '11' }
        );
        expect(missing).toEqual({ b: '5' });
    });
});

describe('countUnsynced (#21)', () => {
    const now = 100000;
    it('counts a stuck score once it is past the grace window', () => {
        const m = new Map([['0_0_t1', now - 5000]]);
        expect(countUnsynced(m, { '0_0_t1': '11' }, now)).toBe(1);
    });
    it('ignores a key that has only just been typed (no flicker)', () => {
        const m = new Map([['0_0_t1', now - 100]]);
        expect(countUnsynced(m, { '0_0_t1': '11' }, now)).toBe(0);
    });
    it('ignores empty cells (the auto-filled partner key)', () => {
        const m = new Map([['0_0_t2', now - 5000]]);
        expect(countUnsynced(m, { '0_0_t2': '' }, now)).toBe(0);
    });
});

describe('normalizeSchedule (#7 — join adopts the same shape the poll does)', () => {
    it('fills in ids and zeroed scores without dropping anything', () => {
        const out = normalizeSchedule([
            { type: 'mixer', byes: [], games: [{ team1: [{ id: 'p1' }], team2: [{ id: 'p2' }] }] },
        ]);
        expect(out[0].id).toBe('round-0');
        expect(out[0].type).toBe('mixer');
        expect(out[0].games[0].id).toBeTruthy();
        expect(out[0].games[0].score_team1).toBe(0);
        expect(out[0].games[0].team1[0].id).toBe('p1');
    });

    it('keeps ids the server already supplied', () => {
        const out = normalizeSchedule([{ id: 'r-keep', games: [{ id: 'g-keep', team1: [], team2: [] }] }]);
        expect(out[0].id).toBe('r-keep');
        expect(out[0].games[0].id).toBe('g-keep');
    });

    it('survives a round with no games array', () => {
        expect(() => normalizeSchedule([{ id: 'r0' } as any])).not.toThrow();
    });
});

describe('scoresCacheKey (#17)', () => {
    it('keeps the legacy key when there is no live match', () => {
        expect(scoresCacheKey('Tuesday Group')).toBe('scores_Tuesday Group');
        expect(scoresCacheKey('Tuesday Group', null)).toBe('scores_Tuesday Group');
    });
    it('scopes the cache to the share code so a previous match cannot bleed in', () => {
        expect(scoresCacheKey('Tuesday Group', 'ABC123')).toBe('scores_Tuesday Group__ABC123');
    });
});

describe('scheduleSignature (#7 / #18 — comparing two copies of one schedule)', () => {
    const round = (t1: any[], t2: any[]) => ([{
        id: 'r0', type: 'mixer', byes: [],
        games: [{ id: 'g0', team1: t1, team2: t2 }],
    }]);
    const A = { id: '1', first_name: 'Ann' };
    const B = { id: '2', first_name: 'Bob' };
    const C = { id: '3', first_name: 'Cal' };
    const D = { id: '4', first_name: 'Dee' };

    it('ignores generated ids, so a normalised copy still matches its source', () => {
        const source = round([A, B], [C, D]);
        const normalised = normalizeSchedule(JSON.parse(JSON.stringify(source)).map((r: any) => {
            delete r.games[0].id; // force a fresh Date.now() id
            return r;
        }));
        expect(scheduleSignature(normalised)).toBe(scheduleSignature(source));
    });

    it('notices a swap', () => {
        expect(scheduleSignature(round([A, B], [C, D])))
            .not.toBe(scheduleSignature(round([A, C], [B, D])));
    });

    it('notices a rename', () => {
        expect(scheduleSignature(round([A, B], [C, D])))
            .not.toBe(scheduleSignature(round([{ id: '1', first_name: 'Annie' }, B], [C, D])));
    });

    it('notices an added playoff round', () => {
        const base = round([A, B], [C, D]);
        expect(scheduleSignature(base)).not.toBe(scheduleSignature([...base, ...round([A, C], [B, D])]));
    });

    it('is empty and safe for a missing schedule', () => {
        expect(scheduleSignature(null)).toBe('');
        expect(scheduleSignature(undefined)).toBe('');
        expect(() => scheduleSignature([{ id: 'r' } as any])).not.toThrow();
    });
});
