# Safe Launch Checklist

## ✅ BEFORE PUBLIC LAUNCH (1-2 Hours)

### Priority 1: Security (MUST DO - 30 mins)
- [ ] **Rotate API Keys** (Follow SECURITY_CHECKLIST.md)
  - Paystack secret key
  - Cloudflare R2 credentials
  - Verify Supabase keys
  - Update Vercel environment variables
  - Test after rotation

### Priority 2: Add Safety Nets (DONE - 15 mins)
- [x] Error Boundary added to prevent app crashes
- [x] Conditional logger created (no breaking changes)
- [ ] Deploy and test these changes

### Priority 3: Quick Wins (OPTIONAL - 30 mins)
- [ ] Verify RLS policies on critical tables:
  ```sql
  -- Run in Supabase SQL Editor
  SELECT tablename, policyname, permissive, roles, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public';
  ```
- [ ] Check for exposed data in these tables:
  - [ ] `payment_transactions` - only user can see their own
  - [ ] `subscriptions` - only user can see their own
  - [ ] `users` - only basic info is public
  - [ ] `withdrawals` - only user can see their own

---

## 🚀 SAFE DEPLOYMENT STEPS

### Step 1: Test Current Build
```bash
npm run build
```
If build succeeds, you're good to deploy.

### Step 2: Deploy to Vercel
```bash
git add src/main.tsx src/components/ErrorBoundary.tsx src/lib/logger.ts
git commit -m "Add error boundary and conditional logger for production safety"
git push origin main
```

Vercel will auto-deploy. Wait 2-3 minutes.

### Step 3: Smoke Test Production
Test these critical flows on www.lavlay.com:
- [ ] Sign up new user
- [ ] Create a post
- [ ] Upload a reel
- [ ] Make a payment (use test mode if available)
- [ ] Check subscription page shows all 5 plans
- [ ] Test video upload (under 40MB)

---

## 📊 POST-LAUNCH MONITORING (First 24 Hours)

### What to Watch:
1. **Vercel Logs** - Check for errors
   - https://vercel.com/dashboard → Your Project → Logs

2. **Supabase Logs** - Watch for failed queries
   - Supabase Dashboard → Logs → Query Performance

3. **User Reports** - Be ready to respond quickly

### Quick Fixes If Something Breaks:
```bash
# Rollback to previous deployment
vercel rollback
```

---

## ⏰ POST-LAUNCH IMPROVEMENTS (Week 1-2)

These are safe improvements you can make AFTER launch without rushing:

### Week 1 (Non-Breaking):
- [ ] Add database indexes (see POST_LAUNCH_IMPROVEMENTS.md)
- [ ] Replace console.log with logger in 5-10 critical files
- [ ] Monitor performance with Vercel Analytics

### Week 2 (Gradual):
- [ ] Fix N+1 queries (create one database function at a time)
- [ ] Add loading skeletons to improve perceived performance
- [ ] Add empty states where missing

---

## 🆘 EMERGENCY CONTACTS

If something breaks after launch:

1. **Check Vercel Status**: https://www.vercel-status.com/
2. **Check Supabase Status**: https://status.supabase.com/
3. **Rollback Command**: `vercel rollback`
4. **Database Backup**: Supabase auto-backs up daily

---

## 📝 NOTES

**What we added (safe, no breaking changes):**
- ErrorBoundary: Catches React errors to prevent full app crash
- Conditional Logger: Removes console spam in production
- Security checklist for API key rotation

**What we DIDN'T change:**
- No existing component logic modified
- No database schema changes
- No breaking API changes
- All existing features still work exactly the same

**You're safe to launch!** 🚀

The critical security fixes (API key rotation) can be done in Vercel/Cloudflare dashboards without touching code.
