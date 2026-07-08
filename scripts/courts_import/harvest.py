#!/usr/bin/env python3
"""SoCal pickleball facility harvest via Legacy Google Places (server-side, curl).
Collects candidates, dedups conservatively against 223 existing + new-vs-new,
fetches phone via Place Details, writes candidates.json for review before insert.
NEVER modifies existing rows. Real Places data only."""
import json, subprocess, time, math, re, sys, os

KEY = os.environ["GKEY"]
OUT = "/root/candidates.json"
LOG = sys.stderr

def log(*a):
    print(*a, file=LOG, flush=True)

def curl(url):
    for attempt in range(3):
        try:
            r = subprocess.run(["curl", "-s", url], capture_output=True, text=True, timeout=30)
            return json.loads(r.stdout)
        except Exception as e:
            log("  curl retry", attempt, e)
            time.sleep(2)
    return {}

def haversine(a, b, c, d):
    R = 6371000.0
    p1, p2 = math.radians(a), math.radians(c)
    dphi = math.radians(c - a)
    dl = math.radians(d - b)
    x = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(x))

STOP = {"park","community","pickleball","court","courts","the","city","of","and",
        "recreation","center","club","sports","complex","regional","municipal",
        "at","tennis","rec","area","field","fields","ymca","aquatic","athletic"}

def norm_tokens(name):
    words = re.sub(r"[^a-z0-9 ]", " ", (name or "").lower()).split()
    return set(w for w in words if w not in STOP and len(w) > 2)

def name_similar(n1, n2):
    t1, t2 = norm_tokens(n1), norm_tokens(n2)
    if not t1 or not t2:
        return False
    inter = t1 & t2
    # conservative: any meaningful shared token, or substring
    if inter:
        return True
    a = re.sub(r"[^a-z0-9]", "", (n1 or "").lower())
    b = re.sub(r"[^a-z0-9]", "", (n2 or "").lower())
    return bool(a) and bool(b) and (a in b or b in a)

# --- load existing courts ---
existing = []
with open("/root/existing_courts.tsv") as f:
    for line in f:
        parts = line.rstrip("\n").split("\t")
        if len(parts) < 4:
            continue
        _id, name, lat, lng = parts[0], parts[1], parts[2], parts[3]
        try:
            existing.append((name, float(lat), float(lng)))
        except ValueError:
            continue
log(f"Loaded {len(existing)} existing courts")

# --- city -> county map (all 7 SoCal counties) ---
COUNTIES = {
 "Los Angeles County": ["Los Angeles","Long Beach","Santa Clarita","Glendale","Lancaster","Palmdale","Pomona","Torrance","Pasadena","El Monte","Downey","Inglewood","West Covina","Norwalk","Burbank","Compton","South Gate","Carson","Santa Monica","Hawthorne","Whittier","Alhambra","Lakewood","Bellflower","Baldwin Park","Lynwood","Redondo Beach","Pico Rivera","Montebello","Monterey Park","Gardena","Huntington Park","Arcadia","Diamond Bar","Paramount","Rosemead","Cerritos","Covina","Azusa","La Mirada","Rancho Palos Verdes","Glendora","Culver City","San Gabriel","Bell Gardens","Manhattan Beach","West Hollywood","Beverly Hills","San Dimas","Temple City","Walnut","Lawndale","Claremont","Monrovia","Duarte","Hermosa Beach","El Segundo","La Puente","South Pasadena","San Fernando","La Verne","Calabasas","La Canada Flintridge","Lomita","Signal Hill","Artesia","Agoura Hills","San Marino","Malibu","Sierra Madre","Westlake Village","Santa Fe Springs","Rolling Hills Estates"],
 "Orange County": ["Anaheim","Santa Ana","Irvine","Huntington Beach","Garden Grove","Orange","Fullerton","Costa Mesa","Mission Viejo","Westminster","Newport Beach","Buena Park","Lake Forest","Tustin","Yorba Linda","San Clemente","Laguna Niguel","La Habra","Fountain Valley","Placentia","Rancho Santa Margarita","Aliso Viejo","Cypress","Brea","Stanton","Dana Point","Laguna Hills","San Juan Capistrano","Los Alamitos","Seal Beach","La Palma","Laguna Beach","Laguna Woods","Villa Park","Ladera Ranch"],
 "San Diego County": ["San Diego","Chula Vista","Oceanside","Escondido","Carlsbad","El Cajon","Vista","San Marcos","Encinitas","National City","La Mesa","Santee","Poway","Coronado","Imperial Beach","Lemon Grove","Solana Beach","Del Mar","La Jolla","Rancho Bernardo","Ramona","Fallbrook"],
 "Riverside County": ["Riverside","Moreno Valley","Corona","Murrieta","Temecula","Jurupa Valley","Menifee","Hemet","Indio","Perris","Eastvale","Cathedral City","Palm Desert","Lake Elsinore","Palm Springs","San Jacinto","Beaumont","Coachella","La Quinta","Wildomar","Banning","Norco","Desert Hot Springs","Rancho Mirage","Canyon Lake","Blythe","Calimesa","Indian Wells"],
 "San Bernardino County": ["San Bernardino","Fontana","Rancho Cucamonga","Ontario","Victorville","Rialto","Hesperia","Chino","Chino Hills","Upland","Apple Valley","Redlands","Highland","Colton","Yucaipa","Montclair","Adelanto","Twentynine Palms","Loma Linda","Barstow","Yucca Valley","Grand Terrace","Big Bear Lake"],
 "Ventura County": ["Oxnard","Thousand Oaks","Simi Valley","Ventura","Camarillo","Moorpark","Santa Paula","Port Hueneme","Fillmore","Ojai"],
 "Imperial County": ["El Centro","Calexico","Brawley","Imperial","Holtville","Westmorland","Calipatria"],
}
city_county = {}
for cty, cities in COUNTIES.items():
    for c in cities:
        city_county[c.lower()] = cty

def county_from_address(addr, fallback):
    # extract "..., <City>, CA <zip>" -> city
    m = re.search(r",\s*([A-Za-z .'-]+),\s*CA\s*\d{5}", addr or "")
    if m:
        c = m.group(1).strip().lower()
        if c in city_county:
            return city_county[c], m.group(1).strip()
    return fallback, None

# --- harvest ---
seen_place_ids = set()
candidates = {}  # place_id -> record
total_raw = 0
ts_calls = 0

for county, cities in COUNTIES.items():
    for city in cities:
        query = f"pickleball courts in {city} CA".replace(" ", "+")
        url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query={query}&key={KEY}"
        page = 0
        while True:
            data = curl(url)
            ts_calls += 1
            status = data.get("status")
            if status not in ("OK", "ZERO_RESULTS"):
                log(f"  [{city}] status={status} {data.get('error_message','')}")
            for r in data.get("results", []):
                total_raw += 1
                pid = r.get("place_id")
                name = r.get("name")
                addr = r.get("formatted_address")
                geo = (r.get("geometry") or {}).get("location") or {}
                lat, lng = geo.get("lat"), geo.get("lng")
                if not (pid and name and addr and lat is not None and lng is not None):
                    continue
                if pid in seen_place_ids:
                    continue
                seen_place_ids.add(pid)
                cty, acity = county_from_address(addr, county)
                candidates[pid] = {
                    "place_id": pid, "name": name, "address": addr,
                    "lat": lat, "lng": lng, "county": cty,
                    "city": acity or city, "query_city": city,
                    "types": r.get("types", []),
                }
            token = data.get("next_page_token")
            page += 1
            if token and page < 3:
                time.sleep(2)  # token needs to activate
                url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken={token}&key={KEY}"
            else:
                break
        log(f"[{county[:3]}] {city}: running unique={len(candidates)} raw={total_raw} ts_calls={ts_calls}")

log(f"\n=== Harvest done: {total_raw} raw, {len(candidates)} unique place_ids, {ts_calls} textsearch calls ===")

# --- dedup vs existing ---
kept = []
dropped_existing = []
for pid, c in candidates.items():
    is_dup = False
    reason = None
    for (en, elat, elng) in existing:
        dist = haversine(c["lat"], c["lng"], elat, elng)
        if dist < 250:
            is_dup, reason = True, f"<250m from existing '{en}' ({int(dist)}m)"
            break
        if dist < 1500 and name_similar(c["name"], en):
            is_dup, reason = True, f"<1500m+name '{en}' ({int(dist)}m)"
            break
    if is_dup:
        c["drop_reason"] = reason
        dropped_existing.append(c)
    else:
        kept.append(c)

log(f"After existing-dedup: {len(kept)} kept, {len(dropped_existing)} dropped as existing-dups")

# --- dedup new-vs-new (very close + name similar) ---
final = []
dropped_newdup = []
for c in kept:
    dup = False
    for k in final:
        dist = haversine(c["lat"], c["lng"], k["lat"], k["lng"])
        if dist < 200 and name_similar(c["name"], k["name"]):
            dup = True
            c["drop_reason"] = f"new-vs-new '{k['name']}' ({int(dist)}m)"
            break
    if dup:
        dropped_newdup.append(c)
    else:
        final.append(c)

log(f"After new-vs-new dedup: {len(final)} final candidates, {len(dropped_newdup)} dropped")

# --- Place Details for phone ---
for i, c in enumerate(final):
    url = (f"https://maps.googleapis.com/maps/api/place/details/json?place_id={c['place_id']}"
           f"&fields=formatted_phone_number&key={KEY}")
    d = curl(url)
    c["phone"] = ((d.get("result") or {}).get("formatted_phone_number"))
    if i % 25 == 0:
        log(f"  details {i}/{len(final)}")

with_phone = sum(1 for c in final if c.get("phone"))
log(f"Phone fetched: {with_phone}/{len(final)} have a phone")

out = {
    "summary": {
        "raw_results": total_raw,
        "unique_place_ids": len(candidates),
        "textsearch_calls": ts_calls,
        "dropped_existing_dups": len(dropped_existing),
        "dropped_new_dups": len(dropped_newdup),
        "final_candidates": len(final),
        "final_with_phone": with_phone,
    },
    "final": sorted(final, key=lambda x: (x["county"], x["city"], x["name"])),
    "dropped_existing": dropped_existing,
    "dropped_new": dropped_newdup,
}
with open(OUT, "w") as f:
    json.dump(out, f, indent=2)
log(f"\nWrote {OUT}")
print(json.dumps(out["summary"], indent=2))
