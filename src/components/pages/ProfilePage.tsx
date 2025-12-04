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

const mockUserPosts = [
  {
    id: 1,
    author: {
      name: 'John Smith',
      username: '@johnsmith',
      avatar: 'https://images.unsplash.com/photo-1653691040409-793d2c22ed69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZXxlbnwxfHx8fDE3NjI1OTM0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    },
    content: 'Just launched my new product line! Check out my shop for amazing deals. 🎉',
    image: 'https://images.unsplash.com/photo-1656360088744-f99fc89d56d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0JTIwc2hvcHBpbmd8ZW58MXx8fHwxNzYyNTIzNzczfDA&ixlib=rb-4.1.0&q=80&w=1080',
    likes: 234,
    comments: 45,
    shares: 12,
    timestamp: '2 hours ago',
  },
];

const mockUserProducts = [
  {
    id: 1,
    name: 'Wireless Headphones',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1717295248302-543d5a49091f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljcyUyMGdhZGdldHN8ZW58MXx8fHwxNzYyNTM0MTIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: { name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1653691040409-793d2c22ed69?w=150' },
    category: 'Electronics',
    rating: 4.8,
    reviews: 342,
  },
  {
    id: 2,
    name: 'Vintage Camera',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600',
    seller: { name: 'John Smith', avatar: 'https://images.unsplash.com/photo-1653691040409-793d2c22ed69?w=150' },
    category: 'Electronics',
    rating: 4.9,
    reviews: 156,
  },
];

interface ProfilePageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  onAddToCart?: (id: number) => void;
  cartItemsCount?: number;
  isOwnProfile?: boolean;
}

export function ProfilePage({ onNavigate, onCartClick, onAddToCart, cartItemsCount, isOwnProfile = true }: ProfilePageProps) {
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
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1676912002444-6a54ce34f5a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2VyJTIwcHJvZmlsZSUyMGJhbm5lcnxlbnwxfHx8fDE3NjI2MDkwMjZ8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 sm:-mt-20">
              <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-white shadow-lg">
                <AvatarImage src="https://images.unsplash.com/photo-1653691040409-793d2c22ed69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZXxlbnwxfHx8fDE3NjI1OTM0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080" />
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl mb-1">John Smith</h1>
                    <p className="text-gray-500 mb-2">@johnsmith</p>
                    <p className="text-gray-700 mb-3">
                      Digital creator & entrepreneur 🚀 | Selling quality products | Based in San Francisco
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>San Francisco, CA</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <LinkIcon className="w-4 h-4" />
                        <a href="#" className="text-purple-600 hover:underline">
                          johnsmith.shop
                        </a>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Joined January 2024</span>
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
                    <p className="text-xl sm:text-2xl">234</p>
                    <p className="text-sm text-gray-500">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl">1.2K</p>
                    <p className="text-sm text-gray-500">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl">456</p>
                    <p className="text-sm text-gray-500">Following</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl">89</p>
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
            {mockUserPosts.map((post) => (
              <Post key={post.id} {...post} />
            ))}
          </TabsContent>

          <TabsContent value="products">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {mockUserProducts.map((product) => (
                <ProductCard key={product.id} {...product} onAddToCart={onAddToCart} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="about">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl mb-4">About</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm mb-2">Bio</h3>
                  <p className="text-gray-700">
                    Passionate entrepreneur and digital creator. I love creating and sharing quality products with the community. 
                    Check out my shop for unique items and exclusive deals!
                  </p>
                </div>
                <div>
                  <h3 className="text-sm mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Electronics</Badge>
                    <Badge>Fashion</Badge>
                    <Badge>Home Decor</Badge>
                    <Badge>Lifestyle</Badge>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm mb-2">Seller Rating</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Heart key={i} className="w-4 h-4 fill-red-500 text-red-500" />
                      ))}
                    </div>
                    <span>4.9/5.0 (342 reviews)</span>
                  </div>
                </div>
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
