# PlayPBNow Deployment Guide

## Overview

PlayPBNow uses GitHub Actions for automated CI/CD with a staging environment and manual approval for production deployments. This document describes the deployment workflow, environment setup, and troubleshooting.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                        │
│                     (main branch)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
         ┌──────────────┐      ┌──────────────┐
         │ Test Stage   │      │ Build Stage  │
         │ (Jest)       │      │ (Expo Build) │
         │ (ESLint)     │      │              │
         │ (TypeScript) │      │              │
         └──────┬───────┘      └──────┬───────┘
                └──────────────┬──────┘
                               ▼
                      ┌──────────────────────┐
                      │   Deploy to Staging  │
                      │ (automatic on push)  │
                      │ (smoke tests)        │
                      └──────────┬───────────┘
                                 │
                      ┌──────────┴──────────┐
                      │ Manual Approval     │
                      │ Required for Prod   │
                      └──────────┬──────────┘
                                 ▼
                      ┌──────────────────────┐
                      │ Deploy to Production │
                      │ (backup first)       │
                      │ (smoke tests)        │
                      │ (5min monitoring)    │
                      └──────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
              ┌──────────────┐         ┌──────────────┐
              │ Success ✅   │         │ Failure ❌   │
              │ Slack alert  │         │ Auto-rollback│
              │ Issue closed │         │ Slack alert  │
              └──────────────┘         │ GitHub issue │
                                       └──────────────┘
```

## Workflow Stages

### 1. Test Stage (automatic on every commit)
- Installs dependencies
- Runs ESLint (non-blocking)
- Runs TypeScript type checking (non-blocking)
- Runs Jest frontend tests
- Uploads coverage to Codecov
- **Duration:** ~5 minutes
- **Trigger:** Any push or pull request

### 2. Build Stage (automatic on test success)
- Builds Expo web export
- Prepares SPA routing (moves files, creates .htaccess)
- Uploads artifact for deployment stages
- **Duration:** ~3 minutes
- **Trigger:** Test stage success

### 3. Deploy to Staging (automatic on main branch push)
- Downloads build artifact
- Deploys web files to `/var/www/html/PlayPBNow-staging/`
- Deploys API files to `/var/www/html/PlayPBNow-staging/api/`
- Runs smoke tests
- Sends Slack notification
- **Duration:** ~2 minutes
- **Trigger:** Push to main branch
- **Environment:** `staging.playpbnow.com`

### 4. Manual Approval Gate
- Requires GitHub environment approval for production
- Authorized users only
- Must approve before production deployment proceeds

### 5. Deploy to Production (manual approval required)
- Creates backup of current production
- Downloads build artifact
- Deploys web files to `/var/www/html/PlayPBNow/`
- Deploys API files to `/var/www/html/PlayPBNow/api/`
- Runs smoke tests
- Monitors for 5 minutes
- Auto-rollback on any failure
- Sends Slack notification
- **Duration:** ~5 minutes
- **Trigger:** Manual approval after main branch push
- **Environment:** `https://peoplestar.com/PlayPBNow`

### 6. Rollback (automatic on production failure)
- Restores from latest backup
- Runs smoke tests on restored version
- Creates GitHub issue for investigation
- Sends alert to Slack #incidents channel
- **Duration:** ~2 minutes
- **Trigger:** Smoke test failure during production deployment

## GitHub Secrets Setup

The following secrets must be configured in GitHub repository settings:

### Required Secrets

```
DO_SSH_PRIVATE_KEY
  Description: SSH private key for DigitalOcean authentication
  Value: [paste full private key including -----BEGIN and -----END lines]

SLACK_WEBHOOK_URL
  Description: Slack webhook for deployment notifications
  Value: https://hooks.slack.com/services/T.../B.../...

GH_TOKEN (optional)
  Description: GitHub token for creating issues on rollback
  Value: ghp_... (with public_repo scope)
```

### How to Add Secrets

1. Go to GitHub repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter secret name and value
5. Click **Add secret**

## Environment Setup

### Staging Environment

The staging environment mirrors production but uses a separate database and URL.

**On DigitalOcean server:**

```bash
# Create staging directory
mkdir -p /var/www/html/PlayPBNow-staging
mkdir -p /var/www/html/PlayPBNow-staging/api

# Create staging database
mysql -u mcallpl -pamazing123 << EOF
CREATE DATABASE IF NOT EXISTS playpbnow_staging;
EOF

# Copy schema from production (one-time setup)
mysqldump -u mcallpl -pamazing123 playpbnow --no-data | \
  mysql -u mcallpl -pamazing123 playpbnow_staging

# Configure DNS/subdomain
# Point staging.playpbnow.com → 64.227.108.128
```

**In DNS provider:**
```
Record: A
Name: staging.playpbnow.com
IP: 64.227.108.128
TTL: 3600
```

### Production Environment

The production environment uses the main database and domain.

**Already configured:**
- `/var/www/html/PlayPBNow/` - web files
- `/var/www/html/PlayPBNow/api/` - API files
- `playpbnow` database
- `https://peoplestar.com/PlayPBNow` - main domain

## Environment Configuration

### .env Files

Environment-specific variables are stored in `.env.production` and `.env.staging`:

**Production variables:**
- `NODE_ENV=production`
- `API_URL=https://peoplestar.com/PlayPBNow/api`
- `DATABASE_NAME=playpbnow`
- `STRIPE_SECRET_KEY=sk_live_...` (production Stripe key)
- `LOG_LEVEL=info`

**Staging variables:**
- `NODE_ENV=staging`
- `API_URL=https://staging.playpbnow.com/api`
- `DATABASE_NAME=playpbnow_staging`
- `STRIPE_SECRET_KEY=sk_test_...` (test Stripe key)
- `LOG_LEVEL=debug`

These files are loaded by the deployment process and passed to the application.

## Deploying Changes

### Standard Deployment Flow

1. **Make code changes** on a feature branch
2. **Open a pull request** against main branch
   - Tests run automatically
   - Review and approve PR
3. **Merge to main**
   - Tests run automatically
   - Build runs automatically
   - **Deploy to staging automatically**
   - Review staging environment
4. **Manual approval for production**
   - Go to GitHub Actions run
   - Click the "Review deployments" button
   - Approve for production environment
   - **Deploy to production automatically**

### Deployment Timeline

- **Test:** 5 minutes
- **Build:** 3 minutes
- **Staging deploy:** 2 minutes
- **Production deploy:** 5 minutes (including 5-minute monitoring)
- **Total:** ~15 minutes from commit to production

### Staging Testing Checklist

Before approving production deployment, test on staging:

- [ ] Landing page loads: `https://staging.playpbnow.com/`
- [ ] SPA loads: `https://staging.playpbnow.com/app.html`
- [ ] User login works
- [ ] Create invite works (if premium feature)
- [ ] API calls succeed
- [ ] Database queries work
- [ ] No console errors (check browser dev tools)
- [ ] No errors in server logs

## Monitoring Deployments

### GitHub Actions

Track deployment progress:

1. Go to **Actions** tab in GitHub
2. Click the **Deploy PlayPBNow** workflow
3. Find your commit/run
4. Click to see job details and logs

### Slack Notifications

Slack notifications are sent to your configured webhook:

- **Staging deployment** - Status and summary
- **Production deployment** - Status and summary
- **Rollback alert** - Detailed failure info

### Server Logs

Check DigitalOcean server logs:

```bash
# SSH to server
ssh root@64.227.108.128

# Check web server logs
tail -f /var/log/apache2/error.log
tail -f /var/log/apache2/access.log

# Check PHP errors
tail -f /var/log/php/error.log

# Check app-specific logs
ls -la /var/www/html/PlayPBNow/logs/
```

## Rollback Procedure

### Automatic Rollback

If smoke tests fail during production deployment:

1. Previous backup is automatically restored
2. GitHub issue is created for investigation
3. Slack alert is sent to team
4. You must fix the issue and redeploy

### Manual Rollback (if needed)

If you need to manually rollback:

```bash
# SSH to server
ssh root@64.227.108.128

# List available backups
ls -la /var/backups/PlayPBNow-backup-*

# Restore specific backup
BACKUP_NAME="PlayPBNow-backup-1234567890"
rm -rf /var/www/html/PlayPBNow
cp -r /var/backups/$BACKUP_NAME /var/www/html/PlayPBNow

# Verify rollback
curl https://peoplestar.com/PlayPBNow/
```

## Troubleshooting

### Deployment Fails at Test Stage

**Symptoms:** Red ❌ on test job

**Solutions:**
1. Check test logs in GitHub Actions
2. Run tests locally: `npm run test:frontend`
3. Fix failing tests
4. Push fix to main branch

### Deployment Fails at Build Stage

**Symptoms:** Red ❌ on build job

**Solutions:**
1. Check build logs
2. Verify `dist/` directory structure
3. Run build locally: `npx expo export --platform web`
4. Check for missing dependencies: `npm ci`

### Deployment Fails at Staging Deploy

**Symptoms:** Red ❌ on deploy-staging job

**Solutions:**
1. Check SSH connectivity to server
2. Verify staging directory exists: `ls -la /var/www/html/PlayPBNow-staging/`
3. Check disk space: `df -h /var/www/html/`
4. Verify SSH key in GitHub secrets is correct
5. Check server permissions: `chmod 755 /var/www/html/PlayPBNow-staging/`

### Smoke Tests Fail

**Symptoms:** Smoke test requests return non-200 status codes

**Solutions:**
1. Check if staging/production is actually deployed
2. Verify domain DNS resolution
3. Check Apache .htaccess configuration
4. Check file permissions on deployed files
5. Review server error logs

### Can't Approve Production Deployment

**Symptoms:** "Review deployments" button not available in GitHub

**Solutions:**
1. Ensure you're on the main branch
2. Ensure deployment reached the approval gate
3. Check your GitHub permissions (must be repo admin or designated reviewer)
4. Wait for staging deployment to complete first

### Production Rollback Occurred

**Symptoms:** Slack alert about rollback, GitHub issue created

**Response:**
1. Read the GitHub issue for details
2. Check the failed deployment logs
3. Fix the issue in code
4. Create PR with fix
5. Merge to main
6. Deploy again

### DNS Issues

**Symptoms:** `curl: (6) Could not resolve host` errors

**Solutions:**
1. Verify DNS records are set correctly:
   ```bash
   nslookup staging.playpbnow.com
   nslookup peoplestar.com
   ```
2. Wait for DNS propagation (up to 48 hours)
3. Flush local DNS cache: `sudo dscacheutil -flushcache` (macOS)
4. Check with DNS checker: https://mxtoolbox.com/

## Database Migrations

Database migrations are currently manual. To add auto-migrations:

1. Create migration scripts in `playpbnow-api/migrations/`
2. Name them with timestamp: `001_create_table.sql`
3. Modify `.github/workflows/deploy.yml` to run migrations
4. Example:
   ```bash
   ssh root@64.227.108.128 "mysql -u mcallpl -pamazing123 playpbnow < migrations.sql"
   ```

## Performance Monitoring

After deployment, monitor these metrics:

- **Response time:** Should be < 1s
- **Error rate:** Should be < 0.1%
- **Uptime:** Should be 99.9%+
- **Database queries:** Check slow query log

## Disaster Recovery

### Complete Production Failure

If production is completely down:

1. **Check server status:**
   ```bash
   ssh root@64.227.108.128
   systemctl status apache2
   systemctl status mysql
   ```

2. **Restart services:**
   ```bash
   systemctl restart apache2
   systemctl restart mysql
   ```

3. **Restore from backup:**
   ```bash
   LATEST_BACKUP=$(ls -td /var/backups/PlayPBNow-backup-* | head -1)
   rm -rf /var/www/html/PlayPBNow
   cp -r $LATEST_BACKUP /var/www/html/PlayPBNow
   ```

4. **Verify:**
   ```bash
   curl https://peoplestar.com/PlayPBNow/
   ```

### Database Corruption

If database is corrupted:

1. **Backup current state:**
   ```bash
   mysqldump -u mcallpl -pamazing123 playpbnow > /tmp/corrupted_backup.sql
   ```

2. **Check database integrity:**
   ```bash
   mysqlcheck -u mcallpl -pamazing123 playpbnow -a
   ```

3. **Restore from latest backup:**
   ```bash
   mysql -u mcallpl -pamazing123 playpbnow < /var/backups/playpbnow_backup.sql
   ```

## Next Steps

1. **Configure GitHub secrets** (required for deployments to work)
2. **Set up staging environment** on DigitalOcean
3. **Test the workflow** with a dummy commit
4. **Monitor first production deployment** closely
5. **Document any issues** encountered

## Support

For issues or questions:

1. Check GitHub Actions logs first
2. Review this DEPLOYMENT.md document
3. Check TROUBLESHOOTING.md for common issues
4. Contact Chip McAllister (mcallpl@gmail.com)

---

**Last updated:** June 21, 2026
**Version:** 1.0
**Status:** Ready for staging testing
