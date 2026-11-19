import { useState, useMemo } from 'react';
import ProductGrid from '../components/ProductGrid';

/**
 * Home Page
 * Displays Hero section, real-time search filter, and the dynamic product catalog.
 */
export default function Home({
  products = [],
  loading = false,
  error = null,
  onRetry,
  onSelectProduct,
  onAddToCart,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Memoized filter for snappy client-side search without unnecessary refetches
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase().trim();
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  return (
    <div className="page home-page">
      <section className="hero-section">
        <div className="container">
          <span className="hero-badge">Shopify Storefront API</span>
          <h1 className="hero-title">Modern Minimalist Store</h1>
          <p className="hero-subtitle">
            Explore our curated collection of essentials. Dynamically queried via Shopify GraphQL.
          </p>
        </div>
      </section>

      <section className="catalog-section container">
        <div className="catalog-toolbar">
          <div className="section-header">
            <h2>Featured Products</h2>
            {!loading && !error && (
              <span className="product-count">
                Showing {filteredProducts.length} of {products.length} products
              </span>
            )}
          </div>

          <div className="search-bar-wrap">
            <input
              type="search"
              className="search-input"
              placeholder="Search products by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search products"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Loading State: Clean Skeleton Cards */}
        {loading && (
          <div className="product-grid">
            {[1, 2, 3, 4, 5, 6].map((placeholder) => (
              <div key={placeholder} className="product-card skeleton-card">
                <div className="skeleton-image skeleton-pulse" />
                <div className="product-card-info">
                  <div className="skeleton-line skeleton-line-title skeleton-pulse" />
                  <div className="skeleton-line skeleton-line-price skeleton-pulse" />
                  <div className="skeleton-button skeleton-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State with Retry */}
        {error && !loading && (
          <div className="catalog-error-box">
            <p className="error-title">Unable to load catalog</p>
            <p className="error-message">{error}</p>
            {onRetry && (
              <button type="button" className="btn btn-secondary" onClick={onRetry}>
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Rendered Products */}
        {!loading && !error && (
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={onSelectProduct}
            onAddToCart={onAddToCart}
          />
        )}
      </section>
    </div>
  );
}
