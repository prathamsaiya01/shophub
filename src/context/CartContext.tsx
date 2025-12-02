import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../types';
import { supabase } from '../services/supabase';

interface CartContextType {
  items: CartItem[];
  total: number;
  itemCount: number;
  addToCart: (product: Product, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  loadCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const loadCart = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cart_items')
        .select(
          `
          id,
          user_id,
          product_id,
          quantity,
          added_at,
          updated_at,
          product:products(
            *,
            product_images(*)
          )
        `
        )
        .eq('user_id', user.id);

      if (error) throw error;
      if (data) {
        setItems(data as unknown as CartItem[]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const addToCart = async (product: Product, quantity: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // increment existing quantity if item already in cart
      const existing = items.find((i) => i.product_id === product.id);
      const newQty = (existing?.quantity || 0) + quantity;

      const { error } = await supabase.from('cart_items').upsert(
        {
          id: existing?.id, // keep same id if exists
          user_id: user.id,
          product_id: product.id,
          quantity: newQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);
      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(cartItemId);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', cartItemId);

      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const total = items.reduce((sum, item) => {
    const price = item.product?.discount_price || item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        total,
        itemCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
