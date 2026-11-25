import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(null);

const GUEST_CART_STORAGE_KEY = 'zoho_guest_cart_zcidg_v1';
const MEMBER_CART_STORAGE_KEY = 'zoho_member_cart_zcid_v1';
const LEGACY_CART_KEY = 'zoho_commerce_cart_v1';
const LEGACY_SHOPIFY_KEY = 'shopify_storefront_cart_v1';

const EMPTY_CART = {
  id: null,
  lines: [],
  checkoutUrl: null,
  storeCartUrl: null,
  currency: 'INR',
  subtotal: 0,
  totalItems: 0,
};

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();

  // Fresh cart state on startup - never restore stale carts or old cart IDs from localStorage
  const [guestCart, setGuestCart] = useState(EMPTY_CART);
  const [memberCart, setMemberCart] = useState(EMPTY_CART);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [cartError, setCartError] = useState(null);

  // Clean up any stale persisted cart entries in localStorage on startup
  useEffect(() => {
    try {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem(MEMBER_CART_STORAGE_KEY);
      localStorage.removeItem(LEGACY_CART_KEY);
      localStorage.removeItem(LEGACY_SHOPIFY_KEY);
    } catch {
      // ignore
    }
  }, []);

  const activeCartType = isAuthenticated ? 'member' : 'guest';
  const cart = isAuthenticated ? memberCart : guestCart;

  const setCart = useCallback(
    (updater) => {
      if (isAuthenticated) {
        setMemberCart(updater);
      } else {
        setGuestCart(updater);
      }
    },
    [isAuthenticated]
  );

  const clearGuestCart = useCallback(() => {
    setGuestCart(EMPTY_CART);
    try {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem(LEGACY_CART_KEY);
      localStorage.removeItem(LEGACY_SHOPIFY_KEY);
    } catch {
      // ignore
    }
  }, []);

  const clearMemberCart = useCallback(() => {
    setMemberCart(EMPTY_CART);
    try {
      localStorage.removeItem(MEMBER_CART_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      cart,
      setCart,
      guestCart,
      setGuestCart,
      memberCart,
      setMemberCart,
      cartType: activeCartType,
      clearGuestCart,
      clearMemberCart,
      isDrawerOpen,
      setIsDrawerOpen,
      isCartLoading,
      setIsCartLoading,
      cartError,
      setCartError,
    }),
    [
      cart,
      setCart,
      guestCart,
      memberCart,
      activeCartType,
      clearGuestCart,
      clearMemberCart,
      isDrawerOpen,
      isCartLoading,
      cartError,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
