# 🔍 Debugging Checklist - Likes, Comments & Share Issues

## Issue: All features not working after code changes

### Quick Fix Steps (Try in order):

## 1. ⚡ RESTART DEV SERVER (MOST LIKELY FIX)

```bash
# Press Ctrl+C to stop the dev server
# Then restart it:
npm run dev
```

**Why:** Vite/React dev server caches components. After code changes, you MUST restart.

---

## 2. 🧹 Clear Browser Cache

1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**

OR:
- Chrome/Edge: Ctrl+Shift+Delete → Clear cached images and files
- Firefox: Ctrl+Shift+Delete → Cached Web Content

---

## 3. 🗄️ Verify Database Tables Exist

Open Supabase SQL Editor and run:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('post_likes', 'product_likes', 'reel_likes', 'post_comments');

-- Should return 4 rows:
-- post_likes
-- product_likes
-- reel_likes
-- post_comments
```

If no rows returned, run: `COMPLETE_MIGRATION_ALL_SYSTEMS.sql`

---

## 4. 🔍 Check Browser Console for Errors

1. Open DevTools (F12)
2. Go to Console tab
3. Refresh the page
4. Look for RED errors
5. Common errors to look for:
   - "Cannot read property 'maybeSingle'"
   - "Sheet is not defined"
   - "relation does not exist"
   - Import errors

**Take a screenshot of any errors and share them**

---

## 5. 🧪 Test Each Feature Individually

### Test Likes:
1. Click the heart icon on a post
2. Check browser console for errors
3. Refresh the page
4. Check if the like persists

**Expected:** Heart should stay filled after refresh

### Test Comments:
1. Click the comment icon on a post
2. Check if a modal/sheet opens from the right side
3. If nothing happens, check console for errors

**Expected:** A slide-in panel should open from the right

### Test Share:
1. Click the share icon
2. Check console for errors
3. Should either:
   - Open native share dialog (mobile), OR
   - Show "Link copied to clipboard" toast (desktop)

**Expected:** Some action should happen (toast or share dialog)

---

## 6. 📦 Reinstall Dependencies (If above steps fail)

```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Restart dev server
npm run dev
```

---

## 7. 🔧 Verify Environment

Run this command to check your setup:

```bash
node -v    # Should be v18 or higher
npm -v     # Should be v9 or higher
```

---

## Common Issues & Fixes

### Issue: "Sheet is not defined"
**Fix:** Dev server not restarted. Press Ctrl+C and `npm run dev`

### Issue: Likes work but disappear after refresh
**Fix:** Database tables not created. Run `COMPLETE_MIGRATION_ALL_SYSTEMS.sql`

### Issue: Click does nothing, no errors in console
**Fix:** Old cached JavaScript. Hard reload: Ctrl+Shift+R

### Issue: "relation post_likes does not exist"
**Fix:** Migration not run. Execute `COMPLETE_MIGRATION_ALL_SYSTEMS.sql` in Supabase

---

## Still Not Working?

1. Share your browser console errors
2. Run this and share output:
   ```bash
   npm run build
   ```
3. Check Supabase logs for database errors
4. Verify you're logged in (user context exists)

---

## Expected Behavior After Fixes

✅ Click heart → Toast "Post liked" → Refresh → Heart still filled
✅ Click comment → Modal slides in from right → Can type and submit
✅ Click share → Toast "Link copied" OR native share opens
✅ Add comment → Comment count increases immediately

---

**Most likely fix: RESTART YOUR DEV SERVER!**
