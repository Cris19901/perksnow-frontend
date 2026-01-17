import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Get R2 config from environment
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
const R2_BUCKET = Deno.env.get('R2_BUCKET_NAME') || 'perksnow-media-dev';
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL') || '';

// Create R2 client
function createR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { bucket, fileName, fileType, fileSize } = await req.json();

    // Validate bucket
    const allowedBuckets = ['avatars', 'covers', 'backgrounds', 'posts', 'products', 'videos'];
    if (!allowedBuckets.includes(bucket)) {
      return new Response(
        JSON.stringify({ error: 'Invalid bucket name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    const isImage = allowedImageTypes.includes(fileType);
    const isVideo = allowedVideoTypes.includes(fileType) || fileType.startsWith('video/');

    if (!isImage && !isVideo) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    const maxSize = (bucket === 'covers' || bucket === 'backgrounds')
      ? 10 * 1024 * 1024 // 10MB
      : isVideo
      ? 100 * 1024 * 1024 // 100MB
      : 5 * 1024 * 1024; // 5MB

    if (fileSize > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique file key
    const fileExt = fileName.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split('-')[0];
    const fileKey = `${bucket}/${user.id}/${timestamp}-${randomId}.${fileExt}`;

    console.log(`Generating pre-signed URL for: ${fileKey}`);

    // Create R2 client
    const r2Client = createR2Client();

    // Generate pre-signed URL (valid for 5 minutes)
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      ContentType: fileType,
      CacheControl: 'public, max-age=31536000',
      Metadata: {
        'uploaded-by': user.id,
        'uploaded-at': new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 minutes

    // Generate public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${fileKey}`
      : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${fileKey}`;

    console.log(`Pre-signed URL generated successfully for ${fileKey}`);

    return new Response(
      JSON.stringify({
        uploadUrl,
        publicUrl,
        fileKey,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate upload URL',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
