import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Product } from '../types';
import { formatPrice, calculateDiscount } from '../utils/formatting';
import { ShoppingCart, Heart, Zap, MessageCircle, X, Send } from 'lucide-react';
import { useCart } from '../context/CartContext';

type ProductWithImages = Product & {
  product_images?: {
    id: string;
    image_url: string;
    alt_text?: string;
    is_primary: boolean;
  }[];
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export const Home: React.FC = () => {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // AI assistant state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hi! 👋 I can help you find the right product. Try: "show hoodies under 1000" or "gifts for developers".',
    },
  ]);
  const [aiInput, setAiInput] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .limit(12);

      if (data) {
        setProducts(data as ProductWithImages[]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: ProductWithImages) => {
    try {
      await addToCart(product, 1);
      alert('Added to cart!');
    } catch (error) {
      alert('Please sign in to add items to cart');
    }
  };

  const getPrimaryImage = (product: ProductWithImages) => {
    const imgs = product.product_images || [];
    return (
      imgs.find((img) => img.is_primary) ||
      imgs[0] ||
      null
    );
  };

  // very simple "AI" – recommends products based on keywords and price words
  const handleAiSend = () => {
    const query = aiInput.trim();
    if (!query) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', text: query },
    ];
    setMessages(newMessages);
    setAiInput('');

    const reply = buildAiReply(query);
    setMessages([...newMessages, reply]);
  };

  const buildAiReply = (query: string): ChatMessage => {
    const q = query.toLowerCase();

    // try to detect budget like "under 1000"
    let maxPrice: number | undefined;
    const matchUnder = q.match(/under\s+(\d{2,5})/);
    if (matchUnder) {
      maxPrice = parseInt(matchUnder[1], 10);
    }

    const words = q.split(/\s+/).filter((w) => w.length > 2);

    const scored = products
      .map((p) => {
        const text =
          `${p.name} ${p.description ?? ''} ${p.short_description ?? ''}`.toLowerCase();

        let score = 0;
        words.forEach((w) => {
          if (text.includes(w)) score += 2;
        });
        if (p.is_flash_sale) score += 1;
        if (p.rating >= 4) score += 1;

        const price = p.discount_price || p.price;
        if (maxPrice && price <= maxPrice) score += 1;
        if (maxPrice && price > maxPrice) score -= 1;

        return { product: p, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return {
        role: 'assistant',
        text:
          "I couldn't find an exact match, but you can try searching on the Products page or tell me the type of item (like 'hoodie', 'mug', 't-shirt').",
      };
    }

    const lines = scored.map(({ product }) => {
      const price = product.discount_price || product.price;
      return `• ${product.name} — around ${formatPrice(price)}`;
    });

    const intro = maxPrice
      ? `Here are some picks within your budget:`
      : `Here are some products you might like:`;

    return {
      role: 'assistant',
      text: `${intro}\n${lines.join('\n')}\n\nYou can tap them on the home or products page to view details.`,
    };
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Welcome to ShopHub</h1>
          <p className="text-xl text-blue-100 mb-8">
            Discover amazing products at unbeatable prices
          </p>
          <Link
            to="/products"
            className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition"
          >
            Start Shopping
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Featured Products
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 dark:bg-gray-700 h-80 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const discount = product.discount_price
                ? calculateDiscount(product.price, product.discount_price)
                : 0;
              const displayPrice = product.discount_price || product.price;
              const primaryImage = getPrimaryImage(product);

              return (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition duration-300"
                >
                  <div className="relative bg-gray-300 dark:bg-gray-700 h-48 overflow-hidden">
                    {product.is_flash_sale && (
                      <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 z-10">
                        <Zap className="w-4 h-4" /> Flash Sale
                      </div>
                    )}
                    {discount > 0 && !product.is_flash_sale && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {discount}% OFF
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
                    <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
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
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product);
                          }}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                          className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition"
                        >
                          <Heart className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {product.stock_quantity < 5 && product.stock_quantity > 0 && (
                      <div className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                        Only {product.stock_quantity} left! Selling fast
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* AI Assistant Floating Widget */}
      <button
        onClick={() => setAssistantOpen((v) => !v)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white shadow-lg md:right-10 md:bottom-10"
      >
        {assistantOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {assistantOpen && (
        <div className="fixed bottom-24 right-4 md:right-10 md:bottom-24 w-80 max-h-[70vh] bg-white dark:bg-gray-800 shadow-2xl rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Smart Shopping Assistant
              </span>
            </div>
          </div>

          <div className="flex-1 px-3 py-2 overflow-y-auto text-sm space-y-2">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-xl whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAiSend();
            }}
            className="border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 px-2 py-2"
          >
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask: 'hoodie under 1000'..."
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
