# Reels Feature Implementation Guide

## Overview
This guide outlines the complete implementation of a TikTok/Instagram Reels-style video sharing feature with vertical scrolling, likes, comments, views tracking, and points integration.

## Database Schema (✅ Created)
The SQL schema includes:
- **reels** table: stores video metadata
- **reel_likes** table: tracks likes with unique constraints
- **reel_comments** table: stores comments
- **reel_views** table: tracks unique views
- **Automatic triggers** for updating counts
- **Points integration** with rewards for:
  - Uploading reels: 50 points
  - Receiving likes: 2 points each
  - View milestones: 50-500 points (100, 500, 1k, 5k views)
- **RLS policies** for security
- **get_reels_feed()** function for efficient data fetching

## Storage Setup (✅ Already Configured)

**Videos and thumbnails are saved to Cloudflare R2** using your existing R2 configuration.

The application automatically:
- Uploads videos to R2 (or falls back to Supabase if R2 is not configured)
- Uses the `uploadImage` utility from `src/lib/image-upload.ts`
- Supports up to **100MB** video files
- Stores videos in the `videos` bucket with path: `videos/{userId}/{timestamp}-{random}.{ext}`
- Generates and uploads thumbnails automatically

### R2 Configuration Required

Make sure your `.env` file has these R2 credentials:

```env
VITE_R2_ACCOUNT_ID=your_account_id
VITE_R2_ACCESS_KEY_ID=your_access_key
VITE_R2_SECRET_ACCESS_KEY=your_secret_key
VITE_R2_BUCKET_NAME=perknow-media
VITE_R2_PUBLIC_URL=https://your-custom-domain.com (optional)
```

### R2 Bucket Configuration

1. **Enable Public Access** on your R2 bucket for video playback
2. **Configure CORS** in your R2 bucket settings:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
3. **Custom Domain** (optional but recommended): Set up a custom domain for faster CDN delivery

### Fallback to Supabase Storage

If R2 is not configured, the app will automatically fall back to Supabase Storage. To use Supabase:
1. Create a **"videos"** bucket in Supabase Storage
2. Make it public
3. The app will use it automatically

## Frontend Components to Build

### 1. ReelUpload Component
**Purpose**: Allow users to upload videos with preview and caption

**Features**:
- Video file picker (accept="video/*")
- Video preview before upload
- Progress indicator during upload
- Caption input (max 500 characters)
- Duration validation (15-60 seconds recommended)
- Thumbnail auto-generation
- Compress video if >50MB

**Location**: `src/components/ReelUpload.tsx`

### 2. ReelsViewer Component
**Purpose**: TikTok-style vertical scrolling video player

**Features**:
- Full-screen vertical layout
- Swipe/scroll to next/previous reel
- Auto-play on view
- Pause on scroll
- Like button (heart icon)
- Comment button
- Share button
- View count display
- User profile link
- Progress bar showing video progress

**Location**: `src/components/ReelsViewer.tsx`

### 3. ReelCard Component
**Purpose**: Individual reel display with controls

**Features**:
- Video player with custom controls
- Like/unlike toggle
- Comment button (opens comment sheet)
- User avatar and name
- Caption display
- View/like counts
- Timestamp (relative time)

**Location**: `src/components/ReelCard.tsx`

### 4. ReelComments Component
**Purpose**: Bottom sheet for viewing and adding comments

**Features**:
- Scrollable comment list
- Comment input field
- User avatars
- Delete own comments
- Real-time updates (optional)

**Location**: `src/components/ReelComments.tsx`

## Implementation Steps

### Step 1: Database Setup (✅ Complete)
- [x] Created `create-reels-system.sql` with full schema
- [ ] Run SQL in Supabase dashboard
- [ ] Verify tables and triggers are created
- [ ] Test RLS policies

### Step 2: Storage Setup (⏳ Next)
- [ ] Create "reels" bucket in Supabase Storage
- [ ] Configure CORS
- [ ] Set up RLS policies
- [ ] Test video upload/download

### Step 3: Video Upload Component
- [ ] Create file upload with drag & drop
- [ ] Add video preview functionality
- [ ] Implement progress tracking
- [ ] Generate thumbnail from video
- [ ] Validate video format and duration
- [ ] Upload to Supabase Storage
- [ ] Save metadata to reels table

### Step 4: Reels Viewer
- [ ] Create vertical scrolling layout
- [ ] Implement video player with controls
- [ ] Add swipe/scroll navigation
- [ ] Implement auto-play logic
- [ ] Add like/unlike functionality
- [ ] Track views (add to reel_views table)
- [ ] Show user profile info
- [ ] Display counts (views, likes, comments)

### Step 5: Comments System
- [ ] Create comment input component
- [ ] Implement comment submission
- [ ] Display comment list
- [ ] Add delete functionality
- [ ] Real-time updates (optional with Supabase Realtime)

### Step 6: Integration
- [ ] Update ReelsPage.tsx with full functionality
- [ ] Add upload button to feed page
- [ ] Update mobile nav to show reel count
- [ ] Add reel notifications
- [ ] Test points system integration

## API Endpoints Needed

### Upload Reel
```typescript
import { uploadImage } from '@/lib/image-upload';

// Upload video to R2 (or Supabase fallback)
const uploadReel = async (videoFile: File, caption: string, thumbnailBlob: Blob) => {
  const { data: { user } } = await supabase.auth.getUser();

  // Convert thumbnail blob to File
  const thumbnailFile = new File(
    [thumbnailBlob],
    `thumb_${Date.now()}.jpg`,
    { type: 'image/jpeg' }
  );

  // Upload video to R2 (or Supabase if R2 not configured)
  const videoUrl = await uploadImage(videoFile, 'videos', user.id);

  // Upload thumbnail
  const thumbnailUrl = await uploadImage(thumbnailFile, 'videos', user.id);

  // Create reel record in database
  const { data, error } = await supabase.from('reels').insert({
    user_id: user.id,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    caption: caption,
    duration: videoDuration // get from video metadata
  });

  return { data, error };
};
```

### Fetch Reels Feed
```typescript
const getReelsFeed = async (offset = 0, limit = 20) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('get_reels_feed', {
    p_user_id: user?.id,
    p_limit: limit,
    p_offset: offset
  });

  return { data, error };
};
```

### Like/Unlike Reel
```typescript
const toggleReelLike = async (reelId: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('reel_likes')
    .select('id')
    .eq('reel_id', reelId)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    // Unlike
    await supabase.from('reel_likes').delete().eq('id', existingLike.id);
  } else {
    // Like
    await supabase.from('reel_likes').insert({
      reel_id: reelId,
      user_id: user.id
    });
  }
};
```

### Track View
```typescript
const trackReelView = async (reelId: string) => {
  const { data: { user } } = await supabase.auth.getUser();

  // Insert view (will be ignored if already viewed due to unique constraint)
  await supabase.from('reel_views').insert({
    reel_id: reelId,
    user_id: user?.id || null // null for anonymous
  });
};
```

## Points System Integration

The points system is already integrated via database triggers:

- **Upload a reel**: +50 points (instant)
- **Receive a like**: +2 points per like
- **View milestones**:
  - 100 views: +50 points
  - 500 views: +100 points
  - 1,000 views: +200 points
  - 5,000 views: +500 points

## Mobile UX Considerations

1. **Vertical orientation**: Force portrait mode for best experience
2. **Full-screen videos**: Maximize viewing area
3. **Gesture controls**: Swipe up/down to navigate
4. **Auto-play**: Start playing when in view
5. **Mute toggle**: Easy access to sound control
6. **Battery optimization**: Pause videos not in viewport

## Performance Optimizations

1. **Lazy loading**: Load videos as needed
2. **Thumbnail preview**: Show thumbnails before video loads
3. **Preload next**: Preload next 1-2 videos in feed
4. **CDN**: Use Supabase CDN for fast delivery
5. **Compression**: Recommend H.264 codec, 720p-1080p
6. **Infinite scroll**: Load more reels as user scrolls

## Testing Checklist

- [ ] Upload video successfully
- [ ] Video plays in viewer
- [ ] Like/unlike works correctly
- [ ] Comments can be added/deleted
- [ ] View tracking works
- [ ] Points are awarded correctly
- [ ] RLS policies prevent unauthorized access
- [ ] Mobile responsive design works
- [ ] Vertical scrolling is smooth
- [ ] Auto-play/pause logic works

## Next Steps

1. Run `create-reels-system.sql` in Supabase SQL Editor
2. Set up storage bucket and policies
3. Start building ReelUpload component
4. Build ReelsViewer component
5. Integrate with existing points system
6. Test thoroughly on mobile devices
