// ======================
// Category
// ======================
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_name?: string;
  created_at: string;
}

// ======================
// Product Images
// ======================
export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order?: number;
  created_at: string;
}

// ======================
// Product
// ======================
export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;

  price: number;
  discount_price?: number;
  stock_quantity: number;

  rating: number;
  review_count: number;

  is_featured: boolean;
  is_flash_sale: boolean;

  tags?: string[];

  created_at: string;
  updated_at: string;

  // Front-end convenience fields
  images?: ProductImage[];
  primary_image?: ProductImage;

  // Optional: useful for joining reviews → ProductPage
  reviews?: Review[];
}

// ======================
// Cart
// ======================
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;

  product?: Product;
  product_images?: ProductImage[];

  quantity: number;
  added_at: string;
  updated_at: string;
}

// ======================
// Address
// ======================
export interface Address {
  id: string;
  user_id: string;
  type: 'shipping' | 'billing' | string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  created_at: string;
}

// ======================
// Orders
// ======================
export interface Order {
  id: string;
  user_id: string;
  address_id?: string;

  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

  payment_method?: 'cod' | 'stripe' | 'razorpay' | string;
  payment_status: 'pending' | 'completed' | 'failed';
  payment_id?: string;

  subtotal: number;
  tax: number;
  shipping_cost: number;
  total: number;
  notes?: string;

  created_at: string;
  updated_at: string;

  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;

  product?: Product;

  quantity: number;
  price_at_purchase: number;

  created_at: string;
}

// ======================
// Reviews
// ======================
export interface Review {
  id: string;
  product_id: string;
  user_id: string;

  rating: number;
  title?: string;
  comment?: string;

  verified_purchase: boolean;
  helpful_count: number;

  created_at: string;
}

// ======================
// Rewards
// ======================
export interface UserReward {
  id: string;
  user_id: string;
  total_points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  badges: string[];
  referral_code: string;
  referral_count: number;
  created_at: string;
}

// ======================
// Price Alerts
// ======================
export interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  is_active: boolean;
  alert_sent: boolean;
  created_at: string;
}

// ======================
// Flash Sale
// ======================
export interface FlashSale {
  id: string;
  product_id: string;

  discount_percentage: number;

  start_time: string;
  end_time: string;

  quantity_limit?: number;
  quantity_sold: number;

  is_active: boolean;
  created_at: string;
}

// ======================
// Auth User
// ======================
export interface AuthUser {
  id: string;
  email: string;

  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}
