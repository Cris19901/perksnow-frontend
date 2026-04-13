import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { ProductCard } from '../ProductCard';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import type { CartItem } from '../../App';

const categories = [
  'All Categories',
  'Fashion',
  'Electronics',
  'Home & Living',
  'Beauty',
  'Sports',
  'Books',
  'Food',
];

interface MarketplacePageProps {
  onAddToCart: (product: CartItem) => void;
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MarketplacePage({ onAddToCart, onNavigate, onCartClick, cartItemsCount }: MarketplacePageProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketplaceEnabled, setMarketplaceEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    checkMarketplaceEnabled();
  }, []);

  const checkMarketplaceEnabled = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'marketplace_enabled')
      .single();

    const enabled = data?.setting_value?.value === true;
    setMarketplaceEnabled(enabled);

    if (enabled) fetchProducts();
    else setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

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
        .eq('is_available', true)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const transformedProducts = productsData?.map((product: any) => ({
        product_id: product.id,
        seller_id: product.seller_id,
        name: product.title,
        price: product.price,
        image: product.images?.[0] || product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
        seller_name: product.users?.full_name || product.users?.username || 'Unknown Seller',
        seller_avatar: product.users?.avatar_url,
        category: product.category || 'General',
        rating: product.rating || 0,
        reviews: product.reviews_count || 0,
        rawProduct: {
          ...product,
          name: product.title,
          seller: {
            name: product.users?.full_name || product.users?.username || 'Unknown Seller',
            avatar: product.users?.avatar_url || '',
          },
          images: product.images || (product.image_url ? [product.image_url] : []),
          inStock: (product.stock_quantity || 0) > 0,
        },
      })) || [];

      setProducts(transformedProducts);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Coming soon screen when marketplace is disabled
  if (marketplaceEnabled === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="marketplace" />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Marketplace Coming Soon</h1>
          <p className="text-gray-500 max-w-sm">
            We're putting the finishing touches on our marketplace. Check back soon to discover amazing products from our community!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="marketplace"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl mb-2">Marketplace</h1>
          <p className="text-sm sm:text-base text-gray-600">Discover amazing products from our community</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 sm:mb-6 scrollbar-hide">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap ${
                selectedCategory === category ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600">Error: {error}</p>
            <button onClick={fetchProducts} className="mt-2 text-red-700 underline">Try again</button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.product_id}
                  {...product}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found matching your criteria</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
