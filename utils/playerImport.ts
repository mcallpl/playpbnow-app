/**
 * Player list import: turns pasted text or a spreadsheet into roster rows.
 *
 * Accepts, one player per line:
 *   - just a name                       "Jane Smith"
 *   - name and gender in two columns   "Jane Smith<TAB>F", "Jane Smith, Female", "Jane Smith    F"
 *   - a whole gender word inline        "Jane Smith Female" (a lone letter inline is a last initial)
 *   - first and last in two columns     "Jane<TAB>Smith<TAB>F"
 *   - numbered or bulleted lists        "1. Jane", "- Jane", "• Jane"
 * A header row ("Name, Gender") is skipped. A line with no recognizable gender
 * comes back with gender null, and the organizer picks it in the preview: the
 * app never guesses a gender from a name.
 */

export type ImportGender = 'male' | 'female';

export interface ImportRow {
  name: string;
  gender: ImportGender | null;
}

export interface ParseResult {
  rows: ImportRow[];
  /** Lines dropped because the same name already appeared earlier in the list. */
  duplicates: string[];
}

// No words that are also first names (Guy, Lady, Gal): a name must never be eaten as a gender.
const MALE_WORDS = new Set(['m', 'male', 'man', 'men', 'boy', 'mr', 'mr.']);
const FEMALE_WORDS = new Set(['f', 'female', 'woman', 'women', 'w', 'girl', 'ms', 'ms.', 'mrs', 'mrs.']);
// Inside one run of text (no column break) only a whole word counts, never a
// single letter: in "Kim M" or "Beth F" the letter is a last initial, not a
// gender. A lone M/F/W counts only when it sits in its own column (tab, comma,
// or a wide gap of 2+ spaces, which is how copied spreadsheet cells often paste).
const INLINE_TRAILING = new Set(['male', 'female', 'man', 'woman', 'men', 'women', 'boy', 'girl', '(m)', '(f)', '(male)', '(female)']);
const INLINE_LEADING = new Set(['male', 'female', '(m)', '(f)', '(male)', '(female)']);
const HEADER_WORDS = new Set([
  'name', 'names', 'player', 'players', 'player name', 'full name', 'first', 'first name', 'last', 'last name',
  'gender', 'sex', 'm/f', 'f/m',
]);

export function genderFromToken(token: string): ImportGender | null {
  const t = token.trim().toLowerCase().replace(/[()\[\]]/g, '');
  if (MALE_WORDS.has(t)) return 'male';
  if (FEMALE_WORDS.has(t)) return 'female';
  return null;
}

/** "jANE smith" -> "Jane Smith"; keeps O'Brien and Mary-Kate readable. */
export function tidyName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.replace(/(^|[-'])([a-z])/g, (_m, p, c) => p + c.toUpperCase()))
    .map(w => (w === w.toUpperCase() && w.length > 2 ? w.charAt(0) + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*•·]+|\(?\d{1,3}[.)\]:]|#\d{1,3})\s+/, '');
}

function isHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.map(c => c.trim().toLowerCase()).filter(Boolean);
  return nonEmpty.length > 0 && nonEmpty.every(c => HEADER_WORDS.has(c));
}

/** Splits one CSV line, honoring "quoted, values". */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if ((ch === ',' || ch === ';') && !quoted) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCells(cells: string[]): ImportRow | null {
  const clean = cells.map(c => c.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  let gender: ImportGender | null = null;
  const nameParts: string[] = [];
  for (const cell of clean) {
    const g: ImportGender | null = gender === null ? genderFromToken(cell) : null;
    if (g) { gender = g; continue; }
    // Ignore stray numbers (row numbers, ratings, phone fragments) in other columns.
    if (/^[\d\s.+()\-/#]+$/.test(cell)) continue;
    // Ignore email addresses in a side column.
    if (/^\S+@\S+\.\S+$/.test(cell)) continue;
    nameParts.push(cell);
  }
  // A single cell like "Jane Smith Female" or "(F) Jane Smith": peel a gender word off either end.
  if (gender === null && nameParts.length === 1) {
    const words = nameParts[0].split(/\s+/);
    if (words.length > 1) {
      const lastWord = words[words.length - 1].toLowerCase();
      const firstWord = words[0].toLowerCase();
      if (INLINE_TRAILING.has(lastWord)) { gender = genderFromToken(lastWord); words.pop(); }
      else if (INLINE_LEADING.has(firstWord)) { gender = genderFromToken(firstWord); words.shift(); }
      nameParts[0] = words.join(' ');
    }
  }
  const name = tidyName(nameParts.slice(0, 2).join(' '));
  if (!name) return null;
  return { name, gender };
}

/** Parses a 2D grid of cells (from a spreadsheet file or pasted text). */
export function parseGrid(grid: string[][]): ParseResult {
  const rows: ImportRow[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  grid.forEach((cells, i) => {
    if (i === 0 && isHeaderRow(cells)) return;
    const row = parseCells(cells);
    if (!row) return;
    const key = row.name.toLowerCase();
    if (seen.has(key)) { duplicates.push(row.name); return; }
    seen.add(key);
    rows.push(row);
  });
  return { rows, duplicates };
}

/** Parses pasted text or the contents of a .csv / .txt file. */
export function parsePlayerText(text: string): ParseResult {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(stripBullet).filter(l => l.trim());
  const grid = lines.map(line => {
    // Copied spreadsheet cells arrive tab-separated.
    if (line.includes('\t')) return line.split('\t');
    // A wide gap (2+ spaces) is a column break: spreadsheet cells often paste that way.
    if (/\S {2,}\S/.test(line)) return line.trim().split(/ {2,}/);
    // Commas only separate columns when one of the columns is a gender
    // ("Jane Smith, F"). Otherwise "Smith, Jane" stays one name.
    if (/[,;]/.test(line)) {
      const parts = splitCsvLine(line);
      if (parts.some(p => genderFromToken(p))) return parts;
      return [parts.map(p => p.trim()).filter(Boolean).reverse().join(' ')];
    }
    return [line];
  });
  return parseGrid(grid);
}

const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv']);

/**
 * "Chip McAllister" -> "Chip M". "Mary Ann Smith" -> "Mary Ann S".
 * "Chip M" and "Chip" are already short and come back unchanged.
 * prefix is how many letters of the last name to keep (1 = initial).
 */
export function shortName(full: string, prefix = 1): string {
  const words = full.trim().split(/\s+/).filter(Boolean);
  while (words.length > 2 && NAME_SUFFIXES.has(words[words.length - 1].toLowerCase())) words.pop();
  if (words.length < 2) return words.join(' ');
  const last = words.pop()!.replace(/\.$/, '');
  const keep = last.slice(0, Math.max(1, prefix));
  return words.join(' ') + ' ' + keep.charAt(0).toUpperCase() + keep.slice(1);
}

/**
 * Short names for a whole list. When two different people would share one
 * ("Greg Smith" and "Greg Stone" both "Greg S"), more letters of the last name
 * are kept until they differ ("Greg Sm", "Greg St"), so two people are never
 * merged into one player.
 */
export function shortNames(fullNames: string[]): string[] {
  const prefix = fullNames.map(() => 1);
  for (let pass = 0; pass < 30; pass++) {
    const out = fullNames.map((n, i) => shortName(n, prefix[i]));
    const byKey: Record<string, number[]> = {};
    out.forEach((n, i) => { (byKey[n.toLowerCase()] = byKey[n.toLowerCase()] || []).push(i); });
    let changed = false;
    Object.values(byKey).forEach(ix => {
      if (ix.length < 2) return;
      ix.forEach(i => {
        const lastLen = (fullNames[i].trim().split(/\s+/).pop() || '').replace(/\.$/, '').length;
        if (prefix[i] < lastLen) { prefix[i]++; changed = true; }
      });
    });
    if (!changed) return out;
  }
  return fullNames.map((n, i) => shortName(n, prefix[i]));
}

/** Rows whose name already exists in the target roster (case-insensitive). */
export function splitExisting(rows: ImportRow[], existingNames: string[]): { fresh: ImportRow[]; already: ImportRow[] } {
  const have = new Set(existingNames.map(n => n.trim().toLowerCase()));
  const fresh: ImportRow[] = [];
  const already: ImportRow[] = [];
  rows.forEach(r => (have.has(r.name.toLowerCase()) ? already : fresh).push(r));
  return { fresh, already };
}

export interface AddResult {
  added: number;
  failed: string[];
}

/**
 * Adds rows to a server group one at a time through add_player.php, the same
 * endpoint the single-player add uses, so ownership, dedup and player keys all
 * behave exactly as they do when a player is typed in by hand. Sequential on
 * purpose: order_index is assigned per insert and the list keeps its order.
 */
export async function addRowsToGroup(
  apiUrl: string,
  groupKey: string,
  rows: { name: string; gender: ImportGender }[],
  onProgress?: (done: number, total: number) => void,
): Promise<AddResult> {
  let added = 0;
  const failed: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const res = await fetch(`${apiUrl}/add_player.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_key: groupKey,
          first_name: r.name,
          gender: r.gender,
          player_key: 'pk_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 9999),
        }),
      });
      const data = await res.json();
      if (data.status === 'success') added++;
      else failed.push(r.name);
    } catch {
      failed.push(r.name);
    }
    onProgress?.(i + 1, rows.length);
  }
  return { added, failed };
}
