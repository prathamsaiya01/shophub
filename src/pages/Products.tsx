import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { formatPrice, calculateDiscount } from '../utils/formatting';
import { ShoppingCart, Filter, Zap, X, Search, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../state/WishlistContext.tsx';

type ProductWithImages = Product & {
  product_images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    is_primary: boolean;
  }[];
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

export const Products: React.FC = () => {
  const [allProducts, setAllProducts] = useState<ProductWithImages[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithImages[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const location = useLocation();

  // pick search from ?search= in URL (from Navigation search bar)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') || '';
    setSearchQuery(q);
  }, [location.search]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, priceRange, sortBy, allProducts]);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, product_images(*)'),
        supabase.from('categories').select('id, name, slug'),
      ]);

      if (productsRes.data) {
        const products = productsRes.data as ProductWithImages[];
        setAllProducts(products);
        setFilteredProducts(products);
      }
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allProducts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    filtered = filtered.filter((p) => {
      const price = p.discount_price || p.price;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    if (sortBy === 'price-low') {
      filtered.sort(
        (a, b) => (a.discount_price || a.price) - (b.discount_price || b.price)
      );
    } else if (sortBy === 'price-high') {
      filtered.sort(
        (a, b) => (b.discount_price || b.price) - (a.discount_price || a.price)
      );
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'newest') {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = async (
    product: ProductWithImages,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            All Products
          </h1>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters */}
          <div
            className={`${
              showFilters ? 'block' : 'hidden'
            } md:block w-full md:w-64 bg-gray-50 dark:bg-gray-800 rounded-lg p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5" /> Filters
              </h2>
              <button
                onClick={() => setShowFilters(false)}
                className="md:hidden text-gray-600 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Category
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    !selectedCategory
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded transition ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Price Range
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([
                        parseInt(e.target.value) || 0,
                        priceRange[1],
                      ])
                    }
                    className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([
                        priceRange[0],
                        parseInt(e.target.value) || priceRange[1],
                      ])
                    }
                    className="w-1/2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {/* Sort */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Sort By
              </h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <button
              onClick={() => setShowFilters(true)}
              className="md:hidden mb-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              <Filter className="w-5 h-5" /> Show Filters
            </button>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-200 dark:bg-gray-700 h-80 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const discount = product.discount_price
                    ? calculateDiscount(product.price, product.discount_price)
                    : 0;
                  const displayPrice = product.discount_price || product.price;
                  const primaryImage = getPrimaryImage(product);
                  const wishlisted = isInWishlist(product.id);

                  return (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug}`}
                      className="group bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition duration-300"
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

                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatPrice(displayPrice)}
                            </div>
                            {product.discount_price && (
                              <div className="text-sm text-gray-500 line-through">
                                {formatPrice(product.price)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Cart button */}
                            <button
                              onClick={(e) => handleAddToCart(product, e)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                            >
                              <ShoppingCart className="w-5 h-5" />
                            </button>

                            {/* Wishlist heart */}
                            <button
                              type="button"
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

                        {product.stock_quantity < 5 && product.stock_quantity > 0 && (
                          <div className="mt-2 text-xs font-bold text-red-600">
                            Only {product.stock_quantity} left!
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  No products found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
