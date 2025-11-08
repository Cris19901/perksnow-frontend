import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PostProps {
  id: number;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
}

export function Post({ author, content, image, likes, comments, shares, timestamp }: PostProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm sm:text-base">{author.name}</p>
            <p className="text-xs sm:text-sm text-gray-500">{timestamp}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
          <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3">
        <p className="whitespace-pre-wrap text-sm sm:text-base">{content}</p>
      </div>

      {/* Post Image */}
      {image && (
        <div className="w-full">
          <ImageWithFallback
            src={image}
            alt="Post image"
            className="w-full object-cover max-h-[600px]"
          />
        </div>
      )}

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
          <span className="hidden sm:inline">{comments} comments</span>
          <span className="sm:hidden">{comments}</span>
          <span className="hidden sm:inline">{shares} shares</span>
          <span className="sm:hidden">{shares}</span>
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
        <Button variant="ghost" className="flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden xs:inline">Comment</span>
        </Button>
        <Button variant="ghost" className="flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Share</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 sm:h-9 sm:w-9 ${isSaved ? 'text-blue-600' : ''}`}
          onClick={() => setIsSaved(!isSaved)}
        >
          <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? 'fill-blue-600' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
