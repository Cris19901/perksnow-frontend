# Email System Quick Start

Fast track guide to get email notifications working.

## 📌 What You Need

1. **ZeptoMail Account** - Free (10,000 emails/month)
2. **Verified Domain** - SPF + DKIM records
3. **API Key** - From ZeptoMail console

## ⚡ Quick Setup (5 Steps)

### 1️⃣ Get ZeptoMail API Key

```
1. Sign up: https://www.zoho.com/zeptomail/
2. Add domain: lavlay.com
3. Add DNS records (SPF + DKIM)
4. Generate API Key → Copy it
```

### 2️⃣ Deploy Edge Function

```bash
# Deploy send-email function to Supabase
npx supabase functions deploy send-email

# Add API key secret in Supabase Dashboard
# Settings → Edge Functions → Add Secret:
# Name: ZEPTOMAIL_API_KEY
# Value: [Your API key]
```

### 3️⃣ Configure Database

Run in Supabase SQL Editor:

```sql
-- Enable HTTP extension
CREATE EXTENSION IF NOT EXISTS http;

-- Set Supabase URL (replace [YOUR_PROJECT_REF])
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://[YOUR_PROJECT_REF].supabase.co';

-- Set Anon Key (replace [YOUR_ANON_KEY])
ALTER DATABASE postgres SET app.settings.supabase_anon_key = '[YOUR_ANON_KEY]';
```

### 4️⃣ Run Migrations

Run in Supabase SQL Editor:

```sql
-- 1. Run EMAIL_TRIGGERS_MIGRATION.sql
-- (Creates all email triggers)

-- 2. Run WALLET_WITHDRAWAL_MIGRATION.sql (if not done yet)
-- (Creates wallet_withdrawals table)
```

### 5️⃣ Test

Create a test user → Check email for welcome message.

## 📂 Files Created

| File | Purpose |
|------|---------|
| `supabase/functions/send-email/index.ts` | Edge function (ZeptoMail API) |
| `EMAIL_TRIGGERS_MIGRATION.sql` | Database triggers |
| `ZEPTOMAIL_SETUP_GUIDE.md` | Complete setup guide |
| `src/lib/zeptomail.ts` | Frontend email service (optional) |

## ✅ What Works After Setup

Users automatically receive emails for:
- ✅ New account signup (welcome email)
- ✅ Referral signup (+20 points)
- 💰 Referral deposit (+5% commission)
- 📤 Withdrawal request
- ✅ Withdrawal completed
- ❌ Withdrawal rejected

## 🔧 Environment Variables

### Supabase Edge Function

Set in: **Supabase Dashboard → Settings → Edge Functions → Secrets**

```
ZEPTOMAIL_API_KEY = Zoho-enczapikey wSsVR60...
```

### Supabase Database

Set in: **Supabase SQL Editor**

```sql
app.settings.supabase_url = https://[PROJECT_REF].supabase.co
app.settings.supabase_anon_key = [ANON_KEY]
```

### Frontend (Optional - for direct email calls)

Set in: `.env`

```
VITE_ZEPTOMAIL_API_KEY=Zoho-enczapikey wSsVR60...
```

## 🐛 Quick Troubleshooting

**Emails not sending?**
1. Check Edge Function logs in Supabase
2. Verify ZEPTOMAIL_API_KEY is set
3. Verify domain in ZeptoMail console
4. Check DNS records (SPF, DKIM)

**Database errors?**
1. Check HTTP extension: `SELECT * FROM pg_extension WHERE extname = 'http';`
2. Check Supabase config: `SHOW app.settings.supabase_url;`

## 📊 Monitor

- **ZeptoMail Console**: [mailadmin.zoho.com](https://mailadmin.zoho.com) → Reports
- **Edge Function Logs**: Supabase Dashboard → Edge Functions → send-email
- **Database Activity**: Supabase Dashboard → Database → Tables

## 📞 Need Help?

See full guide: `ZEPTOMAIL_SETUP_GUIDE.md`

## 💰 Cost

- **Free tier**: 10,000 emails/month
- **After**: $2.50 per 10,000 emails
- **No monthly fees**

Estimated for your traffic:
- 1K users: FREE (≈2-3K emails/mo)
- 10K users: ≈$5-7/mo
- 100K users: ≈$50-75/mo

## ✨ Next Steps

1. Create ZeptoMail account
2. Verify domain
3. Deploy Edge Function
4. Run SQL migrations
5. Test with real signup

Total time: ~30 minutes (most is waiting for DNS)

---

**Status**: Ready to deploy
**Last updated**: January 2026
