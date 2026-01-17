# Diagnose Email Issue

The Edge Function returned `success: false`, which means either:
1. ZeptoMail API key is not configured in Supabase Edge Functions
2. ZeptoMail API rejected the request

## Step 1: Check Edge Function Logs

**This is the most important step!**

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions/send-email
2. Click on the **send-email** function
3. Click the **Logs** tab
4. Look for the most recent log entry (within last few minutes)

**What to look for:**
- ✅ If you see: `"ZeptoMail API error: ..."` - The API key or email format is wrong
- ✅ If you see: `"Error sending email: ..."` - Network or configuration issue
- ✅ If you see: `undefined` or empty API key - The secret wasn't set correctly

**Screenshot the error and share it with me!**

---

## Step 2: Verify API Key Secret is Set

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/settings/functions
2. Scroll to **Secrets** section
3. Check if `ZEPTOMAIL_API_KEY` is listed

**If NOT listed:**
- The secret wasn't added properly
- You need to add it again

**To add/update the secret:**
1. In the Secrets section, look for **Add secret** or **Edit**
2. Name: `ZEPTOMAIL_API_KEY`
3. Value: Your ZeptoMail API key (should start with `Zoho-enczapikey`)
4. Click **Save**
5. **IMPORTANT:** After adding/updating secrets, you must **redeploy** the function:
   ```bash
   npx supabase functions deploy send-email
   ```

---

## Step 3: Verify Your ZeptoMail API Key Works

Test your API key directly to make sure it's valid:

### Option A: Test via PowerShell

```powershell
$headers = @{
    "Authorization" = "Zoho-enczapikey YOUR_ZEPTOMAIL_API_KEY_HERE"
    "Content-Type" = "application/json"
}

$body = @{
    from = @{
        address = "noreply@lavlay.com"
        name = "LavLay"
    }
    to = @(
        @{
            email_address = @{
                address = "fadiscojay@gmail.com"
                name = "Test User"
            }
        }
    )
    subject = "Direct API Test"
    htmlbody = "<p>This is a direct test of the ZeptoMail API.</p>"
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://api.zeptomail.com/v1.1/email" -Method Post -Headers $headers -Body $body
```

**Replace `YOUR_ZEPTOMAIL_API_KEY_HERE` with your actual API key.**

**Expected result:**
- Success: Returns a response with message ID
- Failure: Returns error message (invalid key, domain not verified, etc.)

### Option B: Test via CMD

```cmd
curl -X POST https://api.zeptomail.com/v1.1/email ^
  -H "Authorization: Zoho-enczapikey YOUR_ZEPTOMAIL_API_KEY_HERE" ^
  -H "Content-Type: application/json" ^
  -d "{\"from\":{\"address\":\"noreply@lavlay.com\",\"name\":\"LavLay\"},\"to\":[{\"email_address\":{\"address\":\"fadiscojay@gmail.com\",\"name\":\"Test\"}}],\"subject\":\"Test\",\"htmlbody\":\"<p>Test</p>\"}"
```

---

## Step 4: Check ZeptoMail Dashboard

1. Go to: https://mailadmin.zoho.com
2. Click **Reports** in the left sidebar
3. Look for any recent email attempts

**What to check:**
- Are there any failed sends?
- Any bounces or rejections?
- Does the dashboard show ANY activity?

---

## Common Issues & Fixes

### Issue 1: "Invalid API Key" or "Authentication Failed"

**Fix:**
- Your API key might be wrong or expired
- Go to ZeptoMail → Setup → API → Generate new key
- Update the secret in Supabase
- Redeploy the function

### Issue 2: "Domain not verified" or "Sender address rejected"

**Fix:**
- ZeptoMail requires sender domain verification for production use
- **Temporary fix:** Use a verified sender address from ZeptoMail console
- **Long-term fix:** Add and verify your domain (lavlay.com) in ZeptoMail

**To use verified sender temporarily:**
1. Go to ZeptoMail → Setup → Mail Agents
2. Look for a verified sender address (might be your signup email)
3. Update Edge Function to use that address:
   - Change `FROM_EMAIL` in `supabase/functions/send-email/index.ts`
   - Redeploy

### Issue 3: "Rate limit exceeded"

**Fix:**
- You've hit the 100 emails/day limit for unverified domains
- Check ZeptoMail Reports to see usage
- Wait 24 hours or verify domain

### Issue 4: Secret not found in Edge Function

**Fix:**
1. Add secret in Supabase Dashboard → Settings → Edge Functions → Secrets
2. Make sure name is exactly: `ZEPTOMAIL_API_KEY`
3. **Must redeploy after adding secret:**
   ```bash
   npx supabase functions deploy send-email
   ```

---

## Quick Checklist

- [ ] Edge Function logs checked (most important!)
- [ ] ZEPTOMAIL_API_KEY secret exists in Supabase
- [ ] API key tested directly and works
- [ ] Function redeployed after adding secret
- [ ] ZeptoMail dashboard shows activity
- [ ] Sender domain/email is verified in ZeptoMail

---

## What to Share

To help diagnose further, share:

1. **Edge Function logs** (screenshot from Supabase)
2. **ZeptoMail API key format** (just first 20 chars: `Zoho-enczapikey wSsVR...`)
3. **Direct API test result** (success or error message)
4. **Secrets screenshot** (showing ZEPTOMAIL_API_KEY is listed)

Once we see the actual error from the logs, we can fix it quickly!
