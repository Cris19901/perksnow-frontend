# Test Paystack Key Directly

## The key is loaded correctly, but Paystack rejects it with "Invalid key"

Since the diagnostic shows the key IS present in the app, let's test if Paystack accepts this key.

---

## Test 1: Verify Key with Paystack API

Open your browser console on www.lavlay.com and run this:

```javascript
fetch('https://api.paystack.co/transaction/initialize', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    amount: 100000, // 1000 NGN in kobo
  })
})
.then(r => r.json())
.then(data => console.log('Paystack Response:', data))
.catch(err => console.error('Error:', err))
```

**Tell me what response you get:**

**Option A: Success**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": { ... }
}
```
→ Key works! Issue is in the code

**Option B: Invalid Key**
```json
{
  "status": false,
  "message": "Invalid key"
}
```
→ Key is rejected by Paystack

**Option C: Live mode not active**
```json
{
  "status": false,
  "message": "You cannot make live transactions while in test mode"
}
```
→ Paystack account not activated for live mode

---

## Test 2: Check Paystack Account Status

1. Go to: https://dashboard.paystack.com
2. Top right corner - check if you see:
   - **"Test Mode"** toggle - If you see this, you're in test mode
   - **"Go Live"** button - If you see this, your account isn't activated

### If Not Activated:

**You need to:**
1. Submit business verification documents
2. Wait for Paystack approval (1-3 business days)
3. Until then, use TEST key instead

**Temporary Solution:** Use test key until live mode is activated
```
pk_test_your_test_key_here
```

---

## Test 3: Check If Key Was Regenerated

Keys can be regenerated/revoked in Paystack dashboard.

1. Go to: https://dashboard.paystack.com/#/settings/developer
2. Look at **"Live Public Key"** section
3. **Is the key shown there EXACTLY the same as what you're using?**
   ```
   pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
   ```

If it's different, copy the NEW key and update Vercel.

---

## Most Likely Issue: Live Mode Not Activated

Based on "Invalid key" error, this usually means one of:

1. **Account not activated for live mode** (most common)
2. **Key was regenerated** (check dashboard)
3. **Domain restrictions** (rarely used by Paystack)

### Quick Fix: Use Test Mode for Now

**Step 1:** Get your test key from Paystack dashboard

**Step 2:** Update Vercel environment variable
```
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key_from_dashboard
```

**Step 3:** Redeploy

**Step 4:** Test with test card:
- Card: 4084084084084081
- CVV: 408
- Expiry: any future date
- PIN: 0000

This won't charge real money and will work immediately while you wait for live mode activation.

---

## Action Items:

1. **Run Test 1** (the fetch test) and tell me the exact response
2. **Check Paystack Dashboard** - Are you in test mode or live mode?
3. **Verify the key** - Is it the same in Paystack dashboard?

Based on what you find, we'll know the exact fix!
