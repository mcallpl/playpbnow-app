#!/usr/bin/env python3
"""
Propose real names for generically-named courts ("Pickleball Courts", "Pickleball
Court 3", …) by asking Google Places what venue sits at the court's coordinates.

    python3 rename_generic_courts.py --propose      # writes proposals.tsv, no DB writes
    python3 rename_generic_courts.py --apply        # applies an approved proposals.tsv

Names are DERIVED, never invented: each one comes from a Places result at the
court's own lat/lng, filtered to the enclosing venue (a park, club, or school)
and skipping Google's own generic amenity pins ("Pickleball Courts",
"Playground", "Basketball Court") and bare localities.

Anything without a confident venue is left for manual review rather than guessed
at — a wrong name in a user-facing picker is worse than a dull one.
"""
import argparse, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

SERVER = "root@64.227.108.128"
NEARBY = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
DETAILS = "https://maps.googleapis.com/maps/api/place/details/json"

# Google's own amenity pins — never a venue name
GENERIC = ('pickleball', 'basketball', 'tennis court', 'playground', 'restroom',
           'parking', 'picnic', 'volleyball', 'swimming pool', 'baseball',
           'soccer field', 'dog park', 'skate park', 'court', 'courts')
# Only these Google types are ever a court's venue. The first pass allowed
# 'point_of_interest' / 'lodging' / 'health' and produced "Sport Clips Haircuts
# of San Clemente Pickleball Courts", "Snowbirds Oasis ... Holiday Home", and
# two doctors' offices — nearby businesses, not the place the court is in.
PREFERRED = ('park', 'stadium', 'school', 'primary_school', 'secondary_school',
             'university', 'campground')
# Never a venue, however close it happens to be
BAD_TYPES = ('lodging', 'real_estate_agency', 'health', 'doctor', 'hair_care',
             'store', 'restaurant', 'spa', 'beauty_salon', 'travel_agency',
             'lawyer', 'finance', 'insurance_agency', 'car_repair', 'cafe',
             'food', 'bar', 'church', 'place_of_worship', 'dentist', 'gym')
# An establishment with no useful type still qualifies if it NAMES itself a venue
VENUE_WORDS = re.compile(
    r'\b(park|club|recreation|rec center|community center|ymca|college|'
    r'university|school|sports complex|athletic|aquatic|tennis center|'
    r'racquet|country club)\b', re.I)
# Vacation-rental and listing titles masquerading as places
LISTING = re.compile(r'[!]|\bw/|\brental\b|\bgetaway\b|\bmin \d|\d+\s*(wk|br|bd)\b|'
                     r'\bavailable\b|\bcondo\b|\bhome\b|\bcasita\b|\bunit\b', re.I)


def sql(query):
    out = subprocess.run(["ssh", SERVER, f"mysql playpbnow -N -e {json.dumps(query)}"],
                         capture_output=True, text=True)
    if out.returncode:
        sys.exit(f"✗ mysql: {out.stderr.strip()}")
    return [l.split('\t') for l in out.stdout.strip().split('\n') if l.strip()]


def key():
    r = subprocess.run(["ssh", SERVER,
                        "php -r 'include \"/var/www/html/vault/secrets.php\"; "
                        "echo $vault_google_maps_api_key;'"],
                       capture_output=True, text=True)
    k = r.stdout.strip()
    if not k:
        sys.exit("✗ could not read $vault_google_maps_api_key from the vault")
    return k


def nearby(lat, lng, api_key, radius=250):
    # curl, not urllib: this python has no CA bundle, so urlopen dies with
    # CERTIFICATE_VERIFY_FAILED against the Google endpoint.
    url = f"{NEARBY}?{urllib.parse.urlencode({'location': f'{lat},{lng}', 'radius': radius, 'key': api_key})}"
    r = subprocess.run(["curl", "-s", "--max-time", "20", url],
                       capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except json.JSONDecodeError:
        print(f"   ! places: unparseable response", file=sys.stderr)
        return []
    if d.get('status') not in ('OK', 'ZERO_RESULTS'):
        print(f"   ! places: {d.get('status')} {d.get('error_message','')}", file=sys.stderr)
    return d.get('results', [])


def details(place_id, api_key):
    """Place Details for the court's own pin — sometimes carries a venue name or
    a `vicinity` that a coordinate search misses."""
    url = f"{DETAILS}?{urllib.parse.urlencode({'place_id': place_id, 'fields': 'name,vicinity,formatted_address,types', 'key': api_key})}"
    r = subprocess.run(["curl", "-s", "--max-time", "20", url], capture_output=True, text=True)
    try:
        return json.loads(r.stdout).get('result', {}) or {}
    except json.JSONDecodeError:
        return {}


def widen(lat, lng, api_key, city):
    """Second pass: step the radius out. A court whose address is city-only is
    still pinned precisely, so a park slightly further out is usually the venue.
    Capped at 600m — beyond that the nearest park is not necessarily the court's
    park, and a confident wrong name is the thing we are avoiding."""
    for radius in (500, 600):
        venue, types = pick_venue(nearby(lat, lng, api_key, radius), city)
        if venue:
            return venue, types, radius
    return None, None, None


def is_generic(name):
    n = name.lower().strip()
    return any(n == g or n.startswith(g + ' ') or n.endswith(' ' + g) or g == n
               for g in GENERIC) or n.startswith('pickleball')


def pick_venue(results, city):
    """The enclosing venue: skip amenity pins and the city itself, then prefer
    park-like types, falling back to the nearest named establishment."""
    cands = []
    for r in results:
        name = (r.get('name') or '').strip()
        types = r.get('types', [])
        if not name or is_generic(name):
            continue
        if 'locality' in types or 'political' in types:
            continue                      # "Chino Hills" is the city, not a venue
        if name.lower() == (city or '').lower():
            continue
        if any(b in types for b in BAD_TYPES) or LISTING.search(name):
            continue                      # a business or a rental listing
        if len(name) > 55:
            continue                      # listing prose, not a place name
        typed = next((i for i, p in enumerate(PREFERRED) if p in types), None)
        if typed is not None:
            cands.append((typed, name, types))
        elif VENUE_WORDS.search(name):
            cands.append((len(PREFERRED), name, types))   # names itself a venue
    cands.sort(key=lambda c: c[0])
    return (cands[0][1], cands[0][2]) if cands else (None, None)


def compose(venue, old_name):
    """Keep a trailing court number if the original carried one, so multiple
    courts at one venue stay distinguishable."""
    suffix = ''
    tail = old_name.strip().split()[-1]
    if tail.isdigit():
        suffix = f" {tail}"
    base = venue.rstrip('.')
    if 'pickleball' in base.lower():
        return base + suffix
    return f"{base} Pickleball Court{'s' if not suffix else suffix}"


def propose(path):
    api_key = key()
    rows = sql("SELECT id, name, address, city, lat, lng FROM courts "
               "WHERE name REGEXP '^[Pp]ickleball [Cc]ourts?( [0-9]+)?$' ORDER BY city, id;")
    print(f"▶ {len(rows)} generically-named courts\n")
    out, unresolved = [], 0
    for r in rows:
        cid, name, address, city, lat, lng = (r + [''] * 6)[:6]
        venue, types = pick_venue(nearby(lat, lng, api_key), city)
        if venue:
            new = compose(venue, name)
            out.append((cid, name, new, address, city, ",".join((types or [])[:2])))
            print(f"  {cid:>5}  {name:<20} → {new}")
        else:
            unresolved += 1
            out.append((cid, name, '', address, city, 'NO CONFIDENT VENUE'))
            print(f"  {cid:>5}  {name:<20} → (unresolved — {address or city})")
        time.sleep(0.12)
    with open(path, 'w') as fh:
        fh.write("id\told_name\tnew_name\taddress\tcity\tsource\n")
        for o in out:
            fh.write("\t".join(str(x) for x in o) + "\n")
    print(f"\n✓ {len(out) - unresolved} proposed, {unresolved} unresolved → {path}")
    print("  Review it, blank out any new_name you reject, then run --apply")


def retry(path):
    """Re-attempt only the rows a first pass could not resolve."""
    api_key = key()
    rows = sql("SELECT id, name, address, city, lat, lng, google_place_id FROM courts "
               "WHERE name REGEXP '^[Pp]ickleball [Cc]ourts?( [0-9]+)?$' ORDER BY city, id;")
    print(f"▶ retrying {len(rows)} unresolved courts\n")
    out, got = [], 0
    for r in rows:
        cid, name, address, city, lat, lng, pid = (r + [''] * 7)[:7]
        venue, types, radius = widen(lat, lng, api_key, city)
        src = f"nearby@{radius}m"
        if not venue and pid:
            d = details(pid, api_key)
            cand = (d.get('name') or '').strip()
            if cand and not is_generic(cand) and not LISTING.search(cand) and len(cand) <= 55:
                venue, src = cand, 'place-details'
        if venue:
            got += 1
            new = compose(venue, name)
            out.append((cid, name, new, address, city, src))
            print(f"  {cid:>5}  {name:<20} → {new}   [{src}]")
        else:
            out.append((cid, name, '', address, city, 'STILL UNRESOLVED'))
            print(f"  {cid:>5}  {name:<20} → (still unresolved)")
        time.sleep(0.12)
    with open(path, 'w') as fh:
        fh.write("id\told_name\tnew_name\taddress\tcity\tsource\n")
        for o in out:
            fh.write("\t".join(str(x) for x in o) + "\n")
    print(f"\n✓ {got} newly resolved of {len(rows)} → {path}")


def apply(path):
    if not os.path.exists(path):
        sys.exit(f"✗ {path} not found — run --propose first")
    updates = []
    for line in open(path).read().strip().split('\n')[1:]:
        f = line.split('\t')
        if len(f) >= 3 and f[2].strip():
            updates.append((f[0], f[2].strip()))
    if not updates:
        sys.exit("✗ nothing to apply")
    print(f"▶ applying {len(updates)} renames")
    stmts = ";".join(
        "UPDATE courts SET name={} WHERE id={}".format(
            "'" + n.replace("\\", "\\\\").replace("'", "\\'") + "'", int(i))
        for i, n in updates)
    r = subprocess.run(["ssh", SERVER, f"mysql playpbnow -e {json.dumps(stmts + ';')}"],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"✗ {r.stderr.strip()}")
    print(f"✓ {len(updates)} courts renamed")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--propose', action='store_true')
    ap.add_argument('--retry-unresolved', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('-f', '--file', default='scripts/courts_import/proposals.tsv')
    a = ap.parse_args()
    if a.retry_unresolved:
        retry(a.file)
    elif a.apply:
        apply(a.file)
    elif a.propose:
        propose(a.file)
    else:
        ap.error("pass --propose or --apply")
