# Fix Login 400 Bad Request Error

## Error Details

```
POST https://185.16.39.144/auth/v1/token?grant_type=password 400 (Bad Request)
AuthUnknownError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Root Cause

The error shows the request is going to IP address `185.16.39.144` instead of the proper Supabase domain `kswknblwjlkgxgvypkmo.supabase.co`. This indicates either:

1. **DNS resolution issue** - Your DNS is resolving to wrong IP
2. **Network proxy/firewall** - ISP or network is intercepting requests
3. **Supabase API temporarily down** - Service outage (rare)
4. **Rate limiting** - Too many failed auth attempts from your IP
5. **Browser cache** - Cached bad responses

---

## Quick Fixes (Try in Order)

### Fix 1: Clear Browser Cache & Service Worker

**Step 1: Clear all cache**
1. Open browser DevTools (F12)
2. Go to **Application** tab
3. Under **Storage**, click **Clear site data**
4. Check all boxes:
   - Local storage
   - Session storage
   - IndexedDB
   - Cookies
   - Cache storage
   - Service Workers
5. Click **Clear site data**

**Step 2: Hard reload**
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Step 3: Try login again**

---

### Fix 2: Check Supabase Status

1. Go to https://status.supabase.com/
2. Check if there are any ongoing incidents
3. Check if Auth service is operational

**If Supabase is down:**
- Wait for service to restore
- Check estimated time to resolution

**If Supabase is up:**
- Continue to next fix

---

### Fix 3: Test Network Connection

**Check if Supabase is reachable:**

Run this in browser console:
```javascript
// Test if Supabase domain resolves correctly
fetch('https://kswknblwjlkgxgvypkmo.supabase.co/auth/v1/health')
  .then(res => res.json())
  .then(data => console.log('✅ Supabase is reachable:', data))
  .catch(err => console.error('❌ Cannot reach Supabase:', err));
```

**Expected result:**
```json
✅ Supabase is reachable: {
  "name": "supabase-auth",
  "description": "GoTrue is a user registration and authentication API"
}
```

**If you get an error:**
- DNS issue or network blocking
- Continue to next fix

---

### Fix 4: Bypass Network Issues

**Option A: Try Different Network**
1. Switch from WiFi to mobile data (or vice versa)
2. Test login again
3. If it works, your network/ISP is blocking Supabase

**Option B: Use VPN**
1. Install VPN (Cloudflare WARP, Proton VPN, etc.)
2. Connect to VPN
3. Test login again
4. If it works, confirm network blocking

**Option C: Use Different Browser**
1. Try Chrome Incognito mode
2. Try Firefox Private window
3. Try Microsoft Edge
4. If it works in another browser, clear first browser's cache

---

### Fix 5: Check for Rate Limiting

**Test if IP is rate limited:**

Run this SQL in Supabase Dashboard → SQL Editor:
```sql
-- Check recent failed login attempts
SELECT
  created_at,
  raw_user_meta_data->>'email' as email,
  event_message
FROM auth.audit_log_entries
WHERE event_type = 'user_signedin'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

**If you see many failed attempts:**
1. Wait 1 hour before trying again
2. Check Supabase → Auth → Rate Limits
3. Temporarily increase limits for testing

---

### Fix 6: Verify Environment Variables

**Check if Supabase URL is correct:**

1. Open `.env.local`
2. Verify:
   ```
   VITE_SUPABASE_URL="https://kswknblwjlkgxgvypkmo.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

3. If you changed these recently, restart dev server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

### Fix 7: Check Supabase Auth Settings

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Check **Site URL**: Should be `https://www.lavlay.com` or `http://localhost:5173`
3. Check **Redirect URLs**: Should include:
   - `https://www.lavlay.com/**`
   - `http://localhost:5173/**`
4. Disable **Email confirmation** (for testing):
   - Auth → Email Auth → **Disable email confirmations**
5. Save changes and test

---

### Fix 8: Test with Direct API Call

**Bypass your code and test Supabase Auth directly:**

Run this in browser console:
```javascript
// Test direct login
const testLogin = async () => {
  const response = await fetch('https://kswknblwjlkgxgvypkmo.supabase.co/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY'
    },
    body: JSON.stringify({
      email: 'test@example.com',  // Replace with your email
      password: 'test123',  // Replace with your password
      gotrue_meta_security: {}
    })
  });

  const data = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', data);
};

testLogin();
```

**Expected results:**

**Success (200):**
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "...",
  "user": {...}
}
```

**Wrong credentials (400):**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid login credentials"
}
```

**Rate limited (429):**
```json
{
  "error": "rate_limit_exceeded"
}
```

---

## Advanced Diagnostics

### Check DNS Resolution

**Windows PowerShell:**
```powershell
nslookup kswknblwjlkgxgvypkmo.supabase.co
```

**Expected output:**
```
Server:  dns.google
Address:  8.8.8.8

Name:    kswknblwjlkgxgvypkmo.supabase.co
Address:  [Some IP - should NOT be 185.16.39.144]
```

**If you see 185.16.39.144:**
- Your DNS is compromised or redirected
- Change DNS to Google DNS (8.8.8.8) or Cloudflare (1.1.1.1)

### Change DNS Settings (Windows)

1. Open **Control Panel** → **Network and Internet** → **Network Connections**
2. Right-click your connection → **Properties**
3. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**
4. Select **Use the following DNS server addresses:**
   - Preferred: `8.8.8.8` (Google DNS)
   - Alternate: `1.1.1.1` (Cloudflare DNS)
5. Click **OK** and restart browser

---

## If Nothing Works

### Option A: Wait and Retry
- Service might be temporarily down
- Rate limit might be active
- Wait 1-2 hours and try again

### Option B: Contact Supabase Support
1. Go to https://supabase.com/dashboard/support
2. Provide:
   - Project ref: `kswknblwjlkgxgvypkmo`
   - Error message: 400 Bad Request with HTML response
   - When it started happening
   - What you tried

### Option C: Check Supabase Logs
1. Go to Supabase Dashboard → **Logs** → **Auth Logs**
2. Filter by: Last 1 hour
3. Look for failed login attempts
4. Check error messages

---

## Prevention

### 1. Add Better Error Handling

Update login code to detect HTML responses:

```typescript
try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    // Check if error is HTML (network issue)
    if (error.message.includes('<!DOCTYPE') || error.message.includes('<html')) {
      throw new Error('Network error: Cannot reach authentication server. Please check your internet connection or try again later.');
    }
    throw error;
  }

  return data;
} catch (err: any) {
  console.error('Login error:', err);

  // Detect specific error types
  if (err.message.includes('rate_limit')) {
    throw new Error('Too many login attempts. Please wait a few minutes and try again.');
  } else if (err.message.includes('Network')) {
    throw new Error('Network error. Please check your internet connection.');
  } else {
    throw new Error(err.message || 'Login failed. Please try again.');
  }
}
```

### 2. Add Network Status Monitor

```typescript
// Check if online
if (!navigator.onLine) {
  throw new Error('No internet connection. Please check your network.');
}

// Test Supabase reachability before login
const healthCheck = await fetch('https://kswknblwjlkgxgvypkmo.supabase.co/auth/v1/health');
if (!healthCheck.ok) {
  throw new Error('Authentication service is temporarily unavailable. Please try again later.');
}
```

---

## Summary

**Most likely causes:**
1. Network/ISP blocking Supabase (try VPN)
2. DNS resolution issue (change DNS to 8.8.8.8)
3. Browser cache (clear all site data)
4. Rate limiting (wait 1 hour)

**Immediate actions:**
1. Clear browser cache completely
2. Hard reload page (Ctrl+Shift+R)
3. Try different network (mobile data)
4. Test direct API call in console

**If still failing:**
- Check Supabase status page
- Change DNS to Google DNS
- Try VPN
- Contact Supabase support

---

Let me know which fix works or what you see when testing!
