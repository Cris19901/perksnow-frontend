# Deploy Email System NOW - Quick Guide

You can send up to 100 emails/day (10,000/month) immediately without full verification!

## ⚡ Quick Deployment (15 minutes)

### Step 1: Get Your ZeptoMail API Key (5 mins)

1. Log in to [ZeptoMail Console](https://mailadmin.zoho.com)
2. Go to **Setup** → **API**
3. Click **Add API Key**
4. Name: `LavLay Production`
5. Select **Send Mail** permission
6. Click **Create**
7. **Copy the API key** (format: `Zoho-enczapikey wSsVR60...`)

---

### Step 2: Configure Supabase Edge Function (5 mins)

#### 2.1 Add API Key to Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Click **Add Secret**
5. Enter:
   - **Name**: `ZEPTOMAIL_API_KEY`
   - **Value**: [Paste your ZeptoMail API key]
6. Click **Save**

#### 2.2 Deploy Edge Function

Open your terminal:

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project (replace with your project ref)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the send-email function
npx supabase functions deploy send-email

# Verify deployment
npx supabase functions list
```

**Where to find your project ref:**
Supabase Dashboard → Settings → General → Reference ID

---

### Step 3: Configure Database (5 mins)

#### 3.1 Enable HTTP Extension

Go to Supabase Dashboard → **SQL Editor** → New Query

Run this:

```sql
-- Enable HTTP extension for API calls
CREATE EXTENSION IF NOT EXISTS http;

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'http';
```

#### 3.2 Set Supabase Configuration

Replace `[YOUR_PROJECT_REF]` and `[YOUR_ANON_KEY]` with your actual values:

```sql
-- Set Supabase URL
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://[YOUR_PROJECT_REF].supabase.co';

-- Set Anon Key
ALTER DATABASE postgres
SET app.settings.supabase_anon_key = '[YOUR_ANON_KEY]';

-- Verify settings
SHOW app.settings.supabase_url;
SHOW app.settings.supabase_anon_key;
```

**Where to find these values:**
- **Supabase Dashboard** → **Settings** → **API**
- **Project URL**: Copy the URL
- **Anon Key**: Copy the `anon` `public` key

#### 3.3 Run Email Triggers Migration

1. Open `EMAIL_TRIGGERS_MIGRATION.sql`
2. Copy ALL contents
3. Go to Supabase Dashboard → **SQL Editor** → **New Query**
4. Paste and click **Run**

This creates:
- Trigger functions for each email type
- Database triggers that automatically call the Edge Function
- Permissions for authenticated users

---

### Step 4: Test the System (2 mins)

#### Test 1: Test Edge Function Directly

```bash
curl -i --location --request POST \
  'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-email' \
  --header 'Authorization: Bearer [YOUR_ANON_KEY]' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "welcome",
    "data": {
      "to_email": "your-email@example.com",
      "to_name": "Test User",
      "referral_code": "TEST123"
    }
  }'
```

**Expected result:** You should receive a welcome email at the specified address.

#### Test 2: Test Database Trigger (Create Test User)

Go to Supabase → **SQL Editor**:

```sql
-- Get your user ID
SELECT id, username, email FROM users WHERE email = 'your-email@example.com';

-- This should trigger a welcome email
-- (if user doesn't exist, create one via signup page instead)
```

#### Test 3: Test Withdrawal Email

```sql
-- Get your user ID first
SELECT id FROM users WHERE email = 'your-email@example.com';

-- Create test withdrawal (replace [USER_ID] with actual ID)
INSERT INTO wallet_withdrawals (
  user_id,
  amount,
  currency,
  withdrawal_method,
  bank_name,
  account_number,
  account_name,
  status
) VALUES (
  '[USER_ID]',
  5000,
  'NGN',
  'bank',
  'GTBank',
  '0123456789',
  'Test User',
  'pending'
);

-- Check if email was sent (look for logs in Supabase Edge Functions)
```

**Expected result:** You should receive a "Withdrawal request received" email.

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] API key added to Supabase secrets
- [ ] Edge Function deployed successfully
- [ ] HTTP extension enabled in database
- [ ] Supabase URL and anon key configured
- [ ] Email triggers migration run
- [ ] Test email received successfully
- [ ] Database triggers working

---

## 📊 Current Status

**Email Limits:**
- ✅ **100 emails/day** (until domain verification)
- ✅ **10,000 emails/month** total
- ⏳ **Unlimited** (after domain verification)

**What Works Now:**
- ✅ Welcome emails when users sign up
- ✅ Referral signup notifications
- ✅ Referral deposit earnings
- ✅ Withdrawal request confirmations
- ✅ Withdrawal status updates

**Daily Estimate:**
- New signups: ~20-30 emails/day
- Referral notifications: ~10-15 emails/day
- Withdrawals: ~5-10 emails/day
- **Total: ~40-55 emails/day** (well within 100/day limit)

---

## 🐛 Troubleshooting

### Emails Not Sending?

**1. Check Edge Function Logs**
- Supabase Dashboard → **Edge Functions** → `send-email` → **Logs**
- Look for errors or API failures

**2. Check ZeptoMail API Key**
```bash
# Test API key directly
curl -X POST https://api.zeptomail.com/v1.1/email \
  -H "Authorization: Zoho-enczapikey [YOUR_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"address": "noreply@lavlay.com", "name": "LavLay"},
    "to": [{"email_address": {"address": "test@example.com"}}],
    "subject": "Test",
    "htmlbody": "<p>Test email</p>"
  }'
```

**3. Check Database Configuration**
```sql
-- Verify settings are set
SHOW app.settings.supabase_url;
SHOW app.settings.supabase_anon_key;

-- If empty, run the ALTER DATABASE commands again
```

**4. Check HTTP Extension**
```sql
-- Should return a row
SELECT * FROM pg_extension WHERE extname = 'http';

-- If not found
CREATE EXTENSION IF NOT EXISTS http;
```

**5. Check Trigger Functions**
```sql
-- List all trigger functions
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%email%';

-- Should see:
-- trigger_referral_signup_email on referrals
-- trigger_referral_deposit_email on referral_earnings
-- trigger_withdrawal_request_email on wallet_withdrawals
-- trigger_withdrawal_status_email on wallet_withdrawals
-- trigger_welcome_email on users
```

---

## 🚀 After Deployment

### Monitor Email Delivery

**ZeptoMail Console:**
1. Go to [Reports](https://mailadmin.zoho.com/zmail/#reports)
2. Check:
   - Emails sent
   - Delivery rate (should be >99%)
   - Bounce rate (should be <1%)
   - Opens and clicks

**Supabase Logs:**
1. Go to **Edge Functions** → `send-email` → **Logs**
2. Watch for successful sends or errors

### Track Usage

Check your daily usage:
```sql
-- Count emails sent today (approximate - based on triggers)
SELECT
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as today_signups,
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '1 day') as yesterday_signups
FROM users;

SELECT
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as today_withdrawals
FROM wallet_withdrawals;
```

**Daily email estimate:**
- 1 welcome email per signup
- ~0.5 referral emails per signup (50% referral rate)
- ~0.1 withdrawal emails per user

---

## 📈 Next Steps

### Now (With 100/day limit):
✅ Launch platform with email notifications
✅ Monitor delivery and usage
✅ Test all email types work correctly

### Soon (Submit for verification):
1. Add domain to ZeptoMail
2. Configure DNS records (SPF, DKIM, DMARC)
3. Submit verification samples (use `ZEPTOMAIL_VERIFICATION_SAMPLES.md`)
4. Wait 24-48 hours for approval

### After Verification:
✅ Unlimited emails (10,000/month free, then $2.50/10k)
✅ Better deliverability
✅ Custom domain emails
✅ Full features unlocked

---

## 💡 Tips

**1. Test thoroughly before going live:**
- Create test user account
- Test referral flow
- Test withdrawal request
- Verify emails arrive quickly

**2. Monitor first 24 hours:**
- Check Edge Function logs regularly
- Verify all emails delivering
- Watch for any errors

**3. Don't exceed 100/day initially:**
- With ~40-55 emails/day estimated, you're safe
- If you hit limits, prioritize withdrawal emails

**4. Set up domain ASAP:**
- Start DNS verification process now
- Takes 24-48 hours
- Unlocks unlimited emails

---

## ✅ You're Ready!

Your email system is now:
- ✅ **Deployed** to Supabase
- ✅ **Configured** with ZeptoMail
- ✅ **Automated** via database triggers
- ✅ **Live** and sending emails

**Start sending immediately with 100 emails/day!**

Users will now automatically receive:
- Welcome emails on signup
- Referral earnings notifications
- Withdrawal confirmations and updates

---

**Questions?** Check:
- Full setup: `ZEPTOMAIL_SETUP_GUIDE.md`
- Verification samples: `ZEPTOMAIL_VERIFICATION_SAMPLES.md`
- Quick reference: `EMAIL_SYSTEM_QUICK_START.md`
