import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following?: boolean;
}

interface FollowListsProps {
  userId: string;
  onClose?: () => void;
}

export function FollowLists({ userId, onClose }: FollowListsProps) {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('followers');

  useEffect(() => {
    fetchFollowLists();
  }, [userId]);

  const fetchFollowLists = async () => {
    try {
      setLoading(true);

      // Fetch followers
      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          users:follower_id (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', userId);

      if (followersError) throw followersError;

      // Fetch following
      const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select(`
          following_id,
          users:following_id (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', userId);

      if (followingError) throw followingError;

      // Check if current user is following each person
      const followersList = await Promise.all(
        (followersData || []).map(async (follow: any) => {
          const isFollowing = await checkIfFollowing(follow.users.id);
          return {
            ...follow.users,
            is_following: isFollowing,
          };
        })
      );

      const followingList = await Promise.all(
        (followingData || []).map(async (follow: any) => {
          const isFollowing = await checkIfFollowing(follow.users.id);
          return {
            ...follow.users,
            is_following: isFollowing,
          };
        })
      );

      setFollowers(followersList);
      setFollowing(followingList);
    } catch (err: any) {
      console.error('Error fetching follow lists:', err);
      toast.error('Failed to load follow lists');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFollowing = async (targetUserId: string) => {
    if (!user || user.id === targetUserId) return false;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    return !!data;
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }

    try {
      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: targetUserId,
      });

      if (error) throw error;

      // Update local state
      setFollowers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, is_following: true } : u))
      );
      setFollowing((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, is_following: true } : u))
      );

      toast.success('Following user');
    } catch (err: any) {
      console.error('Error following user:', err);
      toast.error('Failed to follow user');
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;

      // Update local state
      setFollowers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, is_following: false } : u))
      );
      setFollowing((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, is_following: false } : u))
      );

      toast.success('Unfollowed user');
    } catch (err: any) {
      console.error('Error unfollowing user:', err);
      toast.error('Failed to unfollow user');
    }
  };

  const UserListItem = ({ user: listUser }: { user: User }) => (
    <div className="flex items-center gap-3 p-4 hover:bg-gray-50">
      <Avatar className="w-12 h-12">
        <AvatarImage src={listUser.avatar_url || undefined} />
        <AvatarFallback>
          {listUser.username?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {listUser.full_name || listUser.username}
        </p>
        <p className="text-xs text-gray-500 truncate">@{listUser.username}</p>
        {listUser.bio && (
          <p className="text-xs text-gray-600 truncate mt-1">{listUser.bio}</p>
        )}
      </div>
      {user && user.id !== listUser.id && (
        <Button
          size="sm"
          variant={listUser.is_following ? 'outline' : 'default'}
          onClick={() =>
            listUser.is_following
              ? handleUnfollow(listUser.id)
              : handleFollow(listUser.id)
          }
          className={
            listUser.is_following
              ? ''
              : 'bg-gradient-to-r from-purple-600 to-pink-600'
          }
        >
          {listUser.is_following ? (
            <>
              <UserMinus className="w-4 h-4 mr-1" />
              Unfollow
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-1" />
              Follow
            </>
          )}
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="followers">
            <Users className="w-4 h-4 mr-2" />
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="following">
            <Users className="w-4 h-4 mr-2" />
            Following ({following.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followers" className="mt-4">
          {followers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No followers yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border rounded-lg">
              {followers.map((follower) => (
                <UserListItem key={follower.id} user={follower} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-4">
          {following.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Not following anyone yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border rounded-lg">
              {following.map((followingUser) => (
                <UserListItem key={followingUser.id} user={followingUser} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
