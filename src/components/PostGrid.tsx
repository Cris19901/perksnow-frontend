import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Heart, MessageCircle, Play } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';

interface PostGridItem {
  id: number;
  type: 'post' | 'reel';
  thumbnail: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  images_count?: number;
  likes_count: number;
  comments_count: number;
  author?: {
    name: string;
    username: string;
    avatar: string;
  };
}

interface PostGridProps {
  posts: PostGridItem[];
  onPostClick?: (post: PostGridItem) => void;
  onReelClick?: (reelId: number) => void;
}

export function PostGrid({ posts, onPostClick, onReelClick }: PostGridProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostGridItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handlePostClick = (post: PostGridItem) => {
    if (post.type === 'reel') {
      onReelClick?.(post.id);
    } else {
      // For posts with images, open lightbox
      if (post.images && post.images.length > 0) {
        setSelectedPost(post);
        setLightboxIndex(0);
        setShowLightbox(true);
      } else {
        onPostClick?.(post);
      }
    }
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="w-20 h-20 rounded-full border-4 border-gray-300 flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold">No posts yet</p>
        <p className="text-sm mt-1">Share your first photo or video</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        {posts.map((post) => (
          <div
            key={`${post.type}-${post.id}`}
            className="relative aspect-square cursor-pointer group overflow-hidden"
            onClick={() => handlePostClick(post)}
          >
            {/* Thumbnail Image */}
            <ImageWithFallback
              src={post.thumbnail}
              alt={`Post ${post.id}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Heart className="w-6 h-6 fill-white" />
                <span>{post.likes_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-white font-semibold">
                <MessageCircle className="w-6 h-6 fill-white" />
                <span>{post.comments_count.toLocaleString()}</span>
              </div>
            </div>

            {/* Multiple Images Indicator */}
            {post.type === 'post' && post.images_count && post.images_count > 1 && (
              <div className="absolute top-2 right-2">
                <svg
                  className="w-5 h-5 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z" />
                </svg>
              </div>
            )}

            {/* Reel Indicator */}
            {post.type === 'reel' && (
              <div className="absolute top-2 right-2">
                <Play className="w-6 h-6 text-white drop-shadow-lg fill-white" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Image Lightbox */}
      {showLightbox && selectedPost && selectedPost.images && (
        <ImageLightbox
          images={selectedPost.images}
          initialIndex={lightboxIndex}
          postId={selectedPost.id}
          postAuthor={selectedPost.author}
          isLiked={false}
          onClose={() => {
            setShowLightbox(false);
            setSelectedPost(null);
          }}
          onLike={() => {
            // Handle like
            console.log('Liked post', selectedPost.id);
          }}
        />
      )}
    </>
  );
}
