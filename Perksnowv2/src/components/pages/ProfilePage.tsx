import { Header } from '../Header';
import { MobileBottomNav } from '../MobileBottomNav';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Post } from '../Post';
import { ProductCard } from '../ProductCard';
import { Settings, MapPin, Link as LinkIcon, Calendar, Store, Users, Heart, UserPlus, UserMinus, Coins, Award, TrendingUp, Camera } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { uploadImage } from '@/lib/image-upload';

function formatTimestamp(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  return date.toLocaleDateString();
}

interface ProfilePageProps {
  onCartClick?: () => void;
  onAddToCart?: (id: number) => void;
  cartItemsCount?: number;
  isOwnProfile?: boolean;
}

export function ProfilePage({ onCartClick, onAddToCart, cartItemsCount }: ProfilePageProps) {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [userRank, setUserRank] = useState<string>('Member');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Determine if this is the current user's own profile
  const isOwnProfile = !userId || userId === user?.id;
  // The profile ID to fetch - either from URL param or current user
  const profileUserId = userId || user?.id;

  useEffect(() => {
    async function fetchProfile() {
      if (!profileUserId) return;

      try {
        setLoading(true);

        // Fetch user profile (could be current user or another user)
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', profileUserId)
          .single();

        if (profileError) throw profileError;
        setUserProfile(profile);
        setPointsBalance(profile?.points_balance || 0);

        // Determine user rank based on points
        const points = profile?.points_balance || 0;
        if (points >= 10000) setUserRank('Elite');
        else if (points >= 5000) setUserRank('Expert');
        else if (points >= 2000) setUserRank('Advanced');
        else if (points >= 500) setUserRank('Active');
        else setUserRank('Member');

        // Fetch user's posts
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            users:user_id (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('user_id', profileUserId)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        const transformedPosts = posts?.map((post: any) => ({
          id: post.id,
          author: {
            name: post.users?.full_name || post.users?.username || 'Unknown User',
            username: `@${post.users?.username || 'unknown'}`,
            avatar: post.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            userId: post.users?.id, // Add userId for navigation to profile
          },
          content: post.content,
          image: post.image_url, // Keep for backwards compatibility
          images: post.image_urls, // Use image_urls array for multiple images
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          shares: post.shares_count || 0,
          timestamp: formatTimestamp(post.created_at),
        })) || [];

        setUserPosts(transformedPosts);

        // Fetch user's products
        const { data: products, error: productsError} = await supabase
          .from('products')
          .select(`
            *,
            users:seller_id (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('seller_id', profileUserId)
          .eq('is_available', true)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        const transformedProducts = products?.map((product: any) => ({
          id: product.id,
          name: product.title,
          price: product.price,
          image: product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
          seller: {
            name: product.users?.full_name || product.users?.username || 'Unknown Seller',
            avatar: product.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          },
          category: product.category || 'General',
          rating: 4.5,
          reviews: 0,
        })) || [];

        setUserProducts(transformedProducts);

        // Set initial follower count
        setFollowersCount(profile?.followers_count || 0);

        // Check if current user is following this profile (if not own profile)
        if (!isOwnProfile && user) {
          const { data: followData, error: followError } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', profile.id)
            .maybeSingle();

          if (followError && followError.code !== 'PGRST116') {
            console.error('Error checking follow status:', followError);
          } else {
            setIsFollowing(!!followData);
          }
        }

      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [profileUserId, user, isOwnProfile]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }

    if (!userProfile) return;

    if (followLoading) return;

    try {
      setFollowLoading(true);

      if (isFollowing) {
        // Unfollow
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userProfile.id);

        if (deleteError) throw deleteError;

        // Update both users' counts
        // Decrement target user's follower count
        const { error: targetError } = await supabase
          .from('users')
          .update({ followers_count: Math.max(0, followersCount - 1) })
          .eq('id', userProfile.id);

        if (targetError) throw targetError;

        // Decrement current user's following count
        const { data: currentUserData } = await supabase
          .from('users')
          .select('following_count')
          .eq('id', user.id)
          .single();

        const { error: currentError } = await supabase
          .from('users')
          .update({ following_count: Math.max(0, (currentUserData?.following_count || 0) - 1) })
          .eq('id', user.id);

        if (currentError) throw currentError;

        setIsFollowing(false);
        setFollowersCount(Math.max(0, followersCount - 1));
        toast.success('Unfollowed successfully');
      } else {
        // Follow
        const { error: insertError } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userProfile.id,
          });

        if (insertError) throw insertError;

        // Update both users' counts
        // Increment target user's follower count
        const { error: targetError } = await supabase
          .from('users')
          .update({ followers_count: followersCount + 1 })
          .eq('id', userProfile.id);

        if (targetError) throw targetError;

        // Increment current user's following count
        const { data: currentUserData } = await supabase
          .from('users')
          .select('following_count')
          .eq('id', user.id)
          .single();

        const { error: currentError } = await supabase
          .from('users')
          .update({ following_count: (currentUserData?.following_count || 0) + 1 })
          .eq('id', user.id);

        if (currentError) throw currentError;

        setIsFollowing(true);
        setFollowersCount(followersCount + 1);
        toast.success('Following successfully');
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      toast.info('Uploading avatar...');

      // Upload to R2 (or Supabase as fallback)
      const imageUrl = await uploadImage(file, 'avatars', user.id);

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: imageUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setUserProfile({ ...userProfile, avatar_url: imageUrl });
      toast.success('Avatar updated successfully!');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      toast.info('Uploading cover photo...');

      // Upload to R2 (or Supabase as fallback) - using 'avatars' bucket for profile images
      const imageUrl = await uploadImage(file, 'avatars', user.id);

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ cover_image_url: imageUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setUserProfile({ ...userProfile, cover_image_url: imageUrl });
      toast.success('Cover photo updated successfully!');
    } catch (err: any) {
      console.error('Error uploading cover photo:', err);
      toast.error(err.message || 'Failed to upload cover photo');
    } finally {
      setUploading(false);
      // Reset input
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <Header
          onNavigate={(page) => navigate(`/${page}`)}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="profile"
        />
        <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6 text-center">
          Loading profile...
        </div>
      </div>
    );
  }

  const displayName = userProfile?.full_name || userProfile?.username || 'User';
  const username = userProfile?.username || 'user';
  const bio = userProfile?.bio || 'No bio yet';
  const avatarUrl = userProfile?.avatar_url;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="profile"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6">
        {/* Cover Photo */}
        <div className="bg-white rounded-lg overflow-hidden shadow-sm mb-6">
          <div className="h-48 sm:h-64 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 relative group">
            {userProfile?.cover_image_url && (
              <ImageWithFallback
                src={userProfile.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            )}
            {isOwnProfile && (
              <button
                className="absolute top-4 left-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>

          <div className="p-4 sm:p-6 pt-16 sm:pt-20">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-28 sm:-mt-32">
              <div className="relative group/avatar">
                <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white shadow-xl ring-2 ring-purple-100 hover:ring-purple-300 transition-all">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">{displayName[0]}</AvatarFallback>
                </Avatar>
                {isOwnProfile && (
                  <button
                    style={{
                      position: 'absolute',
                      top: '0.25rem',
                      right: '0.25rem',
                      backgroundColor: '#9333ea',
                      padding: '0.5rem',
                      borderRadius: '9999px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                    className="hover:bg-purple-700 transition-colors"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl sm:text-3xl font-bold">{displayName}</h1>
                      <Badge className={`${
                        userRank === 'Elite' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        userRank === 'Expert' ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
                        userRank === 'Advanced' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        userRank === 'Active' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        'bg-gray-500'
                      } text-white px-2 py-1 text-xs`}>
                        <Award className="w-3 h-3 mr-1" />
                        {userRank}
                      </Badge>
                    </div>
                    <p className="text-gray-500 mb-2 text-sm sm:text-base">@{username}</p>
                    <p className="text-gray-700 mb-3 text-sm sm:text-base">{bio}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {userProfile?.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{userProfile.location}</span>
                        </div>
                      )}
                      {userProfile?.website && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-4 h-4" />
                          <a href={userProfile.website} className="text-blue-600 hover:underline">
                            Website
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {new Date(userProfile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {isOwnProfile ? (
                    <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={isFollowing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gradient-to-r from-purple-600 to-pink-600'}
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 sm:gap-6 mt-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
                    <Coins className="w-5 h-5 text-purple-600" />
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-purple-700">{pointsBalance.toLocaleString()}</span>
                      <span className="text-xs text-purple-600">Points</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-bold text-base">{userProfile?.posts_count || 0}</span>
                    <span className="text-gray-600 text-xs">Posts</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-bold text-base">{followersCount}</span>
                    <span className="text-gray-600 text-xs">Followers</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-bold text-base">{userProfile?.following_count || 0}</span>
                    <span className="text-gray-600 text-xs">Following</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-bold text-base">{userProducts.length}</span>
                    <span className="text-gray-600 text-xs">Products</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Highlights */}
        {isOwnProfile && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rank</p>
                  <p className="font-bold text-lg">{userRank}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Coins className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Earned</p>
                  <p className="font-bold text-lg">{pointsBalance.toLocaleString()} pts</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Engagement</p>
                  <p className="font-bold text-lg">{followersCount + (userProfile?.following_count || 0)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="bg-white w-full justify-start">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="products">
              <Store className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="liked">
              <Heart className="w-4 h-4 mr-2" />
              Liked
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((post) => (
                <Post key={post.id} {...post} />
              ))
            ) : (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <Heart className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">No posts yet</p>
                  <p className="text-sm text-gray-500">
                    {isOwnProfile ? 'Share your first post to get started!' : 'This user hasn\'t posted anything yet.'}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {userProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {userProducts.map((product) => (
                  <ProductCard key={product.id} {...product} onAddToCart={onAddToCart} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-gray-100 rounded-full">
                    <Store className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">No products listed yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {isOwnProfile ? 'Start selling by creating your first product!' : 'This user hasn\'t listed any products yet.'}
                  </p>
                  {isOwnProfile && (
                    <Button onClick={() => navigate('/create-product')} className="bg-gradient-to-r from-purple-600 to-pink-600">
                      <Store className="w-4 h-4 mr-2" />
                      Create Product
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="liked">
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-gray-100 rounded-full">
                  <Heart className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-700">Liked posts feature coming soon</p>
                <p className="text-sm text-gray-500">
                  Save your favorite posts and find them here!
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        style={{ display: 'none' }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        style={{ display: 'none' }}
      />

      <MobileBottomNav currentPage="profile" />
    </div>
  );
}
