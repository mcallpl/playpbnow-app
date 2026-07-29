#!/usr/bin/env python3
"""
Brand-targeted harvest: find new commercial pickleball clubs in SoCal.

    python3 scripts/courts_import/harvest_brands.py            # search + review file
    python3 scripts/courts_import/harvest_brands.py --insert FILE

One Text Search per brand instead of one per city. The full 195-city sweep costs
~600 calls to re-scan 1,300 parks we already hold; this costs ~15 to find the
thing actually being asked about — clubs that have just opened. Purpose-built
franchises are what open new, and they list under a brand name.

Results are written to the review file AFTER EVERY BRAND, so an interrupted run
still leaves usable output. (An earlier full sweep was killed at 350 calls and
produced nothing, because it only wrote at the end.)
"""
import argparse, json, math, re, subprocess, sys, time, urllib.parse

SERVER = "root@64.227.108.128"
TS = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS = "https://maps.googleapis.com/maps/api/place/details/json"
SOCAL = (32.4, 35.9, -121.0, -114.0)

BRANDS = [
    "The Picklr", "Chicken N Pickle", "Pickleball Kingdom", "Ace Pickleball Club",
    "Camp Pickle", "The Dink House", "Bounce Pickleball", "Rally Pickleball",
    "Smash Park pickleball", "Pickle Pop", "PKL Social", "Crush Pickleball",
    "Vessel Pickleball", "Pickleball America", "Dill Dinkers",
]
STOP = {"park","community","pickleball","court","courts","the","city","of","and",
        "recreation","center","club","sports","complex","at","tennis","rec","indoor"}


def sh(c): return subprocess.run(c, capture_output=True, text=True)


def sql(q):
    r = sh(["ssh", SERVER, f"mysql playpbnow -N -e {json.dumps(q)}"])
    if r.returncode:
        sys.exit(f"✗ mysql: {r.stderr.strip()}")
    return [l.split('\t') for l in r.stdout.strip().split('\n') if l.strip()]


def key():
    return sh(["ssh", SERVER, "php -r 'include \"/var/www/html/vault/secrets.php\"; "
                              "echo $vault_google_maps_api_key;'"]).stdout.strip()


def api(url):
    for _ in range(3):
        r = sh(["curl", "-s", "--max-time", "30", url])
        try:
            return json.loads(r.stdout)
        except json.JSONDecodeError:
            time.sleep(2)
    return {}


def hav(a, b, c, d):
    R = 6371000.0
    return 2 * R * math.asin(math.sqrt(
        math.sin(math.radians(c - a) / 2) ** 2 + math.cos(math.radians(a)) *
        math.cos(math.radians(c)) * math.sin(math.radians(d - b) / 2) ** 2))


def toks(n):
    return {w for w in re.sub(r'[^a-z0-9 ]', ' ', (n or '').lower()).split()
            if w not in STOP and len(w) > 2}


def write(path, news, rejected):
    with open(path, 'w') as fh:
        fh.write("verdict\tbrand\tname\tcity\tcounty\taddress\tlat\tlng\tphone\twebsite\t"
                 "status\tplace_id\tnote\n")
        for c in news:
            fh.write("\t".join([str(x) for x in (
                'NEW', c['brand'], c['name'], c.get('city', ''), c.get('county', ''),
                c['address'], c['lat'], c['lng'], c.get('phone', ''),
                c.get('website', ''), c.get('status', ''), c['place_id'], '')]) + "\n")
        for c, why in rejected:
            fh.write("\t".join([str(x) for x in (
                'rejected', c.get('brand', ''), c['name'], '', '', c['address'],
                c['lat'], c['lng'], '', '', '', c['place_id'], why)]) + "\n")


def county_of(lat, lng, api_key):
    d = api(f"https://maps.googleapis.com/maps/api/geocode/json?"
            f"{urllib.parse.urlencode({'latlng': f'{lat},{lng}', 'key': api_key})}")
    county = city = ''
    for r in d.get('results', []):
        for comp in r.get('address_components', []):
            t = comp.get('types', [])
            if 'administrative_area_level_2' in t and not county:
                county = comp['long_name']
            if 'locality' in t and not city:
                city = comp['long_name']
    return county, city


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--insert')
    ap.add_argument('-o', '--out', default='/Users/chipmcallister/Desktop/PlayPBNow-new-clubs.tsv')
    a = ap.parse_args()
    if a.insert:
        return insert(a.insert)

    api_key = key()
    rows = sql("SELECT name,lat,lng,google_place_id FROM courts;")
    have_pid = {r[3] for r in rows if len(r) > 3 and r[3] not in ('', 'NULL')}
    have_geo = [(r[0], float(r[1]), float(r[2])) for r in rows
                if len(r) > 2 and r[1] not in ('', 'NULL')]
    print(f"▶ {len(rows)} existing courts | {len(BRANDS)} brands ≈ {len(BRANDS)} search calls\n")

    news, rejected, calls, seen = [], [], 0, set()
    for brand in BRANDS:
        d = api(f"{TS}?{urllib.parse.urlencode({'query': f'{brand} Southern California', 'key': api_key})}")
        calls += 1
        hits = 0
        for r in d.get('results', []):
            pid = r.get('place_id')
            geo = (r.get('geometry') or {}).get('location') or {}
            if not pid or pid in seen or geo.get('lat') is None:
                continue
            seen.add(pid)
            lat, lng = geo['lat'], geo['lng']
            c = {'brand': brand, 'place_id': pid, 'name': r.get('name', ''),
                 'address': r.get('formatted_address', ''), 'lat': lat, 'lng': lng}
            if not (SOCAL[0] <= lat <= SOCAL[1] and SOCAL[2] <= lng <= SOCAL[3]):
                rejected.append((c, 'outside SoCal')); continue
            if pid in have_pid:
                rejected.append((c, 'already in courts (place id)')); continue
            near = next(((nm, int(hav(lat, lng, e1, e2))) for nm, e1, e2 in have_geo
                         if hav(lat, lng, e1, e2) < 250 or
                         (hav(lat, lng, e1, e2) < 1500 and toks(nm) & toks(c['name']))), None)
            if near:
                rejected.append((c, f'~{near[1]}m from "{near[0][:32]}"')); continue
            news.append(c); hits += 1
        print(f"  {brand:<24} results={len(d.get('results', [])):>2}  new={hits}", flush=True)
        write(a.out, news, rejected)          # checkpoint after every brand

    print(f"\n▶ {calls} search calls | {len(news)} new candidates — fetching details\n")
    for c in news:
        d = api(f"{DETAILS}?{urllib.parse.urlencode({'place_id': c['place_id'], 'fields': 'formatted_phone_number,website,business_status', 'key': api_key})}").get('result', {})
        c['phone'] = d.get('formatted_phone_number', '')
        c['website'] = d.get('website', '')
        c['status'] = d.get('business_status', '')
        c['county'], c['city'] = county_of(c['lat'], c['lng'], api_key)
        calls += 2
        print(f"  {c['name'][:42]:<42} {c.get('city',''):<18} {c.get('phone','')}  [{c.get('status','')}]")
        write(a.out, news, rejected)
        time.sleep(0.08)
    print(f"\n✓ {len(news)} new → {a.out}   (total API calls: {calls})")


def insert(path):
    rows = [l.split('\t') for l in open(path).read().strip().split('\n')[1:]]
    add = [r for r in rows if r and r[0].strip().upper() == 'NEW']
    if not add:
        sys.exit("nothing marked NEW")
    def q(s): return "'" + (s or '').replace("\\", "\\\\").replace("'", "\\'") + "'"
    stmts = ["INSERT INTO courts (name,city,state,county,address,phone,google_place_id,lat,lng,"
             "created_by_device_id,created_at) VALUES "
             f"({q(r[2])},{q(r[3])},'CA',{q(r[4])},{q(r[5])},{q(r[8])},{q(r[11])},"
             f"{float(r[6])},{float(r[7])},'brand_harvest_2026_07_29',NOW())" for r in add]
    r = sh(["ssh", SERVER, f"mysql playpbnow -e {json.dumps(';'.join(stmts) + ';')}"])
    if r.returncode:
        sys.exit(f"✗ {r.stderr.strip()}")
    print(f"✓ inserted {len(add)} clubs")


if __name__ == '__main__':
    main()
