// ============================================================================
// FILE 3 of 4: src/components/PhoneVerificationBanner.tsx
// PURPOSE: Persistent banner shown until phone is verified
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Smartphone, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import PhoneVerificationModal from './PhoneVerificationModal';

export default function PhoneVerificationBanner() {
  const { user } = useAuth();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
    }
  }, [user]);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);

      // Check if user needs phone verification
      const { data, error } = await supabase
        .rpc('needs_phone_verification', {
          p_user_id: user?.id,
        });

      if (error) throw error;

      setNeedsVerification(data === true);
    } catch (error) {
      console.error('Error checking verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = () => {
    setNeedsVerification(false);
    setShowModal(false);
    toast.success('Phone verified successfully! You can now earn points.');
    
    // Refresh page to update earning status
    window.location.reload();
  };

  // Don't show if:
  // - Still loading
  // - User dismissed it
  // - Doesn't need verification
  if (loading || dismissed || !needsVerification) {
    return null;
  }

  return (
    <>
      <Alert className="fixed top-0 left-0 right-0 z-50 rounded-none border-b bg-yellow-50 border-yellow-200">
        <div className="container mx-auto flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800 font-medium">
              <span className="font-bold">Phone verification required!</span>{' '}
              Verify your phone number to unlock point earning.
              {' '}
              <span className="text-xs text-yellow-700">
                (Required even with Pro subscription)
              </span>
            </AlertDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Verify Now
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-yellow-800 hover:text-yellow-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Alert>

      {/* Add padding to page content so banner doesn't overlap */}
      <div className="h-16" />

      <PhoneVerificationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onVerified={handleVerified}
      />
    </>
  );
}