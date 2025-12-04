import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Upload, Video, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReelUploadProps {
  onUploadComplete?: () => void;
  onClose?: () => void;
}

export function ReelUpload({ onUploadComplete, onClose }: ReelUploadProps) {
  const { user } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup preview URL
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      setError('Video file is too large. Maximum size is 100MB');
      return;
    }

    setError(null);
    setVideoFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleVideoDuration = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(Math.round(duration));

      // Validate duration (recommend 15-60 seconds)
      if (duration < 3) {
        setError('Video is too short. Minimum duration is 3 seconds');
      } else if (duration > 180) {
        setError('Video is too long. Maximum duration is 3 minutes');
      }
    }
  };

  const generateThumbnail = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) {
        reject(new Error('Video element not found'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Seek to 1 second or 10% of video duration
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;

      video.addEventListener('seeked', () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      }, { once: true });
    });
  };

  const handleUpload = async () => {
    if (!videoFile || !user) {
      toast.error('Please select a video to upload');
      return;
    }

    if (error) {
      toast.error('Please fix the errors before uploading');
      return;
    }

    if (caption.trim().length === 0) {
      toast.error('Please add a caption to your reel');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      // Generate thumbnail
      setUploadProgress(20);
      const thumbnailBlob = await generateThumbnail();

      // Upload video to storage
      setUploadProgress(30);
      const videoPath = `${user.id}/${Date.now()}_${videoFile.name}`;
      const { data: videoData, error: videoError } = await supabase.storage
        .from('reels')
        .upload(videoPath, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (videoError) throw videoError;

      setUploadProgress(60);

      // Upload thumbnail
      const thumbPath = `${user.id}/thumb_${Date.now()}.jpg`;
      const { data: thumbData, error: thumbError } = await supabase.storage
        .from('reels')
        .upload(thumbPath, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (thumbError) throw thumbError;

      setUploadProgress(80);

      // Get public URLs
      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(videoPath);

      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(thumbPath);

      // Create reel record in database
      const { error: insertError } = await supabase.from('reels').insert({
        user_id: user.id,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption.trim(),
        duration: videoDuration
      });

      if (insertError) throw insertError;

      setUploadProgress(100);
      toast.success('Reel uploaded successfully! You earned 50 points! 🎉');

      // Reset form
      setTimeout(() => {
        setVideoFile(null);
        setVideoPreview(null);
        setCaption('');
        setVideoDuration(0);
        setUploadProgress(0);
        setUploading(false);
        onUploadComplete?.();
      }, 1000);

    } catch (err: any) {
      console.error('Error uploading reel:', err);
      toast.error(err.message || 'Failed to upload reel');
      setUploadProgress(0);
      setUploading(false);
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Upload Reel
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Upload Area */}
        {!videoPreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Click to upload video
            </p>
            <p className="text-sm text-gray-500">
              MP4, MOV, or WebM (max 100MB)
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Recommended: 15-60 seconds, 720p-1080p
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoPreview}
                controls
                onLoadedMetadata={handleVideoDuration}
                className="w-full max-h-[400px] object-contain"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveVideo}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>

            {/* Video Info */}
            {videoDuration > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Duration: {videoDuration} seconds</span>
                <span className="text-gray-400">•</span>
                <span>Size: {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Caption Input */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                placeholder="Write a caption for your reel..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={500}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 text-right">
                {caption.length}/500 characters
              </p>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="font-medium text-purple-600">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={uploading || !!error || !caption.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {uploading ? (
                <>Uploading... {uploadProgress}%</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Reel & Earn 50 Points
                </>
              )}
            </Button>
          </div>
        )}

        {/* Tips */}
        {!videoPreview && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-blue-900 mb-2">Tips for great reels:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Keep it short and engaging (15-60 seconds)</li>
              <li>• Use good lighting and clear audio</li>
              <li>• Add an interesting caption</li>
              <li>• Record in portrait mode for best viewing</li>
              <li>• Earn 50 points for each upload + bonus for views!</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
