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
    if (story.isOwn && !story.hasStory) {
      // If user has no stories, open upload dialog
      setShowUpload(true);
    } else if (story.hasStory) {
      // View stories (own or others)
      setViewingUserId(story.id);
    }
  };

  if (loading) {
    return (
      <>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Stories</h3>
            <button
              onClick={() => setShowUpload(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-full transition-all hover:scale-105 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Story</span>
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-14 h-3 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <StoryUpload
          open={showUpload}
          onOpenChange={setShowUpload}
          onSuccess={fetchStories}
        />
      </>
    );
  }

  if (stories.length === 0) {
    return (
      <>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Stories</h3>
            <button
              onClick={() => setShowUpload(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-full transition-all hover:scale-105 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Story</span>
            </button>
          </div>
          <p className="text-gray-500 text-sm text-center py-4">No stories yet. Be the first to share!</p>
        </div>

        <StoryUpload
          open={showUpload}
          onOpenChange={setShowUpload}
          onSuccess={fetchStories}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Stories</h3>
          <button
            onClick={() => setShowUpload(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-full transition-all hover:scale-105 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Story</span>
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {stories.map((story, index) => (
            <div key={story.id}>
              {/* Add separator after "Your Story" */}
              {index === 1 && (
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 -ml-2" />
              )}

              <div
                className={`flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group transition-transform hover:scale-105 ${
                  story.isOwn ? 'pr-4 mr-2 border-r-2 border-gray-100' : ''
                }`}
                onClick={() => handleStoryClick(story)}
              >
                <div className={`relative ${
                  story.isOwn && story.hasStory
                    ? 'p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full'
                    : story.isOwn
                      ? 'p-[3px] bg-blue-500 rounded-full'
                      : story.hasUnviewed
                        ? 'p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full'
                        : 'p-[3px] bg-gray-300 rounded-full'
                }`}>
                  <div className="bg-white p-[2px] rounded-full">
                    <Avatar className="w-16 h-16 sm:w-18 sm:h-18 border-2 border-white ring-0">
                      <AvatarImage src={getAvatarUrl(story)} alt={story.username} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold">
                        {(story.full_name || story.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className={`text-xs text-center max-w-[80px] truncate font-medium ${
                  story.isOwn ? 'text-blue-600 font-semibold' : 'text-gray-700'
                }`}>
                  {story.isOwn ? 'Your Story' : story.username}
                </span>
              </div>
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
