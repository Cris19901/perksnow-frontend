# Troubleshooting: Paystack Error Still Occurring

## Issue
You still get "invalid key" error after adding environment variable to Vercel.

---

## ✅ Checklist - Let's Verify Each Step

### Step 1: Verify Vercel Environment Variable is Set

1. Go to: https://vercel.com/dashboard
2. Click your LavLay project
3. Go to: **Settings** → **Environment Variables**
4. Look for: `VITE_PAYSTACK_PUBLIC_KEY`

**Should see:**
```
VITE_PAYSTACK_PUBLIC_KEY    pk_live_b2634...    Production
```

**❓ Do you see this variable listed?**
- ✅ YES → Continue to Step 2
- ❌ NO → Add it again, make sure to click "Save"

---

### Step 2: Verify Deployment Completed

1. Go to: https://vercel.com/dashboard
2. Click your project
3. Go to: **Deployments** tab
4. Look at the latest deployment (should be "Fix Paystack config")

**Check the status:**
- ✅ **"Ready"** with green checkmark → Continue to Step 3
- ⏳ **"Building"** → Wait for it to finish
- ❌ **"Failed"** → Click on it and check error logs

**❓ What status do you see?**

---

### Step 3: Verify the Variable is in the Build

The environment variable must be available at BUILD TIME for Vite apps.

**Check Deployment Logs:**
1. Click on the latest deployment
2. Go to "Build Logs"
3. Search for "VITE_PAYSTACK"

**Should see something like:**
```
✓ Environment variables loaded
```

**If you see:** "VITE_PAYSTACK_PUBLIC_KEY is not defined"
**Then:** The variable wasn't loaded during build

---

### Step 4: Check Browser Console

1. Visit: https://www.lavlay.com/subscription
2. Open browser console: Press **F12**
3. Go to **Console** tab
4. Type this and press Enter:
   ```javascript
   console.log(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY)
   ```

**What do you see?**
- ✅ Shows `pk_live_b2634...` → Variable is loaded
- ❌ Shows `undefined` → Variable not in build

---

## 🔍 Common Issues and Fixes

### Issue A: Variable Not Applied to Production

**Symptom:** Variable is set in Vercel, but still undefined in app

**Cause:** Environment variable was added AFTER deployment

**Fix:**
1. After adding the variable, you MUST redeploy
2. Go to Vercel → Deployments
3. Latest deployment → "..." menu → **"Redeploy"**
4. Wait 2-3 minutes for deployment to complete
5. Hard refresh browser: `Ctrl + Shift + R`

---

### Issue B: Wrong Environment Selected

**Symptom:** Works on preview but not production

**Cause:** Variable only added to "Preview" or "Development" environment

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Click **Edit** on `VITE_PAYSTACK_PUBLIC_KEY`
3. Make sure **"Production"** checkbox is checked ☑
4. Click "Save"
5. Redeploy

---

### Issue C: Variable Name Typo

**Symptom:** Variable set but app can't find it

**Cause:** Typo in variable name

**Fix:**
Verify exact name (case-sensitive):
- ✅ Correct: `VITE_PAYSTACK_PUBLIC_KEY`
- ❌ Wrong: `VITE_PAYSTACK_KEY`
- ❌ Wrong: `PAYSTACK_PUBLIC_KEY`
- ❌ Wrong: `vite_paystack_public_key`

---

### Issue D: Value Has Extra Spaces

**Symptom:** Variable set but Paystack rejects it

**Cause:** Extra space before/after the key value

**Fix:**
1. Edit the variable in Vercel
2. Make sure value is exactly:
   ```
   pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
   ```
3. No spaces before or after
4. Save and redeploy

---

### Issue E: Using Wrong Key

**Symptom:** Paystack says "Invalid key"

**Cause:** Using test key in production or wrong key format

**Fix:**
Verify your key:
- ✅ Should start with: `pk_live_`
- ❌ If it starts with `pk_test_` → That's test key, won't work in production
- ❌ If it starts with `sk_` → That's SECRET key, wrong one!

Get the correct key:
1. Go to: https://dashboard.paystack.com
2. Settings → API Keys & Webhooks
3. Copy the **"Live Public Key"** (starts with `pk_live_`)

---

### Issue F: Paystack Account Not Activated

**Symptom:** Correct key but still rejected

**Cause:** Paystack live mode not activated

**Fix:**
1. Go to: https://dashboard.paystack.com
2. Check if you see "Live Mode" toggle
3. If account not activated, you need to:
   - Complete business verification
   - Submit required documents
   - Wait for Paystack approval

**Alternative:** Use test mode for now
- Use test key: `pk_test_your_test_key`
- Test payments won't charge real money

---

## 🧪 Step-by-Step Debugging

Run through these in order:

### Debug Step 1: Check Vercel Variable

```bash
# On your local machine, check if variable exists in Vercel
# (Requires Vercel CLI: npm install -g vercel)

vercel env ls
```

**Expected output:**
```
VITE_PAYSTACK_PUBLIC_KEY (Production)
```

---

### Debug Step 2: Test Locally First

Before testing production, verify it works locally:

```bash
# In your project folder
# Make sure .env.local has the key
cat .env.local | grep PAYSTACK

# Should show:
# VITE_PAYSTACK_PUBLIC_KEY=pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96

# Start dev server
npm run dev

# Visit: http://localhost:5173/subscription
# Try to subscribe
# Should work locally
```

**If it works locally but not in production:**
→ Environment variable issue in Vercel

**If it doesn't work locally either:**
→ Code issue or Paystack account issue

---

### Debug Step 3: Check Network Request

1. Visit: https://www.lavlay.com/subscription
2. Open DevTools: **F12**
3. Go to **Network** tab
4. Click "Subscribe Now"
5. Look for request to `api.paystack.co`
6. Click on it
7. Check **Headers** tab → **Request Headers**

**Look for:**
```
Authorization: Bearer pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
```

**If you see:**
```
Authorization: Bearer undefined
```
→ Environment variable not loaded

---

### Debug Step 4: Check Response

In the same Network request:
1. Click on **Response** tab

**If Paystack says:**
```json
{
  "status": false,
  "message": "Invalid key"
}
```
→ Key is being sent but Paystack rejects it

**Possible reasons:**
- Using test key in production
- Key is incorrect/outdated
- Extra characters in key
- Paystack account not activated for live mode

---

## 🎯 Detailed Fix Process

Based on what you find, follow the appropriate fix:

### Fix Path A: Variable Not in Production

```bash
# 1. Verify variable in Vercel
# Visit: https://vercel.com/dashboard/[your-project]/settings/environment-variables

# 2. Add or edit variable
# Make sure "Production" is checked

# 3. Force redeploy
git commit --allow-empty -m "Force redeploy for env vars"
git push origin main

# 4. Wait 3 minutes

# 5. Test
# Visit: https://www.lavlay.com/subscription
# Hard refresh: Ctrl + Shift + R
```

---

### Fix Path B: Wrong Key

```bash
# 1. Get correct key from Paystack
# Visit: https://dashboard.paystack.com/#/settings/developer

# 2. Copy "Live Public Key" (pk_live_...)

# 3. Update in Vercel
# Settings → Environment Variables → Edit VITE_PAYSTACK_PUBLIC_KEY

# 4. Paste new key (no extra spaces!)

# 5. Save and redeploy
```

---

### Fix Path C: Paystack Account Issue

If using live key but Paystack rejects it:

**Option 1:** Activate live mode
1. Complete Paystack business verification
2. Wait for approval
3. Then use live key

**Option 2:** Use test mode for now
1. Get test key from Paystack: `pk_test_...`
2. Update Vercel variable to test key
3. Redeploy
4. Use test card: `4084084084084081`
5. Won't charge real money

---

## 📋 Quick Verification Script

Copy this and run in your browser console on www.lavlay.com:

```javascript
// Check if Paystack key is loaded
console.log('Paystack Key Check:');
console.log('Key exists:', typeof import.meta.env.VITE_PAYSTACK_PUBLIC_KEY !== 'undefined');
console.log('Key value:', import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);
console.log('Key starts with pk_live:', import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.startsWith('pk_live_'));
console.log('Key length:', import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.length);

// Expected output:
// Key exists: true
// Key value: pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96
// Key starts with pk_live: true
// Key length: 48
```

---

## 🆘 If Still Not Working

Please provide this information so I can help further:

1. **Vercel Environment Variables Screenshot:**
   - Go to Settings → Environment Variables
   - Screenshot showing VITE_PAYSTACK_PUBLIC_KEY

2. **Deployment Status:**
   - Go to Deployments
   - What's the status of latest deployment?
   - Any errors in build logs?

3. **Browser Console Output:**
   - Run the verification script above
   - Copy the output

4. **Network Request:**
   - F12 → Network tab
   - Try to subscribe
   - Find the request to `api.paystack.co`
   - Screenshot or copy the response

5. **Exact Error Message:**
   - What exactly does the error say?
   - Screenshot if possible

---

## 💡 Alternative: Quick Test with Test Key

To verify the code works and isolate the issue:

```bash
# 1. In Vercel, temporarily change the key to test key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key_from_paystack

# 2. Redeploy

# 3. Test on production
# Use test card: 4084084084084081
# CVV: 408
# Expiry: any future date

# If this works:
# → Your code is fine
# → Issue is with live key or Paystack live mode

# If this still fails:
# → Different issue (code or configuration problem)
```

---

## 📞 Next Steps

Based on what you find:

1. **If variable shows as undefined in console:**
   → Follow "Fix Path A"

2. **If variable shows but Paystack rejects it:**
   → Follow "Fix Path B" or "Fix Path C"

3. **If you need immediate solution:**
   → Use test key temporarily (see Alternative section)

4. **If still stuck:**
   → Provide the information requested in "If Still Not Working" section

---

**Let me know what you find and I'll help you fix it!**
