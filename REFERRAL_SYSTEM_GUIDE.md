<!-- Due to length constraints, I'll create a concise version -->
# Complete Referral System - Implementation Guide

## Overview

A comprehensive 2-tier referral system allowing users to earn:
1. **Points Rewards** - When someone signs up + when they make first deposit
2. **Percentage Earnings** - From referral deposits (up to 10 times)

All settings are controlled from admin dashboard.

## Features

✅ **Dual Reward System**:
- Points when someone signs up with your code
- Points when your referral makes first deposit
- Percentage earnings from referral deposits (up to 10 deposits)

✅ **Admin Controls**:
- Enable/disable entire system
- Configure points per signup
- Configure points per deposit
- Set percentage per deposit
- Set maximum deposits tracked (default: 10)
- Set minimum deposit amount

✅ **User Features**:
- Unique referral code for each user
- Referral dashboard with stats
- Track earnings (points + money)
- Copy referral link/code
- View all referrals

✅ **Automatic Tracking**:
- Referral codes auto-generated on signup
- Rewards auto-awarded via database triggers
- Earnings tracked in real-time

## Setup Instructions

### Step 1: Run Database Migration

```sql
-- In Supabase SQL Editor, run:
CREATE_REFERRAL_SYSTEM.sql
```

This creates:
- `referral_settings` - Admin configuration
- `referrals` - Tracks referrer-referee relationships
- `deposits` - Deposit tracking
- `referral_earnings` - Earnings history
- Adds columns to `users` table: `referral_code`, `referred_by`, `wallet_balance`
- Auto-generation functions and triggers
- RLS policies

**Default Settings**:
- Signup Points: 20 points
- Deposit Points: 50 points
- Percentage: 5% per deposit
- Max Deposits: 10
- Min Deposit: $10

### Step 2: Add Admin Route

```typescript
// In your router (e.g., App.tsx)
import { AdminReferralSettingsPage } from '@/components/pages/AdminReferralSettingsPage';

<Route path="/admin/referral-settings" element={<AdminReferralSettingsPage />} />
```

### Step 3: Add User Referral Page

```typescript
// Create a referral page
import { ReferralDashboard } from '@/components/ReferralDashboard';

export function ReferralPage() {
  return (
    <div className="container mx-auto p-6">
      <ReferralDashboard />
    </div>
  );
}

// Add route
<Route path="/referrals" element={<ReferralPage />} />
```

### Step 4: Test the System

1. **Get your referral code**:
   - Login as any user
   - Go to `/referrals`
   - Copy your referral code (e.g., `ABC12345`)

2. **Test signup with referral**:
   - Logout
   - Visit `/signup?ref=ABC12345`
   - Create new account
   - Referrer should get signup points immediately

3. **Test deposit rewards** (after implementing deposits):
   - As the new user, make a deposit ≥ $10
   - Referrer should get:
     - Deposit points (first deposit only)
     - Percentage earnings (up to 10 deposits)

## How It Works

### User Flow

```
1. User A signs up → Gets unique referral code (e.g., "XYZ123")
2. User A shares code with User B
3. User B signs up with code → User A gets 20 points (signup reward)
4. User B makes deposit of $100 → User A gets:
   - 50 points (first deposit bonus)
   - $5.00 (5% of $100)
5. User B makes 9 more deposits → User A gets $5 each time
6. After 10 deposits → User A stops earning from User B
```

### Database Flow

**Signup:**
```sql
1. User created in users table
2. Trigger generates referral_code
3. If ref code provided → track_referral() called
4. Creates entry in referrals table
5. Awards signup points to referrer
6. Records in referral_earnings
```

**Deposit:**
```sql
1. Deposit created with status='pending'
2. When status updated to 'completed' → Trigger fires
3. process_deposit_rewards() checks:
   - Is user referred?
   - Is system enabled?
   - Is deposit ≥ min_amount?
4. Awards rewards:
   - Points (first deposit only)
   - Percentage (up to 10 deposits)
5. Updates referrals table
6. Records in referral_earnings
```

## Admin Dashboard

Navigate to `/admin/referral-settings`

**General Tab**:
- Enable/disable system
- Set minimum deposit amount

**Points Rewards Tab**:
- Configure signup points reward
- Configure deposit points reward
- Enable/disable each

**Percentage Rewards Tab**:
- Set percentage per deposit
- Set max deposits tracked
- Enable/disable

**Statistics**:
- Total referrals
- Points awarded
- Money awarded
- Deposits tracked

## User Referral Dashboard

Navigate to `/referrals`

**Features**:
- Display referral code
- Copy referral link button
- Stats cards (total referrals, active, points, money)
- List of all referrals with earnings
- "How it works" section

## Database Schema

### referral_settings
```sql
points_per_signup INTEGER (20)
signup_points_enabled BOOLEAN
points_per_deposit INTEGER (50)
deposit_points_enabled BOOLEAN
percentage_per_deposit DECIMAL (5.00)
percentage_reward_enabled BOOLEAN
max_earnings_count INTEGER (10)
min_deposit_amount DECIMAL (10.00)
is_enabled BOOLEAN
```

### referrals
```sql
referrer_id UUID → Who made the referral
referee_id UUID → Who was referred
status VARCHAR → 'pending' | 'active' | 'completed'
first_deposit_at TIMESTAMP
total_points_earned INTEGER
total_percentage_earned DECIMAL
deposits_tracked INTEGER
```

### deposits
```sql
user_id UUID
amount DECIMAL
currency VARCHAR
status VARCHAR → 'pending' | 'completed' | 'failed'
referral_commission_paid BOOLEAN
referral_id UUID
```

### referral_earnings
```sql
referral_id UUID
deposit_id UUID (nullable for signup rewards)
referrer_id UUID
earning_type VARCHAR → 'points_signup' | 'points_deposit' | 'percentage'
points_earned INTEGER
percentage_earned DECIMAL
deposit_amount DECIMAL
```

### users (added columns)
```sql
referral_code VARCHAR(20) UNIQUE
referred_by UUID
wallet_balance DECIMAL(10,2)
```

## API Functions

### track_referral(p_referee_id, p_referral_code)
- Called after signup
- Links referee to referrer
- Awards signup points
- Creates referral record

### process_deposit_rewards()
- Trigger function on deposits
- Awards deposit points (first deposit)
- Awards percentage earnings (up to max)
- Updates tracking

### get_referral_stats(p_user_id)
- Returns user's referral statistics
- Total referrals, active, points, money

## Customization

### Change Default Rewards

```sql
UPDATE referral_settings
SET
    points_per_signup = 30,  -- More points for signups
    points_per_deposit = 100,  -- More points for deposits
    percentage_per_deposit = 10.00,  -- Higher percentage
    max_earnings_count = 20  -- Track more deposits
WHERE id = (SELECT id FROM referral_settings LIMIT 1);
```

### Disable Specific Rewards

```sql
-- Disable percentage rewards, keep points only
UPDATE referral_settings
SET percentage_reward_enabled = false;

-- Disable signup points, keep deposit rewards
UPDATE referral_settings
SET signup_points_enabled = false;
```

## Testing & Verification

### Check User's Referral Code

```sql
SELECT id, email, referral_code, referred_by
FROM users
WHERE email = 'user@example.com';
```

### Check Referral Tracking

```sql
SELECT
    r.id,
    ref_er.email as referrer_email,
    ref_ee.email as referee_email,
    r.status,
    r.total_points_earned,
    r.total_percentage_earned,
    r.deposits_tracked
FROM referrals r
JOIN users ref_er ON ref_er.id = r.referrer_id
JOIN users ref_ee ON ref_ee.id = r.referee_id
ORDER BY r.created_at DESC;
```

### Check Earnings

```sql
SELECT
    e.earning_type,
    u.email as referrer,
    e.points_earned,
    e.percentage_earned,
    e.deposit_amount,
    e.created_at
FROM referral_earnings e
JOIN users u ON u.id = e.referrer_id
ORDER BY e.created_at DESC
LIMIT 20;
```

### Test Deposit Reward

```sql
-- Create test deposit
INSERT INTO deposits (user_id, amount, status)
VALUES ('referee-user-id', 100.00, 'pending');

-- Complete the deposit (triggers rewards)
UPDATE deposits
SET status = 'completed', completed_at = NOW()
WHERE id = 'deposit-id';

-- Check if rewards were awarded
SELECT * FROM referral_earnings
WHERE deposit_id = 'deposit-id';
```

## Monitoring

### Dashboard Queries

**Top Referrers**:
```sql
SELECT
    u.email,
    u.username,
    COUNT(r.id) as total_referrals,
    SUM(r.total_points_earned) as points_earned,
    SUM(r.total_percentage_earned) as money_earned
FROM users u
JOIN referrals r ON r.referrer_id = u.id
GROUP BY u.id, u.email, u.username
ORDER BY money_earned DESC
LIMIT 10;
```

**Recent Activity**:
```sql
SELECT
    e.created_at,
    u.email,
    e.earning_type,
    e.points_earned,
    e.percentage_earned
FROM referral_earnings e
JOIN users u ON u.id = e.referrer_id
ORDER BY e.created_at DESC
LIMIT 50;
```

## Troubleshooting

### Rewards Not Being Awarded

1. Check if system is enabled:
```sql
SELECT is_enabled FROM referral_settings;
```

2. Check if referral was tracked:
```sql
SELECT * FROM referrals WHERE referee_id = 'user-id';
```

3. Check deposit status:
```sql
SELECT * FROM deposits WHERE user_id = 'user-id';
```

4. Check trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'process_deposit_rewards_trigger';
```

### Referral Code Not Generated

```sql
-- Manually generate for existing users
UPDATE users
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;
```

## Security Considerations

- ✅ RLS policies restrict access
- ✅ Users can only view own referrals
- ✅ Admins can view all data
- ✅ Service role handles sensitive operations
- ✅ Can't refer yourself (blocked in track_referral)
- ✅ Unique constraint prevents duplicate referrals

## Summary

✅ **Database**: Run CREATE_REFERRAL_SYSTEM.sql
✅ **Admin UI**: Add AdminReferralSettingsPage route
✅ **User UI**: Add ReferralDashboard route
✅ **Signup**: Updated to accept referral codes
✅ **Testing**: Create accounts with ref codes, make deposits

Your complete referral system is ready! 🎉
