/**
 * How-to video catalogue for the Help tab.
 *
 * Files live on the server at /var/www/html/PlayPBNow/videos/ and are served
 * as static assets. NOTE: anything missing there falls through to the nginx SPA
 * fallback and returns app.html with a 200, so a broken slug looks like a
 * "working" request that plays nothing — verify new entries with
 * `curl -sI <url> | grep content-type` and expect video/mp4.
 *
 * m5-Invitations is deliberately absent: it taught the invites flow, which is
 * hidden pending its rebuild. m6 was already marked UNUSED.
 */

export interface HelpVideo {
  slug: string;
  title: string;
  blurb: string;
  seconds: number;
}

const BASE = 'https://playpbnow.com/videos';

export const videoUrl = (slug: string) => `${BASE}/${slug}.mp4`;
export const posterUrl = (slug: string) => `${BASE}/thumbs/${slug}.jpg`;

export const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const HELP_VIDEOS: HelpVideo[] = [
  {
    slug: 'm1-quick-tour-v2',
    title: 'Quick Tour',
    blurb: 'A fast walk through the whole app',
    seconds: 21,
  },
  {
    slug: 'm2-groups',
    title: 'Groups',
    blurb: 'Create a group and build your roster',
    seconds: 44,
  },
  {
    slug: 'm3-setting-up-a-match',
    title: 'Setting Up a Match',
    blurb: 'Rounds, courts and rotating partners',
    seconds: 45,
  },
  {
    slug: 'm4-scoring',
    title: 'Scoring',
    blurb: 'Score a match round by round',
    seconds: 43,
  },
  {
    slug: 'm7-switching-matchups',
    title: 'Switching Matchups',
    blurb: 'Swap players and fix a matchup mid-session',
    seconds: 57,
  },
  {
    slug: 'm8-synchronization',
    title: 'Live Sync',
    blurb: 'Everyone scores from their own phone',
    seconds: 78,
  },
  {
    slug: 'm9-rankings',
    title: 'Rankings',
    blurb: 'Leaderboards, podiums and badges',
    seconds: 116,
  },
  {
    slug: 'm10-beacon',
    title: 'Beacons',
    blurb: 'Post an open spot and fill your court',
    seconds: 112,
  },
  {
    slug: 'm11-share-and-text',
    title: 'Share & Report',
    blurb: 'Send results and share match reports',
    seconds: 95,
  },
];
