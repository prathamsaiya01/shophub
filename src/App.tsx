import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Navigation } from './components/Navigation.tsx';

import { Home } from './pages/Home.tsx';
import { Products } from './pages/Products.tsx';
import { Cart } from './pages/Cart.tsx';
import { Checkout } from './pages/Checkout.tsx';
import { OrderSuccess } from './pages/OrderSuccess.tsx';
import { Login } from './pages/Login.tsx';
import { Signup } from './pages/Signup.tsx';
import { Admin } from './pages/Admin.tsx';
import { Wishlist } from './pages/Wishlist.tsx';
import { PriceAlerts } from './pages/PriceAlerts.tsx';

// ✅ Product detail page
import ProductPage from './pages/ProductPage.tsx';

// ✅ Wishlist context (NOTE: state, not context)
import { WishlistProvider } from './state/WishlistContext';


import { useAuth } from './context/AuthContext.tsx';
import { isAdmin } from './utils/admin';

function App() {
  const AdminRoute = ({ children }: { children: JSX.Element }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (!isAdmin(user)) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Navigation />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route
                  path="/order-success/:orderId"
                  element={<OrderSuccess />}
                />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/price-alerts" element={<PriceAlerts />} />

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
              </Routes>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
