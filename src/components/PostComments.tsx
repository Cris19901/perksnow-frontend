import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Send, Loader2, MoreVertical, Trash2, Edit2, MessageCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useDailyLimits } from '@/hooks/useDailyLimits';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Comment {
  comment_id: string;
  post_id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  reply_count?: number;
}

interface PostCommentsProps {
  postId: string;
  onClose?: () => void;
  onCommentAdded?: () => void;
}

export function PostComments({ postId, onClose, onCommentAdded }: PostCommentsProps) {
  const { user } = useAuth();
  const { limits, checkCanComment, incrementCommentCount } = useDailyLimits();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showReplies, setShowReplies] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_post_comments', {
        p_post_id: postId,
        p_limit: 50,
        p_offset: 0
      });

      if (error) throw error;

      setComments(data || []);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (commentId: string) => {
    try {
      setLoadingReplies(prev => new Set(prev).add(commentId));

      const { data, error } = await supabase.rpc('get_comment_replies', {
        p_comment_id: commentId,
        p_limit: 50,
        p_offset: 0
      });

      if (error) throw error;

      setReplies(prev => ({
        ...prev,
        [commentId]: data || []
      }));

      setShowReplies(prev => new Set(prev).add(commentId));
    } catch (err: any) {
      console.error('Error fetching replies:', err);
      toast.error('Failed to load replies');
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (newComment.length > 2000) {
      toast.error('Comment is too long (max 2000 characters)');
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

      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim()
      });

      if (error) throw error;

      // Increment comment count
      await incrementCommentCount();

      setNewComment('');
      toast.success(`Comment added (${limits.comments_used + 1}/${limits.comments_limit} today)`);
      onCommentAdded?.();
      fetchComments();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user) {
      toast.error('Please log in to reply');
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    if (replyContent.length > 2000) {
      toast.error('Reply is too long (max 2000 characters)');
      return;
    }

    // Check daily comment limit (replies count as comments)
    const canComment = await checkCanComment();
    if (!canComment) {
      toast.error(`Daily comment limit reached (${limits.comments_used}/${limits.comments_limit})`);
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        parent_comment_id: parentCommentId,
        content: replyContent.trim()
      });

      if (error) throw error;

      // Increment comment count
      await incrementCommentCount();

      setReplyContent('');
      setReplyingTo(null);
      toast.success(`Reply added (${limits.comments_used + 1}/${limits.comments_limit} today)`);
      onCommentAdded?.();

      // Refresh the replies for this comment
      await fetchReplies(parentCommentId);

      // Refresh main comments to update reply count
      fetchComments();
    } catch (err: any) {
      console.error('Error adding reply:', err);
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (editContent.length > 2000) {
      toast.error('Comment is too long (max 2000 characters)');
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated');
      fetchComments();

      // Refresh replies if this was a reply
      Object.keys(replies).forEach(parentId => {
        fetchReplies(parentId);
      });
    } catch (err: any) {
      console.error('Error editing comment:', err);
      toast.error('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Comment deleted');
      fetchComments();

      // Refresh replies if needed
      Object.keys(replies).forEach(parentId => {
        fetchReplies(parentId);
      });
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment');
    }
  };

  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
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

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isEditing = editingComment === comment.comment_id;
    const isReplying = replyingTo === comment.comment_id;
    const hasReplies = (comment.reply_count || 0) > 0;
    const repliesExpanded = showReplies.has(comment.comment_id);

    return (
      <div key={comment.comment_id} className={isReply ? 'ml-12' : ''}>
        <div className="flex gap-3 py-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} />
            <AvatarFallback>
              {(comment.full_name || comment.username || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{comment.full_name || comment.username}</span>
              <span className="text-xs text-gray-500">@{comment.username}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{formatTimestamp(comment.created_at)}</span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                  maxLength={2000}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment.comment_id)}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">
                  {comment.content}
                </p>

                <div className="flex items-center gap-4 mt-2">
                  {!isReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-gray-500 hover:text-gray-900"
                      onClick={() => {
                        setReplyingTo(comment.comment_id);
                        setReplyContent('');
                      }}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Reply
                    </Button>
                  )}

                  {hasReplies && !isReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                      onClick={() => {
                        if (repliesExpanded) {
                          setShowReplies(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(comment.comment_id);
                            return newSet;
                          });
                        } else {
                          fetchReplies(comment.comment_id);
                        }
                      }}
                    >
                      {loadingReplies.has(comment.comment_id) ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : null}
                      {repliesExpanded ? 'Hide' : 'View'} {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                    </Button>
                  )}

                  {user?.id === comment.user_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs text-gray-500 hover:text-gray-900"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingComment(comment.comment_id);
                            setEditContent(comment.content);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteComment(comment.comment_id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </>
            )}

            {isReplying && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm"
                  maxLength={2000}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.comment_id)}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reply'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {repliesExpanded && replies[comment.comment_id] && (
          <div className="border-l-2 border-gray-200 ml-4">
            {replies[comment.comment_id].map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Comments</h2>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet</p>
            <p className="text-sm mt-1">Be the first to comment!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>

      {/* Add Comment Input */}
      <div className="border-t border-gray-200 p-4">
        {user ? (
          <>
            {/* Comment Limit Warning */}
            {!limits.can_comment && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Daily comment limit reached</p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    You've used all {limits.comments_limit} comments for today. Upgrade for more!
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={limits.can_comment ? "Write a comment..." : "Comment limit reached for today"}
                  className="min-h-[80px] resize-none"
                  maxLength={2000}
                  disabled={!limits.can_comment}
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {newComment.length}/2000
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {limits.comments_remaining}/{limits.comments_limit} comments left
                    </span>
                  </div>
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submitting || !newComment.trim() || !limits.can_comment}
                    size="sm"
                    className="gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Please log in to comment</p>
          </div>
        )}
      </div>
    </div>
  );
}
