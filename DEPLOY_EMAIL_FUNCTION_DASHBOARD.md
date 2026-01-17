# Deploy Email Function via Supabase Dashboard

Since the CLI requires additional setup, here's the easiest way to deploy the Edge Function using the Supabase Dashboard.

## Step-by-Step Instructions

### Step 1: Go to Edge Functions

1. Open your browser
2. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions
3. You should see the Edge Functions page

### Step 2: Create New Function

1. Click the **"Create a new function"** button (or **"Deploy a new function"**)
2. Function name: `send-email`
3. You'll see a code editor

### Step 3: Copy the Code

1. Open this file in your project: `supabase/functions/send-email/index.ts`
2. Copy ALL the code (Ctrl+A, Ctrl+C)
3. Go back to the Supabase dashboard
4. Paste the code into the editor (replacing any existing code)

### Step 4: Verify RESEND_API_KEY Secret

Before deploying, make sure you added the secret:

1. In Supabase Dashboard, go to: Settings → Edge Functions
2. Scroll to "Secrets" section
3. Verify you see: `RESEND_API_KEY` with your Resend API key
4. If not there, add it:
   - Click "Add new secret"
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)
   - Click Save

### Step 5: Deploy

1. Back in the Edge Functions editor
2. Click **"Deploy function"** button
3. Wait for deployment to complete (should take 10-30 seconds)
4. You'll see a success message with the function URL

### Step 6: Copy Function URL

After deployment, you'll see the function URL:
```
https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email
```

Copy this URL - you'll need it for testing.

## Testing the Function

### Test 1: Using Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/editor
2. Click "New query"
3. Paste this code (replace `YOUR_EMAIL` with your actual email):

```sql
SELECT
  net.http_post(
    url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzODcwNTgsImV4cCI6MjA0Nzk2MzA1OH0.RZ5WKLsOaZOp0XrYP1hVDfjHLAcLFDKz2FUhQ0xfCMg'
    ),
    body := jsonb_build_object(
      'to', 'YOUR_EMAIL@example.com',
      'subject', 'Test Email from LavLay',
      'html', '<h1>Hello!</h1><p>This is a test email from Resend via Supabase Edge Function.</p><p>If you receive this, the integration is working! ✅</p>',
      'text', 'Hello! This is a test email. If you receive this, the integration is working!'
    )
  ) as request_id;
```

4. Click **RUN**
5. Check your email inbox (should arrive within 5-10 seconds)
6. If not in inbox, check spam folder

### Test 2: Check Function Logs

1. Go to: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions/send-email/logs
2. You should see the execution logs
3. Look for any errors or the success response

### Test 3: Check Resend Dashboard

1. Go to: https://resend.com/emails
2. You should see the test email in the list
3. Check the delivery status

## Troubleshooting

### If email doesn't send:

1. **Check RESEND_API_KEY**:
   - Go to Settings → Edge Functions → Secrets
   - Verify `RESEND_API_KEY` is there and correct

2. **Check Function Logs**:
   - Go to Functions → send-email → Logs
   - Look for error messages

3. **Check Resend Dashboard**:
   - Go to resend.com → Logs
   - See if the email even reached Resend

4. **Verify Function is Deployed**:
   - Go to Functions page
   - You should see `send-email` with a green status

### Common Errors:

**Error: "RESEND_API_KEY is not set"**
- Solution: Add the secret in Settings → Edge Functions → Secrets

**Error: "Unauthorized" or "Invalid API key"**
- Solution: Your Resend API key is wrong. Get a new one from resend.com

**Error: "Failed to send email"**
- Solution: Check Resend dashboard for specific error
- Might be invalid email address or rate limit

## Alternative: Deploy via CLI (Advanced)

If you want to use the CLI in the future:

1. Get your Supabase access token:
   - Go to: https://supabase.com/dashboard/account/tokens
   - Create new token
   - Copy it

2. Set environment variable:
```bash
set SUPABASE_ACCESS_TOKEN=your-token-here
```

3. Deploy:
```bash
npx supabase link --project-ref kswknblwjlkgxgvypkmo
npx supabase functions deploy send-email
```

But for now, the dashboard method is easiest!

## Next Steps

Once the function is working:

1. ✅ Verify you can send test emails
2. ✅ Integrate with your React app (use `src/lib/email.ts`)
3. ✅ Add welcome emails to signup
4. ✅ Add notification emails to follows/comments
5. ✅ Monitor in Resend dashboard

## Function is Ready When:

- [x] Function shows "Active" status in dashboard
- [x] Test email arrives in your inbox
- [x] No errors in function logs
- [x] Email appears in Resend dashboard

You're done with Step 5! Move on to integrating emails into your app.
