# Supabase Configuration - Step-by-Step Visual Guide

Follow these exact steps to configure your email system. Takes 5-10 minutes.

---

## Step 1: Add ZeptoMail API Key to Supabase

### 1.1 Go to Supabase Dashboard
1. Open browser: https://app.supabase.com
2. Click on your **perknowv2** project (or whatever your project is named)

### 1.2 Navigate to Edge Functions Settings
1. Click **Settings** (⚙️ icon) in left sidebar
2. Click **Edge Functions** under Settings
3. Scroll down to **Secrets** section

### 1.3 Add API Key Secret
1. Click **Add secret** or **New secret** button
2. Fill in:
   - **Name**: `ZEPTOMAIL_API_KEY` (exactly like this, case-sensitive)
   - **Value**: [Paste your ZeptoMail API key here]
     - Should look like: `Zoho-enczapikey wSsVR60...`
3. Click **Save** or **Create**

**Screenshot areas to look for:**
```
Settings
├── General
├── Database
├── API
├── Auth
└── Edge Functions ← Click here
    └── Secrets section ← Scroll to here
        └── [Add secret] button ← Click this
```

---

## Step 2: Deploy Edge Function

### 2.1 Find Your Project Reference ID

**In Supabase Dashboard:**
1. Go to **Settings** → **General**
2. Look for **Reference ID** (under Project Settings)
3. Copy it (looks like: `abcdefghijklmnop`)

**Or look at your URL:**
- URL format: `https://app.supabase.com/project/[PROJECT_REF]`
- Copy the part after `/project/`

### 2.2 Deploy via Terminal

Open your terminal/command prompt in your project folder:

```bash
# 1. Login to Supabase
npx supabase login
```

**What happens:** Browser opens, click "Authorize"

```bash
# 2. Link your project (replace YOUR_PROJECT_REF)
npx supabase link --project-ref YOUR_PROJECT_REF
```

**Replace `YOUR_PROJECT_REF` with the ID you copied above**

Example:
```bash
npx supabase link --project-ref abcdefghijklmnop
```

**What happens:** It will ask you to confirm. Type `y` and press Enter.

```bash
# 3. Deploy the send-email function
npx supabase functions deploy send-email
```

**What happens:**
- It uploads the function
- Shows progress
- Says "Deployed successfully" when done

**Expected output:**
```
Deploying function send-email...
✓ Function send-email deployed successfully
URL: https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-email
```

**Copy that URL** - you'll need it for testing.

---

## Step 3: Configure Database

### 3.1 Get Your Anon Key

**In Supabase Dashboard:**
1. Go to **Settings** → **API**
2. Look for **Project API keys** section
3. Find **anon** **public** key
4. Click the **Copy** icon next to it
5. Keep it handy (you'll paste it in SQL)

### 3.2 Get Your Project URL

**Same page (Settings → API):**
1. Look for **Project URL**
2. Copy it (looks like: `https://abcdefghijklmnop.supabase.co`)

### 3.3 Run SQL Configuration

**In Supabase Dashboard:**
1. Click **SQL Editor** (📝 icon) in left sidebar
2. Click **New query** button
3. Paste this SQL (replace the placeholders):

```sql
-- 1. Enable HTTP extension
CREATE EXTENSION IF NOT EXISTS http;

-- 2. Set Supabase URL (REPLACE THIS)
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- 3. Set Anon Key (REPLACE THIS)
ALTER DATABASE postgres
SET app.settings.supabase_anon_key = 'YOUR_ANON_KEY_HERE';

-- 4. Verify settings
SHOW app.settings.supabase_url;
SHOW app.settings.supabase_anon_key;
```

**IMPORTANT: Replace these two values:**
- `YOUR_PROJECT_REF` → Your actual project reference ID
- `YOUR_ANON_KEY_HERE` → Your actual anon key from Settings → API

**Example (DO NOT USE THESE VALUES - USE YOUR OWN):**
```sql
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://abcdefghijklmnop.supabase.co';

ALTER DATABASE postgres
SET app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

4. Click **Run** (or press F5)

**Expected result:**
- First 3 commands: "Success, no rows returned"
- Last 2 commands (SHOW): Display your configured values

---

## Step 4: Run Email Triggers Migration

### 4.1 Open the Migration File

**On your computer:**
1. Navigate to your project folder
2. Find file: `EMAIL_TRIGGERS_MIGRATION.sql`
3. Open it in any text editor
4. Select ALL (Ctrl+A or Cmd+A)
5. Copy (Ctrl+C or Cmd+C)

### 4.2 Run in Supabase

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Click **New query**
3. Paste the entire contents of `EMAIL_TRIGGERS_MIGRATION.sql`
4. Click **Run** (or press F5)

**This will take 5-10 seconds to run.**

**Expected output:**
```
Success, no rows returned
Success, no rows returned
... (multiple lines)
✅ Email Notification Triggers - INSTALLED
```

At the end, you should see a success message listing all the triggers created.

---

## Step 5: Verify Everything Works

### 5.1 Check Edge Function is Deployed

**In Supabase Dashboard:**
1. Click **Edge Functions** in left sidebar (⚡ icon)
2. You should see `send-email` listed
3. Status should be "Active" or green checkmark

### 5.2 Check Database Triggers

**In SQL Editor, run this:**

```sql
-- Check if triggers were created
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%email%'
ORDER BY event_object_table;
```

**Expected result (5 rows):**
```
trigger_referral_deposit_email      | referral_earnings
trigger_referral_signup_email       | referrals
trigger_welcome_email              | users
trigger_withdrawal_request_email   | wallet_withdrawals
trigger_withdrawal_status_email    | wallet_withdrawals
```

### 5.3 Test with Real Email

**In SQL Editor, run this (replace with your email):**

```sql
-- Test the Edge Function directly
SELECT extensions.http_post(
  url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
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

**Replace `YOUR_EMAIL@example.com` with your actual email.**

**Expected result:**
- Query runs successfully
- Within 1-2 minutes, you receive a welcome email

---

## ✅ Configuration Complete!

If all steps succeeded:
- ✅ ZeptoMail API key configured
- ✅ Edge Function deployed
- ✅ Database configured
- ✅ Email triggers installed
- ✅ Test email sent successfully

Your email system is now **LIVE**!

---

## 🐛 Troubleshooting

### Problem: "Function not found" when deploying

**Solution:**
- Make sure you're in the correct project directory
- Check that `supabase/functions/send-email/index.ts` exists
- Try: `npx supabase functions list` to see available functions

### Problem: SQL error "could not serialize access"

**Solution:**
- Run the ALTER DATABASE commands one at a time
- Wait 5 seconds between each
- Try refreshing the page and running again

### Problem: "Extension http does not exist"

**Solution:**
```sql
-- Enable http extension as superuser
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
```

### Problem: No email received

**Solution:**
1. Check Edge Function logs:
   - Dashboard → Edge Functions → send-email → Logs
2. Check ZeptoMail console:
   - https://mailadmin.zoho.com → Reports
3. Verify API key is correct:
   - Settings → Edge Functions → Secrets
4. Test API key directly:
```bash
curl -X POST https://api.zeptomail.com/v1.1/email \
  -H "Authorization: Zoho-enczapikey YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"address": "noreply@lavlay.com", "name": "LavLay"},
    "to": [{"email_address": {"address": "test@example.com"}}],
    "subject": "Test",
    "htmlbody": "<p>Test</p>"
  }'
```

---

## 📝 Quick Reference Card

**What You Need:**
1. ✅ ZeptoMail API key
2. ✅ Supabase project reference ID
3. ✅ Supabase anon key
4. ✅ Supabase project URL

**Where to Find Them:**
1. ZeptoMail: mailadmin.zoho.com → Setup → API
2. Project Ref: Settings → General → Reference ID
3. Anon Key: Settings → API → Project API keys → anon public
4. Project URL: Settings → API → Project URL

**Configuration Steps:**
1. Add `ZEPTOMAIL_API_KEY` secret to Edge Functions
2. Deploy function: `npx supabase functions deploy send-email`
3. Run SQL config (enable http, set URL, set anon key)
4. Run `EMAIL_TRIGGERS_MIGRATION.sql`
5. Test with SQL query

**Total Time:** 10-15 minutes

---

Ready to configure? Follow steps 1-5 above and you'll be done in minutes!
