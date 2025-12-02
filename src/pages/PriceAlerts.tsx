import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { formatPrice, formatDate } from '../utils/formatting';
import { Bell, Trash2, Plus } from 'lucide-react';

interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  target_price: number;
  is_active: boolean;
  alert_sent: boolean;
  created_at: string;
}

export const PriceAlerts: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ productId: '', targetPrice: '' });

  useEffect(() => {
    if (isAuthenticated) {
      loadAlerts();
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadAlerts = async () => {
    try {
      const { data } = await supabase
        .from('price_alerts')
        .select('*, products(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (data) {
        setAlerts(data as PriceAlert[]);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').limit(100);
      if (data) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('price_alerts').insert([
        {
          user_id: user?.id,
          product_id: formData.productId,
          target_price: parseFloat(formData.targetPrice),
        },
      ]);

      if (error) throw error;
      setFormData({ productId: '', targetPrice: '' });
      setShowForm(false);
      loadAlerts();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error creating alert');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase.from('price_alerts').delete().eq('id', alertId);
      if (error) throw error;
      setAlerts(alerts.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to manage price alerts</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="w-8 h-8" /> Price Alerts
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" /> New Alert
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddAlert} className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Price Alert</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({formatPrice(product.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Price
                </label>
                <input
                  type="number"
                  value={formData.targetPrice}
                  onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Enter target price"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Create Alert
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => {
              if (!alert.product) return null;
              const currentPrice = alert.product.discount_price || alert.product.price;
              const alertTriggered = currentPrice <= alert.target_price;

              return (
                <div
                  key={alert.id}
                  className={`p-6 rounded-lg border-2 ${
                    alertTriggered
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        {alert.product.name}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>Current Price: {formatPrice(currentPrice)}</p>
                        <p>Target Price: {formatPrice(alert.target_price)}</p>
                        <p>Created: {formatDate(alert.created_at)}</p>
                        {alertTriggered && (
                          <p className="text-green-600 dark:text-green-400 font-semibold">
                            Price target reached!
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No price alerts yet</p>
            <p className="text-gray-500 dark:text-gray-500 mt-2">Create one to get notified when prices drop</p>
          </div>
        )}
      </div>
    </div>
  );
};