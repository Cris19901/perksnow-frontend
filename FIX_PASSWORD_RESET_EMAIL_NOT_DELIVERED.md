# Fix Password Reset Email Not Delivered

## Status
✅ **Success message appears** (green text)
✅ **No 504 timeout** (SMTP connection working)
❌ **Email not received** (delivery issue)

This means Supabase successfully sent the email to ZeptoMail, but ZeptoMail is rejecting or blocking it.

---

## Quick Checks (Do These First)

### 1. Check Spam/Junk Folder
- Look in Spam/Junk folder
- Check "Promotions" tab (Gmail)
- Check "Updates" tab (Gmail)

### 2. Check ZeptoMail Dashboard for Errors

1. Go to https://www.zoho.com/zeptomail/
2. Click **Reports** or **Email Logs**
3. Look for recent email attempts
4. Check status:
   - ✅ **Delivered** = Check spam folder
   - ❌ **Bounced** = See bounce reason
   - ❌ **Rejected** = Authentication issue
   - ⏳ **Queued** = Wait a few minutes

---

## Common Issues & Solutions

### Issue 1: Sender Email Not Verified (Most Common)

**Problem:** `noreply@lavlay.com` is not verified in ZeptoMail

**Check:**
1. Go to ZeptoMail → **Email Domains**
2. Look for `lavlay.com`
3. Check verification status

**If domain is NOT verified:**

**Step 1: Add Domain to ZeptoMail**
1. Click **Add Domain**
2. Enter: `lavlay.com`
3. Click **Add**

**Step 2: Verify Domain with DNS Records**

You'll need to add these DNS records to Cloudflare:

**SPF Record:**
```
Type: TXT
Name: @ (or lavlay.com)
Value: v=spf1 include:zeptomail.com ~all
TTL: Auto
```

**DKIM Record 1:**
```
Type: TXT
Name: zeptomail._domainkey
Value: [Copy from ZeptoMail dashboard]
TTL: Auto
```

**DMARC Record (Optional but recommended):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@lavlay.com
TTL: Auto
```

**Step 3: Add Records to Cloudflare**
1. Go to https://dash.cloudflare.com/
2. Select `lavlay.com`
3. Click **DNS** → **Records**
4. Click **Add record** for each DNS record above
5. Wait 5-10 minutes for propagation
6. Return to ZeptoMail and click **Verify**

### Issue 2: Using Wrong Sender Email

**Problem:** Supabase is configured with wrong sender email

**Fix:**
1. Go to Supabase → **Settings** → **Auth** → **SMTP Settings**
2. Check **Sender Email**
3. Must match a verified email in ZeptoMail:
   - ✅ `noreply@lavlay.com` (if lavlay.com is verified)
   - ❌ `no-reply@lavlay.com` (different email)
   - ❌ Any email not verified in ZeptoMail

### Issue 3: SMTP Authentication Failed

**Problem:** Wrong SMTP username/password format

**Correct format for ZeptoMail:**
```
SMTP Username: emailapikey
SMTP Password: [Your Send Mail Token]
```

**NOT:**
```
SMTP Username: your-email@example.com ❌
SMTP Password: your-account-password ❌
```

**Get correct credentials:**
1. Go to ZeptoMail → **Mail Agents** → **SMTP**
2. Copy the **Send Mail Token**
3. Use:
   - Username: `emailapikey`
   - Password: [Paste token]

### Issue 4: Email Template Has Issues

**Problem:** Email content triggers spam filters

**Check Supabase Email Template:**
1. Go to Supabase → **Auth** → **Email Templates**
2. Click **Recovery** (Password Reset)
3. Check template has proper HTML structure

**Use this template:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Reset Your Password</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
    <p>Hi there,</p>
    <p>You requested to reset your password for your LavLay account.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
        Reset Password
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      This link expires in 60 minutes.
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      If you didn't request this, you can safely ignore this email.
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
      © 2025 LavLay. All rights reserved.
    </div>
  </div>
</div>
```

---

## Diagnostic Steps

### Step 1: Check Supabase Auth Logs

1. Go to Supabase Dashboard → **Logs** → **Auth Logs**
2. Filter by: Last 1 hour
3. Look for `auth.recovery` events
4. Click on recent event
5. Check for error messages:
   - "Email sent successfully" ✅
   - "SMTP error" ❌
   - "Authentication failed" ❌

### Step 2: Check ZeptoMail Logs

1. Go to ZeptoMail → **Reports** → **Email Logs**
2. Look for emails sent in last 10 minutes
3. Check status and click for details
4. Common rejection reasons:
   - "Sender domain not verified"
   - "SPF check failed"
   - "DKIM validation failed"

### Step 3: Test with Different Email Address

Try resetting password with different email providers:
- ✅ Gmail (test@gmail.com)
- ✅ Outlook (test@outlook.com)
- ✅ Yahoo (test@yahoo.com)

If it works with some but not others, it's a spam filter issue.

---

## Quick Test: Send Test Email from ZeptoMail

1. Go to ZeptoMail Dashboard
2. Find **Test Email** or **Send Mail** feature
3. Send test email to yourself from `noreply@lavlay.com`
4. If this fails, domain is not verified
5. If this works, problem is in Supabase configuration

---

## Most Likely Issue: Domain Not Verified

Based on the symptoms, the most likely cause is that `lavlay.com` is not verified in ZeptoMail.

**Quick verification:**
1. Go to ZeptoMail → **Email Domains**
2. Check if `lavlay.com` shows as **Verified** ✅
3. If it shows **Pending** or doesn't exist:
   - Add domain
   - Add DNS records to Cloudflare
   - Verify

**Timeline:**
- Adding DNS records: 5 minutes
- DNS propagation: 5-10 minutes
- ZeptoMail verification: Instant after DNS propagates

---

## Alternative: Use Verified Email Temporarily

If you want password reset working immediately while waiting for domain verification:

1. In ZeptoMail, check which email addresses are already verified
2. Use that verified email as sender in Supabase SMTP settings
3. Examples:
   - If `verified-email@zohomail.com` is verified, use that
   - Temporary until `noreply@lavlay.com` is verified

---

## Next Steps

1. **Check ZeptoMail Email Domains** - Is `lavlay.com` verified?
2. **Check ZeptoMail Email Logs** - What's the delivery status?
3. **Check Supabase Auth Logs** - Any error messages?

Let me know what you see in:
1. ZeptoMail → Email Domains (verified status)
2. ZeptoMail → Email Logs (recent attempts)
3. Supabase → Auth Logs (recovery events)

I can then help you fix the specific issue!
