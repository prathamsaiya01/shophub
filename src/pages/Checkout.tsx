import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { Address } from '../types';
import { formatPrice } from '../utils/formatting';
import { MapPin, Plus, CreditCard, AlertCircle } from 'lucide-react';
import { loadRazorpayScript } from '../services/razorpay';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');

  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    type: 'home',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadAddresses();
  }, [user, navigate]);

  const loadAddresses = async () => {
    try {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user?.id);
      if (data) {
        setAddresses(data as Address[]);
        if (data.length > 0) {
          const def =
            data.find((a) => (a as Address).is_default)?.id || data[0].id;
          setSelectedAddressId(def);
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: err } = await supabase
        .from('addresses')
        .insert([
          {
            user_id: user?.id,
            ...formData,
            country: 'India',
          },
        ])
        .select();

      if (err) throw err;

      if (data) {
        const newAddresses = data as Address[];
        setAddresses([...addresses, ...newAddresses]);
        setSelectedAddressId(newAddresses[0].id);
        setFormData({
          street: '',
          city: '',
          state: '',
          postal_code: '',
          phone: '',
          type: 'home',
        });
        setShowAddressForm(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to add address'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
  if (!selectedAddressId) {
    setError('Please select a delivery address');
    return;
  }

  if (items.length === 0) {
    setError('Your cart is empty');
    return;
  }

  if (!RAZORPAY_KEY_ID) {
    setError('Razorpay key is not configured');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // 1️⃣ Load Razorpay JS
    const ok = await loadRazorpayScript();
    if (!ok) {
      setError('Failed to load Razorpay. Check your internet connection.');
      setLoading(false);
      return;
    }

    const tax = total * 0.18;
    const shipping = total > 500 ? 0 : 50;
    const finalTotal = total + tax + shipping;

    // 2️⃣ Configure Razorpay checkout options
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: Math.round(finalTotal * 100), // in paise
      currency: 'INR',
      name: 'ShopHub',
      description: 'Order payment',
      handler: async (response: any) => {
        // ✅ Payment success – now create order in Supabase
        try {
          const { razorpay_payment_id } = response;

          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert([
              {
                user_id: user?.id,
                address_id: selectedAddressId,
                status: 'confirmed',
                payment_method: paymentMethod,
                payment_status: 'completed',
                payment_id: razorpay_payment_id,
                subtotal: total,
                tax,
                shipping_cost: shipping,
                total: finalTotal,
              },
            ])
            .select();

          if (orderError) throw orderError;

          if (orderData && orderData.length > 0) {
            const orderId = orderData[0].id;

            const orderItems = items.map((item) => ({
              order_id: orderId,
              product_id: item.product_id,
              quantity: item.quantity,
              price_at_purchase:
                item.product?.discount_price || item.product?.price || 0,
            }));

            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItems);

            if (itemsError) throw itemsError;

            await clearCart();
            navigate(`/order-success/${orderId}`);
          }
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : 'Payment succeeded but order saving failed'
          );
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: user?.email?.split('@')[0] || 'Customer',
        email: user?.email || '',
        contact: addresses.find((a) => a.id === selectedAddressId)?.phone || '',
      },
      theme: {
        color: '#2563eb',
      },
      modal: {
        ondismiss: () => {
          // user closed popup without paying
          setLoading(false);
        },
      },
      method: {
        card: true,
        upi: true,
        netbanking: true,
      },
    };

    // 3️⃣ Open Razorpay checkout
    const rzp = new (window as any).Razorpay(options);

    rzp.on('payment.failed', (resp: any) => {
      console.error('Payment failed', resp.error);
      setError('Payment failed. Please try again.');
      setLoading(false);
    });

    rzp.open();
  } catch (err) {
    console.error(err);
    setError(
      err instanceof Error ? err.message : 'Failed to process payment'
    );
    setLoading(false);
  }
};


  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your cart is empty
          </p>
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const tax = total * 0.18;
  const shipping = total > 500 ? 0 : 50;
  const finalTotal = total + tax + shipping;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Checkout
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Delivery Address
              </h2>

              {addresses.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition"
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {address.type.charAt(0).toUpperCase() +
                            address.type.slice(1)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          {address.street}, {address.city}, {address.state}{' '}
                          {address.postal_code}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Phone: {address.phone}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}

              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Plus className="w-5 h-5" /> Add New Address
              </button>

              {showAddressForm && (
                <form
                  onSubmit={handleAddAddress}
                  className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData({ ...formData, street: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postal_code: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg"
                  >
                    {loading ? 'Adding...' : 'Add Address'}
                  </button>
                </form>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Payment Method
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as 'card' | 'upi')
                    }
                  />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Debit / Credit Card
                  </span>
                </label>
                <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition">
                  <input
                    type="radio"
                    name="payment"
                    value="upi"
                    checked={paymentMethod === 'upi'}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as 'card' | 'upi')
                    }
                  />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    UPI
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>
                      {item.product?.name || 'Product'} x{item.quantity}
                    </span>
                    <span>
                      {formatPrice(
                        (item.product?.discount_price ||
                          item.product?.price ||
                          0) * item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-gray-700 dark:text-gray-300 mb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>

              <button
  onClick={handlePlaceOrder}
  disabled={loading || !selectedAddressId}
  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
>
  {loading ? 'Processing...' : 'Place Order'}
</button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
