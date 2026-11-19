import { useState, useEffect, useCallback } from 'react';
import { fetchProducts } from '../services/shopify';

/**
 * Custom Hook: useProducts
 * Encapsulates asynchronous product fetching, loading states, and error handling.
 * 
 * @param {number} count Number of products to load on initial mount
 * @returns {{ products: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useProducts(count = 20) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manual refetch handler (e.g. retry button)
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts(count);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Unable to retrieve products. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [count]);

  // Initial fetch on mount with cancellation flag to avoid race conditions
  useEffect(() => {
    let isCancelled = false;

    async function initFetch() {
      try {
        const data = await fetchProducts(count);
        if (!isCancelled) {
          setProducts(data);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load products:', err);
          setError(err.message || 'Unable to retrieve products. Please check connection.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    initFetch();

    return () => {
      isCancelled = true;
    };
  }, [count]);

  return {
    products,
    loading,
    error,
    refetch,
  };
}
