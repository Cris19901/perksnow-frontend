# Scalable Architecture Guide for 100K+ Users

## Overview

This guide outlines the recommended architecture for scaling LavLay to hundreds of thousands of users.

---

## Recommended Stack

### Core Infrastructure

| Component | Technology | Why | Cost at 100K Users |
|-----------|-----------|-----|-------------------|
| **Database** | Supabase (Postgres) | Built-in scaling, connection pooling, real-time | $25-99/mo |
| **Media Storage** | Cloudflare R2 | S3-compatible, free egress, unlimited scale | $15/mo |
| **CDN** | Cloudflare | Global edge network, DDoS protection | Free-$20/mo |
| **Backend** | Supabase Edge Functions | Serverless, auto-scaling, Deno runtime | Included |
| **Email** | Resend/Brevo | Reliable delivery, good analytics | $10-40/mo |
| **Payments** | Paystack | Nigerian market, lower fees than Stripe | 1.5% + ₦100 |

**Total Monthly Cost: $50-175/month** vs $500-2000/month on AWS

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         End Users                            │
│                  (Mobile + Desktop Browsers)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN                            │
│         (Static Assets, Images, Global Distribution)         │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐    ┌──────────────────────────────┐
│   Vercel/Cloudflare    │    │      Cloudflare R2           │
│     (Frontend)         │    │    (Media Storage)           │
│   - React/Vite App     │    │  - Images, Videos            │
│   - Edge Functions     │    │  - User Uploads              │
└────────┬───────────────┘    └──────────────────────────────┘
         │                              ▲
         ▼                              │
┌──────────────────────────────────────┴────────────────────┐
│              Supabase (Backend as a Service)              │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  Postgres   │  │  Auth       │  │  Edge Functions  │  │
│  │  Database   │  │  (JWT)      │  │  - Upload Media  │  │
│  │             │  │             │  │  - Process Jobs  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  Realtime   │  │  Storage    │  │  Webhooks        │  │
│  │  (WebSocket)│  │  (Temp)     │  │  - Email Queue   │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└────────┬──────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                   External Services                       │
│  - Resend/Brevo (Email)                                  │
│  - Paystack (Payments)                                   │
│  - Cloudflare Analytics                                  │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Fix Media Upload (Week 1)

**Goal:** Secure, scalable media uploads via Edge Functions

#### Step 1.1: Create Upload Edge Function

Create `supabase/functions/upload-media/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PutObjectCommand, S3Client } from 'https://esm.sh/@aws-sdk/client-s3@3';

// R2 Configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  },
});

const R2_BUCKET = Deno.env.get('R2_BUCKET_NAME') || 'lavlay-media';
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL') || '';

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;

    if (!file || !bucket) {
      return new Response(JSON.stringify({ error: 'Missing file or bucket' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const maxSize = bucket === 'covers' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File too large' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${bucket}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000',
      })
    );

    // Generate public URL
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${fileName}`
      : `https://pub-${Deno.env.get('R2_ACCOUNT_ID')}.r2.dev/${fileName}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

#### Step 1.2: Update Frontend Upload Function

Update `src/lib/image-upload.ts`:

```typescript
import { supabase } from './supabase';

export async function uploadImage(
  file: File,
  bucket: 'avatars' | 'posts' | 'products' | 'videos' | 'covers' | 'backgrounds',
  userId: string
): Promise<string> {
  // Validate file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  const isImage = allowedImageTypes.includes(file.type);
  const isVideo = allowedVideoTypes.includes(file.type);

  if (!isImage && !isVideo) {
    throw new Error('Invalid file type');
  }

  // Validate size
  const maxSize = (bucket === 'covers' || bucket === 'backgrounds') ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Max ${maxSize / 1024 / 1024}MB`);
  }

  // Upload via Edge Function
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  const { url } = await response.json();
  return url;
}
```

#### Step 1.3: Deploy

```bash
# Set R2 secrets in Supabase
npx supabase secrets set R2_ACCOUNT_ID=your_account_id
npx supabase secrets set R2_ACCESS_KEY_ID=your_access_key
npx supabase secrets set R2_SECRET_ACCESS_KEY=your_secret_key
npx supabase secrets set R2_BUCKET_NAME=lavlay-media
npx supabase secrets set R2_PUBLIC_URL=https://media.lavlay.com

# Deploy function
npx supabase functions deploy upload-media
```

---

### Phase 2: Database Optimization (Week 2)

#### 2.1: Add Indexes for Common Queries

```sql
-- Feed queries (most common)
CREATE INDEX IF NOT EXISTS idx_posts_created_at_user ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC) WHERE deleted_at IS NULL;

-- Following queries
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Likes/Comments
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC);

-- Search
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING GIN(to_tsvector('english', full_name || ' ' || username));

-- Points transactions
CREATE INDEX IF NOT EXISTS idx_points_user_created ON points_transactions(user_id, created_at DESC);

-- Reels
CREATE INDEX IF NOT EXISTS idx_reels_created ON reels(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel ON reel_likes(reel_id);
```

#### 2.2: Enable Connection Pooling

In Supabase Dashboard → Settings → Database:
- Enable **Connection Pooling**
- Set **Pool Mode**: Transaction
- Max connections: 100 (adjust based on traffic)

#### 2.3: Optimize Feed Query

Create materialized view for feed (updates every 5 minutes):

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS feed_posts_mv AS
SELECT
  p.*,
  u.username,
  u.full_name,
  u.avatar_url,
  COALESCE(p.likes_count, 0) as likes_count,
  COALESCE(p.comments_count, 0) as comments_count
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC;

CREATE UNIQUE INDEX ON feed_posts_mv(id);

-- Refresh every 5 minutes
CREATE OR REPLACE FUNCTION refresh_feed_posts_mv()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY feed_posts_mv;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (enable in Supabase Dashboard)
SELECT cron.schedule('refresh-feed', '*/5 * * * *', 'SELECT refresh_feed_posts_mv()');
```

---

### Phase 3: Caching Strategy (Week 3)

#### 3.1: Cloudflare CDN for Media

1. Go to Cloudflare Dashboard → R2
2. Connect custom domain: `media.lavlay.com`
3. Enable CDN caching (automatic)

Benefits:
- 300+ edge locations globally
- 10x faster image delivery
- Free bandwidth (no egress fees)

#### 3.2: Frontend Caching

Update `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-application-name': 'lavlay-web',
      },
    },
    // Enable client-side caching
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

Add React Query for data caching:

```bash
npm install @tanstack/react-query
```

```typescript
// src/lib/react-query.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

### Phase 4: Monitoring & Analytics (Week 4)

#### 4.1: Set Up Monitoring

**Supabase Dashboard:**
- Enable **Log Explorer**
- Set up **Query Performance** alerts
- Monitor **Database Health**

**Cloudflare Analytics:**
- Track CDN cache hit rate (target: 95%+)
- Monitor bandwidth usage
- Track global latency

**Sentry (Error Tracking):**

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### 4.2: Performance Budgets

Set alerts when:
- Database query time > 100ms
- API response time > 200ms
- Image load time > 1s
- Page load time > 2s

---

## Scaling Checklist

### Current (0-1K users)
- [x] Basic Supabase setup
- [x] R2 media storage configured
- [ ] Edge function for uploads
- [ ] Database indexes
- [ ] CDN enabled

### 1K-10K users
- [ ] Connection pooling enabled
- [ ] Materialized views for feeds
- [ ] React Query caching
- [ ] Monitoring setup
- [ ] Auto-scaling configured

### 10K-100K users
- [ ] Read replicas (Supabase Pro)
- [ ] Redis caching layer
- [ ] Job queue for heavy tasks
- [ ] Rate limiting (Cloudflare)
- [ ] Database partitioning

### 100K+ users
- [ ] Multi-region deployment
- [ ] Dedicated database cluster
- [ ] Microservices architecture
- [ ] Advanced CDN (image optimization)
- [ ] Load balancer

---

## Cost Breakdown

### Current Setup (0-1K users)
- Supabase Free: $0
- R2: ~$5/month
- Vercel Free: $0
- **Total: $5/month**

### Growing (1K-10K users)
- Supabase Pro: $25/month
- R2: ~$15/month
- Vercel Pro: $20/month
- **Total: $60/month**

### Scaled (10K-100K users)
- Supabase Team: $599/month
- R2: ~$50/month
- Cloudflare Pro: $20/month
- Monitoring: $50/month
- **Total: $719/month**

### Enterprise (100K+ users)
- Supabase Enterprise: $2,500/month
- R2: ~$200/month
- Cloudflare Business: $200/month
- Other services: $500/month
- **Total: $3,400/month**

*Still 10x cheaper than AWS equivalent ($30K+/month)*

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 2s | Check |
| API Response | < 200ms | Check |
| Image Load | < 1s | Check |
| Database Queries | < 100ms | Check |
| Uptime | 99.9% | Check |

---

## Next Steps

1. **This Week**: Implement Edge Function upload (Phase 1)
2. **Next Week**: Add database indexes (Phase 2)
3. **Week 3**: Enable CDN caching (Phase 3)
4. **Week 4**: Set up monitoring (Phase 4)

---

## Resources

- [Supabase Scaling Guide](https://supabase.com/docs/guides/platform/going-into-prod)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Database Indexing Best Practices](https://supabase.com/docs/guides/database/postgres-indexes)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Need help implementing?** Start with Phase 1 - it's the most critical for immediate stability.
