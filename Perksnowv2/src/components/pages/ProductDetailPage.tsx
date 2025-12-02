import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ShoppingCart, Heart, Share2, MapPin, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ProductDetailPageProps {
  onCartClick?: () => void;
  onAddToCart?: (id: number) => void;
  cartItemsCount?: number;
}

export function ProductDetailPage({ onCartClick, onAddToCart, cartItemsCount }: ProductDetailPageProps) {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPriceInUSD } = useCurrency();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) return;

      try {
        setLoading(true);

        // Fetch product with seller information
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            users:seller_id (
              id,
              username,
              full_name,
              avatar_url,
              location
            )
          `)
          .eq('id', productId)
          .single();

        if (productError) throw productError;

        setProduct(productData);
      } catch (err) {
        console.error('Error fetching product:', err);
        toast.error('Failed to load product');
        navigate('/marketplace');
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [productId, navigate]);

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart?.(product.id);
    toast.success('Added to cart!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={(page) => navigate(`/${page}`)}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="marketplace"
        />
        <div className="max-w-[1400px] mx-auto px-4 py-8 text-center">
          Loading product...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={(page) => navigate(`/${page}`)}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="marketplace"
        />
        <div className="max-w-[1400px] mx-auto px-4 py-8 text-center">
          Product not found
        </div>
      </div>
    );
  }

  const seller = product.users;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="marketplace"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/marketplace')}
          className="mb-4"
        >
          ← Back to Marketplace
        </Button>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Product Image */}
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <ImageWithFallback
                src={product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              <Badge className="absolute top-4 left-4 bg-white text-gray-900">
                {product.category || 'General'}
              </Badge>
              {!product.is_available && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    Sold Out
                  </Badge>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                <p className="text-4xl text-purple-600 font-bold mb-4">
                  {formatPriceInUSD(product.price)}
                </p>

                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">(4.5 out of 5)</span>
                </div>

                <div className="prose max-w-none mb-6">
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {product.description || 'No description available'}
                  </p>
                </div>

                {/* Seller Info */}
                <div className="border-t pt-6 mb-6">
                  <h3 className="text-lg font-semibold mb-3">Seller Information</h3>
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                    onClick={() => seller?.id && navigate(`/profile/${seller.id}`)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={seller?.avatar_url} />
                      <AvatarFallback>
                        {seller?.full_name?.[0] || seller?.username?.[0] || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {seller?.full_name || seller?.username || 'Unknown Seller'}
                      </p>
                      <p className="text-sm text-gray-500">
                        @{seller?.username || 'unknown'}
                      </p>
                      {seller?.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>{seller.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.is_available}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {product.is_available ? 'Add to Cart' : 'Sold Out'}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsLiked(!isLiked)}
                  className={isLiked ? 'text-pink-600' : ''}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-600' : ''}`} />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
