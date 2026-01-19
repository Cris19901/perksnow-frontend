# Production Update Guide - Safe Deployment Practices

## Overview

This guide explains how to safely make updates to your production LavLay application, including code changes, database alterations, and environment configurations.

---

## Table of Contents

1. [Quick Summary](#quick-summary)
2. [Deployment Workflow](#deployment-workflow)
3. [Database Migration Strategy](#database-migration-strategy)
4. [Zero-Downtime Deployments](#zero-downtime-deployments)
5. [Rollback Procedures](#rollback-procedures)
6. [Emergency Procedures](#emergency-procedures)

---

## Quick Summary

### Your Current Setup
- **Frontend:** React + Vite on Vercel
- **Database:** Supabase (PostgreSQL)
- **Git:** GitHub with auto-deploy from `main` branch

### Golden Rules for Production Updates

1. **NEVER** make changes directly in production
2. **ALWAYS** test on staging first (or at least locally)
3. **ALWAYS** make database changes backward compatible
4. **ALWAYS** have a rollback plan
5. **ALWAYS** use `IF NOT EXISTS` / `IF EXISTS` in SQL

### Quick Workflow

```bash
# 1. Make changes locally
git checkout -b feature/my-feature
# ... make changes ...

# 2. Test locally
npm run dev
npm run build

# 3. Deploy to production
git checkout main
git merge feature/my-feature
git push origin main  # Vercel auto-deploys

# 4. Run database migration (if needed)
# Go to Supabase Dashboard → SQL Editor → Run migration

# 5. Monitor for 24 hours
```

---

## Deployment Workflow

### Recommended Branch Strategy

```
main (production) ← Auto-deploys to www.lavlay.com
  ↑
  └── staging (optional but recommended)
       ↑
       └── feature/* (your work)
```

### Safe Update Process

#### Step 1: Create Feature Branch

```bash
# Create new branch for your feature
git checkout -b feature/add-bookmarks

# Make your changes
# ... edit files ...

# Test locally
npm run dev

# Commit changes
git add .
git commit -m "Add bookmarks feature"
```

#### Step 2: Test Thoroughly

```bash
# Run tests
npm run test

# Build for production
npm run build

# If build succeeds, you're good to go
```

#### Step 3: Deploy to Production

```bash
# Merge to main
git checkout main
git merge feature/add-bookmarks

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

#### Step 4: Monitor Deployment

1. Visit Vercel Dashboard: https://vercel.com/dashboard
2. Watch deployment progress (usually 1-3 minutes)
3. Once "Ready", test on production: https://www.lavlay.com
4. Monitor error logs for 24 hours

---

## Database Migration Strategy

### Critical Rules

1. **ALWAYS ADD, NEVER REMOVE** (at least initially)
2. **Make changes backward compatible**
3. **Use `IF NOT EXISTS` / `IF EXISTS`**
4. **Test on copy of production data first**
5. **Create rollback script**

### Safe Migration Pattern

#### Example: Adding a New Column

**✅ SAFE:**
```sql
-- Add column with default value
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Existing rows get default value (false)
-- Old code continues to work
-- New code can use the column
```

**❌ UNSAFE:**
```sql
-- DON'T add required columns without defaults
ALTER TABLE posts
ADD COLUMN is_featured BOOLEAN NOT NULL;  -- WILL FAIL!
```

#### Example: Creating a New Table

```sql
-- Always use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Add index (use CONCURRENTLY for zero-downtime)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_user_id
ON bookmarks(user_id);

-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own bookmarks"
ON bookmarks FOR SELECT
USING (auth.uid() = user_id);
```

### How to Run Migrations

#### Option 1: Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Paste your migration SQL
5. **Review carefully** - this is production!
6. Click "Run"
7. Check results

#### Option 2: Supabase CLI (For complex migrations)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Create migration file
supabase migration new add_bookmarks_table

# Edit: supabase/migrations/XXXXX_add_bookmarks_table.sql
# Add your SQL migration

# Test locally
supabase db reset

# Push to production
supabase db push
```

### Migration Checklist

Before running migration in production:

- [ ] Tested on local database
- [ ] Uses `IF NOT EXISTS` / `IF EXISTS`
- [ ] New columns have default values
- [ ] Indexes use `CONCURRENTLY` (if large table)
- [ ] RLS policies are set correctly
- [ ] Rollback script prepared
- [ ] No breaking changes to existing code

---

## Safe Database Change Patterns

### Pattern 1: Adding New Features (Safe)

```sql
-- Week 1: Add new table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  theme VARCHAR(20) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true
);

-- Deploy code that uses new table
-- Old code unaffected
```

### Pattern 2: Renaming Columns (Multi-Phase)

**Phase 1:** Add new column (Week 1)
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Copy existing data
UPDATE users SET full_name = name WHERE full_name IS NULL;
```

**Phase 2:** Update code to use both (Week 2)
```typescript
// Write to BOTH columns temporarily
await supabase
  .from('users')
  .update({
    name: fullName,       // Old column
    full_name: fullName   // New column
  });
```

**Phase 3:** Remove old column (Week 3+)
```sql
-- After monitoring, drop old column
ALTER TABLE users DROP COLUMN IF EXISTS name;
```

### Pattern 3: Making Optional Field Required

**DON'T do this:**
```sql
-- Will fail if any row has NULL
ALTER TABLE users
ALTER COLUMN phone_number SET NOT NULL;
```

**DO this instead:**
```sql
-- Phase 1: Set default for NULLs
UPDATE users
SET phone_number = ''
WHERE phone_number IS NULL;

-- Phase 2: Then make required
ALTER TABLE users
ALTER COLUMN phone_number SET NOT NULL;
```

### Pattern 4: Adding Indexes (Zero Downtime)

```sql
-- Use CONCURRENTLY to avoid locking table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id
ON posts(user_id);

-- Without CONCURRENTLY, table is locked during creation!
-- On large tables, this could take minutes
```

---

## Zero-Downtime Deployments

### Frontend Updates

Vercel provides automatic zero-downtime deploys:

1. New version is built
2. Traffic instantly switches to new version
3. Old version kept for instant rollback

**You don't need to do anything special!**

### Database Updates

To avoid downtime during database changes:

#### Use Backward Compatible Changes

```sql
-- ✅ GOOD: Add optional column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- ❌ BAD: Add required column
ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL;
```

#### Use Feature Flags for Big Changes

```typescript
// lib/featureFlags.ts
export const FEATURES = {
  NEW_EDITOR: process.env.VITE_ENABLE_NEW_EDITOR === 'true',
};

// In component
if (FEATURES.NEW_EDITOR) {
  return <NewEditor />;
}
return <OldEditor />;
```

**Deployment Process:**
1. Deploy code with feature OFF
2. Test in production with flag OFF
3. Enable flag via Vercel environment variable
4. Monitor for issues
5. Remove flag in next deploy

---

## Rollback Procedures

### Frontend Rollback

#### Option 1: Vercel Dashboard (Fastest - 30 seconds)

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Go to "Deployments"
4. Find previous working deployment
5. Click "..." menu → "Promote to Production"
6. Done!

#### Option 2: Git Revert (2-3 minutes)

```bash
# See recent commits
git log --oneline -5

# Revert the bad commit
git revert <commit-hash>

# Push to trigger new deployment
git push origin main
```

### Database Rollback

**Always create rollback script with every migration:**

**Forward Migration:**
```sql
-- migrations/20260119_add_bookmarks.sql
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  post_id UUID REFERENCES posts(id)
);
```

**Rollback Migration:**
```sql
-- migrations/20260119_add_bookmarks_rollback.sql
DROP TABLE IF EXISTS bookmarks;
```

**To Execute Rollback:**
1. Go to Supabase SQL Editor
2. Paste rollback script
3. Run

**For Data Changes, Always Backup First:**
```sql
-- Before major data migration
CREATE TABLE users_backup_20260119 AS
SELECT * FROM users;

-- If rollback needed
DROP TABLE users;
ALTER TABLE users_backup_20260119 RENAME TO users;
```

---

## Emergency Procedures

### Production Site is Down

**Immediate Actions (1-5 minutes):**

1. **Check Vercel Status:**
   - Visit: https://www.vercel-status.com
   - Platform issue? Wait for Vercel

2. **Check Recent Deployment:**
   - Go to Vercel Dashboard
   - If last deployment failed, rollback to previous

3. **Quick Rollback:**
   - Vercel Dashboard → Deployments
   - Previous version → "Promote to Production"

4. **Check Supabase:**
   - Visit: https://status.supabase.com
   - Database down? Wait for Supabase

### Critical Bug Found

```bash
# Immediate rollback
git revert HEAD
git push origin main

# Or use Vercel dashboard to promote previous deployment
```

### Database Emergency

**Suspected Data Corruption:**

```sql
-- 1. Enable read-only mode
-- Supabase Dashboard → Database → Settings → Enable read-only

-- 2. Assess damage
SELECT COUNT(*) FROM affected_table;

-- 3. Restore from backup
-- Supabase → Backups → Restore to timestamp before issue

-- 4. Re-enable writes
```

---

## Testing Strategy

### Before Every Production Deploy

```bash
# 1. Test locally
npm run dev
# Test all changed features

# 2. Run tests
npm run test

# 3. Build production
npm run build
# If this fails, DO NOT deploy!

# 4. Preview production build
npx vite preview
# Test in this environment
```

### After Production Deploy

**Immediate Checks (0-5 min):**
- [ ] Site loads: https://www.lavlay.com
- [ ] Login works
- [ ] Create post works
- [ ] View feed works
- [ ] No console errors (F12)

**24-Hour Monitoring:**
- [ ] Check Vercel deployment logs
- [ ] Check Supabase error logs
- [ ] Monitor user feedback
- [ ] Watch for error spikes

---

## Common Scenarios

### Scenario 1: Add New Feature

**Example: Add "Save Post" feature**

```bash
# 1. Create feature branch
git checkout -b feature/save-posts

# 2. Create migration
```

```sql
-- In Supabase SQL Editor (test first!)
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_posts_user
ON saved_posts(user_id);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved posts"
ON saved_posts FOR ALL
USING (auth.uid() = user_id);
```

```bash
# 3. Build feature in code
# ... create SaveButton component ...

# 4. Test locally
npm run dev

# 5. Test build
npm run build

# 6. Deploy
git checkout main
git merge feature/save-posts
git push origin main

# 7. Run migration in production
# Supabase Dashboard → SQL Editor → Run migration

# 8. Test on production
# Visit site, test save feature

# 9. Monitor for 24 hours
```

### Scenario 2: Fix Bug

```bash
# 1. Create fix branch
git checkout -b fix/signup-validation

# 2. Make fix
# ... edit files ...

# 3. Test
npm run dev
npm run build

# 4. Deploy immediately (if critical)
git checkout main
git merge fix/signup-validation
git push origin main

# 5. Monitor deployment
```

### Scenario 3: Performance Optimization

```sql
-- Add index to speed up slow query
-- Safe to run anytime - uses CONCURRENTLY

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at
ON posts(created_at DESC);

-- Verify improvement
EXPLAIN ANALYZE
SELECT * FROM posts
ORDER BY created_at DESC
LIMIT 20;
-- Should show "Index Scan" not "Seq Scan"
```

---

## Best Practices Checklist

### Every Deployment

- [ ] Code tested locally
- [ ] Build succeeds (`npm run build`)
- [ ] Database migration tested (if applicable)
- [ ] Rollback plan prepared
- [ ] Deploy during low-traffic hours (if major change)

### Database Changes

- [ ] Uses `IF NOT EXISTS` / `IF EXISTS`
- [ ] New columns have default values
- [ ] Indexes use `CONCURRENTLY`
- [ ] RLS policies set correctly
- [ ] Rollback script created
- [ ] Tested on copy of data

### After Deployment

- [ ] Site loads correctly
- [ ] Critical features work
- [ ] No console errors
- [ ] Monitor for 24 hours
- [ ] Ready to rollback if needed

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run test             # Run tests

# Git Workflow
git checkout -b feature/name   # Create branch
git add .                      # Stage changes
git commit -m "message"        # Commit
git checkout main              # Switch to main
git merge feature/name         # Merge
git push origin main           # Deploy

# Emergency Rollback
git revert HEAD          # Revert last commit
git push origin main     # Deploy rollback
```

---

## Summary

### Safe Update Workflow

1. **Create feature branch**
2. **Make changes** (code + database migration if needed)
3. **Test locally** (dev + build)
4. **Merge to main**
5. **Push to GitHub** (triggers Vercel deploy)
6. **Run database migration** (Supabase SQL Editor)
7. **Test on production**
8. **Monitor for 24 hours**

### Key Principles

- **Never** break backward compatibility
- **Always** test before deploying
- **Always** have rollback plan
- **Use** staging environment for major changes
- **Monitor** after every deployment

### When in Doubt

1. Test on staging first (or create staging environment)
2. Make smaller, incremental changes
3. Use feature flags for big changes
4. Have someone review your changes
5. Deploy during low-traffic hours

---

**Remember: It's always better to deploy slowly and safely than to break production!** 🚀

For questions or issues, refer to:
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: [Your project URL]
- This guide: `PRODUCTION_UPDATE_GUIDE.md`
