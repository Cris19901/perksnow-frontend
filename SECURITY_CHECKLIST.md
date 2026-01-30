# Pre-Launch Security Checklist

## CRITICAL: API Key Rotation (DO THIS NOW)

### Step 1: Rotate Paystack Keys
1. Go to https://dashboard.paystack.com/#/settings/developers
2. Click "Regenerate" on Secret Key
3. Update in Vercel environment variables:
   - Go to https://vercel.com/dashboard
   - Select your project → Settings → Environment Variables
   - Update `PAYSTACK_SECRET_KEY` with new value
   - Redeploy

### Step 2: Rotate Cloudflare R2 Keys
1. Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Delete old token
3. Create new token with same permissions
4. Update in Vercel:
   - `R2_ACCOUNT_ID` (keep same)
   - `R2_ACCESS_KEY_ID` (new)
   - `R2_SECRET_ACCESS_KEY` (new)
   - Redeploy

### Step 3: Verify Supabase Keys
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Verify you're using ANON key (public) in frontend
3. Service Role key should ONLY be in backend/Vercel secrets

### Step 4: Clean Git History (IMPORTANT)
DO NOT commit .env.local files. They should only be local.
Check .gitignore has:
```
.env
.env.local
.env*.local
```

## Verification
- [ ] Paystack secret key rotated
- [ ] Cloudflare R2 keys rotated
- [ ] Supabase keys verified (anon in frontend, service in backend)
- [ ] .env.local NOT in git
- [ ] Vercel environment variables updated
- [ ] Test payment flow after rotation
- [ ] Test image upload after R2 key rotation
