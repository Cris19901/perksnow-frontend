// Email Templates for LavLay Platform
// These templates can be used with the send-email Edge Function

export const emailTemplates = {
  // 1. Welcome Email - Sent after user completes signup
  welcome: (userName: string, userEmail: string) => ({
    subject: 'Welcome to LavLay! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to LavLay</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px;">Welcome to LavLay!</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0;">Hi ${userName}! 👋</h2>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        We're thrilled to have you join the LavLay community! You're now part of a vibrant social commerce platform where creativity meets commerce.
                      </p>

                      <h3 style="color: #333333; margin: 30px 0 15px 0;">Get Started:</h3>
                      <ul style="color: #666666; font-size: 16px; line-height: 1.8;">
                        <li>Complete your profile to stand out</li>
                        <li>Follow other creators and businesses</li>
                        <li>Share your first post or reel</li>
                        <li>List your products in the marketplace</li>
                        <li>Engage with the community</li>
                      </ul>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://lavlay.com/profile" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 25px; font-weight: bold; font-size: 16px;">
                          Complete Your Profile
                        </a>
                      </div>

                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                        Need help? Reply to this email or visit our <a href="https://lavlay.com/help" style="color: #667eea;">Help Center</a>.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                        You're receiving this email because you signed up for LavLay.
                      </p>
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
    text: `Welcome to LavLay, ${userName}!\n\nWe're thrilled to have you join our community. Get started by completing your profile and sharing your first post.\n\nVisit: https://lavlay.com/profile\n\nNeed help? Reply to this email.\n\n© ${new Date().getFullYear()} LavLay`
  }),

  // 2. New Follower Notification
  newFollower: (userName: string, followerName: string, followerUsername: string, followerAvatar: string) => ({
    subject: `${followerName} started following you on LavLay`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0;">New Follower! 🎉</h2>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 20px 0;">
                        Hi ${userName},
                      </p>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 30px 0;">
                        <strong>${followerName}</strong> (@${followerUsername}) just started following you on LavLay!
                      </p>

                      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <img src="${followerAvatar}" alt="${followerName}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px;">
                        <p style="color: #333333; font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">${followerName}</p>
                        <p style="color: #999999; font-size: 14px; margin: 0 0 15px 0;">@${followerUsername}</p>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://lavlay.com/profile/${followerUsername}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold;">
                          View Profile
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
    text: `New Follower!\n\nHi ${userName},\n\n${followerName} (@${followerUsername}) just started following you on LavLay!\n\nView their profile: https://lavlay.com/profile/${followerUsername}`
  }),

  // 3. New Comment Notification
  newComment: (userName: string, commenterName: string, commentText: string, postId: string, postType: 'post' | 'reel') => ({
    subject: `${commenterName} commented on your ${postType}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0;">New Comment 💬</h2>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 20px 0;">
                        Hi ${userName},
                      </p>
                      <p style="color: #666666; font-size: 16px; margin: 0 0 20px 0;">
                        <strong>${commenterName}</strong> commented on your ${postType}:
                      </p>

                      <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 20px 0;">
                        <p style="color: #333333; font-size: 15px; margin: 0; font-style: italic;">
                          "${commentText}"
                        </p>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://lavlay.com/${postType}/${postId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold;">
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
    text: `New Comment\n\nHi ${userName},\n\n${commenterName} commented on your ${postType}:\n\n"${commentText}"\n\nReply: https://lavlay.com/${postType}/${postId}`
  }),

  // 4. New Like Notification (Batch)
  newLikes: (userName: string, likeCount: number, contentType: 'post' | 'reel', contentId: string) => ({
    subject: `Your ${contentType} has ${likeCount} new likes!`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <div style="font-size: 48px; margin-bottom: 20px;">❤️</div>
                      <h2 style="color: #333333; margin: 0 0 10px 0;">Your ${contentType} is getting love!</h2>
                      <p style="color: #666666; font-size: 18px; margin: 0 0 30px 0;">
                        <strong style="color: #e74c3c; font-size: 24px;">${likeCount}</strong> people liked your ${contentType}
                      </p>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://lavlay.com/${contentType}/${contentId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold;">
                          View ${contentType}
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
    text: `Your ${contentType} is getting love!\n\n${likeCount} people liked your ${contentType}.\n\nView it: https://lavlay.com/${contentType}/${contentId}`
  }),

  // 5. Product Purchase Confirmation
  productPurchase: (buyerName: string, sellerName: string, productName: string, price: number, orderId: string) => ({
    subject: `Order Confirmation - ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0;">Order Confirmed! ✓</h1>
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

                      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333333; margin: 0 0 15px 0;">Order Details</h3>
                        <table width="100%" style="border-collapse: collapse;">
                          <tr>
                            <td style="padding: 10px 0; color: #666666;">Product:</td>
                            <td style="padding: 10px 0; color: #333333; font-weight: bold; text-align: right;">${productName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0; color: #666666;">Seller:</td>
                            <td style="padding: 10px 0; color: #333333; text-align: right;">${sellerName}</td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0; color: #666666;">Order ID:</td>
                            <td style="padding: 10px 0; color: #333333; text-align: right; font-family: monospace;">${orderId}</td>
                          </tr>
                          <tr style="border-top: 2px solid #dddddd;">
                            <td style="padding: 15px 0; color: #333333; font-weight: bold; font-size: 18px;">Total:</td>
                            <td style="padding: 15px 0; color: #667eea; font-weight: bold; font-size: 18px; text-align: right;">$${price.toFixed(2)}</td>
                          </tr>
                        </table>
                      </div>

                      <p style="color: #666666; font-size: 14px; margin: 30px 0 0 0;">
                        The seller will contact you soon regarding delivery details.
                      </p>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://lavlay.com/orders/${orderId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold;">
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
    text: `Order Confirmed!\n\nHi ${buyerName},\n\nThank you for your purchase!\n\nProduct: ${productName}\nSeller: ${sellerName}\nOrder ID: ${orderId}\nTotal: $${price.toFixed(2)}\n\nView order: https://lavlay.com/orders/${orderId}`
  })
}

// Helper function to send email using Supabase Edge Function
export async function sendEmail(supabase: any, template: ReturnType<typeof emailTemplates[keyof typeof emailTemplates]>, to: string) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: 'LavLay <noreply@lavlay.com>' // Change after domain verification
      }
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send exception:', err)
    return { success: false, error: err }
  }
}

// Example usage in your React components:
/*
import { supabase } from '@/lib/supabase'
import { emailTemplates, sendEmail } from '@/lib/emailTemplates'

// Send welcome email
const welcomeTemplate = emailTemplates.welcome('John Doe', 'john@example.com')
await sendEmail(supabase, welcomeTemplate, 'john@example.com')

// Send follower notification
const followerTemplate = emailTemplates.newFollower(
  'Jane Smith',
  'John Doe',
  'johndoe',
  'https://example.com/avatar.jpg'
)
await sendEmail(supabase, followerTemplate, 'jane@example.com')
*/
