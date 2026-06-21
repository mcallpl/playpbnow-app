# PlayPBNow Deployment Troubleshooting Guide

## Common Issues and Solutions

### Test Stage Failures

#### Issue: `npm ci` fails with dependency errors

**Symptoms:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Causes:**
- Node version mismatch
- package-lock.json out of date
- New dependency conflicts

**Solutions:**
1. Check Node version: `node --version` (should be 18+)
2. Update package-lock.json locally:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Commit and push updated package-lock.json
4. If still fails, check for conflicting versions in package.json

#### Issue: ESLint fails but deployment should continue

**Current behavior:** Non-blocking (deployment continues)

**To enforce linting:**
1. Edit `.github/workflows/deploy.yml`
2. Change `eslint` step `continue-on-error` to `false`
3. Fix all linting errors before deploying

#### Issue: TypeScript errors in type checking

**Symptoms:**
```
error TS2345: Argument of type 'string' is not assignable to type 'number'
```

**Current behavior:** Non-blocking (deployment continues)

**Solutions:**
1. Fix types locally: `npx tsc --noEmit`
2. Review TypeScript error messages
3. Update type definitions or fix code
4. Push to main to trigger new test run

#### Issue: Frontend tests fail

**Symptoms:**
```
FAIL __tests__/ApiClient.test.ts
  ✕ should correctly format API requests
```

**Solutions:**
1. Run tests locally: `npm run test:frontend`
2. Review test failures and fix code
3. Update tests if behavior intentionally changed
4. Ensure all new code has corresponding tests

### Build Stage Failures

#### Issue: Expo export fails

**Symptoms:**
```
error: Unable to export web build
```

**Solutions:**
1. Run build locally: `npx expo export --platform web`
2. Check for syntax errors in source code
3. Verify app.json is valid JSON
4. Check for missing assets referenced in code
5. Ensure native modules aren't imported in web code

#### Issue: SPA routing preparation fails

**Symptoms:**
```
error: Cannot find 'dist/index.html'
```

**Solutions:**
1. Verify expo export created `dist/` directory
2. Check if index.html exists: `ls -la dist/index.html`
3. Review build step logs for expo export errors
4. Ensure `public/landing.html` exists

#### Issue: .htaccess not created

**Symptoms:**
```
error: Cannot find 'dist/.htaccess'
```

**Solutions:**
1. Check build logs for errors
2. Verify bash script has execution permissions
3. Run preparation step locally:
   ```bash
   npx expo export --platform web
   mv dist/index.html dist/app.html
   cp public/landing.html dist/index.html
   # Check .htaccess creation
   ls -la dist/.htaccess
   ```

### Staging Deployment Failures

#### Issue: SSH connection fails

**Symptoms:**
```
ssh: connect to host 64.227.108.128 port 22: Connection timed out
Permission denied (publickey)
```

**Causes:**
- Invalid SSH key
- DigitalOcean server not running
- SSH key not added to GitHub secrets
- Firewall blocking connection

**Solutions:**
1. Test SSH locally:
   ```bash
   ssh -i ~/.ssh/deploy_key root@64.227.108.128 "echo 'Connected'"
   ```
2. Verify SSH key in GitHub secrets:
   - Go to Settings → Secrets → Actions
   - Check `DO_SSH_PRIVATE_KEY` exists
   - Ensure it includes BEGIN/END lines
3. Generate new key if needed:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/playpbnow_deploy
   cat ~/.ssh/playpbnow_deploy | pbcopy  # Copy to clipboard
   # Add to GitHub secrets
   # Add to DigitalOcean authorized_keys
   ```
4. Verify server status:
   - Check DigitalOcean console
   - Restart if needed: `reboot`

#### Issue: rsync deployment fails

**Symptoms:**
```
rsync: connection unexpectedly closed
failed to connect to 64.227.108.128: No such file or directory
```

**Causes:**
- SSH key issue (see above)
- rsync not installed on server
- Destination directory doesn't exist
- Permission denied on destination

**Solutions:**
1. Verify SSH works (see SSH connection issue)
2. Check staging directory exists:
   ```bash
   ssh root@64.227.108.128 "ls -la /var/www/html/PlayPBNow-staging/"
   ```
3. Create if missing:
   ```bash
   ssh root@64.227.108.128 "mkdir -p /var/www/html/PlayPBNow-staging"
   ```
4. Fix permissions:
   ```bash
   ssh root@64.227.108.128 "chmod 755 /var/www/html/PlayPBNow-staging"
   ```
5. Check disk space:
   ```bash
   ssh root@64.227.108.128 "df -h /var/www/html/"
   ```

#### Issue: Smoke tests fail after deployment

**Symptoms:**
```
❌ Landing page failed (HTTP 404)
❌ SPA loads failed (HTTP 404)
```

**Causes:**
- Files not deployed correctly
- Apache not configured
- .htaccess not working
- DNS not resolved

**Solutions:**
1. Check deployed files:
   ```bash
   ssh root@64.227.108.128 "ls -la /var/www/html/PlayPBNow-staging/"
   ```
2. Test with curl:
   ```bash
   curl -v https://staging.playpbnow.com/
   ```
3. Check Apache configuration:
   ```bash
   ssh root@64.227.108.128 "apache2ctl -t"
   ```
4. Restart Apache:
   ```bash
   ssh root@64.227.108.128 "systemctl restart apache2"
   ```
5. Check error logs:
   ```bash
   ssh root@64.227.108.128 "tail -50 /var/log/apache2/error.log"
   ```

### Production Deployment Failures

#### Issue: Backup fails

**Symptoms:**
```
❌ Backup creation failed
No such file or directory
```

**Causes:**
- `/var/backups` doesn't exist
- Permission denied
- Disk space full

**Solutions:**
1. Create backups directory:
   ```bash
   ssh root@64.227.108.128 "mkdir -p /var/backups && chmod 755 /var/backups"
   ```
2. Check disk space:
   ```bash
   ssh root@64.227.108.128 "df -h"
   ```
3. Clean old backups if space is low:
   ```bash
   ssh root@64.227.108.128 "ls -lt /var/backups/ | tail -10"
   ssh root@64.227.108.128 "rm -rf /var/backups/PlayPBNow-backup-* (keep recent ones)"
   ```

#### Issue: Production smoke tests fail

**Symptoms:**
```
❌ API health failed (HTTP 500)
❌ Database connected failed (HTTP 500)
```

**Causes:**
- API code issue
- Database connection failure
- PHP error
- Missing environment variables

**Solutions:**
1. Check PHP error log:
   ```bash
   ssh root@64.227.108.128 "tail -50 /var/log/php/error.log"
   ```
2. Check Apache error log:
   ```bash
   ssh root@64.227.108.128 "tail -50 /var/log/apache2/error.log"
   ```
3. Test API directly:
   ```bash
   curl -v https://peoplestar.com/PlayPBNow/api/health.php
   ```
4. Check database connectivity:
   ```bash
   ssh root@64.227.108.128
   mysql -u mcallpl -pamazing123 -e "SELECT VERSION();"
   ```
5. Verify environment variables are loaded in API

#### Issue: Monitoring period shows errors

**Symptoms:**
```
⏱️ Monitoring production for 5 minutes...
Check 2/30...
❌ Error detected during monitoring
```

**What happens:**
- Automatic rollback triggers
- GitHub issue created
- Slack alert sent
- Previous version restored

**Resolution:**
1. Review the GitHub issue created with details
2. Check which request failed and why
3. Fix the issue in code
4. Create PR and merge to main
5. Redeploy

### Manual Production Approval Issues

#### Issue: Can't find "Review deployments" button

**Symptoms:**
- Deployed to staging successfully
- No approval button visible in GitHub Actions

**Causes:**
- Not on main branch
- Staging deployment still running
- Environment not configured
- Missing repository permissions

**Solutions:**
1. Ensure on main branch (check workflow run)
2. Wait for staging deployment to finish completely
3. Refresh GitHub page
4. Check repository settings → Environments
5. Verify you have admin permissions

#### Issue: "Not authorized to approve"

**Symptoms:**
```
Error: You do not have permission to review this deployment
```

**Causes:**
- Not in reviewers list
- Insufficient permissions
- Environment not configured correctly

**Solutions:**
1. Check environment settings:
   - Go to Settings → Environments → production
   - Verify your GitHub account is listed as reviewer
2. Ask repo admin to add you:
   - Go to Settings → Environments → production
   - Click "Add deployment branch protection rules"
   - Add your account to Required reviewers

### Slack Notification Issues

#### Issue: Slack notifications not received

**Symptoms:**
- Deployments complete but no Slack message
- No error in GitHub Actions logs

**Causes:**
- Webhook URL invalid
- Webhook revoked
- Slack workspace/channel deleted
- Secret not configured

**Solutions:**
1. Verify webhook secret exists:
   - Go to Settings → Secrets → Actions
   - Check `SLACK_WEBHOOK_URL` is present
2. Test webhook manually:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test message"}' \
     "YOUR_WEBHOOK_URL"
   ```
3. Regenerate webhook if expired:
   - Go to Slack workspace settings
   - Create new incoming webhook
   - Update GitHub secret with new URL

### Monitoring and Recovery

#### Issue: Deployment is stuck

**Symptoms:**
- Action still running after 30+ minutes
- No progress in logs

**Solutions:**
1. Cancel the workflow:
   - Go to Actions tab
   - Click running workflow
   - Click "Cancel workflow"
2. Check for hanging processes:
   ```bash
   ssh root@64.227.108.128 "ps aux | grep rsync"
   ssh root@64.227.108.128 "ps aux | grep curl"
   ```
3. Investigate logs to find where it's stuck

#### Issue: Server unresponsive during deployment

**Symptoms:**
- Deployment running but server not responding
- `curl` timeouts

**Recovery:**
1. Check server status in DigitalOcean console
2. If unresponsive, request reboot:
   ```bash
   # Via DigitalOcean API or console
   ```
3. Wait for server to restart
4. Verify services are running:
   ```bash
   ssh root@64.227.108.128 "systemctl status apache2 mysql"
   ```
5. Restart if needed
6. Redeploy

### Debug Tips

#### Enable detailed logging

Temporarily add debugging to workflow:

```yaml
- name: Debug SSH connection
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.DO_SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    ssh -v -i ~/.ssh/deploy_key root@64.227.108.128 "echo 'SSH works'"
```

#### Test commands locally

Before pushing, test deployment commands locally:

```bash
# Test build
npx expo export --platform web

# Test SPA prep
mv dist/index.html dist/app.html
cp public/landing.html dist/index.html
ls -la dist/.htaccess

# Test smoke tests
bash .github/scripts/smoke-tests.sh staging
bash .github/scripts/smoke-tests.sh production

# Test SSH (if you have the key)
ssh -i ~/.ssh/playpbnow_deploy root@64.227.108.128 "ls /var/www/html/"
```

#### Check logs on server

SSH to server and check logs directly:

```bash
# Web server logs
tail -f /var/log/apache2/error.log
tail -f /var/log/apache2/access.log

# PHP logs
tail -f /var/log/php/error.log

# System logs
tail -f /var/log/syslog

# App logs (if any)
ls -la /var/www/html/PlayPBNow/logs/

# DNS resolution
nslookup staging.playpbnow.com
nslookup peoplestar.com

# Disk space
df -h /var/www/html/
```

#### Verify file permissions

Ensure files are readable by web server:

```bash
# Check ownership
ls -la /var/www/html/PlayPBNow/ | head

# Fix if needed
chown -R www-data:www-data /var/www/html/PlayPBNow/
chmod 755 /var/www/html/PlayPBNow/
```

## Getting Help

1. **Check logs first:**
   - GitHub Actions logs (most detailed)
   - Server error logs
   - Browser console (for frontend issues)

2. **Search this guide:**
   - Look for your symptoms
   - Follow the solutions

3. **Contact support:**
   - Email: mcallpl@gmail.com
   - Include: Deployment run URL, error logs, steps to reproduce

---

**Last updated:** June 21, 2026
**Version:** 1.0
