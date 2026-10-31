/**
 * AMERICAN SPELLING ONLY (Chip, 2026-09-18 and again 2026-10-31:
 * "NO BRITISH SPELLINGS."). Telling a writer is not enough, so this test
 * fails the build when a British spelling appears in anything we write:
 * screens, Help, server messages, texts, comments and names.
 *
 * Allowed on purpose (data, not writing):
 *  - the stored status value 'cancelled' (beacons, invites, lobbies): it lives
 *    in database rows and on the wire, and nobody reads it on screen.
 *  - userCancelled (RevenueCat's own field name) and lobbies_cancelled (an
 *    API response key existing clients read).
 *  - "Centre Pointe Pkwy" (a real street name).
 *  - public/qrcode.js (a third-party library) is not scanned.
 * Never scanned: node_modules, playpbnow-api/vendor (other people's code).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components', 'hooks', 'utils', 'context', 'constants', 'public', 'playpbnow-api'];
const EXT = /\.(ts|tsx|js|php|html)$/;
const SKIP = /node_modules|playpbnow-api[\\/]vendor|public[\\/]qrcode\.js|app[\\/]\\\(tabs\\\)/;

const BRITISH = /\b(colou?rs?\b(?<=colours?)|colour\w*|catalogue\w*|favourite\w*|centre[sd]?\b|centred|theatre\w*|grey\w*|jewellery|organis\w*|recognis\w*|realis(e|ed|es|ing)\b|personalis\w*|customis\w*|prioritis\w*|behaviour\w*|honour\w*|flavour\w*|neighbour\w*|labour\w*|whilst|amongst|learnt|practise[sd]?|licence\w*|defence\w*|programme\w*|analys(e|ed|es|ing)\b|apologis\w*|maximis\w*|minimis\w*|optimis\w*|utilis\w*|travell(ing|ed|er)\w*|cancell(ed|ing)\b|judgement\w*|acknowledgement\w*|instalment\w*|speciality|aluminium|cosy|summaris\w*|finalis\w*|normalis\w*|initialis\w*|synchronis\w*|authoris\w*|categoris\w*|criticis\w*|visualis\w*|standardis\w*|labell(ed|ing)|modell(ed|ing)|fulfilment|enrolment|ageing|rumour\w*|endeavour\w*)/i;

const ALLOWED = [
    /(['"])cancelled\1/g,
    /userCancelled/g,
    /lobbies_cancelled/g,
    /Centre Pointe/g,
];

function walk(dir: string, out: string[]) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (SKIP.test(p)) continue;
        if (e.isDirectory()) walk(p, out);
        else if (EXT.test(e.name)) out.push(p);
    }
}

test('no British spellings anywhere we write', () => {
    const files: string[] = [];
    for (const d of DIRS) walk(path.join(ROOT, d), files);
    const hits: string[] = [];
    for (const f of files) {
        fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
            let l = line;
            for (const a of ALLOWED) l = l.replace(a, '');
            const m = l.match(BRITISH);
            if (m) hits.push(`${path.relative(ROOT, f)}:${i + 1}  "${m[0]}"`);
        });
    }
    expect(hits).toEqual([]);
});
