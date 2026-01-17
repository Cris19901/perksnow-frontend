# Mobile R2 Upload 502 Error Investigation

## Current Situation

- **Works on:** Desktop browsers
- **Fails on:** Mobile devices (iOS/Android)
- **Error:** 502 Bad Gateway when uploading to R2 via Edge Function
- **User requirement:** R2-only uploads (no Supabase Storage fallback)

## Error Details

```
POST https://185.16.39.144/functions/v1/upload-media 502 (Bad Gateway)
Upload error response: <html><head><title>502 Bad Gateway</title></head></html>
```

## Potential Root Causes

### 1. **Timeout Issues**
- Mobile networks are slower than desktop WiFi
- Edge Function might timeout before R2 upload completes
- Default Supabase Edge Function timeout: 60 seconds
- S3Client might have internal timeouts

### 2. **Chunked Transfer Encoding**
- Mobile browsers may handle FormData differently
- Could be sending chunked encoding that R2 doesn't like
- Content-Length header might be missing

### 3. **Connection Pooling**
- Current implementation creates S3Client per request
- Might be hitting R2 connection limits on mobile IPs
- Mobile networks often use NAT, many users share same IP

### 4. **SSL/TLS Issues**
- Mobile devices might use different TLS versions
- Cloudflare R2 might reject certain cipher suites
- Edge Function → R2 connection might fail on mobile network paths

### 5. **File Size / Memory**
- Mobile might be sending larger files than desktop
- ArrayBuffer conversion could fail on large files in Deno
- Edge Function memory limit (150MB on free tier)

### 6. **DNS/Routing**
- Edge Function IP (185.16.39.144) might be routing differently for mobile
- Cloudflare R2 endpoint might have issues with mobile traffic
- Geographic routing differences between desktop and mobile

## Proposed Solutions

### Solution 1: Add Retry Logic with Exponential Backoff
- Retry failed uploads 2-3 times
- Helps with transient network issues

### Solution 2: Streaming Upload Instead of ArrayBuffer
- Use streaming to avoid memory issues
- Better for large files on mobile

### Solution 3: Increase Timeouts
- Add explicit timeout configuration
- Handle timeout gracefully

### Solution 4: Add Compression for Large Files
- Compress images before upload on client side
- Reduces upload time and network pressure

### Solution 5: Use Different R2 Endpoint
- Try custom domain instead of default endpoint
- Might have better mobile routing

### Solution 6: Direct S3-Compatible Upload (Pre-signed URLs)
- Generate pre-signed URL from Edge Function
- Client uploads directly to R2 with pre-signed URL
- Avoids proxying large files through Edge Function

## Recommended Next Steps

1. **Add detailed logging to Edge Function** to see exactly where it fails
2. **Test with different file sizes** to isolate if it's a size issue
3. **Implement pre-signed URL approach** (most reliable for mobile)
4. **Add retry logic** as fallback
