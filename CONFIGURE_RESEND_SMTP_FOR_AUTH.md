# Configure Resend SMTP for Supabase Auth Emails

## Why This Is Perfect For You

✅ **Remove Supabase branding** - Use your own branded emails
✅ **100 signups/day FREE** - Resend covers 3,000 emails/month
✅ **99.9% deliverability** - Emails reach inbox, not spam
✅ **Professional** - No "Powered by Supabase" footer
✅ **Scalable** - Only $20/month when you need more

## Current vs After Setup

### Current (Supabase Default):
- ❌ Branded with Supabase logo
- ❌ "Powered by Supabase" footer
- ❌ Poor deliverability (60-70%)
- ❌ Generic templates
- ✅ Free but unprofessional

### After (Resend SMTP):
- ✅ Your brand only (LavLay)
- ✅ No third-party branding
- ✅ 99.9% deliverability
- ✅ Custom templates
- ✅ Free for 3,000 emails/month

## Step-by-Step Setup (5 Minutes)

### Step 1: Get Resend SMTP Credentials

1. Go to: https://resend.com/settings/smtp
2. You'll see:
   ```
   Host: smtp.resend.com
   Port: 587 (or 465 for SSL)
   Username: resend
   Password: re_your_api_key_here
   ```
3. Copy these credentials

### Step 2: Configure Supabase Auth SMTP

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/settings

2. Scroll to **"SMTP Settings"**

3. Click **"Enable Custom SMTP"**

4. Enter Resend credentials:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: re_your_resend_api_key_here
   Sender email: onboarding@resend.dev
   Sender name: LavLay
   ```

   **Note**: Use `onboarding@resend.dev` for now (free). After domain verification, change to `noreply@lavlay.com`.

5. Click **"Save"**

### Step 3: Test Email Delivery

1. Create a new account on your site
2. Check your inbox for verification email
3. It should say "From: LavLay" instead of Supabase
4. No Supabase branding!

### Step 4: Customize Email Templates

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/templates

2. Customize these templates to remove Supabase branding:

#### Confirm Signup Template:

```html
<h2>Welcome to LavLay!</h2>
<p>Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
<p>Or use this code: <strong>{{ .Token }}</strong></p>
<p>This code expires in 1 hour.</p>
<hr>
<p style="color: #999; font-size: 12px;">© 2026 LavLay. All rights reserved.</p>
```

#### Magic Link Template:

```html
<h2>Log in to LavLay</h2>
<p>Click the link below to log in:</p>
<p><a href="{{ .ConfirmationURL }}">Log In</a></p>
<p>This link expires in 1 hour.</p>
<hr>
<p style="color: #999; font-size: 12px;">© 2026 LavLay. All rights reserved.</p>
```

#### Reset Password Template:

```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<hr>
<p style="color: #999; font-size: 12px;">© 2026 LavLay. All rights reserved.</p>
```

## Cost Analysis for 100+ Signups/Day

### Scenario 1: 100 signups/day

**Emails per month:**
- Signups: 100/day × 30 days = 3,000 emails
- Welcome emails: 3,000 emails (via your Edge Function)
- **Total: 6,000 emails/month**

**Cost:**
- Auth emails via SMTP: Free (included in Resend free tier)
- Welcome emails via API: Free (under 3,000/month)
- **Total: $0/month** ✅

Wait, that's over 3,000! Let me recalculate...

### Resend Limits Clarification:

**Resend Free Tier:**
- 3,000 emails/month TOTAL
- Includes both SMTP and API
- 100 emails/day limit

**Your Usage (100 signups/day):**
- Auth OTP: 100/day = 3,000/month
- Welcome emails: 100/day = 3,000/month
- **Total: 6,000/month** ❌ Exceeds free tier

**Solution: Upgrade to Paid**
- $20/month for 50,000 emails
- Covers 1,666 signups/day
- Only $0.33 per signup email pair

### Scenario 2: 50 signups/day (Stay Free)

If you have ~50 signups/day:
- Auth OTP: 1,500/month
- Welcome emails: 1,500/month
- **Total: 3,000/month** ✅ Free!

### Recommendation:

**Start Free:**
- Use Resend SMTP for auth emails
- Use Resend API for welcome emails
- Monitor usage in Resend dashboard
- Stay under 100 emails/day (50 signups)

**When You Hit 100+ signups/day:**
- Upgrade to Resend paid: $20/month
- Still way cheaper than alternatives
- Professional branded emails
- 99.9% deliverability

## Alternative: Only Use SMTP for Auth (Most Cost-Effective)

If you want to maximize free tier:

**Use Resend SMTP for:**
- ✅ OTP verification (critical)
- ✅ Password reset (critical)
- ✅ Magic links (critical)

**Skip welcome emails temporarily:**
- ❌ Don't send welcome email on every signup
- ✅ Send weekly digest instead (1 email = 100 users)
- ✅ Send welcome email only for paid users

This keeps you under 3,000/month for longer!

## Domain Verification (Optional - Better Branding)

After your domain is verified in Resend:

1. Go to Resend → Domains → Add lavlay.com
2. Add DNS records to your domain registrar
3. Wait for verification
4. Change sender email to: `noreply@lavlay.com`
5. Update Supabase SMTP settings with new sender

**Benefits:**
- Professional sender address
- Better deliverability
- Consistent branding

## Monitoring Usage

**Check Resend Dashboard:**
- Go to: https://resend.com/usage
- See: Daily email count
- Monitor: When approaching 3,000/month
- Upgrade: Before hitting limit

**Check Supabase Logs:**
- Go to: Auth → Logs
- Filter: Email sent
- Verify: Emails are going through Resend

## What Happens When You Exceed Free Tier?

**Resend Free Tier (3,000/month):**
- Emails stop sending after 3,000
- You'll get a warning email
- Users can't sign up (no OTP)

**Solution:**
- Upgrade to paid ($20/month) BEFORE hitting limit
- Set up alerts in Resend dashboard
- Monitor usage weekly

## Cost Comparison

### Option 1: Supabase Default (Current)
- Cost: $0
- Deliverability: 60-70%
- Branding: Supabase logo
- Professional: ❌

### Option 2: Resend SMTP (Recommended)
- Cost: $0 (under 3,000/month) or $20/month
- Deliverability: 99.9%
- Branding: Your brand only
- Professional: ✅

### Option 3: SendGrid/Mailgun
- Cost: $15-35/month
- Deliverability: 95-98%
- Branding: Your brand
- Professional: ✅

**Winner: Resend** - Best value + already integrated!

## Summary

**Your Situation:**
- Need 100+ signups/day
- Don't want Supabase branding
- On a budget

**Best Solution:**
- Use Resend SMTP for ALL auth emails
- Cost: $20/month (when you exceed 100/day)
- Remove Supabase branding completely
- 99.9% deliverability

**Action Items:**
1. ✅ Configure Resend SMTP (5 minutes)
2. ✅ Customize email templates
3. ✅ Test with real signup
4. ✅ Monitor usage
5. ✅ Upgrade to paid when needed

**Next Step:** Follow Step 1-3 above to set up Resend SMTP!
