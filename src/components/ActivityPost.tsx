import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, Camera, Image as ImageIcon } from 'lucide-react';

interface ActivityPostProps {
  user: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  activity_type: 'profile_update' | 'cover_update';
  content: string;
  image_url: string;
  timestamp: string;
}

export function ActivityPost({
  user,
  activity_type,
  content,
  image_url,
  timestamp,
}: ActivityPostProps) {
  const getActivityIcon = () => {
    switch (activity_type) {
      case 'profile_update':
        return <User className="w-4 h-4" />;
      case 'cover_update':
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <Camera className="w-4 h-4" />;
    }
  };

  const getActivityColor = () => {
    switch (activity_type) {
      case 'profile_update':
        return 'bg-purple-100 text-purple-600';
      case 'cover_update':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:border-purple-200 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
          <AvatarImage src={user.avatar_url} alt={user.full_name} />
          <AvatarFallback>{user.full_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{user.full_name}</h3>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor()}`}>
              {getActivityIcon()}
              <span className="hidden sm:inline">
                {activity_type === 'profile_update' ? 'Profile' : 'Cover'}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600">@{user.username}</p>
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">{timestamp}</span>
      </div>

      {/* Content */}
      <p className="text-gray-700 mb-4">{content}</p>

      {/* Activity Image */}
      <div className="relative rounded-lg overflow-hidden bg-gray-100">
        <img
          src={image_url}
          alt={content}
          className={`w-full ${
            activity_type === 'cover_update'
              ? 'aspect-[3/1] object-cover'
              : 'aspect-square object-cover'
          }`}
          loading="lazy"
        />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Camera className="w-4 h-4" />
          Activity
        </span>
      </div>
    </div>
  );
}
