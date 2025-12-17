# Points Withdrawal System Setup Guide

This guide explains how to set up and use the Points Conversion and Withdrawal system.

## Features

- **Conversion Rate**: 10 points = 1 NGN
- **Currency Support**: NGN, USD, EUR, GBP (with real-time exchange rates)
- **Minimum Withdrawal**: 20,000 points (= 2,000 NGN)
- **Withdrawal Frequency**: Once every 15 days
- **Withdrawal Methods**: Bank Transfer, Opay
- **Processing**: Manual review by admin team (3-5 business days)

## Database Setup

### Step 1: Run the Migration

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `withdrawal-requests-migration.sql`
4. Click "Run" to execute the migration

This will create:
- `withdrawal_requests` table
- Row Level Security (RLS) policies
- Helper function: `process_withdrawal_request()`
- Automatic timestamp updates

### Step 2: Verify Tables

Make sure you have these tables in your database:
- `users` (with `points_balance` column)
- `points_transactions` (for tracking point activities)
- `withdrawal_requests` (newly created)

## User Requirements

For a user to be eligible for withdrawal, they must:

1. ✅ Have at least 20,000 points
2. ✅ Not have requested a withdrawal in the last 15 days
3. ✅ Provide complete account information:
   - Phone number
   - Email address
   - Account name
   - Account number
   - Bank name (for bank transfers)
   - Country

## How It Works

### For Users

1. **Navigate to Points Page**: Users click on their points balance in the navigation
2. **Request Withdrawal**: Click the "Request Withdrawal" button
3. **Check Eligibility**: System automatically checks if user is eligible
4. **Fill Form**:
   - Enter points to withdraw
   - Select currency (NGN, USD, EUR, or GBP)
   - Choose withdrawal method (Bank or Opay)
   - Fill in personal and account details
   - Add optional notes
5. **Submit**: Request is submitted with status "pending"
6. **Wait**: Admin reviews and processes within 3-5 business days
7. **Notification**: User receives email notification when processed

### For Admins

Currently, the withdrawal process is **manual**. To process a withdrawal:

1. Go to Supabase Dashboard → Table Editor → `withdrawal_requests`
2. Review pending requests
3. Use the `process_withdrawal_request()` function:

```sql
-- To approve and process a withdrawal
SELECT process_withdrawal_request(
  '<request_id>'::uuid,
  'completed',
  'Payment sent via bank transfer on DD/MM/YYYY'
);

-- To reject a withdrawal
SELECT process_withdrawal_request(
  '<request_id>'::uuid,
  'rejected',
  'Reason for rejection'
);
```

The function will:
- Deduct points from user's balance (if approving)
- Create a transaction record
- Update the withdrawal request status
- Record admin notes

## Currency Conversion

The system uses the [ExchangeRate-API](https://www.exchangerate-api.com/) free tier to fetch real-time exchange rates from NGN to other currencies.

**Conversion Flow**:
1. Points → NGN (10 points = 1 NGN, or 1 point = 0.1 NGN)
2. NGN → Selected Currency (using live exchange rates)

Example:
- User has 50,000 points
- Selects USD
- Calculation: 50,000 × 0.1 = 5,000 NGN
- If 1 USD = 1,500 NGN, then 5,000 ÷ 1,500 = 3.33 USD

## Withdrawal Request Status

- **pending**: Awaiting admin review
- **approved**: Admin approved, payment in progress
- **completed**: Payment sent, withdrawal complete
- **rejected**: Request denied by admin
- **cancelled**: User cancelled the request

## Membership Requirement

⚠️ **Note**: The code includes a placeholder for membership checking, but membership functionality needs to be implemented separately.

To add membership requirement:
1. Create a `user_memberships` table
2. Add membership status to users
3. Update the eligibility check in `WithdrawalModal.tsx` to verify active membership

## File Structure

```
src/
├── components/
│   ├── WithdrawalModal.tsx          # Main withdrawal request form
│   └── pages/
│       └── PointsPage.tsx           # Points dashboard with withdrawal history
├── withdrawal-requests-migration.sql # Database migration
└── WITHDRAWAL_SETUP.md              # This file
```

## Troubleshooting

### "withdrawal_requests table does not exist"
- Run the migration SQL in Supabase SQL Editor

### "Withdrawal Not Available"
- User must wait 15 days between withdrawals
- Check last withdrawal date in the database

### Exchange rates not loading
- Check internet connection
- API might be rate-limited (free tier has limits)
- System will fall back to NGN if rates fail to load

### Points not deducted after approval
- Make sure to use the `process_withdrawal_request()` function
- Don't manually update the status; the function handles everything

## Security Notes

- All withdrawal requests require user authentication
- RLS policies ensure users can only see their own requests
- Account details are stored in JSONB format
- Admin function uses SECURITY DEFINER for safe processing
- Email validation is performed client-side and server-side

## Future Enhancements

- Automated payment integration (Paystack, Flutterwave)
- Email notifications for status changes
- Admin dashboard for managing withdrawals
- Withdrawal receipts and invoices
- Multiple withdrawal accounts per user
- Scheduled auto-approval for trusted users

## Support

For issues or questions about the withdrawal system:
1. Check the browser console for errors
2. Verify database tables exist
3. Check Supabase logs for API errors
4. Ensure RLS policies are enabled

---

Last Updated: December 2024
