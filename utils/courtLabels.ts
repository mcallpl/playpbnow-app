/**
 * Court names for ONE match (Chip, 2026-10-31).
 *
 * By default the courts read CRT 1, CRT 2, CRT 3... A group that plays on
 * courts D, E and F (or 34, 35 and 17) names them once, in one place, and
 * every round uses those names.
 *
 * Naming a court fills the courts AFTER it with the next in sequence
 * (D -> E, F; 34 -> 35, 36; 1A -> 1B) unless the user typed those courts
 * by hand. Anything can still be changed on its own right after.
 *
 * The names travel inside the schedule (`court_labels` on every round), so
 * they survive a refresh, reach live collaborators with the matchups, and
 * print on the texted lineup. An empty list means the default numbers.
 */

/** How long a court name may be (it sits in a narrow column between teams). */
export const COURT_LABEL_MAX = 4;

/** Strip a typed "CRT", "CT" or "COURT" prefix: the screen adds "CRT" itself. */
export const cleanCourtLabel = (raw: string): string => {
    let s = String(raw ?? '').trim();
    s = s.replace(/^(court|crt|ct)\.?\s*#?\s*/i, '');
    return s.trim().slice(0, COURT_LABEL_MAX);
};

/** The default name for court index i (0-based): "1", "2", ... */
export const defaultCourtLabel = (i: number): string => String(i + 1);

/** The name to show for court index i. */
export const courtLabelAt = (labels: string[] | null | undefined, i: number): string => {
    const v = Array.isArray(labels) ? cleanCourtLabel(labels[i] ?? '') : '';
    return v || defaultCourtLabel(i);
};

const incLetters = (s: string): string => {
    // Z -> AA, AZ -> BA, keeping the case of the last letter.
    const upper = s === s.toUpperCase();
    const chars = s.toUpperCase().split('');
    let i = chars.length - 1;
    while (i >= 0) {
        if (chars[i] !== 'Z') { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break; }
        chars[i] = 'A';
        i--;
    }
    let out = chars.join('');
    if (i < 0) out = 'A' + out;
    return upper ? out : out.toLowerCase();
};

/**
 * The court that naturally follows `label`, or null when there is no obvious
 * next one ("Stadium" has no successor, so the following courts are left alone).
 */
export const nextCourtLabel = (label: string): string | null => {
    const s = cleanCourtLabel(label);
    if (!s) return null;
    const num = s.match(/^(.*?)(\d+)$/);
    if (num) {
        const n = String(parseInt(num[2], 10) + 1).padStart(num[2].length, '0');
        const out = num[1] + n;
        return out.length <= COURT_LABEL_MAX ? out : null;
    }
    // A trailing run of letters that is its own token: "D", "AB", "1A", "N-C".
    // "Pool" is a word, not a sequence, so it has no next court.
    const let_ = s.match(/^(.*?)([A-Za-z]+)$/);
    if (let_ && (let_[1] === '' || /[^A-Za-z]$/.test(let_[1])) && let_[2].length <= 2) {
        const out = let_[1] + incLetters(let_[2]);
        return out.length <= COURT_LABEL_MAX ? out : null;
    }
    return null;
};

/**
 * Apply one edit. `labels` and `manual` are per court index; `count` is how
 * many courts the match uses. Returns new arrays (never mutates).
 *
 * The edited court becomes manual. Every later court the user has NOT typed
 * by hand follows on from the court before it. Clearing a court puts it back
 * to its default number and lets it follow again.
 */
export const applyCourtLabelEdit = (
    labels: string[],
    manual: boolean[],
    index: number,
    raw: string,
    count: number,
): { labels: string[]; manual: boolean[] } => {
    const out: string[] = [];
    const man: boolean[] = [];
    for (let i = 0; i < count; i++) {
        out.push(courtLabelAt(labels, i));
        man.push(!!manual[i]);
    }
    const v = cleanCourtLabel(raw);
    out[index] = v || defaultCourtLabel(index);
    man[index] = !!v;
    for (let j = index + 1; j < count; j++) {
        if (man[j]) break; // a hand-typed court starts its own run
        const next = nextCourtLabel(out[j - 1]);
        if (next === null) break;
        out[j] = next;
    }
    return { labels: out, manual: man };
};

/** True when every name is just its default number (nothing to store). */
export const isDefaultCourtLabels = (labels: string[] | null | undefined): boolean =>
    !Array.isArray(labels) || labels.every((l, i) => cleanCourtLabel(l) === '' || cleanCourtLabel(l) === defaultCourtLabel(i));

/** The court names stored in a schedule (first round that carries them). */
export const courtLabelsFromSchedule = (schedule: any[] | null | undefined): string[] | null => {
    if (!Array.isArray(schedule)) return null;
    const r = schedule.find((x: any) => Array.isArray(x?.court_labels));
    return r ? r.court_labels.map((l: any) => cleanCourtLabel(String(l ?? ''))) : null;
};

const sameLabels = (a: any, b: string[]): boolean =>
    Array.isArray(a) && a.length === b.length && a.every((v: any, i: number) => v === b[i]);

/** Stamp the names onto every round. Returns the SAME array when nothing changes. */
export const stampCourtLabels = (schedule: any[], labels: string[]): any[] => {
    if (!Array.isArray(schedule) || schedule.every(r => sameLabels(r?.court_labels, labels))) return schedule;
    return schedule.map(r => (sameLabels(r?.court_labels, labels) ? r : { ...r, court_labels: [...labels] }));
};

/** How many courts the match uses: the most games in any round. */
export const courtCountOf = (schedule: any[] | null | undefined): number =>
    Array.isArray(schedule) ? schedule.reduce((m, r) => Math.max(m, (r?.games || []).length), 0) : 0;

/**
 * Fit a group's remembered names to this match's court count. Extra names are
 * dropped; missing ones continue the sequence (D, E -> D, E, F) or fall back
 * to the court's number.
 */
export const fitCourtLabels = (labels: string[] | null | undefined, count: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
        const v = Array.isArray(labels) ? cleanCourtLabel(labels[i] ?? '') : '';
        if (v) { out.push(v); continue; }
        const prev = i > 0 ? nextCourtLabel(out[i - 1]) : null;
        out.push(prev || defaultCourtLabel(i));
    }
    return out;
};

/** "CRT D, E, F" for an offer line. */
export const describeCourtLabels = (labels: string[]): string =>
    labels.length ? `CRT ${labels.join(', ')}` : '';
