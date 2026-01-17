# Domain Verification Guide for LavLay

## 🎯 Goal
Verify `lavlay.com` with Resend so you can send emails to any user (not just your own email).

---

## Step 1: Add Domain in Resend (2 minutes)

1. **Go to Resend Domains**: https://resend.com/domains

2. **Click "Add Domain"**

3. **Enter your domain**: `lavlay.com`
   - ✅ Use: `lavlay.com` (without www)
   - ❌ Don't use: `www.lavlay.com`

4. **Click "Add"**

5. Resend will show you **3 DNS records** that need to be added:
   - **1 SPF record** (TXT)
   - **1 DKIM record** (TXT)
   - **1 DMARC record** (TXT)

---

## Step 2: Add DNS Records (5-10 minutes)

You need to add these DNS records to your domain registrar (where you bought lavlay.com).

### Where to Add Records:

**If you use Cloudflare:**
1. Go to https://dash.cloudflare.com
2. Select `lavlay.com`
3. Go to **DNS** → **Records**
4. Click **Add record**

**If you use Namecheap:**
1. Go to https://ap.www.namecheap.com/domains/list
2. Click **Manage** next to lavlay.com
3. Go to **Advanced DNS** tab
4. Click **Add New Record**

**If you use GoDaddy:**
1. Go to https://dcc.godaddy.com/domains
2. Click on lavlay.com
3. Go to **DNS** → **Manage Zones**
4. Click **Add**

### DNS Records to Add:

Resend will show you something like this (exact values will be different):

#### Record 1: SPF (TXT)
- **Type**: TXT
- **Name**: `@` or `lavlay.com`
- **Value**: `v=spf1 include:_spf.resend.com ~all`
- **TTL**: 3600 (or Auto)

#### Record 2: DKIM (TXT)
- **Type**: TXT
- **Name**: `resend._domainkey` or `resend._domainkey.lavlay.com`
- **Value**: `p=MIGfMA0GCS...` (long string)
- **TTL**: 3600 (or Auto)

#### Record 3: DMARC (TXT)
- **Type**: TXT
- **Name**: `_dmarc` or `_dmarc.lavlay.com`
- **Value**: `v=DMARC1; p=none; rua=mailto:dmarc@resend.com`
- **TTL**: 3600 (or Auto)

**Important**:
- Copy the exact values from your Resend dashboard
- Don't modify them
- Make sure there are no extra spaces

---

## Step 3: Verify Domain in Resend (2-30 minutes)

1. **After adding all 3 DNS records**, go back to Resend
2. Click **"Verify Records"** button
3. Resend will check if the records are set up correctly

### Verification Time:
- **Fast DNS providers** (Cloudflare): 2-5 minutes
- **Slow DNS providers** (GoDaddy, Namecheap): 15-30 minutes
- **Very slow**: Up to 24 hours (rare)

### If Verification Fails:
- **Wait 10 more minutes** - DNS changes take time to propagate
- **Check for typos** - Make sure you copied the values exactly
- **Check the record name** - Some registrars need `@` while others need `lavlay.com`
- **Remove quotes** - Some DNS providers auto-add quotes, remove them if doubled

---

## Step 4: Update Edge Function (1 minute)

Once your domain is verified, update the email sender address:

I'll do this for you automatically. Just let me know when your domain is verified!

Or you can do it manually:

1. Edit `supabase/functions/send-email/index.ts`
2. Find line 61:
   ```typescript
   from: from || 'LavLay <onboarding@resend.dev>',
   ```
3. Change it to:
   ```typescript
   from: from || 'LavLay <noreply@lavlay.com>',
   ```
4. Redeploy:
   ```bash
   npx supabase functions deploy send-email
   ```

---

## Step 5: Test with Any Email (1 minute)

After verification and updating the Edge Function:

1. Sign up on https://lavlay.com with **any email address**
2. Check that email's inbox
3. You should receive the welcome email!

---

## 🔍 Troubleshooting

### Issue: "Records not found"
**Solution**: DNS changes can take time. Wait 15-30 minutes and try verifying again.

### Issue: "SPF record already exists"
**Solution**:
- Find the existing SPF record
- Update it to include: `include:_spf.resend.com`
- Example: `v=spf1 include:_spf.google.com include:_spf.resend.com ~all`

### Issue: "DKIM verification failed"
**Solution**:
- Make sure you copied the FULL DKIM value (it's very long)
- Remove any quotes if doubled: `"p=..."` should be `p=...`
- Check if your DNS provider requires `resend._domainkey` or just `resend`

### Issue: Can't find DNS settings
**Solution**: Tell me your domain registrar (where you bought lavlay.com) and I'll provide specific instructions.

---

## 📊 Check DNS Propagation

Use these tools to verify your DNS records are live:

1. **MXToolbox**: https://mxtoolbox.com/SuperTool.aspx
   - Enter: `lavlay.com`
   - Check TXT records

2. **Google DNS Checker**: https://dns.google/
   - Query: `lavlay.com`
   - Type: TXT

3. **Command Line** (if you prefer):
   ```bash
   # Check SPF
   nslookup -type=TXT lavlay.com

   # Check DKIM
   nslookup -type=TXT resend._domainkey.lavlay.com

   # Check DMARC
   nslookup -type=TXT _dmarc.lavlay.com
   ```

---

## ✅ Success Checklist

- [ ] Added domain `lavlay.com` in Resend dashboard
- [ ] Copied all 3 DNS records (SPF, DKIM, DMARC)
- [ ] Added all 3 records to domain registrar
- [ ] Waited for DNS propagation (2-30 minutes)
- [ ] Clicked "Verify Records" in Resend
- [ ] Domain shows as "Verified" with green checkmark
- [ ] Updated Edge Function sender address
- [ ] Redeployed Edge Function
- [ ] Tested with any email address

---

## 🎯 Next Steps

**Tell me when you've:**
1. Added the DNS records in your domain registrar
2. The domain is showing as "Verified" in Resend

Then I'll:
1. Update the Edge Function automatically
2. Redeploy it
3. Test sending to any email address

---

## 📞 Need Help?

**If you're stuck**, tell me:
1. Which domain registrar you use (Cloudflare, Namecheap, GoDaddy, etc.)
2. What error message you see in Resend
3. Screenshot of your DNS records (optional)

I'll provide specific step-by-step instructions for your registrar!

---

## 🚀 After Verification

Once verified, you'll be able to:
- ✅ Send emails to **any user** who signs up
- ✅ Use professional sender: `noreply@lavlay.com`
- ✅ Better email deliverability (less likely to be marked as spam)
- ✅ Custom reply-to addresses
- ✅ Send up to **3,000 emails/month** on free tier
- ✅ Send up to **100 emails/day** on free tier

**Let's get started! Go to https://resend.com/domains and add lavlay.com** 🎉
