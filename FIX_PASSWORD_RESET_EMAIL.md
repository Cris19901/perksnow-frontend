# Fix Password Reset Email - Supabase Configuration Required

## Problem
Password reset emails are failing with 500 error:
```
POST https://185.16.39.144/auth/v1/recover 500 (Internal Server Error)
AuthApiError: Error sending recovery email
```

This is **NOT a frontend code issue** - Supabase needs email configuration.

## Root Cause
Supabase requires SMTP configuration to send password reset emails. Without it, the auth endpoint returns 500 errors.

## Solution: Configure SMTP in Supabase Dashboard

### Step 1: Access Supabase Email Settings
1. Go to https://supabase.com/dashboard
2. Select your project: `kswknblwjlkgxgvypkmo`
3. Navigate to: **Project Settings** → **Auth** → **SMTP Settings**

### Step 2: Choose Email Provider

#### Option A: Use Resend (Recommended - You already have account)
Based on your previous setup, you likely have Resend configured.

**SMTP Settings:**
```
SMTP Host: smtp.resend.com
SMTP Port: 587 (or 465 for SSL)
SMTP User: resend
SMTP Password: [Your Resend API Key - starts with re_]
Sender Email: noreply@lavlay.com (or your verified domain)
Sender Name: LavLay
```

#### Option B: Use SendGrid
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@lavlay.com
Sender Name: LavLay
```

#### Option C: Use Gmail (Testing Only)
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: [App-specific password]
Sender Email: your-email@gmail.com
Sender Name: LavLay
```

### Step 3: Enable Auth Emails
In Supabase Dashboard → **Auth** → **Email Templates**:

1. **Enable Email Confirmations**: OFF (you have this disabled)
2. **Enable Email Password Recovery**: ON ✅ (MUST be enabled)

### Step 4: Customize Password Reset Email (Optional)
In **Auth** → **Email Templates** → **Reset Password**:

```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>You requested to reset your password for LavLay.</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link expires in 60 minutes.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>Thanks,<br>The LavLay Team</p>
```

### Step 5: Test Password Reset
1. Deploy changes (already done)
2. Go to https://www.lavlay.com/login
3. Click "Forgot Password"
4. Enter your email
5. Check inbox for reset email

## Quick Fix: Get Your Resend API Key

If you already have Resend configured for other emails:

1. Go to https://resend.com/api-keys
2. Copy your API key (starts with `re_`)
3. Use it in Supabase SMTP settings

## Verification Checklist

After configuring SMTP in Supabase:

- [ ] SMTP settings saved in Supabase dashboard
- [ ] "Enable Email Password Recovery" is ON
- [ ] Sender email is verified with your provider
- [ ] Test password reset from login page
- [ ] Check email inbox (and spam folder)
- [ ] Click reset link and confirm it works

## Alternative: Custom Edge Function (If SMTP Fails)

If you can't get SMTP working, we can create a custom Edge Function to send password reset emails via Resend API directly. Let me know if you need this option.

## Current Status

- ✅ Frontend code is correct
- ✅ Error handling improved
- ❌ Supabase SMTP not configured
- ⏳ Waiting for SMTP configuration

## Next Steps

1. Configure SMTP in Supabase Dashboard (see steps above)
2. Test password reset functionality
3. If still failing, check Supabase logs: **Logs** → **Auth Logs**

---

**Note:** The frontend code is working correctly. The 500 error is coming from Supabase's auth server because it can't send emails without SMTP configuration.
