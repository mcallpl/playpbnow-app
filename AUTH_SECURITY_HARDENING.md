# Authentication Security Hardening - Complete Implementation

## Date: June 24, 2026

This document outlines all security improvements made to the PlayPBNow authentication system. All PHP files are located in `playpbnow-api/` and must be deployed to the DigitalOcean server.

---

## 1. Database Schema Changes

### New Tables Created:
- `failed_login_attempts` - Tracks failed login attempts for rate limiting
- `account_lockouts` - Stores account lockout records with expiration
- `csrf_tokens` - Stores CSRF tokens for POST request protection

### New Columns Added to `user_sessions`:
- `is_active` (BOOLEAN) - Track whether a session is still valid
- `device_name` (VARCHAR) - Human-readable device name (e.g., "iOS Device")
- `last_activity_at` (TIMESTAMP) - Track last activity for session management

### New Indexes:
- `user_sessions.idx_user_token` - Fast session lookups
- `user_sessions.idx_user_active` - Fast active session filtering

### Setup Script:
**File:** `playpbnow-api/setup_security_tables.php`
- Creates all new tables and adds columns
- Already executed on production database (6/24/2026)
- Can be re-run safely (idempotent)

---

## 2. Security Features Implemented

### 2.1 Rate Limiting & Account Lockout

**Implementation:** `playpbnow-api/security_helpers.php`

Features:
- Max 5 failed login attempts per minute per email/phone
- Automatic 15-minute account lockout after 5 failed attempts
- Failed attempts tracked in `failed_login_attempts` table
- Account lockout stored in `account_lockouts` table with expiration

Integration Points:
- `playpbnow-api/email_login.php` - Checks rate limit before login
- Records failed attempts on password mismatch
- Locks account automatically at 5 attempts
- Clears failed attempts on successful login

### 2.2 Session Validation

**Endpoint:** `playpbnow-api/validate_session.php`

Purpose: Verify session token validity and expiration
- Check if session exists and is active
- Verify session hasn't expired
- Confirm user account is still active
- Update last activity timestamp
- Returns session metadata for client

Request:
```json
{
  "session_token": "...",
  "user_id": 123
}
```

Response:
```json
{
  "status": "success",
  "session": {
    "user_id": 123,
    "expires_at": "2026-07-24",
    "device_info": "ios",
    "device_name": "iOS Device",
    "last_activity_at": "2026-06-24 15:30:00"
  }
}
```

Usage: Call this before any protected operation to ensure session is valid.

### 2.3 Logout with Session Revocation

**Endpoint:** `playpbnow-api/logout.php`

Purpose: Securely revoke a user's session
- Deletes session from `user_sessions` table
- One-time operation (idempotent)
- No way to recover revoked session

Request:
```json
{
  "session_token": "...",
  "user_id": 123
}
```

### 2.4 CSRF Token Protection

**Implementation:** `playpbnow-api/security_helpers.php`

Features:
- Generate CSRF token on successful login/registration
- Token expires after 1 hour
- Token can only be used once
- Stored in `csrf_tokens` table

Token Lifecycle:
1. Generated during login: `generateCSRFToken($user_id)`
2. Returned in login response as `csrf_token`
3. Client includes in POST request headers: `X-CSRF-Token: <token>`
4. Server verifies before processing: `verifyCSRFToken($user_id, $token)`
5. Token marked as used after verification

### 2.5 CORS Restrictions

**All Endpoints:** Restricted to `https://peoplestar.com` origin

Implementation:
```php
header('Access-Control-Allow-Origin: https://peoplestar.com');
header('Access-Control-Allow-Credentials: true');
```

Changed In:
- `email_login.php`
- `logout.php`
- `validate_session.php`
- `change_password.php`
- `forgot_password.php`
- `manage_sessions.php`

Benefits:
- Prevents CSRF attacks from other domains
- Restricts API access to official web client
- Credentials sent only to authorized origin

### 2.6 Password Change with Session Revocation

**File:** `playpbnow-api/change_password.php` (Updated)

Security Features:
- Verify current password before change
- Invalidate all OTHER sessions after password change
- Preserve current session for seamless UX
- Revoke all CSRF tokens
- User must re-authenticate on other devices

Flow:
1. Verify current password is correct
2. Hash new password
3. Update user password
4. Call `logoutOtherSessions($user_id, $current_session_token)`
5. Call `revokeAllCSRFTokens($user_id)`
6. Return success message

### 2.7 Multi-Device Session Management

**Endpoint:** `playpbnow-api/manage_sessions.php`

Features:
- View all active sessions for a user
- See device name and last activity
- Logout specific devices
- Logout all other devices

Actions:

**List Sessions:**
```json
{
  "action": "list",
  "user_id": 123,
  "session_token": "..."
}
```

Response:
```json
{
  "status": "success",
  "sessions": [
    {
      "id": 1,
      "device_info": "ios",
      "device_name": "iOS Device",
      "created_at": "2026-06-24 10:00:00",
      "last_activity_at": "2026-06-24 15:30:00",
      "expires_at": "2026-07-24",
      "is_current": true
    }
  ],
  "total": 1
}
```

**Logout Specific Device:**
```json
{
  "action": "logout_device",
  "user_id": 123,
  "session_token": "...",
  "target_session_token": "..."
}
```

**Logout All Other Devices:**
```json
{
  "action": "logout_all_others",
  "user_id": 123,
  "session_token": "..."
}
```

### 2.8 Forgot Password - Error Message Fix

**File:** `playpbnow-api/forgot_password.php` (Updated)

Security Fix:
- When account doesn't exist, return generic success message
- Old: "No account found with this phone number"
- New: "If an account exists with this phone number, a reset code will be sent"

Benefit: Prevents account enumeration attacks

### 2.9 Phone Number - Optional for Registration

**File:** `playpbnow-api/email_login.php` (Updated)

Fix:
- Backend now allows registration with email + password only
- Phone is optional (was previously required)
- Matches frontend behavior where phone is optional

Changes:
- Removed phone requirement check in registration
- Allow NULL phone in users table insert
- Email remains the primary identifier

---

## 3. Security Helper Library

**File:** `playpbnow-api/security_helpers.php`

Public Functions:

```php
// Rate limiting
isAccountLocked($emailOrPhone) : array|null
lockAccount($emailOrPhone, $userId = null, $reason = '', $durationMinutes = 15) : int|false
recordFailedLogin($emailOrPhone, $ip = null) : int
clearFailedLogins($emailOrPhone) : bool
isRateLimited($emailOrPhone) : bool

// CSRF tokens
generateCSRFToken($userId) : string|null
verifyCSRFToken($userId, $token) : bool
revokeAllCSRFTokens($userId) : bool

// Session management
invalidateAllSessions($userId) : bool
getActiveSessions($userId) : array
logoutSession($sessionToken) : bool
logoutOtherSessions($userId, $currentSessionToken) : bool
```

Import in any endpoint:
```php
require_once __DIR__ . '/security_helpers.php';
```

---

## 4. Integration Guide for Frontend

### 4.1 Login with CSRF Protection

```typescript
// 1. Call login endpoint
const response = await fetch('/api/email_login.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ mode: 'login', email, password, device_info: 'ios' })
});

const data = await response.json();

// 2. Store tokens
await AsyncStorage.multiSet([
  ['session_token', data.session_token],
  ['csrf_token', data.csrf_token],
  ['user_id', data.user.id.toString()]
]);
```

### 4.2 Protected API Calls with Session Validation

```typescript
async function apiCall(endpoint, body) {
  const sessionToken = await AsyncStorage.getItem('session_token');
  const userId = await AsyncStorage.getItem('user_id');
  const csrfToken = await AsyncStorage.getItem('csrf_token');

  // First: validate session
  const validateResponse = await fetch('/api/validate_session.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ session_token: sessionToken, user_id: userId })
  });

  if (!validateResponse.ok) {
    // Session invalid, force logout
    await logout();
    return;
  }

  // Second: make API call with CSRF token
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(body)
  });

  return response.json();
}
```

### 4.3 Change Password

```typescript
async function changePassword(currentPassword, newPassword) {
  const sessionToken = await AsyncStorage.getItem('session_token');
  const userId = await AsyncStorage.getItem('user_id');

  const response = await fetch('/api/change_password.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      user_id: userId,
      session_token: sessionToken,
      current_password: currentPassword,
      new_password: newPassword
    })
  });

  if (response.ok) {
    // After successful change, other sessions are logged out
    // User remains logged in on current device
    showAlert('Password changed. You have been logged out on other devices.');
  }
}
```

### 4.4 Logout

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
    // Logout fails silently - client-side cleanup still happens
  }

  // Clear local storage
  await AsyncStorage.multiRemove(['session_token', 'csrf_token', 'user_id', ...]);
  
  // Redirect to login
  router.replace('/login');
}
```

### 4.5 View and Manage Sessions

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

  return response.json();
}

async function logoutOtherDevices() {
  const sessionToken = await AsyncStorage.getItem('session_token');
  const userId = await AsyncStorage.getItem('user_id');

  await fetch('/api/manage_sessions.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      action: 'logout_all_others',
      user_id: userId,
      session_token: sessionToken
    })
  });
}
```

---

## 5. Deployment Instructions

### Step 1: Run Setup Script
SSH to DigitalOcean server and run:
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

### Step 2: Deploy PHP Files
Deploy all files in playpbnow-api/ to DigitalOcean:
```bash
cd /Users/chipmcallister/Projects/PlayPBNow
./deploy-api.sh
```

### Step 3: Test Endpoints
```bash
# Test rate limiting
curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
  -H "Content-Type: application/json" \
  -d '{"mode":"login","email":"test@test.com","password":"wrong"}'

# Test session validation
curl -X POST https://peoplestar.com/PlayPBNow/api/validate_session.php \
  -H "Content-Type: application/json" \
  -d '{"session_token":"...","user_id":123}'

# Test logout
curl -X POST https://peoplestar.com/PlayPBNow/api/logout.php \
  -H "Content-Type: application/json" \
  -d '{"session_token":"..."}'
```

---

## 6. Files Modified/Created

### New Files:
- `playpbnow-api/security_helpers.php` - Shared security functions
- `playpbnow-api/validate_session.php` - Session validation endpoint
- `playpbnow-api/logout.php` - Logout and session revocation
- `playpbnow-api/manage_sessions.php` - Multi-device session management
- `playpbnow-api/setup_security_tables.php` - Database schema migration

### Modified Files:
- `playpbnow-api/email_login.php`
  - Added CORS restrictions to peoplestar.com
  - Added rate limiting checks
  - Added account lockout logic
  - Added CSRF token generation
  - Made phone optional for registration
  - Added device name tracking

- `playpbnow-api/forgot_password.php`
  - Fixed error message to not reveal account existence
  - Already had CORS restrictions

- `playpbnow-api/change_password.php`
  - Added CORS restrictions
  - Added session revocation logic
  - Session revocation for all other devices on password change
  - CSRF token revocation

---

## 7. Security Summary

| Feature | Status | Details |
|---------|--------|---------|
| Rate Limiting | ✅ | 5 attempts/min, 15-min lockout |
| Account Lockout | ✅ | Auto-lockout after 5 failed attempts |
| CSRF Protection | ✅ | Token-based, 1-hour expiration |
| CORS Restrictions | ✅ | Limited to peoplestar.com only |
| Session Validation | ✅ | Per-request validation available |
| Session Revocation | ✅ | Immediate on logout |
| Password Change | ✅ | Invalidates other sessions |
| Multi-Device Mgmt | ✅ | View/logout other devices |
| Account Enumeration | ✅ | Generic error messages |
| Phone Optional | ✅ | Email-based registration works |

---

## 8. Testing Checklist

- [ ] Rate limiting works (5 attempts lock account for 15 min)
- [ ] Account lockout shows proper error message
- [ ] CSRF token generated and validated
- [ ] CORS headers restrict to peoplestar.com
- [ ] Session validation rejects expired sessions
- [ ] Logout removes session from database
- [ ] Password change invalidates other sessions
- [ ] Multi-device list shows active sessions
- [ ] Phone is optional for registration
- [ ] Forgot password doesn't reveal account existence
- [ ] Failed login attempts tracked correctly
- [ ] Clear failed attempts on successful login

---

## Notes

- All CORS headers now point to `https://peoplestar.com` only
- Credentials must be included in fetch calls: `credentials: 'include'`
- Session tokens valid for 30 days by default
- CSRF tokens expire after 1 hour
- Account lockouts expire after 15 minutes (configurable)
- Failed login attempts window is 1 minute (configurable)
