import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StoryUpload } from './StoryUpload';
import { StoryViewer } from './StoryViewer';

interface StoryUser {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  isOwn?: boolean;
  hasStory?: boolean;
  storyCount?: number;
  hasUnviewed?: boolean;
}

export function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
  }, [user]);

  const fetchStories = async () => {
    try {
      setLoading(true);

      // Fetch all stories using the database function
      const { data: allStories, error } = await supabase.rpc('get_stories_feed', {
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('Error fetching stories:', error);
        return;
      }

      // Group stories by user
      const userStoriesMap = new Map<string, {
        user: any;
        storyCount: number;
        hasUnviewed: boolean;
      }>();

      if (allStories) {
        allStories.forEach((story: any) => {
          if (!userStoriesMap.has(story.user_id)) {
            userStoriesMap.set(story.user_id, {
              user: {
                id: story.user_id,
                username: story.username,
                full_name: story.full_name,
                avatar_url: story.avatar_url
              },
              storyCount: 0,
              hasUnviewed: false
            });
          }

          const userData = userStoriesMap.get(story.user_id)!;
          userData.storyCount++;
          if (!story.is_viewed) {
            userData.hasUnviewed = true;
          }
        });
      }

      // Build story users array
      const storyUsers: StoryUser[] = [];

      // Add current user first (always show, even without stories)
      if (user?.id) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('id, username, avatar_url, full_name')
          .eq('id', user.id)
          .single();

        if (currentUser) {
          const userData = userStoriesMap.get(user.id);
          storyUsers.push({
            ...currentUser,
            isOwn: true,
            username: 'Your Story',
            hasStory: !!userData,
            storyCount: userData?.storyCount || 0,
            hasUnviewed: false // Own stories don't show unviewed indicator
          });
        }
      }

      // Add other users with stories
      userStoriesMap.forEach((userData, userId) => {
        if (userId !== user?.id) {
          storyUsers.push({
            ...userData.user,
            hasStory: true,
            storyCount: userData.storyCount,
            hasUnviewed: userData.hasUnviewed
          });
        }
      });

      setStories(storyUsers);
    } catch (err) {
      console.error('Exception fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (story: StoryUser) => {
    return story.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.id}`;
  };

  const handleStoryClick = (story: StoryUser) => {
    if (story.isOwn && story.hasStory) {
      // If user has their own stories, view them
      setViewingUserId(story.id);
    } else if (story.isOwn && !story.hasStory) {
      // If user has no stories, open upload dialog
      setShowUpload(true);
    } else if (story.hasStory) {
      // View other users' stories
      setViewingUserId(story.id);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px]">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <p className="text-gray-500 text-sm text-center">No stories yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {stories.map((story) => (
            <div
              key={story.id}
              className="flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px] cursor-pointer group"
              onClick={() => handleStoryClick(story)}
            >
              <div className={`relative ${
                story.isOwn && story.hasStory
                  ? 'p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full'
                  : story.isOwn
                    ? ''
                    : story.hasUnviewed
                      ? 'p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full'
                      : 'p-[3px] bg-gray-300 rounded-full'
              }`}>
                <div className={`${(story.isOwn && story.hasStory) || !story.isOwn ? 'bg-white p-[2px] rounded-full' : ''}`}>
                  <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white">
                    <AvatarImage src={getAvatarUrl(story)} />
                    <AvatarFallback>{(story.full_name || story.username || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {story.isOwn && !story.hasStory && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-center max-w-[70px] sm:max-w-[80px] truncate">
                {story.isOwn ? 'Your Story' : story.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Story Upload Dialog */}
      <StoryUpload
        open={showUpload}
        onOpenChange={setShowUpload}
        onSuccess={fetchStories}
      />

      {/* Story Viewer */}
      {viewingUserId && (
        <StoryViewer
          userId={viewingUserId}
          onClose={() => {
            setViewingUserId(null);
            fetchStories(); // Refresh to update viewed status
          }}
        />
      )}
    </>
  );
}
