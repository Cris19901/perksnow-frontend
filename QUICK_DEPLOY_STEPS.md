# Quick Deploy - Get Your Access Token

## Step 1: Get Supabase Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name: `LavLay Deploy`
4. Click **"Generate token"**
5. **Copy the token** (starts with `sbp_`)

## Step 2: Deploy Using Terminal

Once you have the token, run these commands in your terminal:

```bash
# Set the access token (replace YOUR_TOKEN with the actual token)
set SUPABASE_ACCESS_TOKEN=YOUR_TOKEN_HERE

# Link to your project
npx supabase link --project-ref kswknblwjlkgxgvypkmo

# Deploy the function
npx supabase functions deploy send-email
```

## Step 3: Test the Function

After deployment, test with this SQL query in Supabase SQL Editor:

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
      'html', '<h1>Hello!</h1><p>✅ Email integration works!</p>'
    )
  ) as request_id;
```

That's it! Much simpler than the dashboard method.
