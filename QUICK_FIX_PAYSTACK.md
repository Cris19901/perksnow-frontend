# ⚡ QUICK FIX: Paystack Invalid Key Error

## 🔴 The Problem

You're getting **"invalid key"** error when trying to subscribe on **www.lavlay.com**

**Cause:** Missing environment variable on Vercel production

---

## ✅ The Fix (5 Minutes)

### Step 1: Go to Vercel (2 minutes)

1. Open: https://vercel.com/dashboard
2. Click your **LavLay** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)
5. Click **Add New** button

### Step 2: Add the Variable (1 minute)

```
Key:   VITE_PAYSTACK_PUBLIC_KEY

Value: pk_live_b2634df9f8d08cdc6e82f941c72c1d0dc4429c96

Environment: ☑ Production (check the box)
```

Click **Save**

### Step 3: Redeploy (2 minutes)

**Option A:** Push empty commit
```bash
git commit --allow-empty -m "Add Paystack key to production"
git push origin main
```

**Option B:** Manual redeploy
1. Vercel → Deployments tab
2. Latest deployment → "..." menu
3. Click "Redeploy"

### Step 4: Test (After 3 minutes)

1. Wait for deployment to finish
2. Visit: https://www.lavlay.com/subscription
3. Click "Subscribe Now"
4. Should work! 🎉

---

## 🎯 That's It!

After these steps, subscription payments will work on production.

---

## ❓ Still Not Working?

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Try incognito mode**
3. **Check Vercel logs:** Dashboard → Deployments → Latest → Logs
4. **Verify variable saved:** Settings → Environment Variables (should see it listed)

---

## 📝 What You're Adding

Your Paystack **LIVE** public key - this allows the app to initialize payments with Paystack on production.

**Security:** This is a PUBLIC key, safe to use in frontend. Don't confuse with SECRET key!

---

**Full Details:** See `FIX_PAYSTACK_PRODUCTION_ERROR.md` for comprehensive guide.
