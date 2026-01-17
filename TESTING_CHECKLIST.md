# Testing Checklist - New Features

## ✅ Database Migrations Complete
- [x] RUN_THIS_SQL.sql executed successfully
- [x] phone_number column added to users table
- [x] Admin privileges granted to fadiscojay@gmail.com

---

## 🧪 Testing Guide

### Test 1: Admin Access (5 minutes)

#### Steps:
1. **Log in as admin**:
   - Email: `fadiscojay@gmail.com`
   - Password: [your password]

2. **Navigate to Admin Dashboard**:
   - URL: http://localhost:3002/admin
   - Should see 7 admin tool cards

3. **Verify all admin cards are visible**:
   - [ ] User Management (blue, Users icon)
   - [ ] Point Settings (purple, Zap icon)
   - [ ] Withdrawals (green, DollarSign icon)
   - [ ] Referral Settings (blue, UserPlus icon)
   - [ ] Signup Bonus (pink, Gift icon)
   - [ ] **Content Moderation (red, Shield icon)** ← NEW
   - [ ] General Settings (gray, Settings icon)

4. **Test navigation**:
   - [ ] Click each card
   - [ ] Verify each page loads correctly
   - [ ] Use "Back to Admin Dashboard" button

#### Expected Results:
✅ All 7 cards visible
✅ Content Moderation card has red color and Shield icon
✅ All pages load without errors
✅ Navigation works smoothly

---

### Test 2: Content Moderation (10 minutes)

#### Steps:
1. **Navigate to Content Moderation**:
   - Click "Content Moderation" card from Admin Dashboard
   - URL: http://localhost:3002/admin/moderation

2. **Test Posts Tab**:
   - [ ] Posts tab is active by default
   - [ ] Posts load with user avatars
   - [ ] Post content displays correctly
   - [ ] Images show if available
   - [ ] Likes and comments counts visible
   - [ ] Test search: type a username or keyword
   - [ ] Posts filter based on search
   - [ ] Click delete button on a post
   - [ ] Confirm deletion dialog appears
   - [ ] Post disappears after confirmation
   - [ ] Success toast notification appears

3. **Test Reels Tab**:
   - [ ] Click "Reels" tab
   - [ ] Reels load with titles and descriptions
   - [ ] View count and likes count visible
   - [ ] Test search functionality
   - [ ] Delete a reel
   - [ ] Verify removal and notification

4. **Test Products Tab**:
   - [ ] Click "Products" tab
   - [ ] Products load with images
   - [ ] Price displays correctly
   - [ ] Availability status shows (Available/Unavailable)
   - [ ] Test search functionality
   - [ ] Delete a product
   - [ ] Verify removal

5. **Test Comments Tab**:
   - [ ] Click "Comments" tab
   - [ ] Comments load with user info
   - [ ] Comment text displays correctly
   - [ ] Test search functionality
   - [ ] Delete a comment
   - [ ] Verify removal

6. **Test Empty States**:
   - [ ] Search for non-existent content
   - [ ] Empty state message appears
   - [ ] Appropriate icon displays

7. **Test Mobile Responsive**:
   - [ ] Resize browser to mobile width
   - [ ] Tabs display correctly
   - [ ] Cards are responsive
   - [ ] Search bar adapts to mobile
   - [ ] Mobile bottom nav appears

#### Expected Results:
✅ All 4 tabs work correctly
✅ Content loads without errors
✅ Search filters content properly
✅ Delete operations work with confirmation
✅ Toast notifications appear
✅ Empty states display correctly
✅ Mobile responsive design works

---

### Test 3: Signup Form with Phone Number (5 minutes)

#### Steps:
1. **Log out** from admin account

2. **Navigate to Signup Page**:
   - URL: http://localhost:3002/signup

3. **Verify form fields** (in order):
   - [ ] Username field (required)
   - [ ] Full Name field (optional)
   - [ ] **Phone Number field (optional)** ← NEW
   - [ ] Email field (required)
   - [ ] Password field (required, min 6 chars)
   - [ ] Referral Code field (optional)

4. **Test signup with phone number**:
   - Username: `testuser123`
   - Full Name: `Test User`
   - Phone Number: `+234 800 000 0000`
   - Email: `testuser123@example.com`
   - Password: `password123`
   - [ ] Fill all fields
   - [ ] Click "Sign Up"
   - [ ] Account created successfully
   - [ ] Redirected to appropriate page

5. **Verify in database** (Supabase Dashboard):
   - [ ] Go to Supabase → Table Editor → users
   - [ ] Find the new user by email
   - [ ] Verify phone_number column has: `+234 800 000 0000`

6. **Test signup without phone number**:
   - Username: `testuser456`
   - Email: `testuser456@example.com`
   - Password: `password123`
   - [ ] Leave phone number blank
   - [ ] Fill required fields only
   - [ ] Click "Sign Up"
   - [ ] Account created successfully
   - [ ] Verify phone_number is NULL in database

7. **Test username validation**:
   - [ ] Try to signup with existing username
   - [ ] Error: "Username already taken"
   - [ ] Error displays correctly

#### Expected Results:
✅ Phone number field visible between Full Name and Email
✅ Field has placeholder: "+234 800 000 0000"
✅ Field is optional (not required)
✅ Signup works with phone number
✅ Signup works without phone number
✅ Phone number saves to database correctly
✅ Username validation works

---

### Test 4: Username Selection (3 minutes)

#### Steps:
1. **Navigate to Signup Page**:
   - URL: http://localhost:3002/signup

2. **Test username field**:
   - [ ] Username field is first in form
   - [ ] Field is required
   - [ ] Type a custom username
   - [ ] Username is editable
   - [ ] Try existing username → error
   - [ ] Try new username → success

#### Expected Results:
✅ Users can select their own username
✅ Username field is editable
✅ Uniqueness validation works

---

### Test 5: Full Integration Test (10 minutes)

#### Scenario: Complete Admin Workflow

1. **Admin logs in**:
   - [ ] Log in as fadiscojay@gmail.com
   - [ ] Access admin dashboard

2. **Create test content**:
   - [ ] Log out, create regular user account
   - [ ] Create a test post with inappropriate content
   - [ ] Create a test comment
   - [ ] Log out

3. **Moderate content as admin**:
   - [ ] Log in as admin
   - [ ] Go to Content Moderation
   - [ ] Find the test post
   - [ ] Delete the test post
   - [ ] Find the test comment
   - [ ] Delete the test comment
   - [ ] Verify both removed

4. **Manage users**:
   - [ ] Go to User Management
   - [ ] Find the test user
   - [ ] Test upgrade to Pro
   - [ ] Test downgrade to Free
   - [ ] Test ban user
   - [ ] Test unban user

5. **Check other admin features**:
   - [ ] Point Settings page loads
   - [ ] Withdrawals page loads
   - [ ] Referral Settings page loads
   - [ ] Signup Bonus page loads
   - [ ] General Settings page loads

#### Expected Results:
✅ Complete admin workflow works smoothly
✅ All pages load without errors
✅ All admin actions complete successfully
✅ Content moderation integrates with other features

---

## 🐛 Common Issues & Solutions

### Issue 1: Admin Dashboard Not Accessible
**Symptoms**:
- Redirected away from /admin
- "Access Denied" or similar error

**Solution**:
1. Verify SQL ran: `SELECT is_admin FROM users WHERE email = 'fadiscojay@gmail.com'`
2. Should show: `is_admin = true`
3. Log out and log back in
4. Clear browser cache/cookies

### Issue 2: Content Moderation Page Empty
**Symptoms**:
- All tabs show "No [content] found"

**Solution**:
1. Create test content first:
   - Log in as regular user
   - Create posts, reels, products, comments
2. Refresh moderation page
3. Check browser console for errors

### Issue 3: Phone Number Not Saving
**Symptoms**:
- Signup succeeds but phone_number is NULL

**Solution**:
1. Verify migration ran: `SELECT * FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number'`
2. Check browser console for errors
3. Verify auth.ts updated correctly

### Issue 4: Delete Not Working
**Symptoms**:
- Click delete, nothing happens
- Or error toast appears

**Solution**:
1. Check browser console for errors
2. Verify RLS policies allow admin DELETE
3. Check Supabase logs for policy violations

### Issue 5: Search Not Working
**Symptoms**:
- Type in search, content doesn't filter

**Solution**:
1. Check browser console for JavaScript errors
2. Verify content has searchable text
3. Try different search terms

---

## ✅ Final Verification

After completing all tests above, verify:

- [ ] All 7 admin pages accessible
- [ ] Content Moderation fully functional
- [ ] Signup form has phone number field
- [ ] Phone numbers save to database
- [ ] Username selection works
- [ ] No console errors
- [ ] No broken links
- [ ] Mobile responsive
- [ ] Build succeeds: `npm run build`
- [ ] Dev server runs: `npm run dev`

---

## 📊 Test Results Template

### Test Session:
- **Date**: _______________
- **Tester**: _______________
- **Browser**: _______________
- **Environment**: http://localhost:3002

### Results:
| Test | Status | Notes |
|------|--------|-------|
| Admin Access | ⬜ Pass / ⬜ Fail | |
| Content Moderation | ⬜ Pass / ⬜ Fail | |
| Signup with Phone | ⬜ Pass / ⬜ Fail | |
| Username Selection | ⬜ Pass / ⬜ Fail | |
| Full Integration | ⬜ Pass / ⬜ Fail | |

### Issues Found:
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Overall Assessment:
- [ ] All tests passed - Ready for next phase
- [ ] Minor issues found - Need fixes
- [ ] Major issues found - Requires attention

---

## 🚀 Next Steps After Testing

### If All Tests Pass:
1. Mark "Test new features in browser" as completed
2. Move to Phase 4: Set up 7-day onboarding email system
3. Consider deploying to staging environment

### If Issues Found:
1. Document all issues in detail
2. Create bug reports
3. Fix critical issues first
4. Re-test after fixes

---

**Testing Time**: ~30-40 minutes for complete testing
**Priority**: High - Required before moving to next phase
**Documentation**: [SESSION_COMPLETE_SUMMARY.md](SESSION_COMPLETE_SUMMARY.md)
