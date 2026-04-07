/**
 * cleanup-r2-storage
 * Deletes R2 objects that are no longer referenced by any post, reel, or user.
 * Should be run on a schedule (e.g. weekly via pg_cron or Supabase cron).
 *
 * Only deletes files older than 24 hours to avoid race conditions with uploads.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from 'https://esm.sh/@aws-sdk/client-s3@3';

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const R2_ACCOUNT_ID           = Deno.env.get('R2_ACCOUNT_ID') ?? '';
const R2_ACCESS_KEY_ID        = Deno.env.get('R2_ACCESS_KEY_ID') ?? '';
const R2_SECRET_ACCESS_KEY    = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '';
const R2_BUCKET               = Deno.env.get('R2_BUCKET_NAME') ?? 'perksnow-media-dev';
const R2_PUBLIC_URL           = Deno.env.get('R2_PUBLIC_URL') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Require a valid Bearer token (anon or service-role; actual DB ops use service-role internally)
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    // 1. Collect all referenced R2 keys from DB
    const referenced = new Set<string>();

    // Posts: image_url
    const { data: posts } = await supabase
      .from('posts').select('image_url').not('image_url', 'is', null);
    for (const p of posts ?? []) {
      if (p.image_url?.startsWith(R2_PUBLIC_URL)) {
        referenced.add(p.image_url.replace(R2_PUBLIC_URL + '/', ''));
      }
    }

    // Post images table
    const { data: postImages } = await supabase
      .from('post_images').select('image_url');
    for (const p of postImages ?? []) {
      if (p.image_url?.startsWith(R2_PUBLIC_URL)) {
        referenced.add(p.image_url.replace(R2_PUBLIC_URL + '/', ''));
      }
    }

    // Reels: video_url + thumbnail_url
    const { data: reels } = await supabase
      .from('reels').select('video_url, thumbnail_url');
    for (const r of reels ?? []) {
      if (r.video_url?.startsWith(R2_PUBLIC_URL)) {
        referenced.add(r.video_url.replace(R2_PUBLIC_URL + '/', ''));
      }
      if (r.thumbnail_url?.startsWith(R2_PUBLIC_URL)) {
        referenced.add(r.thumbnail_url.replace(R2_PUBLIC_URL + '/', ''));
      }
    }

    // Users: avatar_url
    const { data: users } = await supabase
      .from('users').select('avatar_url').not('avatar_url', 'is', null);
    for (const u of users ?? []) {
      if (u.avatar_url?.startsWith(R2_PUBLIC_URL)) {
        referenced.add(u.avatar_url.replace(R2_PUBLIC_URL + '/', ''));
      }
    }

    console.log(`Referenced files in DB: ${referenced.size}`);

    // 2. List all R2 objects
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h ago
    const orphans: { Key: string }[] = [];
    let continuationToken: string | undefined;

    do {
      const listCmd = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
      });
      const listResult = await s3.send(listCmd);

      for (const obj of listResult.Contents ?? []) {
        if (!obj.Key) continue;
        // Skip files uploaded in last 24h (may not be committed to DB yet)
        if (obj.LastModified && obj.LastModified.getTime() > cutoff) continue;
        // Skip if referenced
        if (referenced.has(obj.Key)) continue;
        orphans.push({ Key: obj.Key });
      }

      continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
    } while (continuationToken);

    console.log(`Orphaned files found: ${orphans.length}`);

    if (orphans.length === 0) {
      return new Response(
        JSON.stringify({ deleted: 0, message: 'No orphaned files found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Delete in batches of 1000 (S3 API limit)
    let totalDeleted = 0;
    for (let i = 0; i < orphans.length; i += 1000) {
      const batch = orphans.slice(i, i + 1000);
      const deleteCmd = new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: batch, Quiet: true },
      });
      await s3.send(deleteCmd);
      totalDeleted += batch.length;
      console.log(`Deleted batch: ${batch.length} (total: ${totalDeleted})`);
    }

    return new Response(
      JSON.stringify({
        deleted: totalDeleted,
        referenced: referenced.size,
        message: `Cleaned up ${totalDeleted} orphaned files`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('cleanup-r2-storage error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
