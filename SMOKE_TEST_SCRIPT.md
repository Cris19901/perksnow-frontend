# LavLay Smoke Test Script

## ⏱️ Quick Smoke Test (15 minutes)

### Test 1: Sign Up & Login (3 minutes)
```
1. Open http://localhost:3002 (or production URL)
2. Click "Sign Up"
3. Enter email: test@example.com
4. Enter password: Test123456!
5. Click "Create Account"
6. ✅ Check: User is created and logged in
7. ✅ Check: Redirected to feed
8. ✅ Check: Points balance shows (signup bonus)
9. Logout
10. Login with same credentials
11. ✅ Check: Successfully logged in
```

### Test 2: Create Multi-Image Post (5 minutes)
```
1. Click "Photos" button in CreatePost
2. Select 3-4 images from your computer
3. ✅ Check: Image previews appear in grid
4. ✅ Check: Image counter shows "3 / 10 images"
5. ✅ Check: Hover over image shows remove button
6. Remove one image by clicking X
7. ✅ Check: Image is removed from preview
8. Type text: "Testing multi-image post!"
9. Click "Post" button
10. ✅ Check: Upload progress toasts appear
11. ✅ Check: "Post created successfully!" toast
12. ✅ Check: Post appears at top of feed immediately
13. ✅ Check: Images display in grid layout
```

### Test 3: Image Viewing & Lightbox (4 minutes)
```
1. Find the post you just created
2. Click on one of the images
3. ✅ Check: Fullscreen lightbox opens
4. ✅ Check: Author info displays at top
5. ✅ Check: Image counter shows (e.g., "2 / 3")
6. Use scroll wheel to zoom in
7. ✅ Check: Image zooms (1x to 3x)
8. Drag the zoomed image
9. ✅ Check: Image pans when zoomed
10. Press right arrow key
11. ✅ Check: Navigates to next image
12. Press ESC key
13. ✅ Check: Lightbox closes
14. Click image again, click backdrop
15. ✅ Check: Lightbox closes
```

### Test 4: Social Interactions (3 minutes)
```
1. Like the post (click heart)
2. ✅ Check: Heart fills with color
3. ✅ Check: Like count increases
4. Click heart again to unlike
5. ✅ Check: Heart becomes outline
6. ✅ Check: Like count decreases
7. Click "Comment" button
8. ✅ Check: Comment sheet opens from right
9. Type comment: "Great photos!"
10. Click "Post" button
11. ✅ Check: Comment appears immediately
12. ✅ Check: Comment count increases
13. Close comment sheet
```

---

## 🔐 Payment Testing (CRITICAL - 10 minutes)

### Test 5: View Subscription Plans
```
1. Click profile icon
2. Click "Settings" or navigate to /subscription
3. ✅ Check: 3 tiers display (Free, Basic, Pro)
4. ✅ Check: Prices show correctly:
   - Free: ₦0/month
   - Basic: ₦2,000/month
   - Pro: ₦5,000/month
5. ✅ Check: Features list for each tier
```

### Test 6: Subscribe to Pro Plan (Paystack Test)
```
1. Click "Subscribe" on Pro plan (₦5,000/month)
2. ✅ Check: Paystack modal opens
3. Enter test card details:
   Card Number: 4084 0840 8408 4081
   Expiry: 12/25
   CVV: 123
4. Click "Pay ₦5,000"
5. ✅ Check: Payment processes successfully
6. ✅ Check: Success message appears
7. ✅ Check: Redirected back to app
8. Go to your profile
9. ✅ Check: Blue checkmark badge appears next to name
10. Check Supabase database:
    - Open Supabase dashboard
    - Go to Table Editor → subscriptions
    - ✅ Check: New row with your user_id
    - ✅ Check: tier = 'pro'
    - ✅ Check: status = 'active'
    - ✅ Check: expires_at is set (1 month from now)
```

### Test 7: Verify Webhook (Check Paystack Dashboard)
```
1. Open Paystack Dashboard (https://dashboard.paystack.com)
2. Go to Settings → Webhooks
3. ✅ Check: Webhook delivery succeeded
4. ✅ Check: Status code 200
5. If webhook failed:
   - Check webhook URL is correct
   - Check webhook secret matches
   - Verify endpoint is publicly accessible
```

---

## 📱 Mobile Testing (Quick - 5 minutes)

### Test 8: Mobile Browser Test
```
1. Open your phone browser
2. Navigate to site URL
3. Sign in
4. ✅ Check: Layout is mobile-responsive
5. ✅ Check: Bottom navigation visible
6. Create post with 2 images
7. ✅ Check: Images upload successfully
8. View post in feed
9. ✅ Check: Images display in grid
10. Tap an image
11. ✅ Check: Lightbox opens
12. Swipe left/right
13. ✅ Check: Navigation works
14. Pinch to zoom
15. ✅ Check: Zoom works
```

---

## 🚨 Critical Issues to Watch For

### STOP LAUNCH IF:
- [ ] Users can't sign up
- [ ] Users can't login
- [ ] Posts don't save to database
- [ ] Images don't upload
- [ ] Feed doesn't load (shows error)
- [ ] Payment completely broken
- [ ] App crashes on load
- [ ] Critical security issue found

### FIX ASAP (Can launch but fix within 24h):
- [ ] Lightbox doesn't open
- [ ] Mobile layout is broken
- [ ] Some images don't load
- [ ] Payment webhook fails (but payment works)
- [ ] Performance is very slow

### CAN FIX LATER:
- [ ] Minor UI glitches
- [ ] Missing nice-to-have features
- [ ] Polish animations not working
- [ ] Profile grid view missing

---

## ✅ SMOKE TEST CHECKLIST

### Authentication ✅
- [ ] Sign up works
- [ ] Login works
- [ ] Logout works
- [ ] User profile loads

### Core Posting ✅
- [ ] Create text post
- [ ] Create single image post
- [ ] Create multi-image post (2-10 images)
- [ ] Image upload shows progress
- [ ] Posts appear in feed immediately

### Image Display ✅
- [ ] Single image shows full width
- [ ] 2 images show side-by-side
- [ ] 3-4 images show grid layout
- [ ] 5+ images show carousel
- [ ] Carousel navigation works (arrows, dots)

### Lightbox ✅
- [ ] Click image opens lightbox
- [ ] Zoom in/out works (scroll wheel)
- [ ] Pan zoomed image works
- [ ] Navigate between images (arrows)
- [ ] Close lightbox (ESC or backdrop)
- [ ] Download button works
- [ ] Share button works
- [ ] Like from lightbox works

### Social Features ✅
- [ ] Like post (heart animation)
- [ ] Unlike post
- [ ] Comment on post
- [ ] View comments
- [ ] Follow user
- [ ] Unfollow user
- [ ] Share post

### Payment (CRITICAL) 💰
- [ ] View subscription plans
- [ ] Subscribe with test card
- [ ] Payment processes successfully
- [ ] Subscription status updates
- [ ] Pro badge appears
- [ ] Webhook delivers successfully
- [ ] Can cancel subscription

### Mobile 📱
- [ ] Mobile layout responsive
- [ ] Touch gestures work
- [ ] Image upload on mobile
- [ ] Swipe in carousel
- [ ] Pinch to zoom in lightbox

---

## 📊 SMOKE TEST RESULTS

### Date: _____________
### Tester: _____________
### Environment: [ ] Development [ ] Production

| Test | Status | Notes |
|------|--------|-------|
| Sign Up | ☐ Pass ☐ Fail | |
| Login | ☐ Pass ☐ Fail | |
| Create Post (1 image) | ☐ Pass ☐ Fail | |
| Create Post (Multi-image) | ☐ Pass ☐ Fail | |
| Image Grid Display | ☐ Pass ☐ Fail | |
| Image Carousel | ☐ Pass ☐ Fail | |
| Lightbox Open | ☐ Pass ☐ Fail | |
| Lightbox Zoom | ☐ Pass ☐ Fail | |
| Lightbox Navigation | ☐ Pass ☐ Fail | |
| Like/Unlike | ☐ Pass ☐ Fail | |
| Comment | ☐ Pass ☐ Fail | |
| Follow/Unfollow | ☐ Pass ☐ Fail | |
| View Subscriptions | ☐ Pass ☐ Fail | |
| Subscribe (Payment) | ☐ Pass ☐ Fail | |
| Pro Badge | ☐ Pass ☐ Fail | |
| Webhook Delivery | ☐ Pass ☐ Fail | |
| Mobile Layout | ☐ Pass ☐ Fail | |
| Mobile Touch Gestures | ☐ Pass ☐ Fail | |

### Overall Result:
☐ **PASS** - Ready for production launch
☐ **CONDITIONAL PASS** - Minor issues, can launch with fixes
☐ **FAIL** - Critical issues, do not launch

### Critical Issues Found:
_____________________________________
_____________________________________
_____________________________________

### Action Items Before Launch:
_____________________________________
_____________________________________
_____________________________________

---

## 🚀 NEXT STEPS AFTER SMOKE TEST

If tests PASS:
1. ✅ Run smoke tests → DONE
2. 🔄 Fix any critical issues found
3. 🔄 Test payment in Paystack test mode
4. 🔄 Deploy to production (Vercel)
5. 🔄 Re-run smoke tests on production
6. 🚀 Launch!

If tests FAIL:
1. Document all issues
2. Prioritize critical vs. nice-to-have
3. Fix critical issues
4. Re-run smoke tests
5. Repeat until PASS
