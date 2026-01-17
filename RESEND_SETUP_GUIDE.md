# Resend Email Integration Guide for LavLay

## Overview
This guide will help you integrate Resend for transactional emails to solve the deliverability issues with Supabase's default email service.

## What You'll Get
- 99.9% email deliverability
- Custom email templates with React Email
- 3,000 free emails/month
- Professional email design
- Better spam folder avoidance

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up with your email
3. Verify your account

## Step 2: Get API Key

1. Go to API Keys section in Resend dashboard
2. Click "Create API Key"
3. Name it "LavLay Production"
4. Copy the API key (starts with `re_`)
5. Save it securely - you'll need it for Supabase

## Step 3: Verify Your Domain (Optional but Recommended)

### For Custom Email (noreply@lavlay.com):
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain: `lavlay.com`
4. Add these DNS records to your domain registrar:

```
Type: TXT
Name: @
Value: [Resend will provide this]

Type: CNAME
Name: resend._domainkey
Value: [Resend will provide this]
```

5. Wait for verification (usually 5-10 minutes)

### For Testing (Free):
You can use `onboarding@resend.dev` for free testing without domain verification.

## Step 4: Add Resend API Key to Supabase

1. Go to your Supabase dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add a new secret:
   - Name: `RESEND_API_KEY`
   - Value: `re_your_api_key_here`

## Step 5: Deploy Email Edge Function

We'll create a Supabase Edge Function that uses Resend to send emails.

### Create the Edge Function:

```bash
# In your project root
supabase functions new send-email
```

This creates: `supabase/functions/send-email/index.ts`

Copy the code from `RESEND_EMAIL_FUNCTION.ts` (provided separately) into this file.

### Deploy the function:

```bash
supabase functions deploy send-email --no-verify-jwt
```

The `--no-verify-jwt` flag allows calling from client-side (we'll add security in the function itself).

## Step 6: Test the Integration

### From Supabase SQL Editor:

```sql
SELECT
  net.http_post(
    url := 'https://[your-project-ref].supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer [your-anon-key]'
    ),
    body := jsonb_build_object(
      'to', 'your-email@example.com',
      'subject', 'Test Email from LavLay',
      'html', '<h1>Hello!</h1><p>This is a test email from Resend.</p>'
    )
  ) as request_id;
```

### From Your React App:

```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome to LavLay!',
    html: '<h1>Welcome!</h1><p>Thanks for joining LavLay.</p>'
  }
});
```

## Email Templates You'll Need

### 1. Welcome Email (After Signup)
Sent when a user completes onboarding.

### 2. New Follower Notification
Sent when someone follows the user.

### 3. New Comment Notification
Sent when someone comments on their post/reel.

### 4. New Like Notification
Sent when someone likes their content.

### 5. Weekly Digest
Summary of activity and new followers.

### 6. Product Purchase Confirmation
Sent when someone buys their product.

## Email Sending Strategy

### Use Supabase Auth For:
- Email verification (OTP)
- Password reset
- Magic link login

### Use Resend For:
- Welcome emails
- Notification emails (followers, likes, comments)
- Marketing emails
- Product purchase confirmations
- Weekly digests

## Cost Breakdown

### Resend Free Tier:
- 3,000 emails/month
- 100 emails/day
- Perfect for starting out

### When to Upgrade ($20/month):
- Over 3,000 emails/month
- Need more than 100 emails/day
- Custom domain email required

## Security Best Practices

1. **Never expose your Resend API key** - Keep it in Supabase secrets
2. **Rate limit email sending** - Prevent spam from your function
3. **Validate email addresses** - Check format before sending
4. **Add unsubscribe links** - For notification emails
5. **Log email sends** - Track what was sent and when

## Monitoring

### Check Email Delivery:
1. Go to Resend dashboard
2. Click "Logs"
3. See all sent emails, delivery status, opens, clicks

### Check Edge Function Logs:
```bash
supabase functions logs send-email
```

## Troubleshooting

### Email Not Sending:
- Check Resend API key is correct in Supabase secrets
- Check Edge Function logs for errors
- Verify recipient email address is valid

### Email Going to Spam:
- Verify your domain in Resend
- Add SPF, DKIM, DMARC records
- Avoid spam trigger words in subject

### 429 Rate Limit Error:
- You've hit the 100 emails/day limit on free tier
- Upgrade to paid plan or wait 24 hours

## Next Steps

1. Create Resend account and get API key
2. Add API key to Supabase secrets
3. Deploy the send-email Edge Function
4. Test sending an email
5. Create email templates for different use cases
6. Update your app to use the new email function

## Support

- Resend Docs: https://resend.com/docs
- Resend Discord: https://discord.gg/resend
- Supabase Edge Functions Docs: https://supabase.com/docs/guides/functions
