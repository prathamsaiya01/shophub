import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { formatPrice } from '../utils/formatting';
import { useWishlist } from '../state/WishlistContext.tsx';
import { useCart } from '../context/CartContext';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  ShoppingCart,
  Heart,
} from 'lucide-react';

type ProductWithImages = Product & {
  product_images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    is_primary: boolean;
  }[];
};

export const Wishlist: React.FC = () => {
  const { wishlistIds, clearWishlist, isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (wishlistIds.length === 0) {
        setProducts([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .in('id', wishlistIds);

      if (!error && data) {
        setProducts(data as ProductWithImages[]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [wishlistIds]);

  const handleAddToCart = async (product: ProductWithImages) => {
    try {
      await addToCart(product, 1);
      alert('Added to cart!');
    } catch {
      alert('Please sign in to add items to cart');
    }
  };

  const getPrimaryImage = (product: ProductWithImages) => {
    const imgs = product.product_images || [];
    return imgs.find((img) => img.is_primary) || imgs[0] || null;
  };

  // 🩶 EMPTY STATE (matches your screenshot)
  const isEmpty = !loading && wishlistIds.length === 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link
              to="/products"
              className="inline-flex items-center text-sm text-blue-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Continue Shopping
            </Link>
          </div>

          {wishlistIds.length > 0 && (
            <button
              onClick={clearWishlist}
              className="inline-flex items-center text-sm text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear Wishlist
            </button>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          My Wishlist
        </h1>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : isEmpty ? (
          // ✅ Empty state UI
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
              Your Wishlist is Empty
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Add items to your wishlist to save them for later
            </p>
            <Link
              to="/products"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          // ✅ Wishlist products grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const primaryImage = getPrimaryImage(product);
              const displayPrice = product.discount_price || product.price;
              const wishlisted = isInWishlist(product.id);

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition"
                >
                  <div className="relative bg-gray-300 dark:bg-gray-700 h-48 overflow-hidden">
                    {primaryImage ? (
                      <img
                        src={primaryImage.image_url}
                        alt={primaryImage.alt_text || product.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600" />
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600">
                      {product.name}
                    </h3>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {product.short_description || product.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatPrice(displayPrice)}
                        </div>
                        {product.discount_price && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                            {formatPrice(product.price)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(product.id);
                          }}
                          className="p-2 rounded-lg border bg-white text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              wishlisted
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
