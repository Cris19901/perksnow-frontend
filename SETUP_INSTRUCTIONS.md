# 🚀 Setup Instructions - Reels & Onboarding Systems

## ✅ What Has Been Completed

### 1. Reels System Fixed
- Created comprehensive database migration file: [REELS_COMPLETE_MIGRATION.sql](REELS_COMPLETE_MIGRATION.sql)
- Fixes like, comment, and share functionality for reels
- Includes all tables, RLS policies, triggers, and functions

### 2. Onboarding System Created
- Built complete onboarding flow UI component: [src/components/OnboardingFlow.tsx](src/components/OnboardingFlow.tsx)
- Created database migration: [ONBOARDING_SYSTEM_MIGRATION.sql](ONBOARDING_SYSTEM_MIGRATION.sql)
- Integrated into app - shows automatically for new users
- Includes:
  - Welcome screen
  - Profile picture upload
  - Cover photo upload (optional)
  - Bio and location
  - Interests selection

### 3. Deployed to Production
- All code changes have been built and deployed
- Live at: https://perknowv2-latest-bv4cbw65s-fadipe-timothys-projects.vercel.app

---

## 🔧 What You Need to Do (IMPORTANT!)

### Step 1: Fix Reels - Run Database Migration

**File:** [REELS_COMPLETE_MIGRATION.sql](REELS_COMPLETE_MIGRATION.sql)

1. Open your **Supabase Dashboard** (production database)
2. Go to **SQL Editor**
3. Open the file `REELS_COMPLETE_MIGRATION.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run**

**What this does:**
- Creates/updates reels, reel_likes, reel_comments, reel_views tables
- Sets up Row Level Security (RLS) policies
- Creates triggers to auto-update like/comment/view counts
- Creates `get_reels_feed()` function

**After running this, your reels like, comment, and share will work!**

---

### Step 2: Enable Onboarding - Run Database Migration

**File:** [ONBOARDING_SYSTEM_MIGRATION.sql](ONBOARDING_SYSTEM_MIGRATION.sql)

1. Open your **Supabase Dashboard** (production database)
2. Go to **SQL Editor**
3. Open the file `ONBOARDING_SYSTEM_MIGRATION.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run**

**What this does:**
- Creates `user_onboarding_progress` table to track onboarding steps
- Adds onboarding columns to users table
- Creates `scheduled_emails` table for automated welcome emails
- Sets up functions to mark onboarding steps complete
- Creates triggers to schedule welcome emails automatically

**After running this, new users will see the onboarding flow when they sign up!**

---

### Step 3: Enable Email Sending (Optional but Recommended)

The onboarding system schedules welcome emails automatically. To actually send them, you'll need to:

**Option A: Using Supabase Edge Functions (Recommended)**
1. Create a Supabase Edge Function that runs on a schedule (cron job)
2. The function should query `scheduled_emails` where `status = 'pending'` and `scheduled_for <= NOW()`
3. Send emails using a service like SendGrid, Mailgun, or Resend
4. Update the email status to 'sent'

**Option B: Using External Cron Service**
1. Use a service like Vercel Cron or GitHub Actions
2. Hit an API endpoint every hour
3. The endpoint checks for pending emails and sends them

**Email Templates to Create:**
- **welcome**: Welcome to LavLay!
- **getting_started**: Tips for getting started (sent 24h after signup)
- **community_guidelines**: Community rules and guidelines (48h after signup)
- **feature_highlights**: Cool features they should try (72h after signup)

---

## 🧪 Testing the Features

### Test Reels (After Migration)
1. Go to `/reels` on your site
2. Upload a reel or view existing reels
3. Try:
   - ❤️ Liking a reel
   - 💬 Commenting on a reel
   - 📤 Sharing a reel
4. All should work now!

### Test Onboarding (After Migration)
1. Create a new test account
2. After signup, you should immediately see the onboarding flow
3. Go through the steps:
   - Upload profile picture
   - Upload cover photo (optional)
   - Write a bio
   - Select interests
4. After completion, you should land on the main feed

### Test Existing Users
- Existing users won't see onboarding (since their `onboarding_completed` is already set)
- If you want to test, you can manually reset it:
  ```sql
  UPDATE users SET onboarding_completed = FALSE WHERE id = 'user-id-here';
  ```

---

## 📊 Database Changes Summary

### New Tables
1. **user_onboarding_progress** - Tracks which onboarding steps users have completed
2. **scheduled_emails** - Stores emails to be sent to new users

### Modified Tables
1. **users** - Added columns:
   - `onboarding_completed` (boolean)
   - `onboarding_started_at` (timestamp)
   - `onboarding_completed_at` (timestamp)

### New Functions
1. **mark_onboarding_step_complete()** - Marks a step as complete
2. **get_onboarding_status()** - Gets user's onboarding progress
3. **schedule_welcome_emails()** - Auto-schedules emails when user signs up

---

## 🎯 How It Works

### Onboarding Flow
1. User signs up → Account created
2. User logs in → App checks if `onboarding_completed = false`
3. If false → Show onboarding modal
4. User completes steps → Steps marked in `user_onboarding_progress`
5. User finishes → Set `onboarding_completed = true`
6. Onboarding hidden forever for that user

### Automated Emails
1. User signs up → Trigger creates 4 email records in `scheduled_emails`
2. Each email has a `scheduled_for` timestamp
3. Your email service (cron job) checks for pending emails
4. Sends emails at the right time
5. Marks as 'sent' to avoid duplicates

---

## 🐛 Troubleshooting

### Reels not working?
- ❌ **Problem**: "Failed to load reels" or likes don't work
- ✅ **Solution**: Make sure you ran `REELS_COMPLETE_MIGRATION.sql` in production Supabase

### Onboarding not showing?
- ❌ **Problem**: New users don't see onboarding flow
- ✅ **Solution**:
  1. Run `ONBOARDING_SYSTEM_MIGRATION.sql` in production Supabase
  2. Check that new users have `onboarding_completed = false`
  3. Clear browser cache and try again

### "Function does not exist" error?
- ❌ **Problem**: SQL function errors in console
- ✅ **Solution**: The migration wasn't run. Go to Supabase SQL Editor and run the migrations

---

## 📝 Next Steps (Recommended)

1. ✅ **Run the two SQL migrations** (CRITICAL - do this first!)
2. 📧 **Set up email sending** (for welcome emails)
3. 🎨 **Customize onboarding** (edit OnboardingFlow.tsx if needed)
4. 📊 **Monitor analytics** (track how many users complete onboarding)
5. 🔍 **Test thoroughly** (create test accounts and go through the flow)

---

## 🎉 You're All Set!

After running the SQL migrations, both systems will be fully functional:
- ✅ Reels with working likes, comments, and shares
- ✅ Beautiful onboarding flow for new users
- ✅ Automated welcome email scheduling
- ✅ Profile completion tracking

If you encounter any issues, check the troubleshooting section above or review the migration files.

**Happy coding! 🚀**
