import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Order, OrderItem } from '../types';
import { formatPrice, formatDate } from '../utils/formatting';
import { CheckCircle, Download } from 'lucide-react';

export const OrderSuccess: React.FC = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (orderData) {
        setOrder(orderData);

        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*, products(*)')
          .eq('order_id', orderId);

        if (itemsData) {
          setOrderItems(itemsData);
        }
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Order not found</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Message */}
        <div className="text-center mb-8">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Thank you for your purchase. We're preparing your order.
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg mb-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Number</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white font-mono break-all">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Date</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Status</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 capitalize">
                {order.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(order.total)}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Items</h2>
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {item.product?.name || 'Product'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Quantity: {item.quantity} × {formatPrice(item.price_at_purchase)}
                    </p>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatPrice(item.price_at_purchase * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6 space-y-2 text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (18%)</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{order.shipping_cost === 0 ? 'FREE' : formatPrice(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-4">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-300">
            <li>✓ You'll receive an email confirmation with your order details</li>
            <li>✓ Your order will be dispatched within 2-3 business days</li>
            <li>✓ You'll receive a tracking number via email once it ships</li>
            <li>✓ Expected delivery: 5-7 business days</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition">
            <Download className="w-5 h-5" /> Download Invoice
          </button>
          <Link
            to="/products"
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};