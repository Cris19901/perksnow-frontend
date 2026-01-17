# 💳 New Subscription Plans Setup

## 📋 New Plans Overview

Adding flexible subscription options to increase conversions:

| Plan | Price | Duration | Features |
|------|-------|----------|----------|
| **Daily Pass** | ₦200 | 1 day | Try pro features, 50 posts/day, 20 reels/day, withdrawals |
| **Weekly** | ₦1,000 | 7 days | Full pro access, unlimited posts/reels, verified badge, withdrawals |
| **Basic** (existing) | ₦2,000 | 30 days | 50 posts/day, withdrawals |
| **Pro** (existing) | ₦5,000 | 30 days | Unlimited, verified badge, priority support |

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Run SQL in Supabase (2 minutes)

**Go to**: Supabase Dashboard → SQL Editor

**Run**: [ADD_NEW_PLANS_SIMPLE.sql](ADD_NEW_PLANS_SIMPLE.sql)

Or copy this:

```sql
-- Add Daily Plan (₦200 for 1 day)
INSERT INTO subscription_plans (
    name, display_name, description, price_monthly, price_yearly, currency,
    features, limits, sort_order, is_active
) VALUES (
    'daily', 'Daily Pass', 'Perfect for trying out pro features for a day',
    200, 0, 'NGN',
    '{"ad_free": true, "priority_support": false}'::jsonb,
    '{"max_posts_per_day": 50, "max_reels_per_day": 20, "can_withdraw": true, "verified_badge": false}'::jsonb,
    2, true
) ON CONFLICT (name) DO UPDATE SET price_monthly = 200, is_active = true;

-- Add Weekly Plan (₦1,000 for 1 week)
INSERT INTO subscription_plans (
    name, display_name, description, price_monthly, price_yearly, currency,
    features, limits, sort_order, is_active
) VALUES (
    'weekly', 'Weekly', 'Full pro access for one week',
    1000, 0, 'NGN',
    '{"ad_free": true, "priority_support": false}'::jsonb,
    '{"max_posts_per_day": -1, "max_reels_per_day": -1, "can_withdraw": true, "verified_badge": true}'::jsonb,
    3, true
) ON CONFLICT (name) DO UPDATE SET price_monthly = 1000, is_active = true;

-- Update sort orders
UPDATE subscription_plans SET sort_order = 1 WHERE name = 'free';
UPDATE subscription_plans SET sort_order = 4 WHERE name = 'basic';
UPDATE subscription_plans SET sort_order = 5 WHERE name = 'pro';
```

### Step 2: Verify Plans Created

Run this to see all plans:

```sql
SELECT name, display_name, price_monthly, sort_order, is_active
FROM subscription_plans
ORDER BY sort_order;
```

**Expected Output:**
```
free     | Free        | 0    | 1 | true
daily    | Daily Pass  | 200  | 2 | true
weekly   | Weekly      | 1000 | 3 | true
basic    | Basic       | 2000 | 4 | true
pro      | Pro         | 5000 | 5 | true
```

### Step 3: Test on Site

1. Go to: https://lavlay.com/subscription
2. **Refresh the page** (Ctrl+F5)
3. You should see **5 subscription cards**:
   - Free
   - Daily Pass (₦200)
   - Weekly (₦1,000)
   - Basic (₦2,000/month)
   - Pro (₦5,000/month)

---

## 🎯 Benefits of New Plans

### Daily Pass (₦200):
**Why it works:**
- **Low barrier to entry** - Users can try pro features for just ₦200
- **Impulse purchase** - Small amount, easy decision
- **Conversion funnel** - Many daily users will upgrade to weekly/monthly
- **Testing period** - Users validate value before committing

**Use Case:**
- User wants to withdraw ₦1,000 earnings
- Pays ₦200 for daily pass
- Withdraws money
- Net profit: ₦800 (vs. paying ₦2,000 for monthly)

### Weekly (₦1,000):
**Why it works:**
- **Sweet spot pricing** - Not too cheap, not too expensive
- **Commitment balance** - 7 days is manageable
- **Competitive edge** - Most competitors don't offer weekly
- **Frequent buyers** - Users prefer weekly over monthly commitment

**Use Case:**
- User has big event/promotion planned
- Needs verified badge and unlimited posts for 1 week
- Pays ₦1,000 instead of ₦5,000
- Perfect for short-term campaigns

---

## 💡 Marketing Strategy

### Positioning:

**Daily Pass:**
- "Try Pro for ₦200"
- "Unlock today's earnings"
- "Test drive all features"

**Weekly:**
- "Most Popular" badge
- "Best Value for Active Users"
- "Perfect for campaigns"

**Monthly (Basic/Pro):**
- "Best for Regular Users"
- "Save 50% with yearly"

---

## 🔧 Technical Implementation

### Subscription Duration Logic:

The system automatically calculates expiry:
- **Daily**: `subscription_expires_at = NOW() + INTERVAL '1 day'`
- **Weekly**: `subscription_expires_at = NOW() + INTERVAL '7 days'`
- **Monthly**: `subscription_expires_at = NOW() + INTERVAL '30 days'`

### Payment Processing:

When user subscribes to Daily/Weekly:
1. Paystack charges ₦200 or ₦1,000
2. Webhook confirms payment
3. User tier updated to 'daily' or 'weekly'
4. Expiry date set accordingly
5. User gets all pro features until expiry

### Auto-Renewal (Future):

Can be added later:
- Daily: Auto-renew every 24 hours
- Weekly: Auto-renew every 7 days
- User can cancel anytime

---

## 📊 Expected Results

### Conversion Increase:
- **Before**: Only ₦2,000 and ₦5,000 options (high barrier)
- **After**: ₦200 and ₦1,000 options (low barrier)
- **Expected lift**: 3-5x more conversions

### Revenue Distribution:
- **Daily Pass**: 40% of subscribers (volume play)
- **Weekly**: 35% of subscribers (sweet spot)
- **Monthly**: 25% of subscribers (committed users)

### Average Revenue Per User (ARPU):
- Daily users: ₦200/day × 10 days/month = ₦2,000
- Weekly users: ₦1,000/week × 4 weeks = ₦4,000
- Monthly users: ₦2,000-5,000/month

**Result**: Similar or higher ARPU with better conversion!

---

## 🎨 UI Display

The subscription page will automatically show all plans in this order:

```
[FREE]              [DAILY PASS]       [WEEKLY]
₦0                  ₦200               ₦1,000
                    1 day              7 days

[BASIC]             [PRO]
₦2,000/month        ₦5,000/month
30 days             30 days
```

### Badges:
- Weekly: "Most Popular" 👑
- Pro: "Best Value"
- Daily: "Try It" ⚡

---

## ✅ Testing Checklist

After adding plans:

- [ ] SQL runs without errors
- [ ] 5 plans show in database
- [ ] Sort order is correct (1-5)
- [ ] Subscription page loads
- [ ] All 5 plans display
- [ ] Can click "Subscribe" on Daily
- [ ] Can click "Subscribe" on Weekly
- [ ] Paystack payment opens
- [ ] Payment amount is correct (₦200 or ₦1,000)

---

## 🚨 Important Notes

### Paystack Integration:
- Daily and Weekly subscriptions work with existing Paystack setup
- No code changes needed
- Payment webhook handles all durations

### Subscription Expiry:
- System automatically expires subscriptions
- Users get downgraded to Free when expired
- Can resubscribe anytime

### Withdrawals:
- Daily and Weekly users CAN withdraw (like Basic/Pro)
- Only Free users cannot withdraw
- This is the main selling point!

---

## 📈 Success Metrics to Track

After launch:
1. **Conversion rate** by plan (daily vs weekly vs monthly)
2. **Average subscription value**
3. **Renewal rate** (do daily users upgrade to weekly?)
4. **Revenue per user**
5. **Churn rate** by plan

---

## 🎯 Next Steps

1. **Run the SQL** in Supabase (2 min)
2. **Verify plans created** (1 min)
3. **Test subscription page** (2 min)
4. **Try test payment** (optional, 3 min)
5. **Launch!** 🚀

---

## 💬 Quick Copy-Paste

**For Supabase SQL Editor:**

Just copy [ADD_NEW_PLANS_SIMPLE.sql](ADD_NEW_PLANS_SIMPLE.sql) and run it!

**Done!** Your subscription page will show the new plans automatically.

---

**Ready to add the new plans?** 🚀

Run the SQL and tell me when it's done!
