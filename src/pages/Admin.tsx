// src/pages/Admin.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Product, Order, Category } from '../types';
import { formatPrice, formatDate } from '../utils/formatting';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  ShoppingBag,
  BarChart3,
  Users,
} from 'lucide-react';

// ---------- helpers ----------
const BUCKET_NAME = 'product_images';

// simple slug generator from product name
const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ------------------------------

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'categories'>(
    'products'
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // form state
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    discount_price: '',
    stock_quantity: '',
    description: '',
    short_description: '',
  });

  // image file state
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, ordersRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*'),
      ]);

      if (productsRes.data) setProducts(productsRes.data as Product[]);
      if (ordersRes.data) setOrders(ordersRes.data as Order[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // upload image to Supabase Storage + create product_images row
  const uploadProductImage = async (productId: string, file: File) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${productId}/${fileName}`;

    // 1) upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2) get public URL (no error field here)
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 3) insert into product_images table
    const { error: imageError } = await supabase
      .from('product_images')
      .insert([
        {
          product_id: productId,
          image_url: publicUrl,
          alt_text: formData.name,
          is_primary: true,
        },
      ]);

    if (imageError) throw imageError;
  } catch (error) {
    console.error('Error uploading product image:', error);
    alert(
      error instanceof Error ? error.message : 'Error uploading product image'
    );
  }
};


  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const basePayload = {
      name: formData.name,
      category_id: formData.category_id,
      price: Number(formData.price),
      discount_price: formData.discount_price
        ? Number(formData.discount_price)
        : null,
      stock_quantity: Number(formData.stock_quantity),
      description: formData.description || null,
      short_description: formData.short_description || null,
    };

    try {
      let productId: string | null = null;

      if (editingProduct) {
        const payload = {
          ...basePayload,
          slug: (editingProduct as any).slug, // keep old slug
        };

        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);

        if (error) throw error;
        productId = editingProduct.id;
      } else {
        const payload = {
          ...basePayload,
          slug: slugify(formData.name),
        };

        const { data, error } = await supabase
          .from('products')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        productId = (data as Product).id;
      }

      // If we have an image file, upload it
      if (productId && imageFile) {
        await uploadProductImage(productId, imageFile);
      }

      // reset form
      setFormData({
        name: '',
        category_id: '',
        price: '',
        discount_price: '',
        stock_quantity: '',
        description: '',
        short_description: '',
      });
      setImageFile(null);
      setEditingProduct(null);
      setShowProductForm(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error?.message || 'Error saving product');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error?.message || 'Error deleting product');
    }
  };

  const stats = [
    { label: 'Total Products', value: products.length, icon: Package },
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag },
    {
      label: 'Total Revenue',
      value: formatPrice(orders.reduce((sum, o) => sum + o.total, 0)),
      icon: BarChart3,
    },
    { label: 'Active Users', value: '234', icon: Users }, // fake for now
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Admin Dashboard
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <Icon className="w-8 h-8 text-blue-600 opacity-20" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          {(['products', 'orders', 'categories'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold capitalize border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Products
              </h2>
              <button
                onClick={() => {
                  setShowProductForm(!showProductForm);
                  setEditingProduct(null);
                  setFormData({
                    name: '',
                    category_id: '',
                    price: '',
                    discount_price: '',
                    stock_quantity: '',
                    description: '',
                    short_description: '',
                  });
                  setImageFile(null);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                <Plus className="w-5 h-5" /> Add Product
              </button>
            </div>

            {showProductForm && (
              <form
                onSubmit={handleSaveProduct}
                className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4"
              >
                <input
                  type="text"
                  placeholder="Product Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  required
                />

                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />

                <textarea
                  placeholder="Short Description"
                  value={formData.short_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      short_description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />

                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="number"
                    placeholder="Price"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Discount Price"
                    value={formData.discount_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_price: e.target.value,
                      })
                    }
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_quantity: e.target.value,
                      })
                    }
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>

                {/* IMAGE UPLOAD */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Product Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImageFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-sm text-gray-700 dark:text-gray-200"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Optional. If you select a file, it will be uploaded and set
                    as the primary image.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                      setImageFile(null);
                    }}
                    className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Stock
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Rating
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white">
                        {product.name}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {formatPrice(product.price)}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {product.stock_quantity}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {product.rating}/5
                      </td>
                      <td className="py-3 px-4 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setFormData({
                              name: product.name,
                              category_id: product.category_id,
                              price: String(product.price),
                              discount_price: product.discount_price
                                ? String(product.discount_price)
                                : '',
                              stock_quantity: String(product.stock_quantity),
                              description: product.description || '',
                              short_description:
                                product.short_description || '',
                            });
                            setImageFile(null);
                            setShowProductForm(true);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Orders
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Total
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-mono text-xs">
                        {order.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-semibold">
                        {formatPrice(order.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : order.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {cat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
