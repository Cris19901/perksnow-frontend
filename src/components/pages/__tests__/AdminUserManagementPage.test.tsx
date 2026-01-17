import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { AdminUserManagementPage } from '../AdminUserManagementPage';
import { AuthContext } from '../../../contexts/AuthContext';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
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

const mockUsers = [
  {
    id: 'user-1',
    username: 'johndoe',
    full_name: 'John Doe',
    email: 'john@example.com',
    avatar_url: null,
    subscription_tier: 'free',
    subscription_status: 'inactive',
    subscription_expires_at: null,
    points_balance: 1000,
    is_banned: false,
    created_at: '2025-01-01T00:00:00Z',
    followers_count: 50,
    following_count: 30,
  },
  {
    id: 'user-2',
    username: 'janepro',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    avatar_url: null,
    subscription_tier: 'pro',
    subscription_status: 'active',
    subscription_expires_at: '2026-02-01T00:00:00Z',
    points_balance: 5000,
    is_banned: false,
    created_at: '2024-12-01T00:00:00Z',
    followers_count: 200,
    following_count: 100,
  },
];

const mockAuthContext = {
  user: {
    id: 'admin-id',
    email: 'admin@test.com',
    is_admin: true,
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

describe('AdminUserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase query chain
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
            count: 2,
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

  it('renders page title and description', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText(/Manage users, subscriptions, and account status/i)).toBeInTheDocument();
    });
  });

  it('displays search input', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('shows filter buttons (All, Free, Pro)', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('All Users')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  it('displays stats cards', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Pro Users')).toBeInTheDocument();
      expect(screen.getByText('Banned Users')).toBeInTheDocument();
      expect(screen.getByText('This Page')).toBeInTheDocument();
    });
  });

  it('loads and displays users in table', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('johndoe')).toBeInTheDocument();
      expect(screen.getByText('janepro')).toBeInTheDocument();
    });
  });

  it('shows upgrade button for free users', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      const upgradeButtons = screen.getAllByText('Upgrade');
      expect(upgradeButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows downgrade button for pro users', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      const downgradeButtons = screen.getAllByText('Downgrade');
      expect(downgradeButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows ban/unban buttons', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      const banButtons = screen.getAllByText('Ban');
      expect(banButtons.length).toBeGreaterThan(0);
    });
  });

  it('filters users when clicking Free button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('All Users')).toBeInTheDocument();
    });

    const freeButton = screen.getByText('Free');
    await user.click(freeButton);

    // Should call Supabase with filter
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
  });

  it('searches users when typing in search box', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
      expect(searchInput).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
    await user.type(searchInput, 'john');

    // Should trigger search
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  it('shows pagination controls when needed', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    });
  });

  it('displays user subscription badges correctly', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  it('displays user status badges (Active/Banned)', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows Back to Dashboard button', async () => {
    renderWithRouter(<AdminUserManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });
  });
});
