# API Key Rotation Checklist

**Priority:** CRITICAL - Do this before public launch
**Estimated Time:** 15-30 minutes

---

## Pre-Rotation Steps

- [ ] Make sure you have access to all dashboards (Paystack, Cloudflare, Supabase)
- [ ] Note down the current keys (in case you need to rollback)
- [ ] Schedule a low-traffic time for rotation (if already live)

---

## 1. Paystack API Keys

### Generate New Keys
- [ ] Go to [Paystack Dashboard](https://dashboard.paystack.com)
- [ ] Navigate to **Settings** → **API Keys & Webhooks**
- [ ] Copy the new **Secret Key** (starts with `sk_live_` or `sk_test_`)
- [ ] Copy the new **Public Key** (starts with `pk_live_` or `pk_test_`)

### Update Supabase Edge Functions
- [ ] Go to [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Select your project → **Settings** → **Edge Functions** → **Secrets**
- [ ] Update `PAYSTACK_SECRET_KEY` with the new secret key
- [ ] Click **Save**

### Update Environment Variables
- [ ] Open `.env` file in your project
- [ ] Update `VITE_PAYSTACK_PUBLIC_KEY` with the new public key
- [ ] Save the file

### Verify Paystack
- [ ] Test a payment flow (subscription or deposit)
- [ ] Check Paystack dashboard for the test transaction
- [ ] Confirm webhook is receiving events

---

## 2. Cloudflare R2 Credentials

### Generate New API Token
- [ ] Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
- [ ] Navigate to **R2** → **Manage R2 API Tokens**
- [ ] Click **Create API Token**
- [ ] Set permissions: **Object Read & Write**
- [ ] Select your bucket(s)
- [ ] Click **Create API Token**
- [ ] Copy the **Access Key ID**
- [ ] Copy the **Secret Access Key** (shown only once!)

### Update Supabase Edge Functions
- [ ] Go to Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
- [ ] Update `R2_ACCESS_KEY_ID` with the new Access Key ID
- [ ] Update `R2_SECRET_ACCESS_KEY` with the new Secret Access Key
- [ ] Click **Save**

### Verify R2 Uploads
- [ ] Test uploading an avatar image
- [ ] Test uploading a post image
- [ ] Test uploading a video/reel
- [ ] Confirm files appear in R2 bucket

---

## 3. Post-Rotation Cleanup

### Revoke Old Keys
- [ ] **Paystack:** Go to API Keys page and regenerate (this invalidates old keys)
- [ ] **Cloudflare R2:** Delete the old API token from the tokens list

### Final Verification
- [ ] Test full signup flow (creates user, sends welcome email)
- [ ] Test creating a post with images
- [ ] Test uploading a reel
- [ ] Test making a payment/subscription
- [ ] Test withdrawal request (if applicable)

---

## Troubleshooting

### Uploads failing after rotation?
1. Check R2 token has correct permissions (Object Read & Write)
2. Verify bucket name matches in Edge Function
3. Check Supabase Edge Function logs for errors

### Payments failing after rotation?
1. Verify you're using the correct environment (live vs test)
2. Check webhook URL is still configured in Paystack
3. Review Supabase Edge Function logs

### Need to rollback?
1. Re-enter the old keys in Supabase secrets
2. Update `.env` with old public key
3. Redeploy if necessary

---

## Security Best Practices

- Never commit API keys to git
- Use different keys for development and production
- Rotate keys periodically (every 3-6 months)
- Monitor for unauthorized usage in dashboards
- Enable 2FA on all service accounts

---

**Completed by:** _______________
**Date:** _______________
