# Onboarding & Email System Setup Guide

This guide explains how to set up the complete onboarding system with automated email sequences for your LavLay application.

## What This System Does

The onboarding system includes:

1. **User Onboarding Flow** - Step-by-step profile completion after signup
2. **Email Templates** - Pre-configured welcome and engagement emails
3. **Email Scheduling** - Automated email sequences over the first 7 days
4. **Progress Tracking** - Track user completion of onboarding steps
5. **Supabase Storage** - Image uploads for profile and cover photos

---

## Part 1: Database Setup

### Run the Migration

Execute `CREATE_ONBOARDING_SYSTEM.sql` in your Supabase SQL Editor.

This creates:
- `user_onboarding_progress` - Tracks completion of onboarding steps
- `email_templates` - Stores email templates with variables
- `scheduled_emails` - Queue of emails to be sent
- Pre-populated email templates for Days 1, 2, 3, 5, and 7

### Verify Installation

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('user_onboarding_progress', 'email_templates', 'scheduled_emails');

-- View email templates
SELECT template_key, template_name, send_delay_hours
FROM email_templates
ORDER BY send_delay_hours;

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN (
  'mark_onboarding_step_complete',
  'get_user_onboarding_progress',
  'schedule_onboarding_emails'
);
```

---

## Part 2: Supabase Storage Setup

### Create Storage Buckets

1. Go to Supabase Dashboard → Storage
2. Create these buckets:
   - `avatars` - For profile pictures
   - `backgrounds` - For cover photos
   - `posts` - For post images (if not already created)

### Set Bucket Policies

For each bucket, add these policies:

**Public Read Access:**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

**Authenticated Upload:**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```

**Users can update their own files:**
```sql
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Users can delete their own files:**
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Repeat for `backgrounds` and `posts` buckets.

---

## Part 3: Frontend Integration

### Add Onboarding Flow to Your App

Update your authentication flow to show onboarding after signup:

```typescript
// Example: In your signup success handler
import { OnboardingFlow } from '@/components/OnboardingFlow';

function SignupPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleSignupSuccess = async () => {
    // After successful signup
    setShowOnboarding(true);

    // Schedule onboarding emails
    await supabase.rpc('schedule_onboarding_emails', {
      p_user_id: user.id
    });
  };

  return (
    <>
      {/* Your signup form */}

      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            // Redirect to feed
            navigate('/feed');
          }}
          onSkip={() => {
            setShowOnboarding(false);
            navigate('/feed');
          }}
        />
      )}
    </>
  );
}
```

### Check Onboarding Status

Add a check in your app to show onboarding for users who haven't completed it:

```typescript
useEffect(() => {
  const checkOnboardingStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (!data?.onboarding_completed) {
      setShowOnboarding(true);
    }
  };

  checkOnboardingStatus();
}, [user]);
```

---

## Part 4: Email Sending Setup

### Option 1: Using Supabase Edge Functions (Recommended)

Create a Supabase Edge Function to send emails:

```typescript
// supabase/functions/send-emails/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get pending emails
    const { data: emails } = await supabase.rpc('get_pending_emails_to_send');

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send each email using Resend
    for (const email of emails) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'LavLay <noreply@lavlay.com>',
            to: email.user_email,
            subject: email.subject,
            html: email.html_body,
            text: email.text_body
          })
        });

        if (res.ok) {
          // Mark as sent
          await supabase.rpc('mark_email_sent', { p_email_id: email.email_id });
        } else {
          // Mark as failed
          const error = await res.text();
          await supabase.rpc('mark_email_failed', {
            p_email_id: email.email_id,
            p_error_message: error
          });
        }
      } catch (err) {
        await supabase.rpc('mark_email_failed', {
          p_email_id: email.email_id,
          p_error_message: err.message
        });
      }
    }

    return new Response(JSON.stringify({ sent: emails.length }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

Deploy the function:
```bash
supabase functions deploy send-emails
```

Set up a cron job to run it every hour:
```bash
# In Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
  'send-scheduled-emails',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-emails',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

### Option 2: Using Your Own Backend

If you have a backend server, create an endpoint that:

1. Calls `get_pending_emails_to_send()` function
2. Sends emails using your email provider (SendGrid, Mailgun, etc.)
3. Calls `mark_email_sent()` or `mark_email_failed()` for each email

Run this as a cron job every hour.

---

## Part 5: Email Templates

### Pre-configured Email Sequence

The system includes these emails:

1. **Day 1 (Immediate):** Welcome email with getting started steps
2. **Day 2 (24 hours):** Profile completion reminder
3. **Day 3 (48 hours):** Engagement tips and points system explanation
4. **Day 5 (96 hours):** Feature highlights and marketplace introduction
5. **Day 7 (144 hours):** Community guidelines and best practices

### Customizing Email Templates

Update templates in the database:

```sql
UPDATE email_templates
SET
  subject = 'Your new subject',
  html_body = '<h1>Your HTML content</h1>',
  text_body = 'Your plain text content'
WHERE template_key = 'onboarding_day1_welcome';
```

### Template Variables

Available variables in all templates:
- `{{user_name}}` - User's full name, username, or email
- `{{app_url}}` - Your app URL (update in the SQL function)

To add more variables, update the template and the `schedule_onboarding_emails()` function.

---

## Part 6: Testing the System

### Test Onboarding Flow

1. Create a new test account
2. The onboarding modal should appear
3. Complete each step:
   - Upload profile picture
   - Upload cover photo (optional)
   - Add bio and location
   - Select interests
4. Verify completion in database:

```sql
SELECT * FROM user_onboarding_progress
WHERE user_id = 'your-test-user-id';

SELECT * FROM users
WHERE id = 'your-test-user-id';
```

### Test Email Scheduling

```sql
-- Schedule emails for a test user
SELECT schedule_onboarding_emails('your-test-user-id');

-- Check scheduled emails
SELECT * FROM scheduled_emails
WHERE user_id = 'your-test-user-id'
ORDER BY scheduled_for;

-- Manually trigger email send (for testing)
UPDATE scheduled_emails
SET scheduled_for = NOW() - INTERVAL '1 hour'
WHERE user_id = 'your-test-user-id'
AND status = 'pending';
```

Then run your email sending function and check if emails are sent.

---

## Part 7: Monitoring

### View Email Status

```sql
-- Get email stats
SELECT
  status,
  COUNT(*) as count
FROM scheduled_emails
GROUP BY status;

-- View failed emails
SELECT
  user_id,
  subject,
  error_message,
  scheduled_for
FROM scheduled_emails
WHERE status = 'failed'
ORDER BY scheduled_for DESC;

-- View pending emails
SELECT
  u.email,
  se.subject,
  se.scheduled_for
FROM scheduled_emails se
JOIN users u ON u.id = se.user_id
WHERE se.status = 'pending'
ORDER BY se.scheduled_for;
```

### Onboarding Completion Rates

```sql
-- Overall completion rate
SELECT
  COUNT(*) FILTER (WHERE onboarding_completed = true) * 100.0 / COUNT(*) as completion_rate
FROM user_onboarding_progress;

-- Average completion percentage
SELECT
  AVG(completion_percentage) as avg_completion
FROM user_onboarding_progress;

-- Step-by-step completion
SELECT
  COUNT(*) FILTER (WHERE profile_picture_added = true) as profile_pic,
  COUNT(*) FILTER (WHERE background_image_added = true) as background,
  COUNT(*) FILTER (WHERE bio_added = true) as bio,
  COUNT(*) FILTER (WHERE location_added = true) as location,
  COUNT(*) FILTER (WHERE interests_added = true) as interests,
  COUNT(*) FILTER (WHERE first_post_created = true) as first_post,
  COUNT(*) FILTER (WHERE first_follow_completed = true) as first_follow
FROM user_onboarding_progress;
```

---

## Part 8: Email Provider Setup

### Using Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Add to Supabase secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=your_api_key
   ```

### Using SendGrid

```typescript
// In your email sending function
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: email.user_email,
  from: 'noreply@lavlay.com',
  subject: email.subject,
  html: email.html_body,
  text: email.text_body
};

await sgMail.send(msg);
```

### Using Mailgun

```typescript
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

await mg.messages.create('your-domain.com', {
  from: 'LavLay <noreply@lavlay.com>',
  to: email.user_email,
  subject: email.subject,
  html: email.html_body,
  text: email.text_body
});
```

---

## Part 9: Advanced Features

### Pause/Resume Email Sequence

```sql
-- Pause all emails for a user
UPDATE scheduled_emails
SET status = 'cancelled'
WHERE user_id = 'user-id'
AND status = 'pending';

-- Resume (reschedule)
UPDATE scheduled_emails
SET
  status = 'pending',
  scheduled_for = NOW() + INTERVAL '1 hour'
WHERE user_id = 'user-id'
AND status = 'cancelled';
```

### Add New Email Template

```sql
INSERT INTO email_templates (
  template_key,
  template_name,
  subject,
  html_body,
  text_body,
  template_variables,
  send_delay_hours,
  category,
  description
)
VALUES (
  'onboarding_day10_retention',
  'Day 10: Still Here?',
  'We miss you, {{user_name}}!',
  '<h1>Come back to LavLay</h1>...',
  'Come back to LavLay...',
  '["user_name", "app_url"]'::jsonb,
  216, -- 9 days
  'onboarding',
  'Retention email sent 9 days after signup'
);
```

### Track Email Opens (Advanced)

Add a tracking pixel to email HTML:

```html
<img src="https://your-api.com/track/{{email_id}}" width="1" height="1" />
```

---

## Troubleshooting

### Onboarding not showing
- Check `onboarding_completed` column in users table
- Verify OnboardingFlow component is imported correctly
- Check browser console for errors

### Emails not sending
- Verify email templates exist: `SELECT * FROM email_templates WHERE is_active = true;`
- Check scheduled emails: `SELECT * FROM scheduled_emails WHERE status = 'pending';`
- Ensure your email sending function is running (cron job or edge function)
- Check email provider API keys are set correctly

### Images not uploading
- Verify storage buckets exist
- Check bucket policies are set correctly
- Ensure file sizes are within limits
- Check browser console for upload errors

### Progress not updating
- Check `mark_onboarding_step_complete()` function is being called
- Verify user_onboarding_progress record exists for user
- Check database triggers are enabled

---

## Best Practices

1. **Test emails with test users** before sending to real users
2. **Monitor email deliverability** - check spam rates
3. **A/B test email subject lines** to improve open rates
4. **Track onboarding metrics** - completion rates, drop-off points
5. **Clean up old scheduled emails** regularly (older than 30 days)
6. **Compress images** before upload to save storage costs
7. **Add unsubscribe links** to emails (legal requirement in many countries)
8. **Personalize emails** using user data where possible

---

## Performance Tips

1. **Run email sending in batches** - process 100 emails at a time
2. **Add database indexes** for frequently queried columns
3. **Use CDN** for email images
4. **Compress uploaded images** using the `compressImage()` utility
5. **Clean up old tracking data** after 30 days

---

## Support

If you encounter issues:
1. Check Supabase logs for errors
2. Verify all environment variables are set
3. Test email provider API separately
4. Check RLS policies aren't blocking operations

---

**Created by:** Claude Code
**Date:** January 1, 2026
**Version:** 1.0

