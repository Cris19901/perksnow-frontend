# Enable Email Confirmation in Supabase

## Why No Email Was Sent

When you signed up, no verification email was sent because:
- Email confirmation is disabled in Supabase Auth settings, OR
- You're auto-confirmed on signup

## Enable Email Verification

### Step 1: Check Current Settings

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/settings
2. Scroll to **"Email Confirmation"** section
3. Check the following settings

### Step 2: Enable Email Confirmation

Enable these settings:

**Email Confirmation Settings:**
- ✅ **Enable email confirmations** - Turn this ON
- ✅ **Confirm email** - Turn this ON

**What this does:**
- Users must verify their email before they can log in
- Sends an OTP or magic link to their email
- Prevents fake email signups

### Step 3: Configure Email Templates (Optional)

Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/templates

Customize:
- **Confirm signup** - The verification email template
- **Magic Link** - For passwordless login
- **Reset Password** - For password reset

### Step 4: Test Signup Again

1. Create a new account with a real email
2. Check your inbox for verification email
3. Click the link or enter the OTP
4. Account will be verified

## If Email Confirmation is Already Enabled

If confirmation is enabled but you didn't receive an email, it might be:

### Issue 1: Email Deliverability

Supabase's default SMTP has poor deliverability. Solution:

1. **Configure Custom SMTP with Resend** (recommended):
   - Go to Auth → Settings → SMTP Settings
   - Enable "Custom SMTP"
   - Use Resend credentials:
     - Host: `smtp.resend.com`
     - Port: `587`
     - Username: `resend`
     - Password: Your Resend API key (re_...)
     - Sender email: `noreply@lavlay.com` (after domain verification)

2. Benefits:
   - 99.9% deliverability for OTP emails
   - Consistent with your Resend integration
   - Professional email sender

### Issue 2: You're Auto-Confirmed

Check if you're already confirmed:

```sql
-- Run this in SQL Editor
SELECT
    id,
    email,
    email_confirmed_at,
    confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

If `email_confirmed_at` is already set, you're auto-confirmed (no email needed).

### Issue 3: Rate Limiting

Supabase limits:
- 4 emails per hour per user
- If you tried multiple signups, you might be rate-limited

Wait 1 hour and try again.

## Recommended Setup

For best results:

1. ✅ **Enable email confirmation** in Auth settings
2. ✅ **Configure Resend as custom SMTP** for better deliverability
3. ✅ **Customize email templates** to match your brand
4. ✅ **Test with a real email address**

## Current Status Check

Run this SQL to see your current auth configuration:

```sql
-- Check if email confirmation is required
SELECT
    name,
    value
FROM pg_settings
WHERE name LIKE '%auth%'
OR name LIKE '%email%';
```

## Testing Email Delivery

After enabling:

1. **Create new account** with real email
2. **Check inbox** (and spam folder)
3. **Check Supabase logs**: Auth → Logs → Email sent
4. **Check Resend dashboard** (if using custom SMTP): https://resend.com/emails

## Quick Fix: Manually Confirm Users

If you need to manually confirm existing users:

```sql
-- Manually confirm a user (for testing)
UPDATE auth.users
SET
    email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'user@example.com';
```

## Summary

**Current State**: Signup works, but no verification email sent

**Solution**: Enable email confirmation in Supabase Auth settings

**Better Solution**: Enable confirmation + Configure Resend SMTP for 99.9% deliverability

**Next Steps**:
1. Go to Auth → Settings
2. Enable "Email Confirmation"
3. (Optional) Configure Resend SMTP
4. Test signup with real email
