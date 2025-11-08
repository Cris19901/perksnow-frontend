import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Image, Video, Smile, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useState } from 'react';

export function CreatePost() {
  const [postText, setPostText] = useState('');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex gap-2 sm:gap-3">
        <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
          <AvatarImage src="https://images.unsplash.com/photo-1653691040409-793d2c22ed69?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlb3BsZXxlbnwxfHx8fDE3NjI1OTM0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080" />
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            className="resize-none border-none focus-visible:ring-0 p-0 text-sm sm:text-base"
            rows={3}
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3">
            <Image className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">Photo</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3">
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">Video</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 hidden md:inline-flex">
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">Feeling</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 hidden md:inline-flex">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">Location</span>
          </Button>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 h-8 sm:h-9 px-4 sm:px-6 text-sm sm:text-base">
          Post
        </Button>
      </div>
    </div>
  );
}
