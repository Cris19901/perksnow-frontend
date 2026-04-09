import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../Header';
import { MobileBottomNav } from '../MobileBottomNav';
import { ReelUpload } from '../ReelUpload';
import { ReelsViewerPro } from '../ReelsViewerPro';
import { PlaySquare, Upload, Play, Eye, Heart, MessageCircle, Plus, Maximize2, Youtube, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ReelsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface Reel {
  reel_id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  video_url: string;
  thumbnail_url: string;
  caption: string;
  duration: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean;
  is_youtube?: boolean;
  youtube_id?: string;
}

const REELS_PER_PAGE = 20;

export function ReelsPage({ onNavigate, onCartClick, cartItemsCount }: ReelsPageProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showUpload, setShowUpload] = useState(() => !!(location.state as any)?.openUpload);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [youtubeModalId, setYoutubeModalId] = useState<string | null>(null);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  const ytReelsRef = useRef<Reel[]>([]);

  const fetchReels = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        pageRef.current = 0;
        hasMoreRef.current = true;
      }

      const currentPage = isLoadMore ? pageRef.current : 0;
      const offset = currentPage * REELS_PER_PAGE;

      // Fetch uploaded reels (paginated)
      const reelsPromise = supabase.rpc('get_reels_feed', {
        p_user_id: user?.id || null,
        p_limit: REELS_PER_PAGE,
        p_offset: offset
      });

      // Only fetch YouTube posts on initial load (they're finite)
      let ytReels: Reel[] = [];
      if (!isLoadMore) {
        const ytResult = await supabase
          .from('posts')
          .select('id, content, image_url, likes_count, comments_count, created_at, user_id, users!inner(username, full_name, avatar_url)')
          .like('content', '%youtube.com%')
          .order('created_at', { ascending: false })
          .limit(50);

        ytReels = (ytResult.data || []).map((post: any) => {
          const content = post.content || '';
          const ytMatch = content.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([\w-]{11})/);
          const videoId = ytMatch?.[1] || '';
          const firstLine = content.split('\n')[0];
          const caption = firstLine.startsWith('http') ? '' : firstLine;

          return {
            reel_id: `yt-${post.id}`,
            user_id: post.user_id,
            username: post.users?.username || 'unknown',
            full_name: post.users?.full_name || '',
            avatar_url: post.users?.avatar_url || '',
            video_url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail_url: post.image_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            caption,
            duration: 0,
            views_count: 0,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            created_at: post.created_at,
            is_liked: false,
            is_youtube: true,
            youtube_id: videoId,
          };
        }).filter((r: Reel) => r.youtube_id);

        ytReelsRef.current = ytReels;
      }

      const reelsResult = await reelsPromise;
      const uploadedReels: Reel[] = reelsResult.data || [];
      const hasMoreReels = uploadedReels.length === REELS_PER_PAGE;

      if (isLoadMore) {
        setReels(prev => [...prev, ...uploadedReels]);
      } else {
        // Merge uploaded + YouTube and sort by created_at
        const allReels = [...uploadedReels, ...ytReels].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReels(allReels);
      }

      pageRef.current = currentPage + 1;
      hasMoreRef.current = hasMoreReels;
      setHasMore(hasMoreReels);

      console.log('📊 Reels load complete:', {
        page: pageRef.current,
        reelsLoaded: uploadedReels.length,
        hasMore: hasMoreReels,
        totalReels: isLoadMore ? reels.length + uploadedReels.length : reels.length
      });
    } catch (err: any) {
      console.error('Error fetching reels:', err);
      const msg = err?.message?.toLowerCase() || '';
      if (!msg.includes('does not exist') && !msg.includes('not found')) {
        toast.error('Failed to load reels');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Store fetchReels in a ref so loadMore always calls the latest version
  const fetchReelsRef = useRef(fetchReels);
  fetchReelsRef.current = fetchReels;

  useEffect(() => {
    fetchReels();
  }, []);

  // Scroll-based infinite loading - fires when user scrolls near bottom
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;

      console.log('📜 Reels Scroll:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        distanceFromBottom,
        loading: loadingMoreRef.current,
        hasMore: hasMoreRef.current,
        timeSinceLastLoad
      });

      if (loadingMoreRef.current) {
        console.log('⏸️ Already loading, skipping');
        return;
      }

      if (!hasMoreRef.current) {
        console.log('🛑 No more reels, skipping');
        return;
      }

      // Cooldown: prevent triggering within 2 seconds of last load
      if (timeSinceLastLoad < 2000) {
        console.log('⏱️ Cooldown active (' + Math.ceil((2000 - timeSinceLastLoad) / 1000) + 's remaining)');
        return;
      }

      // Trigger if within 500px of bottom (allow slight overshoot)
      if (distanceFromBottom <= 500 && distanceFromBottom >= -50) {
        console.log('🔥 Triggering reels load more! Distance: ' + distanceFromBottom.toFixed(1) + 'px');
        lastLoadTimeRef.current = now;
        fetchReelsRef.current(true);
      } else if (distanceFromBottom < -50) {
        console.log('🚫 Too far past bottom (' + distanceFromBottom.toFixed(1) + 'px)');
      }
    };

    console.log('✅ Reels scroll listener attached');
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      console.log('❌ Reels scroll listener removed');
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleReelClick = (reel: Reel) => {
    if (reel.is_youtube && reel.youtube_id) {
      setYoutubeModalId(reel.youtube_id);
    } else {
      setSelectedReelId(reel.reel_id);
      setShowViewer(true);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="reels"
        />

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold flex items-center gap-2">
                <PlaySquare className="w-7 h-7 text-purple-600" />
                Reels
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Short videos, big rewards
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {reels.length > 0 && (
                <Button
                  onClick={() => setShowViewer(true)}
                  variant="outline"
                  className="hidden sm:flex"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Watch All
                </Button>
              )}
              {user && (
                <Button
                  onClick={() => setShowUpload(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-900 mb-2">Earn Rewards for Your Reels!</h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Upload a reel: <strong>+250 points</strong></li>
              <li>• Get a like: <strong>+0.5 points</strong></li>
              <li>• Reach 100 views: <strong>+50 points bonus</strong></li>
              <li>• Reach 1,000 views: <strong>+200 points bonus</strong></li>
            </ul>
          </div>

          {/* Reels Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[9/16] bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : reels.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <PlaySquare className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No Reels Yet
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {user
                  ? 'Be the first to upload a reel and start earning rewards!'
                  : 'Log in to view and upload reels'}
              </p>
              {user ? (
                <Button
                  onClick={() => setShowUpload(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  size="lg"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Your First Reel
                </Button>
              ) : (
                <Button
                  onClick={() => onNavigate?.('login')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  size="lg"
                >
                  Log In to Get Started
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {reels.map((reel) => (
                  <div
                    key={reel.reel_id}
                    onClick={() => handleReelClick(reel)}
                    className="group relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-600 transition-all"
                  >
                    {/* Thumbnail */}
                    {reel.thumbnail_url ? (
                      <img
                        src={reel.thumbnail_url}
                        alt={reel.caption}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
                        <PlaySquare className="w-12 h-12 text-white opacity-50" />
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Stats Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                      {/* User Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-6 h-6 border border-white">
                          <AvatarImage src={reel.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {reel.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-xs font-medium truncate">
                          {reel.username}
                        </span>
                      </div>

                      {/* Caption */}
                      <p className="text-white text-xs line-clamp-2 mb-2">
                        {reel.caption}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-white text-xs">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatCount(reel.views_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatCount(reel.likes_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {formatCount(reel.comments_count)}
                        </span>
                      </div>
                    </div>

                    {/* Duration / YouTube Badge */}
                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-white text-xs font-medium flex items-center gap-1">
                      {reel.is_youtube ? (
                        <><Youtube className="w-3 h-3 text-red-500" /> YouTube</>
                      ) : (
                        <>{reel.duration}s</>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Infinite Scroll Sentinel */}
              <div className="py-4">
                {loadingMore && (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading more reels...</span>
                  </div>
                )}
                {!hasMore && reels.length > 0 && (
                  <div className="text-center text-gray-400 text-sm">
                    You've seen all the reels
                  </div>
                )}
              </div>
            </>
          )}

          {/* Floating Watch All Button (Mobile Only) */}
          {!loading && reels.length > 0 && (
            <Button
              onClick={() => setShowViewer(true)}
              className="fixed bottom-24 right-4 sm:hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg z-10 rounded-full w-14 h-14 p-0"
              size="lg"
            >
              <Maximize2 className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>

      <MobileBottomNav currentPage="reels" />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Upload Reel</DialogTitle>
          <DialogDescription className="sr-only">
            Upload a video reel to earn points and share with the community
          </DialogDescription>
          <ReelUpload
            onUploadComplete={() => {
              setShowUpload(false);
              fetchReels();
            }}
            onClose={() => setShowUpload(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Reels Viewer */}
      {showViewer && (
        <ReelsViewerPro
          initialReelId={selectedReelId || undefined}
          onClose={() => {
            setShowViewer(false);
            setSelectedReelId(null);
            fetchReels();
          }}
        />
      )}

      {/* YouTube Video Modal - Full Screen */}
      {youtubeModalId && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
          <button
            onClick={() => setYoutubeModalId(null)}
            className="absolute top-4 right-4 z-[70] bg-white hover:bg-gray-200 text-black rounded-full p-2 shadow-lg"
          >
            <X className="w-7 h-7" />
          </button>
          <div className="w-full h-full max-h-screen">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeModalId}?autoplay=1`}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentPage="reels" onNavigate={onNavigate} />
    </>
  );
}
