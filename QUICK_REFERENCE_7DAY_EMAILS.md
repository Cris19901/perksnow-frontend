# 7-Day Email System - Quick Reference Card

## 🚀 30-Minute Quick Deploy

### Step 1: Database (5 min)
```sql
-- In Supabase SQL Editor, run:
-- File: 7_DAY_ONBOARDING_MIGRATION.sql
```

### Step 2: Edge Function (10 min)
```bash
npx supabase login
npx supabase link --project-ref kswknblwjlkgxgvypkmo
npx supabase functions deploy process-scheduled-emails
```

### Step 3: Cron Job (10 min)
- Go to https://upstash.com/
- Create schedule: Every hour (0 * * * *)
- URL: `https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/process-scheduled-emails`
- Header: `Authorization: Bearer YOUR_ANON_KEY`

### Step 4: Test (5 min)
```sql
-- Create test user
INSERT INTO users (id, email, username, full_name, points_balance)
VALUES (gen_random_uuid(), 'test@example.com', 'testuser', 'Test User', 100);

-- Check scheduled emails
SELECT email_type, scheduled_for, status
FROM scheduled_emails
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com');
```

---

## 📧 Email Schedule

| Day | Subject | Goal | CTA |
|-----|---------|------|-----|
| 0 | Welcome to LavLay! | Welcome | Start Exploring |
| 1 | Complete your profile 🎨 | Profile completion | Complete Profile |
| 2 | Create your first post 📸 | First post | Create Post |
| 3 | Find your community 👥 | Follow users | Discover People |
| 4 | Shop amazing products 🛍️ | Visit marketplace | Browse Shop |
| 5 | Go viral with Reels 🎥 | Upload reel | Upload Reel |
| 6 | Point system guide 💰 | Engagement | View Dashboard |
| 7 | Upgrade to Pro 👑 | Convert to Pro | Upgrade Now |

---

## 📊 Key Admin Queries

### System Overview
```sql
SELECT * FROM email_system_stats;
```

### Recent Activity
```sql
SELECT email_type, status, sent_at, email_address
FROM email_logs
ORDER BY sent_at DESC
LIMIT 10;
```

### Failures
```sql
SELECT email_type, error_message, COUNT(*)
FROM scheduled_emails
WHERE status = 'failed'
GROUP BY email_type, error_message;
```

### Performance
```sql
SELECT
  email_type,
  COUNT(*) as sent,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'opened') / COUNT(*), 2) as open_rate
FROM email_logs
WHERE sent_at >= now() - INTERVAL '7 days'
GROUP BY email_type;
```

---

## 🔧 Common Operations

### Unsubscribe User
```sql
SELECT unsubscribe_user_emails('user_id', 'onboarding');
```

### Cancel Specific Email
```sql
SELECT cancel_scheduled_email('user_id', 'day_3');
```

### Force Send Email Now (Testing)
```sql
UPDATE scheduled_emails
SET scheduled_for = now()
WHERE user_id = 'user_id' AND email_type = 'day_1';
```

### Clean Duplicates
```sql
DELETE FROM scheduled_emails
WHERE id NOT IN (
  SELECT MIN(id) FROM scheduled_emails
  GROUP BY user_id, email_type
);
```

---

## 📁 File Locations

- **Migration**: `7_DAY_ONBOARDING_MIGRATION.sql`
- **Edge Function**: `supabase/functions/process-scheduled-emails/index.ts`
- **Templates**: `supabase/functions/process-scheduled-emails/templates.ts`
- **Deploy Guide**: `DEPLOY_7DAY_EMAIL_SYSTEM.md`
- **Summary**: `7DAY_EMAIL_SYSTEM_SUMMARY.md`

---

## 🎯 Success Targets

- ✅ 80%+ delivery rate
- ✅ 30%+ open rate
- ✅ 10%+ CTR
- ✅ <2% unsubscribe

---

## 🆘 Troubleshooting

**Emails not sending?**
1. Check cron job running
2. Verify `RESEND_API_KEY` set
3. Check Edge Function logs

**In spam?**
1. Add SPF: `v=spf1 include:_spf.resend.com ~all`
2. Verify DKIM in Resend dashboard

**Wrong timing?**
```sql
-- Adjust schedule
UPDATE scheduled_emails
SET scheduled_for = created_at + INTERVAL 'X hours'
WHERE email_type = 'day_X';
```

---

## 🔗 Quick Links

- **Supabase**: https://app.supabase.com/project/kswknblwjlkgxgvypkmo
- **Functions**: https://app.supabase.com/project/kswknblwjlkgxgvypkmo/functions
- **SQL Editor**: https://app.supabase.com/project/kswknblwjlkgxgvypkmo/sql
- **Resend**: https://resend.com/domains/lavlay.com

---

**Print this for quick reference during deployment!** 🖨️
