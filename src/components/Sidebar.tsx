import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { TrendingUp, UserPlus } from 'lucide-react';

const suggestedUsers = [
  {
    id: 1,
    name: 'Alex Thompson',
    username: '@alex_thompson',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    mutualFriends: 12,
  },
  {
    id: 2,
    name: 'Jessica Lee',
    username: '@jessica_lee',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150',
    mutualFriends: 8,
  },
  {
    id: 3,
    name: 'David Chen',
    username: '@david_chen',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    mutualFriends: 5,
  },
];

const trending = [
  { id: 1, tag: '#TechTrends2025', posts: '45.2K' },
  { id: 2, tag: '#TravelDiaries', posts: '32.8K' },
  { id: 3, tag: '#FoodieLife', posts: '28.5K' },
  { id: 4, tag: '#FitnessGoals', posts: '21.3K' },
  { id: 5, tag: '#Photography', posts: '18.9K' },
];

export function Sidebar() {
  return (
    <div className="space-y-4">
      {/* Suggested for you */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <span>Suggestions For You</span>
          <Button variant="link" size="sm" className="p-0 h-auto">
            See All
          </Button>
        </div>
        <div className="space-y-4">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.mutualFriends} mutual friends</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1">
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <span>Trending</span>
        </div>
        <div className="space-y-3">
          {trending.map((item) => (
            <div key={item.id} className="cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
              <p className="text-blue-600">{item.tag}</p>
              <p className="text-xs text-gray-500">{item.posts} posts</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 text-xs text-gray-500 space-y-2">
        <div className="flex flex-wrap gap-2">
          <a href="#" className="hover:underline">About</a>
          <span>·</span>
          <a href="#" className="hover:underline">Help</a>
          <span>·</span>
          <a href="#" className="hover:underline">Privacy</a>
          <span>·</span>
          <a href="#" className="hover:underline">Terms</a>
        </div>
        <p>© 2025 SocialHub</p>
      </div>
    </div>
  );
}
