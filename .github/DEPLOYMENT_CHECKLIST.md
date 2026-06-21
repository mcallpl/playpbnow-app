# PlayPBNow CI/CD Deployment Checklist

## Pre-Deployment Setup (One-Time)

### GitHub Repository Configuration
- [ ] Go to Repository Settings → Secrets and variables → Actions
- [ ] Add `DO_SSH_PRIVATE_KEY` secret (SSH private key for DigitalOcean)
- [ ] Add `SLACK_WEBHOOK_URL` secret (for deployment notifications)
- [ ] Add `GH_TOKEN` secret (optional, for automatic issue creation)
- [ ] Go to Settings → Environments → Create "production" environment
- [ ] Set production environment to require manual approval from main branch
- [ ] Add yourself as required reviewer for production

### DigitalOcean Server Setup
- [ ] SSH to server: `ssh root@64.227.108.128`
- [ ] Create staging directory: `mkdir -p /var/www/html/PlayPBNow-staging`
- [ ] Create staging API directory: `mkdir -p /var/www/html/PlayPBNow-staging/api`
- [ ] Verify production directory exists: `ls -la /var/www/html/PlayPBNow/`
- [ ] Create backups directory: `mkdir -p /var/backups`
- [ ] Verify permissions: `chmod 755 /var/www/html/PlayPBNow*`

### Database Setup
- [ ] Create staging database:
  ```sql
  CREATE DATABASE IF NOT EXISTS playpbnow_staging;
  GRANT ALL PRIVILEGES ON playpbnow_staging.* TO 'mcallpl'@'localhost';
  ```
- [ ] Verify production database exists: `SHOW DATABASES;` should list "playpbnow"

### DNS Configuration
- [ ] Verify DNS A record for staging.playpbnow.com points to 64.227.108.128
- [ ] Test DNS: `nslookup staging.playpbnow.com`
- [ ] Verify DNS for peoplestar.com (production)
- [ ] Test DNS: `nslookup peoplestar.com`

### Testing & Verification
- [ ] Test SSH connectivity: `ssh -i deploy_key root@64.227.108.128 "echo test"`
- [ ] Test Slack webhook: `curl -X POST ... -d '{"text":"test"}'`
- [ ] Run local build test: `npx expo export --platform web`
- [ ] Run local tests: `npm run test:frontend`

### Documentation
- [ ] Read DEPLOYMENT.md
- [ ] Read TROUBLESHOOTING.md
- [ ] Read .github/SETUP_SECRETS.md
- [ ] Keep TROUBLESHOOTING.md handy during first deployment

---

## For Each Deployment

### Pre-Merge to Main
- [ ] Feature branch created and tested locally
- [ ] All tests pass: `npm run test:frontend`
- [ ] Code review completed
- [ ] Linting issues resolved: `npm run lint`
- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] Changelog updated (optional)

### Merging to Main
- [ ] Pull request created against main
- [ ] GitHub Actions tests run automatically
- [ ] All tests pass (green checkmarks)
- [ ] Code review approval received
- [ ] Merge PR to main
- [ ] GitHub Actions workflow starts automatically

### Staging Deployment (Automatic)
- [ ] Monitor GitHub Actions tab for "Deploy PlayPBNow" workflow
- [ ] Wait for Test stage (5 min) ✓
- [ ] Wait for Build stage (3 min) ✓
- [ ] Wait for Deploy to Staging stage (2 min) ✓
- [ ] Verify Slack notification received
- [ ] Test staging environment: `curl https://staging.playpbnow.com/`

### Staging Verification (Manual Testing)
- [ ] Check landing page loads: https://staging.playpbnow.com/
- [ ] Check SPA loads: https://staging.playpbnow.com/app.html
- [ ] Test user login functionality
- [ ] Test key features work (invites, etc.)
- [ ] Check browser console for errors
- [ ] Check server logs for errors: `ssh root@... "tail -20 /var/log/apache2/error.log"`
- [ ] Performance acceptable (page load < 1s)

### Production Approval & Deployment (Manual)
- [ ] Go to GitHub Actions → Deploy PlayPBNow workflow
- [ ] Find your commit/run
- [ ] Wait for "Awaiting approval" message
- [ ] Review changes one more time
- [ ] Click "Review deployments" button
- [ ] Select "production" environment
- [ ] Type approval reason (e.g., "Tested on staging, ready for prod")
- [ ] Click "Approve and deploy"
- [ ] Watch deployment progress
- [ ] Wait for smoke tests (5 min) ✓
- [ ] Wait for monitoring period (5 min) ✓
- [ ] Verify Slack notification shows success ✅

### Production Verification (Post-Deployment)
- [ ] Check landing page: `curl https://peoplestar.com/PlayPBNow/ | grep '<title>'`
- [ ] Check SPA page: `curl https://peoplestar.com/PlayPBNow/app.html | grep '<title>'`
- [ ] Open browser and test user flows
- [ ] Check for console errors
- [ ] Monitor error logs for 5-10 minutes:
  ```bash
  ssh root@64.227.108.128 "tail -f /var/log/apache2/error.log"
  ```
- [ ] Verify database queries work
- [ ] Confirm features still function

### If Smoke Tests Fail
- [ ] GitHub Actions will automatically rollback
- [ ] Check Slack for rollback alert 🔴
- [ ] GitHub issue created with details
- [ ] Production reverted to previous version
- [ ] Investigate issue in GitHub Actions logs
- [ ] Fix code and create new PR
- [ ] Merge and redeploy

---

## Emergency Rollback (If Manual Rollback Needed)

If something goes wrong and you need to manually rollback:

```bash
# SSH to server
ssh root@64.227.108.128

# List available backups
ls -lt /var/backups/PlayPBNow-backup-* | head -5

# Restore backup (latest is usually what you want)
LATEST_BACKUP=$(ls -td /var/backups/PlayPBNow-backup-* | head -1)
rm -rf /var/www/html/PlayPBNow
cp -r $LATEST_BACKUP /var/www/html/PlayPBNow

# Verify rollback
curl https://peoplestar.com/PlayPBNow/
```

---

## Post-Deployment Monitoring

### First Hour After Production Deploy
- [ ] Monitor error logs: `tail -f /var/log/apache2/error.log`
- [ ] Check PHP errors: `tail -f /var/log/php/error.log`
- [ ] Monitor Slack for issues
- [ ] Test critical user flows
- [ ] Check database performance
- [ ] No unusual error rates

### Daily After Deployment
- [ ] Review error logs from overnight
- [ ] Check for any reported user issues
- [ ] Verify features still working
- [ ] Monitor server disk space
- [ ] Check database size

### Weekly After Deployment
- [ ] Review deployment stability
- [ ] Check backup health
- [ ] Verify DNS still resolving
- [ ] Plan next deployment (if any)

---

## Rollback Checklist (If Rollback Occurred)

If automatic rollback was triggered:

- [ ] Receive Slack alert 🔴
- [ ] Read GitHub issue with failure details
- [ ] Verify rollback was successful: `curl https://peoplestar.com/PlayPBNow/`
- [ ] Confirm users can access the site
- [ ] Investigate root cause
- [ ] Create fix in new PR
- [ ] Merge fix to main
- [ ] Redeploy with fix
- [ ] Extra testing before approval this time

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Test fails | Run `npm test:frontend` locally, fix errors |
| Build fails | Run `npx expo export --platform web` locally |
| Staging deploy fails | Check SSH key, verify staging dir exists |
| Smoke tests fail | Check server logs, verify Apache config |
| Can't approve | Wait for staging to finish, refresh page |
| Rollback occurred | Check GitHub issue, fix code, redeploy |
| SSH key error | Verify key in authorized_keys, test locally |
| Slack no message | Check webhook URL, test webhook |

See TROUBLESHOOTING.md for detailed solutions.

---

## Key Contacts & Resources

- **Deployment Docs:** DEPLOYMENT.md
- **Troubleshooting:** TROUBLESHOOTING.md
- **Setup Guide:** .github/SETUP_SECRETS.md
- **Contact:** mcallpl@gmail.com
- **Server:** 64.227.108.128
- **Domain:** peoplestar.com/PlayPBNow
- **Slack Channel:** #deployments

---

## Deployment Timeline Expectations

| Stage | Duration | Status |
|-------|----------|--------|
| Test & Validate | 5 min | Automatic, every commit |
| Build | 3 min | Automatic, on test pass |
| Deploy to Staging | 2 min | Automatic, on main push |
| Manual Approval Gate | ⏳ | Awaits your approval |
| Deploy to Production | 5 min | Automatic, on approval |
| **Total** | **~15 min** | From commit to prod |

---

## Success Indicators

After deployment, you should see:

✅ Slack notification with green checkmark
✅ No GitHub issue created (means no rollback)
✅ Website loads at both landing and SPA URLs
✅ No errors in console or logs
✅ User flows work as expected
✅ Database queries successful
✅ Response times acceptable

---

## Before Asking for Help

- [ ] Check GitHub Actions logs
- [ ] Check server logs (see TROUBLESHOOTING.md)
- [ ] Check TROUBLESHOOTING.md for your issue
- [ ] Test SSH and Slack webhook manually
- [ ] Verify all secrets are set correctly
- [ ] Review DEPLOYMENT.md again

---

**Last updated:** June 21, 2026
**Version:** 1.0
**Status:** Ready to use
