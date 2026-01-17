# Resend + Supabase Native Integration (Easiest Method!)

## Why This Is Better

Instead of manually configuring SMTP, Resend has a **1-click integration** with Supabase that:

✅ **Auto-configures everything** - No manual SMTP setup needed
✅ **Seamless connection** - Resend talks directly to Supabase
✅ **Easier management** - Control from Resend dashboard
✅ **Same benefits** - Remove Supabase branding, 99.9% deliverability

## Step-by-Step Setup (2 Minutes!)

### Step 1: Go to Resend Integrations

1. Log in to Resend: https://resend.com
2. Go to: **Integrations** (in sidebar)
3. Find: **Supabase** integration
4. Click: **"Connect"** or **"Add Integration"**

### Step 2: Authorize Supabase

1. You'll be redirected to Supabase
2. Select your project: **kswknblwjlkgxgvypkmo**
3. Click: **"Authorize"**
4. Resend will automatically:
   - Configure SMTP settings
   - Set sender email
   - Connect the integration

### Step 3: Verify Connection

After authorization:

1. Go to Supabase: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/settings
2. Scroll to **"SMTP Settings"**
3. You should see:
   - ✅ Custom SMTP: **Enabled**
   - ✅ Host: `smtp.resend.com`
   - ✅ Configured by: **Resend Integration**

### Step 4: Test It!

1. Create a new account on your site
2. Check your email inbox
3. Verify email should arrive from Resend (not Supabase)
4. No Supabase branding!

## What Gets Automatically Configured

The integration sets up:

✅ **SMTP Host**: `smtp.resend.com`
✅ **SMTP Port**: `587`
✅ **Authentication**: Uses your Resend API key
✅ **Sender**: `onboarding@resend.dev` (or your verified domain)
✅ **All auth emails**: OTP, password reset, magic links

## Customize Email Templates (Optional)

Even with the integration, you can still customize templates:

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/auth/templates
2. Edit templates to remove Supabase branding
3. Add your LavLay branding

### Example: Clean OTP Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: white; margin: 0; }
    .content { background: #ffffff; padding: 40px; border: 1px solid #e5e5e5; border-radius: 0 0 8px 8px; }
    .code { background: #f5f5f5; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verify Your Email</h1>
    </div>
    <div class="content">
      <p>Hi there!</p>
      <p>Welcome to LavLay! Please confirm your email address to complete your registration.</p>

      <div class="code">{{ .Token }}</div>

      <p style="text-align: center;">Or click the button below:</p>
      <p style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Verify Email</a>
      </p>

      <p style="color: #666; font-size: 14px;">This code expires in 1 hour.</p>
      <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2026 LavLay. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
```

## Managing the Integration

### In Resend Dashboard:

1. Go to: **Integrations** → **Supabase**
2. You can:
   - View connection status
   - See email logs
   - Disconnect integration
   - Reconnect if needed

### In Supabase Dashboard:

1. Go to: **Auth** → **Settings** → **SMTP**
2. You can:
   - See integration status
   - Disable custom SMTP (reverts to Supabase)
   - Test email sending

## Email Logs & Monitoring

### Check Sent Emails:

**Resend Dashboard:**
- Go to: https://resend.com/emails
- See: All OTP, password reset, magic link emails
- Check: Delivery status, opens (if tracking enabled)

**Supabase Logs:**
- Go to: Auth → Logs
- Filter: Email sent
- See: When emails were triggered

## Usage & Billing

With the integration, all auth emails count toward your Resend quota:

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day

**Monitoring:**
- Check: https://resend.com/usage
- Track: Daily/monthly email count
- Alert: When approaching limit

## Troubleshooting

### Integration Not Working:

1. **Disconnect and reconnect**:
   - Resend → Integrations → Supabase → Disconnect
   - Wait 1 minute
   - Reconnect and re-authorize

2. **Check API key**:
   - Resend → API Keys
   - Ensure key has not expired
   - Generate new key if needed

3. **Verify Supabase project**:
   - Ensure you selected correct project during authorization
   - Project ID should be: `kswknblwjlkgxgvypkmo`

### Emails Not Sending:

1. **Check Resend logs**: https://resend.com/emails
2. **Check Supabase logs**: Auth → Logs
3. **Verify sender email**: Should be `onboarding@resend.dev`
4. **Check rate limits**: Max 100 emails/day on free tier

### Emails Going to Spam:

1. **Verify your domain** in Resend (recommended)
2. **Add SPF/DKIM records** to your domain
3. **Use custom sender**: `noreply@lavlay.com` after verification

## Advantages Over Manual SMTP Setup

| Feature | Manual SMTP | Native Integration |
|---------|-------------|-------------------|
| Setup Time | 5 minutes | 1 minute |
| Configuration | Manual entry | Automatic |
| Updates | Manual | Automatic |
| Management | Two dashboards | One dashboard |
| Troubleshooting | Manual | Built-in support |
| Disconnection | Manual | One-click |

**Winner**: Native integration is easier!

## Custom Domain Setup (Optional)

For professional sender email (`noreply@lavlay.com`):

1. **Add domain in Resend**:
   - Resend → Domains → Add Domain
   - Enter: `lavlay.com`

2. **Add DNS records**:
   - Resend provides: SPF, DKIM, DMARC records
   - Add to your domain registrar
   - Wait for verification (5-15 minutes)

3. **Update sender email**:
   - Supabase → Auth → Settings → SMTP
   - Change sender to: `noreply@lavlay.com`

4. **Benefits**:
   - Professional branding
   - Better deliverability
   - Consistent sender across all emails

## What You Get

✅ **No Supabase branding** - Only LavLay
✅ **99.9% deliverability** - Emails reach inbox
✅ **Professional emails** - Custom templates
✅ **Easy management** - One dashboard
✅ **Cost-effective** - Free for 3,000/month
✅ **Scalable** - $20/month for 50,000 emails

## Next Steps

1. ✅ **Go to Resend** → Integrations → Supabase
2. ✅ **Click "Connect"** and authorize
3. ✅ **Verify** in Supabase Auth settings
4. ✅ **Test** by creating new account
5. ✅ **Customize** email templates (optional)
6. ✅ **Monitor** usage in Resend dashboard

## Summary

**Old Way (Manual SMTP):**
- Copy credentials
- Paste in Supabase
- Manual configuration
- Prone to errors

**New Way (Native Integration):**
- Click "Connect"
- Authorize
- Done!
- Auto-configured

**Recommendation**: Use the native integration - it's easier, faster, and maintained automatically by Resend!

---

**Ready?** Go to https://resend.com/integrations and connect Supabase now! 🚀
