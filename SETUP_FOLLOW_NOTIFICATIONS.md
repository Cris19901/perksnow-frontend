# Setup Follow Email Notifications

## Overview
This guide sets up email notifications when someone follows a user on LavLay.

## System Architecture

```
User A follows User B
    ↓
Database Trigger fires
    ↓
Insert into scheduled_emails table
    ↓
Your existing email Edge Function processes it
    ↓
Resend sends beautiful email to User B
```

## Step 1: Run SQL Migration

Run the SQL file in your Supabase SQL Editor:

**File:** `ADD_FOLLOW_EMAIL_NOTIFICATIONS.sql`

This creates:
- ✅ `send_follow_notification()` function
- ✅ Trigger on `follows` table
- ✅ Automatic email scheduling on new follow

```bash
# Copy the SQL and run it in Supabase Dashboard
# OR upload the file to Supabase SQL Editor
```

## Step 2: Update Your Email Edge Function

You already have an email processing system. Add the follow notification template:

### Option A: If using `process-scheduled-emails` Edge Function

Add this case to your email template switch:

```typescript
case 'follow_notification':
  const { follower_name, follower_username, follower_avatar, followed_name, profile_url } = templateData;

  htmlBody = `
    <!DOCTYPE html>
    <html>
    <!-- Use the HTML from FOLLOW_EMAIL_TEMPLATE.tsx -->
    </html>
  `;

  textBody = `Hi ${followed_name}, ${follower_name} (@${follower_username}) started following you on LavLay! Check out their profile: ${profile_url}`;
  break;
```

### Option B: Copy Full Template

The complete HTML template is in: `FOLLOW_EMAIL_TEMPLATE.tsx`

## Step 3: Test the System

### Test 1: Manual SQL Test
```sql
-- Test follow notification trigger
-- Replace USER_ID_1 and USER_ID_2 with real user IDs from your users table

-- Check current follows
SELECT * FROM follows LIMIT 5;

-- Insert test follow (this will trigger the email)
INSERT INTO follows (follower_id, following_id)
VALUES ('USER_ID_1', 'USER_ID_2');

-- Check if email was scheduled
SELECT * FROM scheduled_emails
WHERE email_type = 'follow_notification'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 2: Frontend Test
1. Log in as User A
2. Go to User B's profile: `https://www.lavlay.com/@username`
3. Click "Follow" button
4. Check `scheduled_emails` table for new entry
5. Wait for your email processing function to run
6. Check User B's email inbox

## Step 4: Verify Email Delivery

### Check scheduled_emails table:
```sql
SELECT
  recipient_email,
  subject,
  email_type,
  status,
  scheduled_for,
  sent_at,
  error_message
FROM scheduled_emails
WHERE email_type = 'follow_notification'
ORDER BY created_at DESC
LIMIT 10;
```

### Common Issues:

**Issue 1: No email in scheduled_emails**
- Check trigger exists: Run verification query from SQL file
- Check if user has email: `SELECT email FROM users WHERE id = 'USER_ID'`

**Issue 2: Email scheduled but not sent**
- Check your email processing Edge Function is running
- Check for errors in Edge Function logs
- Verify Resend API key is configured

**Issue 3: Email sent but not received**
- Check spam folder
- Verify sender domain is configured in Resend
- Check Resend dashboard for delivery status

## Email Preview

The follow notification email includes:
- 🎉 Celebratory header
- 👤 Follower's avatar and username
- 🔗 Direct link to follower's profile
- 💡 Tip to follow back and earn points
- ⚙️ Preference management link

**Subject:** `{follower_name} started following you on LavLay`

## Optional: Add Email Preferences

Let users control follow notifications:

### Add to users table:
```sql
ALTER TABLE users
ADD COLUMN email_preferences JSONB DEFAULT '{"follow_notifications": true, "like_notifications": true, "comment_notifications": true}'::jsonb;
```

### Update trigger function:
```sql
-- Add this check before sending email
DECLARE
  email_prefs JSONB;
BEGIN
  -- Get user's email preferences
  SELECT email_preferences INTO email_prefs
  FROM users WHERE id = NEW.following_id;

  -- Only send if notifications enabled
  IF (email_prefs->>'follow_notifications')::boolean = true THEN
    -- Send email code here
  END IF;
END;
```

## Answer to Your Questions

### Q1: Can I use Supabase Auth solely for password recovery?
**Yes!** Configure SMTP in Supabase (as per `FIX_PASSWORD_RESET_EMAIL.md`), and keep using your custom Resend system for everything else:

- ✅ Signups → Your Resend system (already working)
- ✅ Password Reset → Supabase Auth (requires SMTP config)
- ✅ Follows → Your Resend system (this guide)
- ✅ Withdrawals → Your Resend system (already working)

### Q2: Is there provision for follow notifications?
**Yes!** That's what this guide sets up. The system:

1. Uses the same `scheduled_emails` table as withdrawals
2. Uses your existing Resend email infrastructure
3. Sends beautiful branded emails automatically
4. Works seamlessly with your current system

## Deployment Checklist

- [ ] Run SQL migration in Supabase
- [ ] Add follow template to email Edge Function
- [ ] Test with manual SQL insert
- [ ] Test via frontend follow button
- [ ] Verify email received
- [ ] Check email displays correctly
- [ ] Configure Supabase SMTP for password recovery (optional)

## Next Steps

1. Run the SQL migration
2. Update your email Edge Function with the template
3. Test the flow end-to-end
4. Optionally add email preferences

Need help with any step? Let me know!
