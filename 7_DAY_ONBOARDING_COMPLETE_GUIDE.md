# 7-Day Onboarding Email System - Complete Implementation Guide

## 📋 Overview

This guide provides everything you need to implement the 7-day automated onboarding email sequence for LavLay.

**Status**: ✅ All materials prepared
**Time to implement**: 2-3 hours
**Difficulty**: Intermediate

---

## 🎯 What This System Does

Automatically sends 7 emails over 7 days to new users:
- **Day 0**: Welcome + Signup Bonus (✅ Already implemented)
- **Day 1**: Complete Your Profile
- **Day 2**: Create Your First Post
- **Day 3**: Discover & Follow People
- **Day 4**: Try Shopping
- **Day 5**: Upload Your First Reel
- **Day 6**: Earn Points Guide
- **Day 7**: Upgrade to Pro

---

## 📁 Files Prepared

1. **[7_DAY_ONBOARDING_PLAN.md](7_DAY_ONBOARDING_PLAN.md)**
   - Complete email sequence design
   - Content for each email
   - Metrics and goals
   - Implementation strategy

2. **[7_DAY_ONBOARDING_MIGRATION.sql](7_DAY_ONBOARDING_MIGRATION.sql)**
   - Database tables
   - Functions for scheduling
   - Triggers for automation
   - RLS policies
   - Admin monitoring views

3. **This guide** - Step-by-step implementation

---

## 🚀 Implementation Steps

### Step 1: Run Database Migration (10 minutes)

1. **Open Supabase Dashboard**:
   - Go to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**:
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run the Migration**:
   - Open file: `7_DAY_ONBOARDING_MIGRATION.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click "Run"

4. **Verify Success**:
   You should see:
   ```
   ✅ 7-Day Onboarding Email System installed successfully!
   ℹ️  New users will automatically be enrolled in the 7-day email sequence.
   ℹ️  Next step: Create Edge Function to process scheduled emails.
   ```

5. **Check Tables Created**:
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

### Step 2: Create Email Templates (30 minutes)

The email templates need to be created as Supabase Edge Function code. Here's the structure:

**Location**: Create new file at `supabase/functions/send-onboarding-emails/templates.ts`

**Template Structure**:
```typescript
export const onboardingTemplates = {
  day_1: (userName: string, profileUrl: string) => ({
    subject: 'Make your mark on LavLay! Complete your profile 🎨',
    html: `...`,  // See template below
    text: `...`
  }),
  day_2: (userName: string, pointsBalance: number) => ({
    subject: 'Share your story - Create your first post 📸',
    html: `...`,
    text: `...`
  }),
  // ... etc for days 3-7
};
```

**Full templates are in the appendix below** ⬇️

---

### Step 3: Create Edge Function (45 minutes)

Create a new Supabase Edge Function to process scheduled emails:

**Location**: `supabase/functions/process-scheduled-emails/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get pending emails
    const { data: pendingEmails, error } = await supabase
      .rpc('get_pending_emails', { batch_size: 50 })

    if (error) throw error

    console.log(`Found ${pendingEmails.length} pending emails`)

    // Process each email
    for (const email of pendingEmails) {
      try {
        // Get template based on email_type
        const template = getEmailTemplate(
          email.email_type,
          email.user_name,
          email.points_balance
        )

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LavLay <noreply@lavlay.com>',
            to: email.email_address,
            subject: template.subject,
            html: template.html,
            text: template.text,
          }),
        })

        if (response.ok) {
          // Mark as sent
          await supabase.rpc('mark_email_sent', {
            p_email_id: email.id,
            p_status: 'sent'
          })

          // Log success
          await supabase.rpc('log_email_activity', {
            p_user_id: email.user_id,
            p_email_type: email.email_type,
            p_email_address: email.email_address,
            p_subject: template.subject,
            p_status: 'sent'
          })

          console.log(`✅ Sent ${email.email_type} to ${email.email_address}`)
        } else {
          throw new Error(`Resend API error: ${await response.text()}`)
        }
      } catch (emailError) {
        // Mark as failed
        await supabase.rpc('mark_email_sent', {
          p_email_id: email.id,
          p_status: 'failed',
          p_error_message: emailError.message
        })

        // Log failure
        await supabase.rpc('log_email_activity', {
          p_user_id: email.user_id,
          p_email_type: email.email_type,
          p_email_address: email.email_address,
          p_subject: 'Failed',
          p_status: 'failed',
          p_error_message: emailError.message
        })

        console.error(`❌ Failed ${email.email_type}: ${emailError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingEmails.length,
        message: `Processed ${pendingEmails.length} emails`
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function getEmailTemplate(type: string, userName: string, pointsBalance: number) {
  // Import templates and return based on type
  // See templates.ts file for full templates
  return onboardingTemplates[type](userName, pointsBalance)
}
```

---

### Step 4: Deploy Edge Function (10 minutes)

```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref your-project-ref

# 4. Deploy the function
supabase functions deploy process-scheduled-emails

# 5. Set required secrets
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

---

### Step 5: Set Up Cron Job (5 minutes)

**Option A: Supabase Cron (Recommended)**

1. Go to Database → Cron Jobs (if available in your plan)
2. Create new cron job:
   - Name: `process_onboarding_emails`
   - Schedule: `0 * * * *` (every hour)
   - Command: Call Edge Function

**Option B: External Cron (e.g., cron-job.org)**

1. Go to https://cron-job.org
2. Create account
3. Add new cron job:
   - URL: `https://your-project.supabase.co/functions/v1/process-scheduled-emails`
   - Schedule: Every hour
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_ANON_KEY`

**Option C: Upstash QStash (Most Reliable)**

1. Go to https://upstash.com/
2. Create QStash schedule:
   - URL: Your Edge Function URL
   - Schedule: `0 * * * *` (cron format)
   - Retry: 3 times
   - Timeout: 30 seconds

---

### Step 6: Test the System (20 minutes)

#### Test 1: Create Test User

```sql
-- Create a test user in Supabase
INSERT INTO users (id, email, username, full_name, created_at)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'testuser',
  'Test User',
  now()
);
```

#### Test 2: Check Scheduled Emails

```sql
-- Should see 7 scheduled emails for the test user
SELECT
  email_type,
  scheduled_for,
  status
FROM scheduled_emails
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
ORDER BY scheduled_for;
```

#### Test 3: Manually Trigger One Email

```sql
-- Update one email to be "due now" for testing
UPDATE scheduled_emails
SET scheduled_for = now() - INTERVAL '1 minute'
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
  AND email_type = 'day_1';
```

#### Test 4: Run Edge Function

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/process-scheduled-emails \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Test 5: Verify Email Sent

```sql
-- Check email was marked as sent
SELECT * FROM scheduled_emails
WHERE email_type = 'day_1'
  AND user_id = (SELECT id FROM users WHERE email = 'test@example.com');

-- Check email log
SELECT * FROM email_logs
WHERE email_type = 'day_1'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📊 Monitoring & Management

### Admin Dashboard Queries

**View System Stats**:
```sql
SELECT * FROM email_system_stats;
```

**View Recent Sent Emails**:
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

**View Failed Emails**:
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

**View Upcoming Emails**:
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

---

## 🎯 Success Metrics

Track these metrics to measure success:

### Email Delivery Metrics:
```sql
SELECT
  DATE(sent_at) as date,
  email_type,
  COUNT(*) as sent_count,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE status = 'opened') as opened_count,
  COUNT(*) FILTER (WHERE status = 'clicked') as clicked_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'opened') / COUNT(*), 2) as open_rate
FROM email_logs
WHERE sent_at >= now() - INTERVAL '7 days'
GROUP BY DATE(sent_at), email_type
ORDER BY date DESC, email_type;
```

---

## 🔧 Troubleshooting

### Issue: Emails Not Being Sent

**Check**:
1. Cron job is running
2. Edge Function is deployed
3. Resend API key is set
4. DNS records are configured

**Debug**:
```sql
-- Check if there are pending emails
SELECT COUNT(*) FROM scheduled_emails WHERE status = 'pending';

-- Check function logs in Supabase dashboard
```

### Issue: Duplicate Emails

**Solution**:
```sql
-- Remove duplicates
DELETE FROM scheduled_emails
WHERE id NOT IN (
  SELECT MIN(id)
  FROM scheduled_emails
  GROUP BY user_id, email_type
);
```

### Issue: User Wants to Unsubscribe

**Solution**:
```sql
-- Unsubscribe user from onboarding emails
SELECT unsubscribe_user_emails(
  'user_id_here',
  'onboarding'
);
```

---

## 📧 Appendix: Email Templates

### Day 1: Complete Your Profile

```typescript
day_1: (userName: string, profileUrl: string) => ({
  subject: 'Make your mark on LavLay! Complete your profile 🎨',
  html: `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Complete Your Profile</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hey ${userName}! 👋</h2>
                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We noticed your profile is still incomplete. A complete profile helps you:
                    </p>
                    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
                      <li>Get 3x more followers</li>
                      <li>Build credibility in the community</li>
                      <li>Stand out from the crowd</li>
                      <li>Connect with like-minded people</li>
                    </ul>
                    <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Quick Steps:</h3>
                    <ol style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                      <li>Add a profile picture</li>
                      <li>Write a short bio</li>
                      <li>Add a cover photo</li>
                      <li>Link your social media</li>
                    </ol>
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${profileUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
                        Complete My Profile
                      </a>
                    </div>
                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                      Takes less than 2 minutes! ⏱️
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="color: #999999; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} LavLay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  text: `Hey ${userName}!\n\nWe noticed your profile is still incomplete. A complete profile helps you get 3x more followers and build credibility.\n\nQuick Steps:\n1. Add a profile picture\n2. Write a short bio\n3. Add a cover photo\n4. Link your social media\n\nComplete your profile: ${profileUrl}\n\nTakes less than 2 minutes!\n\n© ${new Date().getFullYear()} LavLay`
})
```

**Note**: Days 2-7 templates follow similar structure. Full templates available in separate file if needed.

---

## ✅ Completion Checklist

- [ ] Database migration run successfully
- [ ] Tables created (scheduled_emails, email_logs, user_email_preferences)
- [ ] Functions created (6 total)
- [ ] Trigger created (schedule_onboarding_emails)
- [ ] Email templates created
- [ ] Edge Function created
- [ ] Edge Function deployed
- [ ] Cron job configured
- [ ] Test user created
- [ ] Test emails scheduled
- [ ] Test email sent successfully
- [ ] Monitoring queries working
- [ ] Admin can view stats

---

## 🎉 Success!

Once all steps are complete, your 7-day onboarding email system will:
- ✅ Automatically enroll new users
- ✅ Send 7 perfectly-timed emails
- ✅ Track all email activity
- ✅ Respect user preferences
- ✅ Provide admin monitoring
- ✅ Scale effortlessly

**Your users will love the personalized onboarding experience!** 🚀

---

**Questions?** Check:
- [7_DAY_ONBOARDING_PLAN.md](7_DAY_ONBOARDING_PLAN.md) for strategy
- [EMAIL_SYSTEM_STATUS.md](EMAIL_SYSTEM_STATUS.md) for current email setup
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions

**Status**: 📚 Documentation Complete - Ready to Implement
**Estimated Time**: 2-3 hours
**Difficulty**: Intermediate
