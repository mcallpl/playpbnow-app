import { courtMatches, orderCourts } from '../utils/courtSearch';

const courts = [
  { id: 1, name: 'Anderson Park', city: 'Redondo Beach', state: 'CA', lat: 33.86, lng: -118.37 },
  { id: 2, name: 'Andulka Park', city: 'Riverside', state: 'CA', lat: 33.93, lng: -117.43 },
  { id: 3, name: 'Arcadia County Park', city: 'Arcadia', state: 'CA', lat: 34.13, lng: -118.04 },
  { id: 4, name: 'Memorial Park', city: 'Santa Monica', state: 'CA', lat: null, lng: null },
  { id: 5, name: 'Memorial Park', city: 'Orange', state: 'CA', lat: '33.79', lng: '-117.85' },
  { id: 6, name: "St. Mary's Courts", city: 'Ladera Ranch', state: 'CA', lat: 33.55, lng: -117.64 },
];

describe('courtMatches', () => {
  it('matches name, city or state, any word order, partial words', () => {
    expect(courtMatches(courts[0], 'ander')).toBe(true);
    expect(courtMatches(courts[0], 'redondo anderson')).toBe(true);
    expect(courtMatches(courts[0], 'REDONDO')).toBe(true);
    expect(courtMatches(courts[0], 'riverside')).toBe(false);
    expect(courtMatches(courts[3], 'memorial santa')).toBe(true);
    expect(courtMatches(courts[4], 'memorial santa')).toBe(false);
  });
  it('ignores punctuation and extra spaces', () => {
    expect(courtMatches(courts[5], 'st marys')).toBe(true);
    expect(courtMatches(courts[5], 'st mary')).toBe(true);
    expect(courtMatches(courts[5], '  ladera   ')).toBe(true);
  });
  it('an empty search matches everything', () => {
    expect(courts.every(c => courtMatches(c, '  '))).toBe(true);
  });
});

describe('orderCourts', () => {
  it('without a location: own courts first, then A to Z, nothing dropped', () => {
    const r = orderCourts(courts, { myCourtIds: [3, null, undefined] });
    expect(r.length).toBe(courts.length);
    expect(r[0].court.id).toBe(3);
    expect(r[0].mine).toBe(true);
    expect(r.slice(1).map(x => x.court.name)).toEqual([...r.slice(1).map(x => x.court.name)].sort((a, b) => a.localeCompare(b)));
  });
  it('with a location: own courts first, then nearest, courts with no position last', () => {
    const ladera = { latitude: 33.55, longitude: -117.64 };
    const r = orderCourts(courts, { myCourtIds: [1], location: ladera });
    expect(r[0].court.id).toBe(1);
    expect(r[1].court.id).toBe(6);
    expect(r[1].dist).toBeLessThan(1);
    expect(r[2].court.id).toBe(5); // Orange, string coordinates still count
    expect(r[r.length - 1].court.id).toBe(4);
    expect(r[r.length - 1].dist).toBeNull();
  });
  it('search and ordering combine', () => {
    const r = orderCourts(courts, { query: 'memorial', location: { latitude: 33.79, longitude: -117.85 } });
    expect(r.map(x => x.court.id)).toEqual([5, 4]);
  });
});
