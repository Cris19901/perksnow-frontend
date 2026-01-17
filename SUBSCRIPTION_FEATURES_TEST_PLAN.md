# Subscription Features - Test Plan

## ✅ Testing Environment
- **Dev Server**: Running at http://localhost:3002
- **Date**: 2026-01-12
- **Features to Test**: Subscription system integration

---

## 🎯 Test Checklist

### 1. Subscription Page (`/subscription`)
**Purpose**: Users can view and subscribe to Pro plan

**Test Steps**:
- [ ] Navigate to http://localhost:3002/subscription
- [ ] Verify page displays two plans: Free and Pro
- [ ] Check Free plan shows correct features
- [ ] Check Pro plan shows:
  - [ ] Price: ₦2,000/month or ₦20,000/year
  - [ ] "Withdraw earnings" feature
  - [ ] "Verified badge" feature
  - [ ] "Most Popular" badge with Crown icon
- [ ] Test billing cycle toggle (Monthly/Yearly)
- [ ] Verify "Save 16%" badge appears for yearly option
- [ ] Check current subscription status badge displays
- [ ] Test "Subscribe Now" button (should initialize Paystack - will fail without keys)

**Expected Results**:
- Page loads without errors
- Plans display correctly with all features
- Billing cycle toggle works
- Current user's plan is highlighted

---

### 2. Sidebar Upgrade Banner
**Purpose**: Free users see prominent upgrade prompt

**Test Steps**:
- [ ] Log in as a FREE user
- [ ] Navigate to feed page (http://localhost:3002/feed)
- [ ] Check sidebar on the right side
- [ ] Verify upgrade banner appears at TOP of sidebar
- [ ] Check banner has:
  - [ ] Gradient purple/blue background
  - [ ] Crown icon in yellow
  - [ ] "Upgrade to Pro" heading with Sparkles icon
  - [ ] Benefits text: "Unlock withdrawals, verified badge, unlimited posts & reels, and priority support!"
  - [ ] "View Plans" button
- [ ] Click "View Plans" button
- [ ] Verify it navigates to `/subscription` page

**Test with Pro User**:
- [ ] Log in as a PRO user (or upgrade a user from admin panel)
- [ ] Verify upgrade banner does NOT appear in sidebar

**Expected Results**:
- Banner appears ONLY for free users
- Banner is visually appealing with gradient
- Click navigates to subscription page
- Pro users don't see the banner

---

### 3. Verified Badge Display
**Purpose**: Pro users get blue verified badge next to their name

#### 3A. Profile Page Badge
**Test Steps**:
- [ ] Navigate to a Pro user's profile (http://localhost:3002/profile/USERNAME)
- [ ] Check the user's name at the top
- [ ] Verify blue BadgeCheck icon appears next to name
- [ ] Hover over badge - should show "Verified Pro User" tooltip
- [ ] Navigate to a FREE user's profile
- [ ] Verify NO badge appears

#### 3B. Post Feed Badge
**Test Steps**:
- [ ] Navigate to feed (http://localhost:3002/feed)
- [ ] Find posts by Pro users
- [ ] Check post header (where author name is)
- [ ] Verify blue verified badge appears next to Pro user names
- [ ] Check posts by Free users - should have NO badge

#### 3C. Product Posts Badge
**Test Steps**:
- [ ] Navigate to marketplace (http://localhost:3002/marketplace)
- [ ] Find products by Pro sellers
- [ ] Verify blue verified badge appears next to Pro seller names
- [ ] Check products by Free sellers - should have NO badge

**Expected Results**:
- Badge appears consistently for all Pro users
- Badge is blue with checkmark icon
- Free users never show badge
- Tooltip works on hover

---

### 4. Withdrawal Eligibility Check
**Purpose**: Only Pro users can withdraw earnings

#### 4A. Free User Withdrawal Test
**Test Steps**:
- [ ] Log in as a FREE user
- [ ] Navigate to Points page (http://localhost:3002/points)
- [ ] Click "Withdraw" button
- [ ] Withdrawal modal should open
- [ ] Verify error message: "You need an active Pro subscription to withdraw earnings"
- [ ] Verify "Upgrade to Pro" button appears with Crown icon
- [ ] Button should have purple-blue gradient
- [ ] Click "Upgrade to Pro" button
- [ ] Should navigate to `/subscription` page

#### 4B. Pro User Withdrawal Test
**Test Steps**:
- [ ] Log in as a PRO user
- [ ] Navigate to Points page
- [ ] Click "Withdraw" button
- [ ] Verify withdrawal form appears (no Pro upgrade prompt)
- [ ] Should be able to proceed with withdrawal

**Expected Results**:
- Free users see upgrade prompt
- Pro users can access withdrawal form
- Navigation to subscription page works

---

### 5. Admin User Management Page
**Purpose**: Admins can manage users, subscriptions, and bans

**Test Steps**:
- [ ] Log in as ADMIN user
- [ ] Navigate to Admin Dashboard (http://localhost:3002/admin)
- [ ] Verify "User Management" card appears FIRST
- [ ] Card shows total user count
- [ ] Click "User Management" card
- [ ] Should navigate to `/admin/users`

**On User Management Page**:
- [ ] Verify page loads with user list table
- [ ] Check stats cards at top:
  - [ ] Total Users
  - [ ] Pro Users (with purple count)
  - [ ] Banned Users (with red count)
  - [ ] This Page count
- [ ] Test search bar - search by username/email
- [ ] Test filter buttons:
  - [ ] All Users
  - [ ] Free (filters to free tier)
  - [ ] Pro (filters to pro tier with Crown icon)
- [ ] Check user table columns:
  - [ ] User (avatar, name, username, email)
  - [ ] Subscription (Free badge or Pro badge with Crown)
  - [ ] Stats (points, followers)
  - [ ] Status (Active/Banned badge)
  - [ ] Joined (date with calendar icon)
  - [ ] Actions (Upgrade/Downgrade + Ban/Unban buttons)

**Test Actions**:
- [ ] Find a FREE user, click "Upgrade" button
- [ ] Should show success toast
- [ ] User's subscription badge changes to "Pro"
- [ ] Click "Downgrade" button on Pro user
- [ ] Should show success toast
- [ ] Badge changes back to "Free"
- [ ] Click "Ban" button on any user
- [ ] Confirmation dialog appears with warning
- [ ] Click "Ban User" in dialog
- [ ] Success toast appears
- [ ] Status badge changes to "Banned" (red)
- [ ] Click "Unban" button on banned user
- [ ] User status returns to "Active"

**Test Pagination**:
- [ ] If more than 20 users, check pagination controls appear
- [ ] Click "Next" button
- [ ] Should load next page of users
- [ ] Click "Previous" button
- [ ] Should return to previous page
- [ ] Check page count display: "Showing X to Y of Z users"

**Expected Results**:
- All user data displays correctly
- Search and filters work
- Upgrade/downgrade changes subscription tier
- Ban/unban functionality works
- Pagination works for large user lists
- All actions show loading states and toasts

---

### 6. Admin Dashboard Integration
**Purpose**: All admin pages accessible from dashboard

**Test Steps**:
- [ ] Navigate to http://localhost:3002/admin
- [ ] Verify dashboard shows 6 cards:
  1. [ ] User Management (Users icon, blue)
  2. [ ] Point Settings (Zap icon, purple)
  3. [ ] Withdrawals (DollarSign icon, green)
  4. [ ] Referral Settings (UserPlus icon, blue)
  5. [ ] Signup Bonus (Gift icon, pink)
  6. [ ] General Settings (Settings icon, gray)
- [ ] Each card shows:
  - [ ] Icon with colored background
  - [ ] Title
  - [ ] Description
  - [ ] Stats/status
  - [ ] Arrow icon on hover
- [ ] Click each card to verify navigation:
  - [ ] User Management → `/admin/users`
  - [ ] Point Settings → `/admin/point-settings`
  - [ ] Withdrawals → `/admin/withdrawals`
  - [ ] Referral Settings → `/admin/referral-settings`
  - [ ] Signup Bonus → `/admin/signup-bonus`
  - [ ] General Settings → `/admin/settings`

**Expected Results**:
- All 6 cards display correctly
- Navigation works for all pages
- Stats are accurate
- Hover effects work

---

## 🔍 Database Verification

### Verify Subscription Data Structure
**Test in Supabase Dashboard**:

1. **Check `subscription_plans` table**:
   - [ ] Has 2 rows (free and pro)
   - [ ] Free plan: price_monthly = 0, price_yearly = 0
   - [ ] Pro plan: price_monthly = 2000, price_yearly = 20000
   - [ ] Pro plan features include: can_withdraw = true, verified_badge = true

2. **Check `users` table columns**:
   - [ ] subscription_tier (default: 'free')
   - [ ] subscription_status (default: 'inactive')
   - [ ] subscription_expires_at (nullable timestamp)

3. **Test user upgrade manually**:
   ```sql
   -- Upgrade a user to Pro (replace USER_ID)
   UPDATE users
   SET
     subscription_tier = 'pro',
     subscription_status = 'active',
     subscription_expires_at = NOW() + INTERVAL '1 month'
   WHERE id = 'USER_ID';
   ```
   - [ ] After running, verify user shows as Pro in app

4. **Test user downgrade manually**:
   ```sql
   -- Downgrade user back to Free
   UPDATE users
   SET
     subscription_tier = 'free',
     subscription_status = 'inactive',
     subscription_expires_at = NULL
   WHERE id = 'USER_ID';
   ```
   - [ ] After running, verify user shows as Free in app

---

## 🎨 UI/UX Verification

### Visual Consistency Checks
- [ ] All Pro badges use same blue color (#3B82F6)
- [ ] Crown icons are consistent across UI
- [ ] Gradients are smooth and professional
- [ ] Buttons have proper hover states
- [ ] Loading spinners appear during actions
- [ ] Toast notifications are clear and helpful
- [ ] Mobile responsive (check on small screen)
- [ ] Dark mode compatibility (if enabled)

### Accessibility Checks
- [ ] Badge tooltips are descriptive
- [ ] Buttons have clear labels
- [ ] Color contrast is sufficient
- [ ] Icons have appropriate sizes
- [ ] Keyboard navigation works

---

## 🐛 Error Handling Tests

### Test Error Scenarios
1. **Subscription without payment keys**:
   - [ ] Click "Subscribe Now" on subscription page
   - [ ] Should show error toast (Paystack keys not configured)
   - [ ] App should not crash

2. **Network errors**:
   - [ ] Disconnect internet
   - [ ] Try to load user management page
   - [ ] Should show error message
   - [ ] "Try Again" button should work when reconnected

3. **Invalid user data**:
   - [ ] Try to ban already banned user
   - [ ] Should handle gracefully
   - [ ] Try to upgrade Pro user
   - [ ] Should handle gracefully or show message

---

## 📊 Performance Checks

- [ ] Subscription page loads quickly (< 2 seconds)
- [ ] User management page handles 100+ users smoothly
- [ ] Verified badges don't slow down feed scrolling
- [ ] Search and filter are responsive
- [ ] No memory leaks when navigating between pages

---

## ✅ Final Verification

### Integration Test
**Complete User Journey**:
1. [ ] Sign up as new user (default: Free tier)
2. [ ] See upgrade banner in sidebar
3. [ ] Try to withdraw - blocked with upgrade prompt
4. [ ] Navigate to subscription page
5. [ ] View Pro plan features
6. [ ] Admin upgrades user to Pro from User Management
7. [ ] Refresh page
8. [ ] Upgrade banner disappears from sidebar
9. [ ] Blue verified badge appears on profile
10. [ ] Blue verified badge appears on posts
11. [ ] Can now access withdrawal form
12. [ ] Admin downgrades user back to Free
13. [ ] Verified badge disappears
14. [ ] Upgrade banner returns to sidebar

---

## 🚀 Next Steps After Testing

Once all tests pass:
1. ✅ Add Paystack API keys to `.env`
2. ✅ Test actual payment flow
3. ✅ Set up payment webhook on Railway
4. ✅ Test subscription activation after payment
5. ✅ Deploy to production
6. ✅ Monitor for errors

---

## 📝 Test Results Log

**Tester**: _________________
**Date**: _________________
**Browser**: _________________
**Pass Rate**: _____ / Total Tests

**Critical Issues Found**:
- [ ] None
- [ ] List issues below:

**Notes**:
