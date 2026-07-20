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
