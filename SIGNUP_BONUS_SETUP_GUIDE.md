# Signup Bonus System - Complete Setup Guide

## Overview

A complete signup bonus system that allows admins to:
- Set custom bonus point amounts
- Enable/disable the bonus system
- View statistics on bonuses awarded
- Automatically send beautiful email notifications to users

## Features

✅ **Admin Dashboard** - Configure bonus settings with a beautiful UI
✅ **Automatic Points Award** - New users automatically receive points on signup
✅ **Email Notifications** - Users receive a branded email when they get their bonus
✅ **Bonus History** - Track all bonuses awarded with full audit trail
✅ **Statistics Dashboard** - View total users, bonuses awarded, and points distributed

## Setup Instructions

### Step 1: Run Database Migration

Execute the SQL migration file to create all necessary tables, functions, and triggers:

```bash
# In Supabase SQL Editor, run:
CREATE_SIGNUP_BONUS_WITH_EMAIL.sql
```

This creates:
- `signup_bonus_settings` table - Stores admin configuration (bonus amount, enabled status)
- `signup_bonus_history` table - Tracks all bonuses awarded to users
- `award_signup_bonus()` function - Automatically awards bonus on user signup
- `mark_bonus_email_sent()` function - Marks bonus email as sent
- `get_pending_bonus_emails()` function - Gets list of pending bonus emails
- Trigger on users table to auto-award bonus
- RLS policies for security

**Default Settings:**
- Bonus Amount: 100 points
- Enabled: Yes

### Step 2: Add Admin Route

Add the admin signup bonus page to your routing system:

```typescript
// In your router configuration (e.g., App.tsx or routes.tsx)
import { AdminSignupBonusPage } from '@/components/pages/AdminSignupBonusPage';

// Add route (accessible only to admins):
<Route path="/admin/signup-bonus" element={<AdminSignupBonusPage />} />
```

### Step 3: Add Navigation Link (Optional)

Add a link to the admin dashboard navigation:

```typescript
// In your admin navigation component
<Link to="/admin/signup-bonus">
  <Gift className="w-4 h-4" />
  Signup Bonus
</Link>
```

### Step 4: Test the System

1. **Test Bonus Award:**
   - Create a new user account
   - Check that user receives default 100 points
   - Verify bonus appears in signup_bonus_history table

2. **Test Email:**
   - Check user's email inbox
   - Should receive beautiful "Welcome Bonus" email
   - Email shows bonus amount and what user can do with points

3. **Test Admin Dashboard:**
   - Login as admin
   - Navigate to `/admin/signup-bonus`
   - Verify stats show correctly (total users, bonuses awarded, points given)
   - Try changing bonus amount
   - Try disabling/enabling the bonus system

## How It Works

### User Signup Flow

```
1. User creates account
   ↓
2. Database trigger fires (award_signup_bonus)
   ↓
3. Points added to user.points field
   ↓
4. Entry created in signup_bonus_history table
   ↓
5. Auth system checks for bonus (in auth.ts)
   ↓
6. Email sent to user (sendSignupBonusEmail)
   ↓
7. Email marked as sent in database
```

### Database Trigger

The `award_signup_bonus()` function runs automatically when a new user is created:

```sql
CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();
```

This function:
1. Checks if bonus is enabled in settings
2. Gets current bonus amount from settings
3. Awards points to the new user
4. Records the bonus in history table

### Email Notification

After user signup, the auth system:
1. Waits 1 second for trigger to complete
2. Checks if user received a bonus
3. Sends beautiful HTML email with bonus details
4. Marks email as sent in database

## Admin UI Features

### Dashboard Stats
- **Total Users** - Shows total registered users
- **Bonuses Awarded** - Number of users who received bonuses
- **Total Points Given** - Sum of all bonus points distributed

### Settings Panel
- **Enable/Disable Toggle** - Turn bonus system on/off
- **Bonus Amount Input** - Set custom point amount (e.g., 50, 100, 500)
- **Preview** - Shows what users will receive
- **Save Changes** - Updates settings immediately

### Recent Bonuses List
- Shows last 10 bonuses awarded
- Displays user name, email, bonus amount, and date
- Updates in real-time

## Email Template

The signup bonus email includes:

**Header:**
- 🎉 Emoji celebration
- "Congrats, [User Name]!" headline
- Purple gradient banner

**Content:**
- Large bonus amount display
- Explanation of what points can be used for:
  - Shop for products
  - Boost content visibility
  - Unlock premium features
- Call-to-action button to start exploring

**Footer:**
- Professional branding
- Social links (optional)
- Unsubscribe link (optional)

## Database Schema

### signup_bonus_settings
```sql
id              UUID PRIMARY KEY
bonus_amount    INTEGER NOT NULL DEFAULT 0
is_enabled      BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMP WITH TIME ZONE
updated_at      TIMESTAMP WITH TIME ZONE
```

### signup_bonus_history
```sql
id              UUID PRIMARY KEY
user_id         UUID REFERENCES users(id)
bonus_amount    INTEGER NOT NULL
awarded_at      TIMESTAMP WITH TIME ZONE
email_sent      BOOLEAN DEFAULT false
email_sent_at   TIMESTAMP WITH TIME ZONE
UNIQUE(user_id) -- Each user can only receive bonus once
```

## Security (RLS Policies)

### signup_bonus_settings
- **SELECT** - Only admins can view settings
- **UPDATE** - Only admins can update settings

### signup_bonus_history
- **SELECT** - Users can view their own history, admins can view all
- **INSERT** - Service role and triggers can insert
- **UPDATE** - Service role can update (for marking email as sent)

## Customization

### Change Default Bonus Amount

```sql
-- Update default bonus amount
UPDATE signup_bonus_settings
SET bonus_amount = 200,  -- New default amount
    updated_at = NOW()
WHERE id = (SELECT id FROM signup_bonus_settings LIMIT 1);
```

### Disable Bonus System

```sql
-- Disable bonus system
UPDATE signup_bonus_settings
SET is_enabled = false,
    updated_at = NOW()
WHERE id = (SELECT id FROM signup_bonus_settings LIMIT 1);
```

### Customize Email Template

Edit the email template in `src/lib/email.ts`:

```typescript
signupBonus: (userName: string, bonusAmount: number) => ({
  subject: `Welcome Bonus: ${bonusAmount} Points Added! 🎉`,
  html: `
    <!-- Your custom HTML email template -->
  `,
  text: `Your custom plain text email`
})
```

## Monitoring & Analytics

### Check Total Bonuses Awarded

```sql
SELECT
    COUNT(*) as total_bonuses,
    SUM(bonus_amount) as total_points_given,
    AVG(bonus_amount) as avg_bonus
FROM signup_bonus_history;
```

### Check Pending Emails

```sql
SELECT * FROM get_pending_bonus_emails();
```

### View Recent Bonuses

```sql
SELECT
    h.awarded_at,
    u.email,
    u.full_name,
    h.bonus_amount,
    h.email_sent
FROM signup_bonus_history h
JOIN users u ON u.id = h.user_id
ORDER BY h.awarded_at DESC
LIMIT 20;
```

### Check Email Success Rate

```sql
SELECT
    COUNT(*) as total_bonuses,
    COUNT(*) FILTER (WHERE email_sent = true) as emails_sent,
    COUNT(*) FILTER (WHERE email_sent = false) as emails_pending,
    ROUND(
        (COUNT(*) FILTER (WHERE email_sent = true)::DECIMAL / COUNT(*)) * 100,
        2
    ) as success_rate_percent
FROM signup_bonus_history;
```

## Troubleshooting

### Bonus Not Awarded

**Check if bonus is enabled:**
```sql
SELECT * FROM signup_bonus_settings;
```

**Check trigger exists:**
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger';
```

**Check user points:**
```sql
SELECT id, email, points, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
```

### Email Not Sent

**Check bonus history:**
```sql
SELECT * FROM signup_bonus_history
WHERE email_sent = false
ORDER BY awarded_at DESC;
```

**Check Resend logs:**
- Visit https://resend.com/emails
- Check for recent emails sent
- Look for any errors or bounces

**Check browser console:**
- Open DevTools → Console
- Look for "Failed to send signup bonus email" errors

**Manually mark email as sent:**
```sql
SELECT mark_bonus_email_sent('[user-id-here]');
```

### Admin Dashboard Not Loading

**Check RLS policies:**
```sql
SELECT * FROM pg_policies
WHERE tablename IN ('signup_bonus_settings', 'signup_bonus_history');
```

**Check user is admin:**
```sql
SELECT id, email, is_admin
FROM users
WHERE email = 'your-admin@email.com';
```

## Cost Considerations

### Resend Email Costs
- **Free Tier**: 3,000 emails/month (100/day)
- **Paid Plan**: $20/month for 50,000 emails (1,666/day)

For 100+ signups/day:
- ~3,000 signups/month
- Need paid plan ($20/month)
- Total cost: $20/month for unlimited professional emails

### Database Costs
Minimal - bonus system uses very little storage:
- Settings: 1 row (fixed)
- History: 1 row per user (tiny footprint)

## Migration from Old System

If you have existing users who didn't receive bonuses:

```sql
-- Award bonus to existing users (one-time operation)
INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
SELECT
    id as user_id,
    100 as bonus_amount,  -- Bonus amount
    false as email_sent   -- Will trigger email
FROM users
WHERE id NOT IN (SELECT user_id FROM signup_bonus_history)
AND created_at > '2024-01-01'  -- Only users after certain date
ON CONFLICT (user_id) DO NOTHING;

-- Update user points
UPDATE users
SET points = points + 100
WHERE id NOT IN (SELECT user_id FROM signup_bonus_history)
AND created_at > '2024-01-01';
```

## Best Practices

1. **Start with a reasonable bonus** (50-200 points) to test economics
2. **Monitor email deliverability** in Resend dashboard
3. **Adjust bonus amount** based on user engagement
4. **Disable bonus temporarily** during maintenance or issues
5. **Check bonus history regularly** to ensure emails are being sent
6. **Keep email template branded** and professional
7. **Test with real emails** before launching to users

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Check Supabase logs for database errors
4. Verify Resend API key is valid
5. Ensure admin user has `is_admin = true` in database

## Summary

✅ **Database**: Run CREATE_SIGNUP_BONUS_WITH_EMAIL.sql
✅ **Routing**: Add AdminSignupBonusPage route
✅ **Testing**: Create test user and verify bonus + email
✅ **Monitoring**: Check Resend dashboard for email delivery

Your signup bonus system is now complete and ready to delight new users! 🎉
