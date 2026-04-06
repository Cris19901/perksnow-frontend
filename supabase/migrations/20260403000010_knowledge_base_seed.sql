-- =============================================================================
-- LAVLAY COMPREHENSIVE KNOWLEDGE BASE SEED
-- These articles are the single source of truth the AI uses to answer questions.
-- Every process, number, rule, and edge case is documented here.
-- =============================================================================

INSERT INTO knowledge_base (title, category, tags, content) VALUES

-- =====================================================================
-- 1. WHAT IS LAVLAY
-- =====================================================================
(
'What is LavLay? Complete Platform Overview',
'general',
ARRAY['about','overview','introduction','platform','lavlay','what is','nigeria'],
'LavLay is a Nigerian social media and content platform that pays users real money for engaging with content. Unlike traditional social media platforms (Facebook, Instagram, TikTok) that earn money from your attention without paying you back, LavLay shares revenue directly with users through a points system that converts to cash.

LavLay is 100% Nigerian — built specifically for the Nigerian market, using Nigerian Naira (₦), and supporting Nigerian payment methods including bank transfers and mobile money (MTN MoMo, Airtel Money, OPay, PalmPay, Kuda).

WHAT YOU CAN DO ON LAVLAY:
- Watch short video reels and earn points
- Read news articles and posts and earn points
- Like and comment on posts and earn points
- Follow other users and get followed back
- Post your own content (text, images, videos)
- Buy and sell products on the marketplace
- Refer friends and earn commission on their activity
- Convert your points to cash and withdraw to your bank

IMPORTANT: LavLay Nigeria (lavlay.com) is completely separate from any other business or website that may share a similar name. We are a Nigerian company serving Nigerian users. All our policies, prices, and processes described in this knowledge base apply exclusively to lavlay.com.'
),

-- =====================================================================
-- 2. HOW TO EARN POINTS — COMPLETE GUIDE
-- =====================================================================
(
'How to Earn Points on LavLay — Complete Earning Guide',
'earning',
ARRAY['earn','points','how to make money','income','rewards','activities','daily'],
'Points are the core of LavLay earnings. Everything you do on the platform can earn you points, which you then convert to Naira and withdraw.

POINT CONVERSION RATE:
- 10 points = ₦1 (one Naira)
- 1,000 points = ₦100
- 10,000 points = ₦1,000
- 100,000 points = ₦10,000

EARNING ACTIVITIES AND POINTS:

1. WATCHING REELS (Video Content)
   - Watch a short video reel to completion: earn points per view
   - You must watch the full reel (or a significant portion) for points to count
   - Multiple views of the same reel on the same day may not earn full points
   - Reels from verified creators earn slightly more points

2. READING POSTS AND NEWS ARTICLES
   - Read a post or news article: earn points per article read
   - You must spend enough time on the article (scrolling/reading) for it to count
   - LavLay News (our bot) posts Nigerian news articles from Premium Times, TechCabal, Bella Naija, Nairametrics, Vanguard, Daily Post — reading these earns points
   - Reading points: approximately 40 points per article read

3. LIKING CONTENT
   - Like a post or reel: earn a small number of points
   - Daily limit applies — you cannot earn unlimited points just by liking

4. COMMENTING
   - Leave a genuine comment on a post or reel: earn points
   - Spam comments or very short meaningless comments may not earn full points
   - Daily limit applies

5. RECEIVING FOLLOWERS
   - When someone follows your account: earn 50 points
   - This encourages users to create good content that attracts followers

6. POSTING CONTENT
   - Creating and posting content builds your audience
   - Popular posts attract views, likes, and comments from other users, earning you more points indirectly

7. REFERRAL BONUSES
   - When someone signs up using your referral code: earn bonus points
   - When your referred friend makes a subscription payment: earn commission (see Referral System article)

DAILY LIMITS:
- There are daily limits on how many points you can earn from each activity
- This prevents abuse and ensures the platform stays sustainable
- Limits reset at midnight daily
- Paid subscribers (any non-free plan) have higher daily earning limits than free users

POINT MATURITY (IMPORTANT):
- Points you earn are initially "frozen" for 7 days
- After 7 days, they "mature" and become available for withdrawal
- You can see your frozen points and matured balance on the Points page
- This 7-day period exists to prevent fraud and ensure fair use

FREE VS PAID USERS:
- Free users: can earn points but CANNOT withdraw until they subscribe to a paid plan
- Paid users (Daily, Starter, Basic, Pro): can earn AND withdraw points

HOW TO MAKE MONEY ON LAVLAY — BEST STRATEGY:
1. Subscribe to at least a Starter plan (₦__ for 15 days)
2. Log in every day and complete all available earning activities
3. Watch reels, read articles, like and comment on posts daily
4. Refer friends — this is the most powerful earning multiplier
5. Post good content to build a following (followers = passive points)
6. Wait 7 days for points to mature, then withdraw
7. Reinvest in a new subscription to keep earning'
),

-- =====================================================================
-- 3. SUBSCRIPTION TIERS
-- =====================================================================
(
'LavLay Subscription Plans — Tiers, Prices, Features, Duration',
'subscription',
ARRAY['subscription','plan','tier','free','daily','starter','basic','pro','upgrade','price','cost'],
'LavLay has 5 subscription tiers. You need a paid subscription to withdraw your earnings. Free users can earn points but cannot cash them out.

THE 5 SUBSCRIPTION TIERS:

1. FREE TIER
   - Cost: ₦0 (free forever)
   - Duration: Permanent
   - Earn points: YES (limited daily earning)
   - Withdraw earnings: NO — cannot withdraw on free plan
   - Best for: Exploring the platform before committing
   - To withdraw, you must upgrade to any paid plan

2. DAILY PLAN
   - Cost: Paid once only — one-time purchase
   - Duration: 1 day (24 hours from activation)
   - Earn points: YES (higher daily limits than free)
   - Withdraw earnings: YES
   - Important: This is a ONE-TIME plan. You can only purchase the Daily plan ONCE per account ever. It cannot be purchased again after use.
   - Best for: Testing withdrawal before committing to longer plan

3. STARTER PLAN
   - Cost: Varies (check Subscription page for current price)
   - Duration: 15 days from activation
   - Earn points: YES (standard paid limits)
   - Withdraw earnings: YES
   - Best for: Users who want to try paid features for 2 weeks

4. BASIC PLAN
   - Cost: Varies (check Subscription page for current price)
   - Duration: 30 days from activation
   - Earn points: YES (standard paid limits)
   - Withdraw earnings: YES
   - Best for: Monthly users, good value for regular earners

5. PRO PLAN
   - Cost: Varies — highest tier (check Subscription page)
   - Duration: 30 days from activation
   - Earn points: YES (highest daily earning limits)
   - Withdraw earnings: YES
   - Best for: Power users who want maximum earning potential
   - Highest daily earning caps of all tiers

IMPORTANT RULES ABOUT SUBSCRIPTIONS:
- Subscription expires at midnight after the duration ends
- When subscription expires, you CANNOT withdraw until you renew
- Your points are NOT lost when subscription expires — they stay in your account
- You can subscribe again at any time to re-enable withdrawals
- Downgrading to free tier disables withdrawal immediately
- The Daily plan is one-time only — you cannot buy it twice

HOW TO SUBSCRIBE:
1. Go to the Subscription page (menu → Subscription)
2. Choose your plan
3. Click "Subscribe"
4. Pay via Paystack (card, bank transfer, USSD, etc.)
5. Your plan activates immediately after payment confirmation

PAYMENT METHODS FOR SUBSCRIPTION:
- Debit/credit card (Visa, Mastercard, Verve)
- Bank transfer
- USSD (*737#, *770#, etc.)
- Bank app payments
- All powered by Paystack — secure and trusted

WHAT HAPPENS IF MY SUBSCRIPTION EXPIRES?
- You can still log in and use the platform
- You can still earn points
- You CANNOT withdraw until you renew
- Renew at any time on the Subscription page'
),

-- =====================================================================
-- 4. POINTS SYSTEM — DETAILED
-- =====================================================================
(
'Points System Explained — Frozen Points, Maturity, Balance, Conversion',
'points',
ARRAY['points','frozen','matured','balance','conversion','withdraw points','points not showing','7 days'],
'Understanding the LavLay points system is essential to knowing when and how much you can withdraw.

POINTS BALANCE TYPES:
You have TWO types of points balance:

1. TOTAL POINTS: All points you have ever earned
2. FROZEN POINTS: Points earned in the last 7 days — NOT yet available for withdrawal
3. MATURED POINTS: Points older than 7 days — AVAILABLE for withdrawal

EXAMPLE:
- You earned 5,000 points today
- You earned 3,000 points 3 days ago
- You earned 8,000 points 10 days ago
- Your frozen points = 5,000 + 3,000 = 8,000 (not available yet)
- Your matured points = 8,000 (available to withdraw)

THE 7-DAY MATURITY RULE:
- Every point you earn starts as "frozen"
- After exactly 7 days from when it was earned, it becomes "matured"
- Only matured points can be withdrawn
- This rule applies to ALL users — free and paid alike

WHY DOES THIS RULE EXIST?
The 7-day maturity prevents fraud. Without it, someone could earn lots of points quickly and immediately withdraw, then the platform would have no way to detect if the activity was genuine.

SIGNUP BONUS:
- New users receive 5,000 points when they sign up (welcome bonus)
- These points are also subject to the 7-day maturity rule
- You cannot withdraw the signup bonus immediately
- The signup bonus requires you to have EVER subscribed (has_ever_subscribed must be true)

POINT EARNING GATING:
- To earn points from activities, you must have EVER subscribed to any paid plan at least once
- Brand new users on the free plan have limited earning until their first subscription
- This prevents abuse of the system by fake accounts

CONVERSION RATE (ALWAYS FIXED):
- 10 points = ₦1 (this rate NEVER changes)
- 1,000 points = ₦100
- 10,000 points = ₦1,000 (minimum withdrawal amount in points)

CHECKING YOUR POINTS:
- Go to Points page in the menu
- You will see: Total Balance, Frozen (unavailable), Matured (available)
- You will also see your full transaction history — every point earned and spent

POINTS TRANSACTION HISTORY:
Every point movement is recorded:
- Points earned from watching reels
- Points earned from reading articles
- Points earned from likes and comments
- Points earned from referrals
- Points deducted for withdrawal
- Points refunded if withdrawal failed'
),

-- =====================================================================
-- 5. WITHDRAWAL — COMPLETE PROCESS
-- =====================================================================
(
'How to Withdraw Money from LavLay — Complete Withdrawal Guide',
'withdrawal',
ARRAY['withdraw','withdrawal','cash out','bank','transfer','money','minimum','how to withdraw','payment'],
'Withdrawing your earnings from LavLay converts your matured points to Naira and sends it to your bank account or mobile wallet.

WITHDRAWAL ELIGIBILITY — YOU MUST HAVE ALL OF THESE:
1. Active paid subscription (Daily, Starter, Basic, or Pro — NOT free)
2. Minimum ₦1,000 in matured wallet balance (= 10,000 matured points)
3. Points must have matured (been earned more than 7 days ago)
4. Valid Nigerian bank account or mobile money number

MINIMUM WITHDRAWAL: ₦1,000
MAXIMUM WITHDRAWAL: Your full available wallet balance (no upper limit)

STEP-BY-STEP WITHDRAWAL PROCESS:
1. Log in to LavLay
2. Go to Withdraw (menu → Withdraw)
3. Check your Available Balance at the top
4. Enter the amount you want to withdraw (minimum ₦1,000)
5. Select your withdrawal method:
   - Bank Transfer (use dropdown to select your bank)
   - MTN MoMo
   - Airtel Money
   - OPay
   - PalmPay
   - Kuda Bank
6. Enter your account number (10 digits for bank, 11 digits for mobile)
7. Enter your account name (exact name on your account)
8. Submit the request
9. LavLay admin reviews and processes it
10. Money is sent to your account via Korapay

SUPPORTED BANKS FOR WITHDRAWAL:
Access Bank, First Bank, GTBank, UBA, Zenith Bank, Fidelity Bank, Union Bank, Sterling Bank, Stanbic IBTC, FCMB, Polaris Bank, Ecobank, Heritage Bank, Keystone Bank, Providus Bank, Wema Bank, Kuda Bank, OPay, PalmPay, Moniepoint, Carbon, and more.

PROCESSING TIME:
- Withdrawal requests are reviewed by LavLay admin
- Once approved, transfer is initiated immediately via Korapay
- Bank transfer: typically 5 minutes to 24 hours after approval
- Mobile money: typically instant to 2 hours after approval
- Processing happens on business days (Monday–Friday)
- Requests submitted on weekends/holidays may be processed next business day

WHAT HAPPENS TO YOUR POINTS WHEN YOU WITHDRAW?
- Your points are deducted IMMEDIATELY when you submit the request
- If the withdrawal is APPROVED: points stay deducted, money arrives in your account
- If the withdrawal is REJECTED: points are FULLY REFUNDED to your account
- If transfer FAILS (bank error): points are automatically refunded + wallet balance restored

WITHDRAWAL STATUS MEANINGS:
- PENDING: Request submitted, waiting for admin review
- PROCESSING: Admin approved, Korapay transfer initiated, money on its way
- COMPLETED: Money successfully delivered to your bank/wallet
- REJECTED: Request was declined (points refunded automatically)
- CANCELLED: You or admin cancelled before processing (points refunded)

WHY MIGHT A WITHDRAWAL BE REJECTED?
- Incorrect bank account details
- Account number does not match account name
- Insufficient matured balance at time of review
- Subscription expired between submission and review
- Suspected fraudulent activity
- Bank details belong to another user (30-day cooldown per account number)

WITHDRAWAL FEES:
- LavLay charges no withdrawal fees to the user
- The full amount you request is sent to your account
- Transfer costs are covered by LavLay

BANK ACCOUNT COOLDOWN RULE:
- Each bank account number can only be used by ONE user every 30 days
- This prevents multiple accounts withdrawing to the same bank
- If you get an error about "bank account recently used," contact support'
),

-- =====================================================================
-- 6. REFERRAL SYSTEM
-- =====================================================================
(
'LavLay Referral System — How to Earn from Referrals',
'referral',
ARRAY['referral','refer','friend','commission','referral code','earn from referral','invite'],
'The referral system is one of the most powerful ways to earn on LavLay. When you refer friends, you earn points and cash commissions from their activity.

YOUR REFERRAL CODE:
- Every LavLay user has a unique referral code
- Find your code on the Referral Dashboard (menu → Referrals)
- Share it with friends, family, or on social media

HOW REFERRALS WORK:
1. Share your referral code or referral link (lavlay.com/signup?ref=YOURCODE)
2. Your friend signs up using your code
3. You earn bonus points immediately when they join (if referral signup bonus is enabled)
4. Every time your referred friend makes a subscription payment, you earn a commission
5. You earn this commission for up to 10 subscription payments per referred friend

REFERRAL EARNINGS:
- Points per signup: Varies (check Referral Dashboard for current amount)
- Commission per deposit: Percentage of their subscription payment (check Referral Dashboard)
- Maximum deposits tracked per referral: 10 payments
- After 10 payments from one referred friend, you no longer earn from that specific friend (but still earn from all other referrals)

REFERRAL DASHBOARD:
Go to menu → Referrals to see:
- Your referral code and shareable link
- Total referrals made
- Active referrals (friends still subscribed)
- Total points earned from referrals
- Total money earned from referral commissions
- Individual referral performance

SHARING YOUR REFERRAL CODE:
Share via:
- WhatsApp (share button on Referral Dashboard)
- Twitter/X
- Facebook
- Instagram DM
- Copy the link and share anywhere
- Share the code directly (friends enter it at signup)

REFERRAL RULES:
- The referred user MUST use your code at signup — it cannot be added after
- Self-referral is not allowed (you cannot refer yourself)
- Referral commissions are paid as wallet balance (withdrawable cash)
- Referral point bonuses are paid as points (subject to 7-day maturity)
- If a referred user requests a refund on their subscription, the referral commission may be reversed

HOW TO MAXIMISE REFERRAL EARNINGS:
1. Share your link on WhatsApp groups
2. Post on social media with your experience on LavLay
3. Tell friends who are looking to earn online
4. The more active referrals you have, the more consistent your commission income
5. A referral who subscribes to Pro plan earns you more commission than Daily plan'
),

-- =====================================================================
-- 7. ACCOUNT SETUP AND VERIFICATION
-- =====================================================================
(
'Creating and Setting Up Your LavLay Account',
'account',
ARRAY['signup','register','create account','login','password','email','phone','verification','profile'],
'CREATING YOUR ACCOUNT:
1. Go to lavlay.com/signup
2. Enter your full name
3. Choose a unique username (this is your public identity on LavLay)
4. Enter your email address
5. Enter your phone number (Nigerian number, 11 digits starting with 0)
6. Create a strong password
7. Enter a referral code if you have one (optional but recommended — you earn a bonus)
8. Click "Create Account"
9. You receive a 5,000 point welcome bonus

AFTER SIGNUP:
- You are automatically logged in
- Your account starts on the Free plan
- You receive the 5,000 point welcome bonus (matures after 7 days)
- You can explore the platform immediately

LOGGING IN:
- Go to lavlay.com/login
- Enter your email and password
- Or use phone OTP (one-time password) if enabled

PHONE OTP VERIFICATION:
- LavLay supports phone number verification via OTP
- Enter your phone number and receive an SMS code
- Enter the code to verify your number
- Verified phone numbers add security to your account

PROFILE SETUP:
- Go to Settings or click your avatar
- Upload a profile photo
- Write a bio (optional but helps attract followers)
- Your username cannot be changed after account creation (choose carefully)

FORGOT PASSWORD:
- Go to lavlay.com/login
- Click "Forgot Password"
- Enter your email address
- Check your email for reset link
- Click the link and set a new password

ACCOUNT SECURITY:
- Use a strong, unique password
- Never share your password
- LavLay staff will NEVER ask for your password
- Enable phone verification for extra security
- Log out when using shared devices

IF YOU CANNOT LOG IN:
- Check you are using the correct email address
- Caps Lock may be on for password
- Try "Forgot Password" to reset
- If still unable, contact support with your email address'
),

-- =====================================================================
-- 8. WATCHING REELS
-- =====================================================================
(
'How to Watch Reels and Earn Points on LavLay',
'earning',
ARRAY['reels','watch','video','earn from reels','views','reel points','content'],
'Reels are short videos posted by users and creators on LavLay. Watching reels is one of the primary ways to earn points on the platform.

HOW TO ACCESS REELS:
- Click "Reels" in the bottom navigation bar (mobile) or side menu
- Or go to lavlay.com/reels

HOW TO EARN FROM WATCHING REELS:
1. Open the Reels section
2. Watch a reel video — you need to watch for a meaningful duration
3. Points are credited automatically after a qualifying view
4. Swipe up to the next reel and repeat
5. Continue until you reach your daily earning limit

QUALIFYING VIEW RULES:
- You must watch for at least a few seconds (not just open and swipe away instantly)
- The same reel watched multiple times in the same day may earn reduced points
- Points are tracked server-side — they cannot be manipulated by refreshing the page

DAILY REEL VIEWING LIMIT:
- Free users: Limited daily views that earn points
- Paid users: Higher daily limits (varies by subscription tier)
- Pro plan users: Highest daily view earning limit
- Once you hit the daily limit, you can still watch reels but won''t earn additional points until tomorrow

LAVLAY TV (BOT CONTENT):
- LavLay TV (username: lavlay_tv) posts YouTube video content automatically
- These are regular posts containing YouTube links
- They appear in your feed and on the profile page of lavlay_tv
- Engaging with this content (liking, commenting) can earn you points

REELS YOU CAN POST:
- Any LavLay user can upload and post their own reels
- Go to the create/upload section
- Record or upload a video
- Add a caption and post
- Other users watching your reels earns engagement for your content

EARNING FROM YOUR OWN REELS:
- When other users watch your reels, your content gets more visibility
- More visibility = more followers = more points from follower activity'
),

-- =====================================================================
-- 9. NEWS FEED AND POSTS
-- =====================================================================
(
'How the LavLay Feed Works — Posts, News, Earning from Reading',
'earning',
ARRAY['feed','news','posts','read','articles','lavlay news','reading points','timeline'],
'THE FEED:
The LavLay feed is your main timeline where you see posts from people you follow, news articles, and trending content.

TYPES OF CONTENT IN THE FEED:
1. User posts (text, images, videos from people you follow)
2. News articles (automatically posted by LavLay News bot)
3. Trending posts (popular content from across the platform)

LAVLAY NEWS BOT:
- Username: lavlay_news
- This is an automated account that posts Nigerian news articles every 4 hours
- News sources include: Premium Times, TechCabal, Bella Naija, Nairametrics, Vanguard, Daily Post
- Content is real Nigerian news — not generated or fake
- You can follow lavlay_news to always see the latest Nigerian news in your feed
- Reading these news articles earns you points

HOW TO EARN FROM READING POSTS:
- Open a post or news article
- Read through the content (scroll to the bottom)
- Points are credited after you spend sufficient time reading
- Rate: approximately 40 points per article/post read
- Daily reading limit applies

HOW TO EARN FROM LIKING:
- Click the heart/like button on any post or reel
- Earn a small number of points per like
- Daily like limit applies — once reached, likes don''t earn more points until tomorrow

HOW TO EARN FROM COMMENTING:
- Write a genuine, meaningful comment on a post or reel
- Earn points per qualifying comment
- Very short comments (like "nice" or single words) may not qualify
- Daily comment limit applies

HASHTAGS:
- Posts can be tagged with hashtags (#nigeria, #money, #lavlay, etc.)
- Click a hashtag to see all posts with that tag
- Trending hashtags appear in the Explore section

FOLLOWING OTHER USERS:
- Follow users whose content you enjoy
- Their posts appear in your feed
- Following popular creators = seeing more content to engage with = more points'
),

-- =====================================================================
-- 10. MARKETPLACE
-- =====================================================================
(
'LavLay Marketplace — Buying and Selling Products',
'marketplace',
ARRAY['marketplace','sell','buy','product','shop','vendor','listing','checkout'],
'The LavLay Marketplace allows users to buy and sell physical and digital products directly on the platform.

SELLING ON THE MARKETPLACE:
1. Go to Marketplace in the menu
2. Click "Create Product" or "Sell"
3. Add product name, description, price, and photos
4. Set your category (clothing, electronics, food, digital, etc.)
5. Publish your listing
6. When a buyer purchases, you are notified and arrange delivery

BUYING ON THE MARKETPLACE:
1. Browse products in the Marketplace
2. Click on a product to see details
3. Add to cart
4. Go to checkout
5. Pay via card or bank transfer
6. Arrange delivery with the seller

MARKETPLACE RULES:
- Only genuine products — no scams or fake listings
- Price must be in Nigerian Naira
- Sellers are responsible for delivery
- Any disputes should be reported to support

DOES BUYING/SELLING EARN POINTS?
- Marketplace activity is separate from the points earning system
- Points are earned from social engagement (watching, reading, liking)
- Marketplace is for commerce between users'
),

-- =====================================================================
-- 11. WITHDRAWAL TROUBLESHOOTING
-- =====================================================================
(
'Withdrawal Problems and Troubleshooting — Stuck, Failed, Rejected',
'withdrawal',
ARRAY['withdrawal stuck','withdrawal failed','withdrawal rejected','withdrawal pending','refund','money not received','wrong account'],
'COMMON WITHDRAWAL PROBLEMS AND SOLUTIONS:

PROBLEM: My withdrawal has been PENDING for a long time
SOLUTION:
- Pending means it is waiting for admin review
- Allow 1-2 business days for review (Monday–Friday)
- Weekends and public holidays are not business days
- If it has been more than 3 business days, contact support with your withdrawal ID
- Check that your subscription was still active when you submitted

PROBLEM: My withdrawal was REJECTED
SOLUTION:
- Check admin notes on the rejection (shown in your withdrawal history)
- Common reasons: wrong account details, expired subscription, insufficient matured balance
- Your points are automatically refunded when rejected
- Check your Points balance to confirm the refund
- Fix the issue and submit a new request

PROBLEM: Withdrawal says PROCESSING but I have not received money
SOLUTION:
- Processing means the transfer was initiated via Korapay (our payment provider)
- Bank transfers can take 5 minutes to 24 hours
- Mobile money is usually instant to 2 hours
- Check the account number you submitted is correct
- Contact your bank if it has been more than 24 hours with "processing" status
- Contact LavLay support with your withdrawal ID and transaction reference

PROBLEM: My points were deducted but withdrawal failed
SOLUTION:
- If a transfer fails at the Korapay level, points are automatically refunded
- Check your Points page — refund should appear within minutes of failure
- If points were not refunded after 24 hours, contact support immediately with your withdrawal ID

PROBLEM: I entered the wrong bank account number
SOLUTION:
- If your withdrawal is still PENDING: contact support immediately to cancel it
- Once it moves to PROCESSING, it has already been sent to the account you entered
- LavLay cannot recover money sent to a wrong account number — verify carefully before submitting
- Always double-check account number AND account name before submitting

PROBLEM: I cannot submit a withdrawal — getting an error
POSSIBLE CAUSES:
1. Your subscription expired — renew on the Subscription page
2. Your matured balance is below ₦1,000 minimum
3. The bank account was used by another LavLay user in the last 30 days
4. You already have a pending withdrawal (may only have one active at a time)

PROBLEM: Withdrawal says completed but money is not in my account
SOLUTION:
- "Completed" means Korapay confirmed the transfer was sent
- Check the exact account number in your withdrawal history
- Ask your bank for incoming transfer records for that date
- If nothing received, contact support with your withdrawal ID — we will investigate with Korapay'
),

-- =====================================================================
-- 12. POINTS TROUBLESHOOTING
-- =====================================================================
(
'Points Not Credited, Not Showing, or Wrong — Troubleshooting',
'points',
ARRAY['points not credited','points missing','points wrong','no points','points not showing','activity not earning'],
'COMMON POINTS PROBLEMS AND SOLUTIONS:

PROBLEM: I watched reels but no points were added
POSSIBLE REASONS:
1. You reached your daily earning limit for reels — limits reset at midnight
2. You did not watch for long enough (must watch a meaningful portion)
3. You watched the same reel multiple times (reduced points for repeats)
4. You are on the Free plan and have not subscribed before — earning is gated for brand new accounts
5. There was a brief server delay — check again in 5 minutes
6. Your account has not ever subscribed — some earning requires has_ever_subscribed to be true

SOLUTION: Wait until tomorrow (midnight reset), subscribe to any paid plan, and engage with fresh content

PROBLEM: I signed up but did not get my 5,000 welcome bonus
POSSIBLE REASONS:
1. The bonus was credited but is frozen (7-day maturity) — it shows as frozen, not available
2. There was a delay — wait up to 24 hours
3. Check your Points transaction history for "signup_bonus" entry
SOLUTION: Go to Points page and check frozen points. If the 5,000 is in frozen points, it will become available after 7 days.

PROBLEM: My points balance looks lower than expected
POSSIBLE REASONS:
1. Some points are still frozen (check frozen vs matured balance)
2. A withdrawal deducted points
3. Activity limits were reached
SOLUTION: Go to Points page and view the full transaction history to see exactly what happened

PROBLEM: I referred someone but did not get referral points
POSSIBLE REASONS:
1. Your friend did not enter your referral code at signup (must be entered during registration)
2. Referral points take a few minutes to process
3. Referral was from a device that was already associated with another referral
SOLUTION: Ask your friend to confirm they used your code. If they used it correctly and you still have no points after 24 hours, contact support with both usernames.

PROBLEM: Reading articles earns no points
POSSIBLE REASONS:
1. Daily reading limit reached — resets at midnight
2. You did not spend enough time on the article (scroll through it)
3. You already read that specific article today
SOLUTION: Try reading a different article and spend more time scrolling through the content'
),

-- =====================================================================
-- 13. ACCOUNT PROBLEMS — BAN, LOGIN, SECURITY
-- =====================================================================
(
'Account Issues — Banned Account, Login Problems, Security',
'account',
ARRAY['banned','account banned','cannot login','locked out','suspended','security','hacked','account access'],
'PROBLEM: My account is banned
WHAT THIS MEANS:
- Your account has been suspended by LavLay administration
- Common reasons: violating Terms of Service, fraudulent activity, creating multiple accounts, manipulating the points system

WHAT TO DO:
- Contact support at support@lavlay.com
- Use the chat support widget on lavlay.com
- Provide your username and email address
- Explain your situation
- If the ban was a mistake, support can review and lift it
- If the ban was for a genuine violation, the decision may be final

BANNED ACCOUNT RULES:
- Points and wallet balance are frozen while account is banned
- If the ban is lifted, your balance is restored
- Repeated violations may result in permanent ban

PROBLEM: Cannot log in — wrong password
SOLUTION:
1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your inbox (and spam folder) for the reset email
4. Click the link in the email (it expires in 1 hour)
5. Set a new password
6. Log in with new password

PROBLEM: I did not receive the password reset email
SOLUTION:
1. Check spam/junk folder
2. Make sure you entered the correct email address
3. Wait 5 minutes — sometimes email is delayed
4. Try requesting another reset
5. If still not received, contact support with your username and we will help manually

PROBLEM: My account was accessed without my permission
IMMEDIATE STEPS:
1. Change your password immediately (Forgot Password → reset)
2. Check your withdrawal history for any unauthorised requests
3. Contact support immediately to flag the account
4. We can see login history and device fingerprints to investigate
5. If a withdrawal was made by the intruder, report it to support with the withdrawal ID

PROBLEM: I have multiple accounts
POLICY:
- Each person is only allowed ONE LavLay account
- Creating multiple accounts to claim multiple signup bonuses is against the rules
- Multiple accounts detected from the same device may be banned
- If you accidentally created a second account, contact support to deactivate it'
),

-- =====================================================================
-- 14. DEVICE FINGERPRINTING AND ANTI-FRAUD
-- =====================================================================
(
'LavLay Anti-Fraud System — Device Fingerprinting, Cooldowns, Rules',
'security',
ARRAY['fraud','device','fingerprint','multiple accounts','ban','security','fair use','abuse'],
'LavLay has a comprehensive anti-fraud system to ensure fair earnings for all genuine users.

DEVICE FINGERPRINTING:
- When you log in, LavLay records a unique fingerprint of your device
- This fingerprint is based on your browser, screen, hardware, and other signals
- If multiple accounts are detected on the same device, our system flags this for review
- Sharing devices with family members: contact support to explain your situation

BANK ACCOUNT COOLDOWN:
- Each bank account number can only be used for withdrawals by ONE user every 30 days
- This prevents one person using multiple accounts to withdraw to the same bank
- If you get an error "bank account recently used by another account," wait 30 days or use a different account
- Legitimate couples/family sharing a bank: contact support for manual review

POINT EARNING LIMITS:
- Daily earning limits exist to prevent automated bots from farming points
- These limits are per-account and per-device
- Attempting to bypass limits with scripts or bots results in immediate ban

WHAT IS NOT ALLOWED:
- Creating multiple LavLay accounts
- Using bots or scripts to earn points automatically
- Referring yourself using a different email address
- Submitting fake bank account details
- Manipulating views, likes, or comments artificially
- Sharing accounts between multiple people

CONSEQUENCES OF FRAUD:
- Account suspension or permanent ban
- Points and wallet balance forfeiture
- Reporting to relevant authorities for financial fraud cases

FAIR USE MEANS:
- One account per person
- Genuine engagement with content
- Real withdrawals to your own bank account
- Honest referrals to real people who will use the platform'
),

-- =====================================================================
-- 15. NOTIFICATIONS
-- =====================================================================
(
'LavLay Notifications — What They Mean and How to Manage Them',
'general',
ARRAY['notifications','alerts','email','push notification','messages'],
'TYPES OF NOTIFICATIONS ON LAVLAY:

IN-APP NOTIFICATIONS (Bell icon):
- Someone followed you
- Someone liked your post or reel
- Someone commented on your post
- Someone mentioned you in a comment
- Your withdrawal was approved or rejected
- Your subscription is expiring soon

EMAIL NOTIFICATIONS:
- Welcome email when you sign up (with your referral code)
- Withdrawal approved: email sent with details
- Withdrawal rejected: email sent with reason
- Account banned: email notification
- Subscription expiry reminders

SMS NOTIFICATIONS:
- OTP codes for phone verification
- May receive transaction alerts depending on your settings

HOW TO MANAGE NOTIFICATIONS:
- Go to Settings → Notifications
- Toggle which types of notifications you receive
- Email notifications cannot be fully disabled (important account alerts always sent)

MISSING NOTIFICATIONS:
- Check spam folder for email notifications
- Ensure you are logged into the correct account
- Notifications are delivered in real-time — if delayed, it may be a connection issue'
),

-- =====================================================================
-- 16. MESSAGES AND DIRECT MESSAGING
-- =====================================================================
(
'Direct Messages on LavLay — How to Message Other Users',
'general',
ARRAY['messages','dm','direct message','chat','inbox','messaging'],
'LavLay has a direct messaging system that allows users to communicate privately.

HOW TO SEND A MESSAGE:
1. Go to someone''s profile
2. Click the "Message" button
3. Type your message and send
4. Or go to Messages in the navigation menu to see all conversations

YOUR MESSAGE INBOX:
- Access via Messages icon in navigation
- Shows all your conversations
- Unread messages appear highlighted

MESSAGE RULES:
- Do not send spam or unsolicited promotional messages
- Do not share scam links or phishing attempts in messages
- Report abusive messages using the report button
- LavLay support will NEVER contact you via DM asking for your password or payment

MESSAGES AND POINTS:
- Sending and receiving messages does not earn points
- Messages are purely for communication between users'
),

-- =====================================================================
-- 17. PEOPLE AND FOLLOWERS
-- =====================================================================
(
'Following People on LavLay — How Followers Work',
'general',
ARRAY['follow','followers','following','people','discover','unfollow'],
'HOW FOLLOWING WORKS:
- Follow users whose content you want to see in your feed
- When you follow someone, their posts appear in your timeline
- They receive a notification that you followed them
- They earn 50 points when you follow them

HOW TO FOLLOW SOMEONE:
1. Go to their profile
2. Click "Follow"
3. Or go to People section to discover users to follow

HOW TO GET FOLLOWERS:
- Post interesting, quality content regularly
- Engage with other users (comment thoughtfully on posts)
- Share your LavLay profile link on other social media
- Use relevant hashtags on your posts
- Interact with trending content

EARNINGS FROM FOLLOWERS:
- You earn 50 points each time someone follows you
- There is no limit on how many people can follow you
- Building a large following = significant ongoing point earnings

UNFOLLOWING:
- Go to the user''s profile and click "Unfollow"
- The user is not notified when you unfollow
- Their posts stop appearing in your feed'
),

-- =====================================================================
-- 18. MAKING MONEY — STRATEGY GUIDE
-- =====================================================================
(
'How to Make the Most Money on LavLay — Complete Strategy Guide',
'earning',
ARRAY['make money','earn money','strategy','maximize earnings','best way','income','tips','how to earn more'],
'This guide covers the most effective strategies for maximising your earnings on LavLay Nigeria.

STEP 1: SUBSCRIBE TO A PAID PLAN (REQUIRED)
- You CANNOT withdraw on the free plan
- Start with Starter (15 days) or Basic (30 days) to get full withdrawal access
- Pro plan gives the highest daily earning limits — best return for heavy users
- Daily plan is one-time only — use it to test before committing to longer plans

STEP 2: COMPLETE DAILY EARNING ACTIVITIES (DO THIS EVERY DAY)
Each day, do all of these:
a) WATCH REELS: Go to Reels, watch videos until your daily limit
b) READ POSTS: Open news articles and posts in your feed, read them fully
c) LIKE CONTENT: Like posts and reels you genuinely enjoy (daily limit applies)
d) COMMENT: Leave thoughtful comments on posts and reels

Missing even one day means missing that day''s worth of points permanently.

STEP 3: MAXIMISE YOUR REFERRALS (MOST POWERFUL EARNING METHOD)
- Share your referral link everywhere: WhatsApp, Facebook, Instagram, Twitter
- For every friend who subscribes, you earn commission
- 10 friends subscribing to Basic plan monthly = significant recurring income
- Referral commissions from paying friends keep coming every month they renew

STEP 4: BUILD YOUR FOLLOWING
- Post interesting content (Nigerian news commentary, lifestyle posts, videos)
- Engage with others by commenting thoughtfully
- Each new follower = 50 points
- 100 new followers per month = 5,000 extra points = ₦500 passively

STEP 5: WAIT FOR MATURITY AND WITHDRAW EFFICIENTLY
- Points mature after 7 days
- Plan your withdrawals around maturity dates
- Withdraw when you have meaningful amounts (saves on your time)
- Keep renewing your subscription before it expires to maintain withdrawal access

STEP 6: COMPOUND YOUR STRATEGY
- More referrals → more commission income → pay for your own subscription → net profit
- A user with 20+ active referrals on Basic or Pro plans can earn more than their subscription cost monthly

REALISTIC INCOME EXPECTATIONS:
- Casual user (daily activities only): ₦500–₦2,000/month
- Active user + referrals: ₦2,000–₦10,000/month
- Power user + large referral network: ₦10,000–₦50,000+/month
- Income depends entirely on consistency, referral count, and subscription tier

IMPORTANT: LavLay is a legitimate earning platform but is NOT a get-rich-quick scheme. Consistent daily effort and building a referral network is the path to meaningful income.'
),

-- =====================================================================
-- 19. SUBSCRIPTION PAYMENT PROBLEMS
-- =====================================================================
(
'Subscription Payment Issues — Failed Payment, Not Activated, Refund',
'subscription',
ARRAY['payment failed','subscription not active','not subscribed','payment issue','refund subscription','deducted but not subscribed'],
'PROBLEM: Payment was deducted from my account but subscription did not activate
SOLUTION:
1. Wait up to 15 minutes — sometimes there is a delay in payment confirmation
2. Refresh the Subscription page
3. Check your payment method statement — confirm money was actually deducted
4. If money was deducted and subscription still shows as free after 30 minutes, contact support immediately
5. Provide: your email, amount deducted, date/time, and your bank transaction reference
6. Our team can manually activate the subscription or process a refund

PROBLEM: My payment keeps failing
POSSIBLE REASONS:
1. Card does not have sufficient funds
2. Card is not enabled for online/international transactions (contact your bank)
3. Wrong card details entered
4. Your bank is blocking the transaction — call your bank to whitelist Paystack
5. Network issues during payment — try again
SOLUTION: Try a different payment method (USSD, bank transfer, different card)

PROBLEM: I want a refund on my subscription
REFUND POLICY:
- Subscription payments are generally non-refundable once activated
- If the subscription did not activate despite payment, you are entitled to a full refund
- Contact support within 7 days of payment for refund requests
- Provide proof of payment (bank statement screenshot or transaction reference)
- Refunds take 3–7 business days to process

PROBLEM: My subscription expired early
- Subscriptions count calendar time, not login time
- Daily plan: 24 hours from activation
- Starter: 15 calendar days
- Basic/Pro: 30 calendar days
- If yours expired earlier than expected, contact support with your subscription start date

HOW TO CHECK YOUR SUBSCRIPTION STATUS:
- Go to Subscription page
- Your current plan, start date, and expiry date are shown
- You will receive notifications as your subscription approaches expiry'
),

-- =====================================================================
-- 20. SETTINGS AND PROFILE
-- =====================================================================
(
'LavLay Settings — Profile, Privacy, Account Management',
'account',
ARRAY['settings','profile','privacy','username','password change','delete account','profile picture'],
'ACCESSING SETTINGS:
- Click your avatar/profile picture
- Or go to menu → Settings

WHAT YOU CAN CHANGE IN SETTINGS:

PROFILE SETTINGS:
- Profile photo: Upload a new photo (square format works best)
- Full name: Can be updated
- Bio: Write about yourself (shown on your public profile)
- Username: CANNOT be changed after account creation — choose carefully at signup

PASSWORD:
- Change password in Settings → Security
- Requires current password + new password
- Use a strong password: mix of letters, numbers, and symbols

PRIVACY:
- Profile visibility: public or private
- Private account: only approved followers see your posts
- Public account: anyone can see your posts and follow you

NOTIFICATION PREFERENCES:
- Manage which notifications you receive
- Email notification settings

CONNECTED ACCOUNTS:
- Link social media accounts for easier login (if enabled)

DELETING YOUR ACCOUNT:
- Account deletion is permanent and irreversible
- All your points, balance, posts, and data will be deleted
- Pending withdrawals must be resolved before deletion
- Contact support at support@lavlay.com to request account deletion
- We have a 30-day cooling-off period before permanent deletion'
),

-- =====================================================================
-- 21. MOBILE APP AND BROWSER
-- =====================================================================
(
'Using LavLay on Mobile — App, Browser, Progressive Web App',
'general',
ARRAY['mobile','app','android','iphone','ios','browser','download','install','pwa'],
'HOW TO USE LAVLAY ON MOBILE:

BROWSER (RECOMMENDED FOR NOW):
- Open your mobile browser (Chrome on Android, Safari on iPhone)
- Go to lavlay.com
- Log in to your account
- Use all features directly in the browser
- Works on all modern mobile browsers

INSTALLING AS AN APP (PWA):
On Android (Chrome):
1. Open lavlay.com in Chrome
2. Tap the 3-dot menu (top right)
3. Select "Add to Home Screen" or "Install App"
4. The LavLay icon appears on your home screen
5. Tap it to open like a regular app

On iPhone (Safari):
1. Open lavlay.com in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. LavLay icon appears on your home screen

MOBILE FEATURES:
- Full earning capabilities (reels, reading, liking)
- Bottom navigation bar for easy access to all sections
- Reels optimised for vertical mobile viewing
- Upload photos and videos directly from your phone camera
- Receive push notifications (if you allow them)

MOBILE DATA USAGE:
- Watching reels uses more data than reading posts
- Connect to WiFi for watching many reels to save data
- Reading posts and text content uses very little data'
),

-- =====================================================================
-- 22. CONTENT CREATION
-- =====================================================================
(
'Creating and Posting Content on LavLay — Posts, Reels, Images',
'general',
ARRAY['create post','upload','video','image','reel','content creator','post','share'],
'CREATING A POST:
1. Tap the + button or "Create" in the navigation
2. Write your text content
3. Optionally add an image or video
4. Add hashtags to help people discover your post
5. Tap "Post" to publish

UPLOADING A REEL (SHORT VIDEO):
1. Go to Reels section
2. Tap the + or upload button
3. Select a video from your device (or record one)
4. Add a caption/description
5. Publish

CONTENT GUIDELINES — WHAT IS ALLOWED:
- Personal updates and thoughts
- Nigerian news commentary
- Entertainment content
- Educational content
- Product listings (use Marketplace for selling)
- Motivational content
- Lifestyle and fashion
- Food and cooking
- Tech and business tips

CONTENT NOT ALLOWED:
- Nudity or sexual content
- Hate speech or discrimination
- Scam or fraudulent content
- Violence or graphic content
- Spam or repetitive promotional posts
- Content that violates Nigerian law
- Fake news or deliberate misinformation

VIOLATING CONTENT RULES:
- Your post will be removed by moderation
- Repeated violations can lead to account suspension or ban
- Report violating content using the report button on any post

FILE UPLOAD LIMITS:
- Images: JPG, PNG, WebP supported
- Videos: MP4 recommended
- File size limits apply — very large videos may need to be compressed first'
),

-- =====================================================================
-- 23. CONTACT AND SUPPORT
-- =====================================================================
(
'How to Contact LavLay Support',
'support',
ARRAY['contact','support','help','customer service','email support','report problem'],
'HOW TO GET HELP FROM LAVLAY:

1. CHAT SUPPORT (FASTEST — Available 24/7 via AI):
- Click the purple chat bubble (bottom-right corner of any page on lavlay.com)
- Our AI assistant can answer most questions instantly
- If AI cannot help, a human agent will take over and respond within 24 hours
- Signed-in users: no need to provide name or email — we already know your account

2. EMAIL SUPPORT:
- Email: support@lavlay.com
- Include your username, email address, and clear description of the issue
- Attach screenshots if relevant
- Response time: 24–48 hours on business days

3. ADMIN SUPPORT DASHBOARD (FOR AGENTS):
- LavLay agents manage support tickets at lavlay.com/admin/support
- Every chat escalation creates a ticket that agents can view and respond to

WHAT TO INCLUDE WHEN CONTACTING SUPPORT:
- Your username
- Your registered email address
- Clear description of the problem
- Screenshots or transaction IDs if relevant
- What you have already tried

RESPONSE TIMES:
- Chat (AI): Instant
- Chat (Human agent): Within 24 hours
- Email: 24–48 hours
- Urgent issues (missing funds, banned account): prioritised within 12 hours

THINGS SUPPORT CANNOT DO:
- Change your username
- Recover money sent to wrong bank account (your responsibility to verify details)
- Override fraud detection bans without investigation

THINGS SUPPORT CAN DO:
- Manually activate subscriptions if payment failed
- Investigate missing points or wallet balance
- Review and potentially reverse incorrect bans
- Help with account access if locked out
- Investigate failed or stuck withdrawals
- Process refunds for failed subscriptions'
),

-- =====================================================================
-- 24. LAVLAY REELS VIEWER PRO
-- =====================================================================
(
'LavLay Reels Viewer — Features and How to Use',
'earning',
ARRAY['reels viewer','pro viewer','fullscreen','swipe','reels features','watch reels'],
'THE REELS VIEWER:
LavLay has a professional reels viewing experience similar to TikTok and Instagram Reels.

FEATURES:
- Full-screen vertical video player
- Swipe up to go to next reel
- Swipe down to go back
- Like button while watching
- Comment button to see and add comments
- Share button to share with others
- Follow button for the creator directly on the reel
- View count shown on each reel

EARNING WHILE WATCHING:
- Points are credited automatically as you watch
- The system detects genuine engagement vs fast-scrolling
- Watch reels fully for maximum points
- Each unique reel you watch (not previously watched today) earns full points

REEL CATEGORIES:
- News and current affairs (from LavLay News)
- Entertainment
- Lifestyle and fashion
- Tech and business
- Comedy
- Educational
- User-generated content from people you follow

VIDEO QUALITY:
- Reels auto-adjust quality based on your internet speed
- On WiFi, you get higher quality video
- On mobile data, quality may reduce to save data

IF REELS DO NOT LOAD:
1. Check your internet connection
2. Refresh the page
3. Try a different browser
4. Clear browser cache
5. If still not working, contact support'
),

-- =====================================================================
-- 25. LAVLAY POLICIES AND TERMS
-- =====================================================================
(
'LavLay Terms, Policies, and Rules — What You Need to Know',
'general',
ARRAY['terms','policy','rules','guidelines','community standards','privacy','legal'],
'KEY LAVLAY POLICIES:

ONE ACCOUNT PER PERSON:
Each individual is allowed exactly one LavLay account. Creating multiple accounts to claim multiple bonuses or referrals is prohibited and results in all accounts being banned.

GENUINE ENGAGEMENT ONLY:
- Points must be earned through genuine human activity
- Bots, scripts, automated clicking, or any artificial engagement is banned
- LavLay monitors patterns to detect automated behavior

REFERRAL RULES:
- Referrals must be genuine new users who will actually use the platform
- Self-referral is not allowed
- Referring someone who immediately requests a refund may reverse your commission

WITHDRAWAL RULES:
- Withdraw only to accounts you legitimately own
- Providing false bank details is fraud
- LavLay cooperates with law enforcement on financial fraud cases

CONTENT RULES:
- All content must comply with Nigerian law
- No NSFW, hate speech, scams, or misinformation
- LavLay moderators review flagged content and can remove it

PRIVACY:
- LavLay collects your email, username, phone, and activity data
- This data is used to operate the platform and prevent fraud
- Your data is not sold to third parties
- Device fingerprints are stored for security purposes

POINT EXPIRY:
- Points do NOT expire as long as your account is in good standing
- If your account is banned for fraud, points may be forfeited

SUBSCRIPTION TERMS:
- Subscriptions are for the stated duration and non-transferable
- Subscription fees are non-refundable except in cases of non-delivery
- LavLay reserves the right to change subscription prices with notice

CHANGES TO POLICIES:
- LavLay may update these policies at any time
- Users will be notified of significant changes
- Continued use of the platform after changes means acceptance of the new terms'
);

-- Verify seed count
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM knowledge_base;
  RAISE NOTICE 'Knowledge base seeded with % articles', v_count;
END $$;
