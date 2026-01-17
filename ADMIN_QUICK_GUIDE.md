# Admin Quick Guide - fadiscojay@gmail.com

## 🎯 Your New Admin Powers

You now have **FULL ADMIN ACCESS** to the LavLay platform with 7 powerful tools.

---

## 🚀 Getting Started (2 minutes)

### Step 1: Access Admin Dashboard
```
1. Open browser: http://localhost:3002/login
2. Login with: fadiscojay@gmail.com
3. Navigate to: http://localhost:3002/admin
4. You'll see 7 admin tool cards
```

### Step 2: Explore Your Tools

#### 1. 👥 User Management (Blue)
**What it does**: Manage all users on the platform
- View all registered users
- Search users by name/email
- Filter by subscription (Free/Pro)
- Upgrade users to Pro
- Downgrade Pro users to Free
- Ban/Unban users
- View user stats (points, followers, posts)

**When to use**:
- User reports inappropriate behavior → Ban user
- Give someone Pro for testing → Upgrade
- Check user activity → View their stats

#### 2. ⚡ Point Settings (Purple)
**What it does**: Configure the point system
- Set points for different actions
- Configure point limits
- Adjust conversion rates
- Manage point economy

**When to use**:
- Change how many points users get for posts
- Adjust withdrawal minimums
- Fine-tune the reward system

#### 3. 💰 Withdrawals (Green)
**What it does**: Process user withdrawal requests
- View pending withdrawal requests
- Approve withdrawals
- Reject withdrawals
- Track withdrawal history

**When to use**:
- Users request to cash out points
- Review and approve legitimate requests
- Monitor platform payouts

#### 4. 🔗 Referral Settings (Blue)
**What it does**: Manage referral program
- Set referral rewards
- Configure bonus amounts
- Track referral performance

**When to use**:
- Change referral bonuses
- Adjust rewards for referring users
- Monitor referral system

#### 5. 🎁 Signup Bonus (Pink)
**What it does**: Configure new user bonuses
- Set welcome bonus amount
- Enable/disable signup bonus
- Track bonus distribution

**When to use**:
- Change welcome bonus points
- Promote user acquisition
- Adjust new user incentives

#### 6. 🛡️ Content Moderation (Red) ← NEW!
**What it does**: Review and moderate user content
- View all posts, reels, products, comments
- Search content by keyword or user
- Delete inappropriate content
- Keep platform safe and clean

**When to use**:
- User reports inappropriate content
- Regular content review
- Remove spam or violations
- Enforce community guidelines

**This is your most important tool for maintaining platform quality!**

#### 7. ⚙️ General Settings (Gray)
**What it does**: Platform-wide configuration
- App settings
- General configuration
- System parameters

**When to use**:
- Adjust platform settings
- Configure system behavior

---

## 🛡️ Content Moderation Deep Dive

Since this is your newest and most important tool, here's how to master it:

### Access Content Moderation:
```
Admin Dashboard → Click "Content Moderation" card
Or direct: http://localhost:3002/admin/moderation
```

### The 4 Tabs:

#### 📸 Posts Tab
**What you see**:
- User's profile picture
- Post text content
- Images (if any)
- Likes and comments count
- When it was posted

**What you can do**:
- Search by content or username
- Delete inappropriate posts
- Review reported content

**Example use case**:
> User reports offensive post
> 1. Go to Posts tab
> 2. Search for user's name
> 3. Find the post
> 4. Click delete button
> 5. Confirm deletion
> ✅ Post removed, success notification appears

#### 🎥 Reels Tab
**What you see**:
- Reel title and description
- Video indicator
- View count and likes
- Creator information

**What you can do**:
- Search reels by title/creator
- Delete violating videos
- Monitor video content

#### 🛍️ Products Tab
**What you see**:
- Product image
- Title and description
- Price in Naira
- Availability status
- Seller information

**What you can do**:
- Search products
- Remove prohibited items
- Monitor marketplace

**Example use case**:
> Fake/counterfeit product reported
> 1. Go to Products tab
> 2. Search product name
> 3. Review product details
> 4. Delete if violates policy
> ✅ Product removed from marketplace

#### 💬 Comments Tab
**What you see**:
- Comment text
- Commenter's name
- When it was posted
- Which post it's on

**What you can do**:
- Search comments
- Remove spam
- Delete harassment
- Monitor discussions

---

## 💡 Pro Tips

### Content Moderation Best Practices:

1. **Regular Reviews**:
   - Check moderation page daily
   - Review each tab weekly
   - Look for patterns of abuse

2. **Use Search Effectively**:
   - Search by username for repeat offenders
   - Search by keywords for specific issues
   - Use partial words for better results

3. **Be Decisive**:
   - Clear violations → Delete immediately
   - Borderline cases → Review context
   - When in doubt → Err on side of safety

4. **Document Actions**:
   - Keep notes of deleted content
   - Track repeat offenders
   - Build moderation guidelines

5. **Watch for Patterns**:
   - Same user multiple violations → Consider ban
   - Similar spam across users → Pattern attack
   - Sudden spike in reports → Investigate

### User Management Tips:

1. **Banning Users**:
   - Use for serious violations only
   - Check their full history first
   - Consider temporary vs permanent

2. **Pro Upgrades**:
   - Use for testing features
   - Reward valuable users
   - Special promotions

3. **Monitoring Activity**:
   - Check follower counts for bot activity
   - Review points balance for abuse
   - Track posting frequency

---

## 🚨 Common Scenarios

### Scenario 1: Inappropriate Post Reported
```
1. Go to Admin Dashboard
2. Click "Content Moderation"
3. Click "Posts" tab
4. Search for user's username
5. Find the reported post
6. Click delete button (trash icon)
7. Confirm deletion
✅ Post removed, user can't see it anymore
```

### Scenario 2: User Requests Pro Upgrade
```
1. Go to Admin Dashboard
2. Click "User Management"
3. Search for user's email or username
4. Find user in list
5. Click "Upgrade to Pro" button
6. Confirm upgrade
✅ User now has Pro subscription
```

### Scenario 3: Process Withdrawal Request
```
1. Go to Admin Dashboard
2. See "X pending" on Withdrawals card
3. Click "Withdrawals" card
4. Review pending requests
5. Check user eligibility (Pro status, points balance)
6. Approve or Reject
✅ Request processed
```

### Scenario 4: Spam Comments Attack
```
1. Go to Content Moderation
2. Click "Comments" tab
3. Search for suspicious keyword
4. Review all matching comments
5. Delete spam comments one by one
6. Note the usernames
7. Go to User Management
8. Ban repeat spammers
✅ Spam cleaned up, users banned
```

---

## 📊 Dashboard Stats

When you open the Admin Dashboard, you'll see 4 stat cards:

1. **Total Users**: How many registered users
2. **Total Points**: Points in circulation
3. **Pending Requests**: Awaiting your review
4. **Total Withdrawals**: All-time payouts

These update in real-time!

---

## ⚠️ Important Warnings

### Things to AVOID:

❌ **Don't** delete content without reviewing it first
❌ **Don't** ban users for first-time minor violations
❌ **Don't** approve withdrawals without checking eligibility
❌ **Don't** change point settings without testing impact
❌ **Don't** upgrade users to Pro without reason

### Things to DO:

✅ **Do** review content context before deleting
✅ **Do** give warnings before bans when appropriate
✅ **Do** verify Pro status before approving withdrawals
✅ **Do** test changes on dev before production
✅ **Do** keep notes of admin actions

---

## 🔥 Power User Shortcuts

### Keyboard Navigation:
- `Ctrl + K`: Quick search (if implemented)
- `Esc`: Close modals
- `Tab`: Navigate between fields
- `Enter`: Submit forms

### Quick Links:
- Admin Dashboard: `/admin`
- Content Moderation: `/admin/moderation`
- User Management: `/admin/users`
- Withdrawals: `/admin/withdrawals`

### Browser Bookmarks (Recommended):
```
📌 Admin Dashboard
📌 Content Moderation
📌 User Management
📌 Withdrawals
```

---

## 📱 Mobile Admin

All admin pages work on mobile too!

**Mobile Tips**:
- Rotate to landscape for better view
- Use search to find content quickly
- Swipe to scroll through lists
- Tap cards to navigate

---

## 🆘 Need Help?

### If Something Doesn't Work:

1. **Check browser console**:
   - Press F12
   - Look for red errors
   - Screenshot and report

2. **Refresh the page**:
   - Sometimes fixes display issues
   - Clears cache

3. **Log out and back in**:
   - Refreshes your session
   - Updates permissions

4. **Check documentation**:
   - [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
   - [CONTENT_MODERATION_IMPLEMENTATION.md](CONTENT_MODERATION_IMPLEMENTATION.md)
   - [SESSION_COMPLETE_SUMMARY.md](SESSION_COMPLETE_SUMMARY.md)

---

## 🎉 You're Ready!

You now have complete control over the LavLay platform. Use your admin powers wisely to:
- Keep the community safe
- Provide great user experiences
- Maintain platform quality
- Support your users

**Your main URL**: http://localhost:3002/admin

**Your main tool**: Content Moderation (for daily use)

**Remember**: With great power comes great responsibility! 🦸‍♂️

---

**Admin**: fadiscojay@gmail.com
**Access Level**: Full Admin ⭐
**Status**: Active ✅
**Last Updated**: January 12, 2026
