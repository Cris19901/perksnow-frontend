# Signup Bonus System - Troubleshooting Guide

## Issue: Points Not Awarded on Signup

If users are signing up but not receiving their signup bonus points, follow these steps:

## Step 1: Run the Complete Migration

First, ensure you've run the complete migration that includes the points column:

```sql
-- Run this in Supabase SQL Editor
CREATE_SIGNUP_BONUS_WITH_EMAIL.sql
```

This file now includes:
- ✅ Adding `points` column to users table
- ✅ Creating signup_bonus_settings table
- ✅ Creating signup_bonus_history table
- ✅ Creating trigger function to award bonus
- ✅ Creating trigger on users table
- ✅ Setting up RLS policies

## Step 2: Run Diagnostic Check

Run this SQL to check the system status:

```sql
-- Run this in Supabase SQL Editor
CHECK_SIGNUP_BONUS_STATUS.sql
```

This will show you:
1. Current bonus settings (amount, enabled status)
2. Recent users and their points
3. Bonus history count
4. Trigger status
5. Function status
6. Recent bonus awards

## Step 3: Fix Issues Automatically

Run this SQL to automatically fix common issues:

```sql
-- Run this in Supabase SQL Editor
FIX_SIGNUP_BONUS_ISSUE.sql
```

This script will:
1. ✅ Check if settings table has data (insert if missing)
2. ✅ Verify trigger and function exist
3. ✅ Manually award bonus to most recent user if missing
4. ✅ Enable bonus system if disabled
5. ✅ Show detailed status of all components

## Common Issues & Solutions

### Issue 1: "column 'points' does not exist"

**Cause**: Users table doesn't have points column

**Solution**:
```sql
-- Add points column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

-- Update existing users
UPDATE users SET points = 0 WHERE points IS NULL;
```

Or run: `CREATE_SIGNUP_BONUS_WITH_EMAIL.sql` (already includes this fix)

---

### Issue 2: Bonus Settings Table Empty

**Cause**: Migration didn't insert default settings

**Solution**:
```sql
INSERT INTO signup_bonus_settings (bonus_amount, is_enabled)
VALUES (100, true)
ON CONFLICT (id) DO NOTHING;
```

---

### Issue 3: Trigger Not Firing

**Cause**: Trigger doesn't exist or is disabled

**Check**:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger';
```

**Solution**: Re-run the trigger creation:
```sql
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users;
CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();
```

---

### Issue 4: Bonus Disabled in Settings

**Cause**: `is_enabled` is set to false

**Check**:
```sql
SELECT bonus_amount, is_enabled FROM signup_bonus_settings;
```

**Solution**:
```sql
UPDATE signup_bonus_settings
SET is_enabled = true;
```

---

### Issue 5: Bonus Amount is 0

**Cause**: `bonus_amount` is set to 0 in settings

**Solution**:
```sql
UPDATE signup_bonus_settings
SET bonus_amount = 100  -- or your desired amount
WHERE bonus_amount = 0;
```

---

## Manual Testing

### Test 1: Create New User via SQL

```sql
-- Create test user
INSERT INTO users (email, username, full_name, points)
VALUES ('test@example.com', 'testuser123', 'Test User', 0)
RETURNING id, email, points;

-- Check if bonus was awarded
SELECT * FROM signup_bonus_history
WHERE user_id = 'user-id-from-above';

-- Check user points
SELECT email, points FROM users
WHERE email = 'test@example.com';
```

### Test 2: Check Trigger Execution

```sql
-- Enable notice messages
SET client_min_messages TO NOTICE;

-- Insert test user (should see notice message from trigger)
INSERT INTO users (email, username, full_name)
VALUES ('test2@example.com', 'testuser456', 'Test User 2')
RETURNING id, email, points;
```

You should see a notice like:
```
NOTICE: Signup bonus of 100 points awarded to user [user-id]
```

---

## Manually Award Bonus to Existing Users

If existing users didn't receive their bonus:

```sql
-- Award bonus to specific user
DO $$
DECLARE
    v_user_id UUID := 'user-id-here';
    v_bonus_amount INTEGER;
BEGIN
    -- Get bonus amount
    SELECT bonus_amount INTO v_bonus_amount
    FROM signup_bonus_settings LIMIT 1;

    -- Update user points
    UPDATE users
    SET points = COALESCE(points, 0) + v_bonus_amount
    WHERE id = v_user_id;

    -- Record bonus
    INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
    VALUES (v_user_id, v_bonus_amount, false)
    ON CONFLICT (user_id) DO NOTHING;
END $$;
```

Or award to ALL users who didn't get bonus:

```sql
-- Award bonus to all users without bonus (USE WITH CAUTION!)
DO $$
DECLARE
    v_bonus_amount INTEGER;
    v_user RECORD;
BEGIN
    -- Get bonus amount
    SELECT bonus_amount INTO v_bonus_amount
    FROM signup_bonus_settings LIMIT 1;

    -- Loop through users without bonus
    FOR v_user IN
        SELECT u.id, u.email
        FROM users u
        LEFT JOIN signup_bonus_history h ON h.user_id = u.id
        WHERE h.user_id IS NULL
    LOOP
        -- Update points
        UPDATE users
        SET points = COALESCE(points, 0) + v_bonus_amount
        WHERE id = v_user.id;

        -- Record bonus
        INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
        VALUES (v_user.id, v_bonus_amount, false)
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE 'Awarded % points to %', v_bonus_amount, v_user.email;
    END LOOP;
END $$;
```

---

## Email Not Sent

If bonus was awarded but email wasn't sent:

### Check Pending Emails

```sql
SELECT * FROM get_pending_bonus_emails();
```

### Manually Trigger Email

The email is sent from the client side in `src/lib/auth.ts` after signup. Check:

1. **Browser Console** - Look for errors like:
   - "Failed to send signup bonus email"
   - "Error checking/sending signup bonus email"

2. **Resend Dashboard** - Check https://resend.com/emails for delivery status

3. **Email Sent Flag** - Check if email was marked as sent:
```sql
SELECT user_id, email_sent, email_sent_at
FROM signup_bonus_history
WHERE email_sent = false;
```

### Manually Mark Email as Sent

```sql
SELECT mark_bonus_email_sent('user-id-here');
```

---

## Verification Checklist

After fixing issues, verify everything works:

- [ ] Points column exists in users table
- [ ] signup_bonus_settings table has data (bonus_amount > 0, is_enabled = true)
- [ ] signup_bonus_history table exists
- [ ] award_signup_bonus() function exists
- [ ] Trigger exists on users table (AFTER INSERT)
- [ ] RLS policies are set up correctly
- [ ] Test user gets points on signup
- [ ] Bonus recorded in signup_bonus_history
- [ ] Email is sent (check Resend dashboard)
- [ ] Email marked as sent in database

---

## Quick Fix Commands

If you just want to run everything at once:

```sql
-- Run all three files in order:
-- 1. CREATE_SIGNUP_BONUS_WITH_EMAIL.sql
-- 2. CHECK_SIGNUP_BONUS_STATUS.sql
-- 3. FIX_SIGNUP_BONUS_ISSUE.sql
```

---

## Still Not Working?

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Database → Logs
   - Look for errors related to users table or triggers

2. **Check Function Logs**:
   ```sql
   -- See recent notices/errors
   SELECT * FROM pg_stat_statements
   WHERE query LIKE '%award_signup_bonus%'
   ORDER BY calls DESC;
   ```

3. **Verify RLS isn't blocking**:
   ```sql
   -- Temporarily disable RLS for testing
   ALTER TABLE signup_bonus_history DISABLE ROW LEVEL SECURITY;

   -- Test signup

   -- Re-enable RLS
   ALTER TABLE signup_bonus_history ENABLE ROW LEVEL SECURITY;
   ```

4. **Check auth.ts is running**:
   - Add console.log in signup flow
   - Verify email sending code is reached
   - Check browser network tab for API calls

---

## Email Template Updated

The welcome email now says:
- **Subject**: "Welcome to LavLay! 100 Points Awarded 🎉"
- **Header**: "Welcome to LavLay, [Name]! Your account has been created successfully"
- **Bonus Display**: Green gradient box with "✅ Points Awarded"
- **Content**: Explains what they can do with points
- **CTA**: "Start Exploring" button

This is a proper welcome email that mentions the points being awarded, not just a bonus notification.
