import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ShoppingCart, Heart, Share2, Store, Star } from 'lucide-react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCurrency } from '../contexts/CurrencyContext';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  seller: {
    name: string;
    avatar: string;
    rating?: number;
  };
  category: string;
  description?: string;
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  images?: string[];
}

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart?: (id: number) => void;
}

const mockReviews = [
  {
    id: 1,
    author: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    rating: 5,
    comment: 'Absolutely love this product! Quality is amazing and delivery was super fast.',
    date: '2 days ago',
  },
  {
    id: 2,
    author: 'Mike Wilson',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    rating: 4,
    comment: 'Great product, exactly as described. Would recommend!',
    date: '1 week ago',
  },
  {
    id: 3,
    author: 'Emma Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    rating: 5,
    comment: 'Excellent quality and the seller was very responsive to my questions.',
    date: '2 weeks ago',
  },
];

export function ProductDetailModal({ product, open, onOpenChange, onAddToCart }: ProductDetailModalProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const { formatPriceInUSD } = useCurrency();

  if (!product) return null;

  const images = product.images || [product.image];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Product details for {product.name}
        </DialogDescription>
        
        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Images Section */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
              <ImageWithFallback
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              </button>
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      selectedImage === idx ? 'border-purple-600' : 'border-gray-200'
                    }`}
                  >
                    <ImageWithFallback src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="space-y-6">
            <div>
              <Badge className="mb-2">{product.category}</Badge>
              <h2 className="text-3xl mb-2">{product.name}</h2>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span>{product.rating || 4.5}</span>
                  <span className="text-gray-500">({product.reviews || 0} reviews)</span>
                </div>
                <span className={`text-sm ${product.inStock !== false ? 'text-green-600' : 'text-red-600'}`}>
                  {product.inStock !== false ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <p className="text-4xl text-purple-600 mb-4">{formatPriceInUSD(product.price)}</p>

              <p className="text-gray-600 mb-6">
                {product.description || 'High quality product with excellent craftsmanship. Perfect for everyday use and built to last.'}
              </p>
            </div>

            {/* Seller Info */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={product.seller.avatar} />
                  <AvatarFallback>{product.seller.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">Sold by</p>
                  <p>{product.seller.name}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Store className="w-4 h-4" />
                  Visit Shop
                </Button>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span>{product.seller.rating || 4.8} seller rating</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 gap-2"
                size="lg"
                onClick={() => onAddToCart?.(product.id)}
                disabled={product.inStock === false}
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Additional Info */}
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>Free shipping on orders over $50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery</span>
                <span>3-5 business days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Returns</span>
                <span>30-day return policy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t p-6">
          <Tabs defaultValue="reviews">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="reviews">Reviews ({mockReviews.length})</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="shipping">Shipping Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reviews" className="space-y-4 mt-4">
              {mockReviews.map((review) => (
                <div key={review.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={review.avatar} />
                      <AvatarFallback>{review.author[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p>{review.author}</p>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="description" className="mt-4">
              <p className="text-gray-600">
                {product.description || 'This is a high-quality product made with premium materials. It features excellent craftsmanship and attention to detail. Perfect for both casual and professional use.'}
              </p>
            </TabsContent>
            
            <TabsContent value="shipping" className="mt-4">
              <div className="space-y-2 text-sm">
                <p><strong>Standard Shipping:</strong> 3-5 business days - Free on orders over $50</p>
                <p><strong>Express Shipping:</strong> 1-2 business days - $15.99</p>
                <p><strong>International Shipping:</strong> 7-14 business days - Calculated at checkout</p>
                <p className="text-gray-600 mt-4">All orders are processed within 24 hours. You will receive a tracking number once your order ships.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
