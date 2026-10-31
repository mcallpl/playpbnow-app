/**
 * Player names (2026-10-31).
 *
 * In PlayPBNow the FIRST NAME field is the name shown on the court ("Kevin B"),
 * so two Kevins can be told apart in every match box. Import used to keep only
 * that, and the last name someone pasted ("Kevin Brooks") was lost: EDIT
 * PLAYER showed "Kevin B" and an empty Last Name. Import now also saves the
 * last name, and screens that show a full name use fullName(), so the roster
 * reads "Kevin Brooks", never "Kevin B Brooks".
 */

const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv']);

/** The pasted last name, when the display name is a shortened form of it. */
export function importedLastName(displayName: string, pastedName: string): string {
  const shown = displayName.trim();
  const words = pastedName.trim().split(/\s+/).filter(Boolean);
  while (words.length > 2 && SUFFIXES.has(words[words.length - 1].toLowerCase())) words.pop();
  if (words.length < 2 || shown.toLowerCase() === pastedName.trim().toLowerCase()) return '';
  const last = words[words.length - 1].replace(/\.$/, '');
  const shownLast = shown.split(/\s+/).pop() || '';
  // Only when the shown name really is "first + start of this last name".
  if (!last.toLowerCase().startsWith(shownLast.replace(/\.$/, '').toLowerCase())) return '';
  if (last.length <= shownLast.replace(/\.$/, '').length) return '';
  return last;
}

/** "Kevin B" + "Brooks" -> "Kevin Brooks"; "Kevin" + "Brooks" -> "Kevin Brooks". */
export function fullName(first: string | null | undefined, last: string | null | undefined): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  if (!l) return f;
  if (!f) return l;
  const words = f.split(/\s+/);
  const tail = (words[words.length - 1] || '').replace(/\.$/, '');
  if (words.length >= 2 && tail.length < l.length && l.toLowerCase().startsWith(tail.toLowerCase())) {
    return [...words.slice(0, -1), l].join(' ');
  }
  if (f.toLowerCase().endsWith(' ' + l.toLowerCase())) return f;   // already full
  return `${f} ${l}`;
}
