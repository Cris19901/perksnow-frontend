import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ShoppingCart, Heart, Star, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import type { CartItem } from '../App';

interface Product {
  id: string;
  seller_id?: string;
  name: string;
  price: number;
  image?: string;
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

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { username: string; avatar_url: string | null } | null;
}

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart?: (product: CartItem) => void;
}

export function ProductDetailModal({ product, open, onOpenChange, onAddToCart }: ProductDetailModalProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (open && product?.id) {
      fetchReviews(product.id);
    }
  }, [open, product?.id]);

  const fetchReviews = async (productId: string) => {
    setReviewsLoading(true);
    const { data } = await supabase
      .from('product_reviews')
      .select(`id, rating, comment, created_at, reviewer:users!product_reviews_reviewer_id_fkey(username, avatar_url)`)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    setReviews((data as any) || []);
    setReviewsLoading(false);
  };

  const submitReview = async () => {
    if (!user || !product) return;
    if (newRating === 0) { toast.error('Please select a rating'); return; }
    try {
      setSubmittingReview(true);
      const { error } = await supabase
        .from('product_reviews')
        .insert({ product_id: product.id, reviewer_id: user.id, rating: newRating, comment: newComment.trim() || null });
      if (error) {
        if (error.code === '23505') toast.error('You have already reviewed this product');
        else throw error;
        return;
      }
      toast.success('Review submitted!');
      setNewRating(0);
      setNewComment('');
      fetchReviews(product.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

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

              <p className="text-4xl text-purple-600 mb-4">₦{product.price.toLocaleString()}</p>

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
                onClick={() => onAddToCart?.({
                  product_id: product.id,
                  seller_id: product.seller_id || '',
                  name: product.name,
                  price: product.price,
                  image: product.images?.[0] || product.image || '',
                  quantity: 1,
                  seller_name: product.seller?.name || '',
                })}
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
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="shipping">Shipping Info</TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="mt-4 space-y-4">
              {/* Write a review */}
              {user && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <p className="text-sm font-medium mb-2">Leave a Review</p>
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} onClick={() => setNewRating(i + 1)}>
                        <Star className={`w-6 h-6 ${i < newRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Share your experience with this product..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="mt-2 bg-purple-600 hover:bg-purple-700"
                    disabled={submittingReview || newRating === 0}
                    onClick={submitReview}
                  >
                    {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Submit Review
                  </Button>
                </div>
              )}

              {/* Reviews list */}
              {reviewsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No reviews yet. Be the first to review this product!</p>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                        <AvatarFallback>{review.reviewer?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">@{review.reviewer?.username || 'User'}</p>
                          <span className="text-xs text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="description" className="mt-4">
              <p className="text-gray-600">
                {product.description || 'No description provided for this product.'}
              </p>
            </TabsContent>

            <TabsContent value="shipping" className="mt-4">
              <div className="space-y-2 text-sm">
                <p><strong>Standard Shipping:</strong> 3-7 business days — ₦1,500</p>
                <p><strong>Processing Time:</strong> 1-2 business days before dispatch</p>
                <p><strong>Returns:</strong> Contact seller within 7 days of delivery</p>
                <p className="text-gray-500 mt-3">All orders are confirmed once payment is verified. You will receive updates on your order status.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
