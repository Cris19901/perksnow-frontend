import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Plus } from 'lucide-react';

const stories = [
  {
    id: 1,
    username: 'Your Story',
    avatar: 'https://images.unsplash.com/photo-1653691040409-793d2c22ed69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZXxlbnwxfHx8fDE3NjI1OTM0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    isOwn: true,
  },
  {
    id: 2,
    username: 'sarah_jones',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    hasStory: true,
  },
  {
    id: 3,
    username: 'mike_wilson',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    hasStory: true,
  },
  {
    id: 4,
    username: 'emma_davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    hasStory: true,
  },
  {
    id: 5,
    username: 'john_smith',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    hasStory: true,
  },
  {
    id: 6,
    username: 'lisa_anderson',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    hasStory: true,
  },
];

export function Stories() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-1 sm:gap-2 min-w-[70px] sm:min-w-[80px] cursor-pointer group">
            <div className={`relative ${story.isOwn ? '' : 'p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full'}`}>
              <div className={`${story.isOwn ? '' : 'bg-white p-[2px] rounded-full'}`}>
                <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white">
                  <AvatarImage src={story.avatar} />
                  <AvatarFallback>{story.username[0]}</AvatarFallback>
                </Avatar>
                {story.isOwn && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-center max-w-[70px] sm:max-w-[80px] truncate">
              {story.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
