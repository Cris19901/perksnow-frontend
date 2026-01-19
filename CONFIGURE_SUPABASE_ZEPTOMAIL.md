# Configure Supabase Auth with ZeptoMail for Password Reset

## Overview
This guide configures Supabase Auth to use ZeptoMail SMTP for password reset emails only.
Your Resend system will continue handling all other emails (signup, follows, withdrawals).

## Why This Approach?
✅ **Clean separation**: Supabase Auth handles password reset, ZeptoMail for that specific use
✅ **Simple**: No custom Edge Functions needed
✅ **Reliable**: Built-in Supabase Auth email system
✅ **Your existing system unchanged**: Resend continues for all other emails

## Step 1: Get ZeptoMail SMTP Credentials

### A. Login to ZeptoMail
1. Go to https://www.zoho.com/zeptomail/
2. Login to your account

### B. Get SMTP Details
1. Go to **Mail Agents** → **SMTP**
2. Click **Add SMTP User** (if you don't have one)
3. Note these details:

```
SMTP Host: smtp.zeptomail.com
SMTP Port: 587 (or 465 for SSL)
SMTP Username: [Your ZeptoMail username - usually an email]
SMTP Password: [Your ZeptoMail password/token]
```

### C. Verify Your Domain (If Not Done)
1. Go to **Email Domains**
2. Add `lavlay.com`
3. Add DNS records (SPF, DKIM, DMARC)
4. Verify domain

## Step 2: Configure SMTP in Supabase Dashboard

### A. Navigate to SMTP Settings
1. Go to https://supabase.com/dashboard
2. Select your project: **kswknblwjlkgxgvypkmo**
3. Click **Project Settings** (gear icon in sidebar)
4. Navigate to **Auth** section
5. Scroll down to **SMTP Settings**

### B. Enable Custom SMTP
Click **Enable Custom SMTP**

### C. Enter ZeptoMail SMTP Details

Fill in the form:

```
Sender Name: LavLay
Sender Email: noreply@lavlay.com (or your verified email)

SMTP Host: smtp.zeptomail.com
SMTP Port: 587
SMTP Username: [Your ZeptoMail SMTP username]
SMTP Password: [Your ZeptoMail SMTP password]

Enable SSL/TLS: Yes (if using port 465)
```

### D. Save Settings
Click **Save** at the bottom

## Step 3: Configure Email Templates

### A. Navigate to Email Templates
1. In Supabase Dashboard → **Auth**
2. Click **Email Templates** tab

### B. Configure Recovery Email Template

Click **Recovery** (Password Reset) template and customize:

**Subject:**
```
Reset your LavLay password
```

**Email Body (HTML):**
```html
<h2 style="color: #9333ea;">Reset Your Password</h2>

<p>Hi there,</p>

<p>You requested to reset your password for your LavLay account.</p>

<p>Click the button below to reset your password:</p>

<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="display: inline-block;
                background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
                color: #ffffff;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;">
        Reset Password
      </a>
    </td>
  </tr>
</table>

<p style="color: #6b7280; font-size: 14px;">
  This link expires in <strong>60 minutes</strong>.
</p>

<p style="color: #6b7280; font-size: 14px;">
  If you didn't request this, you can safely ignore this email.
</p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

<p style="color: #9ca3af; font-size: 12px; text-align: center;">
  © 2025 LavLay. All rights reserved.<br>
  <a href="https://www.lavlay.com" style="color: #9333ea;">www.lavlay.com</a>
</p>
```

**Click Save**

### C. Disable Other Email Templates (Optional)

Since you're using Resend for other emails:
- **Confirm Signup**: Keep DISABLED (you use Resend)
- **Invite User**: Keep DISABLED
- **Magic Link**: Keep DISABLED
- **Change Email**: Can enable if you want Supabase to handle it

## Step 4: Test Password Reset

### A. Test from Your Site
1. Go to https://www.lavlay.com/login
2. Click **Forgot Password**
3. Enter your email (use your own email for testing)
4. Click **Send Reset Link**

### B. Check Email
1. Check your inbox (and spam folder)
2. You should receive email from `noreply@lavlay.com`
3. Click the reset link
4. You should be redirected to login page

### C. Verify in Supabase Logs
1. Go to Supabase Dashboard → **Logs**
2. Click **Auth Logs**
3. Look for `auth.recovery` events
4. Check for any errors

## Step 5: Troubleshooting

### Issue 1: "Error sending recovery email"
**Cause:** SMTP credentials incorrect or domain not verified

**Fix:**
1. Double-check SMTP username and password
2. Verify domain in ZeptoMail dashboard
3. Check SMTP port (try 587 or 465)

### Issue 2: Email not received
**Cause:** Email in spam or domain not verified

**Fix:**
1. Check spam folder
2. Verify domain DNS records in ZeptoMail
3. Check ZeptoMail logs for delivery status

### Issue 3: Reset link doesn't work
**Cause:** Redirect URL mismatch

**Fix:**
1. In Supabase Dashboard → **Auth** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://www.lavlay.com/login
   https://www.lavlay.com/*
   http://localhost:5173/*
   ```

## Step 6: Production Checklist

Before going live:

- [ ] ZeptoMail domain verified with all DNS records
- [ ] SMTP settings saved in Supabase
- [ ] Password reset email template customized
- [ ] Test password reset end-to-end
- [ ] Email received and looks good
- [ ] Reset link works correctly
- [ ] Redirect URLs configured
- [ ] Test on mobile device

## ZeptoMail Specific Settings

### Recommended Settings in ZeptoMail:
1. **Bounce Handling**: Enable
2. **Sending Limits**: Set appropriate daily limits
3. **Tracking**: Enable open/click tracking if desired
4. **Unsubscribe**: Not needed for transactional emails

### DNS Records for lavlay.com
Make sure these are added in your domain DNS (Cloudflare):

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
Value: [Provided by ZeptoMail]
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@lavlay.com
```

## Alternative: If ZeptoMail SMTP Doesn't Work

If you have issues with SMTP, we can create a custom Edge Function that uses ZeptoMail's API directly. Let me know if you need this option.

## Email System Summary

After configuration, your email system will be:

| Email Type | Service | Method |
|------------|---------|--------|
| Signup Welcome | Resend | Your custom system |
| Password Reset | ZeptoMail | Supabase Auth |
| Follow Notifications | Resend | Your custom system |
| Withdrawal Confirmations | Resend | Your custom system |
| Payment Receipts | Resend | Your custom system |

This keeps everything organized and uses each service for what it does best!

## Need Help?

Common ZeptoMail links:
- Dashboard: https://www.zoho.com/zeptomail/
- SMTP Setup: https://www.zoho.com/zeptomail/help/smtp-setup.html
- API Docs: https://www.zoho.com/zeptomail/help/api/

---

**Next Steps:**
1. Get your ZeptoMail SMTP credentials
2. Configure in Supabase Dashboard
3. Test password reset
4. You're done! 🎉
