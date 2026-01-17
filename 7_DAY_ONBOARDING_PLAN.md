# 7-Day Onboarding Email Sequence

## Overview
This document outlines the 7-day automated email sequence to onboard new users to LavLay, keeping them engaged and helping them discover key features.

---

## Email Sequence Design

### Day 0: Welcome Email (Immediate)
**Trigger**: User signs up
**Goal**: Welcome user and confirm signup bonus
**Status**: ✅ Already implemented (sendSignupBonusEmail)

**Content**:
- Welcome message
- Confirm 100 points awarded
- Explain what you can do with points
- CTA: "Start Exploring"

---

### Day 1: Complete Your Profile (24 hours after signup)
**Goal**: Get user to complete their profile

**Subject**: Make your mark on LavLay! Complete your profile 🎨

**Content**:
- Personal greeting
- Benefits of complete profile:
  - Get more followers
  - Build credibility
  - Stand out in community
- Steps to complete:
  1. Add profile picture
  2. Write bio
  3. Add cover photo
  4. Link social media
- CTA: "Complete Your Profile"
- Stats: "Users with complete profiles get 3x more followers"

---

### Day 2: Create Your First Post (48 hours after signup)
**Goal**: Get user to create content

**Subject**: Share your story - Create your first post 📸

**Content**:
- Encourage content creation
- Benefits:
  - Earn 10 points per post
  - Get discovered by community
  - Build your audience
- Tips for great posts:
  - Use high-quality images
  - Write engaging captions
  - Use relevant hashtags
  - Tag other users
- CTA: "Create Your First Post"
- Reminder: "You have 100 points waiting to be used!"

---

### Day 3: Discover & Follow (72 hours after signup)
**Goal**: Get user to follow other users

**Subject**: Find your community - Discover amazing creators 👥

**Content**:
- Importance of following others:
  - See great content in feed
  - Connect with like-minded people
  - Support other creators
- How to find people:
  - Browse "People" page
  - Check trending hashtags
  - Explore featured creators
- CTA: "Discover People"
- Tip: "Follow at least 5 people to personalize your feed"

---

### Day 4: Try Shopping (96 hours after signup)
**Goal**: Introduce marketplace feature

**Subject**: Shop amazing products from our community 🛍️

**Content**:
- Introduce marketplace
- Benefits:
  - Unique products from creators
  - Support community members
  - Use your points
- Categories to explore:
  - Fashion & accessories
  - Art & crafts
  - Digital products
  - Services
- CTA: "Browse Marketplace"
- Special: "Get 10% off your first purchase with code WELCOME10"

---

### Day 5: Upload Your First Reel (120 hours after signup)
**Goal**: Get user to try reels feature

**Subject**: Go viral with Reels! Share your video 🎥

**Content**:
- Introduce Reels feature
- Benefits:
  - Reach wider audience
  - Show personality
  - Earn more engagement
- Tips for great reels:
  - Keep it under 60 seconds
  - Use trending music
  - Add captions
  - Be authentic
- CTA: "Upload Your First Reel"
- Stats: "Reels get 5x more views than posts"

---

### Day 6: Earn Points - Engagement Tips (144 hours after signup)
**Goal**: Teach how to earn and use points

**Subject**: Maximize your earnings - Point system guide 💰

**Content**:
- How to earn points:
  - Create posts (10 points)
  - Get likes and comments (varies)
  - Complete daily challenges (bonus)
  - Refer friends (50 points each)
- How to use points:
  - Shop products
  - Boost posts
  - Unlock features
  - Convert to cash (Pro users)
- Your current balance
- CTA: "Check Your Points Dashboard"
- Tip: "Pro users can withdraw earnings!"

---

### Day 7: Upgrade to Pro (168 hours after signup)
**Goal**: Introduce Pro subscription

**Subject**: Unlock Pro features - Take LavLay to the next level 👑

**Content**:
- Benefits of Pro:
  - Withdraw your earnings
  - Get verified badge
  - Unlimited posts & reels
  - Priority support
  - Ad-free experience
  - Advanced analytics
- Pricing: ₦2,000/month or ₦20,000/year (Save 16%)
- Your potential earnings (if active)
- CTA: "Upgrade to Pro"
- Special offer: "Get 20% off your first month - Use code NEWPRO"
- Money-back guarantee

---

## Implementation Strategy

### Phase 1: Database Setup
Create tables for:
1. `scheduled_emails` - Queue of emails to send
2. `email_logs` - Track sent emails
3. `user_email_preferences` - Allow users to control emails

### Phase 2: Email Scheduling System
- Trigger on user signup
- Schedule all 7 emails at appropriate times
- Store in `scheduled_emails` table
- Edge Function to process queue

### Phase 3: Email Templates
- Create templates for each day
- Use dynamic content (user name, stats, etc.)
- Mobile-responsive HTML
- Plain text fallback

### Phase 4: Sending System
- Supabase Edge Function cron job
- Check `scheduled_emails` every hour
- Send due emails via Resend
- Mark as sent in `email_logs`
- Handle failures and retries

### Phase 5: Analytics & Optimization
- Track open rates
- Track click rates
- A/B test subject lines
- Optimize based on data

---

## Database Schema

### scheduled_emails table:
```sql
CREATE TABLE scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,  -- 'day_1', 'day_2', etc.
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### email_logs table:
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  email_address TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### user_email_preferences table:
```sql
CREATE TABLE user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  onboarding_emails BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT true,
  notification_emails BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Email Template Variables

Each email should support these variables:
- `{{user_name}}` - User's first name or username
- `{{points_balance}}` - Current points
- `{{followers_count}}` - Number of followers
- `{{posts_count}}` - Number of posts
- `{{profile_url}}` - Link to profile
- `{{unsubscribe_url}}` - Unsubscribe link

---

## Testing Plan

### Manual Testing:
1. Create test user
2. Manually trigger each email
3. Verify formatting
4. Test all CTAs
5. Check mobile rendering

### Automated Testing:
1. Schedule emails for test users
2. Verify scheduling works
3. Verify sending works
4. Verify logging works
5. Test error handling

---

## Metrics to Track

### Engagement Metrics:
- Email open rate (target: >30%)
- Click-through rate (target: >10%)
- Unsubscribe rate (target: <2%)

### Conversion Metrics:
- Profile completion rate
- First post creation rate
- Follow action rate
- Marketplace visit rate
- Reel upload rate
- Pro upgrade rate

### Overall Goals:
- 80% complete profile (Day 1)
- 60% create first post (Day 2)
- 50% follow 5+ users (Day 3)
- 30% visit marketplace (Day 4)
- 20% upload reel (Day 5)
- 10% upgrade to Pro (Day 7)

---

## Compliance & Best Practices

### Legal Requirements:
- Include unsubscribe link in every email
- Honor unsubscribe requests immediately
- Include physical address in footer
- Follow CAN-SPAM Act
- GDPR compliant (if applicable)

### Best Practices:
- Send at optimal times (10am user's timezone)
- Personalize content
- Mobile-first design
- Clear CTAs
- Track and optimize
- A/B test subject lines
- Segment users based on behavior

---

## Cost Estimation

### Resend Pricing:
- Free tier: 100 emails/day
- Pro tier: $20/month for 50,000 emails
- Business tier: $100/month for 500,000 emails

### Estimated Volume:
- 100 new users/day = 700 emails/day (7 emails per user)
- 3,000 users/month = 21,000 emails/month
- **Recommendation**: Start with Free tier, upgrade to Pro as you grow

---

## Implementation Timeline

### Week 1:
- [ ] Create database tables
- [ ] Set up email scheduling system
- [ ] Create email templates
- [ ] Implement Edge Function

### Week 2:
- [ ] Test with test users
- [ ] Deploy to production
- [ ] Monitor and fix issues
- [ ] Start tracking metrics

### Week 3:
- [ ] Analyze data
- [ ] Optimize based on results
- [ ] A/B test improvements
- [ ] Scale as needed

---

## Future Enhancements

### Phase 2 Features:
- Behavioral triggers (abandoned cart, inactive user, etc.)
- Personalized recommendations
- Dynamic content based on user activity
- Re-engagement campaigns
- Birthday/anniversary emails
- Milestone celebrations

### Phase 3 Features:
- SMS notifications
- Push notifications
- In-app messages
- WhatsApp integration
- Multi-language support

---

## Success Criteria

This system is successful when:
1. ✅ 80% of emails delivered successfully
2. ✅ 30%+ open rate achieved
3. ✅ 10%+ click-through rate achieved
4. ✅ New user retention improves by 20%
5. ✅ Pro conversion rate reaches 10%
6. ✅ User complaints < 1%
7. ✅ Unsubscribe rate < 2%

---

**Status**: 📋 Plan Complete - Ready for Implementation
**Next Step**: Create database tables and email templates
**Owner**: Development Team
**Timeline**: 2-3 weeks for full implementation
