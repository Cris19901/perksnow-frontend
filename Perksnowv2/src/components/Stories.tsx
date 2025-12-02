import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage } from '@/lib/image-upload';
import { toast } from 'sonner';
import { StoryViewer } from './StoryViewer';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  views_count: number;
  expires_at: string;
  created_at: string;
  users: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

export function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStories();
  }, [user]);

  async function fetchStories() {
    try {
      setLoading(true);

      // Fetch non-expired stories with user info
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          users:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setStories(data || []);
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStory(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      toast.info('Uploading story...');

      // Upload media to R2/Supabase
      const mediaUrl = await uploadImage(file, 'posts', user.id);

      // Determine media type
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

      // Create story in database
      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (error) throw error;

      toast.success('Story uploaded successfully!');

      // Refresh stories
      fetchStories();
    } catch (err: any) {
      console.error('Error creating story:', err);
      toast.error(err.message || 'Failed to upload story');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // Group stories by user
  const userStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = {
        user: story.users,
        stories: [],
      };
    }
    acc[story.user_id].stories.push(story);
    return acc;
  }, {} as Record<string, { user: any; stories: Story[] }>);

  // Check if current user has stories
  const currentUserHasStories = user?.id && userStories[user.id];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2">
          <div className="text-sm text-gray-500">Loading stories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {/* Current user - View or Add Story */}
        {user && currentUserHasStories && (
          <div
            className="flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px] cursor-pointer group"
            onClick={() => setViewingStories(userStories[user.id].stories)}
          >
            <div className="relative">
              <div className="relative p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full">
                <div className="bg-white p-[2px] rounded-full">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white bg-gray-100">
                    <img
                      src={userStories[user.id].stories[0]?.media_url}
                      alt="Your story"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
            <span className="text-xs text-center max-w-[70px] sm:max-w-[80px] truncate">
              Your Story
            </span>
          </div>
        )}

        {/* Add Story Button - Always visible for current user */}
        {user && (
          <div
            className="flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px] cursor-pointer group"
            onClick={() => {
              if (!uploading) {
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="relative">
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white bg-gray-100">
                <AvatarFallback className="bg-gray-100">
                  <Plus className="w-6 h-6 text-gray-600" />
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-center max-w-[70px] sm:max-w-[80px] truncate text-gray-600">
              Add Story
            </span>
          </div>
        )}

        {/* Other users' stories */}
        {Object.entries(userStories)
          .filter(([userId]) => userId !== user?.id)
          .map(([userId, { user: storyUser, stories: userStoryList }]) => (
            <div
              key={userId}
              className="flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px] cursor-pointer group"
              onClick={() => setViewingStories(userStoryList)}
            >
              <div className="relative p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full">
                <div className="bg-white p-[2px] rounded-full">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white bg-gray-100">
                    <img
                      src={userStoryList[0]?.media_url}
                      alt={`${storyUser.username || storyUser.full_name}'s story`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <span className="text-xs text-center max-w-[70px] sm:max-w-[80px] truncate">
                {storyUser.username || storyUser.full_name?.split(' ')[0] || 'User'}
              </span>
            </div>
          ))}

        {Object.keys(userStories).length === 0 && !user && (
          <div className="text-sm text-gray-500">No stories to show</div>
        )}
      </div>

      {/* Hidden file input for creating story */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleCreateStory}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* Story Viewer Modal */}
      {viewingStories && (
        <StoryViewer
          stories={viewingStories}
          onClose={() => setViewingStories(null)}
        />
      )}
    </div>
  );
}
