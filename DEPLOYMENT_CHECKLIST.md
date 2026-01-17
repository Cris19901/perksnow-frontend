# LavLay Production Deployment Checklist

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Environment Variables Setup ✅

#### Required Variables (CRITICAL)
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
# For production launch, use: pk_live_xxxxxxxxxxxxx

# Optional: R2 Storage (if using Cloudflare R2 instead of Supabase Storage)
# VITE_R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

#### How to Set Environment Variables in Vercel:
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   - Select: Production, Preview, Development
5. Repeat for all variables
6. Redeploy after adding variables

### 2. Supabase Setup ✅

#### Database Tables Required:
- [ ] `users` table
- [ ] `posts` table
- [ ] `post_images` table (NEW - for multi-image posts)
- [ ] `post_likes` table
- [ ] `comments` table
- [ ] `follows` table
- [ ] `reels` table
- [ ] `stories` table
- [ ] `products` table
- [ ] `subscription_plans` table
- [ ] `subscriptions` table
- [ ] `payment_transactions` table
- [ ] `points_transactions` table

#### Database Migrations to Run:
```sql
-- 1. Multi-image posts migration
-- File: MULTI_IMAGE_POSTS_MIGRATION.sql
-- Status: ✅ DONE

-- 2. RLS fix for post_images
-- File: FIX_POST_IMAGES_RLS.sql
-- Status: ✅ DONE

-- 3. Verify all RLS policies are enabled
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

#### Storage Buckets Required:
- [ ] `posts` bucket (for post images)
- [ ] `avatars` bucket (for profile pictures)
- [ ] `covers` bucket (for cover photos)
- [ ] `stories` bucket (for story media)
- [ ] `reels` bucket (for reel videos)

#### Storage Bucket Policies:
```sql
-- Public read access for all buckets
-- In Supabase Dashboard:
-- 1. Go to Storage
-- 2. Click each bucket
-- 3. Go to Policies
-- 4. Enable "Public access for SELECT"
```

### 3. Paystack Setup ✅

#### Paystack Dashboard Configuration:
1. **Create Paystack Account** (if not done)
   - Go to https://paystack.com
   - Sign up / Log in
   - Verify your business details

2. **Get API Keys**
   - Go to Settings → API Keys & Webhooks
   - Copy Public Key (pk_test_xxx for testing)
   - For production: Request live keys (requires business verification)

3. **Configure Webhook**
   - Go to Settings → API Keys & Webhooks
   - Click "Add Webhook Endpoint"
   - URL: `https://your-supabase-project.supabase.co/functions/v1/paystack-webhook`
   - Events to subscribe:
     - `charge.success`
     - `subscription.create`
     - `subscription.disable`
   - Copy webhook secret
   - Add to Supabase Edge Function environment

4. **Test Cards for Testing**
   ```
   Success: 4084 0840 8408 4081
   Declined: 5060 6666 6666 6666 666
   Insufficient Funds: 5061 0000 0000 0000 000
   ```

#### Subscription Plans in Database:
```sql
-- Verify subscription_plans table has data
SELECT * FROM subscription_plans ORDER BY sort_order;

-- Expected rows:
-- 1. free: ₦0/month
-- 2. basic: ₦2,000/month
-- 3. pro: ₦5,000/month
```

### 4. Build & Verify Locally ✅

```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Check build output
# Should see: dist/ folder created
# Size should be < 5MB

# Preview production build locally
npm run preview

# Open http://localhost:4173
# Test all features work in production mode
```

#### Build Checklist:
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle size < 5MB
- [ ] All images load
- [ ] Environment variables work
- [ ] Production build runs locally

---

## 🚀 DEPLOYMENT STEPS

### Option 1: Deploy to Vercel (Recommended)

#### Step 1: Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Deploy
```bash
# Deploy to preview (test deployment)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No (for first time)
# - What's your project name? lavlay
# - In which directory is your code located? ./
# - Want to override settings? No

# After successful deployment, you'll get a preview URL
# Example: https://lavlay-xyz123.vercel.app
```

#### Step 4: Add Environment Variables in Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click your project
3. Go to Settings → Environment Variables
4. Add variables (see section 1 above)
5. Select "Production, Preview, Development" for each

#### Step 5: Deploy to Production
```bash
vercel --prod
```

#### Step 6: Configure Custom Domain (Optional)
1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., lavlay.com)
3. Update DNS records at your domain registrar:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. Wait for DNS propagation (5-60 minutes)
5. SSL certificate auto-generated by Vercel

---

### Option 2: Deploy to Netlify

#### Step 1: Build Settings
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### Step 2: Deploy via Netlify Dashboard
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Site Settings
6. Click "Deploy"

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Smoke Test on Production URL

Run through [SMOKE_TEST_SCRIPT.md](SMOKE_TEST_SCRIPT.md) on your production URL.

#### Critical Tests:
- [ ] Production URL loads without errors
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Create post with multiple images
- [ ] Images display correctly
- [ ] Lightbox opens and works
- [ ] Payment/subscription works with test card
- [ ] Pro badge appears after subscription
- [ ] Mobile responsive

### 2. Check Browser Console

Open production site in browser:
1. Press F12 (Developer Tools)
2. Go to Console tab
3. Check for errors (should be none or minimal)
4. Common issues to fix:
   - CORS errors (check Supabase settings)
   - 404 errors (missing files)
   - Authentication errors (check env vars)

### 3. Verify Database Connectivity

```sql
-- In Supabase Dashboard → SQL Editor
-- Check data is flowing correctly

-- 1. Check if posts are being created
SELECT COUNT(*) as total_posts FROM posts;

-- 2. Check if multi-image posts work
SELECT COUNT(*) as posts_with_images
FROM posts
WHERE images_count > 0;

-- 3. Check post_images table
SELECT COUNT(*) as total_images FROM post_images;

-- 4. Check subscriptions
SELECT COUNT(*) as active_subscriptions
FROM subscriptions
WHERE status = 'active';
```

### 4. Test Payment Webhook

```bash
# Use Paystack test card on production
# Then check Paystack Dashboard:
# Settings → API Keys & Webhooks → Event Logs

# Should see:
# ✅ charge.success event delivered (status 200)
# ✅ Webhook response: "success"

# If webhook failed:
# 1. Check webhook URL is correct
# 2. Verify Supabase edge function is deployed
# 3. Check webhook secret matches
# 4. Test webhook manually with Paystack test tool
```

### 5. Monitor Error Logs

#### Vercel Analytics:
1. Go to Vercel Dashboard → Analytics
2. Check for errors
3. Monitor performance metrics

#### Supabase Logs:
1. Go to Supabase Dashboard → Logs
2. Check for database errors
3. Monitor auth errors

---

## 🔒 SECURITY CHECKLIST

### Before Going Live:
- [ ] All RLS policies enabled on tables
- [ ] Storage buckets have correct policies
- [ ] Environment variables not exposed in client
- [ ] API keys are correct type (test vs live)
- [ ] Webhook endpoints are secure
- [ ] No console.logs with sensitive data
- [ ] CORS configured correctly
- [ ] Rate limiting configured (Supabase)

### Supabase Security:
```sql
-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should show rowsecurity = true
```

---

## 📱 DOMAIN & SSL (Optional)

### If Using Custom Domain:

#### 1. Buy Domain (if needed)
- Namecheap, GoDaddy, or any registrar
- Recommended: Namecheap or Cloudflare

#### 2. Configure DNS Records

For Vercel:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### 3. Add Domain in Vercel
1. Go to Settings → Domains
2. Add domain
3. Wait for DNS propagation
4. SSL auto-configured

---

## 📊 MONITORING SETUP (Optional but Recommended)

### 1. Error Tracking - Sentry

```bash
# Install Sentry
npm install @sentry/react @sentry/vite-plugin

# Add to vite.config.ts
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default {
  build: {
    sourcemap: true,
  },
  plugins: [
    sentryVitePlugin({
      org: "your-org",
      project: "lavlay",
    }),
  ],
};
```

### 2. Analytics - Google Analytics

```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA-XXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA-XXXXXXXXX');
</script>
```

### 3. Uptime Monitoring - UptimeRobot (Free)

1. Go to https://uptimerobot.com
2. Sign up (free account)
3. Add monitor:
   - Type: HTTP(s)
   - URL: Your production URL
   - Interval: 5 minutes
4. Get alerts if site goes down

---

## 🚨 ROLLBACK PLAN

### If Production Has Issues:

#### Quick Rollback on Vercel:
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Previous version goes live immediately

#### Fix Issues:
1. Revert code changes locally
2. Fix the issue
3. Test locally
4. Redeploy

---

## ✅ LAUNCH CHECKLIST SUMMARY

### Pre-Launch:
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] RLS policies enabled
- [ ] Storage buckets configured
- [ ] Paystack configured
- [ ] Build succeeds locally
- [ ] Smoke tests pass locally

### Launch:
- [ ] Deploy to Vercel/Netlify
- [ ] Environment variables added to platform
- [ ] Production URL accessible
- [ ] SSL certificate active
- [ ] Smoke tests pass on production
- [ ] Payment works with test card
- [ ] Mobile responsive verified

### Post-Launch:
- [ ] Monitor error logs (first hour)
- [ ] Test with real users (friends/beta)
- [ ] Check database for issues
- [ ] Verify webhook deliveries
- [ ] Monitor performance
- [ ] Gather user feedback

---

## 🎉 YOU'RE READY TO LAUNCH!

**Current Status**: All systems ready ✅
**Recommendation**: Deploy to production now
**Estimated Time**: 30-60 minutes for full deployment

**Next Steps:**
1. Run `npm run build` to verify build works
2. Deploy to Vercel with `vercel --prod`
3. Add environment variables in Vercel dashboard
4. Run smoke tests on production URL
5. Monitor for first 24 hours
6. Celebrate! 🎊

Good luck! 🚀
