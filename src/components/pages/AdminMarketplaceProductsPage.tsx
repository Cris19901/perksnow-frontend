import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  Package,
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminMarketplaceProductsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

type ApprovalFilter = 'pending' | 'approved' | 'all';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string | null;
  images: string[] | null;
  image_url: string | null;
  stock_quantity: number;
  is_available: boolean;
  is_approved: boolean;
  created_at: string;
  seller: { username: string; full_name: string | null; email: string } | null;
}

export function AdminMarketplaceProductsPage({ onNavigate, onCartClick, cartItemsCount }: AdminMarketplaceProductsPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('pending');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, title, description, price, currency, category,
          images, image_url, stock_quantity, is_available, is_approved, created_at,
          seller:users!products_seller_id_fkey(username, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Pick<Product, 'is_approved' | 'is_available'>>) => {
    try {
      setUpdating(productId);
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updates } : p));

      if ('is_approved' in updates) {
        toast.success(updates.is_approved ? 'Product approved — now visible in marketplace' : 'Product rejected');
      } else if ('is_available' in updates) {
        toast.success(updates.is_available ? 'Product set to available' : 'Product hidden from marketplace');
      }
    } catch (err: any) {
      toast.error('Failed to update product');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = products.filter(product => {
    const matchesApproval =
      approvalFilter === 'all' ? true :
      approvalFilter === 'pending' ? !product.is_approved :
      product.is_approved;

    const searchLower = search.toLowerCase();
    const matchesSearch = !search
      || product.title.toLowerCase().includes(searchLower)
      || product.seller?.username?.toLowerCase().includes(searchLower)
      || product.category?.toLowerCase().includes(searchLower);

    return matchesApproval && matchesSearch;
  });

  const pendingCount = products.filter(p => !p.is_approved).length;
  const approvedCount = products.filter(p => p.is_approved).length;

  const getProductImage = (product: Product) => {
    if (product.images?.length) return product.images[0];
    if (product.image_url) return product.image_url;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="admin" />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-6">
        {/* Back */}
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-600" />
              Marketplace Products
            </h1>
            <p className="text-gray-500 text-sm mt-1">{products.length} total · {pendingCount} awaiting approval</p>
          </div>
          <Button onClick={fetchProducts} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && (
          <Card className="p-4 mb-5 bg-amber-50 border-amber-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              {pendingCount} product{pendingCount !== 1 ? 's' : ''} waiting for your approval before going live in the marketplace.
            </p>
          </Card>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'pending',  label: `Pending (${pendingCount})` },
            { key: 'approved', label: `Approved (${approvedCount})` },
            { key: 'all',      label: `All (${products.length})` },
          ] as { key: ApprovalFilter; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setApprovalFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                approvalFilter === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name, seller, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Products list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No products found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(product => {
              const isExpanded = expandedProduct === product.id;
              const thumb = getProductImage(product);

              return (
                <Card key={product.id} className="overflow-hidden">
                  <div
                    className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {thumb
                        ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                        : <Package className="w-6 h-6 text-gray-300 m-4" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{product.title}</p>
                        {!product.is_approved && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
                        )}
                        {product.is_approved && !product.is_available && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Hidden</span>
                        )}
                        {product.is_approved && product.is_available && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Live</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        by @{product.seller?.username || 'unknown'} · {product.category || 'Uncategorised'} · stock: {product.stock_quantity}
                      </p>
                    </div>

                    {/* Price + chevron */}
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 text-sm">₦{product.price.toLocaleString()}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                      {/* Description */}
                      {product.description && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{product.description}</p>
                        </div>
                      )}

                      {/* Seller info */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Seller</p>
                        <p className="text-sm text-gray-700">
                          @{product.seller?.username}
                          {product.seller?.full_name ? ` · ${product.seller.full_name}` : ''}
                          {product.seller?.email ? ` · ${product.seller.email}` : ''}
                        </p>
                      </div>

                      {/* Listed date */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Listed</p>
                        <p className="text-sm text-gray-700">
                          {new Date(product.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Actions</p>
                        <div className="flex flex-wrap gap-2">
                          {!product.is_approved && (
                            <Button
                              size="sm"
                              disabled={updating === product.id}
                              onClick={() => updateProduct(product.id, { is_approved: true, is_available: true })}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Approve & Publish
                            </Button>
                          )}
                          {!product.is_approved && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updating === product.id}
                              onClick={() => updateProduct(product.id, { is_approved: false, is_available: false })}
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          )}
                          {product.is_approved && product.is_available && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updating === product.id}
                              onClick={() => updateProduct(product.id, { is_available: false })}
                              className="text-xs"
                            >
                              <EyeOff className="w-3.5 h-3.5 mr-1" />
                              Hide from Marketplace
                            </Button>
                          )}
                          {product.is_approved && !product.is_available && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updating === product.id}
                              onClick={() => updateProduct(product.id, { is_available: true })}
                              className="text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Restore to Marketplace
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />
    </div>
  );
}
