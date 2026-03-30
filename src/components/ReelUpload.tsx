import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Upload, Video, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyLimits } from '@/hooks/useDailyLimits';
import { uploadImage, uploadVideo, generateVideoThumbnail } from '@/lib/upload-service';
import { toast } from 'sonner';

interface ReelUploadProps {
  onUploadComplete?: () => void;
  onClose?: () => void;
}

export function ReelUpload({ onUploadComplete, onClose }: ReelUploadProps) {
  const { user } = useAuth();
  const { limits, checkCanPost, incrementPostCount, fetchLimits } = useDailyLimits();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [uploadETA, setUploadETA] = useState<number>(0);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);
  const [shouldCompress, setShouldCompress] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const lastProgressRef = useRef<{ loaded: number; timestamp: number }>({ loaded: 0, timestamp: 0 });

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

  const handleVideoDuration = async () => {
    if (videoRef.current && videoFile) {
      const duration = videoRef.current.duration;
      setVideoDuration(Math.round(duration));

      // Validate duration (recommend 15-60 seconds, max 10 minutes)
      if (duration < 3) {
        setError('Video is too short. Minimum duration is 3 seconds');
      } else if (duration > 600) {
        setError('Video is too long. Maximum duration is 10 minutes');
      }

      // Analyze video to determine if compression is needed
      await analyzeVideo(videoFile);
    }
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    const mbps = bytesPerSecond / (1024 * 1024);
    return mbps >= 1 ? `${mbps.toFixed(1)} MB/s` : `${(mbps * 1024).toFixed(0)} KB/s`;
  };

  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const analyzeVideo = async (file: File): Promise<void> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const fileSizeMB = file.size / (1024 * 1024);

        setVideoResolution({ width, height });

        // Determine if compression is beneficial:
        // - Files larger than 25MB
        // - OR resolution higher than 1080p
        // - OR aspect ratio suggests high quality (width > 1920)
        const needsCompression =
          fileSizeMB > 25 ||
          width > 1920 ||
          height > 1920;

        setShouldCompress(needsCompression);
        URL.revokeObjectURL(video.src);
        resolve();
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const compressVideo = async (file: File): Promise<File> => {
    if (!shouldCompress) {
      return file; // No compression needed
    }

    try {
      setCompressing(true);
      setCompressionProgress(0);

      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas not supported');

      // Load video
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = URL.createObjectURL(file);
      });

      // Calculate target resolution (max 1080p)
      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;

      if (targetWidth > 1920 || targetHeight > 1920) {
        const aspectRatio = targetWidth / targetHeight;
        if (targetWidth > targetHeight) {
          targetWidth = 1920;
          targetHeight = Math.round(1920 / aspectRatio);
        } else {
          targetHeight = 1920;
          targetWidth = Math.round(1920 * aspectRatio);
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Set up MediaRecorder
      const stream = canvas.captureStream(30); // 30 FPS
      const chunks: Blob[] = [];

      const mimeType = 'video/webm;codecs=vp8';
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps - good quality, reasonable size
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      video.play();

      // Draw frames to canvas
      const drawFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Update progress
        const progress = (video.currentTime / video.duration) * 100;
        setCompressionProgress(Math.round(progress));

        requestAnimationFrame(drawFrame);
      };

      drawFrame();

      // Wait for recording to finish
      const compressedBlob = await new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: 'video/webm' }));
        };
      });

      // Clean up
      URL.revokeObjectURL(video.src);
      video.pause();

      // Convert to File
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^.]+$/, '.webm'),
        { type: 'video/webm' }
      );

      const originalSizeMB = file.size / (1024 * 1024);
      const compressedSizeMB = compressedFile.size / (1024 * 1024);
      const savings = ((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100;

      toast.success(`Video optimized! Reduced from ${originalSizeMB.toFixed(1)}MB to ${compressedSizeMB.toFixed(1)}MB (${savings.toFixed(0)}% smaller)`);

      setCompressing(false);
      return compressedFile;

    } catch (error) {
      console.error('Compression failed:', error);
      toast.error('Compression failed, uploading original video');
      setCompressing(false);
      return file; // Fallback to original file
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

    // Check daily post limit (reels count as posts)
    const canPost = await checkCanPost();
    if (!canPost) {
      toast.error(`You've reached your daily post limit (${limits.posts_limit} posts). Upgrade your subscription for more posts!`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(5);
      uploadStartTimeRef.current = Date.now();
      lastProgressRef.current = { loaded: 0, timestamp: Date.now() };

      // Compress video if needed
      let fileToUpload = videoFile;
      if (shouldCompress) {
        setUploadStatus('Optimizing video...');
        fileToUpload = await compressVideo(videoFile);
        setUploadProgress(5);
      }

      // Generate thumbnail using optimized function
      setUploadStatus('Generating thumbnail...');
      setUploadProgress(10);
      const thumbnailBlob = await generateVideoThumbnail(fileToUpload, 1);

      // Convert thumbnail blob to File
      const thumbnailFile = new File(
        [thumbnailBlob],
        `thumb_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );

      setUploadProgress(15);

      // Upload thumbnail first (faster, smaller file)
      setUploadStatus('Uploading thumbnail...');
      const thumbnailUrl = await uploadImage(thumbnailFile, 'videos', user.id);

      setUploadProgress(20);
      setUploadStatus('Uploading video...');

      // Upload video with enhanced progress tracking
      const videoUrl = await uploadVideo(
        fileToUpload,
        user.id,
        (progress) => {
          const now = Date.now();
          const timeDiff = (now - lastProgressRef.current.timestamp) / 1000; // seconds

          if (timeDiff > 0.5) { // Update speed every 500ms
            const bytesDiff = progress.loaded - lastProgressRef.current.loaded;
            const speed = bytesDiff / timeDiff; // bytes per second

            setUploadSpeed(speed);

            // Calculate ETA
            const remaining = progress.total - progress.loaded;
            const eta = remaining / speed;
            setUploadETA(eta);

            lastProgressRef.current = { loaded: progress.loaded, timestamp: now };
          }

          // Map video upload progress (20-90%)
          const mappedProgress = 20 + (progress.percentage * 0.7);
          setUploadProgress(Math.round(mappedProgress));
        }
      );

      setUploadProgress(90);
      setUploadStatus('Finalizing...');

      // Create reel record in database
      const { error: insertError } = await supabase.from('reels').insert({
        user_id: user.id,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        caption: caption.trim(),
        duration: videoDuration
      });

      if (insertError) throw insertError;

      // Increment post count (reels count as posts)
      await incrementPostCount();

      setUploadProgress(100);
      toast.success(`Reel uploaded successfully! You earned 250 points! (${limits.posts_used + 1}/${limits.posts_limit} posts used today)`);

      // Refresh limits to update UI
      await fetchLimits();

      // Reset form
      setTimeout(() => {
        setVideoFile(null);
        setVideoPreview(null);
        setCaption('');
        setVideoDuration(0);
        setUploadProgress(0);
        setUploadStatus('');
        setUploadSpeed(0);
        setUploadETA(0);
        setVideoResolution(null);
        setShouldCompress(false);
        setCompressing(false);
        setCompressionProgress(0);
        setUploading(false);
        onUploadComplete?.();
      }, 1000);

    } catch (err: any) {
      console.error('Error uploading reel:', err);
      toast.error(err.message || 'Failed to upload reel');
      setUploadProgress(0);
      setUploadStatus('');
      setUploadSpeed(0);
      setUploadETA(0);
      setCompressing(false);
      setCompressionProgress(0);
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
    setVideoResolution(null);
    setShouldCompress(false);
    setCompressing(false);
    setCompressionProgress(0);
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
              Recommended: 15-60 seconds (max 10 minutes), 720p-1080p
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
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Duration: {videoDuration} seconds</span>
                    <span className="text-gray-400">•</span>
                    <span>Size: {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  {videoResolution && (
                    <p className="text-sm text-gray-600">
                      Resolution: {videoResolution.width}x{videoResolution.height}
                    </p>
                  )}
                  {shouldCompress && (
                    <p className="text-sm text-orange-600 font-medium mt-2 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      Will be optimized for faster upload
                    </p>
                  )}
                </div>

                {/* Optimization Tips */}
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-1">
                    💡 Pro Tips for Fast Uploads
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✅ Record in 1080p (not 4K) for faster uploads</li>
                    <li>✅ Keep videos under 60 seconds when possible</li>
                    <li>✅ Use good lighting to reduce file size</li>
                    <li>✅ Stable Wi-Fi is faster than mobile data</li>
                  </ul>
                </div>
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

            {/* Compression Progress */}
            {compressing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                    Optimizing video...
                  </span>
                  <span className="font-medium text-orange-600">{compressionProgress}%</span>
                </div>
                <Progress value={compressionProgress} className="h-2" />
              </div>
            )}

            {/* Upload Progress */}
            {uploading && !compressing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{uploadStatus}</span>
                  <span className="font-medium text-purple-600">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                {uploadSpeed > 0 && uploadETA > 0 && uploadProgress > 20 && uploadProgress < 90 && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Speed: {formatSpeed(uploadSpeed)}</span>
                    <span>ETA: {formatETA(uploadETA)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Daily Limit Warning */}
            {!limits.can_post && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Daily post limit reached</p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    You've used all {limits.posts_limit} posts for today. Upgrade your subscription for more posts!
                  </p>
                </div>
              </div>
            )}

            {/* Daily Limit Display */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Daily posts (includes reels)</span>
              <span className="font-medium">{limits.posts_used}/{limits.posts_limit} posts used</span>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={uploading || compressing || !!error || !caption.trim() || !limits.can_post}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {compressing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  Optimizing... {compressionProgress}%
                </>
              ) : uploading ? (
                <>Uploading... {uploadProgress}%</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Reel & Earn 250 Points
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
              <li>• Earn 250 points for each upload + bonus for views!</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
