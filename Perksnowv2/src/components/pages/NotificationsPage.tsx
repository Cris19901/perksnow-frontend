import { Header } from '../Header';
import { NotificationsList } from '../NotificationsList';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface NotificationsPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function NotificationsPage({ onCartClick, cartItemsCount }: NotificationsPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="notifications"
      />

      <div className="max-w-[1000px] mx-auto px-4 py-4 sm:py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Notifications</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Stay updated with your latest interactions
          </p>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {user ? (
            <NotificationsList onNavigate={(page) => navigate(`/${page}`)} />
          ) : (
            <div className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-2">No notifications yet</h2>
                <p className="text-gray-600 mb-6">
                  Log in to see your notifications and stay connected with the community.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="text-purple-600 hover:underline font-medium"
                >
                  Log in to continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
