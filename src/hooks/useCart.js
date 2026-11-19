import { useContext } from 'react';
import { CartContext } from '../context/CartContext';

/**
 * Custom Hook: useCart
 * Encapsulates shopping cart state and operations.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  const { cart, setCart } = context;
  const totalItems = (cart?.lines || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  return {
    cart,
    totalItems,
    setCart,
  };
}
