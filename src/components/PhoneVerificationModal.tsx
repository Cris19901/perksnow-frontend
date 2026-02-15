// ============================================================================
// FILE 4 of 4: src/components/PhoneVerificationModal.tsx
// PURPOSE: Modal that handles the complete phone verification flow
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PhoneOTPVerification from './PhoneOTPVerification';

interface PhoneVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export default function PhoneVerificationModal({
  open,
  onClose,
  onVerified,
}: PhoneVerificationModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'info' | 'otp' | 'success'>('info');
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchUserData();
    }
  }, [open, user]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('phone_number, phone_verified, has_ever_subscribed')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user information');
    }
  };

  const handleStartVerification = () => {
    setStep('otp');
  };

  const handleOTPVerified = async (otpId: string) => {
    try {
      setLoading(true);

      // Mark phone as verified in database
      const { data, error } = await supabase
        .rpc('mark_phone_verified', {
          p_user_id: user?.id,
        });

      if (error) throw error;

      if (data) {
        setStep('success');
        setTimeout(() => {
          onVerified();
        }, 2000);
      } else {
        throw new Error('Failed to mark phone as verified');
      }
    } catch (error: any) {
      console.error('Error marking phone verified:', error);
      toast.error('Failed to complete verification');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        {step === 'info' && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Your Phone Number</DialogTitle>
              <DialogDescription>
                Phone verification is required to unlock point earning
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important Security Requirement:</strong><br />
                  To prevent fraud and ensure fair earning, all users must verify their phone number.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Requirements to Earn Points:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 
                      className={`w-4 h-4 ${userData.has_ever_subscribed ? 'text-green-600' : 'text-gray-400'}`} 
                    />
                    <span className={userData.has_ever_subscribed ? 'text-green-600 font-medium' : ''}>
                      Subscribe to a paid plan
                      {userData.has_ever_subscribed && ' ✓'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-400" />
                    <span>Verify phone number</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Your Phone:</strong> {userData.phone_number}
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  We'll send a 6-digit verification code via SMS to this number.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Later
                </button>
                <button
                  onClick={handleStartVerification}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Verify Now
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'otp' && (
          <PhoneOTPVerification
            phoneNumber={userData.phone_number}
            purpose="phone_verification"
            onVerified={handleOTPVerified}
            onCancel={() => setStep('info')}
          />
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold">Phone Verified!</h3>
            <p className="text-muted-foreground">
              You can now earn points on LavLay!
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}