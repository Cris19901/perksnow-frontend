# ⚡ Quick Smoke Test Checklist - 10 Minutes

**Production URL**: https://perknowv2-latest-iixsn3is9-fadipe-timothys-projects.vercel.app

**Print this or keep it open while testing!**

---

## ✅ 10-MINUTE CRITICAL TEST

### 1️⃣ SITE LOADS (30 seconds)
- [ ] Open production URL
- [ ] Page loads (no 404/500 errors)
- [ ] Press F12 → No red console errors

**✅ PASS** | **❌ FAIL** ___________

---

### 2️⃣ SIGN UP (1 minute)
- [ ] Click "Sign Up"
- [ ] Email: `test@lavlay.com`
- [ ] Password: `Test123456!`
- [ ] Click "Create Account"
- [ ] Redirected to feed
- [ ] Can see your profile name

**✅ PASS** | **❌ FAIL** ___________

---

### 3️⃣ CREATE POST WITH IMAGES (3 minutes)
- [ ] Click "Create Post"
- [ ] Type: "Testing production! 🚀"
- [ ] Click "Add Images"
- [ ] Select 3 images
- [ ] Image previews appear
- [ ] Counter shows "3 / 10 images"
- [ ] Click "Post" button
- [ ] See upload progress (1/3, 2/3, 3/3)
- [ ] "Post created!" message appears
- [ ] Post appears at top of feed
- [ ] All 3 images visible

**✅ PASS** | **❌ FAIL** ___________

---

### 4️⃣ IMAGE LIGHTBOX (2 minutes)
- [ ] Click on an image
- [ ] Lightbox opens fullscreen
- [ ] Author info shows at top
- [ ] Counter shows "1 / 3"
- [ ] Scroll wheel zooms in/out
- [ ] Right arrow → next image
- [ ] Left arrow → previous image
- [ ] ESC closes lightbox

**✅ PASS** | **❌ FAIL** ___________

---

### 5️⃣ LIKE & COMMENT (2 minutes)
- [ ] Click heart on post
- [ ] Heart fills with color
- [ ] Like count increases
- [ ] Click "Comment"
- [ ] Comment sheet opens
- [ ] Type: "Great post!"
- [ ] Click "Post Comment"
- [ ] Comment appears
- [ ] Comment count increases

**✅ PASS** | **❌ FAIL** ___________

---

### 6️⃣ PROFILE (1 minute)
- [ ] Click your avatar
- [ ] Profile page loads
- [ ] Shows your name
- [ ] Shows your posts
- [ ] Shows points balance

**✅ PASS** | **❌ FAIL** ___________

---

### 7️⃣ LOGOUT & LOGIN (1 minute)
- [ ] Click "Logout"
- [ ] Redirected to login page
- [ ] Enter credentials
- [ ] Click "Login"
- [ ] Successfully logged back in

**✅ PASS** | **❌ FAIL** ___________

---

### 8️⃣ FINAL CONSOLE CHECK (30 seconds)
- [ ] Press F12
- [ ] Console tab
- [ ] No critical red errors
- [ ] Network tab → most requests are 200

**✅ PASS** | **❌ FAIL** ___________

---

## 📊 RESULTS

**Tests Passed**: _____ / 8

**Overall Result**:
- [ ] ✅ **ALL PASS** (8/8) → Launch approved! 🎉
- [ ] ⚠️ **PARTIAL** (6-7/8) → Launch, fix minor issues
- [ ] ❌ **FAIL** (<6/8) → Fix critical issues first

---

## 🚨 CRITICAL ISSUES FOUND

**Issue 1**: ________________________________

**Issue 2**: ________________________________

**Issue 3**: ________________________________

---

## 📱 BONUS: Mobile Quick Test (5 min)

- [ ] Open URL on phone
- [ ] Page is responsive
- [ ] Create post with 2 images
- [ ] Tap image → lightbox opens
- [ ] Pinch to zoom works
- [ ] Swipe between images works

**✅ MOBILE PASS** | **❌ MOBILE FAIL** ___________

---

## ✅ IF ALL TESTS PASS:

**You're ready to launch! 🚀**

**Next Steps:**
1. ✅ Mark smoke test complete
2. 📢 Share URL with beta users
3. 📊 Monitor Vercel dashboard
4. 🎉 Celebrate!

---

## ❌ IF ANY TESTS FAIL:

**Critical Fixes Needed:**

**Check these:**
1. Vercel dashboard for errors
2. Supabase dashboard for database issues
3. Browser console for error messages
4. [DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md) for troubleshooting

---

**Test Completed By**: ___________________

**Date**: ___________________

**Time**: ___________________

**Ready for Launch**: ☐ YES  ☐ NO  ☐ AFTER FIXES

---

**Production URL**: https://perknowv2-latest-iixsn3is9-fadipe-timothys-projects.vercel.app
