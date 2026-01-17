// ============================================================================
// Supabase Edge Function: Send Scheduled Emails
// ============================================================================
// This function sends scheduled emails using Resend email service
// Deploy: supabase functions deploy send-emails
// Set secrets: supabase secrets set RESEND_API_KEY=your_key
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PendingEmail {
  email_id: string;
  user_id: string;
  user_email: string;
  subject: string;
  html_body: string;
  text_body: string;
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Fetching pending emails...');

    // Get pending emails ready to send
    const { data: emails, error: fetchError } = await supabase.rpc('get_pending_emails_to_send');

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      throw fetchError;
    }

    if (!emails || emails.length === 0) {
      console.log('No pending emails to send');
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: 'No emails to send'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${emails.length} emails to send`);

    let sentCount = 0;
    let failedCount = 0;

    // Send each email
    for (const email of emails as PendingEmail[]) {
      try {
        console.log(`Sending email to ${email.user_email}...`);

        // Send email using Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'LavLay <noreply@lavlay.com>', // Update with your domain
            to: email.user_email,
            subject: email.subject,
            html: email.html_body,
            text: email.text_body
          })
        });

        if (resendResponse.ok) {
          // Email sent successfully
          const result = await resendResponse.json();
          console.log(`✅ Email sent to ${email.user_email}:`, result.id);

          // Mark as sent in database
          await supabase.rpc('mark_email_sent', {
            p_email_id: email.email_id
          });

          sentCount++;
        } else {
          // Email failed to send
          const errorText = await resendResponse.text();
          console.error(`❌ Failed to send email to ${email.user_email}:`, errorText);

          // Mark as failed in database
          await supabase.rpc('mark_email_failed', {
            p_email_id: email.email_id,
            p_error_message: `Resend API error: ${errorText}`
          });

          failedCount++;
        }
      } catch (emailError: any) {
        console.error(`❌ Exception sending email to ${email.user_email}:`, emailError);

        // Mark as failed in database
        await supabase.rpc('mark_email_failed', {
          p_email_id: email.email_id,
          p_error_message: `Exception: ${emailError.message}`
        });

        failedCount++;
      }
    }

    console.log(`Email sending complete. Sent: ${sentCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: emails.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Fatal error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================================================
// How to Deploy This Function
// ============================================================================
//
// 1. Install Supabase CLI:
//    npm install -g supabase
//
// 2. Initialize Supabase in your project:
//    supabase init
//
// 3. Create the function folder:
//    mkdir -p supabase/functions/send-emails
//
// 4. Copy this file to:
//    supabase/functions/send-emails/index.ts
//
// 5. Set your Resend API key:
//    supabase secrets set RESEND_API_KEY=your_resend_api_key
//
// 6. Deploy the function:
//    supabase functions deploy send-emails
//
// 7. Set up a cron job to run it hourly:
//    Go to Supabase Dashboard → Database → Cron Jobs → Create a new job
//
//    Schedule: 0 * * * * (every hour)
//    SQL:
//    SELECT net.http_post(
//      url := 'https://your-project-ref.supabase.co/functions/v1/send-emails',
//      headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
//    );
//
// 8. Test manually:
//    curl -X POST https://your-project-ref.supabase.co/functions/v1/send-emails \
//      -H "Authorization: Bearer YOUR_ANON_KEY"
//
// ============================================================================
// Alternative: Using SendGrid
// ============================================================================
//
// If you prefer SendGrid over Resend, replace the email sending code:
//
// const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': `Bearer ${SENDGRID_API_KEY}`
//   },
//   body: JSON.stringify({
//     personalizations: [{
//       to: [{ email: email.user_email }],
//       subject: email.subject
//     }],
//     from: { email: 'noreply@lavlay.com', name: 'LavLay' },
//     content: [
//       {
//         type: 'text/plain',
//         value: email.text_body
//       },
//       {
//         type: 'text/html',
//         value: email.html_body
//       }
//     ]
//   })
// });
//
// ============================================================================
