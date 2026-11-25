import { useState, useEffect, useCallback } from 'react';
import { fetchProducts, apiCapabilities } from '../services/zohoCommerce';

/**
 * Custom Hook: useProducts
 * Encapsulates asynchronous product fetching from Zoho Commerce API,
 * loading states, diagnostic information, and error handling.
 * 
 * @returns {{ products: Array, loading: boolean, error: string|null, apiInfo: object, refetch: Function }}
 */
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Manual refetch handler (e.g. retry button)
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load Zoho Commerce products:', err);
      setError(err.message || 'Unable to retrieve Zoho Commerce products.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount with cancellation flag to avoid race conditions
  useEffect(() => {
    let isCancelled = false;

    async function initFetch() {
      try {
        const data = await fetchProducts();
        if (!isCancelled) {
          setProducts(data);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load Zoho Commerce products:', err);
          setError(err.message || 'Unable to retrieve Zoho Commerce products.');
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
  }, []);

  return {
    products,
    loading,
    error,
    apiInfo: apiCapabilities,
    refetch,
  };
}
