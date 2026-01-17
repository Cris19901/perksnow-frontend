# Troubleshooting Welcome Email Not Being Sent

## Issue
After disabling Supabase email confirmation, the custom welcome email with signup bonus is not being delivered.

## Diagnostic Steps

### Step 1: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Sign up with a new account
4. Look for these messages:

**Expected logs**:
```
✅ No bonus awarded, skipping bonus email
OR
✅ (No error messages about email sending)
```

**Error logs to look for**:
```
❌ Failed to send welcome email: [error message]
❌ Error sending welcome email: [error message]
❌ Error checking/sending signup bonus email: [error message]
```

### Step 2: Check if Signup Bonus System is Running

Run this SQL in Supabase SQL Editor:

```sql
-- Check if signup bonus system is enabled
SELECT
    'Signup Bonus Status:' as check,
    bonus_amount,
    is_enabled
FROM signup_bonus_settings;

-- Check recent users and their bonus status
SELECT
    u.email,
    u.points,
    u.created_at,
    h.bonus_amount,
    h.email_sent,
    h.awarded_at
FROM users u
LEFT JOIN signup_bonus_history h ON h.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;
```

**Expected Results**:
- `is_enabled` should be `true`
- `bonus_amount` should be > 0 (e.g., 100)
- Recent users should have entries in `signup_bonus_history`
- `email_sent` should be `false` for recent signups

### Step 3: Check Resend API Configuration

1. Go to `src/lib/email.ts`
2. Verify Resend API key is set:

```typescript
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
```

3. Check `.env` file has:
```
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
```

4. Verify Edge Function is deployed:
```bash
# Check if send-email function exists
supabase functions list
```

### Step 4: Manual Test Email Send

Try sending an email manually to test if Resend is working:

```typescript
// In browser console after importing
import { sendSignupBonusEmail } from '@/lib/email';

// Test send
sendSignupBonusEmail('your-email@example.com', 'Test User', 100)
  .then(() => console.log('Email sent!'))
  .catch(err => console.error('Email failed:', err));
```

### Step 5: Check Resend Dashboard

1. Go to https://resend.com/emails
2. Check if any emails were attempted
3. Look for errors or bounces

## Common Issues & Solutions

### Issue 1: Signup Bonus System Not Set Up

**Symptom**: Console log shows "No bonus awarded, skipping bonus email"

**Solution**: Run the signup bonus migration:
```sql
-- Run in Supabase SQL Editor
CREATE_SIGNUP_BONUS_WITH_EMAIL.sql
```

Then verify with:
```sql
SELECT * FROM signup_bonus_settings;
SELECT * FROM signup_bonus_history ORDER BY awarded_at DESC LIMIT 5;
```

---

### Issue 2: Resend API Key Missing

**Symptom**: Console error "Resend API key not configured"

**Solution**:
1. Get your API key from https://resend.com/api-keys
2. Add to `.env`:
```
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
```
3. Restart dev server

---

### Issue 3: Edge Function Not Deployed

**Symptom**: Error "Failed to invoke function" or 404

**Solution**:
```bash
# Deploy the edge function
supabase functions deploy send-email

# Set the Resend API key as secret
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

### Issue 4: Email Takes Too Long to Send

**Symptom**: Signup completes but email arrives 5+ minutes later

**Solution**: This is normal for background email sending. Email is sent asynchronously to avoid blocking signup.

To make it faster, reduce the delay in auth.ts:
```typescript
// Change from 1500ms to 500ms
await new Promise(resolve => setTimeout(resolve, 500));
```

---

### Issue 5: Bonus Awarded But Email Not Sent

**Symptom**:
- User has points in database
- `email_sent` is still `false`
- No email received

**Solution**: Manually trigger email send:

```sql
-- Get user who needs email
SELECT
    u.id,
    u.email,
    u.full_name,
    u.username,
    h.bonus_amount
FROM users u
JOIN signup_bonus_history h ON h.user_id = u.id
WHERE h.email_sent = false
ORDER BY u.created_at DESC
LIMIT 1;
```

Then use client-side function or Edge Function to send email manually.

---

### Issue 6: Email Going to Spam

**Symptom**: Email sent (shows in Resend) but not in inbox

**Solution**:
1. Check spam/junk folder
2. Add `noreply@[yourdomain]` to contacts
3. If using Resend free tier, emails may have lower deliverability
4. Consider verifying your domain in Resend for better deliverability

---

## Quick Fix: Force Send Welcome Email

If you want to ensure ALL users get welcome email regardless of bonus:

### Option A: Send Email to Everyone (Recommended)

Update `auth.ts` to always send email:

```typescript
// 4. Send welcome email
try {
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check for bonus
  const { data: bonusData } = await supabase
    .from('signup_bonus_history')
    .select('bonus_amount')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  const bonusAmount = bonusData?.bonus_amount || 0;

  // ALWAYS send email (even if no bonus)
  sendSignupBonusEmail(
    email,
    full_name || username,
    bonusAmount  // Will be 0 if no bonus
  ).then(async () => {
    if (bonusData) {
      await supabase.rpc('mark_bonus_email_sent', {
        p_user_id: authData.user.id
      }).catch(() => {});
    }
  }).catch(err => {
    console.error('Failed to send welcome email:', err);
  });
} catch (err) {
  console.error('Error sending welcome email:', err);
}
```

### Option B: Update Email Template for Zero Bonus

If bonus is 0, show a different message in the email template (`src/lib/email.ts`):

```typescript
signupBonus: (userName: string, bonusAmount: number) => ({
  subject: bonusAmount > 0
    ? `Welcome to LavLay! ${bonusAmount} Points Awarded 🎉`
    : `Welcome to LavLay! 🎉`,
  html: `
    <!-- Show bonus section only if bonusAmount > 0 -->
    ${bonusAmount > 0 ? `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <p>${bonusAmount} Points Added to Your Account</p>
      </div>
    ` : `
      <div style="padding: 30px;">
        <h2>Welcome to the Community!</h2>
        <p>Start exploring LavLay and connect with others.</p>
      </div>
    `}
  `
})
```

---

## Testing Checklist

After applying fixes, test with these steps:

- [ ] Run `CREATE_SIGNUP_BONUS_WITH_EMAIL.sql`
- [ ] Verify signup bonus settings exist (`SELECT * FROM signup_bonus_settings`)
- [ ] Verify Resend API key is in `.env`
- [ ] Restart dev server
- [ ] Clear browser cache
- [ ] Open browser console
- [ ] Sign up with NEW email address
- [ ] Check console for errors
- [ ] Wait 30 seconds for email
- [ ] Check email inbox (and spam)
- [ ] Check Resend dashboard for delivery status

---

## Still Not Working?

### Enable Detailed Logging

Add more logging to `auth.ts`:

```typescript
// 4. Send welcome email with bonus info
try {
  console.log('🔍 Starting email send process...');
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('🔍 Checking for signup bonus...');
  const { data: bonusData, error: bonusError } = await supabase
    .from('signup_bonus_history')
    .select('bonus_amount, email_sent')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  console.log('🔍 Bonus data:', bonusData);
  console.log('🔍 Bonus error:', bonusError);

  const bonusAmount = bonusData?.bonus_amount || 0;
  console.log('🔍 Bonus amount:', bonusAmount);

  if (bonusAmount > 0 && !bonusData?.email_sent) {
    console.log('📧 Sending welcome email...');
    const emailResult = await sendSignupBonusEmail(
      email,
      full_name || username,
      bonusAmount
    );
    console.log('📧 Email result:', emailResult);

    console.log('✅ Email sent successfully!');
  } else {
    console.log('⚠️ Not sending email. Bonus:', bonusAmount, 'Already sent:', bonusData?.email_sent);
  }
} catch (err) {
  console.error('❌ Error sending welcome email:', err);
}
```

This will show you exactly where the process is failing.

---

## Summary

The most likely causes are:
1. ✅ Signup bonus system not set up (run migration SQL)
2. ✅ Resend API key not configured
3. ✅ Edge function not deployed
4. ✅ Email logic only sends if bonus > 0

**Quick Fix**: Update auth.ts to always send email regardless of bonus amount.
