# Brevo Quick Start - 5 Minutes to Launch! 🚀

## Step 1: Create Brevo Account (2 minutes)

1. **Open this link**: https://app.brevo.com/account/register

2. **Fill in the form**:
   - Email: `fadiscojay@gmail.com`
   - Password: (create a strong password)
   - First Name: (your name)
   - Last Name: (your name)
   - Company: `LavLay`
   - Click "Sign up"

3. **Check your email** (`fadiscojay@gmail.com`)
   - Look for email from Brevo
   - Click the verification link

4. **Complete onboarding**:
   - Select: **"Transactional emails"**
   - Industry: **"Social Media"** or **"Technology"**
   - Expected volume: **"Less than 10,000 per month"**
   - Click "Continue" or "Get Started"

---

## Step 2: Get Your API Key (1 minute)

1. **Go directly to API keys page**: https://app.brevo.com/settings/keys/api

   OR navigate manually:
   - Click your name in top right
   - Select "SMTP & API"
   - Click "API Keys" tab

2. **Generate new API key**:
   - Click "Generate a new API key" button
   - Name: `LavLay Production`
   - Click "Generate"

3. **COPY THE KEY!**
   - It will look like: `xkeysib-abc123...`
   - This is shown only once!
   - Copy it to a safe place

---

## Step 3: Give Me the API Key

Once you have the API key (starts with `xkeysib-`), just paste it here in the chat and I'll:

1. Add it to Supabase secrets
2. Deploy the multi-provider email function
3. Test sending to any email address
4. You'll be able to launch immediately!

---

## Quick Troubleshooting

### "Email verification link expired"
- Go back to signup page and enter same email
- Click "Resend verification email"

### "Can't find API key page"
- Direct link: https://app.brevo.com/settings/keys/api
- Or: Top right menu → SMTP & API → API Keys tab

### "Already have an account"
- Just login at: https://login.brevo.com
- Then go to: https://app.brevo.com/settings/keys/api

---

## What You're Getting

✅ **300 emails/day** (9,000/month) FREE
✅ **Send to ANY email** immediately (no sandbox!)
✅ **No domain verification required** to start
✅ **Professional sender address** (we can set up `noreply@lavlay.com` later)
✅ **99.9% deliverability** (Brevo uses Amazon SES backend)

---

## After You Give Me The Key

I'll run these commands:
```bash
# Add Brevo API key to Supabase
npx supabase secrets set BREVO_API_KEY=your_key_here

# Deploy multi-provider function
npx supabase functions deploy send-email-multi --no-verify-jwt

# Test with any email
node test-brevo-email.js
```

**Total setup time: ~2 minutes after you give me the key!**

---

## Ready?

Go to: https://app.brevo.com/account/register

Then paste your API key here when done! 🎉
