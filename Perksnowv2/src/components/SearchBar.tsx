import { useState, useEffect, useRef } from 'react';
import { Search, X, User, ShoppingBag, FileText } from 'lucide-react';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { supabase } from '@/lib/supabase';
import { useCurrency } from '@/contexts/CurrencyContext';

interface SearchBarProps {
  onNavigate?: (page: string) => void;
}

interface SearchResult {
  type: 'user' | 'product' | 'post';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  price?: number;
}

export function SearchBar({ onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { formatPriceInUSD } = useCurrency();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search functionality
  useEffect(() => {
    const searchData = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchTerm = `%${query}%`;
        const allResults: SearchResult[] = [];

        // Search users
        const { data: users } = await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .or(`username.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
          .limit(5);

        if (users) {
          allResults.push(...users.map(user => ({
            type: 'user' as const,
            id: user.id,
            title: user.full_name || user.username,
            subtitle: `@${user.username}`,
            image: user.avatar_url,
          })));
        }

        // Search products
        const { data: products } = await supabase
          .from('products')
          .select('id, title, price, image_url, category')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .eq('is_available', true)
          .limit(5);

        if (products) {
          allResults.push(...products.map(product => ({
            type: 'product' as const,
            id: product.id,
            title: product.title,
            subtitle: product.category,
            image: product.image_url,
            price: product.price,
          })));
        }

        // Search posts
        const { data: posts } = await supabase
          .from('posts')
          .select('id, content, image_url')
          .ilike('content', searchTerm)
          .limit(5);

        if (posts) {
          allResults.push(...posts.map(post => ({
            type: 'post' as const,
            id: post.id,
            title: post.content?.substring(0, 60) + (post.content?.length > 60 ? '...' : ''),
            image: post.image_url,
          })));
        }

        setResults(allResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');

    if (result.type === 'user') {
      onNavigate?.('profile');
    } else if (result.type === 'product') {
      onNavigate?.('marketplace');
    } else if (result.type === 'post') {
      onNavigate?.('feed');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'product': return <ShoppingBag className="w-4 h-4" />;
      case 'post': return <FileText className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search users, products, posts..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="pl-10 pr-10 w-full"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-left transition-colors"
                >
                  {result.image ? (
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={result.image} />
                      <AvatarFallback>
                        {getIcon(result.type)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getIcon(result.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs text-gray-500 truncate">{result.subtitle}</div>
                    )}
                    {result.price !== undefined && (
                      <div className="text-sm text-purple-600 font-medium">
                        {formatPriceInUSD(result.price)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 capitalize flex-shrink-0">
                    {result.type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
