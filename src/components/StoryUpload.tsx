import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image-upload';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';

interface StoryUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StoryUpload({ open, onOpenChange, onSuccess }: StoryUploadProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Please select an image or video file');
      return;
    }

    // Validate file size
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for videos, 10MB for images
    if (selectedFile.size > maxSize) {
      toast.error(`File too large. Maximum size is ${isVideo ? '50MB' : '10MB'}`);
      return;
    }

    // Validate video duration (max 60 seconds)
    if (isVideo) {
      try {
        const duration = await getVideoDuration(selectedFile);
        if (duration > 60) {
          toast.error('Video must be 60 seconds or less');
          return;
        }
      } catch (err) {
        console.error('Error validating video:', err);
        toast.error('Failed to validate video. Please try another file.');
        return;
      }
    }

    setFile(selectedFile);
    setMediaType(isImage ? 'image' : 'video');
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async () => {
    if (!file || !user || !mediaType) return;

    try {
      setUploading(true);
      setUploadProgress(10);

      // Upload media to R2
      const bucket = mediaType === 'video' ? 'videos' : 'posts';
      const mediaUrl = await uploadImage(file, bucket, user.id);
      setUploadProgress(60);

      // Get video duration if it's a video
      let duration = 5; // Default 5 seconds for images
      if (mediaType === 'video' && file) {
        duration = await getVideoDuration(file);
      }

      setUploadProgress(80);

      // Insert story into database
      const { error } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        thumbnail_url: mediaType === 'video' ? mediaUrl : null,
        duration: duration
      });

      if (error) throw error;

      setUploadProgress(100);

      toast.success('Story uploaded successfully!');
      onOpenChange(false);
      resetForm();
      onSuccess?.();

    } catch (err: any) {
      console.error('Error uploading story:', err);
      toast.error(err.message || 'Failed to upload story');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.floor(video.duration));
      };
      video.onerror = () => {
        resolve(10); // Default to 10 seconds if we can't get duration
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setMediaType(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Preview */}
          {preview ? (
            <div className="relative max-h-[60vh] aspect-[9/16] bg-black rounded-lg overflow-hidden">
              {mediaType === 'image' ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={preview}
                  controls
                  className="w-full h-full object-contain"
                />
              )}
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                  onClick={resetForm}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[9/16] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-purple-500 transition-colors"
            >
              <div className="flex gap-4">
                <div className="p-4 bg-purple-100 rounded-full">
                  <ImageIcon className="w-8 h-8 text-purple-600" />
                </div>
                <div className="p-4 bg-pink-100 rounded-full">
                  <Video className="w-8 h-8 text-pink-600" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">
                  Click to upload
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Image (up to 10MB) or Video (up to 50MB, max 60s)
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-center text-gray-500">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Story
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Stories disappear after 24 hours</p>
            <p>• Images display for 5 seconds by default</p>
            <p>• Videos play for their full duration (max 60 seconds)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
