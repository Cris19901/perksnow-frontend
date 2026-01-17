# Simple Email Deployment - 3 Steps

The signup bonus is working! Now let's get the welcome email sending.

## Why Email Isn't Sending

The code is ready, but the **Resend Edge Function** needs to be deployed to Supabase. Currently when your app tries to send an email, it gets an error because the function doesn't exist yet.

---

## Option 1: Deploy via Supabase Dashboard (Easiest - 5 minutes)

### Step 1: Get Resend API Key (2 minutes)

1. Go to https://resend.com/signup (or login if you have an account)
2. Click **"API Keys"** in the left sidebar
3. Click **"Create API Key"**
4. Name it: `LavLay Production`
5. Click **"Create"**
6. **Copy the API key** (starts with `re_`) - you won't see it again!

### Step 2: Deploy Edge Function (2 minutes)

1. Open your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your **LavLay project**
3. Go to **Edge Functions** in the left sidebar
4. Click **"Deploy a new function"**
5. Choose **"Create from blank"**
6. Function name: `send-email`
7. Copy and paste this code:

```typescript
// Supabase Edge Function: send-email
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailRequest {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Verify Resend API key exists
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }

    // Parse request body
    const body: EmailRequest = await req.json()
    const { to, subject, html, text, from, replyTo } = body

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!html && !text) {
      return new Response(
        JSON.stringify({ error: 'Either html or text content is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare email data
    const emailData = {
      from: from || 'LavLay <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo,
    }

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    })

    const resendData = await resendResponse.json()

    // Check if email was sent successfully
    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData)
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: resendData
        }),
        {
          status: resendResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        id: resendData.id,
        message: 'Email sent successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
```

8. Click **"Deploy"**
9. Wait for deployment to complete (about 30 seconds)

### Step 3: Add Resend API Key as Secret (1 minute)

1. Still in **Supabase Dashboard**
2. Go to **Project Settings** (gear icon in bottom left)
3. Click **"Edge Functions"** in the settings menu
4. Scroll to **"Function Secrets"** section
5. Click **"Add new secret"**
6. Name: `RESEND_API_KEY`
7. Value: Paste your Resend API key (the one that starts with `re_`)
8. Click **"Save"**

### Step 4: Test It! (1 minute)

1. Go to your app: https://lavlay.com
2. **Sign up with a new account** (use a different email)
3. Check your browser console (F12) - you should see:
   ```
   📧 [SIGNUP] Sending welcome email with 100 points bonus...
   ✅ [SIGNUP] Welcome email sent successfully
   ```
4. **Check your email inbox** (might be in spam folder)
5. You should receive a beautiful welcome email with:
   - Welcome message
   - "100 Points Awarded" badge
   - What you can do with points
   - "Start Exploring" button

---

## Option 2: Deploy via CLI (For Advanced Users)

If you prefer command line:

```bash
# 1. Login to Supabase
npx supabase login

# 2. Link your project (get project ref from dashboard URL)
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Set the Resend API key
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here

# 4. Deploy the function
npx supabase functions deploy send-email
```

---

## Troubleshooting

### If email still doesn't send:

**Check 1: View function logs**
1. Supabase Dashboard → Edge Functions → send-email
2. Click **"Logs"** tab
3. Look for any errors

**Check 2: Browser console**
1. Press F12
2. Look for error messages starting with `❌ [SIGNUP]`
3. Share the error message

**Check 3: Verify secret is set**
1. Supabase Dashboard → Settings → Edge Functions
2. Check if `RESEND_API_KEY` is listed in secrets
3. If not, add it again

### Common Issues:

**"Function not found" error:**
- Make sure function name is exactly `send-email` (with hyphen, not underscore)

**"RESEND_API_KEY is not set" error:**
- Go back to Step 3 and add the secret
- Make sure you saved it

**"Rate limit exceeded" error:**
- Resend free tier allows limited emails per day
- Using `onboarding@resend.dev` has rate limits
- Solution: Verify your own domain (optional, see below)

---

## Optional: Use Your Own Domain (Production)

After testing works with `onboarding@resend.dev`, you can set up your own domain:

1. **Add domain in Resend:**
   - Go to https://resend.com/domains
   - Click "Add Domain"
   - Enter: `lavlay.com`
   - Add the DNS records shown

2. **Update Edge Function:**
   - Change line 61 in the function from:
     ```typescript
     from: from || 'LavLay <onboarding@resend.dev>',
     ```
   - To:
     ```typescript
     from: from || 'LavLay <noreply@lavlay.com>',
     ```
   - Redeploy the function

---

## ✅ Success!

Once deployed, **every new signup will automatically:**
1. ✅ Get 100 points added to their account
2. ✅ Receive a professional welcome email
3. ✅ See their points balance in the navigation
4. ✅ Get 10 points for each post they create

**Total setup time: ~5 minutes** 🎉
