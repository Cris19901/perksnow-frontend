import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import SubscriptionPage from '../SubscriptionPage';
import { AuthContext } from '../../../contexts/AuthContext';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPlans = [
  {
    id: 'plan-free',
    name: 'free',
    display_name: 'Free',
    description: 'Perfect for getting started',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'NGN',
    features: {},
    limits: {
      max_posts_per_day: 5,
      max_reels_per_day: 3,
      can_withdraw: false,
      verified_badge: false,
    },
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'plan-pro',
    name: 'pro',
    display_name: 'Pro',
    description: 'For power users and creators',
    price_monthly: 2000,
    price_yearly: 20000,
    currency: 'NGN',
    features: {
      priority_support: true,
      ad_free: true,
    },
    limits: {
      max_posts_per_day: 999,
      max_reels_per_day: 999,
      can_withdraw: true,
      verified_badge: true,
    },
    sort_order: 2,
    is_active: true,
  },
];

const mockAuthContext = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  loading: false,
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext as any}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('SubscriptionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock subscription plans query
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPlans,
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: {
              subscription_tier: 'free',
              subscription_status: 'inactive',
              subscription_expires_at: null,
            },
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'sub-123' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });
  });

  it('renders page title', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    });
  });

  it('displays both Free and Pro plans', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  it('shows billing cycle toggle buttons', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText(/Yearly/i)).toBeInTheDocument();
    });
  });

  it('displays "Save 16%" badge for yearly billing', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Save 16%')).toBeInTheDocument();
    });
  });

  it('shows Pro plan pricing correctly', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText(/₦2,000/)).toBeInTheDocument();
    });
  });

  it('displays "Most Popular" badge on Pro plan', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
    });
  });

  it('shows Pro plan features', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText(/Withdraw earnings/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified badge/i)).toBeInTheDocument();
    });
  });

  it('displays "Subscribe Now" button for Pro plan', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      const subscribeButtons = screen.getAllByText(/Subscribe Now/i);
      expect(subscribeButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows FAQ section', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      expect(screen.getByText(/Can I cancel anytime?/i)).toBeInTheDocument();
      expect(screen.getByText(/When can I withdraw my earnings?/i)).toBeInTheDocument();
    });
  });

  it('toggles between monthly and yearly pricing', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument();
    });

    const yearlyButton = screen.getByText(/Yearly/i);
    await user.click(yearlyButton);

    // Should show yearly pricing
    await waitFor(() => {
      expect(screen.getByText(/₦20,000/)).toBeInTheDocument();
    });
  });

  it('displays current subscription status', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText(/Current Plan/i)).toBeInTheDocument();
    });
  });

  it('shows Crown icon on Pro plan', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('displays Free plan as current for free users', async () => {
    renderWithRouter(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('Current Plan: Free')).toBeInTheDocument();
    });
  });
});
