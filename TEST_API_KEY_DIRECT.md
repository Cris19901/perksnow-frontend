# Direct API Key Test

Let's verify the API key is actually in Supabase and works.

## Step 1: Check the Secret is Actually Set

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/settings/functions
2. Scroll to **Secrets** section
3. Look for `ZEPTOMAIL_API_KEY`
4. Is it there?

## Step 2: If Missing - Add It Now

If `ZEPTOMAIL_API_KEY` is NOT in the secrets list:

1. Click **Add secret**
2. Name: `ZEPTOMAIL_API_KEY` (exactly like this, case-sensitive)
3. Value: Copy **Send Mail token 1** from ZeptoMail
   - Should be: `Zoho-enczapikey wSsVR611...` (full key)
4. Click **Save**
5. Redeploy: `npx supabase functions deploy send-email`

## Step 3: Possible Issue - API Key Has Spaces

When you copied the API key, did you copy it correctly?

The format should be:
```
Zoho-enczapikey wSsVR611xxxxxxxxxxxxxxxxxxxx
```

**Common mistakes:**
- Extra spaces at the beginning or end
- Missing the space between `Zoho-enczapikey` and the key
- Only part of the key copied

## Step 4: Try Regenerating the Key

If nothing works, regenerate the API key in ZeptoMail:

1. Go to: https://zeptomail.zoho.com/zem/911601052#mailAgent/25586549e5b05e0d/setupInfo/api
2. Find **Send Mail token 1**
3. Click the **delete/trash icon** next to it
4. Click **Add new token** or regenerate
5. Name it: `LavLay Production`
6. Copy the new key immediately
7. Update in Supabase
8. Redeploy

---

## What's Likely Happening

ZeptoMail returning 500 Internal Server Error with empty response usually means:

1. **API key is missing/empty** - Deno.env.get('ZEPTOMAIL_API_KEY') returns empty string
2. **API key format is wrong** - Extra characters, missing prefix, etc.
3. **ZeptoMail server issue** - Rare, but possible

The fact that the PowerShell test worked means the key itself is valid. The problem is getting it into the Edge Function.
