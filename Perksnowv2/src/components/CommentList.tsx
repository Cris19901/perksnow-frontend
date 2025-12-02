import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentListProps {
  postId: number | string;
  refreshTrigger?: number;
}

export function CommentList({ postId, refreshTrigger }: CommentListProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [postId, refreshTrigger]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          users:user_id (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) throw deleteError;

      // Decrement comment count
      const { error: updateError } = await supabase
        .rpc('increment_post_comments', {
          post_id: postId,
          increment_value: -1
        });

      if (updateError) throw updateError;

      setComments(comments.filter(c => c.id !== commentId));
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
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Loading comments...
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {comments.map((comment) => (
        <div key={comment.id} className="p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
              <AvatarImage src={comment.users.avatar_url || undefined} />
              <AvatarFallback>
                {comment.users.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {comment.users.full_name || comment.users.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
                {user?.id === comment.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDelete(comment.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
