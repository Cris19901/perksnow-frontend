-- Test the send-email Edge Function
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/editor
-- IMPORTANT: Replace YOUR_EMAIL@example.com with your actual email address

SELECT
  net.http_post(
    url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzODcwNTgsImV4cCI6MjA0Nzk2MzA1OH0.RZ5WKLsOaZOp0XrYP1hVDfjHLAcLFDKz2FUhQ0xfCMg'
    ),
    body := jsonb_build_object(
      'to', 'YOUR_EMAIL@example.com',
      'subject', 'Test Email from LavLay 🎉',
      'html', '<h1>Hello from LavLay!</h1><p>This is a test email from Resend via Supabase Edge Function.</p><p><strong>If you receive this, the integration is working! ✅</strong></p><p>You can now send beautiful transactional emails with 99.9% deliverability.</p>',
      'text', 'Hello from LavLay! This is a test email. If you receive this, the integration is working!'
    )
  ) as request_id;

-- After running this:
-- 1. Check your email inbox (should arrive in 5-10 seconds)
-- 2. Check spam folder if not in inbox
-- 3. Check Resend dashboard: https://resend.com/emails
-- 4. Check function logs: https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions/send-email/logs
