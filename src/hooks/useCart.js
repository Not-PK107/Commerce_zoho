import { useContext, useCallback, useEffect, useRef } from 'react';
import { CartContext } from '../context/CartContext';
import {
  addToCartApi,
  getCartApi,
  updateCartItemApi,
  removeCartItemApi,
  clearCartApi,
} from '../services/zohoCommerce';

/**
 * Custom Hook: useCart
 * Encapsulates shopping cart state and operations integrated with Zoho Commerce Storefront Cart API.
 * Supports both Guest Carts (zcidg) and Authenticated Member Carts (zcid),
 * including automated guest-to-member cart item merging upon customer login.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  const {
    cart,
    setCart,
    guestCart,
    memberCart,
    setMemberCart,
    cartType,
    clearGuestCart,
    clearMemberCart,
    isDrawerOpen,
    setIsDrawerOpen,
    isCartLoading,
    setIsCartLoading,
    cartError,
    setCartError,
  } = context;

  const isMergingRef = useRef(false);
  const prevCartTypeRef = useRef(cartType);

  // Handle guest-to-member cart merging ONLY when customer explicitly signs in with existing guest items
  // Strictly avoid automatic cart API calls on page load, component mount, or refresh.
  useEffect(() => {
    let isMounted = true;
    const wasGuest = prevCartTypeRef.current === 'guest';
    prevCartTypeRef.current = cartType;

    if (wasGuest && cartType === 'member' && (guestCart?.lines?.length || 0) > 0 && !isMergingRef.current) {
      async function mergeGuestCart() {
        isMergingRef.current = true;
        setIsCartLoading(true);
        console.log(`[useCart] Merging ${guestCart.lines.length} guest cart item(s) into authenticated member cart (zcid)...`);

        try {
          let activeMemberId = memberCart?.id || null;
          let lastRes = null;
          for (const item of (guestCart?.lines || [])) {
            const res = await addToCartApi(item.variantId, item.quantity, activeMemberId, 'member');
            if (res?.id) {
              activeMemberId = res.id;
              lastRes = res;
            }
          }

          if (isMounted && lastRes && Array.isArray(lastRes.lines)) {
            setMemberCart(lastRes);
          }
          // Clear the guest cart now that it is merged into the member cart
          clearGuestCart();
        } catch (mergeErr) {
          console.warn('[useCart] Guest cart merge warning:', mergeErr.message);
        } finally {
          isMergingRef.current = false;
          if (isMounted) setIsCartLoading(false);
        }
      }

      mergeGuestCart();
    }

    return () => {
      isMounted = false;
    };
  }, [cartType, guestCart?.lines, memberCart?.id, setMemberCart, clearGuestCart, setIsCartLoading]);

  const totalItems = cart?.totalItems ?? (cart?.lines || []).reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  const subtotal = cart?.subtotal ?? (cart?.lines || []).reduce(
    (sum, item) => sum + parseFloat(item.price || 0) * (item.quantity || 1),
    0
  );

  const currency = cart?.currency || 'INR';
  const checkoutUrl = cart?.checkoutUrl || (cart?.id ? `https://demo-60096917552.zohoecommerce.in/checkout?checkout_id=${cart.id}` : null);
  const storeCartUrl = cart?.storeCartUrl || (cart?.id ? `https://demo-60096917552.zohoecommerce.in/cart?checkout_id=${cart.id}` : null);

  /**
   * Sync active cart with Zoho Commerce
   */
  const syncCart = useCallback(async () => {
    if (!cart?.id) return;
    setIsCartLoading(true);
    try {
      const liveCart = await getCartApi(cart.id, cartType);
      if (liveCart) {
        setCart(liveCart);
      }
    } catch (e) {
      console.warn('[useCart] Failed to sync with Zoho:', e.message);
    } finally {
      setIsCartLoading(false);
    }
  }, [cart, cartType, setCart, setIsCartLoading]);

  /**
   * Add a product variant to Zoho Commerce Cart
   * Accepts both invocation signatures:
   * 1. onAddToCart(product, quantity, variantId) [from ProductCard, ProductDetails]
   * 2. onAddToCart(variantId, quantity, productMeta)
   */
  const addToCart = useCallback(
    async (firstArg, secondArg = 1, thirdArg = null) => {
      let resolvedVariantId;
      let quantity;

      // Handle both call signatures
      if (typeof firstArg === 'object' && firstArg !== null) {
        quantity = typeof secondArg === 'number' ? Math.max(1, secondArg) : 1;
        resolvedVariantId = (typeof thirdArg === 'string' || typeof thirdArg === 'number')
          ? String(thirdArg)
          : String(
              firstArg.variantId ||
              firstArg.variant_id ||
              firstArg.default_variant_id ||
              firstArg.variants?.[0]?.id ||
              firstArg.item_id ||
              firstArg.id ||
              ''
            );
      } else {
        resolvedVariantId = String(firstArg || '');
        quantity = typeof secondArg === 'number' ? Math.max(1, secondArg) : 1;
      }

      resolvedVariantId = resolvedVariantId.trim();
      if (!resolvedVariantId || resolvedVariantId === '[object Object]') {
        console.error('[useCart] Unable to resolve valid variantId for addToCart:', { firstArg, secondArg, thirdArg });
        setCartError('Product variant could not be identified.');
        return;
      }

      setIsCartLoading(true);
      setCartError(null);
      setIsDrawerOpen(true);

      const activeCartId = cart?.id;

      try {
        const liveZohoCart = await addToCartApi(resolvedVariantId, quantity, activeCartId, cartType);

        if (liveZohoCart && Array.isArray(liveZohoCart.lines)) {
          setCart(liveZohoCart);
        } else {
          throw new Error('Invalid cart response received from Zoho Commerce.');
        }
      } catch (err) {
        console.error('Zoho Cart API error:', err);
        setCartError(err.message || 'Unable to update cart with Zoho Commerce.');
        if (err.message && (
          err.message.toLowerCase().includes('unable to process') ||
          err.message.toLowerCase().includes('session') ||
          err.message.toLowerCase().includes('cart_id')
        )) {
          setCart((prev) => ({ ...prev, id: null }));
        }
      } finally {
        setIsCartLoading(false);
      }
    },
    [cart, cartType, setCart, setIsDrawerOpen, setIsCartLoading, setCartError]
  );

  /**
   * Update quantity of an item using Zoho Commerce variant ID
   */
  const updateQuantity = useCallback(
    async (lineItemOrVariantId, newQuantity) => {
      setIsCartLoading(true);
      setCartError(null);
      const qty = Math.max(0, parseInt(newQuantity, 10));

      const target = (cart?.lines || []).find(
        (it) => it.variantId === lineItemOrVariantId || it.lineItemId === lineItemOrVariantId || it.id === lineItemOrVariantId
      );
      const variantId = target?.variantId || lineItemOrVariantId;

      try {
        let apiResponse;
        if (qty === 0) {
          apiResponse = await removeCartItemApi(variantId, cart?.id, cartType);
        } else {
          apiResponse = await updateCartItemApi(variantId, qty, cart?.id, cartType);
        }

        if (apiResponse && Array.isArray(apiResponse.lines)) {
          setCart(apiResponse);
        } else {
          throw new Error('Failed to update cart quantity on Zoho Commerce.');
        }
      } catch (err) {
        console.warn('Zoho Cart update API warning:', err.message);
        setCartError(err.message || 'Unable to update item quantity with Zoho Commerce.');
      } finally {
        setIsCartLoading(false);
      }
    },
    [cart, cartType, setCart, setIsCartLoading, setCartError]
  );

  /**
   * Permanently remove an item from Zoho Commerce Cart using variant ID
   */
  const removeFromCart = useCallback(
    async (lineItemOrVariantId) => {
      setIsCartLoading(true);
      setCartError(null);

      const target = (cart?.lines || []).find(
        (it) => it.variantId === lineItemOrVariantId || it.lineItemId === lineItemOrVariantId || it.id === lineItemOrVariantId
      );
      const variantId = target?.variantId || lineItemOrVariantId;

      try {
        const apiResponse = await removeCartItemApi(variantId, cart?.id, cartType);
        if (apiResponse && Array.isArray(apiResponse.lines)) {
          setCart(apiResponse);
        } else {
          throw new Error('Zoho Commerce did not confirm line item deletion.');
        }
      } catch (err) {
        console.error('Zoho Cart remove API error:', err.message);
        setCartError(err.message || 'Unable to remove product from Zoho Commerce cart.');
      } finally {
        setIsCartLoading(false);
      }
    },
    [cart, cartType, setCart, setIsCartLoading, setCartError]
  );

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(async () => {
    try {
      await clearCartApi(cart?.id, cartType);
    } catch {
      // ignore
    }
    if (cartType === 'member') {
      clearMemberCart();
    } else {
      clearGuestCart();
    }
  }, [cart, cartType, clearMemberCart, clearGuestCart]);

  return {
    cart,
    cartType,
    lines: cart?.lines || [],
    totalItems,
    subtotal,
    currency,
    checkoutUrl,
    storeCartUrl,
    isDrawerOpen,
    isCartLoading,
    cartError,
    clearCartError: () => setCartError(null),
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
    toggleDrawer: () => setIsDrawerOpen((prev) => !prev),
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    syncCart,
  };
}
