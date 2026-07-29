#!/usr/bin/env python3
"""
Repair court addresses and city fields from their coordinates.

    python3 scripts/courts_import/fix_addresses.py --dry-run
    python3 scripts/courts_import/fix_addresses.py --apply

Two defects came out of the original Places import:

  CITY-ONLY ADDRESS  address is "La Quinta, CA 92253, USA" with no street
                     number, so the app shows a court with no findable location
  CITY MISMATCH      the city column disagrees with the address, e.g. a court
                     filed under Coronado whose address and pin are in San Diego

Both are fixed the same way: reverse geocode the court's own lat/lng, which is
the one field the import got right, and take Google's street address and
locality for that point.

Rules, so this never makes data worse:
  * only replace an address when the new one carries a street number and the old
    one does not
  * only replace a city when reverse geocoding returns a locality, and record
    the change so it can be reviewed
  * never touch a row whose coordinates are missing
"""
import argparse, json, re, subprocess, sys, time, urllib.parse

SERVER = "root@64.227.108.128"
GEOCODE = "https://maps.googleapis.com/maps/api/geocode/json"


def sql(q, quiet=False):
    r = subprocess.run(["ssh", SERVER, f"mysql playpbnow -N -e {json.dumps(q)}"],
                       capture_output=True, text=True)
    if r.returncode and not quiet:
        sys.exit(f"✗ mysql: {r.stderr.strip()}")
    return [l.split('\t') for l in r.stdout.strip().split('\n') if l.strip()]


def key():
    r = subprocess.run(["ssh", SERVER, "php -r 'include \"/var/www/html/vault/secrets.php\"; "
                                       "echo $vault_google_maps_api_key;'"],
                       capture_output=True, text=True)
    return r.stdout.strip()


def revgeo(lat, lng, api_key):
    url = f"{GEOCODE}?{urllib.parse.urlencode({'latlng': f'{lat},{lng}', 'key': api_key})}"
    # curl, not urllib — this python has no CA bundle
    r = subprocess.run(["curl", "-s", "--max-time", "25", url], capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except json.JSONDecodeError:
        return None, None
    results = d.get('results', [])
    if not results:
        return None, None
    street = next((x['formatted_address'] for x in results
                   if 'street_address' in x.get('types', [])
                   and re.match(r'^\s*\d', x['formatted_address'])), None)
    if not street:
        street = next((x['formatted_address'] for x in results
                       if re.match(r'^\s*\d', x.get('formatted_address', ''))), None)
    locality = None
    for x in results:
        for comp in x.get('address_components', []):
            if 'locality' in comp.get('types', []):
                locality = comp['long_name']
                break
        if locality:
            break
    return street, locality


def has_street(a):
    return bool(a) and bool(re.match(r'^\s*\d', a))


def esc(s):
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if not (a.apply or a.dry_run):
        ap.error('pass --apply or --dry-run')

    api_key = key()
    rows = sql("SELECT id,name,address,city,lat,lng FROM courts WHERE lat IS NOT NULL;")
    todo = []
    for r in rows:
        cid, name, address, city, lat, lng = (r + [''] * 6)[:6]
        address = '' if address == 'NULL' else address
        city = '' if city == 'NULL' else city
        city_only = not has_street(address)
        mismatch = bool(address and city and ',' in address and city.lower() not in address.lower())
        if city_only or mismatch:
            todo.append((cid, name, address, city, lat, lng, city_only, mismatch))

    print(f"▶ {len(todo)} courts to repair\n")
    addr_fix = city_fix = 0
    stmts = []
    for cid, name, address, city, lat, lng, city_only, mismatch in todo:
        street, locality = revgeo(lat, lng, api_key)
        sets, notes = [], []
        if city_only and street and has_street(street):
            sets.append(f"address={esc(street)}")
            notes.append(f"addr: {address[:26]!r} → {street[:38]!r}")
            addr_fix += 1
        if locality and locality.lower() != city.lower():
            sets.append(f"city={esc(locality)}")
            notes.append(f"city: {city!r} → {locality!r}")
            city_fix += 1
        if sets:
            stmts.append(f"UPDATE courts SET {', '.join(sets)} WHERE id={int(cid)}")
            print(f"  {cid:>5} {name[:26]:<26} | " + " | ".join(notes))
        time.sleep(0.06)

    print(f"\n  addresses upgraded: {addr_fix}")
    print(f"  cities corrected  : {city_fix}")
    if not stmts:
        print("nothing to do")
        return
    if a.dry_run:
        print(f"\n(dry run — {len(stmts)} statements not executed)")
        return
    r = subprocess.run(["ssh", SERVER, f"mysql playpbnow -e {json.dumps(';'.join(stmts) + ';')}"],
                       capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"✗ {r.stderr.strip()}")
    print(f"\n✓ {len(stmts)} courts updated")


if __name__ == '__main__':
    main()
