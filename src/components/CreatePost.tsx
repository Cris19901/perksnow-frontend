import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Image, Video, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [postText, setPostText] = useState('');
  const [uploadedMedia, setUploadedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      setError('Please log in to upload media');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Validate file type
      const expectedType = type === 'image' ? 'image/' : 'video/';
      if (!file.type.startsWith(expectedType)) {
        setError(`Please upload a valid ${type} file`);
        return;
      }

      // Validate file size (max 10MB for images, 50MB for videos)
      const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`${type === 'image' ? 'Image' : 'Video'} size must be less than ${type === 'image' ? '10MB' : '50MB'}`);
        return;
      }

      console.log(`🔍 CreatePost: Uploading ${type}:`, file.name);

      // Try Supabase Storage first
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, file);

        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          // Fallback: Use data URL
          const reader = new FileReader();
          reader.onload = () => {
            setUploadedMedia(reader.result as string);
            setMediaType(type);
          };
          reader.readAsDataURL(file);
          return;
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('posts')
          .getPublicUrl(data.path);

        console.log(`✅ CreatePost: ${type} uploaded:`, publicUrl.publicUrl);
        setUploadedMedia(publicUrl.publicUrl);
        setMediaType(type);
      } catch (storageErr) {
        console.error('❌ Storage exception, using data URL:', storageErr);
        // Fallback: Use data URL
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedMedia(reader.result as string);
          setMediaType(type);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('❌ File upload failed:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePost = async () => {
    if (!user?.id) {
      setError('Please log in to create a post');
      return;
    }

    if (!postText.trim() && !uploadedMedia) {
      setError('Please enter some text or upload media');
      return;
    }

    setPosting(true);
    setError(null);

    try {
      console.log('🔍 CreatePost: Creating post...');

      // Use image_url for both images and videos since database only has image_url column
      const postData = {
        user_id: user.id,
        content: postText.trim(),
        image_url: uploadedMedia || null,
      };

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ CreatePost: Error creating post:', insertError);
        throw insertError;
      }

      console.log('✅ CreatePost: Post created successfully:', data);

      // Reset form
      setPostText('');
      setUploadedMedia(null);
      setMediaType(null);
      setError(null);

      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      console.error('❌ CreatePost: Post creation failed:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setPosting(false);
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

          {/* Media Preview */}
          {uploadedMedia && (
            <div className="mt-3 relative">
              {mediaType === 'image' ? (
                <img
                  src={uploadedMedia}
                  alt="Upload preview"
                  className="max-h-64 rounded-lg object-cover w-full"
                />
              ) : (
                <video
                  src={uploadedMedia}
                  controls
                  className="max-h-64 rounded-lg w-full"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setUploadedMedia(null);
                  setMediaType(null);
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
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
        accept="image/*,video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const type = file.type.startsWith('image/') ? 'image' : 'video';
            handleFileUpload(e, type);
          }
        }}
        className="hidden"
      />

      <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || posting || !!uploadedMedia}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 animate-spin" />
            ) : (
              <Image className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            )}
            <span className="hidden sm:inline text-xs sm:text-sm">Photo/Video</span>
          </Button>
        </div>
        <Button
          className="bg-gradient-to-r from-purple-600 to-pink-600 h-8 sm:h-9 px-4 sm:px-6 text-sm sm:text-base"
          onClick={handlePost}
          disabled={posting || uploading || (!postText.trim() && !uploadedMedia)}
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
