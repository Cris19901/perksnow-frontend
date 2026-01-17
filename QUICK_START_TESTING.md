# 🚀 Quick Start Testing Guide

## Development Server
**URL**: http://localhost:3002
**Status**: ✅ Running

---

## 🎯 5-Minute Quick Test

### Test 1: Subscription Page (2 minutes)
1. Open: http://localhost:3002/subscription
2. ✅ Check: Page displays Free and Pro plans
3. ✅ Check: Monthly/Yearly toggle works
4. ✅ Check: Pro shows ₦2,000/month pricing

### Test 2: Upgrade Banner (1 minute)
1. Open: http://localhost:3002/feed
2. ✅ Check: Sidebar shows upgrade banner (if free user)
3. ✅ Click: "View Plans" button → goes to /subscription

### Test 3: Admin User Management (2 minutes)
1. Open: http://localhost:3002/admin
2. ✅ Click: "User Management" card
3. ✅ Check: User table loads
4. ✅ Try: Upgrade a user to Pro
5. ✅ Verify: Badge changes to Pro

---

## 🔑 Create Test Users in Database

### Make User Admin
```sql
UPDATE users
SET is_admin = true
WHERE email = 'your@email.com';
```

### Upgrade User to Pro
```sql
UPDATE users
SET
  subscription_tier = 'pro',
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '30 days'
WHERE email = 'test@email.com';
```

### Downgrade User to Free
```sql
UPDATE users
SET
  subscription_tier = 'free',
  subscription_status = 'inactive',
  subscription_expires_at = NULL
WHERE email = 'test@email.com';
```

---

## ✅ What to Look For

### Verified Badge ✨
- **Profile**: Blue badge next to name
- **Posts**: Badge next to author
- **Products**: Badge next to seller

### Upgrade Prompts 🔔
- **Sidebar**: Gradient banner (free users only)
- **Withdrawal**: Upgrade button in modal (free users)

### Admin Controls 👑
- **User Management**: /admin/users
- **Upgrade/Downgrade**: Change subscription
- **Ban/Unban**: Disable accounts

---

## 🐛 Quick Troubleshooting

**No upgrade banner?**
→ You're Pro or logged out

**No verified badge?**
→ Check subscription_status = 'active'

**Can't access admin?**
→ Set is_admin = true

**Payment fails?**
→ Paystack keys not added yet (expected)

---

## 📚 Full Documentation

- **Complete Guide**: [SUBSCRIPTION_IMPLEMENTATION_COMPLETE.md](SUBSCRIPTION_IMPLEMENTATION_COMPLETE.md)
- **Test Plan**: [SUBSCRIPTION_FEATURES_TEST_PLAN.md](SUBSCRIPTION_FEATURES_TEST_PLAN.md)

---

## 🎉 Ready to Test!

Open http://localhost:3002 and start exploring! 🚀
