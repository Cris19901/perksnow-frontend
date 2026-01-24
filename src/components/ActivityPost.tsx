import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ActivityPostProps {
  id: string;
  user_id: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  activity_type: 'profile_update' | 'cover_update';
  content: string;
  image_url: string;
  timestamp: string;
  onDelete?: (activityId: string) => void;
}

export function ActivityPost({
  id,
  user_id,
  user,
  activity_type,
  content,
  image_url,
  timestamp,
  onDelete,
}: ActivityPostProps) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const isOwnActivity = currentUser?.id === user_id;

  const handleDelete = async () => {
    if (!isOwnActivity || !currentUser) return;

    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      setDeleting(true);

      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id); // Ensure user can only delete own activities

      if (error) throw error;

      toast.success('Activity deleted');
      onDelete?.(id);
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete activity');
    } finally {
      setDeleting(false);
    }
  };
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
        <div
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${user.username}`);
          }}
        >
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
            <AvatarImage src={user.avatar_url} alt={user.full_name} />
            <AvatarFallback>{user.full_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-gray-900 truncate cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${user.username}`);
              }}
            >
              {user.full_name}
            </h3>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor()}`}>
              {getActivityIcon()}
              <span className="hidden sm:inline">
                {activity_type === 'profile_update' ? 'Profile' : 'Cover'}
              </span>
            </div>
          </div>
          <p
            className="text-sm text-gray-600 cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${user.username}`);
            }}
          >
            @{user.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">{timestamp}</span>
          {isOwnActivity && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
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
