// Email Service for LavLay
// Handles all email sending through multi-provider Supabase Edge Function
// Supports: Brevo, SendGrid, Elastic Email, Resend with automatic failover

import { supabase } from './supabase'
import { logger } from './logger'

// Email provider options
export type EmailProvider = 'brevo' | 'sendgrid' | 'elastic' | 'resend' | 'auto'

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  provider?: EmailProvider // Optional: specify provider or use 'auto' for failover
}

interface EmailResult {
  success: boolean
  provider?: string
  id?: string
  error?: unknown
  data?: unknown
}

/**
 * Send an email using the multi-provider Supabase Edge Function
 *
 * By default, uses automatic failover between providers in this order:
 * 1. Brevo (300 emails/day free)
 * 2. SendGrid (100 emails/day free)
 * 3. Elastic Email (100 emails/day free)
 * 4. Resend (100 emails/day free)
 *
 * You can also specify a specific provider if needed.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email-multi', {
      body: {
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        from: options.from || 'LavLay <noreply@lavlay.com>',
        replyTo: options.replyTo,
        provider: options.provider || 'auto' // Default to automatic failover
      }
    })

    if (error) {
      logger.error('Email send error', error)
      return { success: false, error }
    }

    if (data?.success) {
      logger.log('Email sent successfully via', data.provider)
    }

    return { success: data?.success ?? false, ...data }
  } catch (err) {
    logger.error('Email send exception', err)
    return { success: false, error: err }
  }
}

/**
 * Send email with specific provider (no failover)
 */
export async function sendEmailWithProvider(
  options: Omit<EmailOptions, 'provider'>,
  provider: EmailProvider
): Promise<EmailResult> {
  return sendEmail({ ...options, provider })
}

/**
 * Email Templates
 */
export const emailTemplates = {
  /**
   * Welcome Email - Sent after user completes signup
   */
  welcome: (userName: string, profileUrl: string = 'https://lavlay.com/profile') => ({
    subject: 'Welcome to LavLay! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 700;">Welcome to LavLay! 🎉</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hi ${userName}! 👋</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        We're thrilled to have you join the LavLay community! You're now part of a vibrant social commerce platform where creativity meets commerce.
                      </p>
                      <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Get Started:</h3>
                      <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                        <li>Complete your profile to stand out</li>
                        <li>Follow other creators and businesses</li>
                        <li>Share your first post or reel</li>
                        <li>List your products in the marketplace</li>
                        <li>Engage with the community</li>
                      </ul>
                      <div style="text-align: center; margin: 40px 0;">
                        <a href="${profileUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
                          Complete Your Profile
                        </a>
                      </div>
                      <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                        Need help? Reply to this email anytime.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} LavLay. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Welcome to LavLay, ${userName}!\n\nWe're thrilled to have you join our community. Get started by completing your profile and sharing your first post.\n\nVisit: ${profileUrl}\n\n© ${new Date().getFullYear()} LavLay`
  }),

  /**
   * New Follower Notification
   */
  newFollower: (userName: string, followerName: string, followerUsername: string, followerProfileUrl: string) => ({
    subject: `${followerName} started following you on LavLay`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 10px 0; font-size: 24px;">New Follower! 🎉</h2>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 30px 0;">
                        Hi ${userName}, <strong>${followerName}</strong> (@${followerUsername}) just started following you on LavLay!
                      </p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${followerProfileUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 25px; font-weight: 600; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
                          View Their Profile
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `New Follower!\n\nHi ${userName},\n\n${followerName} (@${followerUsername}) just started following you on LavLay!\n\nView their profile: ${followerProfileUrl}`
  }),

  /**
   * New Comment Notification
   */
  newComment: (userName: string, commenterName: string, commentText: string, contentUrl: string, contentType: 'post' | 'reel' = 'post') => ({
    subject: `${commenterName} commented on your ${contentType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 10px 0; font-size: 24px;">New Comment 💬</h2>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 20px 0;">
                        Hi ${userName}, <strong>${commenterName}</strong> commented on your ${contentType}:
                      </p>
                      <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 20px 0;">
                        <p style="color: #333333; font-size: 15px; margin: 0; font-style: italic;">
                          "${commentText.substring(0, 200)}${commentText.length > 200 ? '...' : ''}"
                        </p>
                      </div>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${contentUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 25px; font-weight: 600; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
                          Reply to Comment
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `New Comment\n\nHi ${userName},\n\n${commenterName} commented on your ${contentType}:\n\n"${commentText}"\n\nReply: ${contentUrl}`
  }),

  /**
   * Product Purchase Confirmation
   */
  productPurchase: (buyerName: string, productName: string, price: number, orderUrl: string) => ({
    subject: `Order Confirmation - ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Order Confirmed! ✓</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #666666; font-size: 16px; margin: 0 0 20px 0;">
                        Hi ${buyerName},
                      </p>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 30px 0;">
                        Thank you for your purchase! Your order has been confirmed.
                      </p>
                      <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 18px;">Order Details</h3>
                        <div style="border-bottom: 1px solid #e5e5e5; padding: 12px 0;">
                          <span style="color: #666666; font-size: 14px;">Product:</span>
                          <span style="color: #333333; font-weight: 600; float: right;">${productName}</span>
                        </div>
                        <div style="padding: 20px 0; border-top: 2px solid #667eea; margin-top: 12px;">
                          <span style="color: #333333; font-weight: 700; font-size: 18px;">Total:</span>
                          <span style="color: #667eea; font-weight: 700; font-size: 22px; float: right;">$${price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${orderUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 30px; font-weight: 600; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
                          View Order Details
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Order Confirmed!\n\nHi ${buyerName},\n\nThank you for your purchase!\n\nProduct: ${productName}\nTotal: $${price.toFixed(2)}\n\nView order: ${orderUrl}`
  }),

  /**
   * Withdrawal Approved Email
   */
  withdrawalApproved: (userName: string, amount: number, currency: string, withdrawalMethod: string, accountDetails: string) => ({
    subject: `Withdrawal Approved - ${currency} ${amount.toFixed(2)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 50px 40px; text-align: center;">
                      <div style="font-size: 64px; margin-bottom: 10px;">✅</div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Withdrawal Approved!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hi ${userName}! 👋</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Great news! Your withdrawal request has been approved and is being processed.
                      </p>

                      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; margin: 30px 0;">
                        <h3 style="color: #333333; margin: 0 0 20px 0; font-size: 18px;">Withdrawal Details</h3>

                        <div style="border-bottom: 1px solid #e5e5e5; padding: 15px 0;">
                          <span style="color: #666666; font-size: 14px;">Amount:</span>
                          <span style="color: #10b981; font-weight: 700; font-size: 24px; float: right;">${currency} ${amount.toFixed(2)}</span>
                        </div>

                        <div style="border-bottom: 1px solid #e5e5e5; padding: 15px 0;">
                          <span style="color: #666666; font-size: 14px;">Method:</span>
                          <span style="color: #333333; font-weight: 600; float: right;">${withdrawalMethod}</span>
                        </div>

                        <div style="padding: 15px 0;">
                          <span style="color: #666666; font-size: 14px;">Account:</span>
                          <span style="color: #333333; font-weight: 600; float: right;">${accountDetails}</span>
                        </div>
                      </div>

                      <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 20px; border-radius: 8px; margin: 30px 0;">
                        <p style="color: #075985; font-size: 14px; margin: 0; line-height: 1.6;">
                          <strong>ℹ️ What happens next?</strong><br/>
                          Your withdrawal is being processed and funds will be transferred to your account within 1-3 business days. You'll receive another notification once the transfer is complete.
                        </p>
                      </div>

                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                        If you have any questions or concerns, please don't hesitate to contact our support team.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} LavLay. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Withdrawal Approved!\n\nHi ${userName},\n\nGreat news! Your withdrawal request has been approved.\n\nWithdrawal Details:\n- Amount: ${currency} ${amount.toFixed(2)}\n- Method: ${withdrawalMethod}\n- Account: ${accountDetails}\n\nWhat happens next?\nYour withdrawal is being processed and funds will be transferred to your account within 1-3 business days.\n\n© ${new Date().getFullYear()} LavLay`
  }),

  /**
   * Withdrawal Rejected Email
   */
  withdrawalRejected: (userName: string, amount: number, currency: string, reason: string) => ({
    subject: `Withdrawal Request Update - ${currency} ${amount.toFixed(2)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Withdrawal Request Update</h2>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 20px 0;">
                        Hi ${userName},
                      </p>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 30px 0;">
                        We regret to inform you that your withdrawal request for <strong>${currency} ${amount.toFixed(2)}</strong> could not be processed at this time.
                      </p>

                      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #991b1b; font-size: 14px; margin: 0 0 10px 0;">
                          <strong>Reason:</strong>
                        </p>
                        <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.6;">
                          ${reason}
                        </p>
                      </div>

                      <p style="color: #666666; font-size: 14px; margin: 30px 0;">
                        If you believe this is an error or have questions, please contact our support team for assistance.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Withdrawal Request Update\n\nHi ${userName},\n\nYour withdrawal request for ${currency} ${amount.toFixed(2)} could not be processed.\n\nReason: ${reason}\n\nPlease contact support if you have any questions.`
  }),

  /**
   * Signup Bonus Email - Sent when user receives signup bonus
   */
  /**
   * OTP Verification Code
   */
  otpCode: (code: string, purpose: 'withdrawal' | 'login_2fa') => ({
    subject: purpose === 'withdrawal'
      ? `Your LavLay Withdrawal Verification Code: ${code}`
      : `Your LavLay Login Verification Code: ${code}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 10px;">${purpose === 'withdrawal' ? '&#128274;' : '&#128272;'}</div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                        ${purpose === 'withdrawal' ? 'Withdrawal Verification' : 'Login Verification'}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        ${purpose === 'withdrawal'
                          ? 'You requested a withdrawal from your LavLay account. Use the code below to verify your identity.'
                          : 'Someone is trying to log into your LavLay account. Use the code below to complete verification.'}
                      </p>
                      <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%); border: 2px solid #667eea; border-radius: 16px; padding: 30px; margin: 20px 0;">
                        <p style="color: #667eea; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0;">Verification Code</p>
                        <p style="color: #333333; font-size: 42px; font-weight: 700; letter-spacing: 8px; margin: 0;">${code}</p>
                      </div>
                      <p style="color: #999999; font-size: 14px; margin: 20px 0 0 0;">
                        This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.
                      </p>
                      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 30px 0; text-align: left;">
                        <p style="color: #991b1b; font-size: 13px; margin: 0;">
                          <strong>Security Notice:</strong> If you did not request this code, please ignore this email and secure your account by changing your password.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 25px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        &copy; ${new Date().getFullYear()} LavLay. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Your LavLay verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share this code with anyone.\n\nIf you did not request this code, please ignore this email.\n\n© ${new Date().getFullYear()} LavLay`
  }),

  signupBonus: (userName: string, bonusAmount: number) => ({
    subject: `Welcome to LavLay! ${bonusAmount} Points Awarded 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
                      <div style="font-size: 64px; margin-bottom: 10px;">🎉</div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Welcome to LavLay, ${userName}!</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your account has been created successfully</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 50px 40px; text-align: center;">
                      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 20px; padding: 30px; margin: 0 0 30px 0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                        <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">✅ Points Awarded</p>
                        <p style="color: #ffffff; margin: 0; font-size: 48px; font-weight: 700;">${bonusAmount}</p>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Points Added to Your Account</p>
                      </div>

                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Start Exploring LavLay</h2>

                      <p style="color: #666666; font-size: 16px; margin: 0 0 30px 0; line-height: 1.6;">
                        Welcome to the community! Your ${bonusAmount} points have been added to your account. Here's how to grow and withdraw your earnings:
                      </p>

                      <div style="text-align: left; margin: 30px 0;">
                        <div style="display: flex; align-items: start; margin-bottom: 20px;">
                          <div style="flex-shrink: 0; width: 40px; height: 40px; background: #667eea20; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <span style="font-size: 20px;">📝</span>
                          </div>
                          <div>
                            <p style="margin: 0; color: #333333; font-weight: 600; font-size: 16px;">Earn More Points</p>
                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Post content, watch reels, comment, and engage with the community to earn points daily</p>
                          </div>
                        </div>

                        <div style="display: flex; align-items: start; margin-bottom: 20px;">
                          <div style="flex-shrink: 0; width: 40px; height: 40px; background: #667eea20; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <span style="font-size: 20px;">💰</span>
                          </div>
                          <div>
                            <p style="margin: 0; color: #333333; font-weight: 600; font-size: 16px;">Withdraw to Your Bank</p>
                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Your points become withdrawable after reaching the minimum withdrawal threshold of 1,000 points</p>
                          </div>
                        </div>

                        <div style="display: flex; align-items: start;">
                          <div style="flex-shrink: 0; width: 40px; height: 40px; background: #667eea20; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <span style="font-size: 20px;">👑</span>
                          </div>
                          <div>
                            <p style="margin: 0; color: #333333; font-weight: 600; font-size: 16px;">Subscribe to Unlock Withdrawals</p>
                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Subscribe to any paid plan (starting at &#8358;200) to unlock withdrawal access</p>
                          </div>
                        </div>
                      </div>

                      <div style="text-align: center; margin: 40px 0 20px 0;">
                        <a href="https://lavlay.com/feed" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
                          Start Exploring
                        </a>
                      </div>

                      <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 20px; margin: 30px 0;">
                        <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.6;">
                          <strong>💡 Pro Tip:</strong> Earn more points by posting content, engaging with others, and growing your community!
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} LavLay. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `Welcome to LavLay, ${userName}! 🎉\n\nYour account has been created successfully and ${bonusAmount} points have been awarded to your account.\n\nHow to grow and withdraw your earnings:\n• Post content, watch reels, comment, and engage to earn points daily\n• Your points become withdrawable after reaching the minimum threshold of 1,000 points\n• Subscribe to any paid plan (starting at ₦200) to unlock withdrawal access\n\nStart exploring LavLay and earn more points by being active in the community!\n\n© ${new Date().getFullYear()} LavLay`
  })
}

/**
 * Helper function to send a welcome email
 */
export async function sendWelcomeEmail(userEmail: string, userName: string) {
  const template = emailTemplates.welcome(userName)
  return sendEmail({
    to: userEmail,
    ...template
  })
}

/**
 * Helper function to send a new follower notification
 */
export async function sendFollowerNotification(
  userEmail: string,
  userName: string,
  followerName: string,
  followerUsername: string
) {
  const followerProfileUrl = `${window.location.origin}/profile/${followerUsername}`
  const template = emailTemplates.newFollower(userName, followerName, followerUsername, followerProfileUrl)
  return sendEmail({
    to: userEmail,
    ...template
  })
}

/**
 * Helper function to send a new comment notification
 */
export async function sendCommentNotification(
  userEmail: string,
  userName: string,
  commenterName: string,
  commentText: string,
  contentId: string,
  contentType: 'post' | 'reel' = 'post'
) {
  const contentUrl = `${window.location.origin}/${contentType === 'reel' ? 'reels' : 'feed'}?id=${contentId}`
  const template = emailTemplates.newComment(userName, commenterName, commentText, contentUrl, contentType)
  return sendEmail({
    to: userEmail,
    ...template
  })
}

/**
 * Helper function to send a product purchase confirmation
 */
export async function sendPurchaseConfirmation(
  buyerEmail: string,
  buyerName: string,
  productName: string,
  price: number,
  orderId: string
) {
  const orderUrl = `${window.location.origin}/orders/${orderId}`
  const template = emailTemplates.productPurchase(buyerName, productName, price, orderUrl)
  return sendEmail({
    to: buyerEmail,
    ...template
  })
}

/**
 * Helper function to send signup bonus notification
 */
export async function sendSignupBonusEmail(
  userEmail: string,
  userName: string,
  bonusAmount: number
) {
  const template = emailTemplates.signupBonus(userName, bonusAmount)
  return sendEmail({
    to: userEmail,
    ...template
  })
}

/**
 * Helper function to send withdrawal approved notification
 */
export async function sendWithdrawalApprovedEmail(
  userEmail: string,
  userName: string,
  amount: number,
  currency: string,
  withdrawalMethod: string,
  accountDetails: string
) {
  const template = emailTemplates.withdrawalApproved(userName, amount, currency, withdrawalMethod, accountDetails)
  return sendEmail({
    to: userEmail,
    ...template
  })
}

/**
 * Helper function to send withdrawal rejected notification
 */
export async function sendWithdrawalRejectedEmail(
  userEmail: string,
  userName: string,
  amount: number,
  currency: string,
  reason: string
) {
  const template = emailTemplates.withdrawalRejected(userName, amount, currency, reason)
  return sendEmail({
    to: userEmail,
    ...template
  })
}
