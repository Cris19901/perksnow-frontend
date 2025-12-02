import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Pencil, Trash2, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Textarea } from './ui/textarea';

interface PostProps {
  id: number;
  author: {
    name: string;
    username: string;
    avatar: string;
    userId?: string; // Add userId for navigation
  };
  content: string;
  image?: string; // Single image (for backwards compatibility)
  images?: string[]; // Multiple images
  video?: string; // Video URL
  feeling?: string; // Feeling/activity (format: "emoji label")
  location?: string; // Location tag
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
}

export function Post({ id, author, content, image, images, video, feeling, location, likes, comments, shares, timestamp }: PostProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [commentCount, setCommentCount] = useState(comments);
  const [shareCount, setShareCount] = useState(shares);
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentRefresh, setCommentRefresh] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(content || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is the author
  const isAuthor = user?.id === author.userId;

  // Check if user has liked/shared/saved this post on mount
  useEffect(() => {
    async function checkPostStatus() {
      if (!user) return;

      try {
        // Check like status
        const { data: likeData, error: likeError } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likeError && likeError.code !== 'PGRST116') {
          console.error('Error checking like status:', likeError);
        } else {
          setIsLiked(!!likeData);
        }

        // Check share status
        const { data: shareData, error: shareError} = await supabase
          .from('shares')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (shareError && shareError.code !== 'PGRST116') {
          console.error('Error checking share status:', shareError);
        } else {
          setIsShared(!!shareData);
        }

        // Check bookmark status
        const { data: bookmarkData, error: bookmarkError } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (bookmarkError && bookmarkError.code !== 'PGRST116') {
          console.error('Error checking bookmark status:', bookmarkError);
        } else {
          setIsSaved(!!bookmarkData);
        }
      } catch (err) {
        console.error('Error checking post status:', err);
      }
    }

    checkPostStatus();
  }, [id, user]);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      if (isLiked) {
        // Unlike: remove from likes table
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Decrement like count using database function
        const { error: updateError } = await supabase
          .rpc('increment_post_likes', {
            post_id: id,
            increment_value: -1
          });

        if (updateError) throw updateError;

        setIsLiked(false);
        setLikeCount(Math.max(0, likeCount - 1));
      } else {
        // Like: add to likes table
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            post_id: id,
            user_id: user.id,
          });

        if (insertError) throw insertError;

        // Increment like count using database function
        const { error: updateError } = await supabase
          .rpc('increment_post_likes', {
            post_id: id,
            increment_value: 1
          });

        if (updateError) throw updateError;

        setIsLiked(true);
        setLikeCount(likeCount + 1);
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      toast.error('Failed to update like');
      // Revert optimistic update
      setIsLiked(!isLiked);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!user) {
      toast.error('Please log in to share posts');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      if (isShared) {
        // Unshare: remove from shares table
        const { error: deleteError } = await supabase
          .from('shares')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        setIsShared(false);
        setShareCount(Math.max(0, shareCount - 1));
        toast.success('Share removed');
      } else {
        // Share: add to shares table
        const { error: insertError } = await supabase
          .from('shares')
          .insert({
            post_id: id,
            user_id: user.id,
            shared_to: 'feed',
          });

        if (insertError) {
          // Check if it's a duplicate error
          if (insertError.code === '23505') {
            toast.info('You already shared this post');
            setIsShared(true);
          } else {
            throw insertError;
          }
          return;
        }

        setIsShared(true);
        setShareCount(shareCount + 1);
        toast.success('Post shared to your feed!');
      }
    } catch (err: any) {
      console.error('Error sharing post:', err);
      toast.error('Failed to share post');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPost = async () => {
    if (!user) {
      toast.error('Please log in to edit posts');
      return;
    }

    if (!editedContent.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    try {
      setIsEditing(true);

      const { error } = await supabase
        .from('posts')
        .update({ content: editedContent.trim() })
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only edit their own posts

      if (error) throw error;

      toast.success('Post updated successfully');
      setIsEditDialogOpen(false);
      // Refresh page to show updated content
      window.location.reload();
    } catch (err: any) {
      console.error('Error updating post:', err);
      toast.error('Failed to update post');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeletePost = async () => {
    if (!user) {
      toast.error('Please log in to delete posts');
      return;
    }

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own posts

      if (error) throw error;

      toast.success('Post deleted successfully');
      setIsDeleteDialogOpen(false);
      // Refresh page to remove deleted post
      window.location.reload();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please log in to save posts');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      if (isSaved) {
        // Remove bookmark
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        setIsSaved(false);
        toast.success('Removed from saved posts');
      } else {
        // Add bookmark
        const { error: insertError } = await supabase
          .from('bookmarks')
          .insert({
            post_id: id,
            user_id: user.id,
          });

        if (insertError) throw insertError;

        setIsSaved(true);
        toast.success('Saved to bookmarks!');
      }
    } catch (err: any) {
      console.error('Error toggling bookmark:', err);
      toast.error('Failed to update bookmark');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar
            className="w-9 h-9 sm:w-10 sm:h-10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => author.userId && navigate(`/profile/${author.userId}`)}
          >
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p
              className="text-sm sm:text-base font-medium cursor-pointer hover:underline"
              onClick={() => author.userId && navigate(`/profile/${author.userId}`)}
            >
              {author.name}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">{timestamp}</p>
          </div>
        </div>
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Post
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Post Content */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3">
        <p className="whitespace-pre-wrap text-sm sm:text-base">
          {(content || '').split(/(\s+)/).map((word, index) => {
            // Check if word is a hashtag
            if (word.match(/^#\w+/)) {
              const hashtag = word.replace(/^#/, '');
              return (
                <span
                  key={index}
                  className="text-purple-600 hover:underline cursor-pointer font-medium"
                  onClick={() => navigate(`/hashtag/${hashtag}`)}
                >
                  {word}
                </span>
              );
            }
            return <span key={index}>{word}</span>;
          })}
        </p>

        {/* Feeling/Location Tags */}
        {(feeling || location) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {feeling && (
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
                <span>{feeling}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
                <MapPin className="w-3 h-3" />
                <span>at {location}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Video */}
      {video && (
        <div className="w-full bg-black">
          <video
            src={video}
            controls
            controlsList="nodownload"
            playsInline
            muted={false}
            className="w-full max-h-[600px]"
            preload="metadata"
            style={{ objectFit: 'contain' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Post Images */}
      {(() => {
        // Use images array if available, otherwise fall back to single image
        const imageList = images && images.length > 0 ? images : image ? [image] : [];

        if (imageList.length === 0) return null;

        if (imageList.length === 1) {
          // Single image - full width
          return (
            <div className="w-full">
              <ImageWithFallback
                src={imageList[0]}
                alt="Post image"
                className="w-full object-cover max-h-[600px]"
              />
            </div>
          );
        } else if (imageList.length === 2) {
          // Two images - side by side
          return (
            <div className="w-full grid grid-cols-2 gap-0.5">
              {imageList.map((img, idx) => (
                <ImageWithFallback
                  key={idx}
                  src={img}
                  alt={`Post image ${idx + 1}`}
                  className="w-full h-full object-cover max-h-[400px]"
                />
              ))}
            </div>
          );
        } else if (imageList.length === 3) {
          // Three images - one large, two small
          return (
            <div className="w-full grid grid-cols-2 gap-0.5">
              <ImageWithFallback
                src={imageList[0]}
                alt="Post image 1"
                className="w-full h-full object-cover row-span-2 max-h-[400px]"
              />
              <ImageWithFallback
                src={imageList[1]}
                alt="Post image 2"
                className="w-full h-full object-cover max-h-[200px]"
              />
              <ImageWithFallback
                src={imageList[2]}
                alt="Post image 3"
                className="w-full h-full object-cover max-h-[200px]"
              />
            </div>
          );
        } else {
          // Four or more images - 2x2 grid (show first 4)
          return (
            <div className="w-full grid grid-cols-2 gap-0.5">
              {imageList.slice(0, 4).map((img, idx) => (
                <ImageWithFallback
                  key={idx}
                  src={img}
                  alt={`Post image ${idx + 1}`}
                  className="w-full h-full object-cover max-h-[300px]"
                />
              ))}
            </div>
          );
        }
      })()}

      {/* Post Stats */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
              <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-white" />
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 ml-1">{likeCount}</span>
        </div>
        <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
          <button
            onClick={() => setShowComments(!showComments)}
            className="hover:underline"
          >
            <span className="hidden sm:inline">{commentCount} comments</span>
            <span className="sm:hidden">{commentCount}</span>
          </button>
          <span className="hidden sm:inline">{shareCount} shares</span>
          <span className="sm:hidden">{shareCount}</span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-around px-2 sm:px-4 py-1.5 sm:py-2">
        <Button
          variant="ghost"
          className={`flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm ${isLiked ? 'text-pink-600' : ''}`}
          onClick={handleLike}
        >
          <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-pink-600' : ''}`} />
          <span>Like</span>
        </Button>
        <Button
          variant="ghost"
          className={`flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm ${showComments ? 'text-purple-600' : ''}`}
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden xs:inline">Comment</span>
        </Button>
        <Button
          variant="ghost"
          className={`flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm ${isShared ? 'text-green-600' : ''}`}
          onClick={handleShare}
          disabled={loading}
        >
          <Share2 className={`w-4 h-4 sm:w-5 sm:h-5 ${isShared ? 'fill-green-600' : ''}`} />
          <span>Share</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 sm:h-9 sm:w-9 ${isSaved ? 'text-blue-600' : ''}`}
          onClick={handleBookmark}
          disabled={loading}
        >
          <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? 'fill-blue-600' : ''}`} />
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100">
          <CommentList
            postId={id}
            refreshTrigger={commentRefresh}
          />
          <CommentForm
            postId={id}
            onCommentAdded={() => {
              setCommentRefresh(prev => prev + 1);
              setCommentCount(prev => prev + 1);
            }}
          />
        </div>
      )}

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Make changes to your post here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditedContent(content || ''); // Reset to original content
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditPost}
              disabled={isEditing || !(editedContent || '').trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {isEditing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
