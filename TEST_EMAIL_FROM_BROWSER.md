# Test Email Function from Browser Console

Since the `pg_net` extension might have restrictions, let's test directly from your browser.

## Steps:

1. **Open your LavLay website** in the browser (local or production)
2. **Open Browser Console** (Press F12 or right-click → Inspect → Console tab)
3. **Paste this code** (replace YOUR_EMAIL with your actual email):

```javascript
// Test email function
const testEmail = async () => {
  try {
    const response = await fetch('https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzODcwNTgsImV4cCI6MjA0Nzk2MzA1OH0.RZ5WKLsOaZOp0XrYP1hVDfjHLAcLFDKz2FUhQ0xfCMg'
      },
      body: JSON.stringify({
        to: 'YOUR_EMAIL@example.com',
        subject: 'Test Email from LavLay 🎉',
        html: '<h1>Hello from LavLay!</h1><p>This is a test email from Resend.</p><p><strong>If you receive this, the integration is working! ✅</strong></p>',
        text: 'Hello from LavLay! This is a test email. If you receive this, the integration is working!'
      })
    });

    const data = await response.json();
    console.log('Response:', data);

    if (data.success) {
      console.log('✅ Email sent successfully!');
      console.log('Email ID:', data.id);
    } else {
      console.error('❌ Email failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Run the test
testEmail();
```

4. **Press Enter** to run
5. **Check the console** for the response
6. **Check your email inbox** (should arrive within 5-10 seconds)

## Expected Output:

**Success:**
```
Response: {success: true, id: "...", message: "Email sent successfully"}
✅ Email sent successfully!
Email ID: abc123...
```

**Failed:**
```
Response: {error: "...", details: {...}}
❌ Email failed: ...
```

## If it works:

You'll see:
- ✅ Success message in console
- Email in your inbox within seconds
- Email visible in Resend dashboard

## If it fails:

Check:
1. RESEND_API_KEY is correct in Supabase secrets
2. Function logs: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions/send-email/logs
3. Resend dashboard for errors
