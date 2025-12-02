import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { formatPrice, calculateDiscount } from '../utils/formatting';
import { Heart, ShoppingCart, ArrowLeft, Zap } from 'lucide-react';

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  product?: Product;
  added_at: string;
}

export const Wishlist: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadWishlist();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadWishlist = async () => {
    try {
      const { data } = await supabase
        .from('wishlists')
        .select('*, products(*)')
        .eq('user_id', user?.id)
        .order('added_at', { ascending: false });

      if (data) {
        setItems(data as WishlistItem[]);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase.from('wishlists').delete().eq('id', itemId);
      if (error) throw error;
      setItems(items.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(product, 1);
      alert('Added to cart!');
    } catch {
      alert('Please sign in to add items to cart');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to view your wishlist</p>
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <Link to="/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-5 h-5" /> Continue Shopping
          </Link>
          <div className="text-center">
            <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Wishlist is Empty</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Add items to your wishlist to save them for later
            </p>
            <Link to="/products" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
              Explore Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Link to="/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-5 h-5" /> Back to Products
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Wishlist ({items.length})</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            if (!item.product) return null;
            const product = item.product;
            const discount = product.discount_price
              ? calculateDiscount(product.price, product.discount_price)
              : 0;
            const displayPrice = product.discount_price || product.price;

            return (
              <div
                key={item.id}
                className="group bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition duration-300"
              >
                <div className="relative bg-gray-300 dark:bg-gray-700 h-48 overflow-hidden">
                  {product.is_flash_sale && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 z-10">
                      <Zap className="w-4 h-4" /> Flash
                    </div>
                  )}
                  {discount > 0 && !product.is_flash_sale && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {discount}%
                    </div>
                  )}
                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600" />
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600">
                    {product.name}
                  </h3>

                  <div className="mt-4">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatPrice(displayPrice)}
                    </div>
                    {product.discount_price && (
                      <div className="text-sm text-gray-500 line-through">
                        {formatPrice(product.price)}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};