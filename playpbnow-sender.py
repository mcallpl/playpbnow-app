#!/usr/bin/env python3
"""
PlayPBNow — iMessage Sender Daemon
Runs on the Mac. Polls the PlayPBNow text_queue, picks up pending invite
messages, and sends them via iMessage from YOUR number.

Each queued row is TWO messages: the invite details, then the short RSVP link on
its own so iMessage renders the preview card.

SAFETY: dry-run is the DEFAULT. Without --live it prints exactly what it would
send and changes nothing, on the Mac or the server.

Usage: python3 playpbnow-sender.py                 # dry run — show the queue
       python3 playpbnow-sender.py --once --live   # send one batch, then exit
       python3 playpbnow-sender.py --live          # run continuously
       nohup python3 playpbnow-sender.py --live &> /tmp/playpbnow-sender.log &

── Why this never worked before ─────────────────────────────────────────────
This daemon was written 2026-04-14 to poll `text_queue.php`. That endpoint was
never created on the server — every poll since has 404'd, printed "Error
fetching queue" into a log nobody read, and sent nothing. Meanwhile
invite_api.php happily queued rows and reported "Invites Sent" to the app.
It now polls poll_text_queue.php, which exists, and authenticates.
"""

import argparse
import json
import os
import subprocess
import ssl
import sys
import time
import urllib.request
import urllib.error

# Canonical host ONLY. peoplestar.com/PlayPBNow 301-redirects here, and urllib
# downgrades a redirected POST to GET and drops the body — which would silently
# break the status report, leaving rows 'pending' and re-sending every message
# on every poll forever. (Exactly the bug the ShowPoppy sender hit.)
API_BASE = "https://playpbnow.com/api"
POLL_INTERVAL = 15  # seconds
DELAY_BETWEEN_MESSAGES = 3  # seconds between the detail and link message

VAULT = os.path.expanduser("~/Projects/vault/secrets.php")

# SSL context
_ssl_ctx = ssl.create_default_context()
try:
    import certifi
    _ssl_ctx.load_verify_locations(certifi.where())
except ImportError:
    _ssl_ctx = ssl._create_unverified_context()


def load_token() -> str:
    """Read $vault_playpbnow_sender_token from the PHP vault.

    Plain text scan rather than shelling out to php, so the daemon does not
    depend on a php binary being present.
    """
    env = os.environ.get("PLAYPBNOW_SENDER_TOKEN", "")
    if env:
        return env
    try:
        with open(VAULT) as f:
            for line in f:
                if "vault_playpbnow_sender_token" in line and "=" in line:
                    part = line.split("=", 1)[1].strip()
                    for quote in ("'", '"'):
                        if quote in part:
                            return part.split(quote)[1]
    except FileNotFoundError:
        pass
    return ""


TOKEN = load_token()


def send_imessage(phone: str, message: str) -> tuple:
    """Send via macOS Messages app using AppleScript."""
    escaped = message.replace("\\", "\\\\").replace('"', '\\"')
    applescript = f'''
    tell application "Messages"
        set targetService to 1st account whose service type = iMessage
        set targetBuddy to participant "{phone}" of targetService
        send "{escaped}" to targetBuddy
    end tell
    '''
    try:
        result = subprocess.run(
            ["osascript", "-e", applescript],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            return True, ""
        return False, result.stderr.strip()
    except subprocess.TimeoutExpired:
        return False, "AppleScript timed out"
    except Exception as e:
        return False, str(e)


def fetch_pending():
    """Fetch pending messages from PlayPBNow text_queue."""
    url = f"{API_BASE}/poll_text_queue.php?action=fetch"
    try:
        req = urllib.request.Request(url, headers={"X-PBNow-Token": TOKEN})
        with urllib.request.urlopen(req, timeout=15, context=_ssl_ctx) as resp:
            data = json.loads(resp.read().decode())
            return data.get("items", [])
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("  [poll] 401 Unauthorized — check $vault_playpbnow_sender_token in the vault.")
        elif e.code == 404:
            print(f"  [poll] 404 — {url} is missing on the server. Deploy poll_text_queue.php.")
        else:
            print(f"  [poll] HTTP {e.code} fetching queue")
        return []
    except Exception as e:
        print(f"  [poll] Error fetching queue: {e}")
        return []


def update_status(item_id: int, status: str, error_message: str = ""):
    """Report send result back to server."""
    url = f"{API_BASE}/poll_text_queue.php?action=update"
    payload = json.dumps({"id": item_id, "status": status, "error_message": error_message}).encode()
    try:
        req = urllib.request.Request(
            url, data=payload,
            headers={"Content-Type": "application/json", "X-PBNow-Token": TOKEN},
        )
        with urllib.request.urlopen(req, timeout=15, context=_ssl_ctx):
            pass
    except Exception as e:
        # If this fails the row stays 'pending' and gets retried on the next
        # poll — duplicate texts are the failure mode, so make it loud.
        print(f"  [poll] FAILED to report status for #{item_id}: {e}")


def poll_and_send(live: bool) -> int:
    """One poll cycle: fetch pending, send each, report status."""
    items = fetch_pending()
    if not items:
        return 0

    print(f"  [playpbnow] {len(items)} pending message(s)")

    for item in items:
        phone = item["phone"]
        message = item["message"]
        link_message = (item.get("link_message") or "").strip()
        item_id = int(item["id"])

        if not live:
            print(f"\n  [DRY RUN] #{item_id} → {phone}")
            print("      " + "\n      ".join(message.splitlines()))
            if link_message:
                print(f"      --- second message: {link_message}")
            print("  [DRY RUN] nothing sent, queue unchanged")
            continue

        print(f"  [playpbnow] #{item_id} — sending to {phone}...")

        success, err = send_imessage(phone, message)

        if success:
            print(f"  [playpbnow] #{item_id} — invite sent!")

            if link_message:
                time.sleep(DELAY_BETWEEN_MESSAGES)
                link_ok, link_err = send_imessage(phone, link_message)
                if link_ok:
                    print(f"  [playpbnow] #{item_id} — link sent!")
                else:
                    # Invite landed; only the link failed. Mark sent anyway so
                    # the whole thing is not re-sent, but record why.
                    print(f"  [playpbnow] #{item_id} — link failed: {link_err}")
                    update_status(item_id, "sent", f"link message failed: {link_err}")
                    time.sleep(2)
                    continue

            update_status(item_id, "sent")
        else:
            update_status(item_id, "failed", err)
            print(f"  [playpbnow] #{item_id} — failed: {err}")

        time.sleep(2)  # Small delay between different recipients

    return len(items)


def main():
    parser = argparse.ArgumentParser(description="PlayPBNow iMessage sender")
    parser.add_argument("--live", action="store_true",
                        help="actually send; without this it is a dry run")
    parser.add_argument("--once", action="store_true",
                        help="process one batch and exit instead of looping")
    args = parser.parse_args()

    if not TOKEN:
        print(f"No sender token. Expected $vault_playpbnow_sender_token in {VAULT}, "
              "or PLAYPBNOW_SENDER_TOKEN in the environment.")
        sys.exit(1)

    mode = "LIVE — messages WILL be sent" if args.live else "DRY RUN — nothing will be sent"
    print("=" * 56)
    print("  PlayPBNow iMessage Sender")
    print(f"  {mode}")
    print(f"  Polling {API_BASE} every {POLL_INTERVAL}s")
    print("=" * 56)

    if args.once:
        n = poll_and_send(args.live)
        print(f"\nProcessed {n} queued message(s).")
        return

    while True:
        try:
            poll_and_send(args.live)
        except KeyboardInterrupt:
            print("\nStopped.")
            return
        except Exception as e:
            print(f"  [playpbnow] Error: {e}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
