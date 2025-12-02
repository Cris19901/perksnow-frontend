import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { ProductCard } from '../ProductCard';
import { ProductFilters, FilterOptions } from '../ProductFilters';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const categories = [
  'Fashion',
  'Electronics',
  'Home & Living',
  'Beauty',
  'Sports',
  'Books',
  'Food',
];

interface MarketplacePageProps {
  onAddToCart: (id: number) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MarketplacePage({ onAddToCart, onCartClick, cartItemsCount }: MarketplacePageProps) {
  const navigate = useNavigate();
  // Marketplace page with product filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    minPrice: 0,
    maxPrice: 10000,
    sortBy: 'newest',
  });

  useEffect(() => {
    async function fetchProducts() {
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
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        // Transform products data to match the ProductCard component format
        const transformedProducts = productsData?.map((product: any) => ({
          id: product.id,
          name: product.title,
          price: product.price,
          image: product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
          seller: {
            name: product.users?.full_name || product.users?.username || 'Unknown Seller',
            avatar: product.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          },
          category: product.category || 'General',
          rating: 4.5, // Default rating (you can add a ratings table later)
          reviews: 0, // Default reviews count (you can add a reviews table later)
        })) || [];

        setProducts(transformedProducts);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const filteredProducts = products
    .filter((product) => {
      const matchesCategory = filters.category === 'all' || product.category === filters.category;
      const matchesPrice = product.price >= filters.minPrice && product.price <= filters.maxPrice;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesPrice && matchesSearch;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'popular':
          return b.rating - a.rating;
        case 'newest':
        default:
          return 0; // Already sorted by created_at DESC from database
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
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

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Main Content Area with Filters Sidebar */}
        <div className="flex gap-6">
          {/* Filters Sidebar (Desktop) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <ProductFilters
              filters={filters}
              onFilterChange={setFilters}
              categories={categories}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Mobile Filters Button */}
            <div className="lg:hidden mb-4">
              <ProductFilters
                filters={filters}
                onFilterChange={setFilters}
                categories={categories}
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading products...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600">Error: {error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-red-700 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Products Grid */}
            {!loading && !error && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      {...product}
                      onAddToCart={onAddToCart}
                      onProductClick={(id) => navigate(`/product/${id}`)}
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
      </div>
    </div>
  );
}
