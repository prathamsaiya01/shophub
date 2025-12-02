/*
  # Add Sample Data for E-Commerce Platform
  
  1. Sample Categories
  2. Sample Products with pricing
  3. Flash Sales data
*/

INSERT INTO categories (name, slug, description, icon_name, display_order) VALUES
  ('Electronics', 'electronics', 'Electronic devices and gadgets', 'Zap', 1),
  ('Fashion', 'fashion', 'Clothing and accessories', 'Shirt', 2),
  ('Home & Kitchen', 'home-kitchen', 'Home appliances and kitchenware', 'Home', 3),
  ('Books', 'books', 'Physical and digital books', 'BookOpen', 4),
  ('Sports', 'sports', 'Sports equipment and gear', 'Activity', 5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (category_id, name, slug, description, short_description, price, discount_price, stock_quantity, sku, rating, review_count, is_featured, tags) VALUES
  ((SELECT id FROM categories WHERE slug = 'electronics'), 'Wireless Earbuds Pro', 'wireless-earbuds-pro', 'Premium noise-cancelling wireless earbuds with 30-hour battery life', 'High-quality audio, noise cancellation', 4999, 3499, 150, 'WEB-001', 4.5, 328, true, ARRAY['audio', 'wireless', 'tech']),
  ((SELECT id FROM categories WHERE slug = 'electronics'), 'Smart Watch Ultra', 'smart-watch-ultra', 'Advanced fitness tracking with AMOLED display and heart rate monitor', 'Fitness tracking, health monitoring', 14999, 9999, 85, 'SW-001', 4.3, 256, true, ARRAY['wearable', 'fitness', 'tech']),
  ((SELECT id FROM categories WHERE slug = 'fashion'), 'Premium Cotton T-Shirt', 'premium-cotton-tshirt', '100% organic cotton t-shirt with comfortable fit', 'Soft, breathable, eco-friendly', 899, 599, 200, 'TSH-001', 4.2, 412, true, ARRAY['clothing', 'casual']),
  ((SELECT id FROM categories WHERE slug = 'fashion'), 'Denim Jeans Classic', 'denim-jeans-classic', 'Timeless denim jeans with perfect fit and durability', 'Classic style, comfortable fit', 1999, 1499, 120, 'JNS-001', 4.1, 187, false, ARRAY['clothing', 'casual']),
  ((SELECT id FROM categories WHERE slug = 'home-kitchen'), 'Stainless Steel Cookware Set', 'stainless-steel-cookware', '12-piece premium cookware set for all your cooking needs', 'Durable, non-stick, dishwasher safe', 8999, 5999, 45, 'CKW-001', 4.4, 234, true, ARRAY['kitchen', 'cookware']),
  ((SELECT id FROM categories WHERE slug = 'home-kitchen'), 'Smart LED Bulb Set', 'smart-led-bulb-set', 'Wi-Fi enabled LED bulbs with 16 million color options', 'Energy efficient, voice control', 1299, 799, 200, 'LED-001', 4.0, 156, false, ARRAY['lighting', 'smart-home']),
  ((SELECT id FROM categories WHERE slug = 'books'), 'The Art of Problem Solving', 'art-problem-solving', 'Comprehensive guide to solving complex problems creatively', 'Self-help, personal development', 599, 399, 80, 'BK-001', 4.6, 523, true, ARRAY['books', 'self-help']),
  ((SELECT id FROM categories WHERE slug = 'books'), 'Digital Marketing Mastery', 'digital-marketing-mastery', 'Complete guide to modern digital marketing strategies', 'Business, marketing, education', 799, 549, 65, 'BK-002', 4.2, 178, false, ARRAY['books', 'business']),
  ((SELECT id FROM categories WHERE slug = 'sports'), 'Professional Yoga Mat', 'professional-yoga-mat', 'Non-slip yoga mat with carrying strap, 6mm thick', 'Eco-friendly, portable, durable', 1499, 999, 90, 'YGM-001', 4.3, 267, true, ARRAY['sports', 'fitness']),
  ((SELECT id FROM categories WHERE slug = 'sports'), 'Running Shoes Pro', 'running-shoes-pro', 'Advanced cushioning running shoes for marathon training', 'Lightweight, comfortable, durable', 5999, 3999, 110, 'RSH-001', 4.4, 341, true, ARRAY['sports', 'footwear']);

INSERT INTO flash_sales (product_id, discount_percentage, start_time, end_time, quantity_limit) VALUES
  ((SELECT id FROM products WHERE slug = 'wireless-earbuds-pro'), 30, now(), now() + interval '3 days', 50),
  ((SELECT id FROM products WHERE slug = 'smart-watch-ultra'), 33, now(), now() + interval '2 days', 30);
