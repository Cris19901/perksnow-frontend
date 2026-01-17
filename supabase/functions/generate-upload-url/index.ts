import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Generate AWS Signature V4 for pre-signed URL
async function generatePresignedUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 300
): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = 'auto';

  // Current timestamp
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  // Credential scope
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  // Canonical request components
  const method = 'PUT';
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQueryString = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  }).toString();

  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  // String to sign
  const encoder = new TextEncoder();
  const canonicalRequestHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(canonicalRequest)
  );
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHashHex
  ].join('\n');

  // Calculate signature
  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = await hmac(`AWS4${key}`, dateStamp);
    const kRegion = await hmac(kDate, regionName);
    const kService = await hmac(kRegion, serviceName);
    const kSigning = await hmac(kService, 'aws4_request');
    return kSigning;
  };

  const hmac = async (key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> => {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      typeof key === 'string' ? encoder.encode(key) : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  };

  const signingKey = await getSignatureKey(
    R2_SECRET_ACCESS_KEY,
    dateStamp,
    region,
    's3'
  );

  const signature = await hmac(signingKey, stringToSign);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Construct final URL
  const finalUrl = `${endpoint}/${bucket}/${key}?${canonicalQueryString}&X-Amz-Signature=${signatureHex}`;

  return finalUrl;
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

    // Generate pre-signed URL (valid for 5 minutes)
    const uploadUrl = await generatePresignedUrl(R2_BUCKET, fileKey, fileType, 300);

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
