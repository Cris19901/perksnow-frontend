# How to Get Your ZeptoMail API Key

Follow these exact steps to get your ZeptoMail API key in 5 minutes.

---

## Step 1: Sign Up for ZeptoMail (if not done yet)

1. Go to: https://www.zoho.com/zeptomail/
2. Click **Sign Up Free** or **Get Started**
3. Fill in your details:
   - Email address
   - Password
   - Organization name (e.g., "LavLay")
4. Click **Sign Up**
5. **Verify your email** - Check your inbox and click verification link

---

## Step 2: Access ZeptoMail Console

After email verification:

1. You'll be redirected to ZeptoMail console automatically
2. **OR** Go to: https://mailadmin.zoho.com

**First Time Setup:**
- They may ask you to set up a "Mail Agent"
- Click **Skip for now** or **I'll do this later**
- You can add domain later - API key works immediately

---

## Step 3: Navigate to API Settings

**In the ZeptoMail Console:**

1. Look at the **left sidebar**
2. Click on **Setup** (⚙️ icon or gear icon)
   - OR look for **Settings** → **API**
3. You should see **API** section

**Visual guide:**
```
Left Sidebar:
├── Dashboard
├── Reports
├── Setup ← Click here
│   ├── Mail Agents
│   ├── Domains
│   ├── API ← Then click here
│   └── Settings
```

---

## Step 4: Create API Key

**On the API page:**

1. You'll see **API Keys** section
2. Click **Add API Key** button (or **Create API Key**)

**Fill in the form:**
- **Key Name**: Enter `LavLay Production` (or any name you want)
- **Description** (optional): `Email notifications for LavLay platform`
- **Permissions**:
  - ✅ Check **Send Mail** (this is what you need)
  - ❌ Uncheck everything else (you don't need them)

3. Click **Create** or **Generate**

---

## Step 5: Copy Your API Key

**IMPORTANT - This only appears ONCE!**

1. A popup will show your API key
2. It looks like: `Zoho-enczapikey wSsVR607...` (long string)
3. Click **Copy** button or manually select and copy (Ctrl+C / Cmd+C)
4. **Paste it somewhere safe immediately** (like Notepad)

**⚠️ WARNING:**
- You will **NOT** be able to see this key again
- If you lose it, you'll need to delete and create a new one
- Keep it secure - don't share it with anyone

---

## Step 6: Save the Key

**Copy your API key to:**

1. **Notepad or text file** on your computer (temporary)
2. You'll paste it into Supabase in the next step

**The key format looks like this:**
```
Zoho-enczapikey wSsVR607....[long random string]....xYz123
```

**Full example (DO NOT USE THIS - it's fake):**
```
Zoho-enczapikey wSsVR607H3cX1234567890abcdefGHIJKLMNOPQRSTUVWXYZ1234567890
```

---

## ✅ You're Done Getting the API Key!

**What you have now:**
- ✅ ZeptoMail account created
- ✅ API key generated
- ✅ Key copied and saved

**Next steps:**
1. Add this key to Supabase (see `SUPABASE_CONFIG_STEPS.md` Step 1)
2. Deploy your email system

---

## 🐛 Troubleshooting

### Can't Find API Section?

**Solution 1: Use Direct Link**
- Go to: https://mailadmin.zoho.com/zmail/#emailapi

**Solution 2: Try New Interface**
- Some accounts show it as: **Settings** → **Developer** → **API**

**Solution 3: Check Account Type**
- Make sure you signed up for **ZeptoMail** (not regular Zoho Mail)
- ZeptoMail URL: https://www.zoho.com/zeptomail/

### "Send Mail" Permission Not Available?

**This means:**
- You might be in Zoho Mail instead of ZeptoMail
- Go to: https://www.zoho.com/zeptomail/ and sign up there specifically

### Lost Your API Key?

**No problem - create a new one:**

1. Go to: https://mailadmin.zoho.com/zmail/#emailapi
2. Find your existing key in the list
3. Click **Delete** or trash icon
4. Click **Add API Key** again
5. Create new key with same name
6. Copy the new key

---

## 🎯 Quick Reference

**Where to get API key:**
- URL: https://mailadmin.zoho.com/zmail/#emailapi
- OR: ZeptoMail Console → Setup → API → Add API Key

**What you need:**
- ✅ ZeptoMail account (free)
- ✅ Email verified
- ✅ API key with "Send Mail" permission

**Key format:**
- Starts with: `Zoho-enczapikey`
- Followed by: long random string
- Total length: ~60-80 characters

**Where to use it:**
- Supabase Dashboard → Settings → Edge Functions → Secrets
- Name: `ZEPTOMAIL_API_KEY`
- Value: [Your API key]

---

## 📸 Visual Guide

**Step-by-step screenshots guide:**

**1. Sign up page:**
```
https://www.zoho.com/zeptomail/
[Sign Up Free] button
```

**2. Console home:**
```
https://mailadmin.zoho.com
Left sidebar → Setup → API
```

**3. API page:**
```
[Add API Key] button
Fill in: Name + Select "Send Mail"
[Create] button
```

**4. Copy key:**
```
Popup shows: "Zoho-enczapikey wSsVR607..."
[Copy] button
Save to Notepad immediately!
```

---

## ⏭️ After Getting API Key

**Continue with deployment:**

1. Open: `SUPABASE_CONFIG_STEPS.md`
2. Go to **Step 1: Add ZeptoMail API Key to Supabase**
3. Follow the steps to paste your key into Supabase
4. Then continue with Steps 2-5

**Total time remaining:** ~10 minutes to complete deployment

---

## 🔐 Security Best Practices

**DO:**
- ✅ Keep API key secret
- ✅ Only store in Supabase secrets (encrypted)
- ✅ Never commit to Git
- ✅ Regenerate if exposed

**DON'T:**
- ❌ Share API key publicly
- ❌ Put in code comments
- ❌ Email to anyone
- ❌ Paste in Slack/Discord

---

**Got your API key? Great! Now go to `SUPABASE_CONFIG_STEPS.md` to continue deployment.**
