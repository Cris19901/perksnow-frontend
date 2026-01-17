# Quick Deploy to Vercel - LavLay

## 🚀 FASTEST PATH TO PRODUCTION (15 minutes)

---

## Option 1: Deploy via Vercel CLI (Fastest - 5 minutes)

### Step 1: Install Vercel CLI (if not installed)
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
- Choose login method (Email, GitHub, GitLab, etc.)
- Verify your email/account

### Step 3: Deploy to Production
```bash
cd "c:\Users\FADIPE TIMOTHY\OneDrive\Documents\perknowv2-latest"
vercel --prod
```

**Follow the prompts:**
```
? Set up and deploy? [Y/n] Y
? Which scope? Select your account
? Link to existing project? [y/N] N
? What's your project's name? lavlay
? In which directory is your code located? ./
? Want to override settings? [y/N] N
```

### Step 4: Add Environment Variables
After deployment, the CLI will give you a URL. Now add environment variables:

```bash
# Set Supabase URL
vercel env add VITE_SUPABASE_URL production

# When prompted, paste:
https://kswknblwjlkgxgvypkmo.supabase.co

# Set Supabase Anon Key
vercel env add VITE_SUPABASE_ANON_KEY production

# When prompted, paste:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY

# Set R2 variables (for image storage)
vercel env add VITE_R2_ACCOUNT_ID production
# Paste: 7fc60b39d74e624471954b8c1b1ea3cd

vercel env add VITE_R2_ACCESS_KEY_ID production
# Paste: a0b67fd99aac629e672f3c7a9142873b

vercel env add VITE_R2_SECRET_ACCESS_KEY production
# Paste: 1bd4dbd0d1f022ab7f13ecbf77823d79d991fd9a9e1230da8f95e9d48506a0dc

vercel env add VITE_R2_BUCKET_NAME production
# Paste: perksnow-media-dev

vercel env add VITE_R2_PUBLIC_URL production
# Paste: https://pub-1d0841e73f5440d5b451286753184fb0.r2.dev

# OPTIONAL: Add Paystack key when ready
# vercel env add VITE_PAYSTACK_PUBLIC_KEY production
# Paste: pk_test_your_key_here
```

### Step 5: Redeploy with Environment Variables
```bash
vercel --prod
```

**Done!** Your app is live. You'll get a URL like:
```
https://lavlay-xxx.vercel.app
```

---

## Option 2: Deploy via Vercel Dashboard (10 minutes)

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/login
2. Sign up or log in with GitHub/GitLab/Email

### Step 2: Import Git Repository (If using Git)
**If your project is on GitHub:**
1. Click "Add New" → "Project"
2. Click "Import Git Repository"
3. Select your repository
4. Click "Import"

**If your project is NOT on GitHub:**
1. Initialize Git in your project:
```bash
cd "c:\Users\FADIPE TIMOTHY\OneDrive\Documents\perknowv2-latest"
git init
git add .
git commit -m "Initial commit - LavLay MVP"
```

2. Create GitHub repository:
   - Go to https://github.com/new
   - Name: `lavlay`
   - Click "Create repository"

3. Push to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/lavlay.git
git branch -M main
git push -u origin main
```

4. Return to Vercel and import the repository

### Step 3: Configure Build Settings
Vercel will auto-detect settings from `vercel.json`, but verify:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

### Step 4: Add Environment Variables
Before deploying, click "Environment Variables" and add:

| Name | Value | Environment |
|------|-------|-------------|
| VITE_SUPABASE_URL | https://kswknblwjlkgxgvypkmo.supabase.co | Production, Preview, Development |
| VITE_SUPABASE_ANON_KEY | eyJhbGci... (full key) | Production, Preview, Development |
| VITE_R2_ACCOUNT_ID | 7fc60b39d74e624471954b8c1b1ea3cd | Production, Preview, Development |
| VITE_R2_ACCESS_KEY_ID | a0b67fd99aac629e672f3c7a9142873b | Production, Preview, Development |
| VITE_R2_SECRET_ACCESS_KEY | 1bd4dbd0d1f022ab7f13ecbf77823d79d991fd9a9e1230da8f95e9d48506a0dc | Production, Preview, Development |
| VITE_R2_BUCKET_NAME | perksnow-media-dev | Production, Preview, Development |
| VITE_R2_PUBLIC_URL | https://pub-1d0841e73f5440d5b451286753184fb0.r2.dev | Production, Preview, Development |

### Step 5: Deploy
Click "Deploy"

Wait 2-3 minutes for build and deployment.

**Done!** You'll get a production URL.

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### 1. Visit Your Production URL
Open the URL Vercel gives you (e.g., https://lavlay-xxx.vercel.app)

### 2. Quick Smoke Test (5 minutes)
- [ ] Page loads without errors
- [ ] Sign up works
- [ ] Login works
- [ ] Create a post with image
- [ ] Feed displays posts
- [ ] Images load correctly
- [ ] Like/comment works
- [ ] Profile page loads

### 3. Check Browser Console
- Press F12
- Look for errors (should be minimal or none)
- Check Network tab for failed requests

### 4. Test on Mobile
- Open production URL on your phone
- Test basic features
- Verify responsive layout

---

## 🎨 CUSTOM DOMAIN (Optional)

### Add Custom Domain to Vercel:
1. Go to Project Settings → Domains
2. Add your domain (e.g., lavlay.com)
3. Update DNS records at your domain registrar:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. Wait 5-60 minutes for DNS propagation
5. SSL certificate auto-generated by Vercel

---

## 📊 MONITORING & ANALYTICS

### Enable Vercel Analytics (Free)
1. Go to Project → Analytics
2. Click "Enable Analytics"
3. Monitor page views, performance, errors

### Enable Web Vitals
1. Go to Project → Speed Insights
2. Click "Enable Speed Insights"
3. Track Core Web Vitals (LCP, FID, CLS)

---

## 🚨 TROUBLESHOOTING

### Issue: Build Fails
**Solution**: Check build logs in Vercel dashboard
- Look for TypeScript errors
- Check missing dependencies
- Verify environment variables are set

### Issue: Page Loads but Features Don't Work
**Solution**: Check environment variables
1. Go to Project Settings → Environment Variables
2. Verify all VITE_ variables are set
3. Redeploy if variables were added after deployment

### Issue: Images Don't Upload
**Solution**: Check R2 configuration
- Verify R2 environment variables are correct
- Check R2 bucket exists and is accessible
- Test R2 connection in development first

### Issue: Subscription/Payment Doesn't Work
**Solution**: Add Paystack key
- Go to Vercel dashboard
- Add VITE_PAYSTACK_PUBLIC_KEY environment variable
- Redeploy

---

## 📝 DEPLOYMENT CHECKLIST

### Before Deploy
- [x] Production build succeeds locally (`npm run build`)
- [x] Environment variables documented
- [ ] Database migrations run on production Supabase
- [ ] Storage buckets exist in production Supabase

### During Deploy
- [ ] Vercel project created
- [ ] Git repository linked (if using Git)
- [ ] Environment variables added
- [ ] Build completes successfully
- [ ] Production URL received

### After Deploy
- [ ] Production site loads
- [ ] Sign up/login works
- [ ] Post creation works
- [ ] Images display correctly
- [ ] No console errors
- [ ] Mobile layout works
- [ ] Smoke tests pass

---

## 🎉 SUCCESS!

Once deployed, your LavLay social platform is **LIVE** and accessible worldwide!

**Production URL**: Check Vercel dashboard or CLI output

**Next Steps:**
1. ✅ Run full smoke tests on production
2. 📱 Test on multiple devices
3. 🔍 Monitor error logs for 24 hours
4. 📢 Share with beta users
5. 🎊 Celebrate your launch!

---

## 🔄 CONTINUOUS DEPLOYMENT

### Automatic Deployments (If using Git)
Once connected to Git:
- Every push to `main` branch auto-deploys to production
- Every push to other branches creates preview deployments
- Pull requests get unique preview URLs

### Manual Redeployment
```bash
# Redeploy current version
vercel --prod

# Or use Vercel Dashboard:
# Deployments → Latest → Redeploy
```

---

**Your production URL will be live in 5-15 minutes!** 🚀
