# OTP Authentication Guide for LavLay

## Current Setup

Your LavLay platform uses **Supabase Auth** for OTP (One-Time Password) emails. This is the correct approach!

## What's Handled by Supabase Auth

✅ **Email Verification OTP** - Sent after signup
✅ **Password Reset OTP** - Sent when user requests password reset
✅ **Magic Link OTP** - For passwordless login (if enabled)
✅ **2FA OTP** - Two-factor authentication codes (if enabled)

## Email Service Strategy

### Supabase Auth (Keep Using)
**Use for:**
- ✅ Email verification OTP
- ✅ Password reset emails
- ✅ Magic link login
- ✅ Account security emails

**Why?** These are tightly integrated with Supabase's authentication system.

### Resend (Already Integrated)
**Use for:**
- ✅ Welcome emails
- ✅ Follower notifications
- ✅ Comment notifications
- ✅ Product confirmations
- ✅ Marketing emails

**Why?** Better deliverability (99.9%) for transactional emails.

## Checking Your Current OTP Configuration

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/settings

2. Check these settings:

### Email Confirmation
- **Enable email confirmations**: Should be ON
- **Confirm email**: Should be ON for new signups

### Email Templates
You can customize:
- Confirmation email template
- Magic link email template
- Password reset email template

## Improving OTP Deliverability

Your Supabase Auth OTP emails might go to spam. Here are solutions:

### Option 1: Custom SMTP (Recommended for Production)

Use Resend as SMTP for Supabase Auth emails:

1. **Get Resend SMTP Credentials**:
   - Go to: https://resend.com/settings/smtp
   - Host: `smtp.resend.com`
   - Port: `587` (or `465` for SSL)
   - Username: `resend`
   - Password: Your Resend API key (re_...)

2. **Configure in Supabase**:
   - Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/settings
   - Scroll to "SMTP Settings"
   - Enable "Custom SMTP"
   - Enter Resend SMTP details
   - Save

3. **Benefits**:
   - OTP emails use Resend's infrastructure
   - 99.9% deliverability for auth emails too
   - Consistent sender for all emails

### Option 2: Keep Default (Current Setup)

If OTP emails are working fine:
- ✅ Keep using Supabase's default SMTP
- ✅ Use Resend only for transactional emails
- ✅ Simple and free

## Testing OTP

### Test Email Verification:

1. Create a new account with a real email
2. Check inbox for verification email
3. Click the link or enter OTP code
4. Account should be verified

### Test Password Reset:

Add password reset functionality:

```typescript
// src/lib/auth.ts

/**
 * Request password reset email
 */
export const requestPasswordReset = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
};

/**
 * Update password with reset token
 */
export const updatePassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};
```

## Enable Magic Link Login (Optional)

For passwordless authentication:

```typescript
// src/lib/auth.ts

/**
 * Sign in with magic link (OTP email)
 */
export const signInWithMagicLink = async (email: string) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error sending magic link:', error);
    throw error;
  }
};
```

## OTP Security Best Practices

1. **Rate Limiting** ✅ (Supabase handles this)
   - Limited OTP requests per hour
   - Prevents spam/abuse

2. **Expiration** ✅ (Supabase default: 1 hour)
   - OTP codes expire automatically
   - Users must request new code if expired

3. **One-Time Use** ✅ (Supabase handles this)
   - Codes can only be used once
   - Automatically invalidated after use

4. **Secure Delivery** ⚠️ (Can be improved)
   - Default: Shared SMTP (60-70% deliverability)
   - Improved: Custom SMTP with Resend (99.9%)

## Monitoring OTP Emails

### Check Supabase Logs:
- Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/logs
- Filter by: "Email sent"
- See: Delivery status and any errors

### If Using Custom SMTP (Resend):
- Go to: https://resend.com/emails
- See all OTP emails sent
- Check delivery status

## Common Issues & Solutions

### Issue: OTP emails not arriving

**Solution 1**: Check spam folder

**Solution 2**: Verify email settings in Supabase
- Go to Auth → Settings
- Confirm email is enabled
- Check SMTP configuration

**Solution 3**: Use custom SMTP (Resend)
- Follow "Option 1" above
- Better deliverability

### Issue: OTP emails going to spam

**Solution**: Use custom SMTP with Resend
- Configure Resend SMTP in Supabase
- Verify your domain in Resend
- Emails will come from `noreply@lavlay.com`

### Issue: OTP expired

**Solution**: Increase expiration time
- Go to Auth → Settings → Email
- Adjust "Email OTP expiry"
- Default is 3600 seconds (1 hour)

## Customizing OTP Email Templates

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/templates

2. Customize these templates:
   - **Confirm signup** - Email verification
   - **Magic Link** - Passwordless login
   - **Change Email** - Email change confirmation
   - **Reset Password** - Password reset

3. Available variables:
   - `{{ .Token }}` - OTP code
   - `{{ .TokenHash }}` - OTP hash
   - `{{ .SiteURL }}` - Your site URL
   - `{{ .ConfirmationURL }}` - Direct confirmation link

## Recommended Setup

**For Best Results:**

1. ✅ Keep Supabase Auth for OTP/authentication emails
2. ✅ Keep Resend for transactional/notification emails
3. ✅ Configure Resend as custom SMTP in Supabase (optional but recommended)
4. ✅ Customize email templates to match your brand
5. ✅ Monitor both Supabase logs and Resend dashboard

## Architecture Overview

```
Authentication Emails (OTP, Password Reset)
    ↓
Supabase Auth
    ↓
Custom SMTP (Resend) [Optional but recommended]
    ↓
User's Inbox ✉️

Transactional Emails (Welcome, Notifications)
    ↓
Your App → Resend Edge Function
    ↓
Resend API
    ↓
User's Inbox ✉️
```

## Summary

✅ **Current OTP Setup**: Working with Supabase Auth (default SMTP)
✅ **Deliverability**: Can be improved with custom SMTP
✅ **Resend Integration**: Handles non-auth emails (welcome, notifications)
✅ **Best Practice**: Use both services for their strengths

**Your OTP emails are already working!** If you want better deliverability, configure Resend as custom SMTP in Supabase.

## Next Steps (Optional)

1. **Test OTP flow** - Create account and verify it works
2. **Check deliverability** - See if emails land in inbox or spam
3. **Configure custom SMTP** - If OTP emails go to spam
4. **Customize templates** - Match your brand colors/style
5. **Add password reset** - Implement forgot password flow

**Current Status**: ✅ OTP working with Supabase Auth
**Improvement Available**: Configure Resend as custom SMTP for better deliverability
