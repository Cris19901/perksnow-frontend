# Complete ZeptoMail Email Setup for LavLay

## Overview
You already have ZeptoMail working for welcome emails. This guide adds:
1. **Password Reset** emails (via Supabase Auth + ZeptoMail SMTP)
2. **Follow Notification** emails (via your existing Edge Function)

---

## PART 1: Password Reset Emails (Supabase Auth + ZeptoMail)

### Step 1: Get ZeptoMail SMTP Credentials

1. Login to https://www.zoho.com/zeptomail/
2. Go to **Mail Agents** → **SMTP**
3. Click **Add SMTP User** (or use existing)
4. Note these details:

```
SMTP Host: smtp.zeptomail.com
SMTP Port: 587
SMTP Username: [Your username - usually emailapikey]
SMTP Password: [Your password/token]
```

### Step 2: Configure Supabase Auth SMTP

1. Go to https://supabase.com/dashboard
2. Select project: **kswknblwjlkgxgvypkmo**
3. Click **Project Settings** → **Auth**
4. Scroll to **SMTP Settings**
5. Click **Enable Custom SMTP**
6. Fill in:

```
Sender Name: LavLay
Sender Email: noreply@lavlay.com

SMTP Host: smtp.zeptomail.com
SMTP Port: 587
SMTP Username: [Your ZeptoMail SMTP username]
SMTP Password: [Your ZeptoMail SMTP password]
```

7. Click **Save**

### Step 3: Customize Password Reset Email Template

1. In Supabase Dashboard → **Auth** → **Email Templates**
2. Click **Recovery** (Password Reset)
3. Paste this:

**Subject:**
```
Reset your LavLay password
```

**HTML Body:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">🔐 Reset Your Password</h1>
  </div>

  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hi there,</p>

    <p>You requested to reset your password for your LavLay account.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}"
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold;">
        Reset Password
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      This link expires in <strong>60 minutes</strong>.
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

4. Click **Save**

### Step 4: Test Password Reset

1. Go to https://www.lavlay.com/login
2. Click **Forgot Password**
3. Enter your email
4. Check inbox for reset email
5. Click link and confirm it works

---

## PART 2: Follow Notification Emails

### Step 1: Update Edge Function with Follow Template

Your Edge Function is at: `supabase/functions/send-email/index.ts`

Add this case to the `getEmailTemplate` function (after the `welcome` case, around line 398):

```typescript
case 'follow_notification':
  return {
    subject: `${data.follower_name} started following you on LavLay`,
    htmlBody: `
      <!DOCTYPE html>
      <html>
      <head>${styles}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Follower!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.to_name},</p>

            <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 20px 0; display: flex; align-items: center;">
              <img src="${data.follower_avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(data.follower_name)}"
                   style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #9333ea; margin-right: 20px;">
              <div>
                <h2 style="margin: 0; font-size: 20px;">${data.follower_name}</h2>
                <p style="margin: 5px 0; color: #6b7280;">@${data.follower_username}</p>
                <p style="margin: 10px 0 0 0;">started following you!</p>
              </div>
            </div>

            <p style="text-align: center;">
              <a href="https://lavlay.com/@${data.follower_username}" class="button">View Profile</a>
            </p>

            <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
              <strong>💡 Tip:</strong> Follow them back to build your community and earn engagement points!
            </div>
          </div>
          <div class="footer">
            <p>LavLay - Social Media Monetization Platform</p>
            <p><a href="https://lavlay.com">lavlay.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
```

### Step 2: Update EmailPayload Interface

Add `'follow_notification'` to the type definition (around line 13):

```typescript
interface EmailPayload {
  type: 'referral_signup' | 'referral_deposit' | 'withdrawal_request' | 'withdrawal_completed' | 'withdrawal_rejected' | 'withdrawal_status' | 'welcome' | 'follow_notification';
  // ... rest of interface
  follower_name?: string;
  follower_username?: string;
  follower_avatar?: string;
}
```

### Step 3: Deploy Updated Edge Function

```bash
# Navigate to project root
cd c:\Users\FADIPE TIMOTHY\OneDrive\Documents\perknowv2-latest

# Deploy to Supabase
supabase functions deploy send-email
```

Or deploy via Supabase Dashboard:
1. Go to **Edge Functions**
2. Click **send-email**
3. Paste updated code
4. Click **Deploy**

### Step 4: Create Database Trigger

Run this SQL in Supabase SQL Editor:

```sql
-- Function to send follow notification email
CREATE OR REPLACE FUNCTION send_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  follower_name TEXT;
  follower_username TEXT;
  follower_avatar TEXT;
  followed_email TEXT;
  followed_name TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get follower details
  SELECT full_name, username, avatar_url
  INTO follower_name, follower_username, follower_avatar
  FROM users
  WHERE id = NEW.follower_id;

  -- Get followed user's email and name
  SELECT email, full_name
  INTO followed_email, followed_name
  FROM users
  WHERE id = NEW.following_id;

  -- Only send email if followed user has an email
  IF followed_email IS NOT NULL THEN
    -- Get Supabase URL (adjust if needed)
    supabase_url := 'https://kswknblwjlkgxgvypkmo.supabase.co';
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- Call Edge Function to send email
    PERFORM
      net.http_post(
        url := supabase_url || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'follow_notification',
          'data', jsonb_build_object(
            'to_email', followed_email,
            'to_name', followed_name,
            'follower_name', follower_name,
            'follower_username', follower_username,
            'follower_avatar', COALESCE(follower_avatar, 'https://ui-avatars.com/api/?name=' || follower_name)
          )
        )
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_send_follow_notification ON follows;
CREATE TRIGGER trigger_send_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION send_follow_notification();

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_follow_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION send_follow_notification() TO anon;
```

---

## Complete Email System Summary

After setup, your ZeptoMail system handles:

| Email Type | Triggered By | Status |
|------------|--------------|--------|
| ✅ Welcome Email | User signup | Already working |
| ✅ Password Reset | Forgot password button | New - via Supabase Auth |
| ✅ Follow Notification | Someone follows you | New - via Edge Function |
| ✅ Withdrawal Request | Submit withdrawal | Already working |
| ✅ Withdrawal Completed | Admin approves | Already working |
| ✅ Withdrawal Rejected | Admin rejects | Already working |
| ✅ Referral Signup | Friend signs up | Already working |
| ✅ Referral Deposit | Friend deposits | Already working |

---

## Testing Checklist

### Test Password Reset:
- [ ] Click "Forgot Password" on login page
- [ ] Enter your email
- [ ] Receive email from ZeptoMail
- [ ] Click reset link
- [ ] Successfully reset password

### Test Follow Notification:
- [ ] Log in as User A
- [ ] Visit User B's profile
- [ ] Click "Follow" button
- [ ] User B receives follow notification email
- [ ] Email displays User A's avatar and username
- [ ] "View Profile" link works

---

## Troubleshooting

### Password Reset Email Not Received

**Check Supabase Auth Logs:**
1. Dashboard → Logs → Auth Logs
2. Look for `auth.recovery` events
3. Check for errors

**Common Issues:**
- SMTP credentials wrong → Re-enter in Supabase
- Domain not verified → Verify in ZeptoMail dashboard
- Email in spam → Check spam folder

### Follow Notification Not Sent

**Check Edge Function Logs:**
1. Dashboard → Edge Functions → send-email → Logs
2. Look for `follow_notification` calls

**Check Trigger:**
```sql
-- Verify trigger exists
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_send_follow_notification';

-- Test manually
SELECT send_follow_notification();
```

**Check ZeptoMail API Key:**
1. Dashboard → Settings → Secrets
2. Verify `ZEPTOMAIL_API_KEY` is set

---

## Next Steps

1. ✅ Configure Supabase SMTP (5 minutes)
2. ✅ Update Edge Function code (5 minutes)
3. ✅ Deploy Edge Function (2 minutes)
4. ✅ Run SQL trigger (1 minute)
5. ✅ Test both email types (5 minutes)

**Total time: ~20 minutes**

---

Need help with any step? Let me know!
