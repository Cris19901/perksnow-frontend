import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface StoryUser {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  isOwn?: boolean;
  hasStory?: boolean;
}

export function Stories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, [user]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      console.log('🔍 Stories: Fetching users for stories...');

      // Fetch current user's profile first
      let currentUserStory: StoryUser | null = null;
      if (user?.id) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('id, username, avatar_url, full_name')
          .eq('id', user.id)
          .single();

        if (currentUser) {
          currentUserStory = {
            ...currentUser,
            isOwn: true,
            username: 'Your Story',
          };
        }
      }

      // Fetch other users (excluding current user)
      const { data: otherUsers, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, full_name')
        .neq('id', user?.id || '')
        .limit(10);

      if (error) {
        console.error('❌ Stories: Error fetching users:', error);
        return;
      }

      const storyUsers: StoryUser[] = [];

      // Add current user's story first
      if (currentUserStory) {
        storyUsers.push(currentUserStory);
      }

      // Add other users with hasStory flag
      if (otherUsers) {
        otherUsers.forEach((u) => {
          storyUsers.push({
            ...u,
            hasStory: true,
          });
        });
      }

      console.log('✅ Stories: Loaded', storyUsers.length, 'stories');
      setStories(storyUsers);
    } catch (err) {
      console.error('❌ Stories: Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (story: StoryUser) => {
    return story.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.id}`;
  };

  const handleStoryClick = (story: StoryUser) => {
    if (story.isOwn) {
      toast.info('Create your story!', {
        description: 'Story upload feature coming soon...'
      });
    } else {
      toast.info(`View ${story.username}'s story`, {
        description: 'Story viewer coming soon...'
      });
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
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {stories.map((story) => (
          <div
            key={story.id}
            className="flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px] cursor-pointer group"
            onClick={() => handleStoryClick(story)}
          >
            <div className={`relative ${story.isOwn ? '' : 'p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full'}`}>
              <div className={`${story.isOwn ? '' : 'bg-white p-[2px] rounded-full'}`}>
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white">
                  <AvatarImage src={getAvatarUrl(story)} />
                  <AvatarFallback>{(story.full_name || story.username || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                {story.isOwn && (
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
  );
}
