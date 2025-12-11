# Stories System Setup Guide

## Overview

The Stories system allows users to share photos and videos that expire after 24 hours, similar to Instagram and Facebook Stories. The implementation includes:

✅ **Story Upload** - Upload images (max 10MB) or videos (max 50MB, 60 seconds)
✅ **Story Viewer** - Full-screen Instagram-style viewer with progress bars
✅ **View Tracking** - Track who viewed your stories
✅ **Auto-Expiry** - Stories automatically expire after 24 hours
✅ **Unviewed Indicator** - Gradient ring shows unviewed stories
✅ **Touch & Keyboard Navigation** - Swipe/tap/keyboard controls

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Database Tables

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire contents** of [CREATE_STORIES_SYSTEM.sql](CREATE_STORIES_SYSTEM.sql)
3. **Paste and Run** (Ctrl+Enter)
4. You should see success messages:
   - Tables created: `stories`, `story_views`
   - Functions created: `get_stories_feed`, `get_user_stories`, etc.
   - RLS policies enabled
   - Permissions granted

### Step 2: Verify Installation

Run this query in Supabase SQL Editor to verify everything is set up:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('stories', 'story_views');

-- Check functions exist
SELECT proname AS function_name
FROM pg_proc
WHERE proname IN ('get_stories_feed', 'get_user_stories', 'increment_story_views', 'cleanup_expired_stories')
ORDER BY proname;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('stories', 'story_views');
```

All queries should return results. If any return empty, re-run the CREATE_STORIES_SYSTEM.sql file.

### Step 3: Configure R2 Storage

Stories use the same R2 storage as posts and reels. Make sure your R2 is configured:

1. Check [FIX_R2_BUCKET_NAME.md](FIX_R2_BUCKET_NAME.md) for R2 setup instructions
2. Make sure CORS is configured - see [R2_CORS_CONFIGURATION.md](R2_CORS_CONFIGURATION.md)
3. Verify environment variables in Vercel:
   - `VITE_R2_ACCOUNT_ID`
   - `VITE_R2_ACCESS_KEY_ID`
   - `VITE_R2_SECRET_ACCESS_KEY`
   - `VITE_R2_BUCKET_NAME`
   - `VITE_R2_PUBLIC_URL`

### Step 4: Test the System

1. **Refresh your app**: Ctrl+Shift+R
2. **Go to the Home page** - you should see the Stories bar at the top
3. **Click "Your Story"** - upload dialog should open
4. **Select an image or video**:
   - Images: max 10MB
   - Videos: max 50MB, max 60 seconds
5. **Upload Story** - should succeed!
6. **View your story** - click on your avatar to see it in full-screen viewer
7. **Check expiry** - story will disappear after 24 hours

---

## 📋 Database Schema

### `stories` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users table |
| `media_url` | TEXT | URL of the story media (image or video) |
| `media_type` | VARCHAR(10) | Either 'image' or 'video' |
| `thumbnail_url` | TEXT | Thumbnail for videos (optional) |
| `duration` | INTEGER | Duration in seconds (5 for images, actual duration for videos) |
| `created_at` | TIMESTAMPTZ | When the story was created |
| `expires_at` | TIMESTAMPTZ | When the story expires (24 hours after creation) |
| `views_count` | INTEGER | Number of times the story was viewed |

### `story_views` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `story_id` | UUID | Foreign key to stories table |
| `user_id` | UUID | Foreign key to users table (who viewed) |
| `viewed_at` | TIMESTAMPTZ | When the story was viewed |

**Constraint**: Unique on (story_id, user_id) - each user can only view a story once

---

## 🔧 Database Functions

### `get_stories_feed(p_user_id UUID)`

Returns all active stories from all users with viewer's viewed status.

**Usage**:
```sql
SELECT * FROM get_stories_feed('user-uuid-here');
-- Returns: story_id, user_id, username, full_name, avatar_url,
--          media_url, media_type, duration, views_count, is_viewed
```

### `get_user_stories(p_user_id UUID, p_viewer_id UUID)`

Returns all active stories from a specific user with viewer's viewed status.

**Usage**:
```sql
SELECT * FROM get_user_stories('story-owner-uuid', 'viewer-uuid');
-- Returns: story_id, media_url, media_type, duration, views_count, is_viewed
```

### `cleanup_expired_stories()`

Deletes all expired stories (expires_at <= NOW()).

**Usage**:
```sql
SELECT cleanup_expired_stories();
-- Returns: number of deleted stories
```

**Recommended**: Set up a scheduled job in Supabase to run this daily:
1. Go to Supabase Dashboard → Database → Cron Jobs
2. Create new cron job:
   ```sql
   SELECT cron.schedule(
     'cleanup-expired-stories',
     '0 0 * * *', -- Run daily at midnight
     'SELECT cleanup_expired_stories();'
   );
   ```

---

## 🎨 Component Architecture

### File Structure

```
src/components/
├── Stories.tsx           # Main stories bar component
├── StoryUpload.tsx       # Story upload dialog
├── StoryViewer.tsx       # Full-screen story viewer
└── ReelComments.tsx      # Already exists (for reels)
```

### How It Works

1. **Stories Component** ([Stories.tsx](src/components/Stories.tsx)):
   - Displays horizontal scrollable bar with user avatars
   - Shows gradient ring for unviewed stories (yellow-pink-purple)
   - Shows gray ring for viewed stories
   - Shows "+" button on "Your Story" avatar
   - Clicking opens StoryUpload (own) or StoryViewer (others)

2. **StoryUpload Component** ([StoryUpload.tsx](src/components/StoryUpload.tsx)):
   - Dialog for uploading new stories
   - Validates file type (image/video) and size
   - Shows preview before upload
   - Uploads to R2 storage
   - Inserts story record into database
   - Auto-detects video duration

3. **StoryViewer Component** ([StoryViewer.tsx](src/components/StoryViewer.tsx)):
   - Full-screen Instagram-style viewer
   - Progress bars at top (one per story)
   - User info and timestamp at top
   - Auto-advances through stories
   - Touch controls: tap left (previous), tap right (next), tap center (pause)
   - Keyboard controls: Arrow keys (navigate), ESC (close)
   - Tracks views after 1 second
   - Shows view count for own stories

---

## 🎯 Features

### Story Upload
- ✅ Supports images (JPEG, PNG, WebP, GIF) up to 10MB
- ✅ Supports videos (MP4, MOV, WebM) up to 50MB
- ✅ Videos limited to 60 seconds
- ✅ Shows upload progress bar
- ✅ Auto-detects video duration
- ✅ Image stories default to 5 seconds
- ✅ Validation and error handling
- ✅ Preview before upload

### Story Viewer
- ✅ Full-screen immersive experience
- ✅ Progress bars for each story
- ✅ User avatar and name
- ✅ Timestamp display
- ✅ Auto-play and auto-advance
- ✅ Touch navigation (mobile)
- ✅ Keyboard navigation (desktop)
- ✅ Pause/resume by tapping center
- ✅ View tracking (after 1 second)
- ✅ View count for own stories
- ✅ Smooth transitions

### View Tracking
- ✅ Tracks who viewed each story
- ✅ Updates view count in real-time
- ✅ Shows view count on own stories
- ✅ Prevents duplicate views (unique constraint)
- ✅ Updates viewed status immediately

### Unviewed Indicator
- ✅ Gradient ring (yellow-pink-purple) for unviewed stories
- ✅ Gray ring for viewed stories
- ✅ No ring for own stories
- ✅ Updates in real-time after viewing

### Auto-Expiry
- ✅ Stories expire 24 hours after creation
- ✅ Expired stories hidden from feed
- ✅ Cleanup function available
- ✅ Can be scheduled with cron job

---

## 🔒 Security (RLS Policies)

### Stories Table

1. **View Stories**: Anyone can view non-expired stories
   ```sql
   USING (expires_at > NOW())
   ```

2. **Insert Stories**: Authenticated users can insert their own stories
   ```sql
   WITH CHECK (auth.uid() = user_id)
   ```

3. **Update Stories**: Users can update their own stories
   ```sql
   USING (auth.uid() = user_id)
   ```

4. **Delete Stories**: Users can delete their own stories
   ```sql
   USING (auth.uid() = user_id)
   ```

### Story Views Table

1. **View Story Views**: Users can view their own views or views on their stories
   ```sql
   USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM stories WHERE id = story_id))
   ```

2. **Insert Views**: System can insert views (no restrictions)
   ```sql
   WITH CHECK (true)
   ```

3. **Delete Views**: Users can delete their own views
   ```sql
   USING (auth.uid() = user_id)
   ```

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Stories bar appears on home page
- [ ] "Your Story" avatar shows with "+" button
- [ ] Clicking "Your Story" opens upload dialog
- [ ] Can select image file (JPEG, PNG, WebP, GIF)
- [ ] Can select video file (MP4, MOV, WebM)
- [ ] File validation works (size limits, duration limits)
- [ ] Upload progress shows
- [ ] Story uploads successfully
- [ ] Story appears in stories bar

### Story Viewer
- [ ] Clicking on story opens full-screen viewer
- [ ] Progress bars show at top
- [ ] User info displays correctly
- [ ] Timestamp shows
- [ ] Image stories display for 5 seconds
- [ ] Video stories play with audio
- [ ] Auto-advances to next story
- [ ] Tap left goes to previous story
- [ ] Tap right goes to next story
- [ ] Tap center pauses/resumes
- [ ] Arrow keys navigate (desktop)
- [ ] ESC key closes viewer
- [ ] Close button works

### View Tracking
- [ ] View count increments after viewing
- [ ] Viewed stories show gray ring
- [ ] Unviewed stories show gradient ring
- [ ] Own stories show view count in viewer
- [ ] Duplicate views don't increment counter

### Expiry
- [ ] Stories show expires_at = 24 hours from now
- [ ] Expired stories don't show in feed
- [ ] Cleanup function removes expired stories

---

## 🐛 Troubleshooting

### Stories Don't Appear

**Error**: Stories bar is empty or doesn't show

**Solution**:
1. Check if database tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN ('stories', 'story_views');
   ```
   If empty, run CREATE_STORIES_SYSTEM.sql

2. Check if functions exist:
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname = 'get_stories_feed';
   ```
   If empty, run CREATE_STORIES_SYSTEM.sql

3. Check browser console for errors

### Upload Fails

**Error**: Story upload fails with error

**Common causes**:
1. **R2 not configured**: Check environment variables
2. **CORS error**: Configure R2 CORS (see R2_CORS_CONFIGURATION.md)
3. **Permissions error**: Run CREATE_STORIES_SYSTEM.sql to grant permissions
4. **File too large**: Images max 10MB, videos max 50MB
5. **Video too long**: Videos max 60 seconds

**Debug**:
```javascript
// Check R2 configuration in browser console
console.log('R2 Configured:', !!import.meta.env.VITE_R2_ACCOUNT_ID);
```

### View Tracking Not Working

**Error**: Views don't increment or duplicate views

**Solution**:
1. Check if trigger exists:
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'story_views'
     AND trigger_name = 'trigger_increment_story_views';
   ```
   If empty, run CREATE_STORIES_SYSTEM.sql

2. Check RLS policies:
   ```sql
   SELECT policyname FROM pg_policies
   WHERE tablename = 'story_views';
   ```
   Should see: "System can insert story views"

### Expired Stories Not Cleaning Up

**Error**: Old stories still visible

**Solution**:
1. Run cleanup manually:
   ```sql
   SELECT cleanup_expired_stories();
   ```

2. Set up cron job (see Database Functions section above)

3. Check expires_at values:
   ```sql
   SELECT id, created_at, expires_at, NOW() AS current_time
   FROM stories
   WHERE expires_at <= NOW();
   ```

---

## 🎯 Best Practices

### For Users
1. **Keep videos short**: 15-30 seconds is ideal for engagement
2. **Use good lighting**: Make sure your content is visible
3. **Add context**: Stories disappear in 24 hours, so make them timely
4. **Check view count**: See who's engaging with your content

### For Developers
1. **Monitor storage**: Stories can accumulate quickly, clean up regularly
2. **Set up cron job**: Auto-cleanup expired stories daily
3. **Optimize media**: Consider compressing images/videos before upload
4. **Rate limiting**: Add rate limits to prevent spam (optional)
5. **Analytics**: Track story engagement metrics (optional)

---

## 📊 Analytics (Optional Enhancement)

Track story performance with custom analytics:

```sql
-- Most viewed stories
SELECT
  s.id,
  u.username,
  s.media_type,
  s.views_count,
  s.created_at
FROM stories s
JOIN users u ON s.user_id = u.id
ORDER BY s.views_count DESC
LIMIT 10;

-- Most active story creators
SELECT
  u.username,
  COUNT(*) AS story_count,
  SUM(s.views_count) AS total_views
FROM stories s
JOIN users u ON s.user_id = u.id
WHERE s.created_at >= NOW() - INTERVAL '7 days'
GROUP BY u.id, u.username
ORDER BY story_count DESC
LIMIT 10;

-- Story engagement rate
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS stories_posted,
  AVG(views_count) AS avg_views_per_story
FROM stories
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## ✨ Summary

Your Stories system is now fully functional! Users can:

✅ Upload image and video stories
✅ View stories in full-screen Instagram-style viewer
✅ Navigate with touch/keyboard controls
✅ Track who viewed their stories
✅ See unviewed indicators
✅ Auto-expire stories after 24 hours

**Next Steps**:
1. Run CREATE_STORIES_SYSTEM.sql in Supabase
2. Configure R2 storage if not already done
3. Test uploading and viewing stories
4. Set up daily cleanup cron job
5. Monitor usage and storage

Enjoy your new Stories feature! 🎉
