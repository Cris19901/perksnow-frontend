# ZeptoMail Email Integration Setup Guide

Complete guide to set up email notifications for referrals and withdrawals using ZeptoMail.

## 📋 Overview

This system sends automated emails for:
- ✅ **Referral Signups** - When someone signs up with a referral code
- 💰 **Referral Deposits** - When a referred user makes a deposit
- 📤 **Withdrawal Requests** - When a user requests withdrawal
- ✅ **Withdrawal Completed** - When admin approves withdrawal
- ❌ **Withdrawal Rejected** - When admin rejects withdrawal
- 🎉 **Welcome Emails** - When new users sign up

## 🚀 Step 1: Create ZeptoMail Account

1. Go to [ZeptoMail](https://www.zoho.com/zeptomail/)
2. Click **Sign Up** (Free for up to 10,000 emails/month)
3. Verify your email address
4. Complete account setup

## 🌐 Step 2: Verify Your Domain

### Add Domain in ZeptoMail

1. Log in to [ZeptoMail Console](https://mailadmin.zoho.com)
2. Go to **Mail Agents** → **Add Mail Agent**
3. Enter your domain: `lavlay.com`
4. Choose **Transactional** as mail agent type

### Add DNS Records

You need to add these DNS records in your domain provider (e.g., Cloudflare, Namecheap):

**1. SPF Record (TXT)**
```
Type: TXT
Name: @
Value: v=spf1 include:zeptomail.com ~all
TTL: Auto
```

**2. DKIM Record (TXT)**
```
Type: TXT
Name: zeptomail._domainkey
Value: [Copy from ZeptoMail console]
TTL: Auto
```

**3. DMARC Record (TXT)** (Optional but recommended)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@lavlay.com
TTL: Auto
```

### Verify Domain

1. After adding DNS records, return to ZeptoMail console
2. Click **Verify Domain**
3. Wait for verification (can take 24-48 hours but usually faster)
4. Once verified, you'll see a green checkmark

## 🔑 Step 3: Get API Key

1. In ZeptoMail console, go to **Setup** → **API**
2. Click **Add API Key**
3. Enter a name: `LavLay Production`
4. Select **Send Mail** permission
5. Click **Create**
6. **Copy the API key** (you won't see it again!)

Example API key format: `Zoho-enczapikey wSsVR60...`

## ⚙️ Step 4: Configure Supabase Edge Function

### 4.1 Set Environment Variable

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Add new secret:
   - Name: `ZEPTOMAIL_API_KEY`
   - Value: [Paste your ZeptoMail API key]

### 4.2 Deploy Edge Function

In your terminal:

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref [YOUR_PROJECT_REF]

# Deploy the send-email function
npx supabase functions deploy send-email
```

### 4.3 Verify Deployment

Test the Edge Function:

```bash
curl -i --location --request POST 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-email' \
  --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "welcome",
    "data": {
      "to_email": "test@example.com",
      "to_name": "Test User",
      "referral_code": "TEST123"
    }
  }'
```

## 🗄️ Step 5: Configure Database

### 5.1 Enable HTTP Extension

Run this in Supabase SQL Editor:

```sql
-- Enable http extension for making API calls
CREATE EXTENSION IF NOT EXISTS http;
```

### 5.2 Set Supabase Configuration

Run this in Supabase SQL Editor (replace with your values):

```sql
-- Set Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://[YOUR_PROJECT_REF].supabase.co';

-- Set Supabase Anon Key
ALTER DATABASE postgres SET app.settings.supabase_anon_key = '[YOUR_ANON_KEY]';
```

**Where to find these values:**
- Project URL: Supabase Dashboard → Settings → API → Project URL
- Anon Key: Supabase Dashboard → Settings → API → Project API keys → anon public

### 5.3 Run Email Triggers Migration

1. Open `EMAIL_TRIGGERS_MIGRATION.sql`
2. Copy all contents
3. Go to Supabase Dashboard → SQL Editor → New Query
4. Paste and run the SQL

This will create:
- Trigger functions for each email type
- Database triggers on relevant tables
- Permissions for authenticated users

### 5.4 Run Wallet Withdrawal Migration (if not done yet)

1. Open `WALLET_WITHDRAWAL_MIGRATION.sql`
2. Copy all contents
3. Go to Supabase Dashboard → SQL Editor → New Query
4. Paste and run the SQL

This creates the `wallet_withdrawals` table needed for withdrawal emails.

## ✅ Step 6: Verify Email System

### Test Referral Signup Email

Create a test referral in Supabase SQL Editor:

```sql
-- Get a test user ID
SELECT id, username FROM users LIMIT 1;

-- Create test referral (replace with actual user IDs)
INSERT INTO referrals (referrer_id, referee_id, status, referral_code_used)
VALUES (
  '[REFERRER_USER_ID]',
  '[REFEREE_USER_ID]',
  'active',
  'TEST123'
);
```

Check the referrer's email for the "New Referral" email.

### Test Withdrawal Request Email

Create a test withdrawal in Supabase SQL Editor:

```sql
-- Create test withdrawal (replace with actual user ID)
INSERT INTO wallet_withdrawals (
  user_id,
  amount,
  withdrawal_method,
  bank_name,
  account_number,
  account_name,
  status
)
VALUES (
  '[USER_ID]',
  5000,
  'bank',
  'GTBank',
  '0123456789',
  'Test User',
  'pending'
);
```

Check the user's email for "Withdrawal request received" email.

### Test Welcome Email

Create a new user account via your signup page. They should receive a welcome email.

## 🎨 Email Templates

All emails include:
- Branded header with gradient (purple to pink)
- Professional layout
- Clear call-to-action buttons
- Footer with branding
- Mobile-responsive design

### Customization

To customize email templates, edit:
- `supabase/functions/send-email/index.ts`
- Find the `getEmailTemplate()` function
- Modify HTML for each email type
- Redeploy: `npx supabase functions deploy send-email`

## 📊 Monitoring

### Check Email Logs in ZeptoMail

1. Go to ZeptoMail Console → **Reports**
2. View:
   - Emails sent
   - Delivery status
   - Bounce rate
   - Click rate

### Check Edge Function Logs

1. Go to Supabase Dashboard → **Edge Functions**
2. Click on `send-email`
3. View logs for errors or successful sends

### Check Database Trigger Logs

Run in Supabase SQL Editor:

```sql
-- Check recent referrals (should trigger signup emails)
SELECT * FROM referrals ORDER BY created_at DESC LIMIT 10;

-- Check recent withdrawals (should trigger emails)
SELECT * FROM wallet_withdrawals ORDER BY created_at DESC LIMIT 10;

-- Check recent referral earnings (should trigger deposit emails)
SELECT * FROM referral_earnings ORDER BY created_at DESC LIMIT 10;
```

## 🐛 Troubleshooting

### Emails Not Sending

1. **Check ZeptoMail API Key**
   - Verify key is set in Supabase Edge Functions secrets
   - Key format: `Zoho-enczapikey wSsVR60...`

2. **Check Domain Verification**
   - Ensure domain is verified in ZeptoMail
   - Check DNS records are properly configured

3. **Check Edge Function Logs**
   - Look for errors in Supabase Dashboard → Edge Functions
   - Common errors: API key missing, invalid email format

4. **Check HTTP Extension**
   - Run: `SELECT * FROM pg_extension WHERE extname = 'http';`
   - If not found, run: `CREATE EXTENSION http;`

5. **Check Supabase Configuration**
   - Run: `SHOW app.settings.supabase_url;`
   - Run: `SHOW app.settings.supabase_anon_key;`
   - If empty, run the ALTER DATABASE commands from Step 5.2

### Test Email Directly

Test ZeptoMail API directly with curl:

```bash
curl -X POST https://api.zeptomail.com/v1.1/email \
  -H "Authorization: Zoho-enczapikey [YOUR_API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {
      "address": "noreply@lavlay.com",
      "name": "LavLay"
    },
    "to": [{
      "email_address": {
        "address": "your-email@example.com",
        "name": "Test User"
      }
    }],
    "subject": "Test Email",
    "htmlbody": "<p>This is a test email from LavLay.</p>"
  }'
```

### Email Going to Spam

1. **Verify SPF, DKIM, DMARC** records are correct
2. **Use consistent FROM address**: `noreply@lavlay.com`
3. **Avoid spam trigger words** in subject/body
4. **Warm up your domain**: Start with small volumes
5. **Ask users to whitelist**: `noreply@lavlay.com`

## 💰 Pricing

ZeptoMail Pricing:
- **Free**: 10,000 emails/month
- **Pay-as-you-go**: $2.50 per 10,000 emails after free tier
- **No monthly fees**, only pay for what you use

Estimated costs for LavLay:
- 1,000 users: ~2,000-3,000 emails/month (FREE)
- 10,000 users: ~20,000-30,000 emails/month (~$5-7.50/month)
- 100,000 users: ~200,000-300,000 emails/month (~$50-75/month)

## 📧 Email Types Breakdown

| Event | Trigger | Recipient | Template |
|-------|---------|-----------|----------|
| User signs up | New user created | New user | Welcome email with referral code |
| Referral signup | Referral record created | Referrer | "You earned 20 points!" |
| Referral deposit | Referral earning created | Referrer | "You earned ₦X commission!" |
| Withdrawal request | Withdrawal created | User | "Request received" |
| Withdrawal completed | Withdrawal status → completed | User | "Withdrawal processed" |
| Withdrawal rejected | Withdrawal status → rejected | User | "Request declined" with reason |

## 🔐 Security Notes

1. **API Key Protection**
   - Never commit API key to git
   - Store only in Supabase secrets
   - Rotate key if compromised

2. **Email Address Validation**
   - All emails validated before sending
   - Bounce handling in ZeptoMail

3. **Rate Limiting**
   - ZeptoMail has built-in rate limits
   - Monitor usage in console

## ✅ Launch Checklist

Before going live:

- [ ] ZeptoMail account created
- [ ] Domain verified with SPF/DKIM records
- [ ] API key generated and stored in Supabase
- [ ] Edge Function deployed
- [ ] HTTP extension enabled in database
- [ ] Supabase URL and anon key configured
- [ ] Email triggers migration run
- [ ] Wallet withdrawal migration run
- [ ] Test emails sent successfully
- [ ] All 6 email types tested and working
- [ ] Email monitoring set up in ZeptoMail
- [ ] Support email added to DMARC record

## 📞 Support

- **ZeptoMail Support**: [support.zoho.com](https://support.zoho.com)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **Email deliverability issues**: Check ZeptoMail Reports → Bounces

## 🎉 You're All Set!

Your email notification system is now ready. Users will receive:
- Welcome emails when they sign up
- Notifications when they earn from referrals
- Updates on their withdrawal requests

Monitor your ZeptoMail dashboard to track email performance and deliverability!
