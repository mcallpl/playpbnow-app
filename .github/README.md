# PlayPBNow CI/CD Pipeline

This directory contains the GitHub Actions workflow files and deployment scripts for automated CI/CD of PlayPBNow.

## Quick Start

**For your first deployment, follow this order:**

1. **[SETUP_SECRETS.md](./SETUP_SECRETS.md)** - Configure GitHub secrets (required)
2. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment setup
3. **../DEPLOYMENT.md** - Understand the workflow
4. **Test with a small change** to main branch
5. **Monitor the deployment** in GitHub Actions

## File Structure

```
.github/
├── workflows/
│   └── deploy.yml              # Main GitHub Actions workflow (5 stages)
├── scripts/
│   └── smoke-tests.sh          # Health check script for deployments
├── SETUP_SECRETS.md            # GitHub secrets configuration guide
├── DEPLOYMENT_CHECKLIST.md     # Pre-deployment checklist
└── README.md                   # This file

../
├── DEPLOYMENT.md               # Complete deployment guide
├── TROUBLESHOOTING.md          # Troubleshooting guide
├── .env.production             # Production environment config
├── .env.staging                # Staging environment config
└── package.json                # Updated with Jest scripts
```

## Workflow Overview

The deployment pipeline has 5 stages:

```
┌──────────────┐
│ Commit Code  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Test (5 min)     │ ESLint, TypeScript, Jest
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Build (3 min)    │ Expo web export, SPA routing
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Staging (2 min)  │ Automatic deployment
└──────┬───────────┘ Smoke tests, Slack alert
       │
       ▼ (wait for approval)
┌──────────────────┐
│ Production       │ Manual approval required
│ (5 min)          │ Backup, deploy, monitoring
└──────┬───────────┘
       │
   ┌───┴────┐
   ▼        ▼
Success   Rollback
✅        🔴
```

## Key Features

✅ **Automated Testing**
- ESLint for code quality (non-blocking)
- TypeScript type checking (non-blocking)
- Jest unit tests (blocking)
- Coverage reporting

✅ **Automated Build**
- Expo web export
- SPA routing setup (app.html)
- Artifact upload

✅ **Staging Deployment**
- Automatic on main branch push
- Separate staging database
- Smoke tests validation
- Slack notifications

✅ **Production Deployment**
- Requires manual GitHub approval
- Automatic backup before deploy
- Blue-green ready architecture
- 5-minute monitoring period
- Auto-rollback on failure

✅ **Monitoring & Alerts**
- Slack notifications for all stages
- Automatic GitHub issue on rollback
- Smoke test validation
- Error tracking

## Getting Started

### 1. Configure Secrets (REQUIRED)

See [SETUP_SECRETS.md](./SETUP_SECRETS.md) for detailed instructions.

Required secrets:
- `DO_SSH_PRIVATE_KEY` - SSH key for DigitalOcean
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications
- `GH_TOKEN` (optional) - For automatic issue creation

```bash
# Test SSH locally
ssh -i ~/.ssh/playpbnow_deploy root@64.227.108.128 "echo works"
```

### 2. Set Up DigitalOcean Server

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for server setup.

Required directories:
- `/var/www/html/PlayPBNow` (production)
- `/var/www/html/PlayPBNow-staging` (staging)

Required databases:
- `playpbnow` (production)
- `playpbnow_staging` (staging)

### 3. Test the Workflow

1. Make a small change to main branch
2. Wait for GitHub Actions to run
3. Monitor all stages in Actions tab
4. Check Slack for notifications
5. Verify deployment on staging

### 4. Production Deployment

1. Review changes on staging
2. Click "Review deployments" in GitHub Actions
3. Approve for production
4. Watch deployment progress
5. Verify production after deploy

## Documentation

| Document | Purpose |
|----------|---------|
| [SETUP_SECRETS.md](./SETUP_SECRETS.md) | Configure GitHub secrets and environments |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | Step-by-step deployment checklist |
| [../DEPLOYMENT.md](../DEPLOYMENT.md) | Complete deployment workflow guide |
| [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) | Common issues and solutions |

## Workflow Files

### `workflows/deploy.yml`

The main GitHub Actions workflow with 5 jobs:

1. **test** - Lint, type check, and run tests
2. **build** - Build Expo web export with SPA routing
3. **deploy-staging** - Deploy to staging environment
4. **deploy-production** - Deploy to production (requires approval)
5. **rollback** - Auto-rollback on failure

**Triggers:**
- Push to main branch
- Pull requests to main branch

**Duration:** ~15 minutes from commit to production

### `scripts/smoke-tests.sh`

Validates that deployment succeeded by testing:
- Landing page loads (HTTP 200)
- SPA page loads (HTTP 200)
- Static assets (HTTP 200)
- API health check (optional)

Run manually:
```bash
./.github/scripts/smoke-tests.sh staging
./.github/scripts/smoke-tests.sh production
```

## Environment Configuration

### `.env.production`

Production environment variables:
```
NODE_ENV=production
API_URL=https://peoplestar.com/PlayPBNow/api
DATABASE_NAME=playpbnow
```

**Secrets set on server** (not in repo):
- DATABASE_USER
- DATABASE_PASS
- STRIPE_SECRET_KEY
- TWILIO_SID

### `.env.staging`

Staging environment variables:
```
NODE_ENV=staging
API_URL=https://staging.playpbnow.com/api
DATABASE_NAME=playpbnow_staging
```

## Monitoring Deployments

### GitHub Actions

1. Go to **Actions** tab
2. Click **Deploy PlayPBNow** workflow
3. View job logs and status

### Slack

Notifications sent to your configured webhook:
- Staging deployment status
- Production deployment status
- Rollback alerts with details

### Server Logs

```bash
ssh root@64.227.108.128

# Apache logs
tail -f /var/log/apache2/error.log
tail -f /var/log/apache2/access.log

# PHP logs
tail -f /var/log/php/error.log
```

## Common Tasks

### Deploy Changes

1. Make code changes on feature branch
2. Open PR to main (tests run automatically)
3. Review and merge to main
4. Deploy to staging automatically
5. Test on staging
6. Approve for production in GitHub

### Manual Rollback

If automatic rollback didn't work:

```bash
ssh root@64.227.108.128

# List backups
ls -lt /var/backups/PlayPBNow-backup-* | head

# Restore latest
LATEST=$(ls -td /var/backups/PlayPBNow-backup-* | head -1)
rm -rf /var/www/html/PlayPBNow
cp -r $LATEST /var/www/html/PlayPBNow
```

### Fix Failed Deployment

1. Review GitHub Actions logs
2. Check server error logs
3. Fix code issues
4. Merge fix to main
5. Redeploy

### Check Deployment Status

```bash
# Landing page
curl https://peoplestar.com/PlayPBNow/

# SPA
curl https://peoplestar.com/PlayPBNow/app.html

# Staging
curl https://staging.playpbnow.com/
```

## Troubleshooting

See [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for:
- Test failures
- Build failures
- Deployment failures
- Smoke test failures
- SSH/Slack issues
- Manual rollback procedure

## Architecture

### Staging Environment

- **URL:** https://staging.playpbnow.com
- **Database:** playpbnow_staging
- **Directory:** /var/www/html/PlayPBNow-staging
- **Purpose:** Test all deployments before production
- **Updates:** Automatic on main branch push

### Production Environment

- **URL:** https://peoplestar.com/PlayPBNow
- **Database:** playpbnow
- **Directory:** /var/www/html/PlayPBNow
- **Purpose:** Live user traffic
- **Updates:** Manual approval required
- **Backups:** Automatic before each deploy at /var/backups/

## Next Steps

1. ✅ Set up GitHub secrets (SETUP_SECRETS.md)
2. ✅ Set up DigitalOcean server (DEPLOYMENT_CHECKLIST.md)
3. ✅ Test workflow with small change
4. ✅ Monitor first production deployment
5. ✅ Document any issues found
6. ✅ Train team on deployment process

## Support

- **Setup:** See SETUP_SECRETS.md
- **Deployment:** See DEPLOYMENT.md
- **Troubleshooting:** See TROUBLESHOOTING.md
- **Issues:** Create issue on GitHub or email mcallpl@gmail.com

---

**Last updated:** June 21, 2026
**Version:** 1.0
**Status:** Ready for staging testing
