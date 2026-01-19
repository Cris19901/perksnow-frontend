# Deployment Cheat Sheet - Quick Reference

## 🚀 Normal Code Update (No Database Changes)

```bash
# 1. Make changes in feature branch
git checkout -b feature/my-feature
# ... edit files ...

# 2. Test locally
npm run dev
npm run build  # MUST succeed!

# 3. Deploy to production
git checkout main
git merge feature/my-feature
git push origin main

# 4. Wait 2-3 minutes, then test
# Visit: https://www.lavlay.com
```

---

## 🗄️ Code Update WITH Database Changes

```bash
# 1. Make changes
git checkout -b feature/my-feature
# ... edit files ...

# 2. Test locally
npm run dev
npm run build

# 3. Deploy code first
git checkout main
git merge feature/my-feature
git push origin main

# 4. Run database migration
# Go to: Supabase Dashboard → SQL Editor
# Paste migration SQL
# Click "Run"

# 5. Test on production
```

**Example Migration:**
```sql
-- Always use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Use CONCURRENTLY for indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_user
ON bookmarks(user_id);

-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users manage own bookmarks"
ON bookmarks FOR ALL
USING (auth.uid() = user_id);
```

---

## 🔥 Emergency Rollback

### Option 1: Vercel Dashboard (30 seconds)
1. Go to https://vercel.com/dashboard
2. Your project → Deployments
3. Find previous working version
4. Click "..." → "Promote to Production"

### Option 2: Git Revert (2 minutes)
```bash
git revert HEAD
git push origin main
```

---

## ✅ Safe Database Change Patterns

### Adding Column
```sql
-- ✅ SAFE
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- ❌ UNSAFE
ALTER TABLE posts
ADD COLUMN views INTEGER NOT NULL;  -- Fails on existing rows!
```

### Creating Table
```sql
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... columns with DEFAULT values
);
```

### Adding Index
```sql
-- Use CONCURRENTLY to avoid locking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name
ON table_name(column_name);
```

### Renaming Column (Multi-Phase)
```sql
-- Week 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
UPDATE users SET full_name = name;

-- Week 2: Deploy code using both columns

-- Week 3: Drop old column
ALTER TABLE users DROP COLUMN name;
```

---

## 🧪 Pre-Deployment Testing

```bash
# Run these EVERY TIME before deploying
npm run dev        # Test locally
npm run test       # Run tests
npm run build      # MUST succeed!
npx vite preview   # Test production build
```

---

## 📊 Post-Deployment Checks

**Immediately (0-5 min):**
- [ ] Visit https://www.lavlay.com
- [ ] Login works
- [ ] Create post works
- [ ] No errors in console (F12)

**24 Hours:**
- [ ] Check Vercel logs
- [ ] Check Supabase logs
- [ ] Monitor user feedback

---

## 🆘 Common Issues

### Build Fails
```bash
# Check what's wrong
npm run build

# Fix TypeScript errors
npx tsc --noEmit

# Fix then try again
git add .
git commit -m "Fix build errors"
git push origin main
```

### Site Shows Old Version
```bash
# 1. Hard refresh browser
# Ctrl + Shift + R (Windows)
# Cmd + Shift + R (Mac)

# 2. Check Vercel deployment status
# Dashboard → Should show "Ready"

# 3. Wait 2-3 minutes for CDN update
```

### Database Migration Failed
```sql
-- Check what went wrong
-- Supabase Dashboard → Database → Logs

-- Fix and re-run migration
-- Add IF NOT EXISTS to avoid duplicates
```

---

## 🔐 Important SQL Keywords

Always use these:
- `IF NOT EXISTS` when creating
- `IF EXISTS` when dropping
- `CONCURRENTLY` for indexes on large tables
- `DEFAULT` values for new columns
- `ON DELETE CASCADE` for foreign keys

---

## 📱 Environment Variables

### Local (.env.local)
```
VITE_SUPABASE_URL=your-local-url
VITE_SUPABASE_ANON_KEY=your-local-key
```

### Production (Vercel Dashboard)
1. Go to: Vercel → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Redeploy for changes to take effect

---

## ⏰ Best Times to Deploy

- **Minor changes:** Anytime
- **Major changes:** Off-peak hours
  - Late night (11 PM - 5 AM your timezone)
  - Early morning (5 AM - 8 AM)
  - Avoid: Lunch time, evenings, weekends

---

## 📋 Deployment Checklist

Before deploying:
- [ ] Changes tested locally
- [ ] `npm run build` succeeds
- [ ] Database migration ready (if needed)
- [ ] Rollback plan prepared
- [ ] Know how to revert quickly

After deploying:
- [ ] Vercel shows "Ready"
- [ ] Site loads correctly
- [ ] Test critical features
- [ ] No console errors
- [ ] Monitor for 24 hours

---

## 🎯 Golden Rules

1. **NEVER** edit production database directly without testing first
2. **ALWAYS** make database changes backward compatible
3. **ALWAYS** use `IF NOT EXISTS` / `IF EXISTS`
4. **ALWAYS** test `npm run build` before pushing
5. **ALWAYS** monitor after deployment
6. **When in doubt:** Deploy to staging first

---

## 🔗 Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** [Your project URL]
- **Production Site:** https://www.lavlay.com
- **GitHub Repo:** https://github.com/Cris19901/perksnow-frontend

---

## 💡 Pro Tips

1. **Make small, frequent deploys** instead of large, rare ones
2. **Deploy one feature at a time** to isolate issues
3. **Keep migration scripts** in `migrations/` folder for reference
4. **Use feature flags** for experimental features
5. **Test on real data** (anonymized copy) before production
6. **Have monitoring** set up (error tracking, analytics)

---

**Remember: Better safe than sorry! Test thoroughly before deploying.** 🛡️
