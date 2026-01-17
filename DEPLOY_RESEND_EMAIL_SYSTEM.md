# Deploy Resend Email System - Complete Guide

This guide will walk you through deploying the email system for LavLay using Resend and Supabase Edge Functions.

## ✅ What's Already Done

1. ✅ Resend Edge Function created at `supabase/functions/send-email/index.ts`
2. ✅ Frontend email sending code in `src/lib/auth.ts`
3. ✅ Signup bonus database trigger fixed to use `points_balance` column
4. ✅ Post creation points system fixed (no duplicate points)

## 📋 What You Need To Do

### Step 1: Get Your Resend API Key

1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Click "Create API Key"
3. Give it a name like "LavLay Production"
4. Copy the API key (starts with `re_`)
5. **Save it somewhere safe** - you won't be able to see it again!

### Step 2: Deploy the Edge Function

You have two options:

#### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Install Supabase CLI if you haven't already
npm install -g supabase

# 2. Login to Supabase
npx supabase login

# 3. Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# 4. Set the Resend API key as a secret
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here

# 5. Deploy the function
npx supabase functions deploy send-email
```

#### Option B: Using Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Edge Functions** in the left sidebar
4. Click **Deploy new function**
5. Choose **Import from GitHub** or **Upload files**
6. Upload the `supabase/functions/send-email/index.ts` file
7. Click **Deploy**

### Step 3: Configure Resend API Key in Supabase

#### Using Dashboard:

1. In Supabase Dashboard, go to **Project Settings** → **Edge Functions**
2. Scroll to **Secrets**
3. Click **Add new secret**
4. Name: `RESEND_API_KEY`
5. Value: `re_your_api_key_here` (paste your Resend API key)
6. Click **Save**

#### Using CLI:

```bash
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Step 4: Update the Edge Function URL in Frontend

1. After deploying, Supabase will give you a function URL like:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email
   ```

2. Open [src/lib/auth.ts](src/lib/auth.ts)

3. Find the `sendWelcomeEmail` function (around line 120)

4. Update the URL to match your deployed function:
   ```typescript
   const response = await fetch(
     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-email',
     {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
       },
       body: JSON.stringify({
         to: email,
         subject: subject,
         html: htmlContent,
       }),
     }
   );
   ```

### Step 5: Run the Signup Bonus Fix

This ensures new users get their signup bonus correctly:

```sql
-- Run this in Supabase SQL Editor
-- File: FIX_SIGNUP_BONUS_POINTS_BALANCE.sql
```

Copy and paste the contents of `FIX_SIGNUP_BONUS_POINTS_BALANCE.sql` into the Supabase SQL Editor and run it.

### Step 6: Verify Email Domain (Optional but Recommended)

For production use, you should verify your domain with Resend:

1. Go to [Resend Domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `lavlay.com`)
4. Follow the instructions to add DNS records
5. Wait for verification (usually takes a few minutes)
6. Once verified, update the Edge Function:

   Edit `supabase/functions/send-email/index.ts` line 62:
   ```typescript
   from: from || 'LavLay <noreply@lavlay.com>',
   ```
   Then redeploy the function.

### Step 7: Test the System

#### Test 1: Signup Bonus

1. Create a new user account
2. Check the browser console for logs:
   ```
   ✅ Signup successful
   📧 Sending welcome email to: user@example.com
   ✅ Welcome email sent successfully
   ```
3. Check the user's `points_balance` in Supabase:
   ```sql
   SELECT email, points_balance FROM users WHERE email = 'user@example.com';
   ```
   Should show 100 points.

4. Check `signup_bonus_history`:
   ```sql
   SELECT * FROM signup_bonus_history WHERE user_id IN (
     SELECT id FROM users WHERE email = 'user@example.com'
   );
   ```

#### Test 2: Welcome Email

1. Check your email inbox (might be in spam folder)
2. You should receive a welcome email from LavLay
3. If using Resend's test domain (`onboarding@resend.dev`), emails may be rate-limited

#### Test 3: Post Creation Points

1. Create a new post
2. Check console - should show points awarded
3. Verify in database:
   ```sql
   SELECT * FROM points_transactions WHERE activity = 'post_created'
   ORDER BY created_at DESC LIMIT 5;
   ```
4. Should only see ONE entry per post (no duplicates)

## 🔍 Troubleshooting

### Issue: Email not sending

**Check 1: Edge Function logs**
```bash
npx supabase functions logs send-email
```

**Check 2: Browser console**
Look for error messages starting with `❌ Failed to send welcome email`

**Check 3: Resend API key**
Make sure the secret is set correctly:
```bash
npx supabase secrets list
```

### Issue: Signup bonus not awarded

**Check 1: Run verification**
```sql
-- Run VERIFY_SIGNUP_BONUS_SYSTEM.sql
```

**Check 2: Check trigger exists**
```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger';
```

**Check 3: Check function exists**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus';
```

### Issue: Duplicate points on post creation

**Fix:** Run `FIX_DUPLICATE_POINTS.sql` to remove duplicate triggers

### Issue: CORS errors

The Edge Function already has CORS headers configured. If you still see errors:

1. Check that the function URL in `auth.ts` matches your deployed function
2. Verify you're sending the `Authorization` header with the request
3. Check Supabase project settings → API → Allowed origins

## 📊 Monitoring

### Check Email Sending Stats

**In Resend Dashboard:**
- Go to [Resend Logs](https://resend.com/logs)
- See all sent emails, delivery status, and bounces

**In Your Database:**
```sql
-- Emails pending to be sent
SELECT COUNT(*) FROM signup_bonus_history WHERE email_sent = false;

-- Total signup bonuses awarded
SELECT COUNT(*), SUM(bonus_amount) FROM signup_bonus_history;

-- Recent signups with bonus status
SELECT
  u.email,
  u.points_balance,
  sbh.bonus_amount,
  sbh.email_sent,
  u.created_at
FROM users u
LEFT JOIN signup_bonus_history sbh ON sbh.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;
```

## 🎯 Quick Command Reference

```bash
# Deploy Edge Function
npx supabase functions deploy send-email

# Set API key
npx supabase secrets set RESEND_API_KEY=re_your_key

# View function logs
npx supabase functions logs send-email --follow

# List secrets
npx supabase secrets list

# Test function locally
npx supabase functions serve send-email
```

## ✅ Success Checklist

- [ ] Resend API key obtained
- [ ] Edge Function deployed
- [ ] RESEND_API_KEY secret configured in Supabase
- [ ] Frontend auth.ts updated with correct function URL
- [ ] FIX_SIGNUP_BONUS_POINTS_BALANCE.sql executed
- [ ] Test signup completed successfully
- [ ] Test user received 100 points
- [ ] Test user received welcome email
- [ ] Test post creation awarded points (no duplicates)
- [ ] (Optional) Custom domain verified in Resend

## 🎉 You're Done!

Once all items are checked, your email system is fully operational. New users will:

1. Receive 100 points signup bonus automatically
2. Get a welcome email with their bonus information
3. Earn points for creating posts (10 points per post)
4. Have all their point transactions tracked in the database

For any issues, check the troubleshooting section or review the Edge Function logs.
