// ZeptoMail Email Service
// Handles all email notifications for the platform

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailOptions {
  to: EmailRecipient[];
  subject: string;
  htmlBody: string;
  textBody?: string;
}

const ZEPTOMAIL_API_KEY = import.meta.env.VITE_ZEPTOMAIL_API_KEY || '';
const ZEPTOMAIL_ENDPOINT = 'https://api.zeptomail.com/v1.1/email';
const FROM_EMAIL = 'noreply@lavlay.com'; // Change to your verified domain
const FROM_NAME = 'LavLay';

/**
 * Send email via ZeptoMail API
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!ZEPTOMAIL_API_KEY) {
    console.error('ZeptoMail API key not configured');
    return false;
  }

  try {
    const response = await fetch(ZEPTOMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: {
          address: FROM_EMAIL,
          name: FROM_NAME,
        },
        to: options.to.map(recipient => ({
          email_address: {
            address: recipient.email,
            name: recipient.name || '',
          },
        })),
        subject: options.subject,
        htmlbody: options.htmlBody,
        textbody: options.textBody || stripHtml(options.htmlBody),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ZeptoMail error:', error);
      return false;
    }

    console.log('Email sent successfully to:', options.to.map(r => r.email).join(', '));
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Format currency for Nigerian Naira
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// REFERRAL EMAIL TEMPLATES
// ============================================================================

/**
 * Email: New referral signed up
 */
export async function sendReferralSignupEmail(
  referrerEmail: string,
  referrerName: string,
  referredUsername: string,
  pointsEarned: number
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .points-badge { display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; font-size: 18px; font-weight: bold; margin: 20px 0; }
        .button { display: inline-block; background: #9333ea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 New Referral!</h1>
        </div>
        <div class="content">
          <p>Hi ${referrerName},</p>

          <p>Great news! <strong>@${referredUsername}</strong> just signed up using your referral code.</p>

          <div style="text-align: center;">
            <div class="points-badge">+${pointsEarned} Points Earned!</div>
          </div>

          <p>You're building your network! Keep sharing your referral code to earn even more:</p>

          <ul>
            <li><strong>20 points</strong> for every signup</li>
            <li><strong>50 points</strong> when they make their first deposit</li>
            <li><strong>5% commission</strong> on their deposits (first 10 deposits)</li>
          </ul>

          <div style="text-align: center;">
            <a href="https://lavlay.com/referrals" class="button">View Referral Dashboard</a>
          </div>

          <p>Keep up the great work!</p>

          <p>Best regards,<br>The LavLay Team</p>
        </div>
        <div class="footer">
          <p>© 2026 LavLay. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: [{ email: referrerEmail, name: referrerName }],
    subject: `🎉 You earned ${pointsEarned} points! New referral signup`,
    htmlBody,
  });
}

/**
 * Email: Referral made first deposit
 */
export async function sendReferralDepositEmail(
  referrerEmail: string,
  referrerName: string,
  referredUsername: string,
  pointsEarned: number,
  commissionEarned: number,
  depositAmount: number
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .earnings-box { background: white; border: 2px solid #10b981; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
        .earnings-amount { font-size: 32px; font-weight: bold; color: #10b981; margin: 10px 0; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 You Earned Money!</h1>
        </div>
        <div class="content">
          <p>Hi ${referrerName},</p>

          <p>Exciting news! <strong>@${referredUsername}</strong> just made a deposit of <strong>${formatCurrency(depositAmount)}</strong>.</p>

          <div class="earnings-box">
            <p style="margin: 0; color: #6b7280;">Your Earnings</p>
            <div class="earnings-amount">${formatCurrency(commissionEarned)}</div>
            <p style="margin: 0; color: #6b7280;">+ ${pointsEarned} Points</p>
          </div>

          <p>This money has been added to your wallet balance and you can withdraw it anytime!</p>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>💡 Pro Tip:</strong> You can earn up to 10 deposits from each referral. Keep encouraging them to use LavLay!
          </div>

          <div style="text-align: center;">
            <a href="https://lavlay.com/withdraw" class="button">Withdraw Earnings</a>
          </div>

          <p>Keep growing your network!</p>

          <p>Best regards,<br>The LavLay Team</p>
        </div>
        <div class="footer">
          <p>© 2026 LavLay. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: [{ email: referrerEmail, name: referrerName }],
    subject: `💰 You earned ${formatCurrency(commissionEarned)}! Referral deposit bonus`,
    htmlBody,
  });
}

// ============================================================================
// WITHDRAWAL EMAIL TEMPLATES
// ============================================================================

/**
 * Email: Withdrawal request submitted
 */
export async function sendWithdrawalRequestEmail(
  userEmail: string,
  userName: string,
  amount: number,
  bankName: string,
  accountNumber: string
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .info-label { color: #6b7280; }
        .info-value { font-weight: bold; }
        .status-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 5px 15px; border-radius: 15px; font-size: 14px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📥 Withdrawal Request Received</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>

          <p>We've received your withdrawal request. Here are the details:</p>

          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Amount</span>
              <span class="info-value">${formatCurrency(amount)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Bank</span>
              <span class="info-value">${bankName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Account Number</span>
              <span class="info-value">${accountNumber}</span>
            </div>
            <div class="info-row" style="border-bottom: none;">
              <span class="info-label">Status</span>
              <span class="status-badge">⏳ Pending Review</span>
            </div>
          </div>

          <p><strong>What happens next?</strong></p>
          <ol>
            <li>Our team will review your request (usually within 24 hours)</li>
            <li>We'll verify your bank details</li>
            <li>Once approved, money will be transferred to your account</li>
            <li>You'll receive a confirmation email when completed</li>
          </ol>

          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>⏱️ Processing Time:</strong> 1-3 business days
          </div>

          <p>You can track your withdrawal status anytime in your dashboard.</p>

          <p>Best regards,<br>The LavLay Team</p>
        </div>
        <div class="footer">
          <p>© 2026 LavLay. All rights reserved.</p>
          <p>If you didn't make this request, please contact us immediately.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: [{ email: userEmail, name: userName }],
    subject: `📥 Withdrawal request received - ${formatCurrency(amount)}`,
    htmlBody,
  });
}

/**
 * Email: Withdrawal approved and completed
 */
export async function sendWithdrawalCompletedEmail(
  userEmail: string,
  userName: string,
  amount: number,
  bankName: string,
  accountNumber: string,
  transactionReference?: string
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-icon { font-size: 64px; text-align: center; margin: 20px 0; }
        .amount-box { background: white; border: 2px solid #10b981; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
        .amount { font-size: 36px; font-weight: bold; color: #10b981; }
        .info-box { background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Withdrawal Completed!</h1>
        </div>
        <div class="content">
          <div class="success-icon">🎉</div>

          <p>Hi ${userName},</p>

          <p>Great news! Your withdrawal has been processed successfully.</p>

          <div class="amount-box">
            <p style="margin: 0; color: #6b7280;">Amount Sent</p>
            <div class="amount">${formatCurrency(amount)}</div>
          </div>

          <div class="info-box">
            <div class="info-row">
              <span style="color: #6b7280;">Bank</span>
              <span style="font-weight: bold;">${bankName}</span>
            </div>
            <div class="info-row">
              <span style="color: #6b7280;">Account Number</span>
              <span style="font-weight: bold;">${accountNumber}</span>
            </div>
            ${transactionReference ? `
            <div class="info-row" style="border-bottom: none;">
              <span style="color: #6b7280;">Reference</span>
              <span style="font-weight: bold; font-family: monospace;">${transactionReference}</span>
            </div>
            ` : ''}
          </div>

          <p>The money should arrive in your bank account within a few hours, depending on your bank's processing time.</p>

          <div style="background: #dcfce7; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <strong>💡 Keep Earning:</strong> Continue referring friends to earn more! Visit your referral dashboard to share your code.
          </div>

          <p>Thank you for using LavLay!</p>

          <p>Best regards,<br>The LavLay Team</p>
        </div>
        <div class="footer">
          <p>© 2026 LavLay. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: [{ email: userEmail, name: userName }],
    subject: `✅ Withdrawal completed - ${formatCurrency(amount)} sent!`,
    htmlBody,
  });
}

/**
 * Email: Withdrawal rejected
 */
export async function sendWithdrawalRejectedEmail(
  userEmail: string,
  userName: string,
  amount: number,
  reason: string
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background: #fef2f2; border: 2px solid #ef4444; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Withdrawal Not Approved</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>

          <p>Unfortunately, we couldn't process your withdrawal request of <strong>${formatCurrency(amount)}</strong>.</p>

          <div class="reason-box">
            <strong>Reason:</strong><br>
            ${reason}
          </div>

          <p><strong>What you can do:</strong></p>
          <ul>
            <li>Double-check your bank details</li>
            <li>Ensure you have sufficient balance</li>
            <li>Submit a new withdrawal request with correct information</li>
            <li>Contact our support team if you need help</li>
          </ul>

          <div style="text-align: center;">
            <a href="https://lavlay.com/withdraw" class="button">Try Again</a>
          </div>

          <p>If you have any questions, please don't hesitate to reach out to our support team.</p>

          <p>Best regards,<br>The LavLay Team</p>
        </div>
        <div class="footer">
          <p>© 2026 LavLay. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: [{ email: userEmail, name: userName }],
    subject: `❌ Withdrawal request declined - ${formatCurrency(amount)}`,
    htmlBody,
  });
}

/**
 * Email: Welcome new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  referralCode: string
): Promise<boolean> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .referral-code { background: white; border: 2px dashed #9333ea; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
        .code { font-size: 28px; font-weight: bold; color: #9333ea; font-family: monospace; letter-spacing: 2px; }
        .button { display: inline-block; background: #9333ea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>👋 Welcome to LavLay!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>

          <p>Welcome to LavLay! We're excited to have you join our community.</p>

          <p><strong>Here's your unique referral code:</strong></p>

          <div class="referral-code">
            <div class="code">${referralCode}</div>
            <p style="margin: 10px 0 0 0; color: #6b7280;">Share this code and earn rewards!</p>
          </div>

          <p><strong>How to earn with referrals:</strong></p>
          <ul>
            <li>📲 Share your code with friends</li>
            <li>🎁 Earn 20 points when they sign up</li>
            <li>💰 Earn 50 points when they make first deposit</li>
            <li>💵 Earn 5% of their deposits (real money!)</li>
          </ul>

          <div style="text-align: center;">
            <a href="https://lavlay.com/referrals" class="button">View Dashboard</a>
            <a href="https://lavlay.com/feed" class="button" style="background: #10b981;">Get Started</a>
          </div>

          <p>Start sharing, earning, and growing your network today!</p>

          <p>Best regards,<br>The LavLay Team</p>
        </div>
        <div class="footer">
          <p>© 2026 LavLay. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: [{ email: userEmail, name: userName }],
    subject: `👋 Welcome to LavLay! Here's your referral code`,
    htmlBody,
  });
}
