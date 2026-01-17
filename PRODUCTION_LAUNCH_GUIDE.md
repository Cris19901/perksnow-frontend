# LavLay Production Launch Guide

## 🚀 PRE-LAUNCH CHECKLIST

### Phase 1: Smoke Testing (30 minutes)

#### Authentication & User Management
- [ ] **Sign Up Flow**
  - [ ] Create new account with email
  - [ ] Verify email confirmation (if enabled)
  - [ ] Check user profile creation
  - [ ] Verify default points (signup bonus)
  - [ ] Check onboarding flow

- [ ] **Login Flow**
  - [ ] Login with credentials
  - [ ] Test "Remember me" functionality
  - [ ] Test logout
  - [ ] Test password reset (if implemented)

#### Core Posting Features
- [ ] **Create Posts**
  - [ ] Create text-only post
  - [ ] Create post with 1 image
  - [ ] Create post with 2 images (grid layout)
  - [ ] Create post with 4 images (2x2 grid)
  - [ ] Create post with 5+ images (carousel)
  - [ ] Verify image upload progress toasts
  - [ ] Test remove image before posting
  - [ ] Verify post appears in feed immediately

- [ ] **View Posts in Feed**
  - [ ] Verify single image displays full width
  - [ ] Verify 2-4 images show grid layout
  - [ ] Verify 5+ images show carousel
  - [ ] Test carousel navigation (arrows, dots)
  - [ ] Test image click opens lightbox
  - [ ] Verify feed loads without errors

#### Image Lightbox
- [ ] **Lightbox Functionality**
  - [ ] Click image opens fullscreen lightbox
  - [ ] Scroll wheel zoom works (1x-3x)
  - [ ] Pan zoomed image with mouse drag
  - [ ] Navigate between images with arrow keys
  - [ ] Swipe between images on mobile
  - [ ] ESC key closes lightbox
  - [ ] Click backdrop closes lightbox
  - [ ] Download button works
  - [ ] Share button works
  - [ ] Like button works from lightbox

#### Social Interactions
- [ ] **Engagement Features**
  - [ ] Like a post (heart fills, count increases)
  - [ ] Unlike a post (heart empties, count decreases)
  - [ ] Comment on post (opens comment sheet)
  - [ ] Add comment (appears immediately)
  - [ ] View comment count updates
  - [ ] Share post (copy link or native share)
  - [ ] Save/bookmark post

- [ ] **User Interactions**
  - [ ] View another user's profile
  - [ ] Follow a user
  - [ ] Unfollow a user
  - [ ] Verify follower count updates
  - [ ] View following/followers lists

#### Stories & Reels
- [ ] **Stories**
  - [ ] Upload a story
  - [ ] View stories at top of feed
  - [ ] Stories auto-advance
  - [ ] Story progress bar works
  - [ ] Stories expire after 24 hours (check database)

- [ ] **Reels**
  - [ ] Upload a reel
  - [ ] View reel in feed
  - [ ] Click reel opens ReelsViewer
  - [ ] Reel plays automatically
  - [ ] Swipe to next reel works
  - [ ] Like/comment on reel
  - [ ] Close reels viewer

#### Profile Features
- [ ] **User Profile**
  - [ ] View own profile
  - [ ] Upload profile picture
  - [ ] Upload cover photo
  - [ ] Edit bio/details
  - [ ] View posts tab
  - [ ] View points balance
  - [ ] Verify pro badge (if subscribed)

#### Points System
- [ ] **Points Tracking**
  - [ ] Create post earns points
  - [ ] Like earns points
  - [ ] Comment earns points
  - [ ] View points history
  - [ ] Points balance displays correctly

---

### Phase 2: Subscription & Payment Verification (CRITICAL)

#### Payment Integration Setup
- [ ] **Environment Variables**
  ```bash
  # Verify these are set in production
  VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx  # or pk_live_xxx
  SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_ANON_KEY=xxx
  ```

- [ ] **Database Tables**
  - [ ] Verify `subscriptions` table exists
  - [ ] Verify `subscription_tiers` table exists
  - [ ] Check RLS policies on subscriptions table
  - [ ] Verify webhooks endpoint exists

#### Subscription Flow Testing
- [ ] **View Subscription Plans**
  - [ ] Navigate to /subscription or pricing page
  - [ ] Verify 3 tiers display: Free, Basic, Pro
  - [ ] Verify pricing shows correctly
  - [ ] Verify features list for each tier

- [ ] **Subscribe to Basic Plan** (₦2,000/month)
  - [ ] Click "Subscribe" button
  - [ ] Paystack modal opens
  - [ ] Enter test card: 4084084084084081
  - [ ] Complete payment
  - [ ] Verify success message
  - [ ] Verify subscription status updates in database
  - [ ] Verify user redirected back to app
  - [ ] Check subscription badge appears on profile

- [ ] **Subscribe to Pro Plan** (₦5,000/month)
  - [ ] Repeat above steps with Pro plan
  - [ ] Verify blue checkmark badge appears
  - [ ] Test pro-only features work

- [ ] **Subscription Management**
  - [ ] View current subscription status
  - [ ] Check subscription expiry date
  - [ ] Test upgrade from Basic to Pro
  - [ ] Test downgrade from Pro to Basic
  - [ ] Verify cancellation flow (if implemented)

#### Payment Webhook Testing
- [ ] **Webhook Verification**
  - [ ] Subscribe to plan
  - [ ] Check Paystack dashboard for webhook delivery
  - [ ] Verify webhook updated subscription status
  - [ ] Check subscription record in database
  - [ ] Verify subscription_expires_at is set correctly

#### Test Card Numbers (Paystack)
```
Success: 4084084084084081
Declined: 5060666666666666666
Insufficient Funds: 5061000000000000000
```

#### What Payment Features Must Work
✅ **MUST WORK:**
1. View subscription plans
2. Click subscribe button
3. Paystack modal opens
4. Complete payment with test card
5. Subscription status updates
6. Pro badge appears (for Pro plan)
7. Subscription expires correctly

⚠️ **NICE TO HAVE (Can Fix Post-Launch):**
1. Subscription management dashboard
2. Invoice generation
3. Payment history
4. Refund handling
5. Proration for upgrades

---

### Phase 3: Marketplace - Coming Soon Page

#### Create Coming Soon Component
I'll create a component you can use to replace marketplace temporarily:

```typescript
// src/components/pages/MarketplacePage.tsx
import { Header } from '../Header';
import { MobileBottomNav } from '../MobileBottomNav';
import { Store, Clock, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface MarketplacePageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function MarketplacePage({ onNavigate, onCartClick, cartItemsCount }: MarketplacePageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="market"
      />

      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <Store className="w-16 h-16 text-purple-600" />
            </div>
            <div className="absolute -top-2 -right-2">
              <div className="bg-yellow-400 rounded-full p-2 animate-bounce">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Marketplace Coming Soon!
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          We're building an amazing marketplace where you can buy and sell products directly within LavLay.
          Stay tuned for exclusive deals and unique finds!
        </p>

        {/* Features Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Sell Products</h3>
            <p className="text-sm text-gray-600">List your items and reach thousands of buyers</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-pink-600" />
            </div>
            <h3 className="font-semibold mb-2">Fast Checkout</h3>
            <p className="text-sm text-gray-600">Quick and secure payment processing</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Exclusive Deals</h3>
            <p className="text-sm text-gray-600">Special offers for LavLay members</p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <p className="text-gray-600">Want to be notified when marketplace launches?</p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600"
            onClick={() => onNavigate?.('feed')}
          >
            Back to Feed
          </Button>
        </div>

        {/* Timeline */}
        <div className="mt-16 bg-white p-6 rounded-lg border border-gray-200 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Expected Launch: Q1 2026</span>
          </div>
        </div>
      </div>

      <MobileBottomNav currentPage="market" onNavigate={onNavigate} />
    </div>
  );
}
```

#### Hide Product Creation
- [ ] Remove "Create Product" button from UI temporarily
- [ ] Or show "Coming Soon" tooltip on hover
- [ ] Keep product-related database tables (don't delete)
- [ ] Marketplace will be re-enabled after launch

---

### Phase 4: Critical Pre-Launch Checks

#### Database & Security
- [ ] **RLS Policies**
  - [ ] Verify all tables have RLS enabled
  - [ ] Test anonymous user can view public content
  - [ ] Test authenticated user can only modify own data
  - [ ] Check `post_images` table permissions ✅
  - [ ] Verify no sensitive data exposed

- [ ] **Database Indexes**
  - [ ] Verify indexes on `posts(created_at)`
  - [ ] Verify indexes on `post_images(post_id, image_order)`
  - [ ] Check query performance in Supabase dashboard
  - [ ] Monitor slow queries

#### File Storage
- [ ] **Supabase Storage**
  - [ ] Verify `posts` bucket exists
  - [ ] Verify `avatars` bucket exists
  - [ ] Verify `covers` bucket exists
  - [ ] Verify `stories` bucket exists
  - [ ] Verify `reels` bucket exists
  - [ ] Check storage bucket policies (public read)
  - [ ] Verify file upload size limits

#### Performance
- [ ] **Load Testing**
  - [ ] Test with 50+ posts in feed
  - [ ] Test image loading performance
  - [ ] Check lighthouse score (aim for >80)
  - [ ] Test on slow 3G connection
  - [ ] Monitor memory usage

- [ ] **Optimization**
  - [ ] Images compressed before upload (if implemented)
  - [ ] Lazy loading images (can add post-launch)
  - [ ] Code splitting enabled
  - [ ] Bundle size < 1MB (check with `npm run build`)

#### Mobile Responsiveness
- [ ] **Device Testing**
  - [ ] Test on iPhone (Safari)
  - [ ] Test on Android (Chrome)
  - [ ] Test on tablet
  - [ ] Verify all touch gestures work
  - [ ] Check mobile keyboard doesn't break layout
  - [ ] Test landscape orientation

- [ ] **Mobile Features**
  - [ ] Swipe gestures in carousel work
  - [ ] Pinch to zoom in lightbox works
  - [ ] Mobile bottom navigation displays correctly
  - [ ] Stories viewer works on mobile
  - [ ] Reels viewer works on mobile

#### Error Handling
- [ ] **Graceful Degradation**
  - [ ] Network error shows friendly message
  - [ ] Failed image upload shows error toast
  - [ ] Database error doesn't crash app
  - [ ] 404 page exists for invalid routes
  - [ ] Error boundary catches React errors

#### Production Environment
- [ ] **Environment Setup**
  - [ ] Production Supabase project created
  - [ ] Production environment variables set
  - [ ] Paystack live keys ready (or test keys for soft launch)
  - [ ] Domain configured (or using Vercel subdomain)
  - [ ] SSL certificate active (auto with Vercel)

- [ ] **Monitoring & Analytics**
  - [ ] Error tracking setup (Sentry recommended)
  - [ ] Analytics installed (Google Analytics)
  - [ ] Uptime monitoring (optional)
  - [ ] Performance monitoring (Vercel Analytics)

---

### Phase 5: Deployment Steps

#### 1. Build Production Bundle
```bash
npm run build
# Check bundle size
# Verify no errors
```

#### 2. Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set environment variables
# - Deploy to production

# Or use Vercel Dashboard:
# 1. Import Git repository
# 2. Configure build settings
# 3. Add environment variables
# 4. Deploy
```

#### 3. Environment Variables on Vercel
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx (or pk_live_xxx)
```

#### 4. Verify Production Deployment
- [ ] Visit production URL
- [ ] Run smoke tests on production
- [ ] Check browser console for errors
- [ ] Test signup/login flow
- [ ] Create a test post
- [ ] Verify database updates

#### 5. DNS & Domain (Optional)
```bash
# If you have a custom domain:
# 1. Add domain in Vercel dashboard
# 2. Update DNS records with your registrar
# 3. Wait for DNS propagation (5-60 minutes)
# 4. Verify SSL certificate issued
```

---

### Phase 6: Post-Launch Monitoring (First 24 Hours)

#### Immediate Checks
- [ ] Monitor error logs in real-time
- [ ] Check Supabase dashboard for database errors
- [ ] Watch for failed uploads in storage
- [ ] Monitor user signups
- [ ] Track first posts created
- [ ] Verify subscription payments work

#### What to Watch For
🚨 **Critical Issues (Fix Immediately)**
- Users can't sign up/login
- Posts don't appear in feed
- Images fail to upload
- Payment doesn't work
- App crashes on load

⚠️ **Important Issues (Fix Within 24 Hours)**
- Slow performance
- Mobile layout issues
- Some features not working
- Minor UI bugs

💡 **Nice to Fix (Can Wait)**
- Polish animations
- Missing features (grid view, etc.)
- Performance optimizations

---

## 🎯 LAUNCH DECISION CHECKLIST

### GO / NO-GO Criteria

✅ **GO FOR LAUNCH IF:**
- [ ] Users can sign up and login
- [ ] Users can create posts with images
- [ ] Feed displays posts correctly
- [ ] Multi-image posts work (carousel, grid, lightbox)
- [ ] Social features work (like, comment, follow)
- [ ] Subscription payment works with test cards
- [ ] No critical security issues
- [ ] Mobile layout is usable

🛑 **DO NOT LAUNCH IF:**
- [ ] Authentication is broken
- [ ] Posts don't save to database
- [ ] Critical security vulnerability found
- [ ] Payment system completely broken
- [ ] App crashes on load

---

## 📋 POST-LAUNCH TODO (Keep for Later)

### Week 1 Post-Launch
- [ ] Profile grid view
- [ ] Feed tabs (Following/For You/Trending)
- [ ] Performance optimizations
- [ ] Fix bugs reported by users

### Week 2-3 Post-Launch
- [ ] Re-enable marketplace
- [ ] Enhanced stories
- [ ] Comment replies
- [ ] Advanced animations

### Month 2 Post-Launch
- [ ] Payment features (invoices, history)
- [ ] Admin dashboard improvements
- [ ] Advanced analytics
- [ ] Mobile app (React Native)

---

## 🚀 READY TO LAUNCH

**Current Status**: ✅ Core features ready
**Recommended Action**: Complete smoke tests → Deploy to production
**Timeline**: 2-3 hours for full pre-launch verification

Good luck with the launch! 🎉
