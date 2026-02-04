import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, DollarSign, CreditCard, Smartphone, Wallet, AlertCircle, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onSuccess?: () => void;
}

// Conversion rate: 10 points = 1 NGN
const POINTS_TO_NGN = 0.1; // 1 point = 0.1 NGN (or 10 points = 1 NGN)
const MIN_WITHDRAWAL_POINTS = 5000; // Minimum 5,000 points (= 500 NGN) - lowered for first withdrawal
const WITHDRAWAL_FREQUENCY_DAYS = 15; // Can withdraw once every 15 days

export function WithdrawalModal({ open, onOpenChange, currentBalance, onSuccess }: WithdrawalModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pointsToWithdraw, setPointsToWithdraw] = useState<string>('');
  const [withdrawalMethod, setWithdrawalMethod] = useState<'bank' | 'opay'>('bank');
  const [selectedCurrency, setSelectedCurrency] = useState<'NGN' | 'USD' | 'EUR' | 'GBP'>('NGN');
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  // User details
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(true);
  const [nextWithdrawalDate, setNextWithdrawalDate] = useState<string | null>(null);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);
  const [ineligibilityReason, setIneligibilityReason] = useState<string>('');
  const [maxWithdrawalPoints, setMaxWithdrawalPoints] = useState<number>(999999999);
  const [withdrawalCount, setWithdrawalCount] = useState<number>(0);

  const points = parseInt(pointsToWithdraw) || 0;
  const ngnAmount = points * POINTS_TO_NGN;

  // Calculate amount in selected currency
  const calculateCurrencyAmount = () => {
    if (selectedCurrency === 'NGN') {
      return ngnAmount.toFixed(2);
    }
    if (exchangeRates && exchangeRates[selectedCurrency]) {
      return (ngnAmount / exchangeRates[selectedCurrency]).toFixed(2);
    }
    return '0.00';
  };

  const currencyAmount = calculateCurrencyAmount();

  // Fetch exchange rates when modal opens
  useEffect(() => {
    if (open) {
      fetchExchangeRates();
      checkWithdrawalEligibility();
      prefillUserData();
    }
  }, [open, user]);

  const fetchExchangeRates = async () => {
    try {
      setLoadingRates(true);
      // Using exchangerate-api.com free tier
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/NGN');
      const data = await response.json();
      setExchangeRates(data.rates);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      toast.error('Failed to load exchange rates. Defaulting to NGN.');
      setSelectedCurrency('NGN');
    } finally {
      setLoadingRates(false);
    }
  };

  const checkWithdrawalEligibility = async () => {
    if (!user) return;

    try {
      setEligibilityChecking(true);

      // Check if user can withdraw using the Supabase function
      const { data: canWithdrawData, error: withdrawError } = await supabase
        .rpc('can_user_withdraw', { p_user_id: user.id });

      if (withdrawError) {
        console.error('Error checking withdrawal eligibility:', withdrawError);
        // Default to checking user's subscription tier directly
        const { data: userData } = await supabase
          .from('users')
          .select('subscription_tier, subscription_status, subscription_expires_at')
          .eq('id', user.id)
          .single();

        const isPro = userData?.subscription_tier === 'pro'
          && userData?.subscription_status === 'active'
          && (!userData?.subscription_expires_at || new Date(userData.subscription_expires_at) > new Date());

        setHasActiveMembership(isPro);
        if (!isPro) {
          setCanWithdraw(false);
          setIneligibilityReason('You need an active Pro subscription to withdraw earnings');
          return;
        }
      } else {
        setHasActiveMembership(canWithdrawData);
        if (!canWithdrawData) {
          setCanWithdraw(false);
          setIneligibilityReason('You need an active Pro subscription to withdraw earnings');
          return;
        }
      }

      // Check last withdrawal date
      const { data: lastWithdrawal, error } = await supabase
        .from('wallet_withdrawals')
        .select('created_at')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is fine
        console.log('Note: wallet_withdrawals table may not exist yet');
        setCanWithdraw(true);
        return;
      }

      if (lastWithdrawal) {
        const lastDate = new Date(lastWithdrawal.created_at);
        const daysSinceLastWithdrawal = Math.floor(
          (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastWithdrawal < WITHDRAWAL_FREQUENCY_DAYS) {
          const nextDate = new Date(lastDate);
          nextDate.setDate(nextDate.getDate() + WITHDRAWAL_FREQUENCY_DAYS);
          setCanWithdraw(false);
          setNextWithdrawalDate(nextDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }));
          setIneligibilityReason(`You can request another withdrawal on ${nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`);
          return;
        }
      }

      // Get user's withdrawal count and max amount
      const { data: userData } = await supabase
        .from('users')
        .select('successful_withdrawals_count')
        .eq('id', user.id)
        .single();

      const count = userData?.successful_withdrawals_count || 0;
      setWithdrawalCount(count);

      // Get max withdrawal amount from database function
      const { data: maxAmount, error: maxError } = await supabase
        .rpc('get_max_withdrawal_amount', { p_user_id: user.id });

      if (!maxError && maxAmount) {
        setMaxWithdrawalPoints(maxAmount);
      }

      setCanWithdraw(true);
    } catch (error) {
      console.error('Error checking eligibility:', error);
      // Default to allowing withdrawal if check fails
      setCanWithdraw(true);
    } finally {
      setEligibilityChecking(false);
    }
  };

  const prefillUserData = async () => {
    if (!user) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('email, phone')
        .eq('id', user.id)
        .single();

      if (userData) {
        setEmail(userData.email || '');
        setPhoneNumber(userData.phone || '');
      }
    } catch (error) {
      console.log('Could not prefill user data:', error);
    }
  };

  const resetForm = () => {
    setPointsToWithdraw('');
    setWithdrawalMethod('bank');
    setSelectedCurrency('NGN');
    setAccountName('');
    setAccountNumber('');
    setBankName('');
    setCountry('Nigeria');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to request a withdrawal');
      return;
    }

    // Check eligibility
    if (!canWithdraw) {
      toast.error(`You can request another withdrawal on ${nextWithdrawalDate}`);
      return;
    }

    // Validation
    if (points < MIN_WITHDRAWAL_POINTS) {
      toast.error(`Minimum withdrawal is ${MIN_WITHDRAWAL_POINTS.toLocaleString()} points`);
      return;
    }

    // Check progressive withdrawal limit
    if (points > maxWithdrawalPoints) {
      const withdrawalNumber = withdrawalCount + 1;
      const ngnAmount = (maxWithdrawalPoints * POINTS_TO_NGN).toLocaleString();
      toast.error(`Withdrawal #${withdrawalNumber} is limited to ${maxWithdrawalPoints.toLocaleString()} points (₦${ngnAmount})`);
      return;
    }

    if (points > currentBalance) {
      toast.error('Insufficient points balance');
      return;
    }

    if (!phoneNumber.trim() || !email.trim() || !accountName.trim() || !accountNumber.trim() || !country.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (withdrawalMethod === 'bank' && !bankName.trim()) {
      toast.error('Please enter your bank name');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare account details
      const accountDetails: any = {
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        country: country.trim(),
        currency: selectedCurrency
      };

      if (withdrawalMethod === 'bank') {
        accountDetails.bankName = bankName.trim();
      }

      // Create withdrawal request
      const { error } = await supabase
        .from('wallet_withdrawals')
        .insert({
          user_id: user.id,
          amount: parseFloat(currencyAmount),
          currency: selectedCurrency,
          withdrawal_method: withdrawalMethod,
          bank_name: withdrawalMethod === 'bank' ? bankName.trim() : null,
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
          user_notes: notes.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Withdrawal request submitted successfully! You will be notified once processed.');
      resetForm();
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bank':
        return <CreditCard className="w-4 h-4" />;
      case 'opay':
        return <Wallet className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Request Withdrawal
          </DialogTitle>
        </DialogHeader>

        {eligibilityChecking ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
            <p className="text-gray-600">Checking eligibility...</p>
          </div>
        ) : !canWithdraw ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Withdrawal Not Available</h3>
            <p className="text-gray-600 mb-4">
              {ineligibilityReason || 'You are not eligible for withdrawal at this time'}
            </p>
            {!hasActiveMembership ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Upgrade to Pro to unlock withdrawal features and start earning real money!
                </p>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/subscription');
                  }}
                  className="mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </>
            ) : nextWithdrawalDate ? (
              <p className="text-sm text-gray-500">
                Withdrawals are allowed once every {WITHDRAWAL_FREQUENCY_DAYS} days
              </p>
            ) : null}
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="mt-4"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Balance */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-purple-600">{currentBalance.toLocaleString()} points</p>
              <p className="text-xs text-gray-500 mt-1">
                = {(currentBalance * POINTS_TO_NGN).toLocaleString()} NGN • Minimum: {MIN_WITHDRAWAL_POINTS.toLocaleString()} points
              </p>
            </div>

            {/* Points to Withdraw */}
            <div>
              <Label htmlFor="points">Points to Withdraw *</Label>
              <Input
                id="points"
                type="number"
                min={MIN_WITHDRAWAL_POINTS}
                max={Math.min(currentBalance, maxWithdrawalPoints)}
                value={pointsToWithdraw}
                onChange={(e) => setPointsToWithdraw(e.target.value)}
                placeholder={`Enter points (min ${MIN_WITHDRAWAL_POINTS.toLocaleString()})`}
                required
                className="mt-1"
              />
              {maxWithdrawalPoints < 999999999 && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Withdrawal #{withdrawalCount + 1} limit: {maxWithdrawalPoints.toLocaleString()} points (₦{(maxWithdrawalPoints * POINTS_TO_NGN).toLocaleString()})
                </p>
              )}
            </div>

            {/* Currency Selection */}
            <div>
              <Label>Select Currency *</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {(['NGN', 'USD', 'EUR', 'GBP'] as const).map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => setSelectedCurrency(currency)}
                    disabled={loadingRates && currency !== 'NGN'}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      selectedCurrency === currency
                        ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold'
                        : 'border-gray-200 hover:border-purple-300'
                    } ${loadingRates && currency !== 'NGN' ? 'opacity-50' : ''}`}
                  >
                    {currency}
                  </button>
                ))}
              </div>
              {points >= MIN_WITHDRAWAL_POINTS && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-700">
                    {points.toLocaleString()} points = {currencyAmount} {selectedCurrency}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Rate: 10 points = 1 NGN
                    {selectedCurrency !== 'NGN' && exchangeRates && ` → ${selectedCurrency}`}
                  </p>
                </div>
              )}
            </div>

            {/* Withdrawal Method */}
            <div>
              <Label>Withdrawal Method *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { value: 'bank', label: 'Bank Transfer' },
                  { value: 'opay', label: 'Opay' }
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setWithdrawalMethod(method.value as 'bank' | 'opay')}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      withdrawalMethod === method.value
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {getMethodIcon(method.value)}
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-700">Personal Information</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+234 XXX XXX XXXX"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Enter your country"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-700">
                {withdrawalMethod === 'bank' ? 'Bank Account Details' : 'Opay Account Details'}
              </h4>

              <div>
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Full name on account"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  required
                  className="mt-1"
                />
              </div>

              {withdrawalMethod === 'bank' && (
                <div>
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., GTBank, Access Bank, UBA"
                    required
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || points < MIN_WITHDRAWAL_POINTS || points > currentBalance || !canWithdraw}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>

            <div className="text-xs text-gray-500 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-800 mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Withdrawals are processed manually within 3-5 business days</li>
                <li>You can request a withdrawal once every {WITHDRAWAL_FREQUENCY_DAYS} days</li>
                <li>Minimum withdrawal: {MIN_WITHDRAWAL_POINTS.toLocaleString()} points (= {(MIN_WITHDRAWAL_POINTS * POINTS_TO_NGN).toLocaleString()} NGN)</li>
                <li>Conversion rate: 10 points = 1 NGN</li>
                <li>You'll be notified via email once your request is processed</li>
              </ul>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
