import { Card, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ShoppingCart, Heart } from 'lucide-react';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCurrency } from '../contexts/CurrencyContext';

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  seller: {
    name: string;
    avatar: string;
  };
  category: string;
  rating?: number;
  reviews?: number;
  onAddToCart?: (id: number) => void;
  onProductClick?: (id: number) => void;
}

export function ProductCard({
  id,
  name,
  price,
  image,
  seller,
  category,
  rating = 4.5,
  reviews = 0,
  onAddToCart,
  onProductClick,
}: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const { formatPriceInUSD } = useCurrency();

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-gray-100" onClick={() => onProductClick?.(id)}>
        <ImageWithFallback
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
        <Badge className="absolute top-2 left-2 bg-white text-gray-900">{category}</Badge>
      </div>
      <CardContent className="p-4" onClick={() => onProductClick?.(id)}>
        <h3 className="text-lg mb-2 line-clamp-2">{name}</h3>
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
          <span className="text-yellow-500">★</span>
          <span>{rating}</span>
          <span>({reviews})</span>
        </div>
        <p className="text-sm text-gray-600 mb-1">by {seller.name}</p>
        <p className="text-2xl text-purple-600">{formatPriceInUSD(price)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(id);
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
