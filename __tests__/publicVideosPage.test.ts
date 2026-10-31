/**
 * public/videos.html is the page Chip sends to coordinators. Every video it
 * shows must also be in the Help tab's catalog (utils/helpVideos.ts), so the
 * two never drift apart, and the page must never fall back to a serif.
 */
import fs from 'fs';
import path from 'path';
import { HELP_VIDEOS } from '../utils/helpVideos';

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'videos.html'), 'utf8');

test('every video on the public page is in the Help catalog', () => {
  const slugs = [...html.matchAll(/slug: '([^']+)'/g), ...html.matchAll(/\/videos\/([a-z0-9-]+)\.mp4/g)].map(m => m[1]);
  expect(slugs.length).toBeGreaterThan(0);
  const known = new Set(HELP_VIDEOS.map(v => v.slug));
  for (const s of slugs) expect(known.has(s)).toBe(true);
});

test('every font stack on the public page ends in sans-serif', () => {
  const stacks = [...html.matchAll(/font-family:\s*([^;}]+)/g)].map(m => m[1].trim());
  expect(stacks.length).toBeGreaterThan(0);
  for (const s of stacks) expect(s.replace(/!important/, '').trim().endsWith('sans-serif')).toBe(true);
});
