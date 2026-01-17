# Deploy 7-Day Onboarding Email System

## 🚀 Quick Start Deployment Guide

This guide will help you deploy the complete 7-day onboarding email system in **under 30 minutes**.

---

## ✅ Prerequisites

- [x] Supabase project created
- [x] Resend account created
- [x] Domain verified in Resend (lavlay.com)
- [x] Supabase CLI installed

---

## 📋 Step-by-Step Deployment

### Step 1: Run Database Migration (5 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your LavLay project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Migration**
   - Open file: `7_DAY_ONBOARDING_MIGRATION.sql`
   - Copy ALL contents (lines 1-410)
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Success**
   You should see:
   ```
   ✅ 7-Day Onboarding Email System installed successfully!
   ℹ️  New users will automatically be enrolled in the 7-day email sequence.
   ℹ️  Next step: Create Edge Function to process scheduled emails.
   ```

5. **Double-check Tables Created**
   Run this query:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name IN (
     'scheduled_emails',
     'email_logs',
     'user_email_preferences'
   );
   ```
   Should return 3 rows.

---

### Step 2: Deploy Edge Function (10 minutes)

1. **Login to Supabase CLI**
   ```bash
   npx supabase login
   ```

2. **Link Your Project**
   ```bash
   npx supabase link --project-ref kswknblwjlkgxgvypkmo
   ```

3. **Deploy the Function**
   ```bash
   npx supabase functions deploy process-scheduled-emails
   ```

4. **Set Environment Variables**
   The function needs these secrets (they should already be set):
   ```bash
   # Check if secrets exist
   npx supabase secrets list

   # If RESEND_API_KEY is not set, add it:
   npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
   ```

5. **Test the Function**
   ```bash
   curl -X POST \
     https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/process-scheduled-emails \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

   Expected response:
   ```json
   {
     "success": true,
     "processed": 0,
     "message": "No pending emails"
   }
   ```

---

### Step 3: Set Up Cron Job (10 minutes)

You have 3 options. Choose ONE:

#### Option A: Upstash QStash (Recommended - Most Reliable)

1. **Sign up for Upstash**
   - Go to: https://upstash.com/
   - Create free account
   - Go to QStash

2. **Create Schedule**
   - Click "Schedules" → "Create Schedule"
   - **URL**: `https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/process-scheduled-emails`
   - **Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - **Cron**: `0 * * * *` (every hour)
   - **Retries**: 3
   - Click "Create"

3. **Test the Schedule**
   - Click "Run Now" to test
   - Check logs for success

#### Option B: Cron-job.org (Free Alternative)

1. **Sign up**
   - Go to: https://cron-job.org
   - Create free account

2. **Create Cron Job**
   - Click "Create Cronjob"
   - **Title**: Process LavLay Onboarding Emails
   - **Address**: `https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/process-scheduled-emails`
   - **Schedule**: Every hour (0 * * * *)
   - **Request Method**: POST
   - **Headers**:
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - Click "Create"

#### Option C: Supabase pg_cron (If Available)

If your Supabase plan includes pg_cron:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to call Edge Function every hour
SELECT cron.schedule(
  'process-onboarding-emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/process-scheduled-emails',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

---

### Step 4: Test the Complete System (5 minutes)

1. **Create a Test User**
   In Supabase SQL Editor:
   ```sql
   -- Create test user
   INSERT INTO users (id, email, username, full_name, points_balance, created_at)
   VALUES (
     gen_random_uuid(),
     'test@example.com',  -- Change to your email
     'testuser',
     'Test User',
     100,
     now()
   )
   RETURNING id, email;
   ```

2. **Check Scheduled Emails**
   ```sql
   -- Should see 7 emails scheduled for test user
   SELECT
     email_type,
     scheduled_for,
     status
   FROM scheduled_emails
   WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
   ORDER BY scheduled_for;
   ```

   You should see:
   - day_1 (scheduled for 24 hours from now)
   - day_2 (scheduled for 48 hours from now)
   - day_3 (scheduled for 72 hours from now)
   - day_4 (scheduled for 96 hours from now)
   - day_5 (scheduled for 120 hours from now)
   - day_6 (scheduled for 144 hours from now)
   - day_7 (scheduled for 168 hours from now)

3. **Force Send One Email (For Testing)**
   ```sql
   -- Make day_1 email due now
   UPDATE scheduled_emails
   SET scheduled_for = now() - INTERVAL '1 minute'
   WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
     AND email_type = 'day_1';
   ```

4. **Manually Trigger Email Processor**
   ```bash
   curl -X POST \
     https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/process-scheduled-emails \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

5. **Verify Email Was Sent**
   ```sql
   -- Check if email was marked as sent
   SELECT
     email_type,
     status,
     sent_at,
     error_message
   FROM scheduled_emails
   WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
     AND email_type = 'day_1';

   -- Check email log
   SELECT * FROM email_logs
   WHERE email_type = 'day_1'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

6. **Check Your Email**
   - Look in your inbox for "Make your mark on LavLay! Complete your profile 🎨"
   - If not in inbox, check spam folder

---

## 🎯 What Happens Now?

### Automatic Enrollment
- ✅ Every new user signup triggers `schedule_onboarding_emails()`
- ✅ 7 emails are scheduled automatically
- ✅ User preferences are created (can unsubscribe anytime)

### Email Processing
- ✅ Cron job runs every hour
- ✅ Checks for emails due to send
- ✅ Sends via Resend API
- ✅ Logs results in `email_logs`
- ✅ Updates status in `scheduled_emails`

### User Preferences
Users can manage their email preferences at:
`https://lavlay.com/settings/email-preferences` (when you build this page)

---

## 📊 Monitoring & Admin Queries

### View System Stats
```sql
SELECT * FROM email_system_stats;
```

### View Recent Sent Emails
```sql
SELECT
  el.email_type,
  el.email_address,
  el.status,
  el.sent_at,
  u.username
FROM email_logs el
JOIN users u ON el.user_id = u.id
ORDER BY el.sent_at DESC
LIMIT 20;
```

### View Failed Emails
```sql
SELECT
  se.email_type,
  u.email,
  se.error_message,
  se.retry_count,
  se.scheduled_for
FROM scheduled_emails se
JOIN users u ON se.user_id = u.id
WHERE se.status = 'failed'
ORDER BY se.scheduled_for DESC;
```

### View Upcoming Emails
```sql
SELECT
  se.email_type,
  COUNT(*) as count,
  MIN(se.scheduled_for) as next_send
FROM scheduled_emails se
WHERE se.status = 'pending'
GROUP BY se.email_type
ORDER BY next_send;
```

### Email Performance Metrics
```sql
SELECT
  email_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'opened') as opens,
  COUNT(*) FILTER (WHERE status = 'clicked') as clicks,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'opened') / COUNT(*), 2) as open_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'clicked') / COUNT(*), 2) as click_rate
FROM email_logs
WHERE sent_at >= now() - INTERVAL '30 days'
GROUP BY email_type
ORDER BY email_type;
```

---

## 🔧 Troubleshooting

### Issue: Emails Not Being Sent

**Check 1: Cron Job Running?**
- Visit your cron service dashboard
- Check last run time
- Check for errors

**Check 2: Edge Function Deployed?**
```bash
npx supabase functions list
```
Should show `process-scheduled-emails`

**Check 3: Pending Emails Exist?**
```sql
SELECT COUNT(*) FROM scheduled_emails
WHERE status = 'pending'
  AND scheduled_for <= now();
```

**Check 4: Environment Variables Set?**
```bash
npx supabase secrets list
```
Should show `RESEND_API_KEY`

**Check 5: Edge Function Logs**
- Go to Supabase Dashboard
- Edge Functions → process-scheduled-emails → Logs
- Check for errors

### Issue: Emails Going to Spam

**Solution: Update SPF Record**
Ensure your DNS has:
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.resend.com ~all
```

**Check DKIM**
- Go to Resend dashboard
- Check domain verification status
- Ensure all DNS records are verified

### Issue: Duplicate Emails

**Solution: Clean Up Duplicates**
```sql
DELETE FROM scheduled_emails
WHERE id NOT IN (
  SELECT MIN(id)
  FROM scheduled_emails
  GROUP BY user_id, email_type
);
```

### Issue: User Wants to Unsubscribe

**Solution: Unsubscribe User**
```sql
-- Unsubscribe from all onboarding emails
SELECT unsubscribe_user_emails(
  'user_id_here',
  'onboarding'
);

-- Or unsubscribe from all emails
SELECT unsubscribe_user_emails(
  'user_id_here',
  'all'
);
```

---

## 📈 Success Metrics to Track

### Week 1 Goals
- [ ] 80%+ email delivery rate
- [ ] 25%+ open rate
- [ ] 5%+ click-through rate
- [ ] <2% unsubscribe rate

### Week 2 Goals
- [ ] 30%+ open rate
- [ ] 10%+ click-through rate
- [ ] User feedback collected

### Week 3 Goals
- [ ] A/B test subject lines
- [ ] Optimize send times
- [ ] Improve template content

---

## 🎉 Deployment Checklist

- [ ] Database migration run successfully
- [ ] 3 tables created (scheduled_emails, email_logs, user_email_preferences)
- [ ] 6 functions created and working
- [ ] Trigger created (schedule_onboarding_emails)
- [ ] Edge Function deployed
- [ ] Environment variables set (RESEND_API_KEY)
- [ ] Cron job configured and running
- [ ] Test user created
- [ ] Test emails scheduled
- [ ] Test email sent successfully
- [ ] Test email received in inbox
- [ ] Monitoring queries working
- [ ] Admin can view stats

---

## 🔗 Quick Links

- **Supabase Dashboard**: https://app.supabase.com/project/kswknblwjlkgxgvypkmo
- **Edge Functions**: https://app.supabase.com/project/kswknblwjlkgxgvypkmo/functions
- **SQL Editor**: https://app.supabase.com/project/kswknblwjlkgxgvypkmo/sql
- **Resend Dashboard**: https://resend.com/domains/lavlay.com
- **Email Logs**: https://resend.com/emails

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Edge Function logs in Supabase
3. Check Resend email logs
4. Verify DNS records are propagated

---

**Status**: 📦 Ready to Deploy
**Estimated Time**: 30 minutes
**Difficulty**: Easy (Step-by-step guide provided)

✨ **Once deployed, your users will receive perfectly-timed onboarding emails that guide them through LavLay's key features!** 🚀
