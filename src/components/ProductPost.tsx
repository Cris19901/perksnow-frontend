import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, MessageCircle, Share2, ShoppingCart, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCurrency } from '../contexts/CurrencyContext';

interface ProductPostProps {
  id: number;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  product: {
    name: string;
    price: number;
    image: string;
    category: string;
  };
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  onAddToCart?: (productId: number) => void;
}

export function ProductPost({
  author,
  content,
  product,
  likes,
  comments,
  shares,
  timestamp,
  onAddToCart,
  id,
}: ProductPostProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const { formatPriceInUSD } = useCurrency();

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p>{author.name}</p>
            <p className="text-sm text-gray-500">{timestamp}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap mb-3">{content}</p>
      </div>

      {/* Product Card */}
      <div className="mx-4 mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid sm:grid-cols-[200px_1fr] gap-4">
          <div className="relative aspect-square sm:aspect-auto bg-gray-100">
            <ImageWithFallback
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <Badge className="absolute top-2 left-2 bg-white text-gray-900">
              {product.category}
            </Badge>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-lg mb-2">{product.name}</h3>
              <p className="text-2xl text-purple-600 mb-2">{formatPriceInUSD(product.price)}</p>
            </div>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 gap-2 w-full sm:w-auto"
              onClick={() => onAddToCart?.(id)}
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>

      {/* Post Stats */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
              <Heart className="w-3 h-3 text-white fill-white" />
            </div>
          </div>
          <span className="text-sm text-gray-500 ml-1">{likeCount}</span>
        </div>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{comments} comments</span>
          <span>{shares} shares</span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-around px-4 py-2">
        <Button
          variant="ghost"
          className={`flex-1 gap-2 ${isLiked ? 'text-pink-600' : ''}`}
          onClick={handleLike}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-600' : ''}`} />
          <span className="hidden sm:inline">Like</span>
        </Button>
        <Button variant="ghost" className="flex-1 gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="hidden sm:inline">Comment</span>
        </Button>
        <Button variant="ghost" className="flex-1 gap-2">
          <Share2 className="w-5 h-5" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>
    </div>
  );
}
