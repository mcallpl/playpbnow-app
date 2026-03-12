#!/bin/bash
# Quick backup: commits and pushes any uncommitted changes
# Usage: ./git-backup.sh
# Schedule with: crontab -e → 0 18 * * * cd ~/Projects/PlayPBNow && ./git-backup.sh

cd "$(dirname "$0")"

if [ -z "$(git status --porcelain)" ]; then
    echo "Nothing to commit — working tree clean."
    exit 0
fi

git add -A
git commit -m "Auto-backup $(date '+%Y-%m-%d %H:%M')"
git push

echo "Backup complete."
