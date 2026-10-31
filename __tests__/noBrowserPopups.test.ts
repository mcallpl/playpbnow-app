/**
 * On the web, alerts are drawn as PlayPBNow dialogs (components/AlertHost)
 * with real button labels. A raw window.confirm / window.alert shows the
 * browser's own popup instead (page address as title, OK / Cancel), so every
 * one must sit behind useBrowserPopups(), the fallback for when the in-app
 * dialog is not mounted (2026-10-31).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
function walk(dir: string, out: string[]) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (/node_modules|app[\\/]\\\(tabs\\\)/.test(p)) continue;
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
}

test('every browser popup is only a fallback for the in-app dialog', () => {
  const files: string[] = [];
  for (const d of ['app', 'components', 'hooks', 'context']) walk(path.join(ROOT, d), files);
  const bare: string[] = [];
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (!/window\.(confirm|alert)\(/.test(l) || /^\s*(\/\/|\*)/.test(l)) return;
      const ctx = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
      if (!ctx.includes('useBrowserPopups()')) bare.push(`${path.relative(ROOT, f)}:${i + 1}`);
    });
  }
  expect(bare).toEqual([]);
});
