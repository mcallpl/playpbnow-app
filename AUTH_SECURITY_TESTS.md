# Authentication Security Testing Guide

## Overview
Complete test plan for verifying authentication security hardening implementation.

---

## Test 1: Rate Limiting on Login

### Objective
Verify that 5 failed login attempts per minute lock the account for 15 minutes.

### Test Steps

1. **5 Failed Attempts in Quick Succession**
   ```bash
   for i in {1..5}; do
     curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
       -H "Content-Type: application/json" \
       -d '{
         "mode": "login",
         "email": "test@test.com",
         "password": "wrongpassword"
       }'
     echo "Attempt $i"
     sleep 1
   done
   ```

2. **Attempt 6 (Should be Locked)**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -d '{
       "mode": "login",
       "email": "test@test.com",
       "password": "wrongpassword"
     }'
   ```

### Expected Results
- First 5 attempts: Return 400 with generic error message
- 6th attempt: Return 429 status with "too many failed attempts" message
- Account should be locked in `account_lockouts` table
- Lockout should expire in ~15 minutes

### Verification Query
```sql
SELECT * FROM account_lockouts WHERE email_or_phone = 'test@test.com';
SELECT COUNT(*) FROM failed_login_attempts WHERE email_or_phone = 'test@test.com' AND attempted_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE);
```

---

## Test 2: Session Validation Endpoint

### Objective
Verify that session validation works correctly and detects expired sessions.

### Test Steps

1. **Get Valid Session Token**
   - Login successfully
   - Extract `session_token` from response
   - Store `user_id`

2. **Validate Active Session**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/validate_session.php \
     -H "Content-Type: application/json" \
     -d '{
       "session_token": "abc123...",
       "user_id": 123
     }'
   ```

3. **Test Expired Session**
   - Manually update session to expire: `UPDATE user_sessions SET expires_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE session_token = 'abc123'`
   - Call validate endpoint again

4. **Test Inactive Session**
   - Mark session inactive: `UPDATE user_sessions SET is_active = FALSE WHERE session_token = 'abc123'`
   - Call validate endpoint

### Expected Results
- Valid session: Returns 200 with session details
- Expired session: Returns 401 "Session has expired"
- Inactive session: Returns 401 "Invalid or inactive session"

### Verification
- Check `last_activity_at` is updated on each validation call
- Verify session becomes inactive when expired

---

## Test 3: CSRF Token Protection

### Objective
Verify CSRF tokens are generated and validated correctly.

### Test Steps

1. **Login and Get CSRF Token**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -d '{
       "mode": "login",
       "email": "test@test.com",
       "password": "password123"
     }'
   ```
   - Extract `csrf_token` from response
   - Extract `session_token`

2. **Use CSRF Token (Simulate Protected Operation)**
   - Store token in local variable
   - Include in POST header: `X-CSRF-Token: <token>`
   - Make protected API call

3. **Try to Reuse Same Token**
   - Use same token again
   - Should fail (token already used)

4. **Try Without CSRF Token**
   - Make POST without CSRF token
   - Endpoint should reject (if CSRF validation implemented)

### Expected Results
- CSRF token generated on login
- Token expires after 1 hour
- Token can only be used once
- Reusing token fails
- Token stored in `csrf_tokens` table with `used=FALSE`

### Verification Query
```sql
SELECT * FROM csrf_tokens WHERE user_id = 123 ORDER BY created_at DESC LIMIT 5;
```

---

## Test 4: CORS Restrictions

### Objective
Verify API only accepts requests from peoplestar.com origin.

### Test Steps

1. **Valid Origin (peoplestar.com)**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -H "Origin: https://peoplestar.com" \
     -d '{"mode":"login","email":"test@test.com","password":"password123"}'
   ```

2. **Invalid Origin (attacker.com)**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -H "Origin: https://attacker.com" \
     -d '{"mode":"login","email":"test@test.com","password":"password123"}'
   ```

3. **Browser Preflight (OPTIONS)**
   ```bash
   curl -X OPTIONS https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Origin: https://peoplestar.com" \
     -H "Access-Control-Request-Method: POST"
   ```

### Expected Results
- Valid origin: Response includes `Access-Control-Allow-Origin: https://peoplestar.com`
- Invalid origin: No CORS header in response (browser blocks request)
- OPTIONS request: Returns 200 with CORS headers

### Verification
Check response headers:
```bash
curl -i -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
  -H "Origin: https://peoplestar.com" \
  | grep "Access-Control"
```

Should show:
```
Access-Control-Allow-Origin: https://peoplestar.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Test 5: Logout and Session Revocation

### Objective
Verify logout deletes session and prevents future use.

### Test Steps

1. **Login and Get Session Token**
   - Successful login
   - Extract `session_token`

2. **Logout**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/logout.php \
     -H "Content-Type: application/json" \
     -d '{
       "session_token": "abc123...",
       "user_id": 123
     }'
   ```

3. **Try to Validate Logged-Out Session**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/validate_session.php \
     -H "Content-Type: application/json" \
     -d '{
       "session_token": "abc123...",
       "user_id": 123
     }'
   ```

4. **Try to Use Old Session in API Call**
   - Make any API call with the old session token
   - Should fail with 401 Unauthorized

### Expected Results
- Logout returns 200 success
- Session deleted from `user_sessions` table
- Validation of logged-out session returns 401
- Old session can't be used for any API calls

### Verification Query
```sql
SELECT * FROM user_sessions WHERE session_token = 'abc123...';
-- Should return no rows after logout
```

---

## Test 6: Password Change with Session Revocation

### Objective
Verify password change invalidates all other sessions.

### Test Setup
- Login on Device A → Get session_token_a
- Login on Device B → Get session_token_b
- Login on Device C → Get session_token_c

### Test Steps

1. **Change Password on Device A**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/change_password.php \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": 123,
       "session_token": "session_token_a",
       "current_password": "oldpass",
       "new_password": "newpass123"
     }'
   ```

2. **Verify Session A Still Works**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/validate_session.php \
     -H "Content-Type: application/json" \
     -d '{
       "session_token": "session_token_a",
       "user_id": 123
     }'
   ```

3. **Verify Sessions B and C Are Revoked**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/validate_session.php \
     -H "Content-Type: application/json" \
     -d '{
       "session_token": "session_token_b",
       "user_id": 123
     }'
   ```

### Expected Results
- Password change succeeds
- Device A session (used for change) remains active
- Device B and C sessions are deleted/inactive
- Error message mentions other sessions logged out
- User must re-authenticate on other devices with new password

### Verification Query
```sql
SELECT * FROM user_sessions WHERE user_id = 123 AND is_active = TRUE;
-- Should only show session_token_a
```

---

## Test 7: Multi-Device Session Management

### Objective
Verify users can view and manage their active sessions.

### Test Setup
- Login on Device A
- Login on Device B
- Login on Device C

### Test Steps

1. **List Active Sessions**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/manage_sessions.php \
     -H "Content-Type: application/json" \
     -d '{
       "action": "list",
       "user_id": 123,
       "session_token": "session_token_a"
     }'
   ```

2. **Logout Specific Device (B)**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/manage_sessions.php \
     -H "Content-Type: application/json" \
     -d '{
       "action": "logout_device",
       "user_id": 123,
       "session_token": "session_token_a",
       "target_session_token": "session_token_b"
     }'
   ```

3. **Verify Device B is Logged Out**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/validate_session.php \
     -H "Content-Type: application/json" \
     -d '{
       "session_token": "session_token_b",
       "user_id": 123
     }'
   ```

4. **Logout All Other Devices**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/manage_sessions.php \
     -H "Content-Type: application/json" \
     -d '{
       "action": "logout_all_others",
       "user_id": 123,
       "session_token": "session_token_a"
     }'
   ```

5. **List Again**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/manage_sessions.php \
     -H "Content-Type: application/json" \
     -d '{
       "action": "list",
       "user_id": 123,
       "session_token": "session_token_a"
     }'
   ```

### Expected Results
- List shows all 3 sessions with device names
- Session A marked as `is_current: true`
- Logout device B succeeds
- Device B validation fails
- Logout all others succeeds
- Final list shows only Device A

---

## Test 8: Phone Optional for Registration

### Objective
Verify registration works with email only, phone optional.

### Test Steps

1. **Register with Email and First Name Only**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -d '{
       "mode": "register",
       "email": "newuser@test.com",
       "password": "password123",
       "first_name": "John",
       "last_name": "Doe"
     }'
   ```

2. **Register with Email and Phone**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -d '{
       "mode": "register",
       "email": "newuser2@test.com",
       "password": "password123",
       "first_name": "Jane",
       "phone": "(555) 123-4567"
     }'
   ```

3. **Try to Register with Phone Only (Should Fail)**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -d '{
       "mode": "register",
       "password": "password123",
       "first_name": "Bob",
       "phone": "(555) 999-8888"
     }'
   ```

### Expected Results
- Registration with email only: Success
- Registration with email + phone: Success
- Registration with phone only: Fails with "Email required" error
- User created in database with NULL phone if not provided

### Verification Query
```sql
SELECT id, email, phone FROM users WHERE email IN ('newuser@test.com', 'newuser2@test.com');
-- Should show one row with NULL phone, one with phone
```

---

## Test 9: Forgot Password Error Messages

### Objective
Verify forgot password doesn't reveal account existence.

### Test Steps

1. **Request Code for Non-Existent Account**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/forgot_password.php \
     -H "Content-Type: application/json" \
     -d '{
       "action": "request_code",
       "phone": "(555) 999-0000"
     }'
   ```

2. **Request Code for Existing Account**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/forgot_password.php \
     -H "Content-Type: application/json" \
     -d '{
       "action": "request_code",
       "phone": "(555) 123-4567"
     }'
   ```

### Expected Results
- Both requests return same response: "If an account exists with this phone number, a reset code will be sent."
- Generic message prevents account enumeration
- No way to determine if account exists from response

---

## Test 10: Concurrent Login Prevention

### Objective
Verify multiple simultaneous logins work correctly (multi-device support).

### Test Steps

1. **Login on Device A**
   - Get session_token_a

2. **Login on Device B (Same User)**
   - Get session_token_b

3. **Verify Both Sessions Active**
   - Validate session_token_a: Should return 200
   - Validate session_token_b: Should return 200

4. **Query Database**
   ```sql
   SELECT COUNT(*) FROM user_sessions WHERE user_id = 123 AND is_active = TRUE;
   -- Should return 2 (or more if multiple logins)
   ```

### Expected Results
- User can have multiple concurrent sessions
- Each session is independent
- Sessions can be managed individually
- Logout one doesn't affect others (unless using logout_all_others)

---

## Test 11: Failed Login Attempt Tracking

### Objective
Verify failed login attempts are tracked and cleared on success.

### Test Setup
- Have a test account: test@test.com / password123

### Test Steps

1. **Record Failed Attempts**
   - 3 failed logins with wrong password
   - Query: `SELECT COUNT(*) FROM failed_login_attempts WHERE email_or_phone = 'test@test.com'`
   - Should show 3 records

2. **Successful Login**
   ```bash
   curl -X POST https://peoplestar.com/PlayPBNow/api/email_login.php \
     -H "Content-Type: application/json" \
     -d '{
       "mode": "login",
       "email": "test@test.com",
       "password": "password123"
     }'
   ```

3. **Check Failed Attempts After Success**
   - Query: `SELECT COUNT(*) FROM failed_login_attempts WHERE email_or_phone = 'test@test.com'`
   - Should show 0 records (cleared)

### Expected Results
- Each failed attempt creates database record
- Successful login clears all failed attempts for that user
- Failed attempts window is 1 minute (configurable)

---

## Manual Testing Checklist

```
Rate Limiting & Lockout
[ ] 5 failed attempts lock account
[ ] Lockout shows proper error message
[ ] Lockout expires after 15 minutes
[ ] Failed attempt count resets on success

Session Validation
[ ] Active session validates successfully
[ ] Expired session fails validation
[ ] Inactive session fails validation
[ ] Last activity updated on validation

CSRF Protection
[ ] Token generated on login
[ ] Token can be used once
[ ] Reusing token fails
[ ] Token expires after 1 hour

CORS
[ ] peoplestar.com origin accepted
[ ] Other origins rejected
[ ] OPTIONS preflight works
[ ] Credentials sent with requests

Logout
[ ] Logout removes session from DB
[ ] Logged-out session can't be reused
[ ] Logout response is 200 success

Password Change
[ ] Password change succeeds
[ ] Other sessions invalidated
[ ] Current session preserved
[ ] New password works for login

Multi-Device
[ ] Can list all sessions
[ ] Can logout specific device
[ ] Can logout all others
[ ] Session list shows device names

Registration
[ ] Registration works without phone
[ ] Registration works with phone
[ ] Phone not required error
[ ] Email is required error

Error Messages
[ ] Forgot password hides account existence
[ ] Login error is generic
[ ] No information leakage
```

---

## Automated Test Script

```bash
#!/bin/bash

API_URL="https://peoplestar.com/PlayPBNow/api"

echo "Testing Authentication Security..."

# Test 1: Rate Limiting
echo "Test 1: Rate Limiting"
for i in {1..6}; do
  RESPONSE=$(curl -s -X POST $API_URL/email_login.php \
    -H "Content-Type: application/json" \
    -d '{"mode":"login","email":"test@test.com","password":"wrong"}')
  
  if [ $i -eq 6 ]; then
    if echo $RESPONSE | grep -q "too many"; then
      echo "✓ Rate limit triggered on attempt 6"
    else
      echo "✗ Rate limit NOT triggered"
    fi
  fi
  sleep 0.5
done

# Test 2: CORS
echo -e "\nTest 2: CORS Restrictions"
HEADERS=$(curl -s -i -X OPTIONS $API_URL/email_login.php \
  -H "Origin: https://peoplestar.com" \
  -H "Access-Control-Request-Method: POST" | grep "Access-Control")

if echo "$HEADERS" | grep -q "peoplestar.com"; then
  echo "✓ CORS headers correct"
else
  echo "✗ CORS headers incorrect"
fi

echo -e "\nAll tests complete!"
```

---

## Production Verification

After deployment, run these commands on the server:

```bash
# Verify tables exist
mysql playpbnow -e "SHOW TABLES LIKE 'failed_login%';"
mysql playpbnow -e "SHOW TABLES LIKE 'account_lockouts';"
mysql playpbnow -e "SHOW TABLES LIKE 'csrf_tokens';"

# Verify columns added
mysql playpbnow -e "DESCRIBE user_sessions;" | grep -E 'is_active|device_name|last_activity'

# Verify indexes
mysql playpbnow -e "SHOW INDEXES FROM user_sessions WHERE Key_name LIKE 'idx_%';"

# Test API is responding
curl -s https://peoplestar.com/PlayPBNow/api/validate_session.php | head -c 50
```

Expected output:
```json
{"status":"error","message":"Missing session_token or user_id"}
```
