import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PutObjectCommand, S3Client } from 'https://esm.sh/@aws-sdk/client-s3@3';

// CORS headers for all responses
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

// Function to create R2 client on demand
function createR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  console.log('Creating R2 client for account:', R2_ACCOUNT_ID);
  console.log('R2 endpoint:', `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
  console.log('R2 bucket:', R2_BUCKET);

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    // Add timeout configuration
    requestHandler: {
      connectionTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;

    if (!file || !bucket) {
      return new Response(
        JSON.stringify({ error: 'Missing file or bucket parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const isImage = allowedImageTypes.includes(file.type);
    const isVideo = allowedVideoTypes.includes(file.type) || file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only images (JPEG, PNG, WebP, GIF) and videos allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    const maxSize = (bucket === 'covers' || bucket === 'backgrounds')
      ? 10 * 1024 * 1024 // 10MB for covers
      : isVideo
      ? 100 * 1024 * 1024 // 100MB for videos
      : 5 * 1024 * 1024; // 5MB for other images

    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split('-')[0];
    const fileName = `${bucket}/${user.id}/${timestamp}-${randomId}.${fileExt}`;

    console.log(`Uploading file: ${fileName}, Size: ${file.size} bytes, Type: ${file.type}`);

    // Create R2 client for this request
    const r2Client = createR2Client();

    // Upload to R2 with error handling
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log(`File converted to array buffer: ${arrayBuffer.byteLength} bytes`);

      const uploadCommand = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000', // Cache for 1 year
        Metadata: {
          'uploaded-by': user.id,
          'uploaded-at': new Date().toISOString(),
        },
      });

      console.log('Sending upload command to R2...');
      const uploadResult = await r2Client.send(uploadCommand);
      console.log('R2 upload result:', uploadResult);
    } catch (r2Error) {
      console.error('R2 upload error:', r2Error);
      console.error('R2 error details:', JSON.stringify(r2Error, null, 2));
      throw new Error(`R2 upload failed: ${r2Error.message || r2Error.toString()}`);
    }

    // Generate public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${fileName}`
      : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${fileName}`;

    console.log(`Upload successful: ${publicUrl}`);

    return new Response(
      JSON.stringify({ url: publicUrl, fileName }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Upload failed',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
