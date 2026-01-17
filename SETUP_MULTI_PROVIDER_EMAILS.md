# Setup Guide: Multi-Provider Email System

This guide will help you set up **Brevo, SendGrid, and Elastic Email** with automatic failover.

**Total Free Tier: 500 emails/day = 15,000/month!** 🎉

---

## Step 1: Get Brevo API Key (5 minutes) - 300 emails/day

### 1.1 Create Account
1. Go to: https://app.brevo.com/account/register
2. Enter:
   - Email: `fadiscojay@gmail.com`
   - Password: (your choice)
   - Company: `LavLay`
3. Click "Sign up"
4. Check email and verify

### 1.2 Complete Onboarding
1. Select "Transactional" as email type
2. Skip domain setup (optional, we'll add later)
3. Click "Continue"

### 1.3 Get API Key
1. Go to: https://app.brevo.com/settings/keys/api
2. Click "Generate a new API key"
3. Name: `LavLay Production`
4. Copy the key (starts with `xkeysib-...`)
5. Save it somewhere safe!

**✅ Brevo is ready! No domain verification needed to start sending.**

---

## Step 2: Get SendGrid API Key (5 minutes) - 100 emails/day

### 2.1 Create Account
1. Go to: https://signup.sendgrid.com
2. Enter:
   - Email: `fadiscojay@gmail.com` (can use same email)
   - Password: (your choice)
3. Complete signup
4. Verify email

### 2.2 Complete Onboarding
1. Answer survey:
   - Purpose: "Transactional emails"
   - Industry: "Social Media"
   - Role: "Developer"
2. Skip domain verification (do later)
3. Click "Get Started"

### 2.3 Create API Key
1. Go to: https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: `LavLay Production`
4. Permissions: **Full Access** (or "Mail Send" only)
5. Click "Create & View"
6. Copy the key (starts with `SG.`)
7. Save it! (you can't see it again)

### 2.4 Verify Single Sender (Required for Free Tier)
1. Go to: https://app.sendgrid.com/settings/sender_auth/senders
2. Click "Create New Sender"
3. Fill in:
   - From Name: `LavLay`
   - From Email: `fadiscojay@gmail.com` (or `noreply@lavlay.com` if you want)
   - Company Address: (any address, can be home address)
   - City, State, ZIP, Country
4. Click "Save"
5. Check email and verify

**✅ SendGrid ready! Can send to any email after sender verification.**

---

## Step 3: Get Elastic Email API Key (5 minutes) - 100 emails/day

### 3.1 Create Account
1. Go to: https://elasticemail.com/account#/create-account
2. Enter:
   - Email: `fadiscojay@gmail.com`
   - Password: (your choice)
3. Click "Start for Free"
4. Verify email

### 3.2 Complete Profile
1. Fill in basic info
2. Select "Transactional emails"
3. Skip phone verification (optional)

### 3.3 Get API Key
1. Go to: https://elasticemail.com/account#/settings/new/manage-api
2. Click "Create Additional API Key"
3. Name: `LavLay Production`
4. Permissions: **Send Email** (at minimum)
5. Click "Create"
6. Copy the API key
7. Save it!

**✅ Elastic Email ready! Can send immediately.**

---

## Step 4: Add API Keys to Supabase (2 minutes)

Once you have all 3 API keys, run these commands:

```bash
# Add Brevo API key
npx supabase secrets set BREVO_API_KEY=xkeysib-your_brevo_key_here

# Add SendGrid API key
npx supabase secrets set SENDGRID_API_KEY=SG.your_sendgrid_key_here

# Add Elastic Email API key
npx supabase secrets set ELASTIC_API_KEY=your_elastic_key_here
```

**Note**: You can add them one at a time as you get them!

---

## Step 5: Deploy Multi-Provider Function (1 minute)

```bash
npx supabase functions deploy send-email-multi --no-verify-jwt
```

---

## Step 6: Test the System (1 minute)

Test with any email address:

```javascript
const response = await fetch('https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email-multi', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    to: 'any-email@example.com',
    subject: 'Test Email',
    html: '<h1>It works!</h1>',
    // Optional: specify provider (brevo, sendgrid, elastic, resend, auto)
    // If not specified, uses 'auto' which tries providers in order
    provider: 'auto'
  })
})
```

---

## How It Works

### Auto Failover (Default)
If you don't specify a provider, the system tries them in order:

1. **Brevo first** (300/day - biggest free tier)
2. **SendGrid** if Brevo fails (100/day - most reliable)
3. **Elastic Email** if both fail (100/day - backup)
4. **Resend** if all else fails (100/day - once sandbox removed)

### Manual Provider Selection
You can force a specific provider:

```javascript
{
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome!</h1>',
  provider: 'brevo' // or 'sendgrid', 'elastic', 'resend'
}
```

---

## Domain Verification (Optional - For Better Deliverability)

After basic setup, you can verify `lavlay.com` with each provider:

### Brevo Domain Verification
1. Go to: https://app.brevo.com/settings/senders/domain
2. Add `lavlay.com`
3. Add DNS records to Cloudflare
4. Verify

### SendGrid Domain Authentication
1. Go to: https://app.sendgrid.com/settings/sender_auth/domains
2. Add `lavlay.com`
3. Add DNS records to Cloudflare
4. Verify

### Elastic Email Domain Verification
1. Go to: https://elasticemail.com/account#/settings/new/sending-domains
2. Add `lavlay.com`
3. Add DNS records to Cloudflare
4. Verify

**Note**: All three use similar SPF/DKIM records. You can add all of them to Cloudflare!

---

## Provider Status Summary

| Provider | Status | Free Tier | Domain Required | Setup Time |
|----------|--------|-----------|-----------------|------------|
| **Brevo** | ⏳ Waiting for API key | 300/day | No ✅ | 5 min |
| **SendGrid** | ⏳ Waiting for API key | 100/day | No ✅ | 5 min |
| **Elastic** | ⏳ Waiting for API key | 100/day | No ✅ | 5 min |
| **Resend** | ✅ Configured | 100/day | Yes (verified) | Done! |

---

## Quick Start Checklist

- [ ] Sign up for Brevo → Get API key
- [ ] Sign up for SendGrid → Get API key → Verify sender
- [ ] Sign up for Elastic Email → Get API key
- [ ] Add all 3 API keys to Supabase
- [ ] Deploy `send-email-multi` function
- [ ] Test sending to any email
- [ ] Launch! 🚀

---

## After Setup

You'll have:
- ✅ **500 emails/day** (Brevo 300 + SendGrid 100 + Elastic 100)
- ✅ **15,000 emails/month** FREE
- ✅ Automatic failover - if one provider is down, others work
- ✅ Can send from `noreply@lavlay.com` (after domain verification)
- ✅ Or send from provider domains immediately

**Total Setup Time: ~15 minutes for all 3 providers!**

---

## Need Help?

Common issues:

### "API key invalid"
- Make sure you copied the full key
- Check for extra spaces
- Regenerate key if needed

### "Sender not verified" (SendGrid only)
- Go to sender verification page
- Check spam folder for verification email
- Use verified email as sender

### "Daily limit exceeded"
- System automatically switches to next provider
- Check which provider succeeded in response

---

## Ready to Start?

1. **Start with Brevo** (easiest, biggest free tier)
2. **Add SendGrid** (backup)
3. **Add Elastic** (extra capacity)

Just tell me when you have the API keys and I'll add them to Supabase! 🎉
