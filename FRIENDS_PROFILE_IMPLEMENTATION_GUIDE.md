# 👥 Friends & Profile Viewing - Implementation Guide

## ✅ **What's Already Completed**

### 1. **PeoplePage Created** ✅
- **File:** [src/components/pages/PeoplePage.tsx](src/components/pages/PeoplePage.tsx)
- **Features:**
  - Search for users by username or full name
  - View suggested users to follow
  - See your followers and following lists
  - Follow/unfollow users
  - Click on user cards to navigate to their profile

### 2. **Routes Added** ✅
- **File:** [src/App.tsx](src/App.tsx)
- **Routes:**
  - `/people` - Find and discover friends
  - `/profile` - Your own profile
  - `/profile/:username` - View any user's profile by username

### 3. **SQL Function Created** ✅
- **File:** [CREATE_PEOPLE_DISCOVERY_SYSTEM.sql](CREATE_PEOPLE_DISCOVERY_SYSTEM.sql)
- **Functions:**
  - `get_suggested_users()` - Get users you don't follow yet
  - Auto-update follower/following counts
  - Initialize existing counts

---

## 🔨 **TODO: Remaining Steps**

### Step 1: Run Database Migration

Run this in **Supabase SQL Editor** (production database):

```sql
-- Open and run: CREATE_PEOPLE_DISCOVERY_SYSTEM.sql
```

This will:
- Create `get_suggested_users()` function
- Add `followers_count` and `following_count` columns to users
- Set up triggers to auto-update counts
- Initialize counts for existing users

---

### Step 2: Update ProfilePage to Support Viewing Other Users

The ProfilePage currently only shows the logged-in user's profile. You need to update it to:

**File to modify:** `src/components/pages/ProfilePage.tsx`

**Changes needed:**

1. **Import useParams and useNavigate:**
```typescript
import { useParams, useNavigate } from 'react-router-dom';
```

2. **Get username from URL:**
```typescript
const { username } = useParams<{ username?: string }>();
const navigate = useNavigate();
```

3. **Add follow state:**
```typescript
const [isFollowing, setIsFollowing] = useState(false);
const [followLoading, setFollowLoading] = useState(false);
```

4. **Determine if viewing own profile:**
```typescript
const isOwnProfile = !username || (user && profile && user.id === profile.id);
```

5. **Update fetchProfileData() function to fetch by username:**
```typescript
const fetchProfileData = async () => {
  try {
    setLoading(true);
    setError(null);

    let profileData;
    let targetUserId;

    if (username) {
      // Fetch profile by username
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('User not found');
        setLoading(false);
        return;
      }

      profileData = data;
      targetUserId = data.id;

      // Check if following
      if (user && user.id !== targetUserId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        setIsFollowing(!!followData);
      }
    } else {
      // Fetch logged-in user's profile
      if (!user) {
        setError('Not logged in');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      profileData = data;
      targetUserId = user.id;
    }

    setProfile(profileData);

    // Fetch posts for targetUserId instead of user.id
    // Fetch products for targetUserId instead of user.id
    // ... rest of the code
  } catch (err) {
    console.error('Error:', err);
    setError('Failed to load profile');
  } finally {
    setLoading(false);
  }
};
```

6. **Add Follow/Unfollow Button (in the profile header section):**
```typescript
{!isOwnProfile && user && (
  <Button
    onClick={isFollowing ? handleUnfollow : handleFollow}
    disabled={followLoading}
    className={isFollowing ? '' : 'bg-gradient-to-r from-purple-600 to-pink-600'}
    variant={isFollowing ? 'outline' : 'default'}
  >
    {followLoading ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : isFollowing ? (
      <>
        <UserCheck className="w-4 h-4 mr-2" />
        Following
      </>
    ) : (
      <>
        <UserPlus className="w-4 h-4 mr-2" />
        Follow
      </>
    )}
  </Button>
)}
```

7. **Add follow/unfollow handlers:**
```typescript
const handleFollow = async () => {
  if (!user || !profile) return;

  setFollowLoading(true);
  try {
    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: profile.id
    });

    if (error) throw error;
    setIsFollowing(true);
    toast.success('Following user');
  } catch (err) {
    console.error('Error following:', err);
    toast.error('Failed to follow user');
  } finally {
    setFollowLoading(false);
  }
};

const handleUnfollow = async () => {
  if (!user || !profile) return;

  setFollowLoading(true);
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profile.id);

    if (error) throw error;
    setIsFollowing(false);
    toast.success('Unfollowed user');
  } catch (err) {
    console.error('Error unfollowing:', err);
    toast.error('Failed to unfollow user');
  } finally {
    setFollowLoading(false);
  }
};
```

---

### Step 3: Make User Names/Avatars Clickable

**Files to update:**
- `src/components/Post.tsx`
- `src/components/ProductPost.tsx`
- `src/components/ReelsViewer.tsx`

**Changes for each file:**

1. **Import useNavigate:**
```typescript
import { useNavigate } from 'react-router-dom';
```

2. **Initialize navigate:**
```typescript
const navigate = useNavigate();
```

3. **Make the author section clickable:**

**In Post.tsx** (around line 140-150):
```typescript
<div
  className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
  onClick={() => navigate(`/profile/${author.username.replace('@', '')}`)}
>
  <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
    <AvatarImage src={author.avatar} />
    <AvatarFallback>{author.name[0]}</AvatarFallback>
  </Avatar>
  <div>
    <p className="text-sm sm:text-base font-semibold">{author.name}</p>
    <p className="text-xs sm:text-sm text-gray-500">{timestamp}</p>
  </div>
</div>
```

Repeat the same pattern for **ProductPost.tsx** and **ReelsViewer.tsx**.

---

### Step 4: Update MobileBottomNav (Optional)

Add a "People" icon to the mobile navigation:

**File:** `src/components/MobileBottomNav.tsx`

Add a button for the People page:
```typescript
<Button
  variant="ghost"
  className={`flex-1 flex flex-col items-center gap-1 ${currentPage === 'people' ? 'text-purple-600' : ''}`}
  onClick={() => navigate('/people')}
>
  <Users className="w-5 h-5" />
  <span className="text-xs">People</span>
</Button>
```

---

## 🚀 **Quick Start - How to Use**

### Find Friends:
1. Go to `/people` page
2. Search for users by name or username
3. Browse suggested users, followers, or following tabs
4. Click "Follow" button to follow users
5. Click on any user card to view their profile

### View Profiles:
1. Click on a user's name or avatar anywhere in the app
2. Opens their profile at `/profile/username`
3. See their posts, products, followers, following
4. Follow/unfollow from their profile page

---

## 📝 **Testing Checklist**

- [ ] Run `CREATE_PEOPLE_DISCOVERY_SYSTEM.sql` in production Supabase
- [ ] Navigate to `/people` - page loads correctly
- [ ] Search for users - returns results
- [ ] Follow a user - shows "Following" button
- [ ] Unfollow a user - shows "Follow" button
- [ ] Click on a user card - navigates to their profile
- [ ] View someone's profile at `/profile/username`
- [ ] Click on post author's name/avatar - navigates to their profile
- [ ] Follow/unfollow from profile page works
- [ ] Counts update correctly

---

## 🐛 **Troubleshooting**

### "get_suggested_users does not exist"
**Fix:** Run the SQL migration in Supabase SQL Editor

### Profile page shows "User not found"
**Fix:** Check that the username in URL matches a user in database

### Follow button doesn't work
**Fix:** Check browser console for errors. Verify `follows` table exists and has RLS policies

### Counts don't update
**Fix:** Verify the trigger `update_follow_counts_trigger` was created successfully

---

## 📦 **Files Summary**

**Created:**
- `src/components/pages/PeoplePage.tsx` - People discovery page
- `CREATE_PEOPLE_DISCOVERY_SYSTEM.sql` - Database functions

**Modified:**
- `src/App.tsx` - Added routes
- `src/components/pages/ProfilePage.tsx` - (TODO: Add profile viewing support)
- `src/components/Post.tsx` - (TODO: Make clickable)
- `src/components/ProductPost.tsx` - (TODO: Make clickable)

---

**After completing these steps, rebuild and redeploy:**

```bash
npm run build
vercel --prod --yes
```

