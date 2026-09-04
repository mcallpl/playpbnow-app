# PlayPBNow - Claude Code Instructions

## Governance Status Page Rule (MANDATORY)
The AIOS Build governance status page is the source of truth Chip and his clients
depend on: https://aiosbuild.peoplestar.com/governance/projects/status?id=10
After ANY change to this project (code, backend, schema, deploy, file removal),
the status page MUST be re-synced so it reflects the new reality — never leave it
showing a stale scan. Same weight as the End-of-Session git rule below.

**How to sync it (AIOS Build lives on OUR server, /var/www/html/aiosbuild; project id=10 = PlayPBNow):**
1. Push the current code to a scan tree on the server (repo structure, so finding
   paths read `playpbnow-api/…` like the page expects):
   `rsync -az --delete --exclude node_modules --exclude ios --exclude android --exclude .git --exclude .expo --exclude dist ./ root@64.227.108.128:/tmp/pbn_scan/`
2. Re-run AIOS Build's OWN scanner and save it to the live page:
   `ssh root@64.227.108.128 'cd /var/www/html/aiosbuild && php bin/aios-status.php --save-scan --project=10 --path=/tmp/pbn_scan'`
3. Verify in the browser (the page is access-gated — server-side curl gets a 302).
NEVER hand-edit the scan/grade — always regenerate from the real scanner so the page
stays honest ("proof, not promises"). Scanner patterns: shell_exec/exec is cleared
only when `escapeshellarg`/`escapeshellcmd` is on the SAME line; `ADD COLUMN IF [NOT]
EXISTS` = MySQL-8 medium; `TODO/FIXME/HACK/XXX` = info. See [[aios-governance-status-page]].

## End-of-Session Rule
Before ending any conversation where code was changed, ALWAYS:
1. `git add` all relevant changes
2. Commit with a descriptive message
3. `git push` to GitHub
Never leave uncommitted or unpushed work behind.

---

# LOCKED BY THE FULL-APP UAT PASS — 2026-09-04

Everything in this section was found broken (or dangerously ambiguous) during a
complete router-to-tutor UAT, was fixed, and was verified. **Treat every line as
a regression test.** Nothing here may be quietly reverted; if a future change
genuinely conflicts with one of these, say so and ask Chip — do not resolve it
by undoing the fix. This section is APPEND-ONLY, like the rest of this file.

## Deploy ORDER is load-bearing

Several write endpoints now require a Bearer session. A client that does not
send one gets a 401. Therefore:

**1. client (web export + `eas update`) → 2. API (`./deploy-api.sh`) → 3. verify**

Deploying the API first would break "add players to group", player edit/delete
and other writes for everyone still on the previously shipped bundle.
`runtimeVersion.policy` is `appVersion`, so an OTA built from this tree reaches
the store build of the same version — that is what closes the window.

## Data integrity (silent-corruption class — the worst kind)

- **Group lookups by NAME must always be owner-scoped** (`name` + `owner_user_id`
  + `_deleted_at IS NULL`). `save_scores.php` once matched on name alone. Every
  new account is seeded with a group called "Test Group", so a new user's very
  first saved match attached to *a stranger's* group row and then vanished from
  their Rankings ("No data found") while being invisible to the other owner too.
  Same trap in `update_match.php` and `delete_session.php`.
- **A comment must NEVER be placed inside a SQL string.** One pasted into the
  `INSERT INTO users` statement in `email_login.php` made **every single
  registration fail** with a SQL syntax error. Nothing in the UI said why.
- **A tie is neither a win nor a loss**, everywhere: `save_scores.php`,
  `get_leaderboard.php`, `useHeadToHead.ts`. Leaderboards previously recorded a
  tie as a loss for all four players.
- **Leaderboard stats key on the player KEY, not the display name.** Keying on
  name merged two different people who share a first name.
- Editing or deleting a match or session **must** recalculate player records —
  use `pbnow_recalc_player_stats()` in `db_config.php`.
- Two devices finishing one shared match must produce **one** session:
  `save_scores.php` returns `already_exists` when the collab session is
  finished. Without it both devices saved and every player's W/L doubled.

## Match creation and scheduling

- `generate_schedule.php` **must never return `status: success` with an empty
  schedule.** It raises the pairing-repeat cap progressively and, if it truly
  cannot build, returns `status: error` with a plain-English reason. Before
  this, **4 players (2 men + 2 women) with the default 6 rounds — two couples,
  the most ordinary group there is — produced a blank screen** reading "No
  Matches Generated" with no explanation.
- **Sit-outs are chosen by lowest overall sit count**, gender only as a
  tiebreak. The old gender-ratio split meant that with 5 players (3M/2F) **the
  two women never sat out at all**, and with 6 players (4M/2F) each woman sat 3
  rounds of 6.
- Courts are user-settable; games per round = `min(floor(players/4), courts)`.
- **A "Mixed" round must never contain a same-gender team.** Letting the
  organiser cap courts meant the schedule also had to choose *who* plays, and
  the sit-out chooser was blind to gender — 16 players on 2 courts produced
  EIGHT same-gender teams inside rounds labelled "MIXED DOUBLES".
  `chooseSittersForMixed()` now keeps the players on court evenly split. It
  deliberately stands down when one gender has no spare player, because forcing
  a balanced court there would pin that gender on court every round and make
  the other gender absorb every sit-out (the H2 unfairness). Covered by the
  regression test.
- `round_configs` accepts **both** `{"type":"mixed"}` and a bare `"mixed"`
  string. A string used to fall through to "mixer" silently, so the round was
  labelled Mixed while same-gender teams were allowed.
- Regression test — **must stay green**:
  `php playpbnow-api/tests/schedule_balance_test.php` (136 checks). It asserts,
  for 4/5/6/7/8/9/12/16 players: the requested number of rounds is produced, no
  player appears twice in a round, and `max(sits) - min(sits) <= 1`.
- Only the **host** may change a shared match's schedule. A collaborator's local
  shuffle used to desync both devices silently, because scores are keyed by
  round/court index.
- A host shuffle **clears server scores** (`reset_scores`), or the old scores
  reappear on the new pairings within one poll.

## Auth, session and subscription

- **One sign-out path: `signOut()` in `hooks/useAuth.ts`.** It revokes the
  server session (`logout.php`), clears storage, **preserves the theme choice**,
  clears the cached Bearer token, and logs RevenueCat out. Screens used to call
  `AsyncStorage.clear()` themselves and never reset the in-memory token, so a
  stale token was still sent from the login screen and the previous user's
  cached groups showed to the next account. Every logout confirms first.
- All client API calls go to **`https://playpbnow.com/api`**. The interceptor
  recognises the legacy `peoplestar.com/PlayPBNow/api` too, so nothing regresses.
- Write endpoints take the user from the **Bearer session**, never from a body
  `user_id`. `check_phone.php` once let anyone overwrite any user's phone
  number — and the phone is what password reset uses.
- **The wire field `isPro` still means "paid OR trialling"** because the shipped
  build gates its features on it. Two fields were ADDED beside it: `hasAccess`
  (gate features) and `isPaid` (gate purchase UI). Do not repurpose `isPro`.
- **A trial user must always be able to buy.** The paywall used to tell them
  "You're a Pro member" and hide the buttons, so the only way to subscribe was
  to let the trial lapse.
- **There is no Stripe checkout endpoint on the web.** The web paywall says so
  plainly instead of failing with "Network error".
- `revenuecat_webhook.php` was **completely unauthenticated** — its check ran
  before the config was loaded and looked for a constant that did not exist, so
  anyone could grant any account a subscription that never expires. It now
  verifies a Bearer secret **as soon as `$vault_revenuecat_webhook_secret`
  exists in the vault**, and logs loudly until then. **ACTION FOR CHIP:** add
  that secret to `/var/www/html/vault/secrets.php` and set the same
  `Bearer <value>` in the RevenueCat dashboard webhook. It is deliberately not
  fail-closed yet only because closing it today would stop real purchases.
- PhoneGate is **skippable** and its copy is honest. It used to be an
  inescapable modal: if the number belonged to another account there was no way
  out, on every launch, forever — while the signup form called phone "Optional".

## Beacons

- Lobby creation is **idempotent and owner-only**. A responder tapping "Fill
  This Spot" used to *create their own new lobby* and sit in it alone, so the
  two people never met. This was the core "Spot To Fill" flow.
- `target_players` **includes the host**. With the old off-by-one the default
  1-spot beacon was full the instant it was created and nobody could ever join.
- Members can leave (`beacon_leave_lobby.php`); cancelling a beacon cascades to
  its lobbies. Nothing used to release a seat, so a departed player blocked
  "Lock Match" permanently and every player's reliability read 0% forever.
- Lobby state is persisted and **resumed on focus** (owner-resume / self-heal).
  Switching tabs used to freeze a lobby until you left and re-entered.
- The server emits **ISO-8601 dates plus `expires_in_sec`**; the client never
  calls `new Date()` on a raw `YYYY-MM-DD HH:MM:SS` string. Safari and every
  iOS browser return `Invalid Date` for that format, which hid **every** beacon.
- Never tell a user to "log out and log back in". Say exactly what is missing
  and offer the fix in place.
- Do not claim players "will be notified" — there is no push. They see the
  beacon when they open Play Now.

## Invitations

The tab stays **hidden** (`href: null`) — that was Chip's deliberate call on
2026-08-02 and re-enabling it is his decision, not a cleanup task. The machinery
behind it was repaired anyway, because the RSVP and signup pages are live today:

- The waitlist is honest: a wait-listed player is never told "You're In!".
- Seats decrement **atomically**; a wait-listed player declining no longer
  promotes someone into a seat that was never freed (it over-booked the court).
- Credits: **reserve → record → send → refund on failure.** The old order could
  charge for an invite that was never delivered, or send free ones.
- The pool directory requires a session — it was an open dump of every pool
  member's name and phone number.
- All server-supplied text on the RSVP page is **escaped** (it was a stored XSS
  vector via the organizer's message).

## UX rules the owner asked for by name

- **No unlabeled controls.** The game header carries SCORE / LIVE / SHUFFLE
  labels; Match Setup explains Mixed vs Gender vs Mixer; the courts stepper is
  visible. A scoring switch the user has to guess at is a defect.
- **Empty states say what to do next**, never just "No data found."
- **Help ("the tutor") describes only what exists.** It previously taught a
  Players tab, a Game tab, an Invites tab, group roles, photos, a 3-day trial
  and hard-coded prices — none of which are real. Tabs are exactly
  **GROUPS · PLAY NOW · RANKINGS · HELP** (+ LIVE during a match, + ADMIN for
  admins). Never hard-code a subscription price; the store supplies it.
- The trial is **30 days and starts with the first saved match**, not at signup.
- One support address everywhere: **mcallpl@gmail.com**, as a tappable mailto.

## Known item awaiting Chip's decision

`app/\(tabs\)/help.tsx` — a directory whose name is literally `\(tabs\)`,
created by a shell-escaping mistake on 2026-06-18 and committed. It is a stale
duplicate of the real Help screen and expo-router registers it as a malformed
`//help` route, shipping a second copy of the screen in every bundle. **It was
left in place** because deleting it would violate the ADDITIVE ONLY rule.
Removing it is a one-line `git rm` whenever Chip says so.

## UAT account

`uat.claude@playpbnow.com` (user id 88) is a synthetic tester created during
this pass, with a fictional phone number. Safe to delete at any time.
