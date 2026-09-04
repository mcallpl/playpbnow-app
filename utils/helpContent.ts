export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  content: string;
  searchKeywords: string[];
}

/**
 * The Help tab is "the tutor": it must describe the app exactly as it is.
 *
 * Every topic below was rewritten against the real screens (groups.tsx, the
 * setup flow, game.tsx, leaderboard.tsx, playnow.tsx, roster.tsx, login.tsx,
 * the Settings modal and the subscription/trial code). Rules for editing:
 *   - Only describe a button, label or flow that exists on screen today.
 *   - Use the on-screen wording (NEW GROUP, CREATE MATCH, FINISH MATCH …).
 *   - Never hard-code a price — prices come from the App Store / Google Play.
 *   - Tabs are exactly GROUPS · PLAY NOW · RANKINGS · HELP, plus LIVE while a
 *     match is active and ADMIN for administrators. The Invites tab is hidden
 *     by owner decision, so invitations are described as paused.
 *   - Topic ids are stable: help.tsx keys the Delete My Account button off
 *     'account-deletion', and searches/related links rely on the rest.
 */
export const HELP_TOPICS: HelpTopic[] = [
  // ============================================================================
  // MATCH CREATION & PLAYING
  // ============================================================================
  {
    id: 'create-match',
    title: 'How to Create a Match',
    category: 'Match Management',
    searchKeywords: ['create', 'match', 'new', 'start', 'game', 'tournament', 'rounds', 'rotating', 'fixed teams', 'courts', 'generate'],
    content: `Matches are created from a group's roster.

1. **Open a Group**
   - Go to the **GROUPS** tab and tap a group card
   - The roster screen opens with the group name at the top

2. **Choose a Format** (the two buttons under the player chips)
   - **ROTATING PARTNERS** — everyone rotates; you play with and against different people each round
   - **FIXED TEAMS** — players are paired in roster order (Team 1 = the first two players, and so on). Use the ▲ ▼ arrows or drag a row to change the pairings. Fixed Teams needs an even number of players.

3. **Check the Roster**
   - You need at least **4 players**
   - Add anyone missing with the "Search or add player..." box (see "How to Set Up Your Players")

4. **Tap CREATE MATCH**
   - The **MATCH SETUP** window opens
   - Rotating Partners: set **ROUNDS** with the − / + buttons, then pick a type for each round — **MIXED** (each team is one man and one woman), **GENDER** (men play men, women play women) or **MIXER** (anyone with anyone). The window also shows how many courts the round uses; if fewer courts are free, lower the count and extra players sit that round.
   - Fixed Teams: the window lists the team pairings and how many rounds and games the round-robin will take

5. **Tap GENERATE MATCH**
   - The schedule screen opens with every round and every game laid out
   - Nothing is saved yet — saving happens when you **FINISH MATCH** (see "How to Score a Match")

**Quick Match without a group:** open **ALL PLAYERS**, tap **SELECT**, pick 4 or more players and tap **CREATE MATCH NOW**. The match is set up as "Quick Match".

**Tip:** Not happy with the matchups? Tap the shuffle icon at the top of the schedule to generate a fresh set.`,
  },

  {
    id: 'live-scoring',
    title: 'How to Score a Match',
    category: 'Match Management',
    searchKeywords: ['scoring', 'score', 'enter', 'points', 'game', 'match', 'finish', 'save', 'play to', 'swap', 'rename', 'shuffle', 'tournament', 'playoffs'],
    content: `Scoring happens on the schedule screen that opens after GENERATE MATCH.

**The controls at the top**
- **PLAY TO:** — the target score for every game (11 by default; type 15 or 21 if that is how you play)
- **Lightning bolt** — shared scoring: create a live match or join one with a code (see "Collaborative Scoring")
- **Shuffle icon** — regenerates all the matchups. Any scores already entered are cleared, so the app asks first.
- **Score switch** — turns scoring on. Score boxes appear next to every team.

**Entering scores**
- Tap the score box beside each team and type the final score
- Once a game has a score, the round is locked for swapping

**Fixing a matchup before play**
- Tap one player, then tap another player anywhere in that round to **swap** them
- **Long-press** a name to rename that player for this match
- Need someone who is not on the schedule? Tap **ADD PLAYER**, search or type a name, then shuffle to include them. Players who sit a round are listed under **BYES**.

**Tournament mode** (round robin → playoffs)
- With scoring on, flip the **TOURNAMENT** switch
- Score every round-robin game, then tap **START PLAYOFFS** — the app needs at least 8 players (Rotating) or 4 teams (Fixed Teams) with scores
- Semifinals are #1 vs #4 and #2 vs #3. Score them, tap **GENERATE FINALS**, score the final, then **FINISH TOURNAMENT**

**Finishing and saving**
1. Tap **FINISH MATCH** (or FINISH TOURNAMENT) at the bottom
2. The **SAVE MATCH RESULTS** window asks for a Match Title, a Court / Location and the date and time
3. Tap **CONFIRM SAVE** — results go to the **RANKINGS** tab immediately
4. If nothing changed since the last save, the app tells you it is "Already Saved"

**Note:** Your first saved match starts your 30-day Pro trial — as does creating your first shared live match (see "What is PlayPBNow Pro?").`,
  },

  {
    id: 'collaborative-scoring',
    title: 'Collaborative Scoring (Real-Time)',
    category: 'Match Management',
    searchKeywords: ['collaborate', 'live', 'realtime', 'real-time', 'share', 'code', 'join', 'sync', 'connected', 'shared scoring'],
    content: `Everyone at the court can score from their own phone.

**Start a shared match (the organizer)**
1. On the schedule screen tap the **lightning bolt** at the top
2. Choose **Create Shared Match**
3. The **SHARE LIVE MATCH** window shows a 6-letter **Share Code**. Tap the button under it — it reads **SHARE CODE** on the phone app (it opens your share sheet) and **COPY** in a web browser.
4. A green **LIVE — Code: XXXXXX** bar appears under the controls, with a count of how many people are connected

**Join a shared match (everyone else)**
- From the **GROUPS** tab tap the **lightning bolt** in the header, or on the schedule screen tap the lightning bolt and choose **Join Match**
- Enter the 6-letter code and tap **JOIN MATCH**
- The **LIVE** tab appears at the bottom while the match is active. It shows the live schedule and scores, and **EDIT SCORES** lets you enter results.

**While it is live**
- Scores typed on any connected phone show up on all of them
- The organizer's shuffles and swaps are pushed to everyone
- Either the organizer or a joiner can **FINISH MATCH** and save the results

**If you lose connection**
- The app reconnects on its own; reopen the LIVE tab to catch up
- The organizer can reopen their own match from the LIVE tab at any time`,
  },

  {
    id: 'match-sharing',
    title: 'Share & Report Match Results',
    category: 'Match Management',
    searchKeywords: ['share', 'report', 'result', 'text match', 'hd report', 'image', 'watermark', 'schedule'],
    content: `**TEXT MATCH** turns the schedule into an image you can send to the group.

1. On the schedule screen tap **TEXT MATCH** at the bottom
2. The **GENERATE HD REPORT** window opens with a preview
3. Fill in the **Match Title**, choose a **Court / Location** and set the **Date & Time**
4. Tap **REFRESH PREVIEW** if you changed anything
5. Tap **SHARE NOW** — the report goes out through your phone's share sheet (Messages, WhatsApp, email, and so on)

**Free vs Pro**
- Free accounts get a "FREE — Reports include watermark" badge on the report
- Pro and trial accounts get a clean, watermark-free report

**Tip:** Send the report before play starts so everyone knows their court and partner, then send it again with the scores after you save.`,
  },

  // ============================================================================
  // BEACONS (PLAY NOW TAB)
  // ============================================================================
  {
    id: 'beacons-intro',
    title: 'What Are Beacons?',
    category: 'Beacons',
    searchKeywords: ['beacon', 'what', 'looking', 'need', 'players', 'play now', 'nearby', 'court'],
    content: `A beacon tells other PlayPBNow players "I'm at this court and I want to play."

**Where they live:** the **PLAY NOW** tab. It lists every active beacon near you as a map card with the court, who posted it, their message and how long it has left. Tap a card to open it.

**Two kinds of beacon**
1. **More Info (Casual)** — "I'm already at the court. Looking for people to come play!" Anyone can reply **On My Way!** and chat.
2. **A Real Spot To Fill (Guaranteed Game)** — you need a set number of spots filled. Players claim a spot, you lock the match, the app builds a schedule and you start.

**How long a beacon lasts**
- You pick the duration when you create it: **30 min**, **1 hour** or **2 hours**
- Tap **Extend** on your own beacon to add +30 min, +1 hour or +2 hours
- **Delete** removes it early

**How people find out**
- There are no push notifications yet. Players see your beacon when they open the PLAY NOW tab, so post it and give it a few minutes.
- Location Services must be on to see beacons near you — the tab shows a warning if they are off

**What you need first**
- A verified phone number on your account
- A first name on your profile (the app asks for it the first time you post or respond)`,
  },

  {
    id: 'create-beacon',
    title: 'How to Activate a Beacon',
    category: 'Beacons',
    searchKeywords: ['beacon', 'activate', 'create', 'post', 'need', 'go live', 'spot to fill', 'casual', 'lobby', 'lock match'],
    content: `1. **Go to the PLAY NOW tab** and tap **Create Beacon**

2. **Pick the kind of beacon**
   - **More Info** — casual: you are at the court, come play
   - **A Real Spot To Fill** — you need specific spots filled and want a locked, scheduled game

**Casual beacon**
1. **Select Court** — search the court list and tap yours
2. **Message (optional)** — e.g. "Courts are open, come play!"
3. **How long will you be here?** — 30 min, 1 hour or 2 hours
4. Tap **I'm Here — Come Play!**
Your beacon goes on the map. Players who respond appear in the beacon's chat.

**A Real Spot To Fill**
1. **Select Court**
2. **Spots To Fill** — how many players you still need
3. **Skill Level (optional)** — e.g. 3.0-3.5
4. **Message (optional)**
5. **Duration** — 30 min, 1 hour or 2 hours
6. Tap **Go Live**
You land in the **Lobby**. As players tap **Fill This Spot** they appear in the Players list. When you have enough, tap **Lock Match**. The **Match Preview** shows the schedule and a Match Quality score; tap **Start Match** to begin.

**Managing your beacon**
- Open it from the PLAY NOW list to **Extend** or **Delete** it
- **Open Lobby** takes you back to a structured beacon's lobby
- **Leave Lobby** at the top left backs out without deleting the beacon`,
  },

  {
    id: 'respond-beacon',
    title: 'How to Respond to a Beacon',
    category: 'Beacons',
    searchKeywords: ['beacon', 'respond', 'on my way', 'fill this spot', 'join', 'play', 'find', 'confirm', "can't make it"],
    content: `1. **Open the PLAY NOW tab** — active beacons near you are listed as map cards
2. **Tap a card** to see the court, the message, the skill level and the time left. **Get Directions** opens the court in your maps app.

**Casual beacon ("More Info")**
- Tap **On My Way!** — the button changes to "I'm Going!"
- Use the chat to coordinate. Quick replies like "Be there in 10 min" and "Save me a spot!" are one tap; or type your own message.

**A Real Spot To Fill**
- Tap **Fill This Spot** and confirm. You now hold one of the spots and appear in the organizer's Lobby.
- When the organizer locks the match you are asked to **Confirm**
- Plans changed? Tap **Can't Make It** — the organizer is offered **Find Replacement**. Changed back? Tap **I Can Make It!**

**Before you can respond**
- Your phone number must be verified (the app sends you to Login if it is not)
- The first time, the app asks for your first name in **Complete Your Profile**

**Expired beacons** show a red "This beacon has expired" banner and can no longer be joined.`,
  },

  {
    id: 'beacon-messaging',
    title: 'Beacon Chat & Communication',
    category: 'Beacons',
    searchKeywords: ['beacon', 'chat', 'message', 'talk', 'communicate', 'quick reply'],
    content: `Every beacon has its own chat, open to the person who posted it and everyone who responded.

**Opening the chat**
- Tap a beacon card in the PLAY NOW tab (the card says "Tap to Join or Chat")
- The conversation is below the beacon details

**Sending a message**
- Tap one of the quick-reply chips — "On my way!", "Be there in 20 min", "How many players so far?", "What skill level?", "Need one more!" and more
- Or type in "Type a message..." and send

**What you need**
- A verified phone number and a first name on your profile; the app tells you if either is missing

**Good uses**
- Confirm the exact court number
- Ask about level before you drive over
- Say how many you are bringing

There is no player rating or feedback system — chat is for coordinating the game.`,
  },

  // ============================================================================
  // GROUPS
  // ============================================================================
  {
    id: 'groups-intro',
    title: 'What Are Groups?',
    category: 'Groups',
    searchKeywords: ['group', 'what', 'team', 'roster', 'organization', 'groups tab'],
    content: `A group is a named roster of players tied to a home court — your Tuesday crew, the Friday round-robin, the league night.

**What a group gives you**
- A saved roster you can create matches from in seconds
- A home location that is pre-filled on match reports and saved results
- Rankings that can be filtered to the sessions that group has played

**The GROUPS tab**
- **Your Groups** lists every group with its player count
- Tap a card to open the roster and create a match
- **Pencil** icon — rename the group or change its location
- **Trash** icon — delete the group
- **NEW GROUP** — create one (two steps: pick a location, then name it)
- **ALL PLAYERS** — every player you have ever added, across all groups
- **Lightning bolt** (top right) — join a live match by code
- **Gear** (top right) — Settings

**Limits**
- Free accounts can have **2 groups**; the tab shows "1/2 Groups" so you know where you stand. Pro and trial accounts have no limit.

**Who sees a group:** only you. Groups are private to your account — there are no roles, invitations or public groups.`,
  },

  {
    id: 'create-group',
    title: 'How to Create a Group',
    category: 'Groups',
    searchKeywords: ['create', 'group', 'new', 'team', 'location', 'court', 'new group'],
    content: `1. **Go to the GROUPS tab** and tap **NEW GROUP** at the bottom

2. **SELECT LOCATION**
   - Search the court list and tap your court
   - Not listed? Tap **Add New Location**, enter the Court / Venue Name, City and (optionally) State, then tap **SAVE LOCATION**
   - **BACK** returns to the list

3. **Name the group**
   - Type a name such as "Friday Crew" and save
   - CANCEL backs out without creating anything

4. **Add players**
   - The new group opens on its roster screen
   - Use "Search or add player..." to add people (see "How to Set Up Your Players")
   - Tap **SAVE** at the top right to keep the roster

**Free accounts** can create 2 groups. Trying to add a third opens the Pro upgrade window.

**Tip:** One group per regular session works best — the Rankings session picker then lines up neatly with how you actually play.`,
  },

  {
    id: 'manage-group',
    title: 'How to Manage Your Group',
    category: 'Groups',
    searchKeywords: ['group', 'manage', 'members', 'edit', 'rename', 'delete', 'remove player', 'reorder', 'save'],
    content: `**Rename or move a group**
- On the GROUPS tab tap the **pencil** on the group card
- Change the name and/or pick a different location, then save

**Delete a group**
- Tap the **trash** icon on the card and confirm
- The group disappears from your list. Match results already saved to Rankings are not erased by this.

**Edit the roster** (tap the group card)
- **Add** — "Search or add player..." plus the gender toggle and the + button
- **Edit** — tap the pencil on a player row to change name, gender, cell phone, DUPR rating or home court
- **Remove from this group** — tap the trash on the player row (the player still exists under ALL PLAYERS)
- **Reorder** — use ▲ ▼ or drag the handle; order matters for Fixed Teams pairings
- Tap **SAVE** at the top right when you are done — the button offers **SAVE GROUP**

**Player chips** at the top show the total, and how many men and women are on the roster.

**Start playing:** tap **CREATE MATCH** (see "How to Create a Match").`,
  },

  // ============================================================================
  // PLAYERS
  // ============================================================================
  {
    id: 'players-setup',
    title: 'How to Set Up Your Players',
    category: 'Players',
    searchKeywords: ['player', 'setup', 'create', 'add', 'new player', 'gender', 'phone', 'dupr', 'home court', 'all players'],
    content: `Players are added inside a group, and every player you add is kept under **ALL PLAYERS**.

**Add a player to a group**
1. Open the group from the GROUPS tab
2. Tap the **"Search or add player..."** box and type a name
3. If the person already exists in your account they appear in a dropdown — tap them to add them to this group
4. Otherwise set the **gender toggle** — the coloured button right of the box, showing the ♂ or ♀ symbol; tap it to switch — and tap **+** to create them
5. Tap **SAVE** at the top right to keep the roster

**Edit a player's details**
- On the roster tap the **pencil** on the player row, or open **ALL PLAYERS** and tap the pencil there
- Fields: First Name, Last Name (optional), Phone Number, Gender, Home Court, DUPR Rating (1.00 – 8.00, optional)
- Tap **SAVE CHANGES**

**Why the phone number matters**
- A phone number links the player to a universal identity, so their record can follow them if they play in someone else's group (see "Understanding Player Statistics")
- The number is only visible to you

**ALL PLAYERS** (GROUPS tab → ALL PLAYERS)
- Shows every player with their win-loss record, win % and DUPR if set
- **SELECT** turns on selection mode: pick players, then **ADD TO GROUP** or **CREATE MATCH NOW**
- A yellow banner appears if the app spots duplicate names — see "Merge Duplicate Players"`,
  },

  {
    id: 'player-stats',
    title: 'Understanding Player Statistics',
    category: 'Players',
    searchKeywords: ['stats', 'statistics', 'leaderboard', 'ranking', 'player', 'wins', 'diff', 'win %', 'universal', 'claim', 'qr', 'profile'],
    content: `**What is tracked for every player**
- **Wins** and **Losses** — one per game (each game on the schedule counts, not each session)
- **Win %** — wins divided by games played
- **Diff** — total points scored minus points allowed
- **DUPR** — shown if you entered it on the player; the app does not calculate it

Stats only come from **saved** matches (FINISH MATCH → CONFIRM SAVE). A match you generate but never save does not count.

**Where to see them**
- **RANKINGS** tab — the leaderboard, podium and game history (see "How to View Rankings")
- **ALL PLAYERS** — each row shows W-L and win %
- A group's roster shows W-L · % beside each player once they have played

**Universal player profile (Pro / trial)**
- Every player with a phone number gets a universal record with a claim code in the form **PB-XXXX-XXXX**
- From ALL PLAYERS tap the pencil on the player, then **Share universal profile...** — a player card with a QR code opens
- The player scans it (or goes to https://playpbnow.com/claim.html), enters the mobile number you have for them and types the 6-digit code that is texted to them
- Once claimed, their wins and losses from any organizer's saved matches count toward the same record
- Only the organizer who created the player can share the card`,
  },

  {
    id: 'player-merging',
    title: 'Merge Duplicate Players',
    category: 'Players',
    searchKeywords: ['merge', 'duplicate', 'combine', 'same', 'player', 'not same person', 'review'],
    content: `Two "Mike" entries split one person's record in half. Merging joins them.

**Where:** GROUPS tab → **ALL PLAYERS**. When two or more players share a name, a warning banner shows with a **REVIEW & MERGE** button. Merging is a Pro feature (trial accounts included).

**Review the duplicates**
1. Tap **REVIEW & MERGE** — the **Duplicate Players** window lists each name group
2. Tick the entries that are the same person (there is a **SELECT ALL** per group)
3. Tap the merge button for that group, or merge every selected group at once
4. Tap **Done** when finished

**If they are different people**
- Tap **Not Same Person** on that name group; the app remembers and stops flagging them

**From a single player**
- Open the player (pencil icon) and tap **Merge with duplicate...** — the app finds other players with the same first name and offers to merge them into this one

**What happens on merge**
- All games from the merged entries move to the one you keep
- Wins, losses and diff are recalculated in Rankings
- The extra entries are removed
- **Merging cannot be undone**, so check the phone numbers first`,
  },

  // ============================================================================
  // ACCOUNT & AUTHENTICATION
  // ============================================================================
  {
    id: 'login',
    title: 'How to Log In',
    category: 'Account',
    searchKeywords: ['login', 'sign in', 'password', 'email', 'phone', 'forgot', 'reset'],
    content: `1. **Open the app** — the sign-in screen appears if you are not logged in
2. **Enter your email or phone number** — either one works
3. **Enter your password** and tap **SIGN IN**

You stay signed in on that device until you tap **Log Out** (Settings) or delete the app.

**Forgot your password?**
1. Tap **Forgot Password?**
2. Enter the phone number on your account and tap **SEND CODE**
3. Type the **6-digit code** we text you and tap **VERIFY**
4. Enter and confirm a new password (6+ characters) and tap **RESET PASSWORD**
5. Sign in with the new password

**Phone number required**
- If your account has no phone number, a **Phone Number Required** screen appears after sign-in. Enter it once and you are through. The number is used for password resets and for beacons.

**Trouble signing in**
- The app shows the same generic message for a wrong email/phone or a wrong password — check both
- No code arriving? Confirm the number is a mobile number that can receive texts
- Still stuck? Email mcallpl@gmail.com`,
  },

  {
    id: 'registration',
    title: 'How to Sign Up',
    category: 'Account',
    searchKeywords: ['signup', 'register', 'create', 'account', 'new', 'create account'],
    content: `1. **Open the app** and tap **"Don't have an account? Create one"** under the SIGN IN button

2. **Fill in the form**
   - **FIRST NAME** — required
   - **LAST NAME** — optional
   - **Email address** — required; this is your login
   - **PHONE NUMBER** — optional here, but the app will ask for it right after sign-in (it is needed for password resets and beacons)
   - **PASSWORD** — 6+ characters

3. **Tap CREATE ACCOUNT** — you are signed in straight away

**What you get**
- A free account with up to 2 groups
- A 30-day Pro trial that starts the first time you save a match — not the day you sign up, so you can set up your roster at your own pace

**Next steps**
1. GROUPS tab → **NEW GROUP**
2. Add your regular players
3. **CREATE MATCH**, score it, **FINISH MATCH**
4. Check the **RANKINGS** tab

By creating an account you agree to the Terms of Service (https://playpbnow.com/terms.html) and Privacy Policy (https://playpbnow.com/privacy.html), both linked on the sign-in screen.`,
  },

  {
    id: 'phone-verification',
    title: 'Phone Number & SMS',
    category: 'Account',
    searchKeywords: ['phone', 'verify', 'sms', 'text', 'number', 'code', 'phone number required'],
    content: `**Why the app wants a phone number**
- **Password reset** — the 6-digit reset code is sent by text
- **Play Now beacons** — posting, responding and chatting require a verified number
- **Universal player profiles** — a player claims their record by proving they own the number you have for them

**When you are asked**
- After signing in, if your account has no number, the **Phone Number Required** screen appears. Enter it once.
- Play Now will send you back to Login if the number on file has not been verified

**Text messages you may receive from PlayPBNow**
- Password-reset codes (only when you request one)
- Claim codes for a universal player profile (only when you request one)
- Nothing else — there are no marketing texts and no scheduled notifications

**Changing your number**
- There is no self-service screen for this yet. Email mcallpl@gmail.com from the email on your account and we will update it.

**Match invitations by SMS** are paused for now — see "Match Invitations (currently paused)".`,
  },

  // ============================================================================
  // INVITES — PAUSED (tab hidden by owner decision)
  // ============================================================================
  {
    id: 'invites-intro',
    title: 'Match Invitations (currently paused)',
    category: 'Invites',
    searchKeywords: ['invite', 'invitation', 'what', 'send', 'sms', 'player pool', 'rsvp', 'paused', 'coming soon'],
    content: `**Match invitations are paused.** The Invites tab is hidden while the feature is rebuilt, so there is nothing to tap for it in the app right now.

**What it did, and what is coming back**
- Organizers could browse a pool of players who signed up at https://playpbnow.com/player-signup.html
- An invitation with the court, date and time went out by text; players tapped "I'm In", "Maybe" or "Can't" on a web page without installing the app
- Responses were tracked in the app and SMS credits paid for the texts

**What to do today**
- Post a beacon from the **PLAY NOW** tab — players who open the tab can respond and chat (see "What Are Beacons?")
- Use **TEXT MATCH** on the schedule screen to send the matchups to your group through your own messaging app

Player-pool signups already collected are kept and will be there when invitations return.`,
  },

  {
    id: 'send-invites',
    title: 'How to Send Invites',
    category: 'Invites',
    searchKeywords: ['send', 'invite', 'sms', 'text', 'match', 'paused'],
    content: `**Coming back soon.** Sending invitations is paused and the Invites tab is hidden, so this cannot be done in the app at the moment.

In the meantime, **TEXT MATCH** on the schedule screen shares the matchups through your own messaging app, and a **PLAY NOW** beacon lets nearby players find your game. See "Match Invitations (currently paused)".`,
  },

  {
    id: 'manage-invites',
    title: 'Manage Invites & Responses',
    category: 'Invites',
    searchKeywords: ['manage', 'invite', 'response', 'track', 'status', 'paused'],
    content: `**Coming back soon.** Invitation tracking is paused along with the rest of the Invites tab. Responses to invitations sent before the pause are kept and will show again when the feature returns.

For a game today, post a **PLAY NOW** beacon — it has its own player list and chat. See "Match Invitations (currently paused)".`,
  },

  // ============================================================================
  // RANKINGS
  // ============================================================================
  {
    id: 'leaderboard',
    title: 'How to View Rankings',
    category: 'Leaderboards',
    searchKeywords: ['leaderboard', 'ranking', 'rankings', 'stats', 'compare', 'head to head', 'podium', 'session', 'all time', 'game history', 'edit score', 'delete'],
    content: `The **RANKINGS** tab shows standings from every match you have saved.

**Sorting** — the three buttons under the title
- **WINS** — most game wins first
- **WIN %** — best winning percentage first
- **DIFF** — best point differential (points for minus points against) first

**The podium** — the top three players get the gold, silver and bronze pedestals with their W-L, Diff, DUPR (if entered) and win %. Everyone else is listed below in rank order. In a **Fixed Teams** session the podium shows teams, and tournament placements show as Gold / Silver / Bronze badges.

**ALL TIME or one session**
- The grey bar under the sort buttons names what you are looking at — **ALL TIME ▾** to start with. Tap it to pick something else.
- **ALL TIME** combines every saved match
- Or pick one saved session — the standings switch to that day's games, the **GAME HISTORY** window opens, and the bar changes to that session's name
- Coming straight from a match you just scored, the bar reads **CURRENT SESSION**

**Game history** (open it by picking a session)
- Every game is listed with the two teams and the score, winner highlighted
- **Pencil** — edit that game's scores, then tap the check mark to save. Rankings update.
- **Trash** — delete one game
- **DELETE ENTIRE MATCH** — removes the whole session (only shown for sessions you saved yourself)

**The icons in the header**
- **Home** (top left) — back to the GROUPS tab
- **People** (top right) — head to head
- **Log out** (far right) — signs you out; it asks you to confirm first

**Head to head**
- Tap the **people icon** (top right)
- Select two players to see their record against each other

**Empty list?** Rankings only include saved matches with scores. Turn scoring on, enter scores, tap FINISH MATCH and CONFIRM SAVE.`,
  },

  // ============================================================================
  // ADMIN
  // ============================================================================
  {
    id: 'broadcast',
    title: 'ADMIN Tab (administrators only)',
    category: 'Advanced',
    searchKeywords: ['broadcast', 'admin', 'administrator', 'dashboard', 'announce', 'results'],
    content: `Most people will never see this tab. **ADMIN** appears at the bottom only for PlayPBNow administrator accounts.

**What is in it**
- **Overview**, **Activity** and **Engage** — usage and engagement dashboards
- **Users**, **Players** and **Groups** — account and roster management across the whole app
- **Database** — table browser
- **Quick SMS** — send a text to selected users (administrators only)
- **Broadcast** — publish an announcement page with an optional hero image or video

**If you are not an administrator**
- Nothing is missing from your app — there is no user-facing broadcast feed, and announcements do not appear inside the app
- Questions about the app go to mcallpl@gmail.com`,
  },

  // ============================================================================
  // PREMIUM & SUBSCRIPTION
  // ============================================================================
  {
    id: 'pro-features',
    title: 'What is PlayPBNow Pro?',
    category: 'Premium',
    searchKeywords: ['pro', 'premium', 'subscription', 'cost', 'features', 'trial', 'free', 'limits', 'watermark', 'groups limit'],
    content: `PlayPBNow is free to use. **Pro** removes the limits for organizers who run more than a couple of groups.

**Free**
- Up to **2 groups**
- Unlimited players, matches, live scoring and rankings
- Match reports carry a small PlayPBNow watermark

**Pro** (and the trial)
- **Unlimited groups**
- **Clean, watermark-free** match reports
- **Merge duplicate players**
- **Share universal player profiles** (claim code + QR card)
- Everything else in the app is the same

**The 30-day trial**
- Every new account gets a **30-day Pro trial**
- The clock starts the **first time you save a match** (or create your first shared live match), not when you sign up — so set up your roster first, no rush
- Settings shows "Trial Ends In N days" while it runs; a banner on the GROUPS tab shows when it has ended
- When it ends you drop back to Free; nothing is deleted, but you cannot create more than 2 groups until you upgrade

**Price**
- Monthly and Annual plans. The exact prices are shown in the app on the upgrade screen, set by the App Store or Google Play for your country — see "How to Upgrade to Pro".`,
  },

  {
    id: 'upgrade-to-pro',
    title: 'How to Upgrade to Pro',
    category: 'Premium',
    searchKeywords: ['upgrade', 'buy', 'pro', 'subscribe', 'payment', 'restore', 'manage subscription', 'cancel', 'promo'],
    content: `Pro is bought through the app store on your phone.

**From Settings**
1. **GROUPS** tab → **gear icon** → **SETTINGS**
2. Under **SUBSCRIPTION** tap **Upgrade to Pro** — while your trial is running the same button reads **Subscribe to Pro**
3. Choose **Annual** (marked BEST VALUE) or **Monthly** — the price for your store and country is shown on the button
4. Confirm with Face ID / Touch ID or your Google account. Pro turns on immediately.

**From a limit**
- Creating a third group on a Free account, or tapping the watermark badge on a report, opens the same upgrade window

**On the web app**
- Pro cannot be bought in a browser. The web app says so and points you to the phone app: subscribe on iPhone or Android, and the web app picks up your plan the next time you sign in. **Restore Purchases** is a phone-app button too — it does not appear on the web.

**Already subscribed on another device?**
- Settings → **Restore Purchases** (iPhone / Android app)

**Manage or cancel**
- Settings → **Manage Subscription**. On the phone this opens your App Store or Google Play subscriptions page; cancel there at any time and Pro stays on until the end of the paid period.

**Promo codes** are not redeemable yet. A "Have a promo code?" field is visible in the browser, but there is no web checkout behind it — it just tells you to buy Pro in the app. Ignore it for now.`,
  },

  // ============================================================================
  // NAVIGATION & GENERAL TIPS
  // ============================================================================
  {
    id: 'navigation',
    title: 'App Navigation & Tabs',
    category: 'Getting Started',
    searchKeywords: ['navigate', 'tabs', 'menu', 'how to', 'find', 'where', 'settings', 'gear'],
    content: `**Bottom tabs**, left to right: GROUPS · PLAY NOW · RANKINGS · HELP. That is the whole app. LIVE slots in while a match is running and ADMIN only for administrator accounts.

**GROUPS** — your home base
- Your groups, NEW GROUP, ALL PLAYERS
- Lightning bolt (top right): join a live match by code
- Gear (top right): Settings

**PLAY NOW** — beacons
- See who is at a court near you, post your own beacon, chat
- The icon glows and shows a count when there are beacons near you, and the label turns red while one of your own is live

**LIVE** — appears between PLAY NOW and RANKINGS only while a match is active (one you started, or one you joined by code). It disappears again when the match is finished.

**RANKINGS** — standings and history
- Leaderboard, podium, session picker, game history, head to head

**ADMIN** — a gear icon before HELP, for administrator accounts only

**HELP** — the **i** icon at the far right: this tutor and the how-to videos

**Screens you reach from GROUPS**
- Tap a group → the **roster** (add players, ROTATING PARTNERS / FIXED TEAMS, CREATE MATCH)
- CREATE MATCH → **MATCH SETUP** → GENERATE MATCH → the **schedule and scoring** screen
- ALL PLAYERS → every player, edit, merge, quick match

**Settings** (GROUPS → gear)
- APPEARANCE: **Dark Mode**
- SUBSCRIPTION: Current Plan, Upgrade to Pro / Manage Subscription, Restore Purchases
- ACCOUNT: **Change Password**, **Delete Account**, **Log Out**
- The app version is shown at the bottom

**Getting back**
- The arrow at the top left of the roster and schedule screens returns to GROUPS
- The home icon on RANKINGS does the same`,
  },

  {
    id: 'getting-started',
    title: 'Getting Started - Quick Start Guide',
    category: 'Getting Started',
    searchKeywords: ['getting', 'started', 'first', 'quick', 'start', 'tutorial', 'beginner'],
    content: `Your first session in about five minutes.

**1. Create your account**
- Open the app → "Don't have an account? Create one" → first name, email, password → CREATE ACCOUNT
- Enter your phone number when asked

**2. Make a group**
- GROUPS tab → **NEW GROUP** → pick the court → name it (e.g. "Tuesday Crew")

**3. Add your players**
- Type each name in "Search or add player...", tap the ♂ / ♀ button to set gender, then tap **+**
- Tap **SAVE** at the top right

**4. Create the match**
- Choose **ROTATING PARTNERS** or **FIXED TEAMS**
- **CREATE MATCH** → set rounds and round types → **GENERATE MATCH**

**5. Play and score**
- Flip the score switch, type the scores as games finish
- Tap **TEXT MATCH** to send the matchups to everyone
- Want everyone scoring from their own phone? Tap the lightning bolt → Create Shared Match and share the code

**6. Save**
- **FINISH MATCH** → title, court, date → **CONFIRM SAVE**
- Your 30-day Pro trial starts now

**7. See the results**
- **RANKINGS** tab — podium, standings, game history

**Watch instead:** the how-to videos at the top of this Help tab walk through each step in under two minutes.

Questions: mcallpl@gmail.com`,
  },

  {
    id: 'settings',
    title: 'Account Settings & Preferences',
    category: 'Account',
    searchKeywords: ['settings', 'preference', 'profile', 'account', 'dark mode', 'change password', 'log out', 'logout', 'version'],
    content: `Settings live on the **GROUPS** tab: tap the **gear icon** at the top right.

**APPEARANCE**
- **Dark Mode** — switch between the dark and light themes. The choice is remembered on this device.

**SUBSCRIPTION**
- **Current Plan** — Free, Trial or Pro
- "Trial Ends In N days" while a trial is running
- **Upgrade to Pro** (Free), **Subscribe to Pro** (while a trial runs) or **Manage Subscription** (Pro)
- **Restore Purchases** — pick up a subscription bought on another device. This row is in the iPhone and Android app only; the web app shows a note saying Pro is bought in the app instead.

**ACCOUNT**
- **Change Password** — enter your current password, then the new one twice (6+ characters)
- **Delete Account** — permanently deletes your account after you confirm with your password (see "Delete My Account")
- **Log Out** — signs you out on this device

The app version number is shown at the bottom of Settings.

**Not in Settings (yet)**
- Editing your name, email or phone — email mcallpl@gmail.com and we will change it for you
- Notification preferences — the app does not send push notifications
- Your DUPR and home court belong to your player entries, not your login; edit them under ALL PLAYERS`,
  },

  {
    id: 'troubleshooting',
    title: 'Troubleshooting & FAQs',
    category: 'Support',
    searchKeywords: ['help', 'problem', 'error', 'troubleshoot', 'faq', 'not working', 'support', 'contact', 'email'],
    content: `**Can't sign in**
- Try your phone number if email fails, and the other way round
- Use **Forgot Password?** — the reset code arrives by text
- Check your internet connection

**Scores not showing on another phone**
- Both phones must be in the same live match: the LIVE bar with the code should be visible on the organizer's screen and the joiner should be on the LIVE tab
- Reopen the LIVE tab to reconnect

**Match not in Rankings**
- Only saved matches count: FINISH MATCH → CONFIRM SAVE
- Rankings need scores; a match with the score switch off saves nothing
- Check the session picker — you may be looking at one session instead of ALL TIME

**"Swap Locked"**
- Players cannot be swapped in a round once a score has been entered for it. Clear the score first.

**Can't start playoffs**
- Round robin must be fully scored and you need 8+ players (Rotating) or 4+ teams (Fixed Teams)

**No beacons showing**
- Turn on Location Services for PlayPBNow
- Beacons expire after the duration their creator chose (30 min – 2 hours)

**Can't create a third group**
- Free accounts are limited to 2 groups. Upgrade to Pro or delete a group you no longer use.

**Subscription not recognised**
- Settings → **Restore Purchases**, then sign out and back in

**Report a bug**
- Email mcallpl@gmail.com with what you tapped, what you expected and a screenshot if you have one. The app version is at the bottom of Settings.`,
  },

  // ============================================================================
  // PRIVACY & LEGAL
  // ============================================================================
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    category: 'Privacy & Legal',
    searchKeywords: ['privacy', 'data', 'policy', 'legal', 'protection', 'terms'],
    content: `PlayPBNow collects only what the app needs to run.

**What we store**
- Your account: name, email, phone number, password (hashed)
- The players you add: names, gender, optional phone, DUPR and home court
- Match schedules, scores and saved results
- Beacons you post: the court, your message and the time it expires
- Your location, only while the PLAY NOW tab is open, to show beacons near you

**How it is used**
- To run groups, matches, rankings and beacons
- To text you a password-reset or claim code when you ask for one
- Never sold and never used for advertising

**Third parties**
- Twilio delivers text messages
- Apple and Google process subscriptions; we never see your card
- Google Maps shows court locations on beacon cards

**Your rights**
- Delete your account and its data from inside the app (see "Delete My Account")
- Ask for a copy or correction of your data at mcallpl@gmail.com

**Full documents**
- Privacy Policy: https://playpbnow.com/privacy.html
- Terms of Service: https://playpbnow.com/terms.html

**Contact:** mcallpl@gmail.com`,
  },

  {
    id: 'account-deletion',
    title: 'Delete My Account',
    category: 'Privacy & Legal',
    searchKeywords: ['delete', 'account', 'remove', 'data', 'privacy', 'close account'],
    content: `You can permanently delete your account from inside the app. There are two places to do it; both do the same thing.

**From Settings**
1. **GROUPS** tab → **gear icon** → **SETTINGS**
2. Under ACCOUNT tap **Delete Account**
3. Enter your password and confirm

**From this page**
- Tap the **Delete My Account** button below, enter your password and tap **Permanently Delete**

**What is deleted**
- Your login (email, phone, password)
- Your groups and the players you created
- Your saved matches, scores and rankings
- Any beacons you posted

**What is kept**
- App Store / Google Play purchase records, which Apple and Google hold — cancel an active subscription in your store account first, or it will keep renewing
- A player's universal record that another organizer also plays with is not erased from that organizer's rankings

**This cannot be undone.** You are signed out immediately and would need to create a new account to use PlayPBNow again.

**No longer have the app?** Email mcallpl@gmail.com from the address on your account and we will delete it for you. Instructions are also at https://playpbnow.com/delete-account.html`,
  },

  {
    id: 'sms-consent',
    title: 'SMS Messages & Consent',
    category: 'Privacy & Legal',
    searchKeywords: ['sms', 'text', 'message', 'consent', 'invite', 'twilio', 'stop'],
    content: `**When PlayPBNow sends a text**
- **Password reset** — a 6-digit code, only when you tap Forgot Password?
- **Universal profile claim** — a 6-digit code, only when a player asks to claim their record
- **Administrator messages** — occasionally, from the app's administrators

Each of these is triggered by a request; the app never sends scheduled or marketing texts.

**Match invitations by SMS are paused.** When the feature returns it will require an organizer's explicit confirmation before any invitation is sent, and recipients will be able to opt out. See "Match Invitations (currently paused)".

**Phone numbers you enter for players**
- Are visible only to you
- Are used to link a player to their universal record and to send a claim code they request
- Are never shared with other players or third parties beyond Twilio, which delivers the text

**Opting out**
- Reply **STOP** to any PlayPBNow text to block further messages to that number
- Standard carrier rates may apply

Full details: https://playpbnow.com/privacy.html`,
  },
];
