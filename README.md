# SocialHub Frontend

React-based frontend application for the SocialHub social commerce platform with TypeScript, Vite, and Supabase authentication.

## Features

- **Modern UI/UX**: Built with React and styled components
- **Authentication**: Supabase authentication integration
- **Social Commerce**: Product listings, memberships, and earnings tracking
- **Points System**: View and redeem points for rewards
- **Payment Integration**: Seamless payment processing with backend API
- **Responsive Design**: Mobile-first responsive layout
- **Real-time Updates**: Live data synchronization with Supabase

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Styling**: Styled Components / Tailwind CSS
- **State Management**: React Context / Redux (as needed)
- **HTTP Client**: Axios
- **Deployment**: Vercel / Netlify

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Backend API running (see [backend repository](https://github.com/yourusername/socialhub-backend))

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/socialhub-frontend.git
cd socialhub-frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**

Create a `.env` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend API Configuration
VITE_API_URL=http://localhost:3001
# For production: https://your-backend.railway.app
```

4. **Start the development server:**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint
- `npm run type-check`: Run TypeScript type checking

## Project Structure

```
Perksnowv2/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components
│   ├── lib/              # Utilities and configurations
│   │   ├── api.ts        # Backend API client
│   │   └── supabase.ts   # Supabase client
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React contexts
│   ├── types/            # TypeScript type definitions
│   ├── assets/           # Static assets (images, fonts, etc.)
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Application entry point
├── public/               # Public static files
├── .env                  # Environment variables (not in git)
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Using the API Client

The frontend includes a pre-configured API client for communicating with the backend:

```typescript
import api from '@/lib/api';

// Get membership tiers
const { tiers } = await api.getMembershipTiers();

// Get points rewards
const { rewards } = await api.getPointsRewards();

// Subscribe to a plan (requires authentication)
const result = await api.subscribeToPlan('tier-id', 'monthly');

// Get earnings analytics (requires authentication)
const analytics = await api.getEarningsAnalytics();

// Initialize payment
const payment = await api.initializePayment({
  amount: 10000,
  type: 'product',
  reference_id: 'product-id',
  provider: 'paystack'
});
```

## Authentication

The app uses Supabase for authentication. Users can:
- Sign up with email/password
- Log in with email/password
- Reset password
- OAuth login (Google, GitHub, etc.)

```typescript
import { supabase } from '@/lib/supabase';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await supabase.auth.signOut();
```

## Deployment

### Deploy to Vercel

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
vercel deploy
```

3. **Add environment variables in Vercel dashboard:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (your backend URL)

4. **Deploy to production:**
```bash
vercel --prod
```

### Deploy to Netlify

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Build the app:**
```bash
npm run build
```

3. **Deploy:**
```bash
netlify deploy --prod --dir=dist
```

4. **Add environment variables in Netlify dashboard:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL`

## Environment Variables

Required environment variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous/public key
- `VITE_API_URL`: Backend API URL
  - Development: `http://localhost:3001`
  - Production: `https://your-backend.railway.app`

## Features Overview

### Membership Tiers
View and subscribe to different membership tiers (Free, Silver, Gold, Platinum) with varying benefits.

### Product Marketplace
Browse and purchase products, track orders, and manage your own product listings.

### Earnings Dashboard
Track your earnings, view analytics, and monitor your wallet balance.

### Points & Rewards
Accumulate points through activities and redeem them for rewards or convert to money.

### Wallet & Withdrawals
Manage your wallet balance, add bank accounts, and request withdrawals.

## Design

The original design is available at:
https://www.figma.com/design/TXWRLvxiyi4J9zvwDWoIrC/Social-Media-Platform

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Code splitting for optimal bundle size
- Lazy loading of routes and components
- Image optimization
- Caching strategies

## Security

- Environment variables for sensitive data
- Secure authentication with Supabase
- XSS protection
- CSRF protection
- Secure HTTP-only cookies

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and questions:
- Open an issue on GitHub
- Check the [backend repository](https://github.com/yourusername/socialhub-backend)

## License

MIT

## Related Repositories

- Backend API: https://github.com/yourusername/socialhub-backend
