import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { MobileBottomNav } from '../MobileBottomNav';
import { ReelUpload } from '../ReelUpload';
import { ReelsViewer } from '../ReelsViewer';
import { useNavigate } from 'react-router-dom';
import { PlaySquare, Upload, Play, Eye, Heart, MessageCircle, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ReelsPageProps {
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
}

export function ReelsPage({ onCartClick, cartItemsCount }: ReelsPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_reels_feed', {
        p_user_id: user?.id || null,
        p_limit: 50,
        p_offset: 0
      });

      if (error) throw error;

      setReels(data || []);
    } catch (err: any) {
      console.error('Error fetching reels:', err);
      // Don't show error toast for empty state
      if (err.message && !err.message.includes('does not exist')) {
        toast.error('Failed to load reels');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReelClick = (reelId: string) => {
    setSelectedReelId(reelId);
    setShowViewer(true);
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
          onNavigate={(page) => navigate(`/${page}`)}
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

            {/* Upload Button */}
            {user && (
              <Button
                onClick={() => setShowUpload(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Reel
              </Button>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-900 mb-2">Earn Rewards for Your Reels!</h3>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Upload a reel: <strong>+50 points</strong></li>
              <li>• Get a like: <strong>+2 points</strong></li>
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
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                  size="lg"
                >
                  Log In to Get Started
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {reels.map((reel) => (
                <div
                  key={reel.reel_id}
                  onClick={() => handleReelClick(reel.reel_id)}
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

                  {/* Duration Badge */}
                  <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-white text-xs font-medium">
                    {reel.duration}s
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav currentPage="reels" />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        <ReelsViewer
          initialReelId={selectedReelId || undefined}
          onClose={() => {
            setShowViewer(false);
            setSelectedReelId(null);
            fetchReels(); // Refresh to get updated counts
          }}
        />
      )}
    </>
  );
}
