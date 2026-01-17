// Test Email System
// This script tests if the Resend Edge Function is working correctly

const SUPABASE_URL = 'https://kswknblwjlkgxgvypkmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY';

async function testEmailFunction() {
  console.log('🧪 Testing Resend Edge Function...\n');

  const testEmail = {
    to: 'fadipetimothy03@gmail.com', // Testing with ANY email now!
    subject: '🎉 LavLay Email System - TEST DOMAIN (Works for All Users!)',
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h1 style="color: #667eea; margin: 0 0 20px 0;">🎉 Email System Live!</h1>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your LavLay email system is now working and can send to ANY user!
            </p>
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #166534; margin: 0; font-weight: 600;">✅ Emails sent from: onboarding@resend.dev</p>
              <p style="color: #166534; margin: 10px 0 0 0;">✅ Works for ALL email addresses!</p>
              <p style="color: #166534; margin: 10px 0 0 0;">🔄 Will upgrade to noreply@lavlay.com soon</p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Sent via Resend Edge Function<br>
              Time: ${new Date().toISOString()}
            </p>
          </div>
        </body>
      </html>
    `,
    text: '✅ Email System Test - If you receive this, your LavLay email system is working!',
    from: 'LavLay Test <onboarding@resend.dev>'
  };

  try {
    console.log('📤 Sending test email to:', testEmail.to);
    console.log('📍 Function URL:', `${SUPABASE_URL}/functions/v1/send-email`);
    console.log('');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(testEmail)
    });

    const data = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok && data.success) {
      console.log('✅ SUCCESS! Email sent successfully!');
      console.log('📧 Email ID:', data.id);
      console.log('');
      console.log('📬 Check your inbox at:', testEmail.to);
      console.log('💡 Note: Email might be in spam/junk folder');
      console.log('');
      console.log('🎉 Your email system is fully operational!');
      return true;
    } else {
      console.error('❌ FAILED! Email not sent');
      console.error('Error:', data.error || data);
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('Possible issues:');
    console.error('1. Edge Function not deployed');
    console.error('2. RESEND_API_KEY not set');
    console.error('3. Network connectivity issue');
    return false;
  }
}

// Run the test
testEmailFunction().then(success => {
  process.exit(success ? 0 : 1);
});
