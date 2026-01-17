// Test Brevo Multi-Provider Email System

const SUPABASE_URL = 'https://kswknblwjlkgxgvypkmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY';

async function testBrevoEmail() {
  console.log('🧪 Testing Multi-Provider Email System with Brevo...\n');

  const testEmail = {
    to: 'fadipetimothy03@gmail.com', // Test with ANY email!
    subject: '🎉 LavLay Email System - LIVE via Elastic Email!',
    html: `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 40px auto; background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            h1 { color: #667eea; margin: 0 0 20px 0; }
            p { color: #333; font-size: 16px; line-height: 1.6; }
            .success-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .success-text { color: #166534; margin: 0; font-weight: 600; }
            .info-text { color: #166534; margin: 10px 0 0 0; }
            .footer { color: #666; font-size: 14px; margin-top: 30px; }
            .stats { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .stat-item { color: #1e40af; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Your Email System is LIVE!</h1>
            <p>
              Congratulations! Your LavLay email system is now fully operational and ready to send emails to ANY user who signs up!
            </p>

            <div class="success-box">
              <p class="success-text">✅ Multi-Provider System Active</p>
              <p class="info-text">✅ Sent via: Brevo (300 emails/day FREE)</p>
              <p class="info-text">✅ Can send to ANY email address</p>
              <p class="info-text">✅ Automatic failover enabled</p>
            </div>

            <div class="stats">
              <p class="stat-item"><strong>📊 Your Free Email Capacity:</strong></p>
              <p class="stat-item">• Brevo: 300 emails/day (9,000/month)</p>
              <p class="stat-item">• SendGrid: Ready for backup (100/day)</p>
              <p class="stat-item">• Elastic Email: Ready for backup (100/day)</p>
              <p class="stat-item">• Resend: Configured (100/day after sandbox)</p>
              <p class="stat-item"><strong>Total: Up to 18,000 emails/month FREE! 🚀</strong></p>
            </div>

            <p>
              <strong>What happens next:</strong><br>
              When users sign up on https://lavlay.com, they'll automatically receive a beautiful welcome email just like this one!
            </p>

            <div class="footer">
              <p>
                Sent via LavLay Multi-Provider Email System<br>
                Provider: Brevo<br>
                Time: ${new Date().toISOString()}<br>
                Function: send-email-multi
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    provider: 'auto' // Will try Brevo first, then fallback to others
  };

  console.log('📤 Sending test email to:', testEmail.to);
  console.log('📍 Function URL: https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email-multi\n');

  try {
    const response = await fetch('https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email-multi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(testEmail)
    });

    const data = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS! Email sent successfully!');
      console.log('📧 Provider used:', data.provider);
      console.log('🆔 Email ID:', data.id);
      console.log('\n🎉 Check your inbox at:', testEmail.to);
      console.log('\n✨ Your email system is ready for production!');
      console.log('Users can now receive welcome emails when they sign up! 🚀');
    } else {
      console.log('\n❌ FAILED! Email not sent');
      console.log('Error:', data.error || 'Unknown error');
      if (data.attempts) {
        console.log('Failed attempts:', data.attempts);
      }
    }

  } catch (error) {
    console.error('\n❌ Error calling function:', error.message);
  }
}

testBrevoEmail();
