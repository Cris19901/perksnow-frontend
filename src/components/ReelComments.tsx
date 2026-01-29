import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useDailyLimits } from '@/hooks/useDailyLimits';

interface Comment {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface ReelCommentsProps {
  reelId: string;
  onClose?: () => void;
  onCommentAdded?: () => void;
}

export function ReelComments({ reelId, onClose, onCommentAdded }: ReelCommentsProps) {
  const { user } = useAuth();
  const { limits, checkCanComment, incrementCommentCount } = useDailyLimits();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
  }, [reelId]);

  const fetchComments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('reel_comments')
        .select(`
          *,
          user:users!reel_comments_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('reel_id', reelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments(data || []);

      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);

    } catch (err: any) {
      console.error('Error fetching comments:', err);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    // Check daily comment limit
    const canComment = await checkCanComment();
    if (!canComment) {
      toast.error(`Daily comment limit reached (${limits.comments_used}/${limits.comments_limit})`);
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('reel_comments')
        .insert({
          reel_id: reelId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          user:users!reel_comments_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Increment comment count
      await incrementCommentCount();

      setComments(prev => [...prev, data]);
      setNewComment('');
      onCommentAdded?.();

      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);

    } catch (err: any) {
      console.error('Error posting comment:', err);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reel_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');

    } catch (err: any) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold">Comments</h3>
        <p className="text-sm text-gray-500">{comments.length} comments</p>
      </div>

      {/* Comments List */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.user?.avatar_url} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.user?.full_name || comment.user?.username || 'User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(comment.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 break-words">
                    {comment.content}
                  </p>
                </div>

                {/* Delete button for own comments */}
                {user && comment.user_id === user.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(comment.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Comment Input */}
      <div className="border-t border-gray-200 p-4">
        {user ? (
          <>
            {/* Comment Limit Warning */}
            {!limits.can_comment && (
              <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <p className="text-xs text-yellow-800">Daily limit reached ({limits.comments_limit} comments)</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder={limits.can_comment ? "Add a comment..." : "Limit reached"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submitting || !limits.can_comment}
                maxLength={500}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={submitting || !newComment.trim() || !limits.can_comment}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {limits.comments_used}/{limits.comments_limit} comments used today
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">
              Please log in to comment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
