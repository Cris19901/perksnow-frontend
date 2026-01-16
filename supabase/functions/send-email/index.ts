// Supabase Edge Function: send-email
// Deploy via Supabase Dashboard: Edge Functions → Deploy new function
// Updated to use ZeptoMail instead of Resend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ZEPTOMAIL_API_KEY = Deno.env.get('ZEPTOMAIL_API_KEY') || '';
const ZEPTOMAIL_ENDPOINT = 'https://api.zeptomail.com/v1.1/email';
const FROM_EMAIL = 'noreply@lavlay.com';
const FROM_NAME = 'LavLay';

interface EmailPayload {
  type: 'referral_signup' | 'referral_deposit' | 'withdrawal_request' | 'withdrawal_completed' | 'withdrawal_rejected' | 'withdrawal_status' | 'welcome';
  // Legacy format (nested data)
  data?: {
    to_email: string;
    to_name: string;
    referred_username?: string;
    points_earned?: number;
    deposit_amount?: number;
    commission_earned?: number;
    withdrawal_amount?: number;
    withdrawal_id?: string;
    bank_name?: string;
    account_number?: string;
    admin_notes?: string;
    referral_code?: string;
  };
  // New flat format from database triggers
  email?: string;
  username?: string;
  amount?: number;
  points?: number;
  method?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  status?: string;
  adminNotes?: string;
  referral_code?: string;
  referred_username?: string;
  points_earned?: number;
}

async function sendEmail(to: { email: string; name: string }[], subject: string, htmlBody: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Debug: Check if API key exists
    if (!ZEPTOMAIL_API_KEY || ZEPTOMAIL_API_KEY === '') {
      console.error('ZEPTOMAIL_API_KEY is not set!');
      return { success: false, error: 'API key not configured in Edge Function secrets. Go to Settings -> Functions -> Secrets and add ZEPTOMAIL_API_KEY' };
    }

    console.log('API key length:', ZEPTOMAIL_API_KEY.length, 'First 25 chars:', ZEPTOMAIL_API_KEY.substring(0, 25));

    const response = await fetch(ZEPTOMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ZEPTOMAIL_API_KEY,
      },
      body: JSON.stringify({
        from: {
          address: FROM_EMAIL,
          name: FROM_NAME,
        },
        to: to.map(recipient => ({
          email_address: {
            address: recipient.email,
            name: recipient.name || '',
          },
        })),
        subject,
        htmlbody: htmlBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ZeptoMail API error:', response.status, response.statusText, error);
      return { success: false, error: `${response.status} ${response.statusText}: ${error}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: String(error) };
  }
}

function getEmailTemplate(type: string, data: any): { subject: string; htmlBody: string } {
  const styles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0; }
      .header h1 { margin: 0; font-size: 28px; }
      .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
      .button { display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; margin: 20px 0; }
      .button:hover { opacity: 0.9; }
      .points-badge { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 25px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
      .info-box { background: #f3f4f6; border-left: 4px solid #9333ea; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
      .highlight { color: #9333ea; font-weight: bold; }
    </style>
  `;

  switch (type) {
    case 'referral_signup':
      return {
        subject: `🎉 You earned ${data.points_earned} points! New referral signup`,
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 New Referral!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.to_name},</p>
                <p>Great news! <strong>@${data.referred_username}</strong> just signed up using your referral code.</p>
                <div class="points-badge">+${data.points_earned} Points Earned!</div>
                <p>Your referral is now active. You'll earn additional rewards when they make deposits:</p>
                <div class="info-box">
                  <strong>📈 Future Earnings:</strong><br>
                  • <strong>50 points</strong> per deposit<br>
                  • <strong>5% commission</strong> on deposit amount<br>
                  • Track up to <strong>10 deposits</strong> per referral
                </div>
                <p style="text-align: center;">
                  <a href="https://lavlay.com/referrals" class="button">View Referral Dashboard</a>
                </p>
                <p>Keep sharing your referral code to earn more!</p>
              </div>
              <div class="footer">
                <p>LavLay - Social Media Monetization Platform</p>
                <p><a href="https://lavlay.com">lavlay.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'referral_deposit':
      const formattedAmount = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(data.deposit_amount);
      const formattedCommission = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(data.commission_earned);

      return {
        subject: `💰 You earned ${formattedCommission}! Referral made a deposit`,
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💰 Referral Deposit!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.to_name},</p>
                <p>Excellent news! Your referral <strong>@${data.referred_username}</strong> just made a deposit of <span class="highlight">${formattedAmount}</span>.</p>
                <div class="points-badge">
                  +${data.points_earned} Points<br>
                  +${formattedCommission} Commission
                </div>
                <div class="info-box">
                  <strong>💵 Earnings Breakdown:</strong><br>
                  • Points earned: <strong>${data.points_earned}</strong><br>
                  • Commission (5%): <strong>${formattedCommission}</strong><br>
                  • Deposit amount: ${formattedAmount}
                </div>
                <p>Your commission has been added to your wallet balance and can be withdrawn anytime.</p>
                <p style="text-align: center;">
                  <a href="https://lavlay.com/withdraw" class="button">Withdraw Earnings</a>
                  <a href="https://lavlay.com/referrals" class="button" style="background: #6b7280; margin-left: 10px;">View Dashboard</a>
                </p>
              </div>
              <div class="footer">
                <p>LavLay - Social Media Monetization Platform</p>
                <p><a href="https://lavlay.com">lavlay.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'withdrawal_request':
      const withdrawalAmount = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(data.withdrawal_amount);

      return {
        subject: '✅ Withdrawal request received',
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Withdrawal Requested</h1>
              </div>
              <div class="content">
                <p>Hi ${data.to_name},</p>
                <p>We've received your withdrawal request for <span class="highlight">${withdrawalAmount}</span>.</p>
                <div class="info-box">
                  <strong>📋 Request Details:</strong><br>
                  • Amount: <strong>${withdrawalAmount}</strong><br>
                  • Bank: ${data.bank_name}<br>
                  • Account: ${data.account_number}<br>
                  • Status: <strong>Pending Review</strong>
                </div>
                <p>Our team will review your request within 1-3 business days. You'll receive another email once your withdrawal is processed.</p>
                <p style="text-align: center;">
                  <a href="https://lavlay.com/withdraw" class="button">View Withdrawal Status</a>
                </p>
              </div>
              <div class="footer">
                <p>LavLay - Social Media Monetization Platform</p>
                <p><a href="https://lavlay.com">lavlay.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'withdrawal_completed':
      const completedAmount = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(data.withdrawal_amount);

      return {
        subject: '🎉 Withdrawal completed successfully',
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Withdrawal Completed!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.to_name},</p>
                <p>Great news! Your withdrawal request for <span class="highlight">${completedAmount}</span> has been processed and sent to your bank account.</p>
                <div class="info-box">
                  <strong>✅ Transfer Details:</strong><br>
                  • Amount: <strong>${completedAmount}</strong><br>
                  • Bank: ${data.bank_name}<br>
                  • Account: ${data.account_number}<br>
                  • Status: <strong>Completed</strong>
                </div>
                ${data.admin_notes ? `<p><strong>Note from admin:</strong> ${data.admin_notes}</p>` : ''}
                <p>The funds should appear in your bank account within a few hours to 1 business day depending on your bank.</p>
                <p style="text-align: center;">
                  <a href="https://lavlay.com/withdraw" class="button">View Transaction History</a>
                </p>
              </div>
              <div class="footer">
                <p>LavLay - Social Media Monetization Platform</p>
                <p><a href="https://lavlay.com">lavlay.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'withdrawal_rejected':
      const rejectedAmount = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(data.withdrawal_amount);

      return {
        subject: '❌ Withdrawal request declined',
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
                <h1>❌ Withdrawal Declined</h1>
              </div>
              <div class="content">
                <p>Hi ${data.to_name},</p>
                <p>Unfortunately, your withdrawal request for <span class="highlight">${rejectedAmount}</span> has been declined.</p>
                <div class="info-box">
                  <strong>📋 Request Details:</strong><br>
                  • Amount: <strong>${rejectedAmount}</strong><br>
                  • Bank: ${data.bank_name}<br>
                  • Account: ${data.account_number}<br>
                  • Status: <strong>Rejected</strong>
                </div>
                ${data.admin_notes ? `
                  <div class="info-box" style="border-left-color: #dc2626;">
                    <strong>Reason:</strong><br>
                    ${data.admin_notes}
                  </div>
                ` : ''}
                <p>The requested amount has been returned to your wallet balance. You can submit a new withdrawal request after addressing the issue mentioned above.</p>
                <p style="text-align: center;">
                  <a href="https://lavlay.com/withdraw" class="button">Submit New Request</a>
                </p>
                <p>If you have questions, please contact our support team.</p>
              </div>
              <div class="footer">
                <p>LavLay - Social Media Monetization Platform</p>
                <p><a href="https://lavlay.com">lavlay.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case 'welcome':
      return {
        subject: '🎉 Welcome to LavLay! You got 15,000 bonus points!',
        htmlBody: `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to LavLay!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.to_name},</p>
                <p>Welcome to LavLay - the social media platform where you can earn money from your posts, interactions, and referrals!</p>

                <div class="points-badge" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); font-size: 32px;">
                  🎁 +15,000 Bonus Points!
                </div>

                <p style="text-align: center; font-size: 18px; color: #10b981; font-weight: bold;">
                  Withdrawable immediately - no waiting!
                </p>

                <div class="info-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left-color: #f59e0b;">
                  <strong>💰 Your Welcome Bonus:</strong><br>
                  • <strong>15,000 points</strong> added to your account<br>
                  • <strong>Fully withdrawable</strong> right now<br>
                  • No minimum balance required<br>
                  • Convert to cash anytime!
                </div>

                <div class="info-box">
                  <strong>🎁 Your Referral Code:</strong><br>
                  <div style="font-size: 24px; font-weight: bold; color: #9333ea; margin-top: 10px;">${data.referral_code}</div>
                  <p style="margin-top: 10px; margin-bottom: 0;">Share this code and earn more!</p>
                </div>

                <p><strong>Keep earning more:</strong></p>
                <ul>
                  <li>📝 Share posts and reels to earn points</li>
                  <li>👥 Invite friends: <strong>20 points per signup</strong></li>
                  <li>💵 Deposit bonus: <strong>50 points + 5% commission</strong></li>
                  <li>💰 Withdraw anytime - minimum ₦100</li>
                </ul>

                <p style="text-align: center;">
                  <a href="https://lavlay.com/profile" class="button" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">View Your Points</a>
                  <a href="https://lavlay.com/referrals" class="button" style="background: #6b7280; margin-left: 10px;">Share Referral Code</a>
                </p>

                <p style="text-align: center; font-size: 14px; color: #6b7280;">
                  Your 15,000 bonus points are already in your account!
                </p>
              </div>
              <div class="footer">
                <p>LavLay - Social Media Monetization Platform</p>
                <p><a href="https://lavlay.com">lavlay.com</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: 'Notification from LavLay',
        htmlBody: '<p>You have a new notification from LavLay.</p>',
      };
  }
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
    });
  }

  try {
    const payload: EmailPayload = await req.json();
    console.log('Received email payload:', JSON.stringify(payload));

    // Normalize payload - handle both flat format (from DB triggers) and nested format (from app)
    let normalizedData: any;
    let toEmail: string;
    let toName: string;

    if (payload.data) {
      // Legacy nested format
      normalizedData = payload.data;
      toEmail = payload.data.to_email;
      toName = payload.data.to_name;
    } else {
      // Flat format from database triggers
      toEmail = payload.email || '';
      toName = payload.username || 'User';
      normalizedData = {
        to_email: toEmail,
        to_name: toName,
        withdrawal_amount: payload.amount,
        points: payload.points,
        bank_name: payload.bankName || payload.method || 'Bank Transfer',
        account_number: payload.accountNumber || 'N/A',
        account_name: payload.accountName || 'N/A',
        admin_notes: payload.adminNotes,
        referral_code: payload.referral_code,
        referred_username: payload.referred_username,
        points_earned: payload.points_earned,
        status: payload.status,
      };
    }

    // Handle withdrawal_status type - map to withdrawal_completed or withdrawal_rejected
    let emailType = payload.type;
    if (emailType === 'withdrawal_status') {
      const status = payload.status || normalizedData.status;
      if (status === 'completed' || status === 'approved') {
        emailType = 'withdrawal_completed';
      } else if (status === 'rejected') {
        emailType = 'withdrawal_rejected';
      } else {
        // Unknown status, skip
        return new Response(
          JSON.stringify({ success: true, message: 'Status not actionable, skipping email' }),
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Get email template
    const { subject, htmlBody } = getEmailTemplate(emailType, normalizedData);

    // Send email
    const result = await sendEmail(
      [{ email: toEmail, name: toName }],
      subject,
      htmlBody
    );

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error processing email request:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
