import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Post } from '../Post';
import { ProductCard } from '../ProductCard';
import { MobileBottomNav } from '../MobileBottomNav';
import { Settings, MapPin, Link as LinkIcon, Calendar, Store, Users, Heart } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
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
      setProducts(productsData || []);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Show loading state
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="profile"
        />
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
          <div className="h-48 sm:h-64 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 relative">
            {profile.cover_image_url ? (
              <ImageWithFallback
                src={profile.cover_image_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400" />
            )}
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 sm:-mt-20">
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white shadow-lg">
                <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
                <AvatarFallback>{profile.full_name?.substring(0, 2).toUpperCase() || profile.username?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>

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
                <Post key={post.id} {...post} author={post.users} />
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
                    {...product}
                    name={product.title}
                    seller={product.users}
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
