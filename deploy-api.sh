#!/bin/bash
# Deploy PlayPBNow API files to DigitalOcean via rsync

set -e

REMOTE_HOST="64.227.108.128"
REMOTE_USER="root"
REMOTE_DIR="/var/www/html/PlayPBNow/api"
REMOTE_ROOT="/var/www/html/PlayPBNow"

echo "=== Deploying PlayPBNow API to DigitalOcean ==="

# Deploy API directory
rsync -avz playpbnow-api/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Ensure reports directory exists with correct permissions
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_ROOT}/reports && chmod 777 ${REMOTE_ROOT}/reports"

# Ensure uploads directory exists
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}/uploads && chmod 755 ${REMOTE_DIR}/uploads"

echo ""
echo "=== Deploy complete! ==="
echo "API deployed to: https://playpbnow.peoplestar.com/api/"
echo "Test endpoint: https://playpbnow.peoplestar.com/api/generate_report_image.php"
