import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from '../AdminDashboard';
import { AuthContext } from '../../../contexts/AuthContext';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        select: vi.fn(() => ({
          count: 'exact',
          head: true,
        })),
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({})),
        })),
      })),
    })),
  },
}));

// Mock Context
const mockUser = {
  id: 'test-user-id',
  email: 'admin@test.com',
  is_admin: true,
};

const mockAuthContext = {
  user: mockUser,
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

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin dashboard title', async () => {
    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('displays all 6 admin tool cards', async () => {
    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Point Settings')).toBeInTheDocument();
      expect(screen.getByText('Withdrawals')).toBeInTheDocument();
      expect(screen.getByText('Referral Settings')).toBeInTheDocument();
      expect(screen.getByText('Signup Bonus')).toBeInTheDocument();
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });
  });

  it('displays stats overview cards', async () => {
    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Total Points')).toBeInTheDocument();
      expect(screen.getByText('Pending Requests')).toBeInTheDocument();
      expect(screen.getByText('Total Withdrawals')).toBeInTheDocument();
    });
  });

  it('shows correct descriptions for each admin tool', async () => {
    renderWithRouter(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Manage users, subscriptions, and account status/i)).toBeInTheDocument();
      expect(screen.getByText(/Configure point values, limits, and conversion rates/i)).toBeInTheDocument();
      expect(screen.getByText(/Review and approve user withdrawal requests/i)).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    renderWithRouter(<AdminDashboard />);

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
