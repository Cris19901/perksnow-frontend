// ============================================================================
// FILE: src/components/PhoneVerificationBanner.tsx
// FIXED: Only shows when user is logged in + inline styles
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
    // Only check if user is logged in
    if (user) {
      checkVerificationStatus();
    } else {
      // Not logged in - hide banner
      setLoading(false);
      setNeedsVerification(false);
    }
  }, [user]);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .rpc('needs_phone_verification', {
          p_user_id: user?.id,
        });

      if (error) throw error;

      setNeedsVerification(data === true);
    } catch (error) {
      console.error('Error checking verification status:', error);
      setNeedsVerification(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = () => {
    setNeedsVerification(false);
    setShowModal(false);
    toast.success('Phone verified! You can now earn points.');
    window.location.reload();
  };

  // ❌ Don't show if:
  if (!user) return null;        // Not logged in
  if (loading) return null;      // Still checking
  if (dismissed) return null;    // User dismissed
  if (!needsVerification) return null; // Already verified

  return (
    <>
      {/* BRIGHT YELLOW BANNER - Inline styles so Tailwind purge can't remove them */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        borderBottom: '3px solid #b45309',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          {/* Icon + Text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle style={{ width: '20px', height: '20px', color: '#b45309' }} />
            </div>
            <div>
              <div style={{
                color: 'white',
                fontWeight: '800',
                fontSize: '15px',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                ⚠️ Phone Verification Required!
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.95)',
                fontSize: '13px',
              }}>
                Verify your phone number to unlock point earning
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: 'white',
                color: '#92400e',
                padding: '8px 18px',
                borderRadius: '8px',
                border: '2px solid #b45309',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                whiteSpace: 'nowrap',
              }}
            >
              <Smartphone style={{ width: '14px', height: '14px' }} />
              Verify Now
            </button>

            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Spacer so content isn't hidden behind banner */}
      <div style={{ height: '72px' }} />

      {/* Verification Modal */}
      <PhoneVerificationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onVerified={handleVerified}
      />
    </>
  );
}