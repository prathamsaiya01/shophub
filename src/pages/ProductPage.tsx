import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Product, ProductImage, Review, PriceAlert } from '../types';
import { formatPrice } from '../utils/formatting';
import { Loader2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useWishlist } from '../state/WishlistContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

const ProductPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user, isAuthenticated } = useAuth();

  // review form
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // price alert state
  const [priceAlert, setPriceAlert] = useState<PriceAlert | null>(null);
  const [alertPriceInput, setAlertPriceInput] = useState<string>('');
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchProductAndExtras = async () => {
      setLoading(true);
      setError(null);

      // 1) product + images
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          *,
          product_images (*)
        `
        )
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.error(error);
        setError('Product not found');
        setLoading(false);
        return;
      }

      const dbProduct = data as any;

      const images: ProductImage[] = (dbProduct.product_images ?? []) as ProductImage[];
      const primary_image =
        images.find((img) => img.is_primary) ?? images[0] ?? undefined;

      const normalisedProduct: Product = {
        ...dbProduct,
        images,
        primary_image,
      };

      setProduct(normalisedProduct);

      // 2) reviews
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', dbProduct.id)
        .order('created_at', { ascending: false });

      if (reviewError) {
        console.error(reviewError);
      } else if (reviewData) {
        setReviews(reviewData as Review[]);
      }

      // 3) existing price alert for this user+product
      if (isAuthenticated && user) {
        const { data: alertsData, error: alertsError } = await supabase
          .from('price_alerts')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', dbProduct.id);

        if (!alertsError && alertsData && alertsData.length > 0) {
          const alert = alertsData[0] as PriceAlert;
          setPriceAlert(alert);
          setAlertPriceInput(alert.target_price.toString());
        } else {
          setPriceAlert(null);
          setAlertPriceInput('');
        }
      } else {
        setPriceAlert(null);
        setAlertPriceInput('');
      }

      setLoading(false);
    };

    fetchProductAndExtras();
  }, [slug, isAuthenticated, user?.id]);

  const refreshReviewsAndRating = async (productId: string) => {
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (reviewError || !reviewData) {
      console.error(reviewError);
      return;
    }

    const typedReviews = reviewData as Review[];
    setReviews(typedReviews);

    const reviewCount = typedReviews.length;
    const avgRating =
      reviewCount === 0
        ? 0
        : typedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

    const { error: updateError } = await supabase
      .from('products')
      .update({
        rating: avgRating,
        review_count: reviewCount,
      })
      .eq('id', productId);

    if (updateError) {
      console.error(updateError);
    }

    setProduct((prev) =>
      prev
        ? {
            ...prev,
            rating: avgRating,
            review_count: reviewCount,
          }
        : prev
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!product) return;

    if (!isAuthenticated || !user) {
      setSubmitError('Please sign in to write a review.');
      return;
    }

    if (ratingInput < 1 || ratingInput > 5) {
      setSubmitError('Rating must be between 1 and 5.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        product_id: product.id,
        user_id: user.id,
        rating: ratingInput,
        title: titleInput || null,
        comment: commentInput || null,
        verified_purchase: false,
        helpful_count: 0,
      });

      if (error) {
        console.error(error);
        setSubmitError('Could not submit review. Please try again.');
      } else {
        setSubmitSuccess('Thank you! Your review has been submitted.');
        setTitleInput('');
        setCommentInput('');
        setRatingInput(5);

        await refreshReviewsAndRating(product.id);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePriceAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertError(null);
    setAlertMessage(null);

    if (!product) return;
    if (!isAuthenticated || !user) {
      setAlertError('Please sign in to set a price alert.');
      return;
    }

    const target = Number(alertPriceInput);
    if (!target || target <= 0) {
      setAlertError('Enter a valid target price.');
      return;
    }

    setSavingAlert(true);
    try {
      let result;
      if (priceAlert) {
        result = await supabase
          .from('price_alerts')
          .update({
            target_price: target,
            is_active: true,
            alert_sent: false,
          })
          .eq('id', priceAlert.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('price_alerts')
          .insert({
            user_id: user.id,
            product_id: product.id,
            target_price: target,
            is_active: true,
            alert_sent: false,
          })
          .select()
          .single();
      }

      const { data, error } = result;
      if (error || !data) {
        console.error(error);
        setAlertError('Could not save alert. Please try again.');
      } else {
        setPriceAlert(data as PriceAlert);
        setAlertMessage('Price alert saved!');
      }
    } finally {
      setSavingAlert(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center text-sm text-blue-600 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to home
        </Link>
        <p className="text-red-500">{error ?? 'Product not found'}</p>
      </div>
    );
  }

  const primaryImage = product.primary_image ?? product.images?.[0];
  const isWishlisted = isInWishlist(product.id);

  const effectivePrice = product.discount_price ?? product.price;
  const hasDiscount =
    product.discount_price !== undefined &&
    product.discount_price < product.price;

  const averageRating = product.rating;
  const reviewCount = product.review_count || reviews.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center text-sm text-blue-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to home
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {/* LEFT: IMAGE */}
        <div className="border rounded-xl p-4 flex items-center justify-center bg-white">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={primaryImage.alt_text ?? product.name}
              className="max-h-[360px] object-contain"
            />
          ) : (
            <div className="h-[280px] w-full flex items-center justify-center text-gray-400 text-sm">
              No image available
            </div>
          )}
        </div>

        {/* RIGHT: DETAILS */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">{product.name}</h1>

          {/* Rating + review count */}
          {averageRating > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <span className="font-semibold">{averageRating.toFixed(1)} ★</span>
              <span>•</span>
              <span>{reviewCount} ratings</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-2xl font-bold">
              {formatPrice(effectivePrice)}
            </span>
            {hasDiscount && (
              <>
                <span className="line-through text-gray-500 text-sm">
                  {formatPrice(product.price)}
                </span>
                <span className="text-green-600 text-sm font-semibold">
                  {Math.round(
                    ((product.price - (product.discount_price ?? product.price)) /
                      product.price) *
                      100
                  )}
                  % off
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <p className="mb-4 text-sm text-gray-700">
            {product.stock_quantity > 10
              ? 'In stock'
              : product.stock_quantity > 0
              ? `Only ${product.stock_quantity} left in stock!`
              : 'Out of stock'}
          </p>

          {/* Short description */}
          {product.short_description && (
            <p className="mb-4 text-gray-700">{product.short_description}</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to cart
            </button>

            <button
              onClick={() => toggleWishlist(product.id)}
              className={`inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium ${
                isWishlisted
                  ? 'border-red-500 text-red-500 bg-red-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            </button>
          </div>

          {/* Price alert box */}
          <div className="mb-6 border rounded-lg p-3 bg-blue-50/70">
            <h3 className="text-sm font-semibold mb-2">Set a price alert</h3>
            <p className="text-xs text-gray-600 mb-2">
              Current price: <span className="font-semibold">{formatPrice(effectivePrice)}</span>
            </p>

            {!isAuthenticated && (
              <p className="text-xs text-gray-600 mb-2">
                Sign in to get notified when the price drops.
              </p>
            )}

            <form onSubmit={handleSavePriceAlert} className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                value={alertPriceInput}
                onChange={(e) => setAlertPriceInput(e.target.value)}
                placeholder={
                  priceAlert
                    ? 'Target price'
                    : Math.max(Math.floor(effectivePrice * 0.9), 1).toString()
                }
                className="w-32 px-2 py-1 border rounded text-sm"
              />
              <button
                type="submit"
                disabled={savingAlert || !isAuthenticated}
                className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {savingAlert ? 'Saving...' : priceAlert ? 'Update alert' : 'Create alert'}
              </button>
            </form>

            {alertError && (
              <p className="text-[11px] text-red-500 mt-1">{alertError}</p>
            )}
            {alertMessage && (
              <p className="text-[11px] text-green-600 mt-1">{alertMessage}</p>
            )}

            {priceAlert && (
              <p className="text-[11px] text-gray-500 mt-1">
                Alert active at {formatPrice(priceAlert.target_price)}.
              </p>
            )}
          </div>

          {/* Full description */}
          {product.description && (
            <div className="border-t pt-4 mt-4">
              <h2 className="font-semibold mb-2">Product description</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews + Write review */}
      <div className="mt-10 border-t pt-6 grid gap-8 md:grid-cols-[2fr,1.2fr]">
        {/* Reviews list */}
        <div>
          <h2 className="font-semibold mb-3 text-lg">Customer reviews</h2>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">User</span>
                    <span className="text-xs text-yellow-600 font-semibold">
                      {review.rating} ★
                    </span>
                  </div>
                  {review.title && (
                    <p className="text-sm font-semibold mb-1">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-sm text-gray-700">{review.comment}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                    {review.verified_purchase && (
                      <span className="text-[11px] text-green-600 font-semibold">
                        Verified purchase
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No reviews yet.</p>
          )}
        </div>

        {/* Write a review */}
        <div className="border rounded-lg p-4 bg-gray-50/70 dark:bg-gray-800/40">
          <h3 className="font-semibold mb-3 text-md">Write a review</h3>

          {!isAuthenticated && (
            <p className="text-xs text-gray-600 mb-3">
              Please sign in to write a review.
            </p>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-3 text-sm">
            <div>
              <label className="block mb-1 font-medium">Rating</label>
              <select
                value={ratingInput}
                onChange={(e) => setRatingInput(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} ★
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Title (optional)</label>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Great product!"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Comment (optional)</label>
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
                placeholder="Share your experience..."
              />
            </div>

            {submitError && (
              <p className="text-xs text-red-500">{submitError}</p>
            )}
            {submitSuccess && (
              <p className="text-xs text-green-600">{submitSuccess}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !isAuthenticated}
              className="w-full mt-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit review'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
