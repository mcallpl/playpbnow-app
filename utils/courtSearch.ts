/**
 * Ordering and searching the court list (1,300+ courts) so nobody has to
 * scroll for it. Used by the court pickers on the Groups screen and in
 * player editing; the Play Now picker keeps its own copy of the same idea.
 */
import { distanceMiles } from '../hooks/useBeacon';

export interface PickableCourt {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}

export interface CourtRow<C extends PickableCourt> {
  court: C;
  /** Miles from the user, when both positions are known. */
  dist: number | null;
  /** One of the user's own courts (used by a group, or the current choice). */
  mine: boolean;
}

const clean = (s: string) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Every word typed must appear somewhere in the name, city or state, in any
 * order, so "anderson redondo", "redondo anderson" and "ander" all find
 * Anderson Park in Redondo Beach.
 */
export function courtMatches(court: PickableCourt, query: string): boolean {
  const words = clean(query).split(' ').filter(Boolean);
  if (!words.length) return true;
  const hay = clean(`${court.name || ''} ${court.city || ''} ${court.state || ''}`);
  return words.every(w => hay.includes(w));
}

/**
 * The user's own courts first, then nearest first when we know where the
 * user is, otherwise A to Z. Courts with no coordinates are kept, after the
 * ones with a distance.
 */
export function orderCourts<C extends PickableCourt>(
  courts: C[],
  opts: { query?: string; myCourtIds?: (number | null | undefined)[]; location?: { latitude: number; longitude: number } | null },
): CourtRow<C>[] {
  const mine = new Set((opts.myCourtIds || []).filter((x): x is number => typeof x === 'number' && x > 0));
  const loc = opts.location || null;
  const rows: CourtRow<C>[] = courts
    .filter(c => courtMatches(c, opts.query || ''))
    .map(c => {
      const lat = c.lat == null || c.lat === '' ? NaN : Number(c.lat);
      const lng = c.lng == null || c.lng === '' ? NaN : Number(c.lng);
      const dist = loc && Number.isFinite(lat) && Number.isFinite(lng) ? distanceMiles(loc.latitude, loc.longitude, lat, lng) : null;
      return { court: c, dist, mine: mine.has(c.id) };
    });
  rows.sort((a, b) => {
    if (a.mine !== b.mine) return a.mine ? -1 : 1;
    if (a.dist != null && b.dist != null && a.dist !== b.dist) return a.dist - b.dist;
    if (a.dist != null && b.dist == null) return -1;
    if (b.dist != null && a.dist == null) return 1;
    return (a.court.name || '').localeCompare(b.court.name || '');
  });
  return rows;
}
