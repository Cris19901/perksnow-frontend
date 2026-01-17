# 🧪 LavLay Production Smoke Test - Interactive Guide

**Production URL**: https://perknowv2-latest-iixsn3is9-fadipe-timothys-projects.vercel.app

**Time Required**: 10-15 minutes
**Status**: Ready to test

---

## 🚀 STEP-BY-STEP SMOKE TEST

Follow these steps in order and check off each one:

---

### TEST 1: Site Loading (2 minutes)

#### 1.1 Initial Load
- [ ] Open: https://perknowv2-latest-iixsn3is9-fadipe-timothys-projects.vercel.app
- [ ] ✅ Page loads within 5 seconds
- [ ] ✅ You see the LavLay interface (not a blank page)
- [ ] ✅ No "404" or "500" error messages

#### 1.2 Check Console for Errors
- [ ] Press **F12** to open Developer Tools
- [ ] Click **Console** tab
- [ ] ✅ No red error messages (warnings in yellow are okay)
- [ ] If you see errors, copy them and save for later

**Expected**: Clean console with no critical errors

**If page doesn't load**:
- Check your internet connection
- Try clearing browser cache (Ctrl+Shift+Del)
- Try incognito/private mode

---

### TEST 2: Authentication - Sign Up (3 minutes)

#### 2.1 Navigate to Sign Up
- [ ] Click **"Sign Up"** button (or register link)
- [ ] ✅ Sign up form appears

#### 2.2 Create Test Account
Fill in the form:
- **Email**: `smoketest@lavlay.com` (or your email)
- **Password**: `Test123456!`
- **Full Name**: `Smoke Test User`
- [ ] Click **"Create Account"** or **"Sign Up"**

#### 2.3 Verify Sign Up Success
- [ ] ✅ No error messages appear
- [ ] ✅ You're redirected to the feed/home page
- [ ] ✅ You see your profile name/avatar in the header
- [ ] ✅ You can see the main navigation

**Expected**: Successfully logged in and seeing the main feed

**If sign up fails**:
- Check console for errors
- Try a different email
- Verify Supabase is working: https://supabase.com/dashboard

---

### TEST 3: Create Post with Multiple Images (5 minutes)

#### 3.1 Open Create Post
- [ ] Click **"Create Post"** or **"+"** button
- [ ] ✅ Create post modal/form opens

#### 3.2 Add Text Content
- [ ] Type in the text field: `"Testing multi-image posts on production! 🚀"`
- [ ] ✅ Text appears as you type

#### 3.3 Upload Images
- [ ] Click **"Photos"** or **"Add Images"** button
- [ ] Select **3 images** from your computer
- [ ] ✅ Image previews appear
- [ ] ✅ Counter shows "3 / 10 images" (or similar)
- [ ] ✅ Each image has a remove (X) button

#### 3.4 Test Remove Image
- [ ] Click the **X** on one image preview
- [ ] ✅ Image is removed
- [ ] ✅ Counter updates to "2 / 10 images"
- [ ] Add the image back (total 3 images again)

#### 3.5 Submit Post
- [ ] Click **"Post"** button
- [ ] ✅ You see upload progress toasts/notifications
- [ ] ✅ "Uploading image 1/3..." appears
- [ ] ✅ "Uploading image 2/3..." appears
- [ ] ✅ "Uploading image 3/3..." appears
- [ ] ✅ "Post created successfully!" message appears
- [ ] Wait for all uploads to complete (may take 10-30 seconds)

#### 3.6 Verify Post in Feed
- [ ] ✅ Your new post appears at the top of the feed
- [ ] ✅ All 3 images are visible
- [ ] ✅ Text content is displayed correctly
- [ ] ✅ Your name/avatar shows on the post
- [ ] ✅ Post has 0 likes, 0 comments initially

**Expected**: Post created with 3 images, visible in feed

**If upload fails**:
- Check console for R2 storage errors
- Verify R2 bucket exists in Cloudflare
- Check file size (images should be <10MB each)

---

### TEST 4: Image Display & Layouts (3 minutes)

#### 4.1 Check Image Layout
Look at your post with 3 images:
- [ ] ✅ Images are displayed in a grid layout
- [ ] ✅ Images are properly sized (not stretched)
- [ ] ✅ No broken image icons
- [ ] ✅ Images load fully (not showing placeholders)

#### 4.2 Test Different Layouts (Optional)
Create another post with different image counts:
- **1 image**: Should show full width
- **2 images**: Should show side-by-side
- **4 images**: Should show 2x2 grid
- **5+ images**: Should show carousel with navigation

**Expected**: Smart layouts based on image count

---

### TEST 5: Image Lightbox (4 minutes)

#### 5.1 Open Lightbox
- [ ] Click on one of the images in your post
- [ ] ✅ Fullscreen lightbox opens
- [ ] ✅ Image displays at full size
- [ ] ✅ Dark backdrop/overlay visible
- [ ] ✅ Author info shows at top
- [ ] ✅ Image counter shows (e.g., "1 / 3")

#### 5.2 Test Zoom
- [ ] Use **mouse scroll wheel** to zoom in
- [ ] ✅ Image zooms in (1x → 1.5x → 2x → 3x)
- [ ] ✅ Zoom level indicator updates
- [ ] Scroll down to zoom out
- [ ] ✅ Image zooms out back to 1x

#### 5.3 Test Pan (when zoomed)
- [ ] Zoom in to 2x or 3x
- [ ] **Click and drag** the image
- [ ] ✅ Image pans/moves around
- [ ] ✅ Can see different parts of the zoomed image

#### 5.4 Test Navigation
- [ ] Press **Right Arrow** key (or click right arrow)
- [ ] ✅ Moves to next image (2 / 3)
- [ ] Press **Left Arrow** key (or click left arrow)
- [ ] ✅ Moves to previous image (1 / 3)
- [ ] ✅ Counter updates correctly

#### 5.5 Test Like from Lightbox
- [ ] Click the **Heart** icon in lightbox
- [ ] ✅ Heart fills with color
- [ ] ✅ Like count increases

#### 5.6 Test Close Lightbox
Try each method:
- [ ] Press **ESC** key → ✅ Lightbox closes
- [ ] Open again, click **X** button → ✅ Lightbox closes
- [ ] Open again, click **dark backdrop** → ✅ Lightbox closes

**Expected**: Smooth lightbox experience with all features working

**If lightbox doesn't work**:
- Check console for JavaScript errors
- Try refreshing the page
- Test in different browser

---

### TEST 6: Social Features (3 minutes)

#### 6.1 Test Like
- [ ] Find a post in the feed
- [ ] Click the **Heart** icon
- [ ] ✅ Heart fills with color (becomes solid)
- [ ] ✅ Like count increases by 1
- [ ] Click heart again to unlike
- [ ] ✅ Heart becomes outline again
- [ ] ✅ Like count decreases by 1

#### 6.2 Test Comment
- [ ] Click **"Comment"** button on a post
- [ ] ✅ Comment sheet/modal opens
- [ ] Type in comment box: `"Great post! Testing comments 👍"`
- [ ] Click **"Post"** or **"Submit"**
- [ ] ✅ Comment appears immediately in the list
- [ ] ✅ Comment count on post increases
- [ ] ✅ Your name shows on the comment
- [ ] ✅ Timestamp shows on comment

#### 6.3 Test Share
- [ ] Click **"Share"** button on a post
- [ ] ✅ Share menu/modal opens
- [ ] ✅ Shows share options (copy link, social media, etc.)
- [ ] Click **"Copy Link"**
- [ ] ✅ "Link copied!" notification appears

**Expected**: All social interactions work smoothly

---

### TEST 7: Profile Features (2 minutes)

#### 7.1 View Your Profile
- [ ] Click your **avatar** or **profile icon**
- [ ] ✅ Profile page loads
- [ ] ✅ Shows your name
- [ ] ✅ Shows your posts
- [ ] ✅ Shows follower/following counts
- [ ] ✅ Shows points balance

#### 7.2 Test Profile Picture Upload (Optional)
- [ ] Click **"Edit Profile"** or avatar icon
- [ ] Click **"Change Avatar"**
- [ ] Select an image from your computer
- [ ] ✅ Upload progress shows
- [ ] ✅ New avatar displays after upload

**Expected**: Profile displays correctly with all information

---

### TEST 8: Navigation & UI (2 minutes)

#### 8.1 Test Main Navigation
Navigate to each section:
- [ ] **Home/Feed** → ✅ Loads feed with posts
- [ ] **Explore/Discover** → ✅ Shows content
- [ ] **Notifications** → ✅ Opens notifications panel
- [ ] **Profile** → ✅ Loads your profile
- [ ] **Settings** → ✅ Opens settings page

#### 8.2 Test Create Content Buttons
- [ ] Create Post button → ✅ Opens post creator
- [ ] Create Story button (if visible) → ✅ Opens story creator
- [ ] Create Reel button (if visible) → ✅ Opens reel creator

#### 8.3 Test Logout
- [ ] Click **Profile** → **Logout**
- [ ] ✅ Successfully logged out
- [ ] ✅ Redirected to login page
- [ ] ✅ Can't access protected pages

#### 8.4 Test Login Again
- [ ] Enter your test credentials
- [ ] Click **"Login"**
- [ ] ✅ Successfully logged back in
- [ ] ✅ Session persists

**Expected**: All navigation works correctly

---

### TEST 9: Performance Check (1 minute)

#### 9.1 Page Load Time
- [ ] Refresh the page (F5)
- [ ] Count seconds until page is fully interactive
- [ ] ✅ Loads in less than 5 seconds
- [ ] ✅ No white screen or long delays

#### 9.2 Image Load Time
- [ ] Scroll through feed with multiple posts
- [ ] ✅ Images load progressively
- [ ] ✅ No broken images
- [ ] ✅ Reasonable load times (<3 seconds per image)

#### 9.3 Interaction Responsiveness
- [ ] Click like buttons rapidly
- [ ] Open/close lightbox multiple times
- [ ] ✅ UI responds quickly (no lag)
- [ ] ✅ No freezing or hanging

**Expected**: Smooth, responsive experience

---

### TEST 10: Console & Network Check (2 minutes)

#### 10.1 Final Console Check
- [ ] Open Developer Tools (F12)
- [ ] Go to **Console** tab
- [ ] ✅ No critical errors (red messages)
- [ ] ✅ No "Failed to fetch" errors
- [ ] ✅ No "Unauthorized" errors (401)
- [ ] ✅ No "Forbidden" errors (403)

#### 10.2 Network Check
- [ ] Go to **Network** tab in DevTools
- [ ] Refresh the page
- [ ] Look at the requests list
- [ ] ✅ Most requests return 200 (success)
- [ ] ✅ No 500 (server error) responses
- [ ] ✅ Images load successfully (200 status)

**Expected**: Clean console and successful network requests

---

## 📱 BONUS: Mobile Testing (5 minutes)

### Mobile Browser Test

#### 1. Open on Phone
- [ ] Open: https://perknowv2-latest-iixsn3is9-fadipe-timothys-projects.vercel.app
- [ ] ✅ Page loads and is responsive
- [ ] ✅ Bottom navigation visible
- [ ] ✅ Text is readable (not too small)

#### 2. Test Mobile Features
- [ ] Tap to open a post
- [ ] ✅ Tap image to open lightbox
- [ ] ✅ Pinch to zoom works
- [ ] ✅ Swipe left/right to navigate images
- [ ] ✅ Tap backdrop to close lightbox

#### 3. Test Mobile Create Post
- [ ] Tap "Create Post"
- [ ] Add 2 images from phone gallery/camera
- [ ] ✅ Images upload successfully
- [ ] ✅ Post appears in feed

**Expected**: Fully functional mobile experience

---

## ✅ SMOKE TEST RESULTS

### Summary Checklist

**Critical Features (Must Work):**
- [ ] Site loads without errors
- [ ] Sign up works
- [ ] Login works
- [ ] Create post with images works
- [ ] Images display correctly
- [ ] Lightbox opens and works
- [ ] Like/comment work
- [ ] No critical console errors

**Important Features (Should Work):**
- [ ] Image zoom/pan in lightbox
- [ ] Multiple image layouts
- [ ] Profile page loads
- [ ] Navigation works
- [ ] Mobile responsive

**Nice to Have (Can Fix Later):**
- [ ] Fast performance (<3s load)
- [ ] Smooth animations
- [ ] All polish features

---

## 🎯 TEST RESULT

### ✅ PASS - Launch Approved
**Criteria**: All critical features work
- Users can sign up and login
- Posts with images can be created
- Images display and lightbox works
- Social features functional
- No breaking errors

**Action**: Share with beta users, monitor for 24h

### ⚠️ PARTIAL PASS - Minor Issues
**Criteria**: Critical features work, some issues found
- Core features functional
- Minor bugs or UI issues
- Non-blocking problems

**Action**: Launch, fix issues within 24-48h

### ❌ FAIL - Do Not Launch
**Criteria**: Critical features broken
- Users can't sign up/login
- Posts don't save
- Images don't upload
- App crashes frequently

**Action**: Fix critical issues, retest before launch

---

## 📝 ISSUE TRACKING

### Issues Found During Testing

**Template for each issue:**
```
Issue #: [Number]
Severity: [Critical / High / Medium / Low]
Feature: [Which feature]
Description: [What's wrong]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected: [What should happen]
Actual: [What actually happens]
Console Errors: [Any error messages]
```

**Example:**
```
Issue #1
Severity: Medium
Feature: Image Upload
Description: Upload progress toast disappears too quickly
Steps to Reproduce:
1. Create post with 3 images
2. Watch upload progress
Expected: Toast visible until upload complete
Actual: Toast disappears after 2 seconds
Console Errors: None
```

---

## 🚀 AFTER SMOKE TEST

### If Tests Pass ✅

**Immediate Actions:**
1. ✅ Mark smoke test as complete
2. 📢 Share URL with 5-10 beta users
3. 📊 Monitor Vercel dashboard for errors
4. 📝 Document any minor issues for later
5. 🎉 Celebrate your launch!

**Within 24 Hours:**
1. Gather user feedback
2. Monitor error logs
3. Check database for issues
4. Fix any critical bugs
5. Plan week 1 improvements

### If Tests Fail ❌

**Immediate Actions:**
1. 🚨 Document all critical issues
2. 🔍 Check console errors and logs
3. 🛠️ Fix blocking issues
4. ✅ Retest after fixes
5. 🔄 Repeat until passing

**Common Fixes:**
- Environment variables missing → Check Vercel dashboard
- Database errors → Run VERIFY_DATABASE_SETUP.sql
- Image upload fails → Check R2 configuration
- Authentication fails → Verify Supabase settings

---

## 📞 SUPPORT

### If You Need Help

**Check These First:**
1. [DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md) - Troubleshooting
2. [LAUNCH_QUICK_REFERENCE.md](LAUNCH_QUICK_REFERENCE.md) - Common issues
3. Browser console errors
4. Vercel deployment logs: `vercel logs`

**Dashboards:**
- Vercel: https://vercel.com/fadipe-timothys-projects/perknowv2-latest
- Supabase: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo
- Cloudflare R2: https://dash.cloudflare.com/

---

## 🎯 READY TO TEST?

**Start now with TEST 1!**

Open your production URL and work through each test step by step:
```
https://perknowv2-latest-iixsn3is9-fadipe-timothys-projects.vercel.app
```

**Good luck!** 🚀

---

**After completing all tests, update your status below:**

- **Test Date**: _______________
- **Tester Name**: _______________
- **Overall Result**: ⬜ Pass  ⬜ Partial Pass  ⬜ Fail
- **Critical Issues Found**: _______________
- **Ready for Launch**: ⬜ Yes  ⬜ No  ⬜ After Fixes
