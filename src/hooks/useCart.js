import { useContext, useCallback } from 'react';
import { CartContext } from '../context/CartContext';

/**
 * Custom Hook: useCart
 * Encapsulates shopping cart state and operations (add, remove, quantity update, totals).
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  const { cart, setCart } = context;

  const totalItems = (cart?.lines || []).reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  const subtotal = (cart?.lines || []).reduce(
    (sum, item) => sum + parseFloat(item.price || 0) * (item.quantity || 1),
    0
  );

  /**
   * Add a product/variant to the cart
   */
  const addToCart = useCallback((product, quantity = 1, selectedVariant = null) => {
    if (!product) return;

    const variant = selectedVariant || product.variants?.[0] || {};
    const variantId = variant.id || product.defaultVariantId || product.id;
    const price = variant.price?.amount || product.priceRange?.minVariantPrice?.amount || '0';
    const currency = variant.price?.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || 'USD';
    const variantTitle = variant.title || 'Default Title';
    const image = product.featuredImage?.url || null;

    setCart((prevCart) => {
      const existingLines = prevCart.lines || [];
      const existingIndex = existingLines.findIndex((line) => line.id === variantId);

      let updatedLines;
      if (existingIndex > -1) {
        updatedLines = existingLines.map((line, idx) =>
          idx === existingIndex
            ? { ...line, quantity: line.quantity + quantity }
            : line
        );
      } else {
        const newLine = {
          id: variantId,
          merchandiseId: variantId,
          productId: product.id,
          title: product.title,
          variantTitle,
          price,
          currency,
          image,
          quantity,
        };
        updatedLines = [...existingLines, newLine];
      }

      return {
        ...prevCart,
        lines: updatedLines,
      };
    });
  }, [setCart]);

  /**
   * Remove a line item from cart
   */
  const removeFromCart = useCallback((lineId) => {
    setCart((prevCart) => ({
      ...prevCart,
      lines: (prevCart.lines || []).filter((line) => line.id !== lineId),
    }));
  }, [setCart]);

  /**
   * Update quantity of a line item (auto-removes if quantity <= 0)
   */
  const updateQuantity = useCallback((lineId, quantity) => {
    setCart((prevCart) => ({
      ...prevCart,
      lines: (prevCart.lines || [])
        .map((line) => (line.id === lineId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    }));
  }, [setCart]);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setCart({ id: null, lines: [], checkoutUrl: null });
  }, [setCart]);

  return {
    cart,
    lines: cart?.lines || [],
    totalItems,
    subtotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
