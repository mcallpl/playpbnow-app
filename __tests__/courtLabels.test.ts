import {
    cleanCourtLabel, courtLabelAt, nextCourtLabel, applyCourtLabelEdit,
    isDefaultCourtLabels, courtLabelsFromSchedule, stampCourtLabels, courtCountOf,
} from '../utils/courtLabels';

describe('court names for one match', () => {
    test('default is 1, 2, 3...', () => {
        expect([0, 1, 2].map(i => courtLabelAt([], i))).toEqual(['1', '2', '3']);
        expect(courtLabelAt(null, 4)).toBe('5');
        expect(courtLabelAt(['D', ''], 1)).toBe('2');
    });

    test('a typed CRT / COURT prefix is dropped (the screen adds CRT)', () => {
        expect(cleanCourtLabel('CRT D')).toBe('D');
        expect(cleanCourtLabel('court 34')).toBe('34');
        expect(cleanCourtLabel('Ct. #7')).toBe('7');
        expect(cleanCourtLabel('  B  ')).toBe('B');
    });

    test('the next court follows letters and numbers', () => {
        expect(nextCourtLabel('D')).toBe('E');
        expect(nextCourtLabel('d')).toBe('e');
        expect(nextCourtLabel('Z')).toBe('AA');
        expect(nextCourtLabel('34')).toBe('35');
        expect(nextCourtLabel('09')).toBe('10');
        expect(nextCourtLabel('1A')).toBe('1B');
        expect(nextCourtLabel('N-3')).toBe('N-4');
        expect(nextCourtLabel('Pool')).toBeNull();   // a word, not a sequence
        expect(nextCourtLabel('9999')).toBeNull();   // would not fit
    });

    test('naming the first court D makes the rest E, F, G', () => {
        const r = applyCourtLabelEdit([], [], 0, 'D', 4);
        expect(r.labels).toEqual(['D', 'E', 'F', 'G']);
        expect(r.manual).toEqual([true, false, false, false]);
    });

    test('naming court 1 "34" makes the rest 35, 36', () => {
        expect(applyCourtLabelEdit([], [], 0, 'CRT 34', 3).labels).toEqual(['34', '35', '36']);
    });

    test('a court typed by hand is never overwritten by the fill', () => {
        let r = applyCourtLabelEdit([], [], 0, 'D', 4);
        r = applyCourtLabelEdit(r.labels, r.manual, 2, '17', 4);   // D, E, 17, 18
        expect(r.labels).toEqual(['D', 'E', '17', '18']);
        r = applyCourtLabelEdit(r.labels, r.manual, 0, 'A', 4);    // A, B, then 17 stays
        expect(r.labels).toEqual(['A', 'B', '17', '18']);
    });

    test('any single court can be changed on its own afterwards', () => {
        let r = applyCourtLabelEdit([], [], 0, 'D', 3);
        r = applyCourtLabelEdit(r.labels, r.manual, 1, 'X', 3);
        expect(r.labels).toEqual(['D', 'X', 'Y']);
    });

    test('a word with no sequence leaves the following courts alone', () => {
        expect(applyCourtLabelEdit([], [], 0, 'Pool', 3).labels).toEqual(['Pool', '2', '3']);
    });

    test('clearing a court puts back its number', () => {
        let r = applyCourtLabelEdit([], [], 0, 'D', 2);
        r = applyCourtLabelEdit(r.labels, r.manual, 0, '', 2);
        expect(r.labels).toEqual(['1', '2']);
        expect(isDefaultCourtLabels(r.labels)).toBe(true);
    });

    test('names ride on every round and come back out', () => {
        const sched = [{ games: [{}, {}] }, { games: [{}, {}, {}] }];
        expect(courtCountOf(sched)).toBe(3);
        expect(courtLabelsFromSchedule(sched)).toBeNull();
        const stamped = stampCourtLabels(sched, ['D', 'E', 'F']);
        expect(stamped.every((r: any) => r.court_labels.join() === 'D,E,F')).toBe(true);
        expect(courtLabelsFromSchedule(stamped)).toEqual(['D', 'E', 'F']);
        // Nothing changes -> the same array, so no extra render or push.
        expect(stampCourtLabels(stamped, ['D', 'E', 'F'])).toBe(stamped);
    });
});

import { fitCourtLabels, describeCourtLabels } from '../utils/courtLabels';

describe('a group\'s remembered court names fit this match', () => {
    test('more courts than remembered: the sequence continues', () => {
        expect(fitCourtLabels(['D', 'E'], 3)).toEqual(['D', 'E', 'F']);
        expect(fitCourtLabels(['34'], 3)).toEqual(['34', '35', '36']);
    });
    test('fewer courts than remembered: extras are dropped', () => {
        expect(fitCourtLabels(['D', 'E', 'F'], 2)).toEqual(['D', 'E']);
    });
    test('a word with no sequence falls back to the number', () => {
        expect(fitCourtLabels(['Pool'], 2)).toEqual(['Pool', '2']);
    });
    test('offer text', () => {
        expect(describeCourtLabels(['D', 'E', 'F'])).toBe('CRT D, E, F');
    });
});
