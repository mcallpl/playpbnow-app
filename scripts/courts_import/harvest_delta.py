#!/usr/bin/env python3
"""
Delta harvest: find SoCal pickleball venues that are NOT already in the courts
table, and write them for review. Never inserts.

    python3 scripts/courts_import/harvest_delta.py            # sweep + candidates.tsv
    python3 scripts/courts_import/harvest_delta.py --insert   # insert an approved file

This re-runs the July 2026 sweep over the same 195 cities, so it surfaces venues
Google has listed since. Two things make it a genuine delta rather than a repeat:

  * the existing rows now carry google_place_id, so dedup is EXACT on place id
    instead of the fuzzy name/distance matching the first import had to use
  * a second query template, "indoor pickleball club in <city> CA", catches
    commercial clubs that "pickleball courts in ..." tends to miss — that is the
    shape of listing new franchises appear as

Junk filtering matters: a bare "pickleball" search returns sporting-goods shops,
courthouses (matched on "court"), padel venues and homebuilders. Anything
rejected is written to the review file too, with the reason, rather than being
silently dropped.
"""
import argparse, json, math, os, re, subprocess, sys, time, urllib.parse

SERVER = "root@64.227.108.128"
TS = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS = "https://maps.googleapis.com/maps/api/place/details/json"

COUNTIES = {
 "Los Angeles County": ["Los Angeles","Long Beach","Santa Clarita","Glendale","Lancaster","Palmdale","Pomona","Torrance","Pasadena","El Monte","Downey","Inglewood","West Covina","Norwalk","Burbank","Compton","South Gate","Carson","Santa Monica","Hawthorne","Whittier","Alhambra","Lakewood","Bellflower","Baldwin Park","Lynwood","Redondo Beach","Pico Rivera","Montebello","Monterey Park","Gardena","Huntington Park","Arcadia","Diamond Bar","Paramount","Rosemead","Cerritos","Covina","Azusa","La Mirada","Rancho Palos Verdes","Glendora","Culver City","San Gabriel","Bell Gardens","Manhattan Beach","West Hollywood","Beverly Hills","San Dimas","Temple City","Walnut","Lawndale","Claremont","Monrovia","Duarte","Hermosa Beach","El Segundo","La Puente","South Pasadena","San Fernando","La Verne","Calabasas","La Canada Flintridge","Lomita","Signal Hill","Artesia","Agoura Hills","San Marino","Malibu","Sierra Madre","Westlake Village","Santa Fe Springs","Rolling Hills Estates"],
 "Orange County": ["Anaheim","Santa Ana","Irvine","Huntington Beach","Garden Grove","Orange","Fullerton","Costa Mesa","Mission Viejo","Westminster","Newport Beach","Buena Park","Lake Forest","Tustin","Yorba Linda","San Clemente","Laguna Niguel","La Habra","Fountain Valley","Placentia","Rancho Santa Margarita","Aliso Viejo","Cypress","Brea","Stanton","Dana Point","Laguna Hills","San Juan Capistrano","Los Alamitos","Seal Beach","La Palma","Laguna Beach","Laguna Woods","Villa Park","Ladera Ranch"],
 "San Diego County": ["San Diego","Chula Vista","Oceanside","Escondido","Carlsbad","El Cajon","Vista","San Marcos","Encinitas","National City","La Mesa","Santee","Poway","Coronado","Imperial Beach","Lemon Grove","Solana Beach","Del Mar","La Jolla","Rancho Bernardo","Ramona","Fallbrook"],
 "Riverside County": ["Riverside","Moreno Valley","Corona","Murrieta","Temecula","Jurupa Valley","Menifee","Hemet","Indio","Perris","Eastvale","Cathedral City","Palm Desert","Lake Elsinore","Palm Springs","San Jacinto","Beaumont","Coachella","La Quinta","Wildomar","Banning","Norco","Desert Hot Springs","Rancho Mirage","Canyon Lake","Blythe","Calimesa","Indian Wells"],
 "San Bernardino County": ["San Bernardino","Fontana","Rancho Cucamonga","Ontario","Victorville","Rialto","Hesperia","Chino","Chino Hills","Upland","Apple Valley","Redlands","Highland","Colton","Yucaipa","Montclair","Adelanto","Twentynine Palms","Loma Linda","Barstow","Yucca Valley","Grand Terrace","Big Bear Lake"],
 "Ventura County": ["Oxnard","Thousand Oaks","Simi Valley","Ventura","Camarillo","Moorpark","Santa Paula","Port Hueneme","Fillmore","Ojai"],
 "Imperial County": ["El Centro","Calexico","Brawley","Imperial","Holtville","Westmorland","Calipatria"],
}
QUERIES = ["pickleball courts in {} CA", "indoor pickleball club in {} CA"]

SOCAL = (32.4, 35.9, -121.0, -114.0)          # lat_min, lat_max, lng_min, lng_max
JUNK = re.compile(r'\b(courthouse|superior court|city hall|sporting goods|dick\'s|'
                  r'big 5|academy sports|homes?|realty|real estate|apartments?|'
                  r'storage|dental|insurance|law offices?|padel only)\b', re.I)
JUNK_TYPES = {'clothing_store','shoe_store','store','courthouse','local_government_office',
              'real_estate_agency','lawyer','insurance_agency','dentist','doctor',
              'car_dealer','moving_company','bank','finance'}
STOP = {"park","community","pickleball","court","courts","the","city","of","and",
        "recreation","center","club","sports","complex","regional","municipal",
        "at","tennis","rec","area","field","fields","ymca","aquatic","athletic","indoor"}


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


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
    p1, p2 = math.radians(a), math.radians(c)
    return 2 * R * math.asin(math.sqrt(
        math.sin(math.radians(c - a) / 2) ** 2 +
        math.cos(p1) * math.cos(p2) * math.sin(math.radians(d - b) / 2) ** 2))


def tokens(n):
    return {w for w in re.sub(r'[^a-z0-9 ]', ' ', (n or '').lower()).split()
            if w not in STOP and len(w) > 2}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--insert', metavar='FILE')
    ap.add_argument('-o', '--out', default='/Users/chipmcallister/Desktop/PlayPBNow-new-courts.tsv')
    a = ap.parse_args()
    if a.insert:
        return insert(a.insert)

    api_key = key()
    rows = sql("SELECT id,name,lat,lng,google_place_id FROM courts;")
    have_pid = {r[4] for r in rows if len(r) > 4 and r[4] not in ('', 'NULL')}
    have_geo = [(r[1], float(r[2]), float(r[3])) for r in rows
                if len(r) > 3 and r[2] not in ('', 'NULL')]
    print(f"▶ {len(rows)} existing courts, {len(have_pid)} with a place id\n")

    found, calls, raw = {}, 0, 0
    for county, cities in COUNTIES.items():
        for city in cities:
            for tmpl in QUERIES:
                url = f"{TS}?{urllib.parse.urlencode({'query': tmpl.format(city), 'key': api_key})}"
                page = 0
                while True:
                    d = api(url); calls += 1
                    for r in d.get('results', []):
                        raw += 1
                        pid = r.get('place_id'); geo = (r.get('geometry') or {}).get('location') or {}
                        if not pid or pid in found or geo.get('lat') is None:
                            continue
                        found[pid] = {'place_id': pid, 'name': r.get('name', ''),
                                      'address': r.get('formatted_address', ''),
                                      'lat': geo['lat'], 'lng': geo['lng'],
                                      'types': r.get('types', []), 'county': county,
                                      'query_city': city}
                    tok = d.get('next_page_token'); page += 1
                    if tok and page < 2:
                        time.sleep(2)
                        url = f"{TS}?{urllib.parse.urlencode({'pagetoken': tok, 'key': api_key})}"
                    else:
                        break
            print(f"  [{county[:3]}] {city:<22} unique={len(found)} raw={raw} calls={calls}", flush=True)

    print(f"\n▶ {raw} raw → {len(found)} unique places, {calls} search calls\n")

    news, rejected = [], []
    for pid, c in found.items():
        lat, lng = c['lat'], c['lng']
        if not (SOCAL[0] <= lat <= SOCAL[1] and SOCAL[2] <= lng <= SOCAL[3]):
            rejected.append((c, 'outside SoCal')); continue
        if pid in have_pid:
            continue                                        # exact match, already have it
        if JUNK.search(c['name']) or (set(c['types']) & JUNK_TYPES):
            rejected.append((c, 'junk name/type')); continue
        near = None
        for nm, elat, elng in have_geo:
            d = hav(lat, lng, elat, elng)
            if d < 250 or (d < 1500 and tokens(nm) & tokens(c['name'])):
                near = (nm, int(d)); break
        if near:
            rejected.append((c, f'~{near[1]}m from existing "{near[0][:30]}"')); continue
        news.append(c)

    print(f"▶ {len(news)} genuinely new, {len(rejected)} rejected — fetching details\n")
    for c in news:
        d = api(f"{DETAILS}?{urllib.parse.urlencode({'place_id': c['place_id'], 'fields': 'formatted_phone_number,website,business_status,address_components', 'key': api_key})}").get('result', {})
        c['phone'] = d.get('formatted_phone_number', '')
        c['website'] = d.get('website', '')
        c['status'] = d.get('business_status', '')
        c['city'] = ''
        for comp in d.get('address_components', []):
            if 'locality' in comp.get('types', []):
                c['city'] = comp['long_name']
        print(f"  {c['name'][:44]:<44} {c['city']:<18} {c['phone']}")
        time.sleep(0.08)

    with open(a.out, 'w') as fh:
        fh.write("verdict\tname\tcity\tcounty\taddress\tlat\tlng\tphone\twebsite\tstatus\tplace_id\tnote\n")
        for c in sorted(news, key=lambda x: (x['county'], x['city'])):
            fh.write("\t".join([ 'NEW', c['name'], c.get('city', ''), c['county'], c['address'],
                                 str(c['lat']), str(c['lng']), c.get('phone', ''),
                                 c.get('website', ''), c.get('status', ''), c['place_id'], '']) + "\n")
        for c, why in rejected:
            fh.write("\t".join(['rejected', c['name'], c.get('query_city', ''), c['county'],
                                c['address'], str(c['lat']), str(c['lng']), '', '', '',
                                c['place_id'], why]) + "\n")
    print(f"\n✓ {len(news)} new → {a.out}")


def insert(path):
    rows = [l.split('\t') for l in open(path).read().strip().split('\n')[1:]]
    add = [r for r in rows if r and r[0].strip().upper() == 'NEW']
    if not add:
        sys.exit("nothing marked NEW")
    def q(s): return "'" + (s or '').replace("\\", "\\\\").replace("'", "\\'") + "'"
    stmts = []
    for r in add:
        stmts.append(
            "INSERT INTO courts (name,city,state,county,address,phone,google_place_id,"
            "lat,lng,created_by_device_id,created_at) VALUES ("
            f"{q(r[1])},{q(r[2])},'CA',{q(r[3])},{q(r[4])},{q(r[7])},{q(r[10])},"
            f"{float(r[5])},{float(r[6])},'delta_harvest_2026_07_29',NOW())")
    r = sh(["ssh", SERVER, f"mysql playpbnow -e {json.dumps(';'.join(stmts) + ';')}"])
    if r.returncode:
        sys.exit(f"✗ {r.stderr.strip()}")
    print(f"✓ inserted {len(add)} courts")


if __name__ == '__main__':
    main()
