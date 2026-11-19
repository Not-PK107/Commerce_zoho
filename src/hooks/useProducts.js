import { useState } from 'react';

/**
 * Custom Hook: useProducts
 * Encapsulates product fetching, loading states, and error handling.
 */
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return {
    products,
    loading,
    error,
    setProducts,
    setLoading,
    setError,
  };
}
