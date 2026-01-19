# Remaining Fixes - TODO

## ✅ Completed
1. **Product Upload** - Marked as "Coming Soon" with toast notification
2. **Logout Button** - Added to mobile navigation (red colored)
3. **Bottom Navigation Overlap** - Fixed with pb-32 padding on all pages

## 🔧 In Progress / Pending

### 1. Fix Reels Display (Instagram/TikTok Style)
**Issue:** Reels display is not Instagram/TikTok-like
**Files to modify:**
- `src/components/ReelsViewer.tsx` - Main reels viewer component
- `src/components/ReelPost.tsx` - Individual reel display
- `src/components/pages/ReelsPage.tsx` - Reels page layout

**Recommended changes:**
- Full-screen vertical video player
- Swipe up/down to change reels
- Overlay UI elements (username, caption, likes at bottom)
- Auto-play on view
- Infinite scroll

### 2. Fix Status/Stories Display
**Issue:** Status display appears buggy
**Files to check:**
- `src/components/StatusUpload.tsx` or `src/components/StoryUpload.tsx`
- Story viewer components
- Story display on feed

**Recommended fixes:**
- Fix story rings/borders
- Ensure proper image scaling
- Fix tap-to-advance functionality
- Progress bars for multiple stories

### 3. Fix Subscription Payment "Invalid Key" Error
**Issue:** Payment fails with "invalid key error"
**Files to check:**
- `src/components/pages/SubscriptionPage.tsx`
- Backend payment integration
- Paystack API key configuration

**Debugging steps:**
1. Check Paystack API keys in environment variables
2. Verify backend endpoint is working
3. Check browser console for exact error
4. Ensure Paystack public key is correct

**Likely issue:** Missing or incorrect `VITE_PAYSTACK_PUBLIC_KEY` in `.env`

### 4. Fix Password Recovery Email
**Issue:** "Error sending recovery email"
**Files to check:**
- `src/components/pages/LoginPage.tsx` - Forgot password handler
- Supabase Auth settings
- Email templates

**Common causes:**
- Email rate limiting
- SMTP not configured
- Redirect URL not whitelisted in Supabase

**Fix steps:**
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Check "Reset Password" template is enabled
3. Verify Site URL and Redirect URLs in Auth settings
4. Check Supabase email rate limits

### 5. Add Email Trigger for New Follows
**Issue:** No email sent when someone follows you
**Implementation needed:**

**Create database trigger:**
```sql
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into email queue or trigger Edge Function
  INSERT INTO email_queue (
    user_id,
    email_type,
    data
  ) VALUES (
    NEW.followed_id,
    'new_follower',
    jsonb_build_object(
      'follower_id', NEW.follower_id,
      'follower_username', (
        SELECT username FROM users WHERE id = NEW.follower_id
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();
```

**Email template needed:**
- Subject: "{{follower_name}} started following you!"
- Body: Link to follower's profile
- Unsubscribe option

## 📋 Testing Checklist

### Mobile Navigation
- [ ] Logout button visible and works
- [ ] Product upload shows "Coming Soon" toast
- [ ] Bottom navigation doesn't cover content
- [ ] All nav icons work correctly

### Reels (After Fix)
- [ ] Vertical full-screen video
- [ ] Swipe up/down navigation
- [ ] Auto-play works
- [ ] Like/comment buttons accessible
- [ ] Caption visible at bottom

### Stories (After Fix)
- [ ] Story rings display correctly
- [ ] Tap to advance works
- [ ] Progress bars show correctly
- [ ] Multiple stories play in sequence

### Payments (After Fix)
- [ ] Subscription page loads
- [ ] Payment modal opens
- [ ] Paystack integration works
- [ ] Payment success redirects correctly

### Emails (After Fix)
- [ ] Password recovery email sends
- [ ] Follow notification email sends
- [ ] Email templates look good
- [ ] Unsubscribe link works

## 🔍 Debugging Tips

### For "Invalid Key" Payment Error:
1. Open browser DevTools → Console
2. Try to make a payment
3. Look for exact error message
4. Check Network tab for failed requests
5. Verify `.env` file has `VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx` or `pk_live_xxx`

### For Email Issues:
1. Check Supabase logs: Dashboard → Logs → Auth Logs
2. Look for rate limiting messages
3. Verify email templates are enabled
4. Check spam folder for test emails

### For Stories/Reels Display:
1. Open DevTools → Elements
2. Inspect the video/story container
3. Check CSS classes and styles
4. Look for JavaScript errors in console
5. Test on different screen sizes

## 📞 Next Steps

1. **Priority 1:** Fix subscription payment error (blocking revenue)
2. **Priority 2:** Fix password recovery (affects user experience)
3. **Priority 3:** Improve Reels display (user engagement)
4. **Priority 4:** Fix Stories display (user engagement)
5. **Priority 5:** Add follow email notifications (nice to have)

## 💡 Quick Wins

If time is limited, focus on these quick fixes first:
1. ✅ Logout button - DONE
2. ✅ Product upload "Coming Soon" - DONE
3. ✅ Bottom padding fix - DONE
4. Payment key error - Just need to set environment variable
5. Password recovery - Check Supabase settings

The Reels and Stories redesign will take more time as they need UI/UX overhaul.
