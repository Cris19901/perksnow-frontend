import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Image, Video, Smile, MapPin, X } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { uploadImage, compressImage } from '@/lib/image-upload';

const MAX_IMAGES = 4;

const FEELINGS = [
  { emoji: '😊', label: 'happy' },
  { emoji: '😂', label: 'amused' },
  { emoji: '😍', label: 'loved' },
  { emoji: '🥰', label: 'blessed' },
  { emoji: '😎', label: 'cool' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😭', label: 'heartbroken' },
  { emoji: '😡', label: 'angry' },
  { emoji: '🤔', label: 'thoughtful' },
  { emoji: '😴', label: 'tired' },
  { emoji: '🤩', label: 'excited' },
  { emoji: '🥳', label: 'celebrating' },
  { emoji: '😌', label: 'relaxed' },
  { emoji: '💪', label: 'motivated' },
  { emoji: '🙏', label: 'grateful' },
  { emoji: '😋', label: 'hungry' },
  { emoji: '🤗', label: 'loved' },
  { emoji: '😇', label: 'blessed' },
];

const ACTIVITIES = [
  { emoji: '🎉', label: 'celebrating' },
  { emoji: '✈️', label: 'traveling' },
  { emoji: '🍕', label: 'eating' },
  { emoji: '☕', label: 'drinking coffee' },
  { emoji: '📺', label: 'watching' },
  { emoji: '🎮', label: 'playing' },
  { emoji: '📖', label: 'reading' },
  { emoji: '🏃', label: 'exercising' },
  { emoji: '💼', label: 'working' },
  { emoji: '🛌', label: 'relaxing' },
  { emoji: '🎵', label: 'listening to music' },
  { emoji: '🎬', label: 'watching a movie' },
  { emoji: '🛍️', label: 'shopping' },
  { emoji: '🎨', label: 'creating' },
  { emoji: '📸', label: 'taking photos' },
];

export function CreatePost({ onPostCreated }: { onPostCreated?: () => void }) {
  const { user } = useAuth();
  const [postText, setPostText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showFeelingDialog, setShowFeelingDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [feelingTab, setFeelingTab] = useState<'feelings' | 'activities'>('feelings');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (selectedImages.length + files.length > MAX_IMAGES) {
      toast.error(`You can only upload up to ${MAX_IMAGES} images per post`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Add valid files to selected images
    setSelectedImages(prev => [...prev, ...validFiles]);

    // Create previews for valid files
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    // Validate file size (50MB for videos)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video is too large (max 50MB)');
      return;
    }

    // Clear images when video is selected
    setSelectedImages([]);
    setImagePreviews([]);

    setSelectedVideo(file);

    // Create video preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
    setVideoPreview(null);
  };

  const handlePost = async () => {
    if (!user) {
      toast.error('You must be logged in to create a post');
      return;
    }

    if (!postText.trim() && selectedImages.length === 0 && !selectedVideo) {
      toast.error('Post must have content, an image, or a video');
      return;
    }

    try {
      setLoading(true);
      const imageUrls: string[] = [];
      let videoUrl: string | null = null;

      // Upload all images if selected
      if (selectedImages.length > 0) {
        setUploading(true);
        try {
          for (const image of selectedImages) {
            const compressed = await compressImage(image);
            const url = await uploadImage(compressed, 'posts', user.id);
            imageUrls.push(url);
          }
        } catch (uploadErr: any) {
          console.error('Image upload error:', uploadErr);
          toast.error(uploadErr.message || 'Failed to upload images');
          return;
        } finally {
          setUploading(false);
        }
      }

      // Upload video if selected
      if (selectedVideo) {
        setUploading(true);
        try {
          videoUrl = await uploadImage(selectedVideo, 'videos', user.id);
        } catch (uploadErr: any) {
          console.error('Video upload error:', uploadErr);
          toast.error(uploadErr.message || 'Failed to upload video');
          return;
        } finally {
          setUploading(false);
        }
      }

      // Determine post type
      let postType = 'text';
      if (videoUrl) {
        postType = 'video';
      } else if (imageUrls.length > 0) {
        postType = 'image';
      }

      // Insert post into database
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: postText.trim() || null,
        post_type: postType,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        video_url: videoUrl,
        feeling: feeling ? `${feeling.emoji} ${feeling.label}` : null,
        location: location.trim() || null,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
      });

      if (error) throw error;

      // Clear the form
      setPostText('');
      setSelectedImages([]);
      setImagePreviews([]);
      setSelectedVideo(null);
      setVideoPreview(null);
      setFeeling(null);
      setLocation('');
      toast.success('Post created successfully!');

      // Notify parent component to refresh
      onPostCreated?.();
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast.error(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex gap-2 sm:gap-3">
        <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>{user?.user_metadata?.username?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            className="resize-none border-none focus-visible:ring-0 p-0 text-sm sm:text-base"
            rows={3}
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Video Preview */}
      {videoPreview && (
        <div className="mt-3">
          <div className="relative group">
            <video
              src={videoPreview}
              controls
              className="rounded-lg w-full max-h-96"
            />
            <button
              type="button"
              onClick={handleRemoveVideo}
              disabled={loading || uploading}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Image Previews Grid */}
      {imagePreviews.length > 0 && (
        <div className={`mt-3 grid gap-2 ${
          imagePreviews.length === 1 ? 'grid-cols-1' :
          imagePreviews.length === 2 ? 'grid-cols-2' :
          'grid-cols-2 sm:grid-cols-2'
        }`}>
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className={`rounded-lg w-full object-cover ${
                  imagePreviews.length === 1 ? 'max-h-96' : 'h-48'
                }`}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                disabled={loading || uploading}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Feeling/Location Tags */}
      {(feeling || location) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {feeling && (
            <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
              <span>{feeling.emoji} feeling {feeling.label}</span>
              <button
                type="button"
                onClick={() => setFeeling(null)}
                disabled={loading}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
              <MapPin className="w-3 h-3" />
              <span>at {location}</span>
              <button
                type="button"
                onClick={() => setLocation('')}
                disabled={loading}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {/* Image Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading || selectedImages.length >= MAX_IMAGES || selectedVideo !== null}
          >
            <Image className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">
              Photo {selectedImages.length > 0 && `(${selectedImages.length}/${MAX_IMAGES})`}
            </span>
            <span className="sm:hidden text-xs">
              {selectedImages.length > 0 ? `${selectedImages.length}/${MAX_IMAGES}` : 'Photo'}
            </span>
          </Button>

          {/* Video Input */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            onClick={() => videoInputRef.current?.click()}
            disabled={loading || uploading || selectedImages.length > 0 || selectedVideo !== null}
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">Video</span>
          </Button>

          {/* Feeling Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 hidden md:inline-flex"
            onClick={() => setShowFeelingDialog(true)}
            disabled={loading}
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">Feeling</span>
          </Button>

          {/* Location Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 hidden md:inline-flex"
            onClick={() => setShowLocationDialog(true)}
            disabled={loading}
          >
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="hidden sm:inline text-xs sm:text-sm">Location</span>
          </Button>
        </div>
        <Button
          onClick={handlePost}
          disabled={loading || uploading || (!postText.trim() && selectedImages.length === 0 && !selectedVideo)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 h-8 sm:h-9 px-4 sm:px-6 text-sm sm:text-base"
        >
          {uploading ? 'Uploading...' : loading ? 'Posting...' : 'Post'}
        </Button>
      </div>

      {/* Feeling/Activity Dialog */}
      <Dialog open={showFeelingDialog} onOpenChange={setShowFeelingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How are you feeling?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setFeelingTab('feelings')}
                className={`px-4 py-2 font-medium transition-colors ${
                  feelingTab === 'feelings'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Feelings
              </button>
              <button
                onClick={() => setFeelingTab('activities')}
                className={`px-4 py-2 font-medium transition-colors ${
                  feelingTab === 'activities'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Activities
              </button>
            </div>

            {/* Feelings/Activities Grid */}
            <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {(feelingTab === 'feelings' ? FEELINGS : ACTIVITIES).map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setFeeling(item);
                    setShowFeelingDialog(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-xs text-center">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Where are you?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLocationDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowLocationDialog(false)}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                disabled={!location.trim()}
              >
                Add Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
