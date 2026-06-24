# Authentication Security - Quick Reference

**Last Updated:** June 24, 2026

---

## API Endpoints Overview

| Endpoint | Method | Purpose | Status Code |
|----------|--------|---------|-------------|
| `/api/email_login.php` | POST | Login or register user | 200, 400, 429 |
| `/api/validate_session.php` | POST | Verify session validity | 200, 400, 401 |
| `/api/logout.php` | POST | Revoke session | 200, 400 |
| `/api/change_password.php` | POST | Change password | 200, 400 |
| `/api/forgot_password.php` | POST | Request/verify reset code | 200, 400, 429 |
| `/api/manage_sessions.php` | POST | View/manage sessions | 200, 400, 401, 429 |

---

## Key Security Features

### 1. Rate Limiting
- **Limit:** 5 failed attempts per minute per email/phone
- **Action:** Auto-lockout for 15 minutes
- **Status Code:** 429 Too Many Requests
- **Response:** "Too many failed login attempts. Please try again in 15 minutes."

### 2. Session Validation
- **Usage:** Call before any protected operation
- **Timeout:** 30 days (configurable)
- **Headers:** Credentials: include required
- **Response:** Session metadata with device info

### 3. CSRF Protection
- **Format:** Token-based
- **Lifespan:** 1 hour
- **Usage:** Include in X-CSRF-Token header
- **Validation:** One-time use only

### 4. CORS Restrictions
- **Allowed Origin:** https://peoplestar.com only
- **Credentials:** true (required)
- **Methods:** POST, OPTIONS
- **Headers:** Content-Type, Authorization

---

## Login Flow

```
1. POST /api/email_login.php
   ↓ (check rate limit)
   ↓ (verify credentials)
   ↓ (clear failed attempts)
   ↓
2. Response includes:
   - session_token (30 days)
   - csrf_token (1 hour)
   - user data
   ↓
3. Store tokens in AsyncStorage
   ↓
4. Use in subsequent API calls
```

---

## Protected API Call Flow

```
1. Retrieve stored tokens:
   - session_token
   - csrf_token
   - user_id
   ↓
2. Call validate_session.php:
   {
     "session_token": "...",
     "user_id": 123
   }
   ↓
3. If valid (200):
   - Make API call with CSRF token
   - Include in X-CSRF-Token header
   ↓
4. If invalid (401):
   - Force logout
   - Clear storage
   - Redirect to login
```

---

## Code Examples

### TypeScript: Login
```typescript
async function login(email: string, password: string) {
  const response = await fetch('/api/email_login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      mode: 'login',
      email,
      password,
      device_info: Platform.OS
    })
  });

  if (response.status === 429) {
    alert('Too many attempts. Try again in 15 minutes.');
    return;
  }

  if (response.ok) {
    const data = await response.json();
    await AsyncStorage.multiSet([
      ['session_token', data.session_token],
      ['csrf_token', data.csrf_token],
      ['user_id', data.user.id.toString()]
    ]);
  }
}
```

### TypeScript: Protected API Call
```typescript
async function protectedApiCall(endpoint: string, body: object) {
  const sessionToken = await AsyncStorage.getItem('session_token');
  const userId = await AsyncStorage.getItem('user_id');
  const csrfToken = await AsyncStorage.getItem('csrf_token');

  // Validate session first
  const validateResp = await fetch('/api/validate_session.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ session_token: sessionToken, user_id: userId })
  });

  if (!validateResp.ok) {
    await logout();
    throw new Error('Session expired');
  }

  // Make actual API call
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(body)
  });
}
```

### TypeScript: Logout
```typescript
async function logout() {
  const sessionToken = await AsyncStorage.getItem('session_token');
  
  try {
    await fetch('/api/logout.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ session_token: sessionToken })
    });
  } catch (e) {
    // Continue with cleanup even if logout request fails
  }

  await AsyncStorage.multiRemove([
    'session_token',
    'csrf_token',
    'user_id',
    'user_email',
    'user_phone',
    'user_first_name',
    'user_last_name'
  ]);
  
  router.replace('/login');
}
```

### TypeScript: Change Password
```typescript
async function changePassword(current: string, newPass: string) {
  const sessionToken = await AsyncStorage.getItem('session_token');
  const userId = await AsyncStorage.getItem('user_id');

  const response = await fetch('/api/change_password.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      user_id: userId,
      session_token: sessionToken,
      current_password: current,
      new_password: newPass
    })
  });

  if (response.ok) {
    alert('Password changed. Other sessions logged out.');
    // User stays logged in on current device
  }
}
```

### TypeScript: View Active Sessions
```typescript
async function getActiveSessions() {
  const sessionToken = await AsyncStorage.getItem('session_token');
  const userId = await AsyncStorage.getItem('user_id');

  const response = await fetch('/api/manage_sessions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      action: 'list',
      user_id: userId,
      session_token: sessionToken
    })
  });

  if (response.ok) {
    const data = await response.json();
    return data.sessions; // Array of sessions with device names
  }
}
```

---

## HTTP Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Proceed |
| 400 | Bad request | Check parameters |
| 401 | Unauthorized | Session invalid, logout |
| 429 | Rate limited | Show retry message |
| 500 | Server error | Show generic error, retry |

---

## Error Handling

### Rate Limit Error
```json
{
  "status": "error",
  "message": "Too many failed login attempts. Please try again in 15 minutes."
}
// HTTP 429
```

### Session Expired
```json
{
  "status": "error",
  "message": "Session has expired"
}
// HTTP 401
```

### Account Locked
```json
{
  "status": "error",
  "message": "Your account has been temporarily locked due to multiple failed login attempts. Please try again in 15 minutes."
}
// HTTP 429
```

### CSRF Token Invalid
```json
{
  "status": "error",
  "message": "Invalid CSRF token"
}
// HTTP 403 (if implemented)
```

---

## Headers Reference

### Login Request
```
POST /api/email_login.php
Content-Type: application/json
Origin: https://peoplestar.com

{
  "mode": "login",
  "email": "user@example.com",
  "password": "password123",
  "device_info": "ios"
}
```

### Protected Request
```
POST /api/some_endpoint.php
Content-Type: application/json
X-CSRF-Token: <token_from_login>
Origin: https://peoplestar.com
Cookie: (session_token in AsyncStorage, not HTTP cookie)

{
  "user_id": 123,
  "session_token": "<token>",
  ... other data
}
```

### Response Headers
```
Access-Control-Allow-Origin: https://peoplestar.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Content-Type: application/json
```

---

## Database Queries (Admin)

### Check Failed Logins
```sql
SELECT email_or_phone, COUNT(*) as attempts
FROM failed_login_attempts
WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY email_or_phone
ORDER BY attempts DESC;
```

### View Current Lockouts
```sql
SELECT email_or_phone, locked_until, reason
FROM account_lockouts
WHERE locked_until > NOW();
```

### Remove Lockout (Manual)
```sql
DELETE FROM account_lockouts
WHERE email_or_phone = 'user@example.com';
```

### View User Sessions
```sql
SELECT id, device_name, created_at, last_activity_at, expires_at, is_active
FROM user_sessions
WHERE user_id = 123
ORDER BY last_activity_at DESC;
```

### Revoke All Sessions for User
```sql
DELETE FROM user_sessions WHERE user_id = 123;
```

### Clear Failed Attempts
```sql
DELETE FROM failed_login_attempts
WHERE email_or_phone = 'user@example.com';
```

---

## Common Issues & Solutions

**Q: Login keeps failing with "too many attempts"**
A: User is locked. Check `account_lockouts` table. Wait 15 minutes or manually delete the lockout record.

**Q: Session validation always fails**
A: Check if session exists in `user_sessions` and hasn't expired. Verify `is_active = TRUE`.

**Q: CSRF token error**
A: Generate new token by logging in again. Token expires after 1 hour.

**Q: CORS error in browser**
A: Verify Origin header is `https://peoplestar.com`. Check credentials: 'include' in fetch.

**Q: Password change logged me out**
A: Expected behavior. You stay logged in on current device. Re-authenticate on other devices.

**Q: Can't see active sessions**
A: Call `/api/manage_sessions.php` with correct user_id and session_token.

---

## Security Best Practices

✅ **DO:**
- Always validate sessions before protected operations
- Include CSRF token in all POST requests
- Use credentials: 'include' in fetch calls
- Clear tokens on logout
- Handle 429 status gracefully
- Show generic error messages (no account enumeration)
- Log authentication events for monitoring
- Rotate CSRF tokens regularly

❌ **DON'T:**
- Store session token in HTTP cookies (use AsyncStorage)
- Expose user IDs in error messages
- Skip CSRF token validation
- Log passwords or sensitive data
- Cache session validation for too long
- Use GET requests for login/password changes
- Allow cross-origin requests from untrusted domains

---

## Monitoring Checklist

Daily:
- [ ] Check failed login attempts (should be low)
- [ ] Check account lockouts (should be rare)
- [ ] Monitor API response times
- [ ] Check error logs for anomalies

Weekly:
- [ ] Analyze login patterns
- [ ] Check for brute force attempts
- [ ] Review session timeout patterns
- [ ] Verify CSRF token generation rate

Monthly:
- [ ] Audit active sessions by user
- [ ] Review password change patterns
- [ ] Check database table sizes
- [ ] Update security documentation

---

## References

- Full Implementation: `AUTH_SECURITY_HARDENING.md`
- Testing Guide: `AUTH_SECURITY_TESTS.md`
- Deployment: `DEPLOYMENT_CHECKLIST.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 6/24/2026 | Initial implementation |

---

**Last Modified:** June 24, 2026  
**Maintained By:** Backend Security Team  
**Status:** Production Ready
