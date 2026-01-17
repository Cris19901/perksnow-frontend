# Verify Email System Setup

Quick verification steps to ensure everything is configured correctly.

## ✅ Verification Checklist

### 1. Check Edge Function is Active

Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions

**You should see:**
- ✅ `send-email` function listed
- ✅ Status: Active (green)
- ✅ No errors

### 2. Check API Key Secret

Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/settings/edge-functions

Scroll to **Secrets** section

**You should see:**
- ✅ `ZEPTOMAIL_API_KEY` listed (value hidden)

### 3. Verify Database Configuration

Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/sql

Run this query:

```sql
-- Check HTTP extension
SELECT * FROM pg_extension WHERE extname = 'http';

-- Check Supabase URL is set
SHOW app.settings.supabase_url;

-- Check Anon key is set
SHOW app.settings.supabase_anon_key;
```

**Expected results:**
- First query: Returns 1 row (http extension)
- Second query: Shows your Supabase URL
- Third query: Shows your anon key (starts with `eyJ...`)

### 4. Check Email Triggers Are Installed

Run this query:

```sql
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%email%'
ORDER BY event_object_table, trigger_name;
```

**Expected result (5 rows):**
```
trigger_referral_deposit_email    | referral_earnings  | INSERT
trigger_referral_signup_email     | referrals          | INSERT
trigger_welcome_email             | users              | INSERT
trigger_withdrawal_request_email  | wallet_withdrawals | INSERT
trigger_withdrawal_status_email   | wallet_withdrawals | UPDATE
```

If you see all 5 triggers, you're good! ✅

---

## 🧪 Test Email System

### Test 1: Direct Edge Function Test

Go to SQL Editor and run:

```sql
-- Send a test welcome email
SELECT extensions.http_post(
  url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
  ),
  body := jsonb_build_object(
    'type', 'welcome',
    'data', jsonb_build_object(
      'to_email', 'YOUR_EMAIL@example.com',
      'to_name', 'Test User',
      'referral_code', 'TEST123'
    )
  )
);
```

**Replace `YOUR_EMAIL@example.com` with your actual email address.**

**Expected result:**
- Query runs successfully (even if it shows an error about return value, that's okay)
- Within 1-2 minutes, check your email inbox
- You should receive a "Welcome to LavLay!" email

### Test 2: Test Withdrawal Email Trigger

```sql
-- Get your user ID first
SELECT id, email, username FROM users LIMIT 1;

-- Create a test withdrawal (replace USER_ID with the ID from above)
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
  'USER_ID_HERE',  -- Replace with actual user ID
  5000,
  'NGN',
  'bank',
  'GTBank',
  '0123456789',
  'Test User',
  'pending'
);

-- Check if it was created
SELECT * FROM wallet_withdrawals ORDER BY created_at DESC LIMIT 1;
```

**Expected result:**
- Withdrawal record created
- Email sent to the user's email address
- Check email inbox for "Withdrawal request received" email

---

## 🐛 Troubleshooting

### No Email Received?

**1. Check Edge Function Logs**

Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions/send-email

Click on **Logs** tab

Look for:
- ✅ Green success messages
- ❌ Red error messages
- Check what the error says

**2. Check ZeptoMail Dashboard**

Go to: https://mailadmin.zoho.com

Click **Reports**

Check:
- How many emails sent today?
- Any failed deliveries?
- Any bounces?

**3. Test ZeptoMail API Key Directly**

Open PowerShell/Terminal:

```powershell
$headers = @{
    "Authorization" = "Zoho-enczapikey YOUR_API_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    from = @{
        address = "noreply@lavlay.com"
        name = "LavLay"
    }
    to = @(
        @{
            email_address = @{
                address = "your-email@example.com"
            }
        }
    )
    subject = "Test Email"
    htmlbody = "<p>This is a test email from LavLay.</p>"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://api.zeptomail.com/v1.1/email" -Method Post -Headers $headers -Body $body
```

Replace:
- `YOUR_API_KEY` with your ZeptoMail API key
- `your-email@example.com` with your email

If this works, ZeptoMail is configured correctly.

### "Permission Denied" Error?

The trigger functions need the HTTP extension. Run:

```sql
-- Grant permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
```

### "Function http_post does not exist"?

HTTP extension not enabled. Run:

```sql
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
```

---

## ✅ Success Indicators

**Your email system is working if:**

1. ✅ Edge Function shows as Active
2. ✅ API key secret is saved
3. ✅ All 5 email triggers exist
4. ✅ Test email received in inbox
5. ✅ Edge Function logs show successful sends
6. ✅ ZeptoMail reports show emails sent

---

## 📊 What's Working Now

Once verified, users will automatically receive emails for:

- ✅ **New user signup** → Welcome email with referral code
- ✅ **Referral signup** → Notification with points earned
- ✅ **Referral deposit** → Earnings notification with commission
- ✅ **Withdrawal request** → Confirmation email
- ✅ **Withdrawal completed** → Success notification
- ✅ **Withdrawal rejected** → Rejection notice with reason

---

## 🎉 You're Live!

If all tests pass, your email system is fully operational!

**Monitor for first 24 hours:**
- Check Edge Function logs regularly
- Verify emails are delivering
- Monitor ZeptoMail dashboard for any issues

**Usage limits:**
- 100 emails/day (unverified domain)
- 10,000 emails/month total
- Estimated daily usage: 40-55 emails

---

## 📞 Need Help?

If tests fail, share:
1. Edge Function logs (screenshot)
2. SQL query results (triggers list)
3. Any error messages

I'll help you debug!
