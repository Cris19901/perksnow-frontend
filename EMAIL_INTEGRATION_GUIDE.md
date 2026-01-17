# 📧 Email Integration Guide - Using Resend

## Why Resend?

- **Modern & Developer-Friendly**: Built specifically for developers
- **Generous Free Tier**: 3,000 emails/month, 100 emails/day
- **React Email Support**: Design emails with React components
- **Great Deliverability**: High inbox placement rates
- **Simple API**: Easy integration with Supabase Edge Functions
- **Affordable Scaling**: $20/month for 50k emails

---

## 🚀 Step 1: Sign Up for Resend

1. Go to [https://resend.com](https://resend.com)
2. Sign up with your email or GitHub
3. Verify your email address
4. Add your domain (or use resend's test domain for development)

---

## 🔑 Step 2: Get Your API Key

1. Go to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Name it (e.g., "LavLay Production")
4. Copy the API key (you won't see it again!)
5. Save it securely

---

## 📬 Step 3: Set Up Domain (Production)

### Option A: Use Your Own Domain (Recommended for Production)
1. In Resend, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `lavlay.com`)
4. Add the DNS records Resend provides to your domain's DNS settings:
   - **SPF** record
   - **DKIM** record
   - **DMARC** record (optional but recommended)
5. Wait for verification (usually 5-10 minutes)

### Option B: Use Resend's Test Domain (For Testing)
- Emails sent from `onboarding@resend.dev`
- Limited to your own email addresses
- Good for development/testing

---

## 🛠️ Step 4: Create Email Templates

Create beautiful email templates using React. Here's the structure:

### 1. Install React Email (optional but recommended)

```bash
npm install react-email @react-email/components
```

### 2. Create Email Templates

Create a folder: `src/emails/templates/`

**Welcome Email** (`src/emails/templates/Welcome.tsx`):

```typescript
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components';

interface WelcomeEmailProps {
  username: string;
  fullName: string;
}

export function WelcomeEmail({ username, fullName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', maxWidth: '600px', margin: '40px auto' }}>
          <Heading style={{ color: '#7c3aed', fontSize: '24px', textAlign: 'center' }}>
            Welcome to LavLay! 🎉
          </Heading>

          <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
            Hi {fullName},
          </Text>

          <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
            We're thrilled to have you join the LavLay community! Your account <strong>@{username}</strong> is now active.
          </Text>

          <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
            Here's what you can do next:
          </Text>

          <ul style={{ fontSize: '16px', lineHeight: '28px', color: '#374151' }}>
            <li>Complete your profile with a photo and bio</li>
            <li>Discover interesting content in your feed</li>
            <li>Follow people you know</li>
            <li>Share your first post or reel</li>
            <li>Start earning points by engaging!</li>
          </ul>

          <Button
            href="https://www.lavlay.com"
            style={{
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              margin: '20px 0'
            }}
          >
            Get Started
          </Button>

          <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0' }} />

          <Text style={{ fontSize: '14px', color: '#6b7280' }}>
            Need help? Reply to this email or visit our support center.
          </Text>

          <Text style={{ fontSize: '14px', color: '#6b7280' }}>
            - The LavLay Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Getting Started Email** (`src/emails/templates/GettingStarted.tsx`):

```typescript
import { Html, Head, Body, Container, Heading, Text, Section } from '@react-email/components';

interface GettingStartedEmailProps {
  username: string;
}

export function GettingStartedEmail({ username }: GettingStartedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f3f4f6', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '40px', maxWidth: '600px', margin: '40px auto' }}>
          <Heading style={{ color: '#7c3aed' }}>
            Getting Started with LavLay
          </Heading>

          <Text>Hi @{username},</Text>

          <Text>
            Here are some tips to make the most of your LavLay experience:
          </Text>

          <Section style={{ marginTop: '20px' }}>
            <Heading as="h3" style={{ fontSize: '18px', color: '#374151' }}>
              💡 Earn Points
            </Heading>
            <Text>
              Engage with content, create posts, and upload reels to earn points. Points can be converted to real money!
            </Text>
          </Section>

          <Section style={{ marginTop: '20px' }}>
            <Heading as="h3" style={{ fontSize: '18px', color: '#374151' }}>
              👥 Build Your Network
            </Heading>
            <Text>
              Follow interesting people and discover content that matters to you.
            </Text>
          </Section>

          <Section style={{ marginTop: '20px' }}>
            <Heading as="h3" style={{ fontSize: '18px', color: '#374151' }}>
              🛍️ Explore the Marketplace
            </Heading>
            <Text>
              Browse products, create your own shop, and start selling!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## ⚡ Step 5: Create Supabase Edge Function

This function will run on a schedule and send pending emails.

### 1. Create the Edge Function

In your terminal (in project root):

```bash
npx supabase functions new send-scheduled-emails
```

### 2. Add the Function Code

Edit `supabase/functions/send-scheduled-emails/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get pending emails that are due
    const { data: emails, error } = await supabase
      .from('scheduled_emails')
      .select(`
        *,
        user:users!user_id (
          username,
          full_name,
          email
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50)

    if (error) throw error

    console.log(`Found ${emails?.length || 0} emails to send`)

    // Send each email
    for (const email of emails || []) {
      try {
        const emailContent = getEmailContent(email.email_type, email.user)

        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'LavLay <noreply@lavlay.com>',
            to: email.user.email,
            subject: emailContent.subject,
            html: emailContent.html
          })
        })

        if (response.ok) {
          // Mark as sent
          await supabase
            .from('scheduled_emails')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', email.id)

          console.log(`✅ Sent ${email.email_type} to ${email.user.email}`)
        } else {
          throw new Error(`Resend API error: ${await response.text()}`)
        }
      } catch (err) {
        console.error(`❌ Failed to send email ${email.id}:`, err)

        // Mark as failed
        await supabase
          .from('scheduled_emails')
          .update({ status: 'failed' })
          .eq('id', email.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: emails?.length || 0
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function getEmailContent(type: string, user: any) {
  const templates = {
    welcome: {
      subject: 'Welcome to LavLay! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff;">
          <h1 style="color: #7c3aed; text-align: center;">Welcome to LavLay! 🎉</h1>
          <p>Hi ${user.full_name},</p>
          <p>We're thrilled to have you join the LavLay community! Your account <strong>@${user.username}</strong> is now active.</p>
          <p>Here's what you can do next:</p>
          <ul>
            <li>Complete your profile with a photo and bio</li>
            <li>Discover interesting content in your feed</li>
            <li>Follow people you know</li>
            <li>Share your first post or reel</li>
            <li>Start earning points by engaging!</li>
          </ul>
          <a href="https://www.lavlay.com" style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Get Started</a>
          <hr style="border-color: #e5e7eb; margin: 32px 0;" />
          <p style="color: #6b7280; font-size: 14px;">- The LavLay Team</p>
        </div>
      `
    },
    getting_started: {
      subject: 'Getting Started with LavLay',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #7c3aed;">Getting Started with LavLay</h1>
          <p>Hi @${user.username},</p>
          <p>Here are some tips to make the most of your LavLay experience:</p>
          <h3>💡 Earn Points</h3>
          <p>Engage with content, create posts, and upload reels to earn points. Points can be converted to real money!</p>
          <h3>👥 Build Your Network</h3>
          <p>Follow interesting people and discover content that matters to you.</p>
        </div>
      `
    },
    community_guidelines: {
      subject: 'LavLay Community Guidelines',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #7c3aed;">Community Guidelines</h1>
          <p>Hi @${user.username},</p>
          <p>To keep LavLay a safe and welcoming space, please follow these guidelines...</p>
        </div>
      `
    },
    feature_highlights: {
      subject: 'Discover LavLay Features',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
          <h1 style="color: #7c3aed;">Discover LavLay Features</h1>
          <p>Hi @${user.username},</p>
          <p>Did you know about these amazing features?</p>
          <ul>
            <li>🎬 Create and share Reels</li>
            <li>🛍️ Set up your own shop</li>
            <li>💰 Earn and withdraw points</li>
          </ul>
        </div>
      `
    }
  }

  return templates[type] || templates.welcome
}
```

### 3. Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings:

```
RESEND_API_KEY=re_your_api_key_here
```

### 4. Deploy the Edge Function

```bash
npx supabase functions deploy send-scheduled-emails
```

---

## ⏰ Step 6: Set Up Cron Job

### Option A: Supabase Cron (Recommended)

In your Supabase dashboard, go to **Database** → **Cron Jobs**:

```sql
-- Run every hour to check for pending emails
SELECT cron.schedule(
  'send-scheduled-emails',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://your-project-ref.supabase.co/functions/v1/send-scheduled-emails',
      headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    )
  $$
);
```

### Option B: Vercel Cron

Create `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/send-emails",
    "schedule": "0 * * * *"
  }]
}
```

---

## 🧪 Step 7: Test Your Setup

### 1. Test Immediately

```sql
-- Manually trigger an email to be sent now
INSERT INTO scheduled_emails (user_id, email_type, scheduled_for, status)
VALUES ('your-user-id', 'welcome', NOW(), 'pending');
```

### 2. Call the Edge Function Manually

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/send-scheduled-emails \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 3. Check Resend Dashboard

- Go to Resend dashboard → **Logs**
- You should see your sent emails

---

## 📊 Monitoring & Analytics

### In Resend Dashboard:
- View delivery rates
- Check bounce/spam rates
- See email open rates (if tracking enabled)

### In Supabase:
```sql
-- Check email sending stats
SELECT
  email_type,
  status,
  COUNT(*) as count
FROM scheduled_emails
GROUP BY email_type, status
ORDER BY email_type, status;

-- Find failed emails
SELECT * FROM scheduled_emails
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 💰 Pricing

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day
- Perfect for getting started

**Paid Plans:**
- $20/month for 50,000 emails
- $80/month for 500,000 emails

---

## 🔐 Security Best Practices

1. **Never commit API keys** to git
2. **Use environment variables** for all sensitive data
3. **Validate email addresses** before sending
4. **Implement rate limiting** to prevent abuse
5. **Monitor for bounces** and remove invalid emails

---

## ✅ Checklist

- [ ] Sign up for Resend account
- [ ] Get API key from Resend dashboard
- [ ] Add domain and verify DNS records
- [ ] Create email templates
- [ ] Create Supabase Edge Function
- [ ] Set RESEND_API_KEY environment variable
- [ ] Deploy Edge Function
- [ ] Set up cron job (Supabase or Vercel)
- [ ] Test by manually triggering an email
- [ ] Verify email delivered in Resend dashboard
- [ ] Monitor logs and adjust as needed

---

## 🆘 Troubleshooting

### Emails not sending?
1. Check Resend API key is correct
2. Verify domain is verified
3. Check Edge Function logs in Supabase
4. Ensure cron job is running
5. Check `scheduled_emails` table for status

### Emails going to spam?
1. Verify SPF, DKIM, DMARC records
2. Use a verified domain (not resend.dev in production)
3. Include unsubscribe link
4. Avoid spam trigger words

### Rate limiting?
- Free tier: 100 emails/day
- Upgrade to paid plan for more

---

**You're all set! 🎉**

Your automated email system is now ready to welcome new users and keep them engaged!
