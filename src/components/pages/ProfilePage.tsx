import { useState, useEffect, useRef } from 'react';
import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Post } from '../Post';
import { ProductCard } from '../ProductCard';
import { MobileBottomNav } from '../MobileBottomNav';
import { Settings, MapPin, Link as LinkIcon, Calendar, Store, Users, Heart, Camera, Plus } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image-upload';
import { toast } from 'sonner';

interface ProfilePageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  onAddToCart?: (id: number) => void;
  cartItemsCount?: number;
  isOwnProfile?: boolean;
}

export function ProfilePage({ onNavigate, onCartClick, onAddToCart, cartItemsCount, isOwnProfile = true }: ProfilePageProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('🔍 ProfilePage: User state:', user ? `Logged in as ${user.id}` : 'Not logged in');
    if (user) {
      fetchProfileData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 ProfilePage: Fetching profile data for user:', user?.id);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error('❌ ProfilePage: Error fetching profile:', profileError);
        throw profileError;
      }
      console.log('✅ ProfilePage: Profile data:', profileData);
      setProfile(profileData);

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
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
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Fetch user's products
      const { data: productsData, error: productsError } = await supabase
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
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false});

      if (productsError) throw productsError;
      console.log('✅ ProfilePage: Products fetched:', productsData?.length || 0);
      setProducts(productsData || []);

    } catch (error: any) {
      console.error('❌ ProfilePage: Error fetching profile data:', error);
      setError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      toast.loading('Uploading profile picture...');

      // Upload to R2
      const avatarUrl = await uploadImage(file, 'avatars', user.id);

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile({ ...profile, avatar_url: avatarUrl });
      toast.dismiss();
      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.dismiss();
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    try {
      setUploadingCover(true);
      toast.loading('Uploading cover photo...');

      // Upload to R2
      const coverUrl = await uploadImage(file, 'covers', user.id);

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({ cover_image_url: coverUrl })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile({ ...profile, cover_image_url: coverUrl });
      toast.dismiss();
      toast.success('Cover photo updated!');
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast.dismiss();
      toast.error('Failed to upload cover photo');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="profile"
        />
        <div className="flex items-center justify-center h-[calc(100vh-200px)] px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
            <p className="text-red-600 font-semibold mb-2">Error Loading Profile</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <Button onClick={() => fetchProfileData()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
        <MobileBottomNav currentPage="profile" onNavigate={onNavigate} />
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="profile"
        />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
        <MobileBottomNav currentPage="profile" onNavigate={onNavigate} />
      </div>
    );
  }

  // Show not logged in state
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="profile"
        />
        <div className="flex items-center justify-center h-[calc(100vh-200px)] px-4">
          <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md text-center">
            <p className="text-gray-600 mb-4">Please log in to view your profile</p>
            <Button onClick={() => onNavigate?.('feed')} className="bg-purple-600 hover:bg-purple-700">
              Go to Home
            </Button>
          </div>
        </div>
        <MobileBottomNav currentPage="profile" onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="profile"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6 pb-20 md:pb-6">
        {/* Cover Photo */}
        <div className="bg-white rounded-lg overflow-hidden shadow-sm mb-6">
          <div className="h-48 sm:h-64 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 relative group">
            {profile.cover_image_url ? (
              <ImageWithFallback
                src={profile.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400" />
            )}

            {/* Upload Cover Photo Button */}
            {isOwnProfile && (
              <>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="absolute bottom-4 right-4 p-3 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                  title="Change cover photo"
                >
                  {uploadingCover ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
              </>
            )}
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 sm:-mt-20">
              <div className="relative group">
                <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
                  <AvatarFallback>{profile.full_name?.substring(0, 2).toUpperCase() || profile.username?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>

                {/* Upload Avatar Button */}
                {isOwnProfile && (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-1 right-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
                      title="Change profile picture"
                    >
                      {uploadingAvatar ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">{profile.full_name || profile.username}</h1>
                    <p className="text-gray-500 mb-2">@{profile.username}</p>
                    <p className="text-gray-700 mb-3">
                      {profile.bio || 'No bio yet'}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile.website && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-4 h-4" />
                          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                            {profile.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {formatDate(profile.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <>
                        <Button variant="outline" className="gap-2">
                          <Settings className="w-4 h-4" />
                          <span className="hidden sm:inline">Edit Profile</span>
                        </Button>
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 gap-2">
                          <Store className="w-4 h-4" />
                          <span className="hidden sm:inline">My Shop</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline">Message</Button>
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600">Follow</Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">{profile.posts_count || 0}</p>
                    <p className="text-sm text-gray-500">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">{profile.followers_count || 0}</p>
                    <p className="text-sm text-gray-500">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">{profile.following_count || 0}</p>
                    <p className="text-sm text-gray-500">Following</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">{products.length}</p>
                    <p className="text-sm text-gray-500">Products</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 w-full sm:w-auto">
            <TabsTrigger value="posts" className="flex-1 sm:flex-initial">Posts</TabsTrigger>
            <TabsTrigger value="products" className="flex-1 sm:flex-initial">Products</TabsTrigger>
            <TabsTrigger value="about" className="flex-1 sm:flex-initial">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            {posts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600">No posts yet</p>
              </div>
            ) : (
              posts.map((post) => (
                <Post
                  key={post.id}
                  id={post.id}
                  content={post.content || ''}
                  image={post.image_url}
                  likes={post.likes_count || 0}
                  comments={post.comments_count || 0}
                  shares={post.shares_count || 0}
                  timestamp={post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Just now'}
                  author={{
                    name: post.users?.full_name || post.users?.username || 'Unknown',
                    username: post.users?.username || 'unknown',
                    avatar: post.users?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`,
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="products">
            {products.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600">No products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.title || product.name || 'Untitled'}
                    price={product.price || 0}
                    image={product.image_url || product.images?.[0] || ''}
                    category={product.category || 'Other'}
                    rating={product.rating || 4.5}
                    reviews={product.reviews_count || 0}
                    seller={{
                      name: product.users?.full_name || product.users?.username || 'Unknown',
                      avatar: product.users?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.seller_id}`,
                    }}
                    onAddToCart={onAddToCart}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="about">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">About</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2">Bio</h3>
                  <p className="text-gray-700">
                    {profile.bio || 'No bio provided yet.'}
                  </p>
                </div>
                {profile.location && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Location</h3>
                    <p className="text-gray-700">{profile.location}</p>
                  </div>
                )}
                {profile.website && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Website</h3>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                      {profile.website}
                    </a>
                  </div>
                )}
                {profile.is_verified && (
                  <div>
                    <Badge className="bg-blue-100 text-blue-800">Verified Account</Badge>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentPage="profile" onNavigate={onNavigate} />
    </div>
  );
}
