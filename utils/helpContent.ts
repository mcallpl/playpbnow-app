export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  content: string;
  searchKeywords: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  // ============================================================================
  // MATCH CREATION & PLAYING
  // ============================================================================
  {
    id: 'create-match',
    title: 'How to Create a Match',
    category: 'Match Management',
    searchKeywords: ['create', 'match', 'new', 'start', 'game', 'tournament'],
    content: `Creating a Match in PlayPBNow:

1. **Go to the PlayNow Tab**
   - Tap the 🏸 icon at the bottom

2. **Select Match Type**
   - Casual Match: Quick pickup game with rotating partners
   - Tournament: Structured competition with round-robin or brackets
   - Fixed Teams: Match against specific opponents

3. **Enter Match Details**
   - Match Title: Name your match (optional)
   - Number of Players: Select 4, 6, 8 players
   - Court: Choose your court location
   - Round Robin Count: (For tournaments) how many rounds before playoffs

4. **Select Players**
   - Choose from your player roster
   - Search for players by name
   - Players must be set up in the "Players" tab first

5. **Start the Match**
   - Tap "Create Match"
   - Match will appear in your Game Screen
   - Share the match code to invite collaborators

**Pro Tip:** Set up your players in advance in the "Players" tab to make match creation faster.`,
  },

  {
    id: 'live-scoring',
    title: 'How to Score a Match',
    category: 'Match Management',
    searchKeywords: ['scoring', 'score', 'enter', 'points', 'game', 'match'],
    content: `Scoring a Match:

1. **Open Your Match**
   - Go to the "Game" tab
   - Tap the match you want to score

2. **Enter Scores**
   - For each game: Enter Team 1 score, then Team 2 score
   - Tap the score field to edit
   - Scores must be numbers (e.g., 11, 12, 15)

3. **Score Automatically Syncs**
   - If you have collaborators, scores sync in real-time
   - Both devices see updates instantly
   - Scores are saved to the server

4. **Complete the Match**
   - Once all games are scored, tap "Finish Match"
   - Match is archived and stats are updated
   - You can view final results and statistics

5. **Troubleshooting**
   - If scores aren't syncing, check your internet connection
   - Refresh to pull latest scores from server
   - Tap "Sync Now" to manually update

**Pro Tip:** As the match owner, you can edit scores anytime. Collaborators can enter scores but can't edit the match details.`,
  },

  {
    id: 'collaborative-scoring',
    title: 'Collaborative Scoring (Real-Time)',
    category: 'Match Management',
    searchKeywords: ['collaborate', 'collaborator', 'shared', 'sync', 'join', 'real-time'],
    content: `Scoring Together in Real-Time:

1. **As Match Creator:**
   - Create a match from the PlayNow tab
   - Share the Match Code with collaborators
   - They join using the code

2. **As a Collaborator:**
   - Tap "Join Match" from PlayNow tab
   - Enter the Match Code
   - Tap "Join"
   - You'll immediately see the match and can start scoring

3. **During the Match:**
   - Both of you score games independently
   - Scores sync instantly across devices
   - See connected users count at top
   - No need to refresh - changes appear automatically

4. **Real-Time Features:**
   - Live player count shows who's connected
   - Automatic reconnection if connection drops
   - Scroll to catch up on games you missed
   - All scores merge automatically

5. **Match Completion:**
   - Either collaborator can finish the match
   - Match goes to completed state
   - Stats are finalized
   - Match is archived

**Pro Tip:** Perfect for tournament operations where one person manages bracket while another scores games. Scales to multiple scorers!`,
  },

  {
    id: 'match-sharing',
    title: 'Share & Report Match Results',
    category: 'Match Management',
    searchKeywords: ['share', 'report', 'result', 'export', 'export match'],
    content: `Sharing Match Results:

1. **Generate Match Report**
   - Go to the "Game" tab
   - Open your completed match
   - Tap "Share" button

2. **View Report Preview**
   - See HD match report with scores, players, winners
   - Check final standings and statistics
   - Verify all player names are correct

3. **Share Options**
   - Copy link to share via text, email, social
   - Download as HD image (Pro feature)
   - Export to PDF (Pro feature)

4. **Clean Match Reports (Pro)**
   - No PlayPBNow watermark on exports
   - Professional formatting
   - Perfect for tournaments or leagues

5. **Who Can See Your Matches**
   - Match reports are public links
   - Anyone with the link can view
   - Scores update automatically if match is still active

**Pro Tip:** Use match reports to build your playing history and showcase tournament results!`,
  },

  // ============================================================================
  // BEACONS - CRITICAL FEATURE
  // ============================================================================
  {
    id: 'beacons-intro',
    title: 'What Are Beacons?',
    category: 'Beacons',
    searchKeywords: ['beacon', 'what', 'looking', 'need', 'players'],
    content: `Beacons Explained:

A Beacon is your way to find players INSTANTLY when you need them!

**The Problem They Solve:**
- You're at the court but need 2 more players
- You want to play but don't have a full group
- You need fill-ins for a tournament

**The Solution:**
- Activate a Beacon that broadcasts "I need players NOW"
- Nearby players see your beacon in real-time
- They can respond with 1 tap
- You pick who to play with

**What Makes Beacons Powerful:**
✓ Real-time location sharing (if you enable location)
✓ Shows player skill level and how many games they've played
✓ See who's nearby RIGHT NOW
✓ No long planning needed
✓ Casual or serious play

**Two Ways to Use Beacons:**
1. **You're Looking for Players:**
   - Go to PlayNow tab
   - Tap "I'm Here — Come Play!"
   - Your beacon activates
   - Players find you

2. **You Want to Find Games:**
   - Go to PlayNow tab
   - See all active beacons near you
   - Tap one to express interest
   - Match organizer invites you to play

**Privacy & Safety:**
- Share your location only if you're comfortable
- You control who joins your game
- Can deactivate beacon anytime
- Your location is only visible to nearby players`,
  },

  {
    id: 'create-beacon',
    title: 'How to Activate a Beacon',
    category: 'Beacons',
    searchKeywords: ['beacon', 'activate', 'create', 'broadcast', 'need'],
    content: `Activating a Beacon (Finding Players):

1. **Go to PlayNow Tab**
   - Tap the 🏸 icon at bottom

2. **Select Your Beacon Message**
   - "I Need Players" - Looking for 1-3 more
   - "I'm Here — Come Play!" - At court, accepting responses
   - (Your beacon message appears to nearby players)

3. **Enable Location (Optional)**
   - More precise for nearby players
   - Don't worry if you skip it - still works
   - Can update location anytime

4. **Tap the Beacon Button**
   - Your beacon is now LIVE
   - Players within range see it
   - Real-time updates as people respond

5. **Watch for Responses**
   - See notification when someone responds
   - View their profile and stats
   - Tap "Invite to Play" to confirm

6. **Create or Join Match**
   - Once you have players, tap their response
   - Create a match together
   - Start playing!

7. **Deactivate Beacon**
   - Tap beacon button again to turn off
   - Can reactivate anytime
   - Tap "Done" to close beacon view

**Live Beacon Features:**
- See player skill ratings
- View match history count
- See how far away they are
- Know if they've played together before

**Pro Tip:** Beacons work best when you're already at the court. Show up, activate, and fill your game in minutes!`,
  },

  {
    id: 'respond-beacon',
    title: 'How to Respond to a Beacon',
    category: 'Beacons',
    searchKeywords: ['beacon', 'respond', 'interest', 'want', 'play', 'find'],
    content: `Responding to Beacons (Finding Games):

1. **See Nearby Games**
   - Go to PlayNow tab
   - Look at "Available Beacons" section
   - Scroll to see all nearby matches

2. **What You'll See:**
   - Game organizer's name
   - Message: "I Need 2 Players" or "I'm Here — Come Play!"
   - How many minutes away
   - Court location
   - Their skill rating

3. **Tap a Beacon to View Details**
   - See the full beacon card
   - View organizer's profile
   - See their stats and history
   - Check the court and time

4. **Express Interest**
   - Tap "Interested"
   - You'll be notified when they respond
   - They can see you're interested

5. **Get Invited**
   - Organizer will invite you to join
   - You'll get a notification
   - Tap to accept invitation

6. **Join the Match**
   - You're now part of the game
   - Tap to open match details
   - Start playing!

7. **If You Change Your Mind**
   - Withdraw interest anytime
   - No commitment - completely optional
   - Organizer won't be notified

**Tips for Success:**
- Respond quickly - spots fill fast!
- Complete your player profile so others see your level
- Enable notifications to get invites instantly
- Be ready to play within 15 minutes

**Pro Tip:** Turn on push notifications so you're alerted immediately when someone needs players!`,
  },

  {
    id: 'beacon-messaging',
    title: 'Beacon Chat & Communication',
    category: 'Beacons',
    searchKeywords: ['beacon', 'chat', 'message', 'talk', 'communicate'],
    content: `Communicating with Beacon Players:

1. **Real-Time Beacon Chat**
   - When you activate a beacon, others can chat with you
   - See messages from interested players
   - Respond in the chat

2. **Ask Questions Before Playing**
   - "What level are you?"
   - "How many games do you play?"
   - "What time exactly?"

3. **Coordination**
   - Use chat to confirm timing
   - Discuss which courts
   - Plan skill levels

4. **Safety & Respect**
   - Keep conversation friendly
   - Confirm details before playing
   - If someone seems off, pass

5. **After Playing**
   - Rate players after the game
   - Leave feedback on their skills
   - Helps build reputation

**Pro Tip:** Use chat to build relationships with regular players in your area. Great for forming ongoing playing groups!`,
  },

  // ============================================================================
  // GROUPS
  // ============================================================================
  {
    id: 'groups-intro',
    title: 'What Are Groups?',
    category: 'Groups',
    searchKeywords: ['group', 'what', 'team', 'roster', 'organization'],
    content: `Groups Explained:

A Group is a collection of players that you organize and manage together.

**Why Use Groups:**
- Keep your regular playing partners organized
- Track stats for a group of friends
- Run tournaments or leagues
- Manage multiple teams

**Group Features:**
✓ Organize players into logical groups
✓ Track group-level statistics
✓ Create matches with group members
✓ See leaderboards within your group
✓ Manage group members and roles

**Group Types:**
1. **Casual Group:** Friends who play together
2. **League Team:** Organized competitive team
3. **Tournament Group:** Players competing in an event
4. **Pickup Group:** Regular court regulars

**Group Roles:**
- **Owner:** Full control, can edit everything
- **Manager:** Can create matches, edit group
- **Member:** Can play in matches, view stats

**Group Statistics:**
- Win/loss record by player
- Head-to-head records
- Playing frequency
- Partnership win rates

**Privacy:**
- Groups can be private or public
- Control who can join
- Manage member access`,
  },

  {
    id: 'create-group',
    title: 'How to Create a Group',
    category: 'Groups',
    searchKeywords: ['create', 'group', 'new', 'team'],
    content: `Creating a Group:

1. **Go to the Groups Tab**
   - Tap the 👥 icon at bottom

2. **Tap "Create Group"**
   - Or "+" button if no groups exist

3. **Enter Group Details**
   - Group Name: "Tuesday Night Regulars", "Work Team", etc.
   - Description: Brief info about the group
   - Privacy: Public (anyone can find) or Private

4. **Add Group Members**
   - Search for players by name
   - Tap to add them
   - Invite them via SMS or link
   - They'll accept and join

5. **Set Group Photo** (Optional)
   - Upload a group logo or photo
   - Makes group recognizable

6. **Create the Group**
   - Tap "Create Group"
   - You're now the group owner
   - Members will receive invitations

7. **Invite More Members**
   - Go to group settings
   - Tap "Invite Members"
   - Share link or invite by SMS
   - Customize invitation message

**After Creating:**
- View group leaderboard
- Create matches with group members
- Manage member permissions
- Archive or delete group anytime

**Pro Tip:** Create separate groups for different playing circles - casual vs. competitive, work friends vs. league team, etc.`,
  },

  {
    id: 'manage-group',
    title: 'How to Manage Your Group',
    category: 'Groups',
    searchKeywords: ['group', 'manage', 'members', 'edit', 'settings'],
    content: `Managing Your Group:

1. **Access Group Settings**
   - Go to Groups tab
   - Tap your group name
   - Tap "Group Settings" (gear icon)

2. **Edit Group Details**
   - Change name, description, photo
   - Update privacy setting
   - Change group color/theme

3. **Manage Members**
   - View all members and their stats
   - Promote/demote member roles
   - Remove inactive members
   - Resend invitations

4. **Create Matches**
   - Tap "New Match" in group
   - Select players from group
   - Much faster than adding manually

5. **View Group Statistics**
   - Win/loss records by player
   - Partnership standings
   - Most frequent playing pairs
   - Head-to-head records

6. **Group Leaderboard**
   - See ranking of all members
   - Filter by wins, matches played, win %
   - Compare partnerships

7. **Group Messages**
   - Post group announcements
   - Schedule upcoming matches
   - Discuss group rules

8. **Leave or Archive**
   - If you're a member: tap "Leave Group"
   - If you're owner: tap "Archive Group"
   - Can unarchive if needed

**Pro Tip:** Use group matches to create a formal record of results. Perfect for league play or tournament tracking!`,
  },

  // ============================================================================
  // PLAYERS
  // ============================================================================
  {
    id: 'players-setup',
    title: 'How to Set Up Your Players',
    category: 'Players',
    searchKeywords: ['player', 'setup', 'create', 'profile', 'new player'],
    content: `Setting Up Your Player Roster:

1. **Go to the Players Tab**
   - Tap the 👤 icon at bottom

2. **Tap "Add Player" or "+"**
   - Create a new player profile

3. **Enter Player Information**
   - First Name: Required
   - Last Name: Optional but recommended
   - Phone Number: Optional (for SMS invites)
   - Skill Level: 2.5, 3.0, 3.5, 4.0+
   - Home Court: Their preferred court
   - DUPR Rating: If they have one (optional)

4. **Player Photo** (Optional)
   - Add a photo to identify quickly
   - Tap camera icon to take or upload

5. **Save Player**
   - Tap "Create Player"
   - Player appears in your roster
   - Ready to use in matches

6. **Edit Existing Player**
   - Tap player from list
   - Tap "Edit Player"
   - Update any information
   - Changes apply to all matches

7. **Player Statistics**
   - After matches: see their stats
   - Wins, losses, win percentage
   - Partnerships formed
   - Playing frequency

**Player Tips:**
- Create players for your regular group first
- Add visiting players for one-off matches
- Skill level helps with stat tracking
- Phone number enables SMS invites

**Pro Tip:** Set up players BEFORE creating matches. Makes match creation much faster!`,
  },

  {
    id: 'player-stats',
    title: 'Understanding Player Statistics',
    category: 'Players',
    searchKeywords: ['stats', 'statistics', 'leaderboard', 'ranking', 'player'],
    content: `Player Statistics Explained:

**Individual Stats (Per Player):**
- **Wins:** Total matches won
- **Losses:** Total matches lost
- **Win %:** (Wins / Total Matches) × 100
- **Matches Played:** Total number of matches
- **Playing Level:** 2.5, 3.0, 3.5, 4.0+

**Partnership Stats:**
- **Most Common Partner:** Who they play with most
- **Partnership Win %:** How well they play together
- **Head-to-Head:** vs. specific opponents
- **Favorite Court:** Where they play most

**Leaderboard Ranking:**
- Sorted by Win %
- Requires minimum 3 matches
- Shows skill progression
- Groups separate from overall

**What Stats Tell You:**
- Skill level: Higher win % = stronger player
- Consistency: More matches = more dedicated
- Partnerships: Who works well together
- Trends: Are they improving?

**Viewing Stats:**
1. **Individual Player:** Tap player name
2. **Group Leaderboard:** In group, tap "Leaderboard"
3. **Overall Leaderboard:** Tab at bottom (Leaderboard)
4. **Head-to-Head:** Compare two players

**Interpreting Win Percentages:**
- 60%+ = Consistently winning
- 50% = Balanced play
- Below 50% = Learning player
- Note: Skill levels affect expectations

**Pro Tip:** Use stats to identify great partnerships - play people you win with often!`,
  },

  {
    id: 'player-merging',
    title: 'Merge Duplicate Players',
    category: 'Players',
    searchKeywords: ['merge', 'duplicate', 'combine', 'same', 'player'],
    content: `Merging Duplicate Players:

Why Merge?
- Same person created twice by mistake
- Person has two phone numbers
- Consolidate stats into one profile

1. **Find Duplicates**
   - Go to Players tab
   - Look for same names in list
   - Duplicates show with merge icon

2. **Start Merge Process**
   - Tap player name
   - Tap "Merge Players"
   - Or long-press and select "Merge"

3. **Select Duplicate**
   - Choose which player is duplicate
   - Review both profiles

4. **Confirm Merge**
   - All stats are combined
   - All matches updated
   - Duplicate profile deleted
   - Single master profile remains

5. **Result:**
   - Combined win/loss record
   - All matches from both included
   - One unified player profile
   - Statistics properly consolidated

**Before Merging:**
- Verify it's the same person
- Check phone numbers and details
- Review their match history
- If unsure, ask the player

**After Merging:**
- Stats update automatically
- Leaderboard position may change
- All partnerships consolidated
- Can't undo - be careful!

**Pro Tip:** Regularly review your player list for duplicates. Clean roster = accurate stats!`,
  },

  // ============================================================================
  // ACCOUNT & AUTHENTICATION
  // ============================================================================
  {
    id: 'login',
    title: 'How to Log In',
    category: 'Account',
    searchKeywords: ['login', 'sign in', 'password', 'email', 'phone'],
    content: `Logging In to PlayPBNow:

1. **Open the App**
   - If not logged in, you'll see login screen

2. **Enter Your Credentials**
   - Email address OR phone number
   - Your password
   - Either email or phone works for login

3. **Tap "Sign In"**
   - You'll be logged in
   - If it's your first time, phone verification required
   - See "Phone Verification" section below

4. **Forgot Password?**
   - Tap "Forgot Password?"
   - Enter your phone number
   - Receive 6-digit code via SMS
   - Create new password
   - Log in with new password

5. **Stay Logged In**
   - You'll stay logged in after first login
   - Close app anytime - session saved
   - Only need to log out manually

**Troubleshooting:**
- Wrong password? Check caps lock
- Email not working? Try phone number
- Can't receive SMS code? Check reception
- Account locked? Contact support

**Security Tips:**
- Don't share your password
- Use strong password (8+ characters)
- Log out on shared devices
- Check "Remember Me" only on personal devices

**Pro Tip:** Use email login if you change phones frequently - it's more portable!`,
  },

  {
    id: 'registration',
    title: 'How to Sign Up',
    category: 'Account',
    searchKeywords: ['signup', 'register', 'create', 'account', 'new'],
    content: `Creating Your PlayPBNow Account:

1. **Open the App**
   - You'll see the login screen
   - Tap "Create Account"

2. **Enter Your Information**
   - First Name: Required
   - Last Name: Optional
   - Email Address: Required (for login)
   - Phone Number: Optional (for SMS features)
   - Password: 6+ characters

3. **Create Account**
   - Tap "Create Account"
   - You'll be logged in automatically

4. **Phone Verification** (May be required)
   - SMS code sent to your phone
   - Enter 6-digit code
   - Phone number verified

5. **You're Ready!**
   - Go straight to setup your players
   - Create your first match
   - Start playing!

**Account Information:**
- Email is your main login identifier
- Phone number enables SMS invites
- Can add phone later if you skip
- Can update info anytime in settings

**What Happens Next:**
1. Set up your player roster
2. Invite friends to the app
3. Create your first match
4. Start playing!

**Pro Tip:** Add your phone number during signup to unlock SMS features - send paper-free invites to players without the app!`,
  },

  {
    id: 'phone-verification',
    title: 'Phone Verification & SMS',
    category: 'Account',
    searchKeywords: ['phone', 'verify', 'sms', 'text', 'number'],
    content: `Phone Verification & SMS Features:

**Why Phone Verification?**
- Unlock SMS invite features
- Send matches to anyone (even non-app users)
- Receive SMS notifications
- Better security

**First-Time Verification:**
1. Sign up or log in
2. You'll be prompted for phone number
3. Receive SMS with 6-digit code
4. Enter code to verify
5. Done! Phone verified

**Verify an Existing Account:**
1. Go to Account Settings
2. Tap "Phone & SMS"
3. Enter phone number
4. Receive SMS code
5. Enter code to verify

**Changing Your Phone Number:**
1. Go to Account Settings
2. Tap "Phone & SMS"
3. Enter new phone number
4. Receive SMS code on new number
5. Verify to switch numbers

**SMS Features:**
- Invite any player via SMS (they don't need the app)
- Send match results via text
- Receive notifications about your matches
- Control SMS frequency in settings

**SMS Credit System:**
- Free: 5 SMS per month
- Pro: Unlimited SMS
- Buy additional SMS: Use SMS credit packages
- Credit never expires

**Privacy & Frequency:**
- Control which SMS you receive
- Opt out of certain notifications
- Your number only visible to you
- Never shared with other players

**Pro Tip:** Turn on SMS notifications to stay updated about beacons and match invitations!`,
  },

  // ============================================================================
  // INVITES & MATCHING
  // ============================================================================
  {
    id: 'invites-intro',
    title: 'What Are Invites?',
    category: 'Invites',
    searchKeywords: ['invite', 'what', 'send', 'sms', 'player pool'],
    content: `Invites Explained:

An Invite is how you ask players to join your matches.

**Invite Types:**
1. **In-App Invite:** To players already in the app
2. **SMS Invite:** Via text message to any phone number
3. **Email Invite:** Link sent via email

**Where Invites Come From:**
- Your player roster: Players you created
- Player pool: 500+ players available to invite
- Your groups: Members of your groups
- Manual entry: Add any player info

**Invite Workflow:**
1. Create a match
2. Select players to invite
3. Send invitation
4. They accept or decline
5. Match starts when ready

**Response Options:**
- Accept: "Yes, I'll play"
- Decline: "Can't make it"
- Maybe: "I'm interested"

**Invite Features:**
✓ Send to multiple players at once
✓ See who accepted/declined
✓ Resend to no-responses
✓ SMS shows match preview
✓ They don't need the app to receive SMS

**Player Pool:**
- 500+ available players
- Browse by skill level
- See their profile & stats
- Add to roster with one tap
- Only invite those who want to play

**Pro Tip:** Build a core group of reliable players you regularly invite - they know your game!`,
  },

  {
    id: 'send-invites',
    title: 'How to Send Invites',
    category: 'Invites',
    searchKeywords: ['send', 'invite', 'sms', 'text', 'match'],
    content: `Sending Invites to Players:

**Method 1: In-App Players**

1. **Create a Match**
   - Go to Game tab
   - Tap "Create Match"
   - Set match details

2. **Select Players to Invite**
   - Tap "Add Players"
   - Choose from your roster
   - Select all needed players

3. **Send In-App Invite**
   - Tap "Send Invites"
   - They're notified immediately
   - Can accept/decline in app

**Method 2: SMS Invite (Text Message)**

1. **Create a Match**
   - Set up match details
   - Get match code

2. **Go to Invites Tab**
   - Tap the 💬 icon

3. **Create New Invite**
   - Choose "Send via SMS"
   - Select players or enter phone
   - Edit SMS text if you want

4. **Review SMS Preview**
   - See exact message they'll receive
   - Includes match details & link
   - Confirm it looks good

5. **Send SMS**
   - Tap "Send"
   - SMS delivered to their phone
   - They click link to respond
   - Don't need app to respond

**SMS Features:**
- Works for anyone with a phone
- No app required to receive
- Direct response from text
- Automatic RSVP tracking

**Method 3: From Player Pool**

1. **Go to Invites Tab**
   - Tap 💬 icon

2. **Browse Player Pool**
   - See 500+ available players
   - Filter by level, skill, experience
   - Read their profile

3. **Add to Roster** (Optional)
   - Tap player
   - Tap "Add to My Roster"
   - Now in your player list

4. **Send Invite**
   - SMS or in-app
   - They respond
   - Add to match

**Pro Tips:**
- SMS invites have best response rate - send 24hrs before
- Include player contact info - easier for them
- Customize message - personal touch gets better response
- For reliable players, store their number in your roster

**SMS Credit:**
- Free users: 5 SMS/month
- Pro users: Unlimited SMS
- Buy credits if you run out
- Cost: $1 for 20 SMS`,
  },

  {
    id: 'manage-invites',
    title: 'Manage Invites & Responses',
    category: 'Invites',
    searchKeywords: ['manage', 'invite', 'response', 'track', 'status'],
    content: `Managing Your Invites:

**Tracking Sent Invites:**

1. **Go to Invites Tab**
   - Tap 💬 icon at bottom

2. **View Your Invites**
   - See all sent invites
   - Shows sent date and time
   - Lists each player's response

3. **Response Status:**
   - ✅ Accepted: Player will come
   - ❌ Declined: Player can't make it
   - ⏳ No Response: Still waiting
   - ❓ Maybe: Interested, deciding

**Re-Invite Players:**

1. **Find No-Responders**
   - Filter to show "No Response"
   - Send reminder SMS
   - Give them more time if needed

2. **Follow Up**
   - Resend invite anytime
   - Include new match details
   - Update time or location if changed

**Invite Details:**

1. **Tap Individual Invite**
   - See all players invited
   - Check each person's response
   - View response timestamps

2. **Modify SMS Text**
   - Edit message before sending
   - Make it personal
   - Add last-minute details

**Track RSVPs:**

- See total responses
- Count confirmed players
- Check if you have enough
- Reschedule if needed

**Handling Declines:**

1. **If Player Declines:**
   - Invite someone else
   - Can re-invite declined player later
   - Try backup players

2. **No Response After 24hrs:**
   - Send reminder SMS
   - Or invite someone else
   - Keep backup list ready

**Pro Tip:** Set a 24-hour response deadline - "Please confirm by 6pm". Helps you plan better!`,
  },

  // ============================================================================
  // LEADERBOARDS & STATS
  // ============================================================================
  {
    id: 'leaderboard',
    title: 'How to View Leaderboards',
    category: 'Leaderboards',
    searchKeywords: ['leaderboard', 'ranking', 'stats', 'compare'],
    content: `Understanding Leaderboards:

**Types of Leaderboards:**

1. **Overall Leaderboard**
   - Go to "Leaderboard" tab
   - All players across all matches
   - Ranked by win percentage
   - Requires 3+ matches

2. **Group Leaderboard**
   - Go to specific group
   - Tap "Leaderboard"
   - Only group members shown
   - Group-specific rankings

3. **Head-to-Head**
   - Compare any two players
   - See record vs each other
   - Partnership statistics
   - Trend over time

**Viewing Leaderboard:**

1. **Sort by:**
   - Win %: Best winning percentage
   - Total Wins: Most wins
   - Matches Played: Most active
   - Recent Performance: Last 10 matches

2. **Filter:**
   - By skill level
   - By group
   - Date range
   - Minimum matches (to qualify)

**What the Rankings Show:**
- Position: #1, #2, #3, etc.
- Player Name
- Win-Loss Record
- Win Percentage
- Matches Played
- Recent activity

**Interpreting Rankings:**
- Need 3+ matches to qualify
- Win % = skill level
- Tied on %, sorted by total wins
- Consistent play matters

**Head-to-Head Details:**
1. **Tap any player**
2. **Tap "Compare"**
3. **Select another player**
4. **See their record vs each other**
   - Overall record
   - Winning percentage
   - Games played together
   - Last match date

**Partnership Performance:**
- Who they play best with
- Combined win percentage
- Most frequent partner
- Recent partnership results

**Pro Tip:** Use leaderboards to spot your best partners - play those people more often!`,
  },

  // ============================================================================
  // BROADCAST & ADMIN
  // ============================================================================
  {
    id: 'broadcast',
    title: 'Broadcast Results & Announcements',
    category: 'Advanced',
    searchKeywords: ['broadcast', 'announce', 'results', 'admin'],
    content: `Broadcasting Match Results & News:

What is Broadcast?
- Send match results to all players
- Make announcements to your group
- Share tournament standings
- Celebrate wins

**Creating a Broadcast:**

1. **Go to Broadcast Tab**
   - Tap 📻 icon (if admin)

2. **Create New Post**
   - Tap "New Broadcast"
   - Write your message
   - Add match details

3. **Choose Recipients:**
   - All players
   - Specific group
   - Tournament participants

4. **Add Details:**
   - Match results
   - Player highlights
   - Tournament standings
   - Fun facts

5. **Post**
   - Players see notification
   - Appears in their feed
   - Can like/comment

**Broadcast Uses:**
- Tournament results
- Group announcements
- Match highlights
- Skill updates
- Schedule changes
- Celebration posts

**Tips:**
- Keep it short and snappy
- Include key stats
- Highlight great performances
- Update regularly during tournaments
- Engage with comments

**Pro Tip:** Use broadcasts to build community and keep everyone engaged!`,
  },

  // ============================================================================
  // PREMIUM & SUBSCRIPTION
  // ============================================================================
  {
    id: 'pro-features',
    title: 'What is PlayPBNow Pro?',
    category: 'Premium',
    searchKeywords: ['pro', 'premium', 'subscription', 'cost', 'features'],
    content: `PlayPBNow Pro - Premium Features:

**What You Get With Pro:**

✅ **Unlimited SMS Invites**
- Send unlimited text invites
- No credit limits
- Free plan: 5 SMS/month
- Pro: Send as many as you want

✅ **HD Match Reports**
- No watermark on reports
- Professional formatting
- Export as image or PDF
- Perfect for tournaments

✅ **Unlimited Collaborators**
- Free: Limited to 1-2 collaborators
- Pro: Score with unlimited people
- Great for tournaments
- Real-time multi-user scoring

✅ **Unlimited Groups**
- Free: 1-2 groups
- Pro: Create as many as needed
- Organize multiple leagues
- Run tournaments

✅ **Advanced Stats**
- Detailed leaderboards
- Partnership statistics
- Trend analysis
- Export data

✅ **Priority Support**
- Get help faster
- Direct support channel
- Faster response time

**Free vs Pro Comparison:**
- Free: 5 SMS/month, limited groups
- Pro: Unlimited SMS, unlimited groups
- Pro: HD exports, advanced features
- Pro: Multi-collaborator scoring

**Pricing:**
- Monthly: $4.99/month
- Annual: $29.99/year (2 months free!)
- Save 50% with annual plan

**Free Trial:**
- 3-day trial of all Pro features
- No credit card required
- Cancel anytime

**Restore Purchases:**
- Already subscribed? Tap "Restore Purchases"
- Restores on new device
- Re-active trial if expired

**Pro Tip:** Use free trial to test all features before committing!`,
  },

  {
    id: 'upgrade-to-pro',
    title: 'How to Upgrade to Pro',
    category: 'Premium',
    searchKeywords: ['upgrade', 'buy', 'pro', 'subscribe', 'payment'],
    content: `Upgrading to PlayPBNow Pro:

**Method 1: In-App Settings**

1. **Go to Account Settings**
   - Tap menu or settings icon

2. **Tap "Upgrade to Pro"**
   - See all Pro features
   - Choose monthly or annual

3. **Select Plan:**
   - Monthly: $4.99/month
   - Annual: $29.99/year (better value!)

4. **Review & Subscribe**
   - See what you get
   - Tap "Subscribe"
   - Complete payment

5. **Instant Activation**
   - Pro features available immediately
   - All limits removed
   - Enjoy unlimited features!

**Method 2: From Limit Dialog**

1. **Hit a limit** (e.g., SMS quota)
   - "You've reached your SMS limit"
   - "Upgrade to Pro for unlimited"

2. **Tap "Upgrade Now"**
   - Opens upgrade screen
   - Choose plan
   - Subscribe

**Method 3: Web (Desktop)**

1. **Go to PlayPBNow website**
2. **Log in to your account**
3. **Tap "Upgrade to Pro"**
4. **Choose plan and subscribe**

**Available Plans:**

| Plan | Price | SMS | Groups | Features |
|------|-------|-----|--------|----------|
| Free | Free | 5/mo | 2 | Basic |
| Pro Monthly | $4.99/mo | Unlimited | Unlimited | All |
| Pro Annual | $29.99/yr | Unlimited | Unlimited | All |

**Payment Methods:**
- Credit/debit card (Visa, Mastercard, Amex)
- iOS: Through Apple ID
- Web: Stripe checkout

**After Upgrading:**
- Immediate access to all Pro features
- No ads or restrictions
- Can cancel anytime
- Pro access across all devices

**Manage Subscription:**
- Change plan anytime
- Cancel anytime (no penalty)
- Download receipt
- Update payment method

**Pro Tip:** Annual plan saves $29.99 vs monthly - that's like getting 2 months free!`,
  },

  // ============================================================================
  // NAVIGATION & GENERAL TIPS
  // ============================================================================
  {
    id: 'navigation',
    title: 'App Navigation & Tabs',
    category: 'Getting Started',
    searchKeywords: ['navigate', 'tabs', 'menu', 'how to', 'find'],
    content: `PlayPBNow Navigation Guide:

**Bottom Tab Menu:**

🏠 **Home / PlayNow**
- Find games and beacons
- Activate your own beacon
- Browse nearby matches
- See your playing options

🎮 **Game**
- Your active matches
- Scoring screen
- Match results
- Complete matches

👥 **Groups**
- Your player groups
- Group stats
- Create/manage groups
- Group leaderboards

👤 **Players**
- Your player roster
- Add new players
- View player stats
- Merge duplicates

💬 **Invites**
- Send SMS invites
- Manage responses
- Player pool
- Track RSVPs

📊 **Leaderboard**
- Overall rankings
- Group rankings
- Head-to-head
- Statistics

📻 **Broadcast** (Admin only)
- Post announcements
- Share results
- Engage community

**Menu/Settings:**
- Tap your profile icon (top right)
- Account settings
- Upgrade to Pro
- Help & Support
- Sign Out

**Quick Navigation Tips:**

1. **To Create a Match:**
   - PlayNow tab → Select match type

2. **To Score a Match:**
   - Game tab → Tap match → Enter scores

3. **To Invite Players:**
   - Invites tab → Create invite → Choose players

4. **To Check Stats:**
   - Leaderboard tab or Players tab

5. **To Manage Group:**
   - Groups tab → Tap group → Settings

**Search Features:**
- Most tabs have search
- Search players by name
- Search groups by name
- Search match history

**Notifications:**
- You'll be notified of:
  - Match invitations
  - Beacon responses
  - Group announcements
  - New matches nearby

**Pro Tip:** Turn on push notifications to stay updated with matches and opportunities!`,
  },

  {
    id: 'getting-started',
    title: 'Getting Started - Quick Start Guide',
    category: 'Getting Started',
    searchKeywords: ['getting', 'started', 'first', 'quick', 'start'],
    content: `PlayPBNow Quick Start (5 Minutes):

**Step 1: Create Account** (1 min)
1. Open app → "Create Account"
2. Enter email & password
3. Verify phone (SMS)
4. You're in!

**Step 2: Set Up Players** (2 min)
1. Go to Players tab
2. Tap "Add Player"
3. Enter names of people you'll play with
4. Skip photos for now

**Step 3: Create Your First Match** (1 min)
1. Go to PlayNow tab
2. Tap "Casual Match" or "Tournament"
3. Select your players
4. Tap "Create Match"

**Step 4: Score the Match** (1 min)
1. Go to Game tab
2. Tap your match
3. Enter scores for each game
4. Tap "Finish Match"

**You're Done!**
- Stats automatically tracked
- Ready to create more matches
- Explore beacons & invites

**What's Next:**
1. Try sending SMS invites (Invites tab)
2. Activate a beacon (PlayNow tab)
3. Create a group (Groups tab)
4. Check leaderboards (Leaderboard tab)

**Common First Steps:**
- Add more players to your roster
- Invite friends to the app
- Create matches with friends
- Build up your match history

**Need Help?**
- This help system is searchable
- Search by topic or keyword
- All features explained above
- Contact support if stuck

**Pro Tips for Beginners:**
1. Set up all your regular playing partners upfront
2. Create matches before playing
3. Score matches immediately (don't forget!)
4. Enable SMS to invite friends without app
5. Join beacons to play new people

Let's play! 🏸`,
  },

  {
    id: 'settings',
    title: 'Account Settings & Preferences',
    category: 'Account',
    searchKeywords: ['settings', 'preference', 'profile', 'account'],
    content: `Managing Your Account Settings:

**Access Settings:**
1. Tap profile icon (top right)
2. Tap "Settings"
3. Or tap "Account Settings"

**Profile Settings:**

- **Name:** Edit first/last name
- **Email:** View your email address
- **Phone:** Add or change phone number
- **Photo:** Upload profile photo
- **Bio:** Write about yourself

**Privacy Settings:**

- **Profile Visibility:** Public or private
- **Share Location:** On/off for beacons
- **Notifications:** Control what you get notified about
- **Data:** What info is shared

**SMS & Notifications:**

- **SMS Notifications:** On/off
- **Push Notifications:** On/off
- **Email Notifications:** Digest/real-time/off
- **Frequency:** How often you get notified

**Playing Preferences:**

- **Home Court:** Your preferred court
- **Skill Level:** Your rating (2.5-4.0+)
- **DUPR Rating:** If you have one
- **Time Zone:** For scheduling

**Payment & Subscription:**

- **Manage Subscription:** Upgrade/downgrade
- **Billing History:** View past payments
- **Payment Method:** Update credit card
- **Cancel Pro:** If you need to

**Data & Privacy:**

- **Export Data:** Download all your info
- **Delete Account:** Permanently delete
- **Privacy Policy:** Legal stuff
- **Terms of Service:** What you agreed to

**App Preferences:**

- **Theme:** Light/dark mode
- **Language:** English (currently)
- **Version:** App version info

**Logout & Sessions:**

- **Logout:** Sign out on this device
- **Logout Everywhere:** Sign out all devices
- **Sessions:** Devices logged in

**Pro Tip:** Review your privacy settings if you're concerned about location sharing for beacons!`,
  },

  {
    id: 'troubleshooting',
    title: 'Troubleshooting & FAQs',
    category: 'Support',
    searchKeywords: ['help', 'problem', 'error', 'troubleshoot', 'faq', 'not working'],
    content: `Common Issues & Solutions:

**Can't Log In:**
- Check internet connection
- Verify email/phone is correct
- Check caps lock on password
- Reset password if needed
- Try clearing app cache

**Scores Not Syncing:**
- Check internet connection
- Force close and reopen app
- Tap "Sync Now" in game
- Check with collaborator
- Verify match is still active

**SMS Not Received:**
- Check phone number is correct
- Check SMS box (might be in Spam)
- Verify phone has SMS enabled
- Try resending
- Check Pro credits if purchased

**Beacons Not Showing:**
- Enable location permission
- Check internet connection
- You might be too far away
- Try refreshing the list
- Beacons expire after 2 hours

**Can't Add Player:**
- Check player name is valid
- No duplicate names (add last name)
- Verify phone is correct format
- Try removing and re-adding
- Clear app cache

**Invites Not Sending:**
- Check SMS credits (free users)
- Verify phone numbers
- Check internet connection
- Try resending
- Upgrade to Pro for unlimited

**Group Not Showing:**
- Refresh group list
- Check if archived
- Verify you're a member
- Try logging out/in
- Restart app

**Statistics Wrong:**
- Wait for sync to complete
- Check you finished match
- Verify scores entered correctly
- Look at recent match details
- Contact support if persistent

**App Crashes:**
- Update to latest version
- Clear app cache
- Restart phone
- Delete and reinstall
- Contact support

**Subscription Not Working:**
- Tap "Restore Purchases"
- Log out and back in
- Check payment went through
- Try on different device
- Contact support

**Can't Find Someone:**
- Try different search
- Check spelling
- Use partial name
- Look in player pool
- They might not be in your group

**Pro Tip:** Most issues resolve by: (1) Check connection, (2) Refresh, (3) Restart app, (4) Restart phone!`,
  },

  // ============================================================================
  // PRIVACY & LEGAL
  // ============================================================================
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    category: 'Privacy & Legal',
    searchKeywords: ['privacy', 'data', 'policy', 'legal', 'protection'],
    content: `PlayPBNow Privacy Policy

PlayPBNow is committed to protecting your privacy. Our full privacy policy covers:

**Data Collection:**
- Account information (email, phone, name)
- Location data for nearby courts and beacons
- Match and player statistics
- SMS communication records

**How We Use Your Data:**
- Provide core app functionality
- Show nearby pickleball courts and matches
- Send match invitations (via SMS with your consent)
- Improve app features and performance
- Detect and prevent fraud

**Your Rights:**
- Access your data anytime
- Update or correct information
- Delete your account and data
- Request data export
- Opt out of SMS invitations

**Data Security:**
- HTTPS encryption for all data
- Secure password storage
- Regular security audits
- Limited employee access

**Third-Party Services:**
- Twilio: SMS delivery (no personal data shared)
- Stripe: Payment processing only
- No data sold to third parties

**View the Full Policy:**
Visit https://playpbnow.com/privacy.html for complete details.

**Contact Us:**
Email: mcallpl@gmail.com`,
  },

  {
    id: 'account-deletion',
    title: 'Delete My Account',
    category: 'Privacy & Legal',
    searchKeywords: ['delete', 'account', 'remove', 'data', 'privacy'],
    content: `How to Delete Your Account

**Permanent Deletion:**
PlayPBNow gives you the ability to permanently delete your account and all associated data.

**Steps to Delete Your Account:**

1. **Open the Help Tab**
   - Tap the "?" icon at the bottom

2. **Find "Delete My Account"**
   - Scroll to "Privacy & Legal" section
   - Tap "Delete My Account" button

3. **Confirm Deletion**
   - Enter your password
   - Read the warning carefully
   - Tap "Permanently Delete"

4. **Confirmation**
   - Your account is immediately deleted
   - All personal data is removed
   - You'll be logged out
   - Create a new account anytime

**What Gets Deleted:**
- Account information (email, phone)
- Player roster and statistics
- Match history
- Group memberships
- SMS credit balance (non-refundable)

**What Doesn't Get Deleted:**
- Historical match data (may be anonymized)
- Payment records (required by law)
- Data shared with payment processors (Stripe)

**Important:**
- This action is **PERMANENT** and cannot be undone
- You will need to register again if you want to use PlayPBNow
- Your old data will not be restored

**Questions?**
Contact support at mcallpl@gmail.com`,
  },

  {
    id: 'sms-consent',
    title: 'SMS Invitations & Consent',
    category: 'Privacy & Legal',
    searchKeywords: ['sms', 'text', 'message', 'consent', 'invite'],
    content: `SMS Invitations & How We Send Messages

**What Are SMS Invitations?**
When you create a match invite and send it to players, we use SMS (text messages) to notify them. This requires:

1. **Your Explicit Consent**
   - Before sending any SMS, you must check "I understand this will send SMS invitations"
   - You're in control of when messages are sent
   - You can cancel anytime before sending

2. **Sufficient SMS Credits**
   - Free users: Each SMS invite costs 1 credit
   - Pro users: Unlimited SMS invitations (included in subscription)
   - If you don't have enough credits, you can't send until you buy more

3. **Valid Phone Numbers**
   - Players must have valid mobile phone numbers
   - Invitations won't send to invalid numbers

**How Players Can Opt Out:**
- Recipients can reply "STOP" to any message
- They'll be removed from future invitations
- Standard SMS rates may apply to their carriers

**Message Contents:**
- Match details (date, time, location)
- Your custom message (optional)
- RSVP link to respond to the invite
- PlayPBNow branding

**Privacy Protection:**
- Player phone numbers are NOT shared with third parties
- SMS is sent through Twilio (a trusted SMS provider)
- We don't use phone numbers for marketing
- Messages are encrypted in transit

**Questions?**
Check our full Privacy Policy at https://playpbnow.com/privacy.html`,
  },
];
