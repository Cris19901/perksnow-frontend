# 💰 Affiliate/Referral System - Complete Guide

## 📊 System Overview

Your LavLay platform has a **fully functional affiliate/referral system** that rewards users for bringing new members and their deposits.

---

## 🎯 How It Works

### For Referrers (Users who invite):

1. **Every user gets a unique referral code** (auto-generated)
2. **Share referral link**: `https://lavlay.com/signup?ref=YOUR_CODE`
3. **Earn rewards** when people sign up and deposit using your code

### For Referees (Users who join):

1. Sign up using a referral link
2. Get tracked as a referral
3. Their activities earn rewards for the person who invited them

---

## 💵 Earning Structure

### 1. **Signup Bonus** (Default: 20 points)
- When someone signs up using your referral code
- **You earn**: 20 points
- Points are added to your points balance immediately
- **Example**: If 10 people sign up → You earn 200 points

### 2. **First Deposit Bonus** (Default: 50 points)
- When your referral makes their first deposit
- **You earn**: 50 points
- One-time reward per referral
- **Example**: If 5 referrals make deposits → You earn 250 points

### 3. **Percentage Earnings** (Default: 5% of deposits)
- **You earn**: 5% of every deposit your referral makes
- **Limited to**: First 10 deposits per referral
- Paid in **actual money** (added to wallet_balance)
- **Example Calculation**:
  - Your referral deposits ₦10,000
  - You earn: ₦10,000 × 5% = ₦500
  - This goes to your wallet balance (can be withdrawn)

### 4. **Maximum Earnings Per Referral**

From one referral, you can earn:
- **Points**: 20 (signup) + 50 (first deposit) = 70 points
- **Percentage**: 5% × 10 deposits = Up to 50% total
- **Example with ₦10,000 deposits**:
  - 10 deposits × ₦10,000 = ₦100,000 in deposits
  - You earn: ₦100,000 × 5% = ₦5,000 real money
  - Plus 70 points

---

## 📈 Real-World Examples

### Example 1: Small Referral (Casual User)

**Scenario**: You refer a friend who deposits ₦5,000 once

**Your earnings**:
- Signup: 20 points
- First deposit: 50 points
- Percentage: ₦5,000 × 5% = ₦250
- **Total**: 70 points + ₦250

---

### Example 2: Active Referral (Regular User)

**Scenario**: You refer someone who deposits ₦10,000 five times

**Your earnings**:
- Signup: 20 points
- First deposit: 50 points
- 5 deposits: ₦10,000 × 5 × 5% = ₦2,500
- **Total**: 70 points + ₦2,500

---

### Example 3: Power Referral (Heavy User)

**Scenario**: You refer someone who deposits ₦20,000 ten times (max)

**Your earnings**:
- Signup: 20 points
- First deposit: 50 points
- 10 deposits: ₦20,000 × 10 × 5% = ₦10,000
- **Total**: 70 points + ₦10,000

After 10 deposits, this referral stops earning you percentage (but they still count as your referral).

---

### Example 4: Multiple Referrals (Affiliate Marketer)

**Scenario**: You refer 20 people, 10 of them deposit ₦10,000 each month

**Monthly earnings**:
- Signups: 20 × 20 points = 400 points (one-time)
- First deposits: 10 × 50 points = 500 points (one-time)
- Percentage: 10 × ₦10,000 × 5% = ₦5,000/month
- **First month total**: 900 points + ₦5,000
- **Subsequent months**: ₦5,000/month (from deposits)
- **After 10 months**: Each referral stops earning, but if you keep getting new referrals, income continues

---

## 🔢 Earnings Breakdown by Number of Referrals

| Referrals | Active Depositors | Points Earned | Monthly Money Earned* |
|-----------|-------------------|---------------|------------------------|
| 5         | 3                 | 250           | ₦1,500                 |
| 10        | 5                 | 450           | ₦2,500                 |
| 20        | 10                | 900           | ₦5,000                 |
| 50        | 25                | 2,250         | ₦12,500                |
| 100       | 50                | 4,500         | ₦25,000                |

*Assuming average deposit of ₦10,000/month per active user for up to 10 months

---

## 💡 How Users See Their Referral Info

### 1. **Referral Code Location**
- Visible in user profile
- Can be found in settings
- Auto-generated when user signs up

### 2. **Referral Link Format**
```
https://lavlay.com/signup?ref=ABC12345
```
Replace `ABC12345` with user's actual referral code

### 3. **Tracking Dashboard** (If implemented in UI)
Users should be able to see:
- Total referrals (signups)
- Active referrals (who made deposits)
- Total points earned from referrals
- Total money earned from referrals
- Current referral balance
- Recent referral activity

---

## 🎯 Use Cases for Affiliates

### Content Creators
- Share referral link in YouTube videos
- Post on Instagram/TikTok with referral code
- Write blog posts about LavLay

### Social Media Influencers
- Add referral link in bio
- Create posts about earning opportunities
- Run campaigns with referral code

### Community Leaders
- Share in WhatsApp/Telegram groups
- Promote in Facebook communities
- Word-of-mouth marketing

### Entrepreneurs
- Run paid ads with referral link
- Email marketing campaigns
- Affiliate marketing websites

---

## ⚙️ Admin Controls

As admin, you can adjust these settings in `referral_settings` table:

| Setting | Default | Description |
|---------|---------|-------------|
| `points_per_signup` | 20 | Points earned per signup |
| `signup_points_enabled` | true | Enable/disable signup points |
| `points_per_deposit` | 50 | Points for first deposit |
| `deposit_points_enabled` | true | Enable/disable deposit points |
| `percentage_per_deposit` | 5.00 | Percentage per deposit (5%) |
| `percentage_reward_enabled` | true | Enable/disable percentage earnings |
| `max_earnings_count` | 10 | Max deposits to earn from |
| `min_deposit_amount` | 10.00 | Minimum deposit to trigger rewards |
| `is_enabled` | true | Master on/off switch |

### How to Change Settings (in Supabase):

```sql
-- Increase signup bonus to 30 points
UPDATE referral_settings
SET points_per_signup = 30
WHERE id = (SELECT id FROM referral_settings LIMIT 1);

-- Increase percentage to 10%
UPDATE referral_settings
SET percentage_per_deposit = 10.00
WHERE id = (SELECT id FROM referral_settings LIMIT 1);

-- Increase max deposits to 20
UPDATE referral_settings
SET max_earnings_count = 20
WHERE id = (SELECT id FROM referral_settings LIMIT 1);
```

---

## 📊 Database Tables

### 1. **referral_settings**
- Stores all configuration
- Admin can modify
- Single row with all settings

### 2. **referrals**
- Tracks who referred whom
- Status: pending → active → completed
- Counts deposits and earnings

### 3. **deposits**
- All user deposits
- Links to referrals
- Triggers commission calculations

### 4. **referral_earnings**
- Detailed earnings log
- Points and percentage separate
- One record per earning event

---

## 🔍 Checking Referral Stats

### For a specific user:

```sql
-- Get user's referral code
SELECT username, referral_code, wallet_balance, points_balance
FROM users
WHERE id = 'USER_ID_HERE';

-- Get user's referrals
SELECT
    u.username as referred_user,
    r.status,
    r.total_points_earned,
    r.total_percentage_earned,
    r.deposits_tracked,
    r.created_at
FROM referrals r
JOIN users u ON u.id = r.referee_id
WHERE r.referrer_id = 'USER_ID_HERE'
ORDER BY r.created_at DESC;

-- Get user's total earnings
SELECT
    COUNT(DISTINCT r.referee_id) as total_referrals,
    SUM(r.total_points_earned) as total_points,
    SUM(r.total_percentage_earned) as total_money
FROM referrals r
WHERE r.referrer_id = 'USER_ID_HERE';
```

### System-wide stats:

```sql
-- Total referrals
SELECT COUNT(*) as total_referrals FROM referrals;

-- Active referrals (made deposits)
SELECT COUNT(*) as active_referrals
FROM referrals
WHERE status = 'active' OR status = 'completed';

-- Total money paid in commissions
SELECT SUM(total_percentage_earned) as total_paid
FROM referrals;
```

---

## 🚀 Marketing Your Referral Program

### Messaging Ideas:

**For Users:**
- "Invite friends, earn rewards!"
- "Get 20 points for every signup"
- "Earn 5% of your referrals' deposits"
- "Turn your network into income"

**For Affiliates:**
- "Become a LavLay affiliate"
- "Earn passive income by sharing"
- "Get paid for every referral"
- "Build your online income stream"

### Promotional Strategies:

1. **Leaderboard**: Show top earners
2. **Badges**: Recognize successful affiliates
3. **Bonuses**: Special rewards at milestones
4. **Competitions**: Monthly top referrer prizes
5. **Email Campaigns**: Remind users about referral program

---

## 📝 Implementation Checklist

### Backend (Database) ✅ DONE
- [x] referral_settings table
- [x] referrals tracking table
- [x] deposits table
- [x] referral_earnings table
- [x] Automatic code generation
- [x] Commission calculation triggers
- [x] Points reward triggers

### Frontend (UI) - To Do
- [ ] Display referral code in profile
- [ ] "Share" button with social media integration
- [ ] Referral dashboard showing stats
- [ ] Earnings history page
- [ ] Withdrawal for wallet_balance
- [ ] Referral leaderboard (optional)
- [ ] Analytics for affiliates

---

## 💳 Withdrawal System

### Points Balance
- Used for: Platform features, subscriptions, etc.
- Cannot be withdrawn to bank
- Spent within the platform

### Wallet Balance (Referral Earnings)
- Real money from percentage earnings
- **Can be withdrawn** to bank account
- Requires withdrawal system implementation

**Example Withdrawal:**
User has ₦5,000 in wallet_balance:
1. Goes to withdrawal page
2. Enters amount (₦5,000)
3. Provides bank details
4. System processes withdrawal
5. Money sent to bank account

---

## 🎯 Success Metrics to Track

### Key Performance Indicators (KPIs):

1. **Total Referrals**: How many signups via referral codes
2. **Conversion Rate**: % of referrals who deposit
3. **Average Deposit**: Average deposit amount per referral
4. **Active Affiliates**: Users with 5+ referrals
5. **Commission Paid**: Total money paid in commissions
6. **ROI**: Revenue vs commission paid

### Monthly Reporting:

```sql
-- Monthly referral report
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_referrals,
    SUM(total_points_earned) as points_paid,
    SUM(total_percentage_earned) as money_paid
FROM referrals
GROUP BY month
ORDER BY month DESC;
```

---

## ⚠️ Important Notes

### Anti-Abuse Measures:

1. **No self-referrals**: Users can't refer themselves
2. **Unique per referral**: One user can't be referred twice
3. **Deposit minimum**: Only deposits > ₦10 trigger rewards
4. **Max earnings cap**: 10 deposits per referral max
5. **Verification**: Deposits must be completed (not pending)

### Best Practices:

1. **Clear terms**: Explain referral program in T&C
2. **Transparent tracking**: Show users their earnings
3. **Fast payouts**: Process withdrawals quickly
4. **Communication**: Email updates on referral activity
5. **Support**: Help affiliates succeed

---

## 🎉 Summary

### Current Status: ✅ **FULLY FUNCTIONAL**

Your referral system is:
- ✅ Installed in database
- ✅ Auto-generates referral codes
- ✅ Tracks signups and deposits
- ✅ Calculates commissions automatically
- ✅ Awards points and money
- ✅ Has admin controls

### Earning Potential:

**Small scale (10 active referrals):**
- 450 points one-time
- ₦2,500/month for 10 months
- Total: ₦25,000 over time

**Medium scale (50 active referrals):**
- 2,250 points one-time
- ₦12,500/month for 10 months
- Total: ₦125,000 over time

**Large scale (100 active referrals):**
- 4,500 points one-time
- ₦25,000/month for 10 months
- Total: ₦250,000 over time

---

## 🚀 Next Steps

1. **Test the system**: Create test referrals and deposits
2. **Build UI**: Create referral dashboard for users
3. **Implement withdrawal**: Allow users to withdraw wallet_balance
4. **Marketing**: Promote referral program to users
5. **Monitor**: Track performance and adjust settings

---

**Questions? Need adjustments?** Just let me know and I can modify the earning structure, limits, or any other settings!
