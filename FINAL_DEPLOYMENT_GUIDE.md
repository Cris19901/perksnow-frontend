# LavLay Final Deployment Guide

## Quick Deployment Steps

### Step 1: Run the Unified Withdrawal System SQL

Copy and paste the contents of `UNIFIED_WITHDRAWAL_SYSTEM.sql` into your Supabase SQL Editor and run it.

This single SQL file will:
- Create/update the `withdrawal_requests` table
- Add progressive withdrawal limits (5k → 10k → 40k → 70k → 100k → unlimited)
- Add `successful_withdrawals_count` column to users table
- Create the `get_max_withdrawal_amount()` function
- Create the `process_withdrawal_request()` function for admin approval
- Set up email triggers for withdrawal notifications
- Create the 15,000 point signup bonus trigger

### Step 2: Redeploy the Edge Function (if changed)

If you made changes to the Edge Function, redeploy it:

```bash
npx supabase functions deploy send-email --project-ref kswknblwjlkgxgvypkmo
```

### Step 3: Verify Everything Works

Run this verification query in Supabase SQL Editor:

```sql
-- Check all components are in place
SELECT 'Component' as item, 'Status' as status
UNION ALL
SELECT 'withdrawal_requests table',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawal_requests')
       THEN '✅ OK' ELSE '❌ Missing' END
UNION ALL
SELECT 'successful_withdrawals_count column',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'successful_withdrawals_count')
       THEN '✅ OK' ELSE '❌ Missing' END
UNION ALL
SELECT 'get_max_withdrawal_amount function',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_max_withdrawal_amount')
       THEN '✅ OK' ELSE '❌ Missing' END
UNION ALL
SELECT 'process_withdrawal_request function',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_withdrawal_request')
       THEN '✅ OK' ELSE '❌ Missing' END
UNION ALL
SELECT 'award_signup_bonus function',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'award_signup_bonus')
       THEN '✅ OK' ELSE '❌ Missing' END;

-- Check triggers
SELECT trigger_name, event_object_table, action_timing || ' ' || event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'withdrawal_requests', 'referrals')
ORDER BY event_object_table, trigger_name;
```

---

## System Summary

### Progressive Withdrawal Limits

| Withdrawal # | Max Points | Max NGN |
|--------------|------------|---------|
| 1st | 5,000 | ₦500 |
| 2nd | 10,000 | ₦1,000 |
| 3rd | 40,000 | ₦4,000 |
| 4th | 70,000 | ₦7,000 |
| 5th | 100,000 | ₦10,000 |
| 6th+ | Unlimited | Unlimited |

### Signup Bonus
- **15,000 points** automatically added when user signs up
- Recorded in points_transactions table
- Welcome email sent with bonus highlighted

### Subscription Requirement
- Only **Pro** subscribers can withdraw
- Free users prompted to upgrade when trying to withdraw

### Withdrawal Process Flow
1. User submits withdrawal request via WithdrawalModal
2. Request saved to `withdrawal_requests` table
3. Email trigger sends confirmation to user
4. Admin reviews in AdminWithdrawalsPage
5. Admin approves/rejects with notes
6. Points deducted (if approved) and count incremented
7. Status change triggers email to user

### Email Triggers
- **Welcome email**: On user signup (includes 15k bonus)
- **Withdrawal request**: When withdrawal is submitted
- **Withdrawal approved/completed**: When admin approves
- **Withdrawal rejected**: When admin rejects
- **Referral signup**: When someone uses a referral code

---

## Admin Withdrawal Management

Navigate to the admin section and access the Withdrawal Management page.

**Available Actions:**
- View all pending withdrawals
- Filter by status (pending, approved, completed, rejected)
- View user details and bank information
- Add admin notes
- Approve & Complete (deducts points, sends money)
- Reject (returns points, notifies user)

---

## Testing Checklist

### Test New User Signup
- [ ] Create new account
- [ ] Verify 15,000 points added to balance
- [ ] Verify welcome email received with bonus highlighted

### Test Withdrawal Request
- [ ] Try withdrawal as free user (should be blocked)
- [ ] Subscribe to Pro
- [ ] Submit withdrawal for 5,000 points (1st withdrawal limit)
- [ ] Verify confirmation email received
- [ ] Verify request appears in admin panel

### Test Admin Approval
- [ ] Go to admin withdrawals page
- [ ] Find pending request
- [ ] Add admin notes and approve
- [ ] Verify user receives completion email
- [ ] Verify user's balance reduced
- [ ] Verify successful_withdrawals_count incremented

### Test Progressive Limits
- [ ] After 1st withdrawal, try 2nd (should allow up to 10k)
- [ ] Verify UI shows correct limit message

---

## Files Modified in This Session

### Database Migrations
- `UNIFIED_WITHDRAWAL_SYSTEM.sql` - Main migration file

### Edge Function
- `supabase/functions/send-email/index.ts` - Updated to handle both payload formats

### Frontend Components
- `src/components/WithdrawalModal.tsx` - Already has progressive limit UI
- `src/components/pages/AdminWithdrawalsPage.tsx` - Already exists

---

## Troubleshooting

### Email Not Sending
1. Check Edge Function logs in Supabase Dashboard
2. Verify ZEPTOMAIL_API_KEY is set in Function Secrets
3. Verify the `call_edge_function` wrapper exists

### Withdrawal Limits Not Working
1. Verify `successful_withdrawals_count` column exists
2. Verify `get_max_withdrawal_amount` function exists
3. Check user's current count: `SELECT successful_withdrawals_count FROM users WHERE id = 'user-id'`

### Admin Can't See Withdrawals
1. Verify user has `is_admin = true` in users table
2. Check RLS policies are in place

---

## Contact

For issues, create a GitHub issue at the repository.
