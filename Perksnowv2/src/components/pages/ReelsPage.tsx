import { Header } from '../Header';
import { MobileBottomNav } from '../MobileBottomNav';
import { useNavigate } from 'react-router-dom';
import { PlaySquare } from 'lucide-react';

interface ReelsPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function ReelsPage({ onCartClick, cartItemsCount }: ReelsPageProps) {
  const navigate = useNavigate();

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <Header
          onNavigate={(page) => navigate(`/${page}`)}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="reels"
        />

        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <PlaySquare className="w-12 h-12 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Reels Coming Soon!</h1>
            <p className="text-gray-600 mb-6">
              We're working on bringing you short-form video content where you can share moments and earn rewards.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>What to expect:</strong> Vertical scrolling videos, easy uploads, and points for viral content!
              </p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav currentPage="reels" />
    </>
  );
}
