# Quick Start: Fix Signup Bonus & Welcome Email

## Problem
- Signup bonus not being awarded
- Welcome email not being sent

## Solution (2 Steps)

### Step 1: Run the Complete Fix SQL

In Supabase SQL Editor, run:

```sql
-- File: COMPLETE_FIX_SIGNUP_BONUS_AND_EMAIL.sql
```

This script will:
- ✅ Create/verify all required tables
- ✅ Set up the trigger to award bonuses
- ✅ Award 100 points to ALL existing users who don't have bonuses yet
- ✅ Enable the system
- ✅ Show diagnostic information

### Step 2: Test Signup

1. **Open browser console** (F12 → Console tab)
2. **Create a new account** with a real email address
3. **Watch the console logs**:

**Expected logs (SUCCESS)**:
```
🔍 [SIGNUP] Waiting for database triggers...
🔍 [SIGNUP] Checking for signup bonus...
🔍 [SIGNUP] Bonus query result: { bonusData: { bonus_amount: 100, email_sent: false }, bonusError: null }
📧 [SIGNUP] Bonus found: 100 points. Sending welcome email...
✅ [SIGNUP] Welcome email sent successfully
✅ [SIGNUP] Email marked as sent in database
```

**What this means**:
- ✅ Bonus system is working
- ✅ 100 points were awarded
- ✅ Welcome email was sent
- ✅ Email marked as sent

4. **Check your email** (might take 30-60 seconds)
   - Subject: "Welcome to LavLay! 100 Points Awarded 🎉"
   - Content: Beautiful branded email with points info

---

## If It's Still Not Working

### Issue 1: No Bonus Found

**Console shows**:
```
⚠️ [SIGNUP] No signup bonus found for this user
💡 [SIGNUP] To enable signup bonuses, run: COMPLETE_FIX_SIGNUP_BONUS_AND_EMAIL.sql
```

**Solution**: The SQL script didn't run successfully. Check:

```sql
-- Verify tables exist
SELECT * FROM signup_bonus_settings;
SELECT * FROM signup_bonus_history LIMIT 5;

-- If tables don't exist, the script failed
-- Run it again and check for errors
```

### Issue 2: Email Failed to Send

**Console shows**:
```
❌ [SIGNUP] Failed to send welcome email: [error message]
```

**Common causes**:

**A) Resend API Key Missing**
```
Error: Resend API key not configured
```

Solution: Add to `.env`:
```
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**B) Edge Function Not Deployed**
```
Error: Failed to invoke function
```

Solution:
```bash
supabase functions deploy send-email
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**C) Invalid Email Address**
```
Error: Invalid 'to' address
```

Solution: Use a real email address when testing

### Issue 3: Trigger Not Firing

**Console shows**:
```
🔍 [SIGNUP] Bonus query result: { bonusData: null, bonusError: null }
```

**Solution**: Trigger isn't firing. Verify:

```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger';

-- If missing, run the complete fix script again
```

---

## Verify Everything is Working

Run this SQL to check system status:

```sql
-- 1. Check settings
SELECT * FROM signup_bonus_settings;
-- Expected: bonus_amount=100, is_enabled=true

-- 2. Check recent users
SELECT
    u.email,
    u.points,
    h.bonus_amount,
    h.email_sent
FROM users u
LEFT JOIN signup_bonus_history h ON h.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;
-- Expected: All users should have points and bonus_amount

-- 3. Check trigger
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger';
-- Expected: 1 row with trigger_name = 'award_signup_bonus_trigger'
```

---

## Manual Test

If you want to manually trigger the bonus for a specific user:

```sql
-- Get user ID
SELECT id, email, points FROM users WHERE email = 'user@example.com';

-- Award bonus manually
DO $$
DECLARE
    v_user_id UUID := 'paste-user-id-here';
    v_bonus_amount INTEGER := 100;
BEGIN
    -- Update points
    UPDATE users
    SET points = COALESCE(points, 0) + v_bonus_amount
    WHERE id = v_user_id;

    -- Record bonus
    INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
    VALUES (v_user_id, v_bonus_amount, false)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Bonus awarded!';
END $$;
```

---

## Summary

✅ **Run**: `COMPLETE_FIX_SIGNUP_BONUS_AND_EMAIL.sql`
✅ **Test**: Create new account with console open
✅ **Verify**: Check console logs and email inbox
✅ **Debug**: Use SQL queries above if issues persist

The detailed logs in the console will tell you exactly what's happening at each step!
