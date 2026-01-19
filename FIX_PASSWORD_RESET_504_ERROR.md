# Fix Password Reset 504 Timeout Error

## The Problem
```
504 Gateway Timeout
AuthRetryableFetchError: {}
```

This means Supabase Auth cannot connect to ZeptoMail SMTP server and times out after waiting too long.

---

## Common Causes & Solutions

### 1. Wrong SMTP Port (Most Common)

**Problem:** Using port 587 when ZeptoMail requires a different port

**Solution:** Try these ports in order:

1. **Port 465 (SSL/TLS)** - Try this first
2. Port 587 (STARTTLS)
3. Port 25 (Plain - not recommended)

**How to change:**
1. Go to Supabase Dashboard → Settings → Auth → SMTP Settings
2. Change `SMTP Port` to **465**
3. Enable **SSL/TLS** toggle
4. Click **Save**
5. Test again

---

### 2. Incorrect SMTP Host

**Problem:** Wrong ZeptoMail SMTP hostname

**Check these options:**
- `smtp.zeptomail.com` (Standard)
- `smtppro.zoho.com` (Legacy)
- Check your ZeptoMail dashboard for correct hostname

**How to verify:**
1. Login to https://www.zoho.com/zeptomail/
2. Go to **Mail Agents** → **SMTP**
3. Check the **Server Name** shown
4. Copy exact hostname to Supabase

---

### 3. Authentication Method Wrong

**Problem:** ZeptoMail uses token/API key instead of username/password

**ZeptoMail SMTP credentials format:**

**Option A: Using SMTP Token**
```
SMTP Username: emailapikey
SMTP Password: [Your ZeptoMail Send Mail Token]
```

**Option B: Using Account Credentials**
```
SMTP Username: [Your ZeptoMail username/email]
SMTP Password: [Your ZeptoMail password]
```

**Get your credentials:**
1. Go to https://www.zoho.com/zeptomail/
2. Navigate to **Mail Agents** → **SMTP**
3. Click **Generate Token** or use existing token
4. Copy the token to use as password

---

### 4. Domain Not Verified

**Problem:** Sending from unverified domain

**Solution:**
1. Go to ZeptoMail → **Email Domains**
2. Verify `lavlay.com` is listed and verified
3. If not verified:
   - Add domain
   - Add DNS records (SPF, DKIM, DMARC)
   - Verify domain

**Required DNS Records:**

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:zeptomail.com ~all
```

**DKIM Record:**
```
Type: TXT
Name: zeptomail._domainkey
Value: [Get from ZeptoMail dashboard]
```

---

## Quick Troubleshooting Steps

### Step 1: Test SMTP Connection Manually

Use this PowerShell script to test SMTP:

```powershell
# Test ZeptoMail SMTP connection
$smtp = New-Object Net.Mail.SmtpClient("smtp.zeptomail.com", 465)
$smtp.EnableSsl = $true
$smtp.Credentials = New-Object System.Net.NetworkCredential("emailapikey", "YOUR_TOKEN_HERE")

try {
    $mail = New-Object System.Net.Mail.MailMessage
    $mail.From = "noreply@lavlay.com"
    $mail.To.Add("your-email@example.com")
    $mail.Subject = "Test from PowerShell"
    $mail.Body = "This is a test email"

    $smtp.Send($mail)
    Write-Host "✅ Email sent successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
```

If this fails, your SMTP credentials are wrong.

### Step 2: Check Supabase Auth Logs

1. Go to Supabase Dashboard → **Logs** → **Auth Logs**
2. Filter for `auth.recovery` events
3. Look for detailed error messages
4. Common errors:
   - "Connection timeout" = Wrong port/host
   - "Authentication failed" = Wrong credentials
   - "550 Sender not verified" = Domain not verified

### Step 3: Try Alternative Configuration

If ZeptoMail SMTP keeps timing out, you have 2 options:

**Option A: Use Different Port (465 with SSL)**
```
SMTP Host: smtp.zeptomail.com
SMTP Port: 465
Username: emailapikey
Password: [Your token]
Enable SSL/TLS: YES
```

**Option B: Create Custom Edge Function** (Bypass SMTP)
I can help you create an Edge Function that uses ZeptoMail API directly instead of SMTP. This is more reliable.

---

## Recommended Configuration for ZeptoMail

Based on ZeptoMail's documentation:

```
Sender Name: LavLay
Sender Email: noreply@lavlay.com

SMTP Host: smtp.zeptomail.com
SMTP Port: 465 (recommended) or 587
SMTP Username: emailapikey
SMTP Password: [Your Send Mail Token from ZeptoMail dashboard]

Enable SSL/TLS: YES (for port 465)
```

---

## Alternative: ZeptoMail API (More Reliable)

Instead of SMTP, we can use ZeptoMail's API which is faster and more reliable:

### Create Edge Function for Password Reset

I can create a custom Edge Function that:
1. Intercepts password reset requests
2. Uses ZeptoMail API directly
3. Sends email instantly (no SMTP timeout)
4. More control over email template

Would you like me to set this up?

---

## Testing After Configuration

After updating SMTP settings:

1. **Wait 2-3 minutes** for Supabase to apply changes
2. **Test password reset:**
   - Go to login page
   - Click "Forgot Password"
   - Enter your email
   - Should complete within 5-10 seconds (not 30+ seconds)
3. **Check email inbox** (including spam)
4. **Check Supabase logs** for success/error

---

## Quick Diagnostic

Run this in browser console on login page:

```javascript
// Test if SMTP is configured
const testReset = async () => {
  console.time('Password Reset');
  try {
    const { data, error } = await window.supabase.auth.resetPasswordForEmail('test@example.com');
    console.timeEnd('Password Reset');
    if (error) console.error('Error:', error);
    else console.log('Success:', data);
  } catch (err) {
    console.timeEnd('Password Reset');
    console.error('Exception:', err);
  }
};
testReset();
```

**Expected results:**
- ✅ Completes in < 10 seconds = Working
- ❌ Times out after 30+ seconds = SMTP issue
- ❌ Error message = Check Auth logs

---

## Most Likely Fix

Based on the 504 error, try this first:

1. Go to Supabase → Settings → Auth → SMTP Settings
2. Change to:
   ```
   Port: 465
   Enable SSL/TLS: ON
   ```
3. Save and test

If still failing, the credentials or domain verification is the issue.

---

Need help? Let me know what you see in:
1. ZeptoMail dashboard → SMTP section
2. Supabase Auth logs
3. What error you get with port 465
