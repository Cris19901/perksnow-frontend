import { Header } from '../Header';
import { ProductCard } from '../ProductCard';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/badge';

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

const products = [
  {
    id: 1,
    name: 'Wireless Noise-Cancelling Headphones',
    price: 199.99,
    image: 'https://images.unsplash.com/photo-1717295248302-543d5a49091f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljcyUyMGdhZGdldHN8ZW58MXx8fHwxNzYyNTM0MTIxfDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: { name: 'TechStore', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    category: 'Electronics',
    rating: 4.8,
    reviews: 342,
  },
  {
    id: 2,
    name: 'Summer Floral Maxi Dress',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmd8ZW58MXx8fHwxNzYyNTczMzM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: { name: 'FashionHub', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    category: 'Fashion',
    rating: 4.6,
    reviews: 128,
  },
  {
    id: 3,
    name: 'Modern Minimalist Table Lamp',
    price: 45.99,
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwZGVjb3J8ZW58MXx8fHwxNzYyNTE4MzY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    seller: { name: 'HomeDecor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    category: 'Home & Living',
    rating: 4.7,
    reviews: 89,
  },
  {
    id: 4,
    name: 'Organic Cotton T-Shirt Pack (3pc)',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    seller: { name: 'EcoWear', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    category: 'Fashion',
    rating: 4.9,
    reviews: 456,
  },
  {
    id: 5,
    name: 'Smart Fitness Watch',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    seller: { name: 'FitTech', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    category: 'Electronics',
    rating: 4.5,
    reviews: 234,
  },
  {
    id: 6,
    name: 'Handcrafted Ceramic Mug Set',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600',
    seller: { name: 'Artisan Crafts', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    category: 'Home & Living',
    rating: 4.8,
    reviews: 67,
  },
  {
    id: 7,
    name: 'Premium Yoga Mat with Strap',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600',
    seller: { name: 'YogaLife', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150' },
    category: 'Sports',
    rating: 4.7,
    reviews: 189,
  },
  {
    id: 8,
    name: 'Vintage Leather Backpack',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600',
    seller: { name: 'UrbanStyle', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
    category: 'Fashion',
    rating: 4.6,
    reviews: 145,
  },
];

interface MarketplacePageProps {
  onAddToCart: (id: number) => void;
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MarketplacePage({ onAddToCart, onNavigate, onCartClick, cartItemsCount }: MarketplacePageProps) {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
                selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                  : ''
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} {...product} onAddToCart={onAddToCart} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
