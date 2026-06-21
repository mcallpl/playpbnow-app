# GitHub Secrets Setup Guide

This guide explains how to configure the GitHub repository secrets needed for CI/CD deployments.

## Overview

The CI/CD pipeline requires three main secrets to function:
1. `DO_SSH_PRIVATE_KEY` - SSH key for DigitalOcean deployment
2. `SLACK_WEBHOOK_URL` - Webhook for Slack notifications
3. `GH_TOKEN` (optional) - GitHub token for creating issues on rollback

## Step 1: SSH Private Key Setup

### Generate SSH Key (if you don't have one)

```bash
# Generate new Ed25519 SSH key
ssh-keygen -t ed25519 -f ~/.ssh/playpbnow_deploy -N ""

# Output:
# Your identification has been saved in ~/.ssh/playpbnow_deploy
# Your public key has been saved in ~/.ssh/playpbnow_deploy.pub
```

### Get the Private Key

```bash
# View the private key
cat ~/.ssh/playpbnow_deploy

# This will output something like:
# -----BEGIN OPENSSH PRIVATE KEY-----
# b3BlbnNzaC1rZXktdjEAAAAABG5vbmUtbm9uZS1ub25lAAAAAEEAAAAr...
# ...
# -----END OPENSSH PRIVATE KEY-----

# Copy to clipboard (macOS)
cat ~/.ssh/playpbnow_deploy | pbcopy

# Or on Linux
cat ~/.ssh/playpbnow_deploy | xclip -selection clipboard
```

### Add Public Key to DigitalOcean

The public key must be added to the root user's authorized_keys:

```bash
# Option 1: If you have SSH access already
ssh root@64.227.108.128
cat >> ~/.ssh/authorized_keys << 'EOF'
<PASTE CONTENTS OF ~/.ssh/playpbnow_deploy.pub>
EOF
chmod 600 ~/.ssh/authorized_keys

# Option 2: Via DigitalOcean Console
# 1. SSH to server using DigitalOcean console
# 2. Run: mkdir -p ~/.ssh && chmod 700 ~/.ssh
# 3. Run: echo "<public_key>" >> ~/.ssh/authorized_keys
# 4. Run: chmod 600 ~/.ssh/authorized_keys
```

### Test SSH Connection

```bash
# This should connect without prompting for password
ssh -i ~/.ssh/playpbnow_deploy root@64.227.108.128 "echo 'SSH works!'"

# If it fails, check:
# - Public key was added to authorized_keys
# - Key permissions are correct (600)
# - Server firewall allows SSH (port 22)
```

### Add to GitHub Secrets

1. Go to: **https://github.com/chipmcallister/PlayPBNow/settings/secrets/actions**
2. Click **New repository secret**
3. **Name:** `DO_SSH_PRIVATE_KEY`
4. **Value:** Paste the complete private key (including -----BEGIN and -----END lines)
5. Click **Add secret**

**⚠️ IMPORTANT:** The private key must include the BEGIN/END lines:
```
-----BEGIN OPENSSH PRIVATE KEY-----
[entire key content]
-----END OPENSSH PRIVATE KEY-----
```

## Step 2: Slack Webhook Setup

### Create Incoming Webhook in Slack

1. Go to: **https://api.slack.com/apps**
2. Click **Create New App** → **From scratch**
3. **App name:** `PlayPBNow Deployments`
4. **Workspace:** Select your Slack workspace
5. Click **Create App**
6. In left sidebar, click **Incoming Webhooks**
7. Toggle **Activate Incoming Webhooks** to ON
8. Click **Add New Webhook to Workspace**
9. **Post to:** Select channel (e.g., #deployments)
10. Click **Allow**
11. Copy the **Webhook URL** (something like `https://hooks.slack.com/services/T.../B.../...`)

### Test the Webhook

```bash
# Replace with your actual webhook URL
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from CI/CD"}' \
  "https://hooks.slack.com/services/T.../B.../..."

# Should receive a message in your Slack channel
```

### Add to GitHub Secrets

1. Go to: **https://github.com/chipmcallister/PlayPBNow/settings/secrets/actions**
2. Click **New repository secret**
3. **Name:** `SLACK_WEBHOOK_URL`
4. **Value:** Paste the webhook URL
5. Click **Add secret**

## Step 3: GitHub Token (Optional)

This is needed for creating GitHub issues on rollback. If you want automatic issue creation on rollback, follow these steps:

### Generate GitHub Personal Access Token

1. Go to: **https://github.com/settings/tokens**
2. Click **Generate new token** → **Generate new token (classic)**
3. **Token name:** `PlayPBNow CI/CD`
4. **Expiration:** 90 days (will need renewal)
5. **Scopes:** Check `public_repo` (minimum needed)
6. Click **Generate token**
7. Copy the token (shown in green)

### Add to GitHub Secrets

1. Go to: **https://github.com/chipmcallister/PlayPBNow/settings/secrets/actions**
2. Click **New repository secret**
3. **Name:** `GH_TOKEN`
4. **Value:** Paste the token
5. Click **Add secret**

**Note:** Classic tokens expire after 90 days. Set a reminder to renew before expiration.

## Step 4: Set Up Production Environment

The production deployment requires manual approval. This must be configured:

1. Go to: **https://github.com/chipmcallister/PlayPBNow/settings/environments**
2. Click **New environment**
3. **Name:** `production`
4. Click **Configure environment**
5. **Deployment branches:** Select `main` only
6. **Required reviewers:** Add your GitHub account
7. **Environment secrets:** (optional, if you need production-specific secrets)
8. Click **Save protection rules**

This ensures that:
- Only the `main` branch can deploy to production
- Manual approval is required before production deployment
- You can see who approved each deployment

## Verification Checklist

After setting up secrets, verify everything is working:

```bash
# 1. Test SSH key with DigitalOcean
ssh -i ~/.ssh/playpbnow_deploy root@64.227.108.128 "echo 'SSH works'"

# 2. Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test"}' \
  "$SLACK_WEBHOOK_URL"

# 3. Check GitHub secrets exist
# Go to Settings > Secrets > Actions
# Should see:
#   ✓ DO_SSH_PRIVATE_KEY
#   ✓ SLACK_WEBHOOK_URL
#   ✓ GH_TOKEN (if you added it)
```

## Test Deployment

After all secrets are configured, test the workflow:

1. Make a small change (e.g., update README.md)
2. Commit and push to main branch
3. Go to GitHub Actions tab
4. Wait for workflow to run
5. Watch the progress:
   - ✅ Test stage (should pass)
   - ✅ Build stage (should pass)
   - ✅ Deploy to staging (should pass)
   - ⏳ Manual approval (requires approval)
   - ✅ Deploy to production (if approved)
6. Check Slack for notifications
7. Verify deployment: `curl https://staging.playpbnow.com/`

## Troubleshooting Setup

### SSH Key Permission Denied

If you get `Permission denied (publickey)`:

1. Verify public key is in authorized_keys:
   ```bash
   ssh root@64.227.108.128 "grep AAAAC3 ~/.ssh/authorized_keys"
   ```
2. Check file permissions:
   ```bash
   ssh root@64.227.108.128 "ls -la ~/.ssh/"
   # Should show: -rw------- (600) for authorized_keys
   ```
3. Fix permissions if needed:
   ```bash
   ssh root@64.227.108.128 "chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
   ```

### Slack Webhook Returns 404

If you get `404 not_found` error:

1. Verify webhook URL is complete
2. Regenerate webhook in Slack workspace
3. Update GitHub secret with new URL
4. Test again

### GitHub Token Expired

If issue creation stops working:

1. Go to: **https://github.com/settings/tokens**
2. Find and regenerate the `PlayPBNow CI/CD` token
3. Update GitHub secret with new token
4. Keep track of expiration date (set calendar reminder)

## Security Best Practices

1. **Protect SSH key:**
   - Never commit to repository
   - Keep file permissions 600
   - Rotate periodically

2. **Protect webhook:**
   - Restrict to specific channel
   - Don't share in messages
   - Regenerate if exposed

3. **Protect GitHub token:**
   - Regenerate periodically
   - Use minimum required scopes
   - Never share in messages

4. **Audit secret access:**
   - GitHub tracks who accessed secrets
   - Review deployment logs
   - Check Slack message history

## Next Steps

1. ✅ Set up DO_SSH_PRIVATE_KEY
2. ✅ Set up SLACK_WEBHOOK_URL
3. ✅ Set up production environment approval
4. ✅ Test deployment with small change
5. ✅ Monitor first production deployment
6. ✅ Document any issues

---

**Last updated:** June 21, 2026
**Version:** 1.0
**Status:** Ready for setup
