import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/image-upload-hybrid';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';

interface StoryUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export function StoryUpload({ open, onOpenChange, onSuccess }: StoryUploadProps) {
  const { user } = useAuth();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles: MediaFile[] = [];

    for (const selectedFile of selectedFiles) {
      // Validate file type
      const isImage = selectedFile.type.startsWith('image/');
      const isVideo = selectedFile.type.startsWith('video/');

      if (!isImage && !isVideo) {
        toast.error(`${selectedFile.name}: Invalid file type`);
        continue;
      }

      // Validate file size
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast.error(`${selectedFile.name}: File too large. Max ${isVideo ? '50MB' : '10MB'}`);
        continue;
      }

      // Validate video duration (max 60 seconds)
      if (isVideo) {
        try {
          const duration = await getVideoDuration(selectedFile);
          if (duration > 60) {
            toast.error(`${selectedFile.name}: Video must be 60 seconds or less`);
            continue;
          }
        } catch (err) {
          console.error('Error validating video:', err);
          toast.error(`${selectedFile.name}: Failed to validate video`);
          continue;
        }
      }

      validFiles.push({
        file: selectedFile,
        preview: URL.createObjectURL(selectedFile),
        type: isImage ? 'image' : 'video'
      });
    }

    if (validFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added`);
    }
  };

  const handleUpload = async () => {
    if (mediaFiles.length === 0 || !user) return;

    try {
      setUploading(true);
      setCurrentUploadIndex(0);

      // Upload each file sequentially
      for (let i = 0; i < mediaFiles.length; i++) {
        setCurrentUploadIndex(i);
        const media = mediaFiles[i];

        // Calculate progress per file
        const baseProgress = (i / mediaFiles.length) * 100;
        const progressIncrement = 100 / mediaFiles.length;

        setUploadProgress(baseProgress + progressIncrement * 0.2);

        // Upload media to R2
        const bucket = media.type === 'video' ? 'videos' : 'posts';
        const mediaUrl = await uploadImage(media.file, bucket, user.id);

        setUploadProgress(baseProgress + progressIncrement * 0.6);

        // Get duration
        let duration = 5;
        if (media.type === 'video') {
          duration = await getVideoDuration(media.file);
        }

        setUploadProgress(baseProgress + progressIncrement * 0.8);

        // Insert story into database
        const { error } = await supabase.from('stories').insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: media.type,
          thumbnail_url: media.type === 'video' ? mediaUrl : null,
          duration: duration
        });

        if (error) throw error;

        setUploadProgress(baseProgress + progressIncrement);
      }

      toast.success(`${mediaFiles.length} ${mediaFiles.length === 1 ? 'story' : 'stories'} uploaded successfully!`);
      onOpenChange(false);
      resetForm();
      onSuccess?.();

    } catch (err: any) {
      console.error('Error uploading story:', err);
      toast.error(err.message || 'Failed to upload stories');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setCurrentUploadIndex(0);
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
        resolve(10);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
    if (currentIndex >= mediaFiles.length - 1) {
      setCurrentIndex(Math.max(0, mediaFiles.length - 2));
    }
  };

  const resetForm = () => {
    mediaFiles.forEach(media => URL.revokeObjectURL(media.preview));
    setMediaFiles([]);
    setCurrentIndex(0);
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

  const currentMedia = mediaFiles[currentIndex];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create Story {mediaFiles.length > 0 && `(${mediaFiles.length})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Preview */}
          {mediaFiles.length > 0 ? (
            <div className="space-y-3">
              {/* Main Preview - Fixed Size */}
              <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden flex items-center justify-center">
                {currentMedia.type === 'image' ? (
                  <img
                    src={currentMedia.preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={currentMedia.preview}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}

                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                    onClick={() => removeFile(currentIndex)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}

                {/* Navigation Arrows */}
                {mediaFiles.length > 1 && (
                  <>
                    {currentIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full p-2"
                        onClick={() => setCurrentIndex(prev => prev - 1)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                    )}
                    {currentIndex < mediaFiles.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full p-2"
                        onClick={() => setCurrentIndex(prev => prev + 1)}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    )}
                  </>
                )}

                {/* Counter */}
                {mediaFiles.length > 1 && (
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    {currentIndex + 1} / {mediaFiles.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {mediaFiles.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mediaFiles.map((media, index) => (
                    <div
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        index === currentIndex
                          ? 'border-purple-500 scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {media.type === 'image' ? (
                        <img
                          src={media.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add More Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Add More Files
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-[400px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-purple-500 transition-colors"
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
                  Select multiple images or videos
                </p>
                <p className="text-xs text-gray-500">
                  Images: up to 10MB • Videos: up to 50MB, max 60s
                </p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-center text-gray-500">
                Uploading {currentUploadIndex + 1} of {mediaFiles.length}... {Math.round(uploadProgress)}%
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
              disabled={mediaFiles.length === 0 || uploading}
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
                  Upload {mediaFiles.length > 0 ? `(${mediaFiles.length})` : 'Story'}
                </>
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Stories disappear after 24 hours</p>
            <p>• Select multiple files to upload as separate stories</p>
            <p>• Images display for 5 seconds, videos play for their duration</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
