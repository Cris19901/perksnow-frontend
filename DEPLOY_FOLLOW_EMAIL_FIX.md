# Fix Follow Notification Email - Rich HTML Version

## Problem
Follow notification emails are showing plain text instead of rich HTML with profile picture.

**Current (broken):**
```
You have a new notification from LavLay.
```

**Expected (rich HTML):**
- Follower's profile picture
- Follower's name and username
- "View Profile" button
- Styled with gradients and colors

## Root Cause
The Edge Function needs to be redeployed with the updated `follow_notification` template code.

---

## Solution: Redeploy Edge Function

### Option 1: Deploy via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select project: **kswknblwjlkgxgvypkmo**

2. **Navigate to Edge Functions**
   - Click **Edge Functions** in sidebar
   - Click **send-email** function

3. **Update the Code**
   - Copy the entire content from: `supabase/functions/send-email/index.ts`
   - Paste it into the editor
   - Click **Deploy** button

4. **Wait for Deployment**
   - Should take 10-30 seconds
   - You'll see "Deployed successfully" message

5. **Test**
   - Have someone follow you
   - Check your email for the rich HTML version

---

### Option 2: Deploy via Supabase CLI (Advanced)

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref kswknblwjlkgxgvypkmo

# 4. Deploy the function
supabase functions deploy send-email

# 5. Check deployment
supabase functions list
```

---

## Verify Deployment

### Check Edge Function Logs

1. Go to: **Edge Functions** → **send-email** → **Logs**
2. Click **Invoke** button with this test payload:

```json
{
  "type": "follow_notification",
  "data": {
    "to_email": "YOUR_EMAIL@example.com",
    "to_name": "Test User",
    "follower_name": "John Doe",
    "follower_username": "johndoe",
    "follower_avatar": "https://ui-avatars.com/api/?name=John+Doe"
  }
}
```

3. Check your email inbox for the rich HTML version

### Expected Log Output

You should see:
```
Email sent successfully to: YOUR_EMAIL@example.com
```

If you see errors, check:
- `ZEPTOMAIL_API_KEY` is set in Edge Function secrets
- API key is valid and not expired

---

## Troubleshooting

### Issue 1: Still Getting Plain Text Email

**Cause:** Edge Function not redeployed or cached

**Fix:**
1. Redeploy the function (follow steps above)
2. Clear browser cache
3. Test again

### Issue 2: No Email Received at All

**Cause:** Database trigger not firing or http extension missing

**Fix:**
```sql
-- Check if http extension is enabled
SELECT * FROM pg_extension WHERE extname = 'http';

-- If not found, enable it:
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Verify trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trigger_send_follow_notification';
```

### Issue 3: Error in Edge Function Logs

**Cause:** Missing environment variable or API key issue

**Fix:**
1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Check `ZEPTOMAIL_API_KEY` exists
3. Value should start with something like `Zoho-enczapikey ...`
4. If missing, add it

---

## Quick Test Script

Run this in Supabase SQL Editor to test manually:

```sql
-- Test follow notification with real user data
DO $$
DECLARE
  follower_user_id UUID;
  following_user_id UUID;
BEGIN
  -- Get two real user IDs
  SELECT id INTO follower_user_id FROM users LIMIT 1 OFFSET 0;
  SELECT id INTO following_user_id FROM users LIMIT 1 OFFSET 1;

  -- Create a test follow (this triggers the email)
  INSERT INTO follows (follower_id, following_id)
  VALUES (follower_user_id, following_user_id);

  RAISE NOTICE 'Test follow created. Check email!';
END $$;
```

---

## Next Steps

1. ✅ Redeploy Edge Function (10 seconds)
2. ✅ Test with manual follow (30 seconds)
3. ✅ Verify rich HTML email received
4. ✅ Done!

---

## Expected Email Design

After deployment, emails will include:

- **Header:** Purple/pink gradient with "🎉 New Follower!"
- **Profile Section:**
  - Circular profile picture (80x80px)
  - Follower's full name (bold, large)
  - @username (gray, small)
  - "started following you!" text
- **CTA Button:** Purple gradient "View Profile" button
- **Tip Box:** Yellow box with engagement tip
- **Footer:** LavLay branding and links

---

Need help? Check Edge Function logs for errors or let me know!
