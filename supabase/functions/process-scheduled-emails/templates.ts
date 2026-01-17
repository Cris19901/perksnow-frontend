// Email templates for 7-day onboarding sequence

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

const SITE_URL = 'https://lavlay.com'

export function getEmailTemplate(
  emailType: string,
  userName: string,
  pointsBalance: number
): EmailTemplate | null {
  const templates: Record<string, EmailTemplate> = {
    day_1: {
      subject: 'Make your mark on LavLay! Complete your profile 🎨',
      html: getDay1HTML(userName),
      text: getDay1Text(userName)
    },
    day_2: {
      subject: 'Share your story - Create your first post 📸',
      html: getDay2HTML(userName, pointsBalance),
      text: getDay2Text(userName, pointsBalance)
    },
    day_3: {
      subject: 'Find your community - Discover amazing creators 👥',
      html: getDay3HTML(userName),
      text: getDay3Text(userName)
    },
    day_4: {
      subject: 'Shop amazing products from our community 🛍️',
      html: getDay4HTML(userName, pointsBalance),
      text: getDay4Text(userName, pointsBalance)
    },
    day_5: {
      subject: 'Go viral with Reels! Share your video 🎥',
      html: getDay5HTML(userName),
      text: getDay5Text(userName)
    },
    day_6: {
      subject: 'Maximize your earnings - Point system guide 💰',
      html: getDay6HTML(userName, pointsBalance),
      text: getDay6Text(userName, pointsBalance)
    },
    day_7: {
      subject: 'Unlock Pro features - Take LavLay to the next level 👑',
      html: getDay7HTML(userName),
      text: getDay7Text(userName)
    }
  }

  return templates[emailType] || null
}

// Helper function to generate email layout
function getEmailLayout(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 100%;">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; line-height: 1.2;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                      © ${new Date().getFullYear()} LavLay. All rights reserved.
                    </p>
                    <p style="color: #999999; font-size: 11px; margin: 0;">
                      <a href="${SITE_URL}/settings/email-preferences" style="color: #667eea; text-decoration: none;">Manage email preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function getButton(text: string, url: string): string {
  return `
    <div style="text-align: center; margin: 40px 0;">
      <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);">
        ${text}
      </a>
    </div>
  `
}

// Day 1: Complete Profile
function getDay1HTML(userName: string): string {
  const content = `
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hey ${userName}! 👋</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      We noticed your profile is still incomplete. A complete profile helps you:
    </p>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
      <li><strong>Get 3x more followers</strong></li>
      <li>Build credibility in the community</li>
      <li>Stand out from the crowd</li>
      <li>Connect with like-minded people</li>
    </ul>
    <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Quick Steps:</h3>
    <ol style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
      <li>Add a profile picture</li>
      <li>Write a short bio</li>
      <li>Add a cover photo</li>
      <li>Link your social media</li>
    </ol>
    ${getButton('Complete My Profile', `${SITE_URL}/profile`)}
    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
      Takes less than 2 minutes! ⏱️
    </p>
  `
  return getEmailLayout('Complete Your Profile', content)
}

function getDay1Text(userName: string): string {
  return `Hey ${userName}!\n\nWe noticed your profile is still incomplete. A complete profile helps you:\n\n- Get 3x more followers\n- Build credibility in the community\n- Stand out from the crowd\n- Connect with like-minded people\n\nQuick Steps:\n1. Add a profile picture\n2. Write a short bio\n3. Add a cover photo\n4. Link your social media\n\nComplete your profile: ${SITE_URL}/profile\n\nTakes less than 2 minutes!\n\n© ${new Date().getFullYear()} LavLay`
}

// Day 2: Create First Post
function getDay2HTML(userName: string, pointsBalance: number): string {
  const content = `
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Ready to share, ${userName}? 📸</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your voice matters! Create your first post and:
    </p>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
      <li><strong>Earn 10 points</strong> instantly</li>
      <li>Get discovered by the community</li>
      <li>Build your audience</li>
      <li>Express yourself</li>
    </ul>
    <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Tips for Great Posts:</h3>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
      <li>Use high-quality images</li>
      <li>Write engaging captions</li>
      <li>Use relevant hashtags</li>
      <li>Tag other users</li>
    </ul>
    ${getButton('Create Your First Post', `${SITE_URL}/`)}
    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
      You have ${pointsBalance} points ready to use! 💎
    </p>
  `
  return getEmailLayout('Share Your Story', content)
}

function getDay2Text(userName: string, pointsBalance: number): string {
  return `Ready to share, ${userName}?\n\nYour voice matters! Create your first post and:\n\n- Earn 10 points instantly\n- Get discovered by the community\n- Build your audience\n- Express yourself\n\nTips for Great Posts:\n- Use high-quality images\n- Write engaging captions\n- Use relevant hashtags\n- Tag other users\n\nCreate your first post: ${SITE_URL}/\n\nYou have ${pointsBalance} points ready to use!\n\n© ${new Date().getFullYear()} LavLay`
}

// Day 3: Discover & Follow
function getDay3HTML(userName: string): string {
  const content = `
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Find your tribe, ${userName}! 👥</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      LavLay is better with friends! Following other creators helps you:
    </p>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
      <li>See great content in your feed</li>
      <li>Connect with like-minded people</li>
      <li>Support other creators</li>
      <li>Get inspiration</li>
    </ul>
    <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">How to Find People:</h3>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
      <li>Browse the "People" page</li>
      <li>Check trending hashtags</li>
      <li>Explore featured creators</li>
      <li>Look at who others follow</li>
    </ul>
    ${getButton('Discover People', `${SITE_URL}/people`)}
    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
      Pro tip: Follow at least 5 people to personalize your feed! 🎯
    </p>
  `
  return getEmailLayout('Find Your Community', content)
}

function getDay3Text(userName: string): string {
  return `Find your tribe, ${userName}!\n\nLavLay is better with friends! Following other creators helps you:\n\n- See great content in your feed\n- Connect with like-minded people\n- Support other creators\n- Get inspiration\n\nHow to Find People:\n- Browse the "People" page\n- Check trending hashtags\n- Explore featured creators\n- Look at who others follow\n\nDiscover people: ${SITE_URL}/people\n\nPro tip: Follow at least 5 people to personalize your feed!\n\n© ${new Date().getFullYear()} LavLay`
}

// Day 4: Try Shopping
function getDay4HTML(userName: string, pointsBalance: number): string {
  const content = `
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Shop with your points, ${userName}! 🛍️</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Discover unique products from our amazing community:
    </p>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
      <li>Fashion & accessories</li>
      <li>Art & crafts</li>
      <li>Digital products</li>
      <li>Services & more</li>
    </ul>
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px; margin: 30px 0;">
      <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; text-align: center;">
        Your Balance: ${pointsBalance} Points
      </p>
      <p style="color: #ffffff; font-size: 14px; margin: 0; text-align: center;">
        Use your points to shop or save for bigger purchases!
      </p>
    </div>
    ${getButton('Browse Marketplace', `${SITE_URL}/`)}
    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
      Support creators while finding amazing products! 🎁
    </p>
  `
  return getEmailLayout('Shop Amazing Products', content)
}

function getDay4Text(userName: string, pointsBalance: number): string {
  return `Shop with your points, ${userName}!\n\nDiscover unique products from our amazing community:\n\n- Fashion & accessories\n- Art & crafts\n- Digital products\n- Services & more\n\nYour Balance: ${pointsBalance} Points\n\nUse your points to shop or save for bigger purchases!\n\nBrowse marketplace: ${SITE_URL}/\n\nSupport creators while finding amazing products!\n\n© ${new Date().getFullYear()} LavLay`
}

// Day 5: Upload First Reel
function getDay5HTML(userName: string): string {
  const content = `
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Go viral with Reels, ${userName}! 🎥</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Reels are the fastest way to grow on LavLay:
    </p>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
      <li><strong>5x more views</strong> than regular posts</li>
      <li>Reach a wider audience</li>
      <li>Show your personality</li>
      <li>Earn more engagement</li>
    </ul>
    <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 18px;">Tips for Great Reels:</h3>
    <ul style="color: #666666; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
      <li>Keep it under 60 seconds</li>
      <li>Use trending sounds (coming soon!)</li>
      <li>Add engaging captions</li>
      <li>Be authentic and creative</li>
    </ul>
    ${getButton('Upload Your First Reel', `${SITE_URL}/`)}
    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
      Your next viral moment starts here! 🌟
    </p>
  `
  return getEmailLayout('Go Viral with Reels', content)
}

function getDay5Text(userName: string): string {
  return `Go viral with Reels, ${userName}!\n\nReels are the fastest way to grow on LavLay:\n\n- 5x more views than regular posts\n- Reach a wider audience\n- Show your personality\n- Earn more engagement\n\nTips for Great Reels:\n- Keep it under 60 seconds\n- Use trending sounds (coming soon!)\n- Add engaging captions\n- Be authentic and creative\n\nUpload your first reel: ${SITE_URL}/\n\nYour next viral moment starts here!\n\n© ${new Date().getFullYear()} LavLay`
}

// Day 6: Earn Points Guide
function getDay6HTML(userName: string, pointsBalance: number): string {
  const content = `
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Maximize your earnings, ${userName}! 💰</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Here's how to earn more points on LavLay:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #f9f9f9; border-radius: 8px; padding: 15px; border-left: 4px solid #667eea;">
          <strong style="color: #333333; font-size: 16px;">📝 Create Posts</strong>
          <p style="color: #666666; margin: 5px 0 0 0; font-size: 14px;">10 points per post</p>
        </td>
      </tr>
      <tr><td style="height: 10px;"></td></tr>
      <tr>
        <td style="background-color: #f9f9f9; border-radius: 8px; padding: 15px; border-left: 4px solid #667eea;">
          <strong style="color: #333333; font-size: 16px;">💬 Get Engagement</strong>
          <p style="color: #666666; margin: 5px 0 0 0; font-size: 14px;">Likes, comments, shares earn points</p>
        </td>
      </tr>
      <tr><td style="height: 10px;"></td></tr>
      <tr>
        <td style="background-color: #f9f9f9; border-radius: 8px; padding: 15px; border-left: 4px solid #667eea;">
          <strong style="color: #333333; font-size: 16px;">👥 Refer Friends</strong>
          <p style="color: #666666; margin: 5px 0 0 0; font-size: 14px;">50 points per referral</p>
        </td>
      </tr>
      <tr><td style="height: 10px;"></td></tr>
      <tr>
        <td style="background-color: #f9f9f9; border-radius: 8px; padding: 15px; border-left: 4px solid #667eea;">
          <strong style="color: #333333; font-size: 16px;">✅ Daily Challenges</strong>
          <p style="color: #666666; margin: 5px 0 0 0; font-size: 14px;">Bonus points (coming soon!)</p>
        </td>
      </tr>
    </table>
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 8px; margin: 30px 0;">
      <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0 0 10px 0; text-align: center;">
        Your Current Balance
      </p>
      <p style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; text-align: center;">
        ${pointsBalance} Points
      </p>
    </div>
    ${getButton('Check Your Dashboard', `${SITE_URL}/profile`)}
    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
      💡 Pro tip: Upgrade to Pro to withdraw your earnings!
    </p>
  `
  return getEmailLayout('Point System Guide', content)
}

function getDay6Text(userName: string, pointsBalance: number): string {
  return `Maximize your earnings, ${userName}!\n\nHere's how to earn more points on LavLay:\n\n📝 Create Posts - 10 points per post\n💬 Get Engagement - Likes, comments, shares earn points\n👥 Refer Friends - 50 points per referral\n✅ Daily Challenges - Bonus points (coming soon!)\n\nYour Current Balance: ${pointsBalance} Points\n\nCheck your dashboard: ${SITE_URL}/profile\n\n💡 Pro tip: Upgrade to Pro to withdraw your earnings!\n\n© ${new Date().getFullYear()} LavLay`
}

// Day 7: Upgrade to Pro
function getDay7HTML(userName: string): string {
  const content = `
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Ready for Pro, ${userName}? 👑</h2>
    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Take your LavLay experience to the next level with Pro:
    </p>
    <table width="100%" cellpadding="12" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 8px; padding: 20px;">
          <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">✨ Pro Benefits</h3>
          <ul style="color: #333333; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Withdraw your earnings</strong> 💸</li>
            <li>Get verified badge 🔵</li>
            <li>Unlimited posts & reels</li>
            <li>Priority support</li>
            <li>Ad-free experience</li>
            <li>Advanced analytics 📊</li>
          </ul>
        </td>
      </tr>
    </table>
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <p style="color: #333333; font-size: 20px; font-weight: 600; margin: 0 0 10px 0;">
        Pricing
      </p>
      <p style="color: #666666; font-size: 32px; font-weight: 700; margin: 0;">
        ₦2,000<span style="font-size: 16px; font-weight: 400;">/month</span>
      </p>
      <p style="color: #999999; font-size: 14px; margin: 10px 0 0 0;">
        Or ₦20,000/year (Save 16%)
      </p>
    </div>
    ${getButton('Upgrade to Pro', `${SITE_URL}/subscribe`)}
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; margin: 30px 0;">
      <p style="color: #ffffff; font-size: 14px; margin: 0; text-align: center;">
        🎁 <strong>Special Offer:</strong> Get 20% off your first month with code <strong>NEWPRO</strong>
      </p>
    </div>
    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
      30-day money-back guarantee • Cancel anytime 🔒
    </p>
  `
  return getEmailLayout('Unlock Pro Features', content)
}

function getDay7Text(userName: string): string {
  return `Ready for Pro, ${userName}?\n\nTake your LavLay experience to the next level with Pro:\n\n✨ Pro Benefits:\n- Withdraw your earnings 💸\n- Get verified badge 🔵\n- Unlimited posts & reels\n- Priority support\n- Ad-free experience\n- Advanced analytics 📊\n\nPricing:\n₦2,000/month\nOr ₦20,000/year (Save 16%)\n\n🎁 Special Offer: Get 20% off your first month with code NEWPRO\n\nUpgrade to Pro: ${SITE_URL}/subscribe\n\n30-day money-back guarantee • Cancel anytime\n\n© ${new Date().getFullYear()} LavLay`
}
