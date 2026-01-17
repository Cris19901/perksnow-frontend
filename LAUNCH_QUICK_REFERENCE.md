# 🚀 LavLay Launch - Quick Reference Card

**Print or bookmark this page for quick access during launch**

---

## ⚡ FASTEST DEPLOYMENT (5 commands)

```bash
# 1. Deploy to Vercel
vercel --prod

# 2-7. Add environment variables (run each separately)
vercel env add VITE_SUPABASE_URL production
# Paste: https://kswknblwjlkgxgvypkmo.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY

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

# 8. Redeploy with variables
vercel --prod
```

**Done!** Your site is live in ~5 minutes.

---

## 📋 CRITICAL LINKS

| Resource | URL |
|----------|-----|
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Supabase Project** | https://kswknblwjlkgxgvypkmo.supabase.co |
| **Cloudflare R2** | https://dash.cloudflare.com/ |
| **Paystack Dashboard** | https://dashboard.paystack.com |

---

## 🧪 5-MINUTE SMOKE TEST

After deployment, test these in order:

1. **Load Site**: Open production URL
   - ✅ Page loads without errors
   - ✅ No console errors (F12)

2. **Sign Up**: Create new account
   - Email: test@example.com
   - Password: Test123456!
   - ✅ Account created

3. **Create Post**: Upload 3 images
   - ✅ Images upload
   - ✅ Post appears in feed

4. **View Lightbox**: Click an image
   - ✅ Lightbox opens
   - ✅ Zoom works (scroll wheel)
   - ✅ Navigation works (arrow keys)

5. **Social**: Like and comment
   - ✅ Like button works
   - ✅ Comment saves

**If all pass**: ✅ Launch successful!

---

## 🚨 COMMON ISSUES & FIXES

### Issue: Site loads but features don't work
**Fix**: Environment variables not set
```bash
# Check variables in Vercel dashboard
# Redeploy after adding variables
vercel --prod
```

### Issue: Images don't upload
**Fix**: R2 configuration
- Check R2 variables in Vercel
- Verify R2 bucket exists in Cloudflare
- Test R2 connection

### Issue: Build fails
**Fix**: Check build logs
- Look for TypeScript errors
- Check missing dependencies
- Verify Node version (18+)

### Issue: "Permission denied" errors
**Fix**: Database RLS policies
- Run VERIFY_DATABASE_SETUP.sql
- Check post_images table policies
- Verify storage bucket policies

---

## 📱 MOBILE TEST (2 minutes)

1. Open production URL on your phone
2. Sign up or login
3. Create post with 2 images
4. Tap image to open lightbox
5. Pinch to zoom
6. Swipe between images

**All working?** ✅ Mobile ready!

---

## 🔍 MONITORING CHECKLIST

### First Hour:
- [ ] Check Vercel deployment logs
- [ ] Monitor Supabase dashboard for errors
- [ ] Test all core features work
- [ ] Check browser console for errors

### First 24 Hours:
- [ ] Monitor user signups
- [ ] Check post creation rate
- [ ] Verify image upload success rate
- [ ] Look for repeated errors
- [ ] Gather user feedback

---

## 💡 ENVIRONMENT VARIABLES REFERENCE

### Required for Launch:
```env
VITE_SUPABASE_URL=https://kswknblwjlkgxgvypkmo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_R2_ACCOUNT_ID=7fc60b39d74e624471954b8c1b1ea3cd
VITE_R2_ACCESS_KEY_ID=a0b67fd99aac629e672f3c7a9142873b
VITE_R2_SECRET_ACCESS_KEY=1bd4dbd0d1f022ab7f13ecbf77823d79d991fd9a9e1230da8f95e9d48506a0dc
VITE_R2_BUCKET_NAME=perksnow-media-dev
VITE_R2_PUBLIC_URL=https://pub-1d0841e73f5440d5b451286753184fb0.r2.dev
```

### Optional (Add Later):
```env
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # For subscriptions
```

---

## 📞 EMERGENCY CONTACTS

### Vercel Support:
- Dashboard: https://vercel.com/help
- Docs: https://vercel.com/docs

### Supabase Support:
- Dashboard: https://supabase.com/dashboard/support
- Docs: https://supabase.com/docs

### Community:
- Vercel Discord: https://vercel.com/discord
- Supabase Discord: https://discord.supabase.com

---

## 🎯 SUCCESS INDICATORS

### Launch is successful if:
- ✅ Users can sign up and login
- ✅ Posts are created and appear in feed
- ✅ Images upload and display correctly
- ✅ Social features work (like, comment)
- ✅ Mobile layout is functional
- ✅ No critical errors in console

### Monitor these metrics:
- User signups per hour
- Posts created per hour
- Image upload success rate
- Error rate (aim for <5%)
- Page load time (aim for <3s)

---

## 🛠️ QUICK COMMANDS

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Redeploy current version
vercel --prod

# Open Vercel dashboard
vercel

# Check build locally
npm run build

# Preview production build
npm run build && npx serve -s build
```

---

## 📚 DOCUMENTATION INDEX

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [READY_TO_LAUNCH_SUMMARY.md](READY_TO_LAUNCH_SUMMARY.md) | Complete overview | Before launch |
| [QUICK_DEPLOY_VERCEL.md](QUICK_DEPLOY_VERCEL.md) | Deployment steps | During deployment |
| [SMOKE_TEST_SCRIPT.md](SMOKE_TEST_SCRIPT.md) | Testing procedures | After deployment |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Detailed checklist | Reference |
| [VERIFY_DATABASE_SETUP.sql](VERIFY_DATABASE_SETUP.sql) | Database verification | Before launch |
| [BUILD_VERIFICATION_REPORT.md](BUILD_VERIFICATION_REPORT.md) | Build details | Troubleshooting |
| [PRE_LAUNCH_ENV_CHECK.md](PRE_LAUNCH_ENV_CHECK.md) | Environment audit | Setup verification |

---

## ⏱️ TIMELINE ESTIMATE

| Phase | Time | Tasks |
|-------|------|-------|
| Pre-Deploy | 5 min | Review summary, check database |
| Deploy | 5 min | Run vercel commands |
| Configure | 5 min | Add environment variables |
| Test | 5-10 min | Run smoke tests |
| Monitor | 1 hour | Watch for errors |
| **Total** | **20-30 min** | **Ready to launch!** |

---

## 🎉 POST-LAUNCH CELEBRATION

Once deployed and tested:
1. ✅ Take a screenshot of your live site
2. ✅ Share with friends/beta users
3. ✅ Post on social media
4. ✅ Gather feedback
5. ✅ Plan week 1 improvements

**You did it!** 🚀

---

## 🔄 ROLLBACK PROCEDURE

If something goes wrong:

### Via Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Previous version goes live immediately

### Via CLI:
```bash
vercel rollback
```

---

## 📊 LAUNCH DAY CHECKLIST

### Morning of Launch:
- [ ] Run database verification SQL
- [ ] Check storage buckets exist
- [ ] Review environment variables
- [ ] Run local smoke tests

### During Launch:
- [ ] Deploy to Vercel
- [ ] Add environment variables
- [ ] Run production smoke tests
- [ ] Test on mobile

### After Launch:
- [ ] Monitor error logs (first hour)
- [ ] Check analytics
- [ ] Test with real users
- [ ] Document any issues

### End of Day:
- [ ] Review metrics
- [ ] Plan bug fixes
- [ ] Celebrate! 🎊

---

**Keep this page open during launch for quick reference!**

**Production URL**: (Add after deployment) _______________________

**Deployment Time**: (Record) ___:___ on _____/_____/_____

**First User Signup**: (Record) ___:___

**Status**: ⬜ Deployed ⬜ Tested ⬜ Monitoring ⬜ Live!

---

**Good luck!** 🚀 You're ready to launch LavLay to the world!
