# SoCal Courts Import Pipeline

Populates the `courts` table with real pickleball facilities from Google Places
(Legacy Places API). **Never fabricates data** — users navigate to these.

## Run log — 2026-07-08
- Swept ~195 cities across 7 SoCal counties (LA, OC, SD, Riverside, San Bernardino, Ventura, Imperial).
- 256 Text Search calls → 2,415 raw → 1,654 unique places.
- Conservative dedup vs the 223 pre-existing rows (<250m, or <1.5km + shared name token) dropped 292; new-vs-new dropped 115.
- Quality/junk/region filtering dropped a further 138 (city halls, a courthouse matched on "court", padel/soccer venues, sporting-goods shops, homebuilders, out-of-region same-named cities caught by a SoCal bounding box, ambiguous tennis-only courts).
- **Inserted 1,109 rows** tagged `created_by_device_id='socal_import_2026_07_08'` (reversible with a single DELETE on that marker). Table went 223 → 1,332.
- Additive migration first: added nullable `phone VARCHAR(30)` and `google_place_id VARCHAR(255)`. Existing 223 rows untouched.

## Requirements
- Legacy Google Places API (New Places API is disabled on the project).
- Key: `$vault_google_maps_api_key` from `/var/www/html/vault/secrets.php` on the DigitalOcean server.
- Run **server-side** (`64.227.108.128`) — local Python's urllib has an SSL cert failure; the script shells out to `curl`, which works there.

## Reproduce
```sh
# on the server
export GKEY=$(php -r 'include "/var/www/html/vault/secrets.php"; echo $vault_google_maps_api_key;')
mysql playpbnow -N -e 'SELECT id,name,lat,lng,city FROM courts;' > /root/existing_courts.tsv
python3 harvest.py            # writes /root/candidates.json (dedup + phone via Place Details)
```
Then review `candidates.json`, build the INSERT (state='CA', county via address→city map,
`created_by_device_id` provenance marker), and load inside a transaction after `mysqldump`-ing the table.

## Cost
~$25–30 on Google billing (256 Text Search + ~1,100 Place Details for phone).
