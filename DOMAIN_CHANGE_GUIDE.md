# Domain Change Guide - Rebranding to LavLay

This guide will help you change the domain name for your LavLay project (formerly PerkSnow/SocialHub).

## Current Setup

### Hosting Infrastructure
- **Frontend**: Vercel
  - Repository: https://github.com/Cris19901/perksnow-frontend.git
  - Current domain: Vercel-provided domain (*.vercel.app)

- **Backend**: Railway
  - Current domain: Railway-provided domain (*.railway.app)

- **Database**: Supabase
  - URL: https://kswknblwjlkgxgvypkmo.supabase.co

## Step 1: Purchase Your New Domain

### Recommended Domain Registrars
- **Namecheap** (https://namecheap.com) - Affordable, good support
- **Google Domains** (https://domains.google) - Simple UI, reliable
- **Cloudflare** (https://cloudflare.com) - Free WHOIS privacy, fast DNS

### Domain Suggestions
- `lavlay.com` (primary)
- `lavlay.io` (tech/startup feel)
- `lavlay.app` (modern app)
- `getlavlay.com` (call to action)

## Step 2: Configure Domain for Vercel (Frontend)

### Option A: Using Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**:
   - Visit https://vercel.com/dashboard
   - Select your project

2. **Add Custom Domain**:
   - Go to "Settings" → "Domains"
   - Click "Add"
   - Enter your domain: `lavlay.com` or `www.lavlay.com`
   - Click "Add"

3. **Configure DNS Records**:

   Vercel will provide DNS records. Add these to your domain registrar:

   **For Root Domain (lavlay.com)**:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

   **For WWW Subdomain (www.lavlay.com)**:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

4. **Verify Domain**:
   - Vercel will automatically verify your domain (may take up to 48 hours)
   - SSL certificate will be automatically provisioned

### Option B: Using Cloudflare (Advanced)

1. **Add Domain to Cloudflare**:
   - Sign up at https://cloudflare.com
   - Click "Add Site"
   - Enter your domain

2. **Update Nameservers**:
   - Cloudflare will provide nameservers
   - Update at your domain registrar (e.g., Namecheap)
   - Wait for DNS propagation (up to 24 hours)

3. **Add DNS Records**:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   Proxy: Enabled (Orange cloud)

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   Proxy: Enabled (Orange cloud)
   ```

4. **Configure SSL in Cloudflare**:
   - Go to "SSL/TLS" → "Overview"
   - Set to "Full" or "Full (strict)"

5. **Add Domain in Vercel**:
   - Follow Option A steps to add domain in Vercel
   - Vercel will detect Cloudflare and adjust automatically

## Step 3: Configure Domain for Railway (Backend)

### Update Backend API Domain

1. **Go to Railway Dashboard**:
   - Visit https://railway.app/dashboard
   - Select your backend project

2. **Add Custom Domain**:
   - Go to "Settings" → "Domains"
   - Click "Custom Domain"
   - Enter subdomain: `api.lavlay.com`
   - Railway will provide a CNAME record

3. **Add DNS Record** (at your domain registrar or Cloudflare):
   ```
   Type: CNAME
   Name: api
   Value: [railway-provided-value].railway.app
   ```

4. **Wait for Verification**:
   - Railway will automatically verify and provision SSL
   - Usually takes 5-15 minutes

### Update Environment Variables

After domain is active, update these in Railway:

```bash
FRONTEND_URL=https://lavlay.com
API_URL=https://api.lavlay.com
```

## Step 4: Update Environment Variables

### Vercel Environment Variables

1. **Go to Vercel Project Settings**:
   - Select your project → "Settings" → "Environment Variables"

2. **Add/Update Variables**:
   ```
   VITE_API_URL=https://api.lavlay.com
   VITE_SUPABASE_URL=https://kswknblwjlkgxgvypkmo.supabase.co
   VITE_SUPABASE_ANON_KEY=[your-key]
   ```

3. **Redeploy**:
   - Go to "Deployments"
   - Click "..." on latest deployment → "Redeploy"

### Backend (.env file or Railway variables)

Update these in Railway's environment variables:

```bash
# Server Configuration
API_URL=https://api.lavlay.com
FRONTEND_URL=https://lavlay.com

# Supabase (no changes needed)
SUPABASE_URL=https://kswknblwjlkgxgvypkmo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-key]
SUPABASE_ANON_KEY=[your-key]

# Payment Gateways (update callback URLs)
PAYSTACK_CALLBACK_URL=https://lavlay.com/payment/callback
FLUTTERWAVE_CALLBACK_URL=https://lavlay.com/payment/callback

# Cloudflare R2 (optional - update bucket)
R2_BUCKET_NAME=lavlay-media
R2_PUBLIC_URL=https://media.lavlay.com
```

## Step 5: Update Supabase Configuration

### Update Allowed URLs

1. **Go to Supabase Dashboard**:
   - Visit https://app.supabase.com
   - Select your project

2. **Update Auth Settings**:
   - Go to "Authentication" → "URL Configuration"
   - Add to "Site URL": `https://lavlay.com`
   - Add to "Redirect URLs":
     ```
     https://lavlay.com
     https://www.lavlay.com
     https://lavlay.com/auth/callback
     https://lavlay.com/*
     ```

3. **Update CORS Settings** (if needed):
   - Go to "Settings" → "API"
   - Ensure your domain is allowed in CORS settings

## Step 6: Update Payment Provider Settings

### Paystack Configuration

1. **Login to Paystack Dashboard**:
   - Visit https://dashboard.paystack.com

2. **Update Webhook URL**:
   - Go to "Settings" → "Webhooks"
   - Update to: `https://api.lavlay.com/webhooks/paystack`

3. **Update Callback URL** (in code):
   - Already handled in Step 4 environment variables

### Flutterwave Configuration

1. **Login to Flutterwave Dashboard**:
   - Visit https://dashboard.flutterwave.com

2. **Update Webhook URL**:
   - Go to "Settings" → "Webhooks"
   - Update to: `https://api.lavlay.com/webhooks/flutterwave`

## Step 7: Update Social Media & SEO

### Update Meta Tags

Update these files in your codebase:

**src/index.html** or **public/index.html**:
```html
<head>
  <title>LavLay - Connect, Share & Shop</title>
  <meta name="description" content="LavLay is a social commerce platform where you can connect with friends, discover communities, and buy & sell products.">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://lavlay.com">
  <meta property="og:title" content="LavLay - Connect, Share & Shop">
  <meta property="og:description" content="LavLay is a social commerce platform where you can connect with friends, discover communities, and buy & sell products.">
  <meta property="og:image" content="https://lavlay.com/og-image.jpg">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="https://lavlay.com">
  <meta property="twitter:title" content="LavLay - Connect, Share & Shop">
  <meta property="twitter:description" content="LavLay is a social commerce platform where you can connect with friends, discover communities, and buy & sell products.">
  <meta property="twitter:image" content="https://lavlay.com/og-image.jpg">
</head>
```

### Create Favicon

Create a new favicon with "L" branding:
- Use https://favicon.io or https://realfavicongenerator.net
- Upload to `/public/favicon.ico`

### Update robots.txt

Create `/public/robots.txt`:
```txt
User-agent: *
Allow: /

Sitemap: https://lavlay.com/sitemap.xml
```

### Create sitemap.xml

Create `/public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://lavlay.com</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://lavlay.com/about</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://lavlay.com/marketplace</loc>
    <priority>0.9</priority>
  </url>
</urlset>
```

## Step 8: Update Backend Configuration Files

### Update backend/.env

```bash
# Update these lines
NODE_ENV=production
API_URL=https://api.lavlay.com
FRONTEND_URL=https://lavlay.com

# Email configuration
FROM_EMAIL=noreply@lavlay.com
FROM_NAME=LavLay

# Update R2 bucket if needed
R2_BUCKET_NAME=lavlay-uploads
R2_PUBLIC_URL=https://media.lavlay.com
```

## Step 9: Testing Checklist

Before going live, test the following:

### Frontend Tests
- [ ] Home page loads on new domain
- [ ] Login/Signup works
- [ ] Images load correctly
- [ ] API calls work (check browser console)
- [ ] Payment flow works
- [ ] Mobile responsiveness

### Backend Tests
- [ ] Health check endpoint: `https://api.lavlay.com/health`
- [ ] Authentication endpoints work
- [ ] Payment webhooks receive callbacks
- [ ] Email sending works (check FROM address)

### DNS Tests
- [ ] Domain resolves: `nslookup lavlay.com`
- [ ] WWW subdomain works: `nslookup www.lavlay.com`
- [ ] API subdomain works: `nslookup api.lavlay.com`
- [ ] SSL certificate is valid (green padlock in browser)

## Step 10: Launch & Monitor

### Go Live
1. **Announce on Social Media**:
   - Update social media profiles with new domain
   - Announce rebranding to LavLay

2. **Update Git Repository**:
   ```bash
   # Update repository description on GitHub
   # Consider renaming repo to 'lavlay-frontend'
   ```

3. **Monitor Traffic**:
   - Use Vercel Analytics
   - Set up Google Analytics (if not already)
   - Monitor error logs in Vercel and Railway

### Post-Launch
- [ ] Monitor error rates for 24 hours
- [ ] Check payment webhooks are working
- [ ] Verify email deliverability
- [ ] Test all critical user journeys
- [ ] Update any external links to old domain

## Common Issues & Solutions

### Issue: Domain not resolving
**Solution**:
- Wait up to 48 hours for DNS propagation
- Use https://dnschecker.org to check propagation status
- Clear your browser cache and DNS cache:
  ```bash
  # Windows
  ipconfig /flushdns

  # Mac
  sudo dscacheutil -flushcache

  # Linux
  sudo systemd-resolve --flush-caches
  ```

### Issue: SSL certificate error
**Solution**:
- Vercel/Railway auto-provision SSL (wait 15 mins)
- If using Cloudflare, set SSL mode to "Full"
- Check that DNS records are correct

### Issue: API calls failing with CORS error
**Solution**:
- Update Supabase allowed URLs (Step 5)
- Update backend CORS settings to allow new domain
- Clear browser cache

### Issue: Payment webhooks not receiving callbacks
**Solution**:
- Update webhook URLs in Paystack/Flutterwave dashboards
- Verify API domain is accessible: `curl https://api.lavlay.com/webhooks/paystack`
- Check Railway logs for incoming requests

## Email Configuration (Optional)

### Custom Email Domain

To send emails from @lavlay.com:

1. **Choose Email Service**:
   - SendGrid
   - Mailgun
   - Amazon SES

2. **Add DNS Records** (example for SendGrid):
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:sendgrid.net ~all

   Type: CNAME
   Name: em[number]
   Value: u[number].wl[number].sendgrid.net

   Type: CNAME
   Name: s1._domainkey
   Value: s1.domainkey.u[number].wl[number].sendgrid.net
   ```

3. **Update Backend Config**:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_USER=apikey
   SMTP_PASS=[your-api-key]
   FROM_EMAIL=noreply@lavlay.com
   ```

## Budget Estimate

### Annual Costs
- **Domain Registration**: $10-15/year (Namecheap)
- **Cloudflare** (optional): Free plan works great
- **Vercel**: Free for hobby projects, $20/month for Pro
- **Railway**: Pay-as-you-go, ~$5-20/month depending on usage
- **Supabase**: Free tier available, ~$25/month for Pro
- **Email Service** (optional): Free tier available at most providers

**Total Estimated**: $15-300/year depending on traffic

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Railway application logs
3. Test DNS propagation: https://dnschecker.org
4. Contact support:
   - Vercel: https://vercel.com/support
   - Railway: https://railway.app/help

---

**Last Updated**: December 2024
**Project**: LavLay (formerly PerkSnow/SocialHub)
