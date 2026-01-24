import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Image, Video, X, Loader2, MapPin, Smile } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface CreatePostProps {
  onPostCreated?: () => void;
}

interface UploadedImage {
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
}

// Predefined feelings/activities
const FEELINGS = [
  { emoji: '😊', label: 'happy' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😍', label: 'loved' },
  { emoji: '🎉', label: 'excited' },
  { emoji: '😴', label: 'tired' },
  { emoji: '🤔', label: 'thoughtful' },
  { emoji: '😎', label: 'cool' },
  { emoji: '🙏', label: 'grateful' },
  { emoji: '💪', label: 'motivated' },
  { emoji: '😋', label: 'hungry' },
  { emoji: '🥳', label: 'celebrating' },
  { emoji: '😌', label: 'relaxed' },
];

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [postText, setPostText] = useState('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [feeling, setFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!user?.id) {
      toast.error('Please log in to upload images');
      return;
    }

    // Limit to 10 images total
    if (uploadedImages.length + files.length > 10) {
      toast.error('Maximum 10 images allowed per post');
      return;
    }

    setError(null);

    // Validate and create preview for each file
    const newImages: UploadedImage[] = [];
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      newImages.push({
        file,
        preview,
        uploading: false,
      });
    }

    setUploadedImages(prev => [...prev, ...newImages]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev];
      // Revoke preview URL to free memory
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handlePost = async () => {
    if (!user?.id) {
      setError('Please log in to create a post');
      return;
    }

    if (!postText.trim() && uploadedImages.length === 0) {
      setError('Please enter some text or upload images');
      return;
    }

    setPosting(true);
    setUploading(true);
    setError(null);

    try {
      console.log('🔍 CreatePost: Creating post with', uploadedImages.length, 'images...');

      // Upload all images to storage first
      const imageUrls: string[] = [];
      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i];
        toast.loading(`Uploading image ${i + 1}/${uploadedImages.length}...`);

        try {
          const fileExt = image.file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { data, error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, image.file);

          if (uploadError) {
            console.error('❌ Storage upload error:', uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: publicUrl } = supabase.storage
            .from('posts')
            .getPublicUrl(data.path);

          imageUrls.push(publicUrl.publicUrl);
          console.log(`✅ CreatePost: Image ${i + 1} uploaded:`, publicUrl.publicUrl);
        } catch (uploadErr) {
          console.error(`❌ Failed to upload image ${i + 1}:`, uploadErr);
          throw new Error(`Failed to upload image ${i + 1}`);
        }
      }

      toast.dismiss();

      // Build the content with location and feeling
      let finalContent = postText.trim();
      if (feeling) {
        finalContent = `${feeling.emoji} Feeling ${feeling.label}\n\n${finalContent}`;
      }
      if (location) {
        finalContent = `📍 ${location}\n${finalContent}`;
      }

      // Create the post
      const postData = {
        user_id: user.id,
        content: finalContent,
        image_url: imageUrls[0] || null, // Keep first image for backwards compatibility
        images_count: imageUrls.length,
      };

      const { data: post, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ CreatePost: Error creating post:', insertError);
        throw insertError;
      }

      console.log('✅ CreatePost: Post created successfully:', post);

      // Insert all images into post_images table
      if (imageUrls.length > 0) {
        const postImages = imageUrls.map((url, index) => ({
          post_id: post.id,
          image_url: url,
          image_order: index + 1,
        }));

        const { error: imagesError } = await supabase
          .from('post_images')
          .insert(postImages);

        if (imagesError) {
          console.error('❌ CreatePost: Error inserting images:', imagesError);
          // Don't throw - post is already created
        } else {
          console.log('✅ CreatePost:', imageUrls.length, 'images linked to post');
        }
      }

      // Cleanup preview URLs
      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));

      // Reset form
      setPostText('');
      setUploadedImages([]);
      setError(null);
      setLocation('');
      setFeeling(null);
      setShowLocationInput(false);

      toast.success('Post created successfully!');

      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      console.error('❌ CreatePost: Post creation failed:', err);
      setError(err.message || 'Failed to create post');
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  const getAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex gap-2 sm:gap-3">
        <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
          <AvatarImage src={getAvatarUrl()} />
          <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="What's on your mind?"
            className="resize-none border-none focus-visible:ring-0 p-0 text-sm sm:text-base"
            rows={3}
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            disabled={posting}
          />

          {/* Images Preview Grid */}
          {uploadedImages.length > 0 && (
            <div className="mt-3">
              <div className={`grid gap-2 ${
                uploadedImages.length === 1 ? 'grid-cols-1' :
                uploadedImages.length === 2 ? 'grid-cols-2' :
                'grid-cols-3'
              }`}>
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={image.preview}
                      alt={`Upload preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    {/* Image number badge */}
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              {/* Image counter */}
              <p className="text-xs text-gray-500 mt-2">
                {uploadedImages.length} / 10 images
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Redirect to reels upload
            toast.info('Redirecting to Reels upload for video content...');
            window.location.href = '/reels';
          }
          if (videoInputRef.current) {
            videoInputRef.current.value = '';
          }
        }}
        className="hidden"
      />

      {/* Location Input */}
      {showLocationInput && (
        <div className="px-3 sm:px-4 pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
            <Input
              placeholder="Add location..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setLocation('');
                setShowLocationInput(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Feeling Display */}
      {feeling && (
        <div className="px-3 sm:px-4 pb-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{feeling.emoji}</span>
            <span>Feeling {feeling.label}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setFeeling(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {/* Photo Button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || posting || uploadedImages.length >= 10}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 animate-spin" />
            ) : (
              <Image className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            )}
            <span className="text-xs sm:text-sm">
              {uploadedImages.length > 0 ? `${uploadedImages.length}/10` : 'Photo'}
            </span>
          </Button>

          {/* Video Button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading || posting}
          >
            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            <span className="text-xs sm:text-sm">Video</span>
          </Button>

          {/* Location Button */}
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 ${location ? 'text-red-500' : ''}`}
            onClick={() => setShowLocationInput(!showLocationInput)}
            disabled={posting}
          >
            <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 ${location ? 'text-red-500' : 'text-red-500'}`} />
            <span className="text-xs sm:text-sm hidden xs:inline">Location</span>
          </Button>

          {/* Feeling Button */}
          <Popover open={showFeelingPicker} onOpenChange={setShowFeelingPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 ${feeling ? 'text-yellow-600' : ''}`}
                disabled={posting}
              >
                {feeling ? (
                  <span className="text-base">{feeling.emoji}</span>
                ) : (
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                )}
                <span className="text-xs sm:text-sm hidden xs:inline">Feeling</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <p className="text-sm font-medium mb-2">How are you feeling?</p>
              <div className="grid grid-cols-4 gap-2">
                {FEELINGS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => {
                      setFeeling(f);
                      setShowFeelingPicker(false);
                    }}
                    className={`flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                      feeling?.label === f.label ? 'bg-gray-100' : ''
                    }`}
                  >
                    <span className="text-xl">{f.emoji}</span>
                    <span className="text-xs text-gray-600 mt-1 capitalize">{f.label}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button
          className="bg-gradient-to-r from-purple-600 to-pink-600 h-8 sm:h-9 px-4 sm:px-6 text-sm sm:text-base"
          onClick={handlePost}
          disabled={posting || uploading || (!postText.trim() && uploadedImages.length === 0)}
        >
          {posting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            'Post'
          )}
        </Button>
      </div>
    </div>
  );
}
