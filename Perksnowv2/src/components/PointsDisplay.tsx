import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Coins, TrendingUp, Award, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface PointsDisplayProps {
  userId?: string;
  showConvertButton?: boolean;
  onConvertClick?: () => void;
}

export function PointsDisplay({ userId, showConvertButton = false, onConvertClick }: PointsDisplayProps) {
  const { user } = useAuth();
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [conversionRate] = useState(0.01); // $0.01 per point (customize this)

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchPointsBalance();
    }
  }, [targetUserId]);

  const fetchPointsBalance = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      setPointsBalance(data?.points_balance || 0);
    } catch (err) {
      console.error('Error fetching points balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const estimatedCash = (pointsBalance * conversionRate).toFixed(2);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-purple-200 rounded w-24 mb-2"></div>
              <div className="h-6 bg-purple-200 rounded w-32"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Reward Points
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Points Balance */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {pointsBalance.toLocaleString()}
              </span>
              <span className="text-gray-600 text-sm">points</span>
            </div>

            {/* Estimated Cash Value */}
            <div className="flex items-center gap-2 mt-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">
                ≈ <span className="font-semibold text-green-600">${estimatedCash}</span> USD
              </span>
              <Badge variant="outline" className="text-xs">
                ${conversionRate}/pt
              </Badge>
            </div>
          </div>

          {/* Earning Info */}
          <div className="bg-white/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Earn points by being active!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>• Post: <span className="font-semibold">10 pts</span></div>
              <div>• Like received: <span className="font-semibold">2 pts</span></div>
              <div>• Comment received: <span className="font-semibold">5 pts</span></div>
              <div>• Follow received: <span className="font-semibold">10 pts</span></div>
            </div>
          </div>

          {/* Convert Button */}
          {showConvertButton && pointsBalance >= 100 && (
            <Button
              onClick={onConvertClick}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Award className="w-4 h-4 mr-2" />
              Convert to Cash
            </Button>
          )}

          {showConvertButton && pointsBalance < 100 && (
            <p className="text-xs text-center text-gray-500">
              Minimum 100 points required for conversion
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
