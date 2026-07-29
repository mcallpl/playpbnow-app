#!/usr/bin/env python3
"""
Deep-research candidate names for courts still called "Pickleball Courts" /
"Pickleball", and write them to a TSV for a human to choose from.

    python3 scripts/courts_import/research_court_names.py -o ~/Desktop/court-name-research.tsv

Nothing is written to the database. Each court gets up to three ranked
candidates, each with the SOURCE it came from and its DISTANCE from the court,
because distance is the honest measure of how much to trust it — a name 40m away
is almost certainly the venue; one 600m away may just be a neighbour. An earlier
pass at 500m confidently produced "Katerina's Piano Lessons".

Four sources are combined:
  text-search   Places text search for "pickleball" near the point — finds the
                facility's own name when it has one
  nearby        Places nearby search, radius stepped 150/300/600m
  details       Place Details on the court's own google_place_id
  geocode       Reverse geocode — yields the neighbourhood/park a coordinate
                falls inside when nothing else is registered there
"""
import argparse, json, math, re, subprocess, sys, time, urllib.parse

SERVER = "root@64.227.108.128"
BASE = "https://maps.googleapis.com/maps/api"

GENERIC = ('pickleball', 'basketball', 'tennis court', 'playground', 'restroom',
           'parking', 'picnic', 'volleyball', 'swimming pool', 'baseball',
           'soccer field', 'dog park', 'skate park', 'court', 'courts')
BAD_TYPES = ('lodging', 'real_estate_agency', 'health', 'doctor', 'hair_care',
             'store', 'restaurant', 'spa', 'beauty_salon', 'travel_agency',
             'lawyer', 'finance', 'insurance_agency', 'car_repair', 'cafe',
             'food', 'bar', 'dentist', 'moving_company', 'storage')
GOOD_TYPES = ('park', 'stadium', 'school', 'primary_school', 'secondary_school',
              'university', 'campground', 'tourist_attraction', 'gym')
LISTING = re.compile(r'[!]|\bw/|\brental\b|\bgetaway\b|\bmin \d|\d+\s*(wk|br|bd)\b|'
                     r'\bavailable\b|\bcondo\b|\bcasita\b|\bapt\b|\bsuite\b', re.I)
# An amenity pin describing the surface itself, e.g. "Basketball half court",
# "Tennis Courts". "Tennis Club" is a real venue, so only reject when the name
# is the amenity rather than an organisation.
AMENITY = re.compile(r'^(basketball|tennis|pickleball|volleyball|bocce|paddle|'
                     r'shuffleboard|badminton|sand)\b.*\b(court|courts|half court)$', re.I)
# Beyond this the "nearest venue" is not reliably the court's venue. A 500m pass
# already produced "Katerina's Piano Lessons"; text-search reaches kilometres.
MAX_M = 400


def sql(q):
    r = subprocess.run(["ssh", SERVER, f"mysql playpbnow -N -e {json.dumps(q)}"],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"✗ mysql: {r.stderr.strip()}")
    return [l.split('\t') for l in r.stdout.strip().split('\n') if l.strip()]


def key():
    r = subprocess.run(["ssh", SERVER, "php -r 'include \"/var/www/html/vault/secrets.php\"; "
                                       "echo $vault_google_maps_api_key;'"],
                       capture_output=True, text=True)
    return r.stdout.strip()


def get(endpoint, params, api_key):
    params['key'] = api_key
    url = f"{BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
    # curl, not urllib — this python has no CA bundle
    r = subprocess.run(["curl", "-s", "--max-time", "25", url], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return {}


def metres(lat1, lng1, lat2, lng2):
    R = 6371000
    p1, p2 = math.radians(float(lat1)), math.radians(float(lat2))
    dp = math.radians(float(lat2) - float(lat1))
    dl = math.radians(float(lng2) - float(lng1))
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return int(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def usable(name, types):
    n = (name or '').strip()
    if not n or len(n) > 55 or LISTING.search(n):
        return False
    low = n.lower()
    if low.startswith('pickleball') or any(low == g for g in GENERIC):
        return False
    if AMENITY.match(n):
        return False
    if any(b in types for b in BAD_TYPES):
        return False
    if 'locality' in types or 'political' in types:
        return False
    return True


def candidates(court, api_key):
    cid, name, address, city, lat, lng, pid = court
    found = {}

    def add(nm, types, clat, clng, source):
        if not usable(nm, types):
            return
        d = metres(lat, lng, clat, clng) if clat else 9999
        prior = found.get(nm)
        if not prior or d < prior[1]:
            found[nm] = (source, d, types)

    # 1. the facility's own name, if it is registered as a pickleball venue
    ts = get("place/textsearch/json",
             {'query': f'pickleball near {lat},{lng}', 'location': f'{lat},{lng}',
              'radius': 800}, api_key)
    for r in ts.get('results', [])[:5]:
        loc = r.get('geometry', {}).get('location', {})
        add(r.get('name'), r.get('types', []), loc.get('lat'), loc.get('lng'), 'text-search')

    # 2. the enclosing venue, tightest radius first
    for radius in (150, 300, 600):
        nb = get("place/nearbysearch/json",
                 {'location': f'{lat},{lng}', 'radius': radius}, api_key)
        for r in nb.get('results', [])[:8]:
            loc = r.get('geometry', {}).get('location', {})
            add(r.get('name'), r.get('types', []), loc.get('lat'), loc.get('lng'),
                f'nearby@{radius}m')
        if found:
            break

    # 3. the court's own Places record
    if pid:
        d = get("place/details/json",
                {'place_id': pid, 'fields': 'name,types,geometry,vicinity'}, api_key)
        r = d.get('result', {})
        loc = r.get('geometry', {}).get('location', {})
        add(r.get('name'), r.get('types', []), loc.get('lat'), loc.get('lng'), 'details')

    # 4. what does the coordinate itself sit inside?
    gc = get("geocode/json", {'latlng': f'{lat},{lng}'}, api_key)
    for r in gc.get('results', [])[:4]:
        for comp in r.get('address_components', []):
            if {'park', 'neighborhood', 'sublocality'} & set(comp.get('types', [])):
                add(comp.get('long_name'), ['park'], lat, lng, 'geocode')

    # Distance first, type second. Ranking by type first let a park 8km away
    # beat a clubhouse 24m away — the single worst bug in this pass.
    near = {k: v for k, v in found.items() if v[1] <= MAX_M}
    ranked = sorted(near.items(),
                    key=lambda kv: (kv[1][1], 0 if any(g in kv[1][2] for g in GOOD_TYPES) else 1))
    return [(nm, src, dist) for nm, (src, dist, _t) in ranked[:3]]


def compose(venue, old):
    tail = old.strip().split()[-1]
    suffix = f" {tail}" if tail.isdigit() else ''
    if 'pickleball' in venue.lower():
        return venue + suffix
    return f"{venue} Pickleball Court{'s' if not suffix else suffix}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-o', '--out', default='court-name-research.tsv')
    a = ap.parse_args()
    api_key = key()
    rows = sql("SELECT id, name, address, city, lat, lng, google_place_id FROM courts "
               "WHERE name REGEXP '^[Pp]ickleball( [Cc]ourts?)?( [0-9]+)?$' "
               "AND lat IS NOT NULL ORDER BY city, id;")
    print(f"▶ researching {len(rows)} courts\n")
    out = []
    for r in rows:
        court = (r + [''] * 7)[:7]
        cid, name, address, city, lat, lng, _ = court
        cands = candidates(court, api_key)
        has_addr = 'address' if (address and not address.startswith(city)) else 'city-only'
        if cands:
            best = cands[0]
            print(f"  {cid:>5} {name:<18} → {compose(best[0], name)[:46]:<46} {best[1]}/{best[2]}m")
        else:
            print(f"  {cid:>5} {name:<18} → (nothing found)")
        out.append((cid, name, address or f'({city} only)', city, lat, lng, has_addr, cands))
        time.sleep(0.2)

    with open(a.out, 'w') as fh:
        fh.write("id\tcurrent_name\taddress_quality\tcity\tlat\tlng\t"
                 "suggested_name\tsource\tdistance_m\talt_2\talt_3\taddress\n")
        for cid, name, address, city, lat, lng, hq, cands in out:
            c = cands + [('', '', '')] * 3
            fh.write("\t".join([
                cid, name, hq, city, str(lat), str(lng),
                compose(c[0][0], name) if c[0][0] else '',
                c[0][1], str(c[0][2]) if c[0][0] else '',
                compose(c[1][0], name) if c[1][0] else '',
                compose(c[2][0], name) if c[2][0] else '',
                address]) + "\n")
    print(f"\n✓ {sum(1 for o in out if o[7])} of {len(out)} have candidates → {a.out}")


if __name__ == '__main__':
    main()
