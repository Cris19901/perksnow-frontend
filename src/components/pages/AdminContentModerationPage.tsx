import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MobileBottomNav } from '../MobileBottomNav';
import { Input } from '../ui/input';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  MessageSquare,
  Image as ImageIcon,
  Video,
  ShoppingBag,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ContentModerationPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

type ContentType = 'posts' | 'reels' | 'products' | 'comments';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
}

interface Reel {
  id: string;
  user_id: string;
  title: string;
  description: string;
  video_url: string;
  created_at: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  views_count: number;
}

interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url: string | null;
  created_at: string;
  seller: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  is_available: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function AdminContentModerationPage({
  onNavigate,
  onCartClick,
  cartItemsCount
}: ContentModerationPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ContentType>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    fetchContent();
  }, [activeTab]);

  const fetchContent = async () => {
    try {
      setLoading(true);

      if (activeTab === 'posts') {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            user_id,
            content,
            image_url,
            created_at,
            likes_count,
            comments_count,
            user:users!posts_user_id_fkey (
              username,
              full_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setPosts(data || []);
      } else if (activeTab === 'reels') {
        const { data, error } = await supabase
          .from('reels')
          .select(`
            id,
            user_id,
            title,
            description,
            video_url,
            created_at,
            likes_count,
            views_count,
            user:users!reels_user_id_fkey (
              username,
              full_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setReels(data || []);
      } else if (activeTab === 'products') {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            seller_id,
            title,
            description,
            price,
            currency,
            image_url,
            created_at,
            is_available,
            seller:users!products_seller_id_fkey (
              username,
              full_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setProducts(data || []);
      } else if (activeTab === 'comments') {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            id,
            user_id,
            post_id,
            content,
            created_at,
            user:users!comments_user_id_fkey (
              username,
              full_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setComments(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching content:', err);
      toast.error(`Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Post deleted successfully');
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err: any) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post');
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!confirm('Are you sure you want to delete this reel? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reels')
        .delete()
        .eq('id', reelId);

      if (error) throw error;

      toast.success('Reel deleted successfully');
      setReels(reels.filter(r => r.id !== reelId));
    } catch (err: any) {
      console.error('Error deleting reel:', err);
      toast.error('Failed to delete reel');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      setProducts(products.filter(p => p.id !== productId));
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error('Failed to delete product');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted successfully');
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReels = reels.filter(reel =>
    reel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reel.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reel.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.seller.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredComments = comments.filter(comment =>
    comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comment.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { type: ContentType; label: string; icon: any; count: number }[] = [
    { type: 'posts', label: 'Posts', icon: ImageIcon, count: posts.length },
    { type: 'reels', label: 'Reels', icon: Video, count: reels.length },
    { type: 'products', label: 'Products', icon: ShoppingBag, count: products.length },
    { type: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="admin"
      />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>

          <h1 className="text-3xl font-bold mb-2">Content Moderation</h1>
          <p className="text-gray-600">Review and manage user-generated content</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <Button
              key={tab.type}
              variant={activeTab === tab.type ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.type)}
              className="flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/20">
                {tab.count}
              </span>
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Posts */}
            {activeTab === 'posts' && (
              <>
                {filteredPosts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No posts found</p>
                  </Card>
                ) : (
                  filteredPosts.map((post) => (
                    <Card key={post.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={post.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.username}`}
                          alt={post.user.username}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold">{post.user.full_name || post.user.username}</p>
                              <p className="text-sm text-gray-500">@{post.user.username}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeletePost(post.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-2">{post.content}</p>
                          {post.image_url && (
                            <img
                              src={post.image_url}
                              alt="Post"
                              className="w-full max-w-md rounded-lg mb-2"
                            />
                          )}
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>{post.likes_count} likes</span>
                            <span>{post.comments_count} comments</span>
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}

            {/* Reels */}
            {activeTab === 'reels' && (
              <>
                {filteredReels.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No reels found</p>
                  </Card>
                ) : (
                  filteredReels.map((reel) => (
                    <Card key={reel.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={reel.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reel.user.username}`}
                          alt={reel.user.username}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold">{reel.user.full_name || reel.user.username}</p>
                              <p className="text-sm text-gray-500">@{reel.user.username}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteReel(reel.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <h3 className="font-semibold mb-1">{reel.title}</h3>
                          <p className="text-gray-700 mb-2">{reel.description}</p>
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>{reel.likes_count} likes</span>
                            <span>{reel.views_count} views</span>
                            <span>{new Date(reel.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}

            {/* Products */}
            {activeTab === 'products' && (
              <>
                {filteredProducts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No products found</p>
                  </Card>
                ) : (
                  filteredProducts.map((product) => (
                    <Card key={product.id} className="p-4">
                      <div className="flex items-start gap-4">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{product.title}</h3>
                              <p className="text-sm text-gray-500">
                                by @{product.seller.username}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-2">{product.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold text-green-600">
                              {product.currency} {product.price.toLocaleString()}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              product.is_available
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {product.is_available ? 'Available' : 'Unavailable'}
                            </span>
                            <span className="text-gray-500">
                              {new Date(product.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}

            {/* Comments */}
            {activeTab === 'comments' && (
              <>
                {filteredComments.length === 0 ? (
                  <Card className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No comments found</p>
                  </Card>
                ) : (
                  filteredComments.map((comment) => (
                    <Card key={comment.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={comment.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user.username}`}
                          alt={comment.user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">
                                {comment.user.full_name || comment.user.username}
                              </p>
                              <p className="text-xs text-gray-500">@{comment.user.username}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm mb-1">{comment.content}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>

      <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />
    </div>
  );
}
