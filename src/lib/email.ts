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
   * Signup Bonus Email - Sent when user receives signup bonus
   */
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
                        Welcome to the community! Your ${bonusAmount} points have been added to your account. Here's what you can do with them:
                      </p>

                      <div style="text-align: left; margin: 30px 0;">
                        <div style="display: flex; align-items: start; margin-bottom: 20px;">
                          <div style="flex-shrink: 0; width: 40px; height: 40px; background: #667eea20; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <span style="font-size: 20px;">🛍️</span>
                          </div>
                          <div>
                            <p style="margin: 0; color: #333333; font-weight: 600; font-size: 16px;">Shop Products</p>
                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Use points to purchase products from our marketplace</p>
                          </div>
                        </div>

                        <div style="display: flex; align-items: start; margin-bottom: 20px;">
                          <div style="flex-shrink: 0; width: 40px; height: 40px; background: #667eea20; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <span style="font-size: 20px;">⬆️</span>
                          </div>
                          <div>
                            <p style="margin: 0; color: #333333; font-weight: 600; font-size: 16px;">Boost Your Content</p>
                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Promote your posts and reels to reach more people</p>
                          </div>
                        </div>

                        <div style="display: flex; align-items: start;">
                          <div style="flex-shrink: 0; width: 40px; height: 40px; background: #667eea20; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <span style="font-size: 20px;">🎁</span>
                          </div>
                          <div>
                            <p style="margin: 0; color: #333333; font-weight: 600; font-size: 16px;">Unlock Premium Features</p>
                            <p style="margin: 5px 0 0 0; color: #666666; font-size: 14px;">Access exclusive features and benefits</p>
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
    text: `Welcome to LavLay, ${userName}! 🎉\n\nYour account has been created successfully and ${bonusAmount} points have been awarded to your account.\n\nWhat you can do with points:\n• Shop for products from our marketplace\n• Boost your content to reach more people\n• Unlock premium features\n\nStart exploring LavLay and earn more points by being active in the community!\n\n© ${new Date().getFullYear()} LavLay`
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
