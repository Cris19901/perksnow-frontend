import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Truck, Lock, Loader2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CartItem } from '../../App';

interface CheckoutPageProps {
  onNavigate?: (page: string) => void;
  cartItems?: CartItem[];
  onCartClick?: () => void;
}

const SHIPPING_FEE = 1500; // ₦1,500

export function CheckoutPage({ onNavigate, cartItems = [], onCartClick }: CheckoutPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: user?.email || '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + SHIPPING_FEE;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handlePlaceOrder = async () => {
    // Validate required fields
    const required = ['first_name', 'last_name', 'email', 'phone', 'street', 'city', 'state'];
    const missing = required.filter(f => !form[f as keyof typeof form].trim());
    if (missing.length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setSubmitting(true);

      // Step 1: Create the order record
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to continue');
        return;
      }

      const orderItems = cartItems.map(item => ({
        product_id: item.product_id,
        seller_id: item.seller_id,
        quantity: item.quantity,
        unit_price: item.price,
        name: item.name,
      }));

      const createOrderRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/marketplace-create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            items: orderItems,
            shipping_address: form,
            total_amount: total,
            currency: 'NGN',
          }),
        }
      );

      const orderData = await createOrderRes.json();
      if (!createOrderRes.ok || !orderData.status) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Step 2: Initialize Paystack payment
      const initRes = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: form.email,
          amount: total,
          reference: orderData.paystack_reference,
          callback_url: `${window.location.origin}/payment/callback`,
          metadata: {
            type: 'marketplace_order',
            order_id: orderData.order_id,
            buyer_name: `${form.first_name} ${form.last_name}`,
          },
        },
      });

      if (initRes.error || !initRes.data?.status) {
        throw new Error(initRes.data?.message || 'Failed to initialize payment');
      }

      // Step 3: Redirect to Paystack
      const authorizationUrl = initRes.data.data?.authorization_url;
      if (!authorizationUrl) throw new Error('No payment URL received');

      window.location.href = authorizationUrl;

    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onNavigate={onNavigate} onCartClick={onCartClick} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Button onClick={() => navigate('/marketplace')}>Browse Marketplace</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} />

      <div className="max-w-[1200px] mx-auto px-4 py-4 sm:py-6 pb-24">
        <h1 className="text-2xl sm:text-3xl mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left — Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" placeholder="John" value={form.first_name} onChange={set('first_name')} />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" placeholder="Doe" value={form.last_name} onChange={set('last_name')} />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="john@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" type="tel" placeholder="08012345678" value={form.phone} onChange={set('phone')} />
              </div>
              <div>
                <Label htmlFor="street">Street Address *</Label>
                <Input id="street" placeholder="123 Main Street" value={form.street} onChange={set('street')} />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" placeholder="Lagos" value={form.city} onChange={set('city')} />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input id="state" placeholder="Lagos" value={form.state} onChange={set('state')} />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP / Postal</Label>
                  <Input id="zip" placeholder="100001" value={form.zip} onChange={set('zip')} />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <Lock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>You'll be redirected to Paystack to complete your payment securely</span>
              </div>
            </CardContent>
          </Card>

          {/* Right — Order Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-[280px] overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.product_id} className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{item.name}</p>
                        <p className="text-xs text-gray-500">by {item.seller_name} · qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium flex-shrink-0">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span>₦{SHIPPING_FEE.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-xl text-purple-600">₦{total.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  size="lg"
                  disabled={submitting}
                  onClick={handlePlaceOrder}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ₦${total.toLocaleString()} via Paystack`
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  By placing your order, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
