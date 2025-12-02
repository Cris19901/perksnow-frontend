import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CommentFormProps {
  postId: number | string;
  onCommentAdded?: () => void;
}

export function CommentForm({ postId, onCommentAdded }: CommentFormProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    if (!comment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setLoading(true);

      // Insert comment
      const { error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: comment.trim(),
        });

      if (insertError) throw insertError;

      // Increment comment count using database function
      const { error: updateError } = await supabase
        .rpc('increment_post_comments', {
          post_id: postId,
          increment_value: 1
        });

      if (updateError) throw updateError;

      setComment('');
      toast.success('Comment added!');
      onCommentAdded?.();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 p-3 sm:p-4 border-t border-gray-100">
      <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
        <AvatarImage src={user.user_metadata?.avatar_url} />
        <AvatarFallback>
          {user.email?.[0]?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 flex gap-2">
        <Textarea
          placeholder="Write a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={loading}
          className="min-h-[40px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
        <Button
          type="submit"
          disabled={loading || !comment.trim()}
          size="sm"
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {loading ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </form>
  );
}
