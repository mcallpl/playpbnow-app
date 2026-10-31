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
 *   - Never hard-code a price. Prices come from the App Store / Google Play.
 *   - Tabs are exactly GROUPS · PLAY NOW · RANKINGS · HELP, plus LIVE while a
 *     match is active and ADMIN for administrators. The Invites tab is hidden
 *     by owner decision, so invitations are described as paused.
 *   - Topic ids are stable: help.tsx keys the Delete My Account button off
 *     'account-deletion', and searches/related links rely on the rest.
 *   - No em dashes and no en dashes in prose, and American spelling only
 *     (owner's rule, 2026-09-19 and 2026-09-18).
 */
export const HELP_TOPICS: HelpTopic[] = [
  // ============================================================================
  // MATCH CREATION & PLAYING
  // ============================================================================
  {
    id: 'create-match',
    title: 'How to Create a Match',
    category: 'Match Management',
    searchKeywords: ['create', 'match', 'new', 'start', 'game', 'tournament', 'rounds', 'rotating', 'fixed teams', 'courts', 'generate', 'bye', 'sit out', 'shuffle', 'mixed', 'gender', 'mixer'],
    content: `Matches are created from a group's roster.

1. **Open a Group**
   - Go to the **GROUPS** tab and tap a group card
   - The roster screen opens with the group name at the top

2. **Choose a Format** (the two buttons under the player chips)
   - **ROTATING PARTNERS**: everyone rotates, so you play with and against different people each round
   - **FIXED TEAMS**: players are paired in roster order (Team 1 = the first two players, and so on). Use the ▲ ▼ arrows or drag a row to change the pairings. Fixed Teams needs an even number of players.

3. **Check the Roster**
   - You need at least **4 players**
   - Add anyone missing with the "Search or add player..." box, or paste a whole list with **IMPORT A LIST OF PLAYERS** (see "How to Set Up Your Players" and "Import a List of Players")

4. **Tap CREATE MATCH**
   - The **MATCH SETUP** window opens. The top line shows the player count and, for Rotating Partners, how many courts are in use and how many players sit each round, for example "9 Players · 2 Courts · 1 sits each round".
   - Rotating Partners: set **COURTS:** with the − / + buttons (it starts at one court for every 4 players; lower it if fewer courts are free, and extra players sit that round). Then set **ROUNDS:** with the − / + buttons and pick a type for each round: **MIXED** (each team is one man and one woman), **GENDER** (men play men, women play women) or **MIXER** (anyone with anyone). Sitting out is always shared as evenly as possible: nobody sits more than one round more than anyone else. So when a group has more men than women (or more women than men), a Mixed round may include a pair of men (or women) playing a man and a woman. Two men never play two women. (See "Round Types and Sit-Outs".)
   - Fixed Teams: the window lists the team pairings and how many rounds and games the round-robin will take
   - **COURT NAMES** (optional): courts show as CRT 1, CRT 2, CRT 3 unless you name them. Tap **NAME COURTS** to use the courts you are really on, like CRT D, E, F or CRT 34, 35. If the group named its courts last time, the window asks "Same courts as last time?" with **USE THEM** and **NO THANKS** (see "How to Name the Courts")

5. **Tap GENERATE MATCH**
   - The schedule screen opens with every round and every game laid out
   - Nothing is saved yet. Saving happens when you **FINISH MATCH** (see "How to Score a Match")

**Quick Match without a group:** open **ALL PLAYERS**, tap **SELECT**, pick 4 or more players and tap **CREATE MATCH NOW**. The match is set up as "Quick Match".

**Tip:** Not happy with the matchups? Tap **SHUFFLE** at the top of the schedule to generate a fresh set. In a live shared match, only the host can shuffle.`,
  },

  {
    id: 'round-types',
    title: 'Round Types and Sit-Outs',
    category: 'Match Management',
    searchKeywords: ['mixed', 'gender', 'mixer', 'round type', 'courts', 'bye', 'byes', 'sit out', 'sits', 'uneven', 'fair', 'repeat partner', 'orange', 'swap', 'same gender'],
    content: `How the app builds each round when you use **ROTATING PARTNERS**.

**The three round types** (picked per round in **MATCH SETUP**)
- **MIXED**: each team is one man and one woman. The round is labeled "MIXED DOUBLES" on the schedule.
- **GENDER**: men play men and women play women. Labeled "SAME GENDER".
- **MIXER**: anyone with anyone. Labeled "MIXER".

**How many play each round**
- **COURTS:** in MATCH SETUP sets how many courts you have. It starts at one court for every 4 players and can go down if fewer courts are free.
- Each court holds 4 players. Everyone else sits that round and is listed under **BYES** on the schedule.
- The top line of MATCH SETUP tells you, for example "2 Courts · 1 sits each round".

**Sitting out is fair**
- The players who have sat the fewest rounds sit next, so nobody sits more than one round more than anyone else.

**Groups with more men than women (or the reverse)**
- Fair sit-outs come first. So a Mixed round may have two men playing a man and a woman (or two women playing a man and a woman).
- Two men never play two women.
- In a group with equal numbers of men and women, every Mixed team is one man and one woman.

**Repeat partners**
- A team that has already played together in an earlier round is shown in **orange**.
- To change it, tap one player and then tap another player in the same round to swap them. (Fixed Teams does not use the orange highlight, because the same partners are expected.)`,
  },

  {
    id: 'name-courts',
    title: 'How to Name the Courts',
    category: 'Match Management',
    searchKeywords: ['court', 'courts', 'name', 'rename', 'court name', 'crt', 'letter', 'number', 'court number', 'court letter', 'label', 'lineup', 'host'],
    content: `Every game shows its court as **CRT** with the court's name under it. The courts start as 1, 2, 3. If you are really on courts D, E and F (or 34, 35 and 17), name them once and every round uses those names.

**Where to name them**
- In the **MATCH SETUP** window, tap **NAME COURTS**, or
- On the match screen, tap **NAME COURTS** (next to ADD PLAYER) or tap any **CRT** label in a round

**How it works**
1. Type the first court's name, for example **D**. The courts after it fill in by themselves: E, F, G. Type **34** and you get 35, 36.
2. Change any court on its own. A court you typed yourself is never changed by the fill.
3. Tap **SAVE**. Every round now shows the new names, and the texted lineup picture prints them too (COURT D, COURT E).
4. Changed your mind? Open it again and tap **Back to 1, 2, 3...**

**Same courts every week?** The app remembers the names your group used last. Next time it asks "Same courts as last time?" Tap **USE THEM** or **NO THANKS**. It never changes your courts without asking.

**Playing live with others?** The host names the courts, and everyone scoring sees the same names. Only the host can name them in a live match: anyone else who taps NAME COURTS sees a **Host Only** message asking them to have the host change them.`,
  },

  {
    id: 'live-scoring',
    title: 'How to Score a Match',
    category: 'Match Management',
    searchKeywords: ['scoring', 'score', 'enter', 'points', 'game', 'match', 'finish', 'save', 'play to', 'swap', 'rename', 'shuffle', 'tournament', 'playoffs', 'standings', 'live', 'locked', 'match not complete', 'finish anyway'],
    content: `Scoring happens on the schedule screen that opens after GENERATE MATCH.

**The controls at the top** (each one has its label under it)
- **PLAY TO:** the target score for every game (11 by default; type 15 or 21 if that is how you play)
- **LIVE** (lightning bolt): shared scoring. Create a live match or join one with a code (see "Collaborative Scoring")
- **SHUFFLE**: regenerates all the matchups. Any scores already entered are cleared, so the app asks first ("Shuffle Matchups?"). Shuffle is not available once playoffs have started.
- **SCORE** (a switch): turns scoring on. Score boxes appear next to every team.

**Entering scores**
- Tap the score box beside each team and type the final score
- Tapping a box that already has a number selects that number, so whatever you type replaces it
- While the number pad is up, the controls at the top fold away so you can see both teams. They come back when the keyboard closes.

**Who is winning so far**
- With scoring on, tap **STANDINGS** under the controls to see each player's W-L and points so far (see "Live STANDINGS During a Match")

**Fixing a matchup before play**
- Tap one player, then tap another player to **swap** them
- **ROTATING PARTNERS**: you can only swap two players in the same round. Trying to swap across rounds shows a "Locked" message.
- **FIXED TEAMS**: a swap trades the two players in every round. Once any score has been entered, Fixed Teams swaps are locked ("Swap Locked").
- **Long-press** a name to rename that player for this match
- Need someone who is not on the schedule? Tap **ADD PLAYER**, search or type a name, then shuffle to include them. Players who sit a round are listed under **BYES**.
- In a live shared match, only the host can shuffle, swap, rename, add players or name courts. Anyone else sees a **Host Only** message.

**Tournament mode** (round robin, then playoffs)
- With scoring on, flip the **TOURNAMENT** switch
- Score every round-robin game, then tap **START PLAYOFFS**. The app needs at least 8 players (Rotating) or 4 teams (Fixed Teams) with scores.
- Semifinals are #1 vs #4 and #2 vs #3. Score them, tap **GENERATE FINALS**, score the final, then **FINISH TOURNAMENT**

**Finishing and saving**
1. Tap **FINISH MATCH** (or FINISH TOURNAMENT) at the bottom
2. If some games have no score yet, a **Match Not Complete** warning says those games will not be recorded. Tap **Go Back & Enter Scores**, or **Finish Anyway** to save what you have.
3. The **SAVE MATCH RESULTS** window asks for a Match Title, a Court / Location and the date and time
4. Tap **CONFIRM SAVE**. Results go to the **RANKINGS** tab immediately.
5. If nothing changed since the last save, the app tells you it is "Already Saved"

**Note:** Your first saved match starts your 30-day Pro trial, as does creating your first shared live match (see "What is PlayPBNow Pro?").`,
  },

  {
    id: 'live-standings',
    title: 'Live STANDINGS During a Match',
    category: 'Match Management',
    searchKeywords: ['standings', 'who is winning', 'leader', 'w-l', 'pts', 'points', 'tie', 'so far', 'live standings'],
    content: `See who is winning while the match is still going.

**Opening it**
- On the schedule screen, turn on **SCORE**
- Tap **STANDINGS** under the controls at the top (it hides while the number pad is up)

**What it shows**
- A line such as "So far: 6 of 18 games scored"
- Each player ranked with **#**, **PLAYER**, **W-L** and **PTS**
- **PTS** is points won minus points lost, shown with a + when a player is ahead
- Under each name: how many games they have played, and any ties

**How players are ranked**
- Most wins first, then fewest losses, then PTS
- A tie counts as neither a win nor a loss
- A game counts only once both of its scores are entered

**In a live shared match** the standings include scores coming in from the other phones, and they update while the window is open.

Tap **CLOSE** to go back to scoring. Nothing here is saved: Rankings only change when you FINISH MATCH and CONFIRM SAVE.`,
  },

  {
    id: 'collaborative-scoring',
    title: 'Collaborative Scoring (Real-Time)',
    category: 'Match Management',
    searchKeywords: ['collaborate', 'live', 'realtime', 'real-time', 'share', 'code', 'join', 'sync', 'connected', 'shared scoring', 'host only', 'offline', 'not synced', 'reconnecting'],
    content: `Everyone at the court can score from their own phone.

**Start a shared match (the host)**
1. On the schedule screen tap **LIVE** (the lightning bolt) at the top
2. Choose **Create Shared Match**
3. The **SHARE LIVE MATCH** window shows a 6-letter **Share Code**. Tap the button under it: it reads **SHARE CODE** on the phone app (it opens your share sheet) and **COPY** in a web browser.
4. A green **LIVE · Code: XXXXXX** bar appears under the controls, with a count of how many people are connected

**Join a shared match (everyone else)**
- From the **GROUPS** tab tap the **lightning bolt** in the header, or on the schedule screen tap **LIVE** and choose **Join Match**
- Enter the 6-letter code and tap **JOIN MATCH**
- The full match screen opens, with score boxes, just like the host's
- The **LIVE** tab appears at the bottom while the match is active. Tapping it reopens that same match screen.

**While it is live**
- Scores typed on any connected phone show up on all of them
- The host's shuffles, swaps and court names are pushed to everyone
- Only the host can shuffle, swap, rename or add players, or name courts. Anyone else who tries sees a **Host Only** message.
- Either the host or a joiner can **FINISH MATCH** and save the results

**Keeping track of the connection** (see "Live Match Sync Status")
- The LIVE bar shows "N not synced" when some of your scores have not reached the server yet, and "last synced Ns ago" when all is well
- If the connection drops it shows **RECONNECTING** in red

**If you lose connection**
- Keep scoring. The app reconnects on its own and sends anything not synced when it does.
- Reopen the LIVE tab to catch up
- The host can reopen their own match from the LIVE tab at any time`,
  },

  {
    id: 'live-sync-status',
    title: 'Live Match Sync Status',
    category: 'Match Management',
    searchKeywords: ['sync', 'synced', 'not synced', 'offline', 'reconnecting', 'connecting', 'connection', 'live bar', 'last synced', 'wifi', 'signal'],
    content: `In a shared live match, the green bar under the controls tells you whether your scores are reaching everyone else.

**What the bar can say**
- **LIVE · Code: XXXXXX**: the match code
- **N connected**: how many phones are in the match
- **N not synced**: that many of your scores have not reached the server yet
- **synced just now** or **last synced Ns ago**: everything you entered has gone through
- **CONNECTING**: the match is starting up
- **RECONNECTING** or **NOT CONNECTED, retrying** (shown in red): the connection dropped and the app is trying again

**If it says not synced or RECONNECTING**
- Keep scoring. Your scores are kept on your phone.
- When the connection comes back, the app sends them by itself. It can take up to about 30 seconds.
- Move somewhere with a better signal if it stays red

**Before you finish**
- If the host finishes the match while your phone still has scores that are not synced, the app warns you before clearing them

See "Collaborative Scoring (Real-Time)" for how to start or join a live match.`,
  },

  {
    id: 'match-sharing',
    title: 'Share & Report Match Results',
    category: 'Match Management',
    searchKeywords: ['share', 'report', 'result', 'text match', 'hd report', 'image', 'watermark', 'schedule', 'lineup', 'confirm date', 'send'],
    content: `**TEXT MATCH** turns the schedule into a lineup picture you can send to the group.

1. On the schedule screen tap **TEXT MATCH** at the bottom
2. The **GENERATE HD REPORT** window opens with a preview
3. Fill in the **Match Title**, choose a **Court / Location** and set the **Date & Time**
4. Tap **REFRESH PREVIEW** if you changed anything
5. Tap **SHARE NOW**
6. The app double-checks the day and time with a **Confirm Date & Time** message ("this report will tell players to show up on..."). Tap **Yes, Send It**, or **Let Me Fix It** to go back and change it.

**How it is sent**
- **iPhone**: one message with the date, time, title, court and a link to the lineup picture
- **Android**: the lineup picture itself, through your share sheet
- **Web browser**: your browser's share sheet with the same message and link (or the picture opens in a new tab if your browser cannot share)

**What the picture shows**
- Every round and game, with each court's name. If you named the courts, the picture prints those names (COURT D, COURT E).

**After you share**
- The **LIVE** tab appears at the bottom, so you can get back to this match quickly

**Free vs Pro**
- Free accounts get a "FREE: Reports include a watermark" badge on the report
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
    searchKeywords: ['beacon', 'what', 'looking', 'need', 'players', 'play now', 'nearby', 'court', 'come play', 'spot to fill', 'your beacon', 'location', 'nearest'],
    content: `A beacon tells other PlayPBNow players "I'm at this court and I want to play."

**Where they live:** the **PLAY NOW** tab. It lists every active beacon as a map card with the court, who posted it, their message and how long it has left. Tap a card to open it.

**Two kinds of beacon**
1. **I'm Here, Come Play!** (Casual): "I'm already at the court. Looking for people to come play!" Anyone can reply **On My Way!** and chat. Its card is marked **Come Play**.
2. **A Real Spot To Fill** (Guaranteed Game): you need a set number of spots filled. Players claim a spot, you lock the match, the app builds a schedule and you start. Its card is marked **Spot To Fill**.
Your own beacons are marked **Your Beacon**.

**How long a beacon lasts**
- You pick the duration when you create it: **30 min**, **1 hour** or **2 hours**
- Tap **Extend** on your own beacon to add +30 min, +1 hour or +2 hours
- **Delete** removes it early

**How people find out**
- There are no push notifications yet. Players see your beacon when they open the PLAY NOW tab, so post it and give it a few minutes.
- You do not need Location Services to see beacons. Without location the tab shows **Showing all beacons** and lists every active beacon. With location on, they are sorted by distance from you.
- If location is turned off for PlayPBNow, a **Location Services Disabled** note appears. Tap it for instructions.

**What you need first**
- A phone number on file. If your account has none, an **Add a Phone Number** popup asks for one right there (see "How to Activate a Beacon")
- A first name on your profile (the app asks for it the first time you post or respond)

**Reliability:** each beacon shows a percentage next to its host. See "Beacon Reliability".`,
  },

  {
    id: 'create-beacon',
    title: 'How to Activate a Beacon',
    category: 'Beacons',
    searchKeywords: ['beacon', 'activate', 'create', 'post', 'need', 'go live', 'spot to fill', 'casual', 'lobby', 'lock match', 'come play', 'players needed', 'phone'],
    content: `1. **Go to the PLAY NOW tab** and tap **Create Beacon**

2. **Pick the kind of beacon**
   - **I'm Here, Come Play!** (Casual): you are at the court, come play
   - **A Real Spot To Fill** (Guaranteed Game): you need specific spots filled and want a locked, scheduled game

**No phone number on file?** An **Add a Phone Number** popup opens: "Beacons need a phone number on file so other players can reach you about a game." Type your **MOBILE NUMBER** and tap **Save Number**, or **Not Now** to skip it for now. You stay signed in either way.

**Casual beacon**
1. **Select Court**: search the court list and tap yours
2. **Message (optional)**: for example "Courts are open, come play!"
3. **How long will you be here?** 30 min, 1 hour or 2 hours
4. Tap the **I'm Here, Come Play!** button
Your beacon goes on the map. Players who respond appear in the beacon's chat.

**A Real Spot To Fill**
1. **Select Court**
2. **Players needed (besides you)**: how many players you still need, not counting yourself. Use − and +.
3. **Skill Level (optional)**: for example 3.0-3.5
4. **Message (optional)**
5. **Duration**: 30 min, 1 hour or 2 hours
6. Tap **Go Live**
You land in the **Lobby**. As players tap **Fill This Spot** they appear in the Players list. When you have enough, tap **Lock Match**. The **Match Preview** shows the schedule and a Match Quality score; tap **Start Match** to begin.

**Managing your beacon**
- Open it from the PLAY NOW list to **Extend** or **Delete** it
- **Open Lobby** takes you back to a structured beacon's lobby
- **Leave Lobby** at the top left backs out without deleting the beacon (as the host it may read **Close Lobby**)`,
  },

  {
    id: 'respond-beacon',
    title: 'How to Respond to a Beacon',
    category: 'Beacons',
    searchKeywords: ['beacon', 'respond', 'on my way', 'fill this spot', 'join', 'play', 'find', 'confirm', "can't make it", 'find replacement', 'reliability', 'phone'],
    content: `1. **Open the PLAY NOW tab**: active beacons are listed as map cards
2. **Tap a card** to see the court, the message, the skill level, the host's reliability and the time left. **Get Directions** opens the court in your maps app.

**Casual beacon (Come Play)**
- Tap **On My Way!** The button changes to "I'm Going!"
- Use the chat to coordinate. Quick replies like "Be there in 10 min" and "Save me a spot!" are one tap, or type your own message.

**A Real Spot To Fill**
- Tap **Fill This Spot** and confirm. You now hold one of the spots and appear in the host's Lobby.
- When the host locks the match you are asked to **Confirm**
- Plans changed? Tap **Can't Make It**. The app offers **Find Replacement**, which offers your spot to other players. If someone fills it, your reliability is protected. Changed back? Tap **I Can Make It!**

**Before you can respond**
- You need a phone number on file. If there is none, the **Add a Phone Number** popup asks for it right there: tap **Save Number** (or **Not Now**)
- The first time, the app asks for your first name in **Complete Your Profile**

**Expired beacons** show a red "This beacon has expired" banner and can no longer be joined.`,
  },

  {
    id: 'beacon-reliability',
    title: 'Beacon Reliability',
    category: 'Beacons',
    searchKeywords: ['reliability', 'reliable', 'percent', 'score', 'show up', "can't make it", 'find replacement', 'replaced', 'beacon', 'lobby'],
    content: `The percentage you see next to a beacon's host, and next to each player in a Lobby, is that player's **reliability**.

**What it measures**
- Of the Spot To Fill lobbies a player has joined, the share that actually went on to start a match
- A player with no lobby history shows **100%**

**Protecting your reliability**
- If you cannot make a game you joined, tap **Can't Make It** and then **Find Replacement**. Your spot is offered to other players.
- A spot you were replaced in does not count against you. The app tells you "You have been replaced. Your reliability is protected."
- Changed your mind before anyone takes it? Tap **I Can Make It!**

**Where you see it**
- On the beacon details, next to the host
- In the Lobby, next to each player who joined

Casual (Come Play) beacons do not affect reliability. Only Spot To Fill lobbies count.`,
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
- Tap one of the quick-reply chips: "On my way!", "Be there in 20 min", "How many players so far?", "What skill level?", "Need one more!" and more
- Or type in "Type a message..." and send

**What you need**
- A phone number on file and a first name on your profile. If either is missing, the app asks for it right there (**Add a Phone Number** or **Complete Your Profile**).

**Good uses**
- Confirm the exact court number
- Ask about level before you drive over
- Say how many you are bringing

There is no player rating or feedback system. Chat is for coordinating the game. (The reliability percentage is worked out automatically from lobbies; see "Beacon Reliability".)`,
  },

  // ============================================================================
  // GROUPS
  // ============================================================================
  {
    id: 'groups-intro',
    title: 'What Are Groups?',
    category: 'Groups',
    searchKeywords: ['group', 'what', 'team', 'roster', 'organization', 'groups tab'],
    content: `A group is a named roster of players tied to a home court: your Tuesday crew, the Friday round-robin, the league night.

**What a group gives you**
- A saved roster you can create matches from in seconds
- A home location that is pre-filled on match reports and saved results
- Rankings that can be filtered to the sessions that group has played

**The GROUPS tab**
- **Your Groups** lists every group with its player count
- Tap a card to open the roster and create a match
- **Pencil** icon: rename the group or change its location
- **Trash** icon: delete the group
- **NEW GROUP**: create one (pick a location, name it, and optionally import your players)
- **ALL PLAYERS**: every player you have ever added, across all groups
- **Lightning bolt** (top right): join a live match by code
- **Gear** (top right): Settings

**Limits**
- Free accounts can have **2 groups**; the tab shows "1/2 Groups" so you know where you stand. Pro and trial accounts have no limit.

**Who sees a group:** only you. Groups are private to your account. There are no roles, invitations or public groups.`,
  },

  {
    id: 'create-group',
    title: 'How to Create a Group',
    category: 'Groups',
    searchKeywords: ['create', 'group', 'new', 'team', 'location', 'court', 'new group', 'import', 'spreadsheet', 'excel', 'paste', 'list', 'nearest', 'search'],
    content: `1. **Go to the GROUPS tab** and tap **NEW GROUP** at the bottom

2. **STEP 1: MATCH LOCATION**
   - Tap "Tap to select location". The **SELECT LOCATION** list opens.
   - Type in "Type a court name or city" to search. Words can be in any order and can be partial ("anderson redondo").
   - **YOUR COURTS** (courts your groups already use) are listed first, then the rest nearest first if location is allowed. If not, tap **Show nearest first**. (See "Choosing a Court".)
   - Tap your court
   - Not listed? Tap **Add New Location** (a Pro feature; trial accounts included), enter the Court / Venue Name, City and (optionally) State, then tap **SAVE LOCATION**
   - **BACK** returns to the list

3. **STEP 2: GROUP NAME**
   - Type a name such as "Friday Crew"
   - CANCEL backs out without creating anything

3b. **STEP 3: PLAYERS (OPTIONAL)**
   - Tap **Import a list or spreadsheet**
   - Paste your names, one player on each line. To include gender, put it after a comma ("Jane Smith, F"). You can also copy the Name and Gender columns out of a spreadsheet and paste them
   - On the web you can tap **CHOOSE A SPREADSHEET FILE** instead (Excel .xlsx, CSV or a text file)
   - On a phone, while the keyboard is up, **DONE TYPING** and **NEXT** stay above it so you can always move on
   - Tap **NEXT**. On **CHECK YOUR LIST**, choose short names ("Chip M") or full names ("Chip McAllister"), then tap **M** or **F** for anyone the list did not say, or use **Set everyone not set to Male / Female**
   - Tap **USE ... PLAYERS**. The button then reads **CREATE + ADD** with the number of players (see "Import a List of Players")

4. **Tap CREATE** (or **CREATE + ADD**)

5. **Add players**
   - The new group opens on its roster screen
   - Use "Search or add player..." to add people (see "How to Set Up Your Players")
   - Tap **SAVE** at the top right to keep the roster

**Free accounts** can create 2 groups. Trying to add a third opens the Pro upgrade window.

**Tip:** One group per regular session works best. The Rankings session picker then lines up neatly with how you actually play.`,
  },

  {
    id: 'choose-court',
    title: 'Choosing a Court',
    category: 'Groups',
    searchKeywords: ['court', 'location', 'search', 'find court', 'nearest', 'near me', 'your courts', 'home court', 'add new location', 'picker'],
    content: `The court lists for a group's location and for a player's Home Court (under ALL PLAYERS) work the same way.

**Search**
- Type in "Type a court name or city"
- Every word you type must appear in the court's name, city or state, in any order. Partial words work: "anderson redondo", "cox ladera" and "st marys" all find their courts.

**What comes first**
- **YOUR COURTS**: the courts your groups already use, plus the one currently chosen
- Then **NEAREST** first, with the distance in miles, when the app knows where you are
- Otherwise the rest are listed A to Z under **ALL COURTS**

**Nearest first**
- If you have already allowed location for PlayPBNow, the list sorts by distance without asking
- If not, tap **Show nearest first**. The app asks for location only when you tap it.
- If location is off, the app explains how to turn it on in Settings. You can still search by name or city.

**Court not listed?** When picking a group's location, tap **Add New Location** to add it. This is a Pro feature (trial accounts included).`,
  },

  {
    id: 'manage-group',
    title: 'How to Manage Your Group',
    category: 'Groups',
    searchKeywords: ['group', 'manage', 'members', 'edit', 'rename', 'delete', 'remove player', 'reorder', 'save', 'import'],
    content: `**Rename or move a group**
- On the GROUPS tab tap the **pencil** on the group card. The **EDIT GROUP** window opens.
- Change the name and/or pick a different location, then tap **UPDATE**

**Delete a group**
- Tap the **trash** icon on the card. The app asks: "Remove [group name]? Its players and match history will no longer appear in Rankings." Tap **Delete** to confirm.
- The group disappears from your list, and its players and match history stop appearing in Rankings. They are hidden, not wiped. The players themselves are still listed under ALL PLAYERS.

**Edit the roster** (tap the group card)
- **Add**: "Search or add player..." plus the gender toggle and the + button, or **IMPORT A LIST OF PLAYERS** for many at once
- **Edit**: tap the pencil on a player row. **EDIT PLAYER** opens, where you can change name, gender, cell phone, DUPR rating or home court
- **Remove**: tap the **X** labeled **REMOVE** on the player row. It only takes them off this roster; their record is kept and they are still under ALL PLAYERS
- **Reorder**: use ▲ ▼ or drag the handle; order matters for Fixed Teams pairings
- Tap **SAVE** at the top right when you are done. The button offers **SAVE GROUP**.

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
    searchKeywords: ['player', 'setup', 'create', 'add', 'new player', 'gender', 'phone', 'dupr', 'home court', 'all players', 'import', 'paste', 'list', 'edit player'],
    content: `Players are added inside a group, and every player you add is kept under **ALL PLAYERS**.

**Add a player to a group**
1. Open the group from the GROUPS tab
2. Tap the **"Search or add player..."** box and type a name
3. If the person already exists in your account they appear in a dropdown. Tap them to add them to this group.
4. Otherwise set the **gender toggle** (the colored button right of the box, showing the ♂ or ♀ symbol; tap it to switch) and tap **+** to create them
5. Tap **SAVE** at the top right to keep the roster

**Add a whole list at once**
- Inside the group tap **IMPORT A LIST OF PLAYERS** under the add box
- Paste names one per line (gender after a comma if you have it, "Jane Smith, F"), or on the web choose a spreadsheet file
- Anyone already in the group is skipped, and a name listed twice is added once
- Tap **M** or **F** for anyone not set, then **ADD ... PLAYERS** (see "Import a List of Players")

**Edit a player's details**
- **On a group's roster**: tap the **pencil** on the player row. **EDIT PLAYER** opens with First Name, Last Name, Gender, **Cell Phone** (optional), DUPR Rating (optional) and Home Court (tap it and use "Search courts..."). Tap **SAVE**.
- **Under ALL PLAYERS**: tap the pencil on the player. Fields: First Name, Last Name (optional), Phone Number, Gender, Home Court, DUPR Rating (1.00 to 8.00, optional). Home Court opens the searchable court list (see "Choosing a Court"). Tap **SAVE CHANGES**.

**Why the phone number matters**
- A phone number links the player to a universal identity, so their record can follow them if they play in someone else's group (see "Understanding Player Statistics")
- The number is only visible to you

**ALL PLAYERS** (GROUPS tab, then ALL PLAYERS; the screen is titled **PLAYERS**)
- Shows every player with their win-loss record, win % and DUPR if set
- **SELECT** turns on selection mode: pick players, then **ADD TO GROUP** or **CREATE MATCH NOW**
- A yellow banner appears if the app spots duplicate names. See "Merge Duplicate Players".`,
  },

  {
    id: 'import-players',
    title: 'Import a List of Players',
    category: 'Players',
    searchKeywords: ['import', 'paste', 'list', 'spreadsheet', 'excel', 'csv', 'bulk', 'many players', 'check your list', 'done typing', 'names'],
    content: `Add a whole group of players at once instead of one by one.

**Where to find it**
- **Making a new group**: under **STEP 3: PLAYERS (OPTIONAL)** tap **Import a list or spreadsheet**
- **An existing group**: open it from the GROUPS tab and tap **IMPORT A LIST OF PLAYERS** under the add box

**1. IMPORT PLAYERS**
- Paste or type your names, one player on each line
- Add gender after a comma if you have it: "Jane Smith, F" or "Bob Jones, M"
- You can copy the Name and Gender columns straight out of a spreadsheet
- On the web, **CHOOSE A SPREADSHEET FILE** reads an Excel (.xlsx), CSV or text file (the first sheet is used)
- On a phone, while the keyboard is up, **DONE TYPING** closes the keyboard and **NEXT** moves on. Both stay above the keyboard, so it can never hide them.

**2. CHECK YOUR LIST**
- **Names**: choose short names like "Chip M" or full names like "Chip McAllister"
- Tap **M** or **F** beside anyone whose gender was not on the list, or use **Set everyone not set to Male / Female**
- Tap the **X** beside a row to leave that person out
- The app tells you who was skipped: anyone already in the group, and any name listed twice (kept once)
- If something still needs doing, the app says what, for example "2 players still need Male or Female"

**3. Finish**
- New group: tap **USE ... PLAYERS**, then **CREATE + ADD**
- Existing group: tap **ADD ... PLAYERS**
- **BACK** returns to the list you pasted`,
  },

  {
    id: 'player-stats',
    title: 'Understanding Player Statistics',
    category: 'Players',
    searchKeywords: ['stats', 'statistics', 'leaderboard', 'ranking', 'player', 'wins', 'diff', 'win %', 'universal', 'claim', 'qr', 'profile'],
    content: `**What is tracked for every player**
- **Wins** and **Losses**: one per game (each game on the schedule counts, not each session)
- **Win %**: wins divided by games played
- **Diff**: total points scored minus points allowed
- **DUPR**: shown if you entered it on the player; the app does not calculate it

Stats only come from **saved** matches (FINISH MATCH, then CONFIRM SAVE). A match you generate but never save does not count.

**Where to see them**
- **RANKINGS** tab: the leaderboard, podium and game history (see "How to View Rankings")
- **ALL PLAYERS**: each row shows W-L and win %
- A group's roster shows W-L · % beside each player once they have played

**Universal player profile (Pro / trial)**
- Every player with a phone number gets a universal record with a claim code in the form **PB-XXXX-XXXX**
- From ALL PLAYERS tap the pencil on the player, then **Share universal profile...** and a player card with a QR code opens
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

**Where:** GROUPS tab, then **ALL PLAYERS**. When two or more players share a name, a warning banner shows with a **REVIEW & MERGE** button. Merging is a Pro feature (trial accounts included).

**Review the duplicates**
1. Tap **REVIEW & MERGE**. The **Duplicate Players** window lists each name group.
2. Tick the entries that are the same person (there is a **SELECT ALL** per group)
3. Tap the merge button for that group, or merge every selected group at once
4. Tap **Done** when finished

**If they are different people**
- Tap **Not Same Person** on that name group; the app remembers and stops flagging them

**From a single player**
- Open the player (pencil icon) and tap **Merge with duplicate...**. The app finds other players with the same first name and offers to merge them into this one.

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
    content: `1. **Open the app**: the sign-in screen appears if you are not logged in
2. **Enter your email or phone number**: either one works
3. **Enter your password** and tap **SIGN IN**

You stay signed in on that device until you tap **Log Out** (Settings) or delete the app.

**Forgot your password?**
1. Tap **Forgot Password?**
2. Enter the phone number or the email on your account and tap **SEND CODE**. The code is texted to the phone on file.
3. Type the **6-digit code** we text you and tap **VERIFY**
4. Enter and confirm a new password (6+ characters) and tap **RESET PASSWORD**
5. Sign in with the new password

**Phone number**
- If your account has no phone number, an **Add Your Phone Number** screen appears after sign-in. Enter it and tap **SAVE NUMBER**. The number is used for password resets and for beacons.
- It is optional. **Skip for now** hides it for 7 days. **Use a different account** signs you out, for example if that number already belongs to another account.

**Trouble signing in**
- The app shows the same generic message for a wrong email/phone or a wrong password, so check both
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
   - **FIRST NAME**: required
   - **LAST NAME**: optional
   - **Email address**: required; you can sign in with it (or with your phone number)
   - **PHONE NUMBER**: optional here. If you leave it blank, the app asks for it after sign-in (it is needed for password resets and beacons), and you can skip that too.
   - **PASSWORD**: 6+ characters

3. **Tap CREATE ACCOUNT**: you are signed in straight away

**What you get**
- A free account with up to 2 groups
- A 30-day Pro trial that starts the first time you save a match, not the day you sign up, so you can set up your roster at your own pace

**Next steps**
1. GROUPS tab, then **NEW GROUP**
2. Add your regular players (or paste a list with **IMPORT A LIST OF PLAYERS**)
3. **CREATE MATCH**, score it, **FINISH MATCH**
4. Check the **RANKINGS** tab

By creating an account you agree to the Terms of Service (https://playpbnow.com/terms.html) and Privacy Policy (https://playpbnow.com/privacy.html), both linked on the sign-in screen.`,
  },

  {
    id: 'phone-verification',
    title: 'Phone Number & SMS',
    category: 'Account',
    searchKeywords: ['phone', 'verify', 'sms', 'text', 'number', 'code', 'phone number required', 'add your phone number', 'skip for now', 'add a phone number'],
    content: `**Why the app wants a phone number**
- **Password reset**: the 6-digit reset code is sent by text
- **Play Now beacons**: posting, responding and chatting need a phone number on file
- **Universal player profiles**: a player claims their record by proving they own the number you have for them

**When you are asked**
- After signing in, if your account has no number, the **Add Your Phone Number** screen appears. Enter it and tap **SAVE NUMBER**.
- **Skip for now** hides that screen for 7 days. **Use a different account** signs you out (useful if the number already belongs to another account).
- On the PLAY NOW tab, if there is no number on file, an **Add a Phone Number** popup asks for it right there. Tap **Save Number**, or **Not Now**. You are never sent back to the sign-in screen.

**Text messages you may receive from PlayPBNow**
- Password-reset codes (only when you request one)
- Claim codes for a universal player profile (only when you request one)
- Nothing else. There are no marketing texts and no scheduled notifications.

**Changing your number**
- There is no self-service screen for this yet, and Settings has no phone field. Email mcallpl@gmail.com from the email on your account and we will update it.

**Match invitations by SMS** are paused for now. See "Match Invitations (currently paused)".`,
  },

  // ============================================================================
  // INVITES (PAUSED: tab hidden by owner decision)
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
- Post a beacon from the **PLAY NOW** tab. Players who open the tab can respond and chat (see "What Are Beacons?")
- Use **TEXT MATCH** on the schedule screen to send the matchups to your group through your own messaging app

Player-pool signups already collected are kept and will be there when invitations return.`,
  },

  {
    id: 'send-invites',
    title: 'How to Send Invites',
    category: 'Invites',
    searchKeywords: ['send', 'invite', 'sms', 'text', 'match', 'paused'],
    content: `**Coming back soon.** Sending invitations is paused and the Invites tab is hidden, so this cannot be done in the app at the moment.

In the meantime, **TEXT MATCH** on the schedule screen shares the matchups through your own messaging app, and a **PLAY NOW** beacon lets other players find your game. See "Match Invitations (currently paused)".`,
  },

  {
    id: 'manage-invites',
    title: 'Manage Invites & Responses',
    category: 'Invites',
    searchKeywords: ['manage', 'invite', 'response', 'track', 'status', 'paused'],
    content: `**Coming back soon.** Invitation tracking is paused along with the rest of the Invites tab. Responses to invitations sent before the pause are kept and will show again when the feature returns.

For a game today, post a **PLAY NOW** beacon. It has its own player list and chat. See "Match Invitations (currently paused)".`,
  },

  // ============================================================================
  // RANKINGS
  // ============================================================================
  {
    id: 'leaderboard',
    title: 'How to View Rankings',
    category: 'Leaderboards',
    searchKeywords: ['leaderboard', 'ranking', 'rankings', 'stats', 'compare', 'head to head', 'podium', 'session', 'all time', 'game history', 'edit score', 'delete', 'standings'],
    content: `The **RANKINGS** tab shows standings from every match you have saved. (For who is winning in a match you are still playing, use **STANDINGS** on the match screen; see "Live STANDINGS During a Match".)

**Sorting**: the three buttons under the title
- **WINS**: most game wins first
- **WIN %**: best winning percentage first
- **DIFF**: best point differential (points for minus points against) first

**The podium**: the top three players get the gold, silver and bronze pedestals with their W-L, Diff, DUPR (if entered) and win %. Everyone else is listed below in rank order. In a **Fixed Teams** session the podium shows teams, and tournament placements show as Gold / Silver / Bronze badges.

**Badges** next to a name:
- 💠 **Platinum**: won every game.
- 💎 **Diamond**: lost exactly one game, with more wins than losses.
- 🔥 **Fire**: won three or more games.
- 🦃 **Turkey**: was held to zero in a game. It can show up next to any other badge.
A player gets at most one of Platinum, Diamond and Fire, in that order.

**ALL TIME or one session**
- The gray bar under the sort buttons names what you are looking at: **ALL TIME ▾** to start with. Tap it to pick something else.
- **ALL TIME** combines every saved match
- Or tap a saved session's name. The standings switch to that day's games and the bar changes to that session's name.
- Tap the **pencil** beside a session to open its **GAME HISTORY**.
- Coming straight from a match you just scored, the bar reads **CURRENT SESSION**

**Game history** (tap the pencil beside a session in the session list)
- Every game is listed with the two teams and the score, winner highlighted
- **Pencil**: edit that game's scores, then tap the check mark to save. Rankings update.
- **Trash**: delete one game
- **DELETE ENTIRE MATCH**: removes the whole session (only shown for sessions you saved yourself)

**The icons in the header**
- **Home** (top left): back to the GROUPS tab
- **People** (top right): head to head
- **Log out** (far right): signs you out; it asks you to confirm first

**Head to head**
- Tap the **people icon** (top right)
- Select two players to see their record against each other
- It always counts every saved game between them (ALL TIME), even when the standings show a single session
- Tap the games line to see each game they played against each other

**Empty list?** Rankings only include saved matches with scores. Turn on **SCORE**, enter scores, tap FINISH MATCH and CONFIRM SAVE.`,
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
- **Overview**, **Activity** and **Engage**: usage and engagement dashboards
- **Users**, **Players** and **Groups**: account and roster management across the whole app
- **Database**: table browser
- **Quick SMS**: send a text to selected users (administrators only)
- **Broadcast**: publish an announcement page with an optional hero image or video

**If you are not an administrator**
- Nothing is missing from your app. There is no user-facing broadcast feed, and announcements do not appear inside the app.
- Questions about the app go to mcallpl@gmail.com`,
  },

  // ============================================================================
  // PREMIUM & SUBSCRIPTION
  // ============================================================================
  {
    id: 'pro-features',
    title: 'What is PlayPBNow Pro?',
    category: 'Premium',
    searchKeywords: ['pro', 'premium', 'subscription', 'cost', 'features', 'trial', 'free', 'limits', 'watermark', 'groups limit', 'add new location'],
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
- **Add New Location**: add a court that is not on the list yet
- Everything else in the app is the same

**The 30-day trial**
- Every new account gets a **30-day Pro trial**
- The clock starts the **first time you save a match** (or create your first shared live match), not when you sign up, so set up your roster first, no rush
- Before it starts, Settings says your days start with your first saved match. While it runs, Settings shows "Trial Ends In N days"; a banner on the GROUPS tab shows when it has ended.
- When it ends you drop back to Free; nothing is deleted, but you cannot create more than 2 groups until you upgrade

**Price**
- Monthly and Annual plans. The exact prices are shown in the app on the upgrade screen, set by the App Store or Google Play for your country. See "How to Upgrade to Pro".`,
  },

  {
    id: 'upgrade-to-pro',
    title: 'How to Upgrade to Pro',
    category: 'Premium',
    searchKeywords: ['upgrade', 'buy', 'pro', 'subscribe', 'payment', 'restore', 'manage subscription', 'cancel', 'promo'],
    content: `Pro is bought through the app store on your phone.

**From Settings**
1. **GROUPS** tab, then the **gear icon**, then **SETTINGS**
2. Under **SUBSCRIPTION** tap **Upgrade to Pro**. While your trial is running the same button reads **Subscribe to Pro**.
3. Choose **Annual** (marked BEST VALUE) or **Monthly**. The price for your store and country is shown on the button.
4. Confirm with Face ID / Touch ID or your Google account. Pro turns on immediately.

**From a limit**
- Creating a third group on a Free account, tapping **Add New Location**, or tapping the watermark badge on a report opens the same upgrade window

**On the web app**
- Pro cannot be bought in a browser. The web app says so and points you to the phone app: subscribe on iPhone or Android, and the web app picks up your plan the next time you sign in. **Restore Purchases** is a phone-app button too; it does not appear on the web.

**Already subscribed on another device?**
- Settings, then **Restore Purchases** (iPhone / Android app)

**Manage or cancel**
- Settings, then **Manage Subscription**. On the phone this opens your App Store or Google Play subscriptions page; cancel there at any time and Pro stays on until the end of the paid period.

**Promo codes** are not redeemable yet. A "Have a promo code?" field is visible in the browser, but there is no web checkout behind it; it just tells you to buy Pro in the app. Ignore it for now.`,
  },

  // ============================================================================
  // NAVIGATION & GENERAL TIPS
  // ============================================================================
  {
    id: 'navigation',
    title: 'App Navigation & Tabs',
    category: 'Getting Started',
    searchKeywords: ['navigate', 'tabs', 'menu', 'how to', 'find', 'where', 'settings', 'gear', 'live tab'],
    content: `**Bottom tabs**, left to right: GROUPS · PLAY NOW · RANKINGS · HELP. That is the whole app. LIVE slots in while a match is running and ADMIN only for administrator accounts.

**GROUPS**: your home base
- Your groups, NEW GROUP, ALL PLAYERS
- Lightning bolt (top right): join a live match by code
- Gear (top right): Settings

**PLAY NOW**: beacons
- See who is at a court, post your own beacon, chat
- The icon glows and shows a count when other players have beacons up, and the label turns red while one of your own is live

**LIVE**: appears between PLAY NOW and RANKINGS only while a match is active (one you started, one you joined by code, or one you sent with **TEXT MATCH**). Tapping it reopens that match screen. It disappears again when the match is finished.

**RANKINGS**: standings and history
- Leaderboard, podium, session picker, game history, head to head

**ADMIN**: a gear icon before HELP, for administrator accounts only

**HELP**: the **i** icon at the far right: this tutor and the how-to videos

**Screens you reach from GROUPS**
- Tap a group to open the **roster** (add players, IMPORT A LIST OF PLAYERS, ROTATING PARTNERS / FIXED TEAMS, CREATE MATCH)
- CREATE MATCH opens **MATCH SETUP**; GENERATE MATCH opens the **schedule and scoring** screen
- ALL PLAYERS: every player, edit, merge, quick match

**Settings** (GROUPS, then the gear), top to bottom
- ACCOUNT: who is signed in (your name, email and phone)
- APPEARANCE: **Dark Mode**
- SUBSCRIPTION: Current Plan, Upgrade to Pro / Subscribe to Pro / Manage Subscription, Restore Purchases
- SECURITY: **Change Password**, **Delete Account**, **Log Out**
- The app version is shown at the bottom

**Getting back**
- The arrow at the top left of the roster and schedule screens returns to GROUPS
- The home icon on RANKINGS does the same`,
  },

  {
    id: 'getting-started',
    title: 'Getting Started - Quick Start Guide',
    category: 'Getting Started',
    searchKeywords: ['getting', 'started', 'first', 'quick', 'start', 'tutorial', 'beginner', 'import'],
    content: `Your first session in about five minutes.

**1. Create your account**
- Open the app, tap "Don't have an account? Create one", enter first name, email and password, then tap CREATE ACCOUNT
- Enter your phone number when asked (or tap Skip for now)

**2. Make a group**
- GROUPS tab, then **NEW GROUP**: pick the court, name it (for example "Tuesday Crew"), then **CREATE**

**3. Add your players**
- Type each name in "Search or add player...", tap the ♂ / ♀ button to set gender, then tap **+**
- Have a list already? Tap **IMPORT A LIST OF PLAYERS** and paste it, one name per line
- Tap **SAVE** at the top right

**4. Create the match**
- Choose **ROTATING PARTNERS** or **FIXED TEAMS**
- **CREATE MATCH**, set courts, rounds and round types, then **GENERATE MATCH**

**5. Play and score**
- Turn on the **SCORE** switch and type the scores as games finish
- Tap **STANDINGS** any time to see who is winning
- Tap **TEXT MATCH** to send the matchups to everyone
- Want everyone scoring from their own phone? Tap **LIVE**, then Create Shared Match, and share the code

**6. Save**
- **FINISH MATCH**, add the title, court and date, then **CONFIRM SAVE**
- Your 30-day Pro trial starts now

**7. See the results**
- **RANKINGS** tab: podium, standings, game history

**Watch instead:** the how-to videos at the top of this Help tab walk through each step in under two minutes.

Questions: mcallpl@gmail.com`,
  },

  {
    id: 'settings',
    title: 'Account Settings & Preferences',
    category: 'Account',
    searchKeywords: ['settings', 'preference', 'profile', 'account', 'dark mode', 'change password', 'log out', 'logout', 'version', 'security', 'delete account'],
    content: `Settings live on the **GROUPS** tab: tap the **gear icon** at the top right. The sections, top to bottom:

**ACCOUNT**
- Shows who is signed in: your name, plus your email and phone if they are on file

**APPEARANCE**
- **Dark Mode**: switch between the dark and light themes. The choice is remembered on this device.

**SUBSCRIPTION**
- **Current Plan**: Free, Trial or Pro
- Before your trial starts: "your N days start with your first saved match"
- "Trial Ends In N days" while a trial is running
- **Upgrade to Pro** (Free), **Subscribe to Pro** (while a trial runs) or **Manage Subscription** (Pro)
- **Restore Purchases**: pick up a subscription bought on another device. This row is in the iPhone and Android app only; the web app shows a note saying Pro is bought in the app instead.

**SECURITY**
- **Change Password**: enter your current password, then the new one twice (6+ characters), and tap **Update**
- **Delete Account**: permanently deletes your account after you enter your password and tap **Delete Forever** (see "Delete My Account")
- **Log Out**: signs you out on this device

The app version number is shown at the bottom of Settings.

**Not in Settings (yet)**
- Editing your name, email or phone. Email mcallpl@gmail.com and we will change it for you.
- Notification preferences. The app does not send push notifications.
- Your DUPR and home court belong to your player entries, not your login; edit them under ALL PLAYERS`,
  },

  {
    id: 'troubleshooting',
    title: 'Troubleshooting & FAQs',
    category: 'Support',
    searchKeywords: ['help', 'problem', 'error', 'troubleshoot', 'faq', 'not working', 'support', 'contact', 'email', 'sync', 'offline', 'not synced', 'reconnecting', 'swap locked', 'host only'],
    content: `**Can't sign in**
- Try your phone number if email fails, and the other way round
- Use **Forgot Password?**. The reset code arrives by text.
- Check your internet connection

**Scores not showing on another phone**
- Both phones must be in the same live match: the LIVE bar with the same code should be visible at the top of the match screen on both phones
- Look at the LIVE bar. "N not synced" or **RECONNECTING** means your phone is waiting for a connection; keep scoring and it sends them when it reconnects (see "Live Match Sync Status")
- Reopen the LIVE tab to reconnect

**"Host Only"**
- In a live shared match only the host can shuffle, swap, rename or add players, or name courts. Ask the host to make the change.

**Match not in Rankings**
- Only saved matches count: FINISH MATCH, then CONFIRM SAVE
- Rankings need scores; a match with the SCORE switch off saves nothing
- Check the session picker. You may be looking at one session instead of ALL TIME.

**"Swap Locked"**
- In **Fixed Teams**, players cannot be swapped once any score has been entered. Clear the scores first.

**"Locked" when swapping**
- In **Rotating Partners**, you can only swap two players in the same round

**Can't start playoffs**
- Round robin must be fully scored and you need 8+ players (Rotating) or 4+ teams (Fixed Teams)

**No beacons showing**
- Beacons show without location ("Showing all beacons"), so if the list is empty, nobody has one up right now
- Beacons expire after the duration their creator chose (30 min to 2 hours)
- Turn on Location Services for PlayPBNow if you want them sorted by distance

**Can't create a third group**
- Free accounts are limited to 2 groups. Upgrade to Pro or delete a group you no longer use.

**Subscription not recognized**
- Settings, then **Restore Purchases**, then sign out and back in

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
    searchKeywords: ['privacy', 'data', 'policy', 'legal', 'protection', 'terms', 'location'],
    content: `PlayPBNow collects only what the app needs to run.

**What we store**
- Your account: name, email, phone number, password (hashed)
- The players you add: names, gender, optional phone, DUPR and home court
- Match schedules, scores and saved results
- Beacons you post: the court, your message and the time it expires
- Your location, only while the PLAY NOW tab is open, to sort beacons by distance from you
- Your location is also read by the court pickers (choosing a group's location or a Home Court) to list the nearest courts first: silently if you have already allowed it, or when you tap **Show nearest first**

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
1. **GROUPS** tab, then the **gear icon**, then **SETTINGS**
2. Under SECURITY tap **Delete Account**
3. Enter your password and tap **Delete Forever**

**From this page**
- Tap the **Delete My Account** button below, enter your password and tap **Permanently Delete**

**What is deleted**
- Your login (email, phone, password)
- Your groups and the players you created
- Your saved matches, scores and rankings
- Any beacons you posted

**What is kept**
- App Store / Google Play purchase records, which Apple and Google hold. Cancel an active subscription in your store account first, or it will keep renewing.
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
- **Password reset**: a 6-digit code, only when you tap Forgot Password?
- **Universal profile claim**: a 6-digit code, only when a player asks to claim their record
- **Administrator messages**: occasionally, from the app's administrators

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
