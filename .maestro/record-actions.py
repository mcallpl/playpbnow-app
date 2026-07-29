#!/usr/bin/env python3
"""
Record what you do in the simulator into a draft Maestro flow.

    ./.maestro/record-actions.py                  # writes .maestro/recorded.yaml
    ./.maestro/record-actions.py -o my-flow.yaml

Tap around in the simulator; press Ctrl-C when done. The file is rewritten after
EVERY step, so it exists even if the process is killed instead of interrupted.

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
import argparse, hashlib, json, os, re, signal, subprocess, sys, time

POLL = 0.35          # screenshot interval
SETTLE = 2           # consecutive identical frames before we call it settled
NOISE = re.compile(
    r'^(PlayPBNow|\d+%|No signal|Not charging|Cellular|SSID.*|'
    r'\d{1,2}:\d{2}(\s?[AP]M)?|.*battery power|.*scroll bar.*|)$', re.I)

STOP = False


def _stop(_sig, _frame):
    global STOP
    STOP = True
    print("\n▶ stopping…", flush=True)


signal.signal(signal.SIGINT, _stop)
signal.signal(signal.SIGTERM, _stop)


def env():
    e = os.environ.copy()
    e.setdefault("JAVA_HOME", "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home")
    e["PATH"] = f"{e['JAVA_HOME']}/bin:{e['PATH']}:{os.path.expanduser('~/.maestro/bin')}"
    return e


def booted():
    out = subprocess.run(["xcrun", "simctl", "list", "devices", "booted"],
                         capture_output=True, text=True).stdout
    return re.findall(r'([0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12})', out)


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
        out.append({'label': label, 'hint': hint,
                    'focused': str(a.get('focused', '')).lower() == 'true',
                    'bounds': a.get('bounds') or ''})
    for c in node.get('children') or []:
        flatten(c, out)
    return out


def signal_labels(els):
    """Drop status-bar / chrome noise, de-duplicate, keep visual order."""
    seen, keep = set(), []
    for e in els:
        l = e['label']
        if l and not NOISE.match(l):
            if l in seen:
                continue
            seen.add(l)
            keep.append(e)
        elif e['hint']:
            keep.append(e)      # empty text field — needed for typing detection
    return keep


def escape(s):
    """Maestro matches the WHOLE string as a regex — escape literals."""
    return re.sub(r'([.^$*+?()\[\]{}|\\])', r'\\\1', s)


def selector_for(label):
    """Card/tab labels are often one long a11y string ('Friday Night Crew, 16,
    9 Male, 7 Female'); match the leading part and wildcard the rest."""
    head = label.split(',')[0].strip()
    return f'"{escape(head)}.*"' if head != label else f'"{escape(label)}"'


def title_of(els):
    for e in els:
        if e['label'] and len(e['label']) < 60:
            return e['label']
    return '(unknown)'


def guess_tap(prev, curr):
    """Which element was most likely tapped?

    Ranked signals, learned from a real session where the naive version guessed
    the screen title six times out of eleven:

      90  an element on the old screen whose text matches the NEW screen's
          title, but only when the title actually CHANGED. Without that guard
          the title matches itself on every same-screen tap and wins every time.
      60  an element that vanished and looks like a button (ALL CAPS)
      40  an element that vanished

    The screen's own header is never a candidate: it is what you navigated TO,
    not what you tapped.

    NOT detectable at all: tapping a text field. The keyboard is absent from
    Maestro's iOS hierarchy and `focused` is always false, so the only thing
    that changes is the clock. Those taps are recovered afterwards instead —
    see the pending/typing logic in main().
    """
    prev_title, curr_title = title_of(prev), title_of(curr)
    changed_screen = prev_title != curr_title
    curr_labels = {e['label'] for e in curr}
    norm = lambda x: re.sub(r'[^a-z0-9]', '', x.lower())
    tn = norm(curr_title)

    scored = []
    for e in prev:
        n = norm(e['label'])
        if not n or e['label'] in (prev_title, curr_title):
            continue                                   # never the header itself
        if changed_screen and tn and (n == tn or n.startswith(tn) or tn.startswith(n)):
            scored.append((90, e))
        elif e['label'] not in curr_labels:
            scored.append((60 if e['label'].isupper() else 40, e))

    scored.sort(key=lambda x: -x[0])
    top = scored[0][0] if scored else 0
    out, seen = [], set()
    for _, e in scored:
        if e['label'] in seen:
            continue
        seen.add(e['label'])
        out.append(e)
    return out[:4], top


def typed_text(prev, curr):
    """Detect real typing by tracking a field's own value at fixed BOUNDS.

    The first version paired any vanished placeholder with any newly-appeared
    label, which produced `inputText: "SAVE"` — a button caption, not typed
    text. A field keeps its bounds while you type into it, so compare the
    element in that same rectangle before and after.
    """
    before = {e['bounds']: e for e in prev if e['bounds']}
    for e in curr:
        b = e['bounds']
        if not b or b not in before:
            continue
        was, now = before[b], e
        placeholder = was['hint'] or now['hint']
        if not placeholder:
            continue
        # empty (placeholder showing) -> has a value
        if not was['label'] and now['label'] and now['label'] != placeholder:
            return placeholder, now['label']
    return None, None


def render(steps, app_id):
    lines = [
        "# DRAFT — recorded from a live session by .maestro/record-actions.py",
        "# Each tap is a best GUESS from screen diffing (iOS exposes no touch log).",
        "# Alternatives are listed beside each step — swap one in if a guess is wrong.",
        f"appId: {app_id}",
        "---",
        "- launchApp",
        "",
    ]
    for st in steps:
        if st['kind'] == 'input':
            lines += [f'- tapOn: "{escape(st["hint"])}"',
                      f'- inputText: "{st["value"]}"', ""]
        else:
            best, *rest = st['cands']
            if st.get('conf', 0) < 90:
                lines.append('  # LOW CONFIDENCE — verify this one')
            lines.append(f'- tapOn: {selector_for(best["label"])}')
            if rest:
                lines.append('  # alternatives: ' + " | ".join(r['label'][:30] for r in rest))
            lines += ['- extendedWaitUntil:',
                      f'    visible: {selector_for(st["title"])}',
                      '    timeout: 10000', ""]
    return "\n".join(lines) + "\n"


def save(path, steps, app_id):
    """Called after EVERY step so the file always exists on disk."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w') as fh:
        fh.write(render(steps, app_id))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-o', '--out', default='.maestro/recorded.yaml')
    ap.add_argument('-d', '--device')
    ap.add_argument('--app-id', default='com.mcallpl.PlayPBNow')
    args = ap.parse_args()

    devices = booted()
    if not devices:
        sys.exit("✗ No booted simulator. Open Simulator.app first.")
    udid = args.device or devices[0]
    if len(devices) > 1 and not args.device:
        print(f"⚠ {len(devices)} simulators booted; using {udid}. Use -d to pick another.")

    tmp = "/tmp/_rec_frame.png"
    steps = []
    save(args.out, steps, args.app_id)          # create the file immediately
    print(f"▶ recording {udid}")
    print(f"▶ writing   {os.path.abspath(args.out)}")
    print("▶ tap around the simulator — PAUSE ~3s between taps")
    print("▶ Ctrl-C to stop\n", flush=True)

    prev = signal_labels(flatten(hierarchy(udid) or {}))
    if not prev:
        print("⚠ could not read the screen — is Maestro Studio still open?", flush=True)
    print(f"  [start] {title_of(prev)}", flush=True)

    last, stable = shot(udid, tmp), 0
    while not STOP:
        time.sleep(POLL)
        h = shot(udid, tmp)
        if h == last:
            continue
        last, stable = h, 0
        while stable < SETTLE and not STOP:      # wait for the screen to settle
            time.sleep(POLL)
            h2 = shot(udid, tmp)
            stable = stable + 1 if h2 == last else 0
            last = h2
        if STOP:
            break

        curr = signal_labels(flatten(hierarchy(udid) or {}))
        if not curr:
            continue
        hint, val = typed_text(prev, curr)
        if not hint and {e['label'] for e in curr} == {e['label'] for e in prev}:
            # Screen pixels changed but the hierarchy did not. Almost always a
            # keyboard opening on a field tap, which iOS does not expose. Emit
            # nothing — the following inputText step carries its own tapOn.
            prev = curr
            continue
        if hint:
            steps.append({'kind': 'input', 'hint': hint, 'value': val})
            print(f"  [{len(steps)}] typed into {hint!r}", flush=True)
        else:
            cands, conf = guess_tap(prev, curr)
            if not cands:
                prev = curr
                continue
            steps.append({'kind': 'tap', 'cands': cands, 'title': title_of(curr),
                          'conf': conf})
            print(f"  [{len(steps)}] tap {cands[0]['label'][:40]!r} → {title_of(curr)[:34]}",
                  flush=True)
        save(args.out, steps, args.app_id)
        prev = curr

    save(args.out, steps, args.app_id)
    print(f"\n✓ {len(steps)} steps → {os.path.abspath(args.out)}")
    print("  Review it: the taps are guesses, the selectors are exact.")


if __name__ == '__main__':
    main()
