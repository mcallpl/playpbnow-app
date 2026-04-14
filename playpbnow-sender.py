#!/usr/bin/env python3
"""
PlayPBNow — iMessage Sender Daemon
Runs on the Mac. Polls the PlayPBNow text_queue every 10 seconds,
picks up pending invite messages, and sends them via iMessage from YOUR number.

Usage: python3 playpbnow-sender.py
       Or: nohup python3 playpbnow-sender.py &> /tmp/playpbnow-sender.log &
"""

import json
import subprocess
import ssl
import time
import urllib.request
import urllib.error

API_BASE = "https://peoplestar.com/PlayPBNow/api"
POLL_INTERVAL = 10  # seconds
DELAY_BETWEEN_MESSAGES = 3  # seconds between sends to same recipient

# SSL context
_ssl_ctx = ssl.create_default_context()
try:
    import certifi
    _ssl_ctx.load_verify_locations(certifi.where())
except ImportError:
    _ssl_ctx = ssl._create_unverified_context()


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
    url = f"{API_BASE}/text_queue.php?action=fetch"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15, context=_ssl_ctx) as resp:
            data = json.loads(resp.read().decode())
            return data.get("items", [])
    except Exception as e:
        print(f"  [poll] Error fetching queue: {e}")
        return []


def update_status(item_id: int, status: str, error_message: str = ""):
    """Report send result back to server."""
    url = f"{API_BASE}/text_queue.php?action=update"
    payload = json.dumps({"id": item_id, "status": status, "error_message": error_message}).encode()
    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=15, context=_ssl_ctx) as resp:
            pass
    except Exception as e:
        print(f"  [poll] Error updating status for #{item_id}: {e}")


def poll_and_send():
    """One poll cycle: fetch pending, send each, report status."""
    items = fetch_pending()
    if not items:
        return

    print(f"  [playpbnow] {len(items)} pending message(s)")

    for item in items:
        phone = item["phone"]
        message = item["message"]
        link_message = item.get("link_message", "")
        item_id = item["id"]

        print(f"  [playpbnow] #{item_id} — sending to {phone}...")

        # Send the invite message
        success, err = send_imessage(phone, message)

        if success:
            print(f"  [playpbnow] #{item_id} — invite sent!")

            # Send the link as a separate message for the OG preview card
            if link_message:
                time.sleep(DELAY_BETWEEN_MESSAGES)
                link_ok, link_err = send_imessage(phone, link_message)
                if link_ok:
                    print(f"  [playpbnow] #{item_id} — link sent!")
                else:
                    print(f"  [playpbnow] #{item_id} — link failed: {link_err}")

            update_status(item_id, "sent")
        else:
            update_status(item_id, "failed", err)
            print(f"  [playpbnow] #{item_id} — failed: {err}")

        time.sleep(2)  # Small delay between different recipients


def main():
    print("=" * 50)
    print("  PlayPBNow iMessage Sender")
    print(f"  Polling {API_BASE} every {POLL_INTERVAL}s")
    print("  Messages will send from YOUR iMessage number")
    print("=" * 50)

    while True:
        try:
            poll_and_send()
        except Exception as e:
            print(f"  [playpbnow] Error: {e}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
