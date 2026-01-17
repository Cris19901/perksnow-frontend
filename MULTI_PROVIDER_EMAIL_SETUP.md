# Multi-Provider Email Setup Guide

## Why Use Multiple Providers?

Using multiple email providers gives you:
- ✅ **Redundancy**: If one fails, others work
- ✅ **Higher Free Limits**: Combine free tiers
- ✅ **Better Deliverability**: Use best provider for each email type
- ✅ **No Downtime**: Automatic failover

---

## Recommended Multi-Provider Strategy

### Provider 1: Resend (Primary - After Sandbox Removed)
- **Use for**: Welcome emails, password resets
- **Free Tier**: 3,000 emails/month, 100/day
- **Status**: Domain verified, waiting for sandbox removal
- **Sender**: `noreply@lavlay.com`

### Provider 2: SendGrid (Immediate Backup)
- **Use for**: All emails until Resend sandbox removed
- **Free Tier**: 100 emails/day forever
- **Setup Time**: 15 minutes
- **No Sandbox**: Works immediately after verification
- **Sender**: `noreply@lavlay.com`

### Provider 3: Mailgun (High Volume)
- **Use for**: Bulk notifications, newsletters
- **Free Tier**: 5,000 emails/month for 3 months
- **Setup Time**: 20 minutes
- **Sender**: `noreply@lavlay.com`

---

## Quick Setup: SendGrid (Works Immediately!)

### Step 1: Create SendGrid Account (2 minutes)

1. Go to: https://signup.sendgrid.com
2. Sign up with `fadiscojay@gmail.com`
3. Verify email
4. Complete onboarding survey (select "Transactional emails")

### Step 2: Verify Domain (5 minutes)

1. Go to: https://app.sendgrid.com/settings/sender_auth/senders
2. Click "Verify a Single Sender"
3. Enter:
   - **From Name**: LavLay
   - **From Email**: `noreply@lavlay.com`
   - **Company Address**: (any address)
4. Click "Create"
5. Check your email and verify

**OR** for better deliverability:

1. Go to: https://app.sendgrid.com/settings/sender_auth/domains
2. Click "Authenticate Your Domain"
3. Enter `lavlay.com`
4. Add DNS records to Cloudflare (similar to Resend)
5. Verify

### Step 3: Create API Key (1 minute)

1. Go to: https://app.sendgrid.com/settings/api_keys
2. Click "Create API Key"
3. Name: `LavLay Production`
4. Permissions: **Full Access** (or Mail Send only)
5. Copy the API key (starts with `SG.`)

### Step 4: Add to Supabase (1 minute)

```bash
npx supabase secrets set SENDGRID_API_KEY=SG.your_key_here
```

### Step 5: Create SendGrid Edge Function (5 minutes)

I can create a new Edge Function that uses SendGrid, or modify the existing one to support both providers with automatic failover.

---

## Implementation Options

### Option A: Dual Provider with Failover (Recommended)

Modify existing Edge Function to try Resend first, fall back to SendGrid:

```typescript
// Try Resend first
if (RESEND_API_KEY) {
  const resendResult = await sendViaResend(emailData)
  if (resendResult.success) return resendResult
}

// Fall back to SendGrid
if (SENDGRID_API_KEY) {
  const sendgridResult = await sendViaSendGrid(emailData)
  return sendgridResult
}
```

**Pros**:
- Automatic failover
- Uses custom domain when Resend works
- Falls back to SendGrid if Resend fails

**Cons**:
- Slightly more complex code

### Option B: Separate Functions for Each Provider

Create 2 Edge Functions:
- `send-email-resend` - Uses Resend (lavlay.com)
- `send-email-sendgrid` - Uses SendGrid (lavlay.com)

**Pros**:
- Simple, isolated code
- Easy to switch providers
- Can use different providers for different email types

**Cons**:
- Need to change function URL in app code

### Option C: Provider Router

Single Edge Function with provider selection:

```typescript
// In your app code:
fetch('https://...functions/v1/send-email', {
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Welcome',
    html: '...',
    provider: 'sendgrid' // or 'resend'
  })
})
```

**Pros**:
- Full control from app
- Easy A/B testing
- Can prioritize providers

---

## SendGrid API Reference

### Endpoint
```
POST https://api.sendgrid.com/v3/mail/send
```

### Headers
```json
{
  "Authorization": "Bearer SG.your_api_key",
  "Content-Type": "application/json"
}
```

### Body
```json
{
  "personalizations": [
    {
      "to": [{"email": "user@example.com"}],
      "subject": "Welcome to LavLay!"
    }
  ],
  "from": {
    "email": "noreply@lavlay.com",
    "name": "LavLay"
  },
  "content": [
    {
      "type": "text/html",
      "value": "<h1>Welcome!</h1>"
    }
  ]
}
```

---

## Cost Comparison

| Provider | Free Tier | After Free | Best For |
|----------|-----------|------------|----------|
| **Resend** | 3,000/mo, 100/day | $20/mo (50k) | Professional sender address |
| **SendGrid** | 100/day forever | $20/mo (40k) | Immediate use, no sandbox |
| **Mailgun** | 5k/mo (3 months) | $35/mo (50k) | High volume |
| **Postmark** | 100/mo | $15/mo (10k) | Best deliverability |
| **Amazon SES** | 62k/mo (from EC2) | $0.10/1000 | Cheapest at scale |

---

## Recommended Setup for LavLay

### Phase 1: Launch (Now)
- **Primary**: SendGrid (100/day = ~3,000/month)
- **Backup**: Resend test domain (if needed)
- **Cost**: $0

### Phase 2: After Sandbox Removal (1-2 days)
- **Primary**: Resend (3,000/month)
- **Backup**: SendGrid
- **Cost**: $0

### Phase 3: Growth (After 100 signups/day)
- **Transactional**: Resend (3,000/month)
- **Marketing**: Mailgun (5,000/month)
- **Cost**: $0

### Phase 4: Scale (After free tiers)
- **All emails**: Amazon SES
- **Volume**: 100k emails/month = $10
- **Cost**: $10/month

---

## What Would You Like?

1. **Setup SendGrid now** (15 minutes - works immediately)
2. **Dual provider with failover** (20 minutes - best reliability)
3. **Wait for Resend support** (0 minutes - might take 24-48 hours)
4. **Switch to Amazon SES** (30 minutes - you already have SPF!)

I recommend **Option 1 or 2** - Set up SendGrid so you can launch immediately!
