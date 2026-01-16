import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MobileBottomNav } from '../MobileBottomNav';
import { Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string | null;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

interface PeoplePageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function PeoplePage({ onCartClick, cartItemsCount }: PeoplePageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuggestedUsers();
    fetchFollowing();
    fetchFollowers();
  }, [user]);

  const fetchSuggestedUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_suggested_users', {
        p_user_id: user?.id || null,
        p_limit: 20
      });

      if (error) {
        console.error('Error fetching suggested users:', error);
        // Fallback: get random users if function doesn't exist
        const { data: fallbackData } = await supabase
          .from('users')
          .select('*')
          .neq('id', user?.id || '')
          .limit(20);
        setSuggestedUsers(fallbackData || []);
      } else {
        setSuggestedUsers(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          users!follows_following_id_fkey (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('follower_id', user?.id);

      if (error) throw error;
      setFollowing(data?.map(f => ({ ...f.users, is_following: true })) || []);
    } catch (err) {
      console.error('Error fetching following:', err);
    }
  };

  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          users!follows_follower_id_fkey (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', user?.id);

      if (error) throw error;

      // Check if current user is following back
      const followerIds = data?.map(f => f.users.id) || [];
      const { data: followingBack } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id)
        .in('following_id', followerIds);

      const followingBackIds = new Set(followingBack?.map(f => f.following_id) || []);

      setFollowers(data?.map(f => ({
        ...f.users,
        is_following: followingBackIds.has(f.users.id)
      })) || []);
    } catch (err) {
      console.error('Error fetching followers:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) throw error;

      // Check which users we're following
      if (data && data.length > 0) {
        const userIds = data.map(u => u.id);
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user?.id)
          .in('following_id', userIds);

        const followingIds = new Set(followData?.map(f => f.following_id) || []);
        setSearchResults(data.map(u => ({
          ...u,
          is_following: followingIds.has(u.id)
        })));
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error('Error searching users:', err);
      toast.error('Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }

    if (followingInProgress.has(userId)) return;

    try {
      setFollowingInProgress(prev => new Set(prev).add(userId));

      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: userId
      });

      if (error) throw error;

      toast.success('Following user');

      // Update UI optimistically
      setSuggestedUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_following: true, followers_count: u.followers_count + 1 } : u
      ));
      setSearchResults(prev => prev.map(u =>
        u.id === userId ? { ...u, is_following: true, followers_count: u.followers_count + 1 } : u
      ));
      setFollowers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_following: true } : u
      ));

      // Refresh following list
      fetchFollowing();
    } catch (err: any) {
      console.error('Error following user:', err);
      toast.error('Failed to follow user');
    } finally {
      setFollowingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;
    if (followingInProgress.has(userId)) return;

    try {
      setFollowingInProgress(prev => new Set(prev).add(userId));

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;

      toast.success('Unfollowed user');

      // Update UI optimistically
      setSuggestedUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_following: false, followers_count: Math.max(0, u.followers_count - 1) } : u
      ));
      setSearchResults(prev => prev.map(u =>
        u.id === userId ? { ...u, is_following: false, followers_count: Math.max(0, u.followers_count - 1) } : u
      ));
      setFollowers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_following: false } : u
      ));

      // Refresh following list
      fetchFollowing();
    } catch (err: any) {
      console.error('Error unfollowing user:', err);
      toast.error('Failed to unfollow user');
    } finally {
      setFollowingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const UserCard = ({ user: profileUser }: { user: User }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-200 transition-colors">
      <div
        className="flex items-center gap-3 flex-1 cursor-pointer"
        onClick={() => navigate(`/profile/${profileUser.username}`)}
      >
        <Avatar className="w-12 h-12">
          <AvatarImage src={profileUser.avatar_url} />
          <AvatarFallback>{profileUser.full_name?.[0] || profileUser.username[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{profileUser.full_name || profileUser.username}</p>
          <p className="text-sm text-gray-500 truncate">@{profileUser.username}</p>
          {profileUser.bio && (
            <p className="text-sm text-gray-600 truncate mt-1">{profileUser.bio}</p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant={profileUser.is_following ? 'outline' : 'default'}
        className={profileUser.is_following ? '' : 'bg-gradient-to-r from-purple-600 to-pink-600'}
        onClick={() => profileUser.is_following ? handleUnfollow(profileUser.id) : handleFollow(profileUser.id)}
        disabled={followingInProgress.has(profileUser.id)}
      >
        {followingInProgress.has(profileUser.id) ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : profileUser.is_following ? (
          <>
            <UserCheck className="w-4 h-4 mr-1" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-1" />
            Follow
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="people"
      />

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 pb-20 md:pb-6">
        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            {searchLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                <p className="text-gray-600 mt-2">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600">No users found</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs for Suggested, Following, Followers */}
        {!searchQuery && (
          <Tabs defaultValue="suggested" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="suggested">Suggested</TabsTrigger>
              <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
              <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="suggested" className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                  <p className="text-gray-600 mt-2">Loading suggestions...</p>
                </div>
              ) : suggestedUsers.length > 0 ? (
                suggestedUsers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-600">No suggestions available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="following" className="space-y-3">
              {following.length > 0 ? (
                following.map(user => (
                  <UserCard key={user.id} user={user} />
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-600">You're not following anyone yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="followers" className="space-y-3">
              {followers.length > 0 ? (
                followers.map(user => (
                  <UserCard key={user.id} user={user} />
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-600">No followers yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <MobileBottomNav currentPage="people" />
    </div>
  );
}
