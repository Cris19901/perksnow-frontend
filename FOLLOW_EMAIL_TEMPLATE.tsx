/**
 * FOLLOW NOTIFICATION EMAIL TEMPLATE
 *
 * This template is used when someone follows a user
 * Add this to your Resend email sending function
 */

interface FollowNotificationEmailProps {
  follower_name: string;
  follower_username: string;
  follower_avatar: string;
  followed_name: string;
  profile_url: string;
}

export const FollowNotificationEmail = ({
  follower_name,
  follower_username,
  follower_avatar,
  followed_name,
  profile_url,
}: FollowNotificationEmailProps) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Follower on LavLay</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎉 New Follower!
              </h1>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 30px; color: #1f2937; font-size: 16px; line-height: 24px;">
                Hi <strong>${followed_name}</strong>,
              </p>

              <!-- Follower info card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td width="80" style="padding-right: 20px; vertical-align: top;">
                    <img src="${follower_avatar}" alt="${follower_name}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #9333ea; display: block;">
                  </td>
                  <td style="vertical-align: middle;">
                    <h2 style="margin: 0 0 8px; color: #1f2937; font-size: 20px; font-weight: 600;">
                      ${follower_name}
                    </h2>
                    <p style="margin: 0; color: #6b7280; font-size: 15px;">
                      @${follower_username}
                    </p>
                    <p style="margin: 12px 0 0; color: #374151; font-size: 15px; line-height: 22px;">
                      started following you on <strong style="background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">LavLay</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Call to action -->
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 22px; text-align: center;">
                Check out their profile and connect!
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${profile_url}" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);">
                      View ${follower_name}'s Profile
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Tip section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px; background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 20px;">
                      <strong>💡 Tip:</strong> Follow them back to start building your community and earn more engagement points!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px; line-height: 18px; text-align: center;">
                You're receiving this because someone followed you on LavLay.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 16px; text-align: center;">
                <a href="https://www.lavlay.com/settings/notifications" style="color: #9333ea; text-decoration: none;">Manage email preferences</a> •
                <a href="https://www.lavlay.com" style="color: #9333ea; text-decoration: none;">Visit LavLay</a>
              </p>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © 2025 LavLay. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// Plain text version (for email clients that don't support HTML)
export const FollowNotificationEmailText = ({
  follower_name,
  follower_username,
  followed_name,
  profile_url,
}: FollowNotificationEmailProps) => {
  return `
Hi ${followed_name},

${follower_name} (@${follower_username}) started following you on LavLay!

Check out their profile: ${profile_url}

Tip: Follow them back to start building your community and earn more engagement points!

---
You're receiving this because someone followed you on LavLay.
Manage email preferences: https://www.lavlay.com/settings/notifications

© 2025 LavLay. All rights reserved.
  `.trim();
};
