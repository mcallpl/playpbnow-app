# Authentication Security Hardening - Deployment Checklist

**Project:** PlayPBNow  
**Date:** June 24, 2026  
**Status:** Ready for Deployment  

---

## Summary

Complete authentication security hardening has been implemented with 10 critical security fixes:

1. ✅ Rate limiting (5 attempts/minute)
2. ✅ Account lockout (15 minutes after 5 failed attempts)
3. ✅ Session validation endpoint
4. ✅ Backend logout with session revocation
5. ✅ CSRF token protection (POST requests)
6. ✅ CORS headers restricted to peoplestar.com
7. ✅ Error message hardening (no account enumeration)
8. ✅ Phone requirement consistency (optional for registration)
9. ✅ Session revocation on password change
10. ✅ Multi-device session management (view/logout devices)

---

## Files Deployed to `/var/www/html/PlayPBNow/playpbnow-api/`

### New PHP Endpoints
- `security_helpers.php` - Shared security functions library
- `validate_session.php` - Session validation endpoint
- `logout.php` - Logout with session revocation
- `manage_sessions.php` - Multi-device session management
- `setup_security_tables.php` - Database schema migration (run once)

### Updated PHP Endpoints
- `email_login.php` - Rate limiting, CSRF tokens, CORS restrictions
- `forgot_password.php` - Error message fix, CORS restrictions
- `change_password.php` - Session revocation, CORS restrictions

### Documentation (Root Directory)
- `AUTH_SECURITY_HARDENING.md` - Complete implementation details
- `AUTH_SECURITY_TESTS.md` - Testing procedures and verification
- `DEPLOYMENT_CHECKLIST.md` - This file

---

## Pre-Deployment Verification

Before deploying to production, verify:

- [ ] All PHP files have correct syntax: `php -l filename.php`
- [ ] Database backups are current
- [ ] Test environment has same database schema
- [ ] Team members notified of API changes
- [ ] Frontend integration tested (see testing guide)

---

## Deployment Steps

### Step 1: Backup Production Database
```bash
ssh root@64.227.108.128
mysqldump -u mcallpl -p playpbnow > /var/backups/playpbnow_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Deploy API Files
From local machine:
```bash
cd /Users/chipmcallister/Projects/PlayPBNow
./deploy-api.sh
```

This syncs all `playpbnow-api/` files to the server via rsync.

### Step 3: Run Database Migration
SSH to server and execute:
```bash
cd /var/www/html/PlayPBNow/playpbnow-api
php setup_security_tables.php
```

Expected output:
```json
{
  "failed_login_attempts_table": "created",
  "account_lockouts_table": "created",
  "csrf_tokens_table": "created",
  "user_sessions_is_active_column": "added",
  "user_sessions_device_name_column": "added",
  "user_sessions_created_at_column": "already_exists",
  "user_sessions_last_activity_column": "added",
  "user_sessions_index": "added",
  "user_sessions_active_index": "added"
}
```

### Step 4: Verify Deployment
```bash
# Check files deployed
ssh root@64.227.108.128 "ls -la /var/www/html/PlayPBNow/playpbnow-api/*.php | grep -E 'security_helpers|validate_session|logout.php|manage_sessions'"

# Test endpoints responding
curl https://peoplestar.com/PlayPBNow/api/validate_session.php 2>/dev/null | head -c 100

# Check database
mysql -u mcallpl -p -D playpbnow -e "SHOW TABLES LIKE 'failed_%'; SHOW TABLES LIKE 'account_%'; SHOW TABLES LIKE 'csrf_%';"
```

### Step 5: Test Login Flow
1. Open https://peoplestar.com/PlayPBNow/app.html
2. Try login with wrong password 5+ times
3. Verify account locks with "too many attempts" message
4. Wait 15 minutes or manually remove lockout to retry
5. Successful login should return session_token and csrf_token

---

## Post-Deployment Testing

### Quick Sanity Checks

1. **Login Works**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -H "Origin: https://peoplestar.com" \
     -d '{"mode":"login","email":"test@test.com","password":"correct"}'
   ```
   Should return session_token with 200 status.

2. **Rate Limiting Works**
   ```bash
   # Try 6 wrong logins quickly
   for i in {1..6}; do
     curl -s -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
       -H "Content-Type: application/json" \
       -d '{"mode":"login","email":"test@test.com","password":"wrong"}' | grep -o "too many\|incorrect" || echo "Error $?"
     sleep 0.5
   done
   ```
   6th attempt should return "too many" error with 429 status.

3. **Session Validation Works**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/validate_session.php \
     -H "Content-Type: application/json" \
     -d '{"session_token":"valid_token","user_id":123}'
   ```
   Should return session details or error if invalid.

4. **CORS Restricted**
   ```bash
   curl -X OPTIONS https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Origin: https://attacker.com" \
     -H "Access-Control-Request-Method: POST" \
     | grep "Access-Control-Allow-Origin"
   ```
   Should NOT show attacker.com in headers.

5. **Logout Works**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/logout.php \
     -H "Content-Type: application/json" \
     -d '{"session_token":"token_to_logout","user_id":123}'
   ```
   Should return 200 success.

---

## Frontend Integration Required

Update mobile app to handle new features:

### 1. Store CSRF Token from Login
```typescript
const data = await response.json();
await AsyncStorage.setItem('csrf_token', data.csrf_token);
```

### 2. Validate Session Before Protected Operations
```typescript
const sessionValid = await fetch('/api/validate_session.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_token, user_id })
});

if (!sessionValid.ok) {
  // Force logout and redirect to login
  await logout();
}
```

### 3. Include CSRF Token in POST Requests
```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include'
});
```

### 4. Handle 429 Status (Rate Limit)
```typescript
if (response.status === 429) {
  showAlert('Too many login attempts. Please try again in 15 minutes.');
}
```

### 5. Handle New Logout Endpoint
```typescript
async function logout() {
  const sessionToken = await AsyncStorage.getItem('session_token');
  try {
    await fetch('/api/logout.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token })
    });
  } catch (e) {
    // Logout fails silently, client cleanup continues
  }
  
  await AsyncStorage.removeItem('session_token');
  await AsyncStorage.removeItem('csrf_token');
  router.replace('/login');
}
```

See `AUTH_SECURITY_HARDENING.md` section 4 for complete integration guide.

---

## Rollback Plan

If issues occur, rollback steps:

1. **Restore Database from Backup**
   ```bash
   ssh root@64.227.108.128
   mysql -u mcallpl -p playpbnow < /var/backups/playpbnow_YYYYMMDD_HHMMSS.sql
   ```

2. **Restore Previous API Files**
   ```bash
   cd /Users/chipmcallister/Projects/PlayPBNow
   git checkout HEAD~1 playpbnow-api/email_login.php playpbnow-api/change_password.php
   ./deploy-api.sh
   ```

3. **Notify Users**
   - If authentication is broken, users can't login
   - Have customer support message ready

---

## Monitoring Checklist

After deployment, monitor:

- [ ] **Login Success Rate** - Should remain >99%
- [ ] **Rate Limit Triggers** - Monitor `failed_login_attempts` table for unusual patterns
- [ ] **Account Lockouts** - Check `account_lockouts` table for false positives
- [ ] **Failed Logins** - Should spike only after invalid credentials
- [ ] **API Response Times** - Session validation adds minimal overhead (<50ms)
- [ ] **Database Size** - New tables grow slowly (archival not needed initially)

### Sample Monitoring Queries
```sql
-- Failed login attempts in last hour
SELECT COUNT(*) FROM failed_login_attempts WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- Current lockouts
SELECT COUNT(*) FROM account_lockouts WHERE locked_until > NOW();

-- Average session validation time (add to endpoints)
-- CSRF tokens generated today
SELECT COUNT(*) FROM csrf_tokens WHERE DATE(created_at) = CURDATE();

-- Active sessions by device
SELECT device_name, COUNT(*) FROM user_sessions WHERE is_active = TRUE GROUP BY device_name;
```

---

## Support & Troubleshooting

### Common Issues

**Issue: "Too many failed login attempts" message appears immediately**
- Check if user is in `account_lockouts` table with locked_until > NOW()
- Check if user has 5+ failed attempts in `failed_login_attempts` table
- Solution: Delete from lockout table or wait for expiration

**Issue: Session validation always fails**
- Verify session exists in `user_sessions` table
- Verify session hasn't expired (expires_at > NOW())
- Verify is_active = TRUE
- Check user is_active in users table

**Issue: CSRF token validation fails**
- Verify csrf_token is included in request headers
- Verify token hasn't been used yet (used = FALSE in table)
- Verify token hasn't expired (expires_at > NOW())
- Generate new token if needed

**Issue: CORS errors in browser console**
- Verify Origin header matches allowed list (peoplestar.com)
- Check credentials: 'include' is set in fetch call
- Verify No-CORS endpoints return proper headers

**Issue: Password change logs out other sessions but not current**
- This is expected behavior - confirms session revocation works
- User stays logged in on current device with new password
- Other devices must re-authenticate with new password

---

## Success Criteria

Deployment is successful when:

- ✅ All security endpoints deployed and responding
- ✅ Database tables and columns created
- ✅ Rate limiting triggers on 5 failed attempts
- ✅ Accounts lock for 15 minutes after lockout
- ✅ Session validation works on valid sessions
- ✅ Session validation rejects expired/inactive sessions
- ✅ CSRF tokens generated and validated
- ✅ CORS headers restrict to peoplestar.com only
- ✅ Logout revokes session immediately
- ✅ Password change invalidates other sessions
- ✅ Multi-device session management works
- ✅ Phone optional for email-based registration
- ✅ Forgot password doesn't reveal account existence
- ✅ No errors in server logs
- ✅ Login flow complete end-to-end
- ✅ Frontend successfully integrated

---

## Timeline

- **Deployment Time:** 30-45 minutes
- **Testing Time:** 1-2 hours
- **Frontend Integration:** 2-4 hours
- **Monitoring Period:** 24-48 hours before full release

---

## Sign-Off

- [ ] Backend Developer: Verified all endpoints working
- [ ] QA: Completed testing checklist
- [ ] DevOps: Deployed to production
- [ ] Frontend Developer: Integrated frontend changes
- [ ] Product Manager: Approved for user release

---

## Contact

For questions or issues:
- Backend: Check AUTH_SECURITY_HARDENING.md
- Testing: Check AUTH_SECURITY_TESTS.md
- Deployment: Check deploy-api.sh script
- Database: Check setup_security_tables.php
