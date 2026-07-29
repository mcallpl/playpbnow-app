#!/usr/bin/env python3
"""
Record what you do in the simulator into a draft Maestro flow.

    ./.maestro/record-actions.py                  # writes .maestro/recorded.yaml
    ./.maestro/record-actions.py -o my-flow.yaml

Tap around in the simulator; press Ctrl-C when done.

HOW IT WORKS — and its one real limitation
------------------------------------------
iOS exposes no touch log, so nothing can literally see your taps. This watches
the SCREEN instead: it polls screenshots (~230ms) and, whenever the screen
changes and settles, dumps the accessibility hierarchy (~2.3s) and works out
what you must have done by diffing against the previous screen.

That means:
  * PAUSE ~3 SECONDS AFTER EACH TAP. Tap faster than that and steps get merged.
  * Taps that change nothing on screen are invisible to it, and are dropped.
  * The tapped element is a best GUESS. It is emitted with the alternatives
    listed beside it as a comment, so you can correct it.

The output is a DRAFT to clean up, not a finished flow. What it does get exactly
right is the selectors — pulled from the live hierarchy, already regex-escaped
and anchored the way Maestro's whole-string matching needs.

CLOSE MAESTRO STUDIO BEFORE RECORDING. Two Maestro processes cannot share one
device driver. If Studio (or a `maestro test` run) holds the device, this reads
stale hierarchies and emits the same screen over and over.

If a physical iPhone is paired — even over Wi-Fi, even unplugged — Maestro sees
"multiple devices" and may grab the phone instead of the simulator. This always
passes --device explicitly to avoid that.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time

POLL = 0.35          # screenshot interval
SETTLE = 2           # consecutive identical frames before we call it settled
NOISE = re.compile(
    r'^(PlayPBNow|\d+%|No signal|Not charging|Cellular|SSID.*|'
    r'\d{1,2}:\d{2}(\s?[AP]M)?|.*battery power|.*scroll bar.*|)$', re.I)


def env():
    e = os.environ.copy()
    e.setdefault("JAVA_HOME", "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home")
    e["PATH"] = f"{e['JAVA_HOME']}/bin:{e['PATH']}:{os.path.expanduser('~/.maestro/bin')}"
    return e


def booted():
    out = subprocess.run(["xcrun", "simctl", "list", "devices", "booted"],
                         capture_output=True, text=True).stdout
    ids = re.findall(r'([0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12})', out)
    return ids


def shot(udid, path):
    subprocess.run(["xcrun", "simctl", "io", udid, "screenshot", path],
                   capture_output=True)
    try:
        return hashlib.sha1(open(path, 'rb').read()).hexdigest()
    except OSError:
        return None


def hierarchy(udid):
    r = subprocess.run(["maestro", "--device", udid, "hierarchy"],
                       capture_output=True, text=True, env=env())
    i = r.stdout.find('{')
    if i < 0:
        return None
    try:
        return json.loads(r.stdout[i:])
    except json.JSONDecodeError:
        return None


def flatten(node, out=None):
    """Every element with a usable label, in visual order."""
    out = [] if out is None else out
    a = node.get('attributes') or {}
    text = (a.get('text') or '').strip()
    acc = (a.get('accessibilityText') or '').strip()
    hint = (a.get('hintText') or '').strip()
    label = text or acc
    if label or hint:
        out.append({
            'label': label, 'hint': hint,
            'focused': str(a.get('focused', '')).lower() == 'true',
            'bounds': a.get('bounds') or '',
        })
    for c in node.get('children') or []:
        flatten(c, out)
    return out


def signal_labels(els):
    """Drop status bar / chrome noise, de-duplicate, keep order."""
    seen, keep = set(), []
    for e in els:
        l = e['label']
        if not l or NOISE.match(l) or l in seen:
            continue
        seen.add(l)
        keep.append(e)
    return keep


def escape(s):
    """Maestro matches the WHOLE string as a regex, so escape literals and
    anchor loosely — this is the rule that breaks bare selectors."""
    out = re.sub(r'([.^$*+?()\[\]{}|\\])', r'\\\1', s)
    return out


def selector_for(label):
    """Card/tab labels are often one long a11y string ('Friday Night Crew, 16,
    9 Male, 7 Female'); match the leading part and wildcard the rest."""
    head = label.split(',')[0].strip()
    if head != label:
        return f'"{escape(head)}.*"'
    return f'"{escape(label)}"'


def title_of(els):
    for e in els:
        if e['label'] and len(e['label']) < 60:
            return e['label']
    return '(unknown)'


def guess_tap(prev, curr):
    """Which element did they most likely tap?

    Strongest signal: the new screen's title matches something that was on the
    old screen (tapping 'Friday Night Crew' opens a screen titled 'FRIDAY NIGHT
    CREW'). Otherwise: something that was there and is now gone.
    """
    curr_labels = {e['label'] for e in curr}
    new_title = title_of(curr)
    norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
    tn = norm(new_title)

    scored = []
    for e in prev:
        n = norm(e['label'])
        if not n:
            continue
        if n and tn and (n == tn or n.startswith(tn) or tn.startswith(n)):
            scored.append((100, e))                      # title match
        elif e['label'] not in curr_labels:
            weight = 60 if e['label'].isupper() else 40  # gone; buttons look shouty
            scored.append((weight, e))
    scored.sort(key=lambda s: -s[0])
    return [e for _, e in scored[:4]]


def typed_text(prev, curr):
    """A field whose hint vanished and gained a value => text was typed."""
    prev_hints = {e['hint'] for e in prev if e['hint']}
    curr_hints = {e['hint'] for e in curr if e['hint']}
    gone = prev_hints - curr_hints
    for h in gone:
        for e in curr:
            if e['label'] and e['label'] not in {p['label'] for p in prev}:
                return h, e['label']
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-o', '--out', default='.maestro/recorded.yaml')
    ap.add_argument('-d', '--device')
    ap.add_argument('--app-id', default='com.mcallpl.PlayPBNow')
    args = ap.parse_args()

    devices = booted()
    if not devices:
        sys.exit("✗ No booted simulator.")
    udid = args.device or devices[0]
    if len(devices) > 1 and not args.device:
        print(f"⚠ {len(devices)} simulators booted; using {udid}. Use -d to pick another.")

    tmp = "/tmp/_rec_frame.png"
    print(f"▶ recording {udid}\n▶ tap around the simulator — PAUSE ~3s between taps\n▶ Ctrl-C to stop\n")

    prev = signal_labels(flatten(hierarchy(udid) or {}))
    print(f"  [start] {title_of(prev)}")
    steps, last, stable = [], shot(udid, tmp), 0

    try:
        while True:
            time.sleep(POLL)
            h = shot(udid, tmp)
            if h == last:
                if stable >= 0:
                    stable += 1
                continue
            last, stable = h, 0
            # wait for the screen to stop moving
            while stable < SETTLE:
                time.sleep(POLL)
                h2 = shot(udid, tmp)
                stable = stable + 1 if h2 == last else 0
                last = h2

            curr = signal_labels(flatten(hierarchy(udid) or {}))
            if not curr:
                continue
            hint, val = typed_text(prev, curr)
            if hint:
                steps.append({'kind': 'input', 'hint': hint, 'value': val})
                print(f"  [{len(steps)}] typed into {hint!r}")
            else:
                cands = guess_tap(prev, curr)
                if not cands:
                    prev = curr
                    continue
                steps.append({'kind': 'tap', 'cands': cands, 'title': title_of(curr)})
                print(f"  [{len(steps)}] tap {cands[0]['label'][:40]!r} → {title_of(curr)[:34]}")
            prev = curr
    except KeyboardInterrupt:
        pass

    lines = [
        "# DRAFT — recorded from a live session by .maestro/record-actions.py",
        "# Each tap is a best GUESS from screen diffing (iOS exposes no touch log).",
        "# Alternatives are listed beside each step — swap them in if a guess is wrong.",
        f"appId: {args.app_id}",
        "---",
        "- launchApp",
        "",
    ]
    for s in steps:
        if s['kind'] == 'input':
            lines += [f'- tapOn: "{escape(s["hint"])}"',
                      f'- inputText: "{s["value"]}"', ""]
        else:
            best, *rest = s['cands']
            lines.append(f'- tapOn: {selector_for(best["label"])}')
            if rest:
                alts = " | ".join(r['label'][:30] for r in rest)
                lines.append(f'  # alternatives: {alts}')
            lines += ['- extendedWaitUntil:',
                      f'    visible: {selector_for(s["title"])}',
                      '    timeout: 10000', ""]

    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
    open(args.out, 'w').write("\n".join(lines) + "\n")
    print(f"\n✓ {len(steps)} steps → {args.out}")
    print("  Review it: the taps are guesses, the selectors are exact.")


if __name__ == '__main__':
    main()
