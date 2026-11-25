import { useState, useMemo } from 'react';
import ProductGrid from '../components/ProductGrid';

function formatPrice(amount, currency = 'INR') {
  if (typeof amount !== 'number' && !amount) return '';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

/**
 * Home Page Component
 * Premium hero section, interactive category chips, search bar, sorting,
 * promotional banners, and responsive catalog grid.
 */
export default function Home({
  products = [],
  loading = false,
  error = null,
  paymentResult = null,
  onClearPaymentResult,
  onRetryCheckout,
  onRetry,
  onSelectProduct,
  onAddToCart,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');

  // Extract unique categories from product list
  const categories = useMemo(() => {
    const list = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(list)];
  }, [products]);

  // Client-side filtering & sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Search query filter (title, brand, description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'name-az') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const handleScrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('featured');
  };

  return (
    <div className="page home-page">
      {/* Payment Result Section: Success */}
      {paymentResult && paymentResult.status === 'success' && (
        <section className="container payment-result-section">
          <div className="checkout-card order-confirmed-card payment-status-card">
            <div className="order-success-header">
              <div className="success-checkmark">✓</div>
              <h2>Order Placed Successfully!</h2>
              <p className="success-tagline">
                Thank you for your purchase. Your payment was verified and your order has been placed successfully.
              </p>
            </div>

            {paymentResult.order && (
              <div className="receipt-box">
                <div className="receipt-header-row">
                  <div>
                    <span className="receipt-meta-label">Order Reference</span>
                    <span className="receipt-meta-val code-font">
                      {paymentResult.order.orderReference || 'ORD-CONFIRMED'}
                    </span>
                  </div>
                  <div>
                    <span className="receipt-meta-label">Date</span>
                    <span className="receipt-meta-val">
                      {paymentResult.order.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="receipt-meta-label">Payment Mode</span>
                    <span className="receipt-meta-val">
                      {paymentResult.order.paymentMethod || 'Online Payment'}
                    </span>
                  </div>
                </div>

                <div className="receipt-divider" />

                {paymentResult.order.lines && paymentResult.order.lines.length > 0 && (
                  <>
                    <div className="receipt-items-list">
                      <h4>Purchased Items</h4>
                      {paymentResult.order.lines.map((item, idx) => (
                        <div key={item.id || item.variantId || idx} className="receipt-item-row">
                          <div className="receipt-item-title">
                            <strong>{item.title}</strong>
                            <span className="receipt-item-qty">Qty: {item.quantity}</span>
                          </div>
                          <span className="receipt-item-price">
                            {formatPrice(parseFloat(item.price || 0) * (item.quantity || 1), paymentResult.order.currency || 'INR')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="receipt-divider" />
                  </>
                )}

                <div className="receipt-total-row">
                  <span>Total Amount Paid</span>
                  <span className="receipt-total-val">
                    {formatPrice(paymentResult.order.total, paymentResult.order.currency || 'INR')}
                  </span>
                </div>

                {paymentResult.order.shippingAddress && (
                  <div className="receipt-shipping-details">
                    <h4>Delivery Address</h4>
                    <p>
                      {paymentResult.order.customerName && (
                        <><strong>{paymentResult.order.customerName}</strong><br /></>
                      )}
                      {paymentResult.order.shippingAddress}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="confirmation-actions">
              <button
                type="button"
                className="btn btn-primary btn-large"
                onClick={onClearPaymentResult}
              >
                Continue Shopping &rarr;
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Payment Result Section: Failure */}
      {paymentResult && paymentResult.status === 'failure' && (
        <section className="container payment-result-section">
          <div className="checkout-card order-failed-card payment-status-card">
            <div className="order-failed-header">
              <div className="failure-crossmark">✕</div>
              <h2>Payment Failed</h2>
              <p className="failure-tagline">
                We were unable to complete your transaction. No charges were made to your account.
              </p>
            </div>

            <div className="receipt-box failure-receipt-box">
              <div className="receipt-header-row">
                <div>
                  <span className="receipt-meta-label">Transaction Status</span>
                  <span className="receipt-meta-val text-danger">Declined / Failed</span>
                </div>
                <div>
                  <span className="receipt-meta-label">Payment Mode</span>
                  <span className="receipt-meta-val">
                    {paymentResult.order?.paymentMethod || 'Online Gateway'}
                  </span>
                </div>
                {paymentResult.order?.orderReference && (
                  <div>
                    <span className="receipt-meta-label">Cart Reference</span>
                    <span className="receipt-meta-val code-font">{paymentResult.order.orderReference}</span>
                  </div>
                )}
              </div>

              <div className="receipt-divider" />

              <div className="failure-reason-box">
                <h4>Error Details</h4>
                <p className="failure-reason-text">
                  {paymentResult.error || 'The payment gateway could not process your transaction. Please verify card / UPI details or try another payment method.'}
                </p>
              </div>

              {paymentResult.order?.total ? (
                <>
                  <div className="receipt-divider" />
                  <div className="receipt-total-row">
                    <span>Order Amount</span>
                    <span className="receipt-total-val">
                      {formatPrice(paymentResult.order.total, paymentResult.order.currency || 'INR')}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="confirmation-actions">
              {onRetryCheckout && (
                <button
                  type="button"
                  className="btn btn-primary btn-large"
                  onClick={onRetryCheckout}
                >
                  ↻ Try Again / Return to Checkout
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-large"
                onClick={onClearPaymentResult}
              >
                Return to Store Catalog
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Premium Hero Section */}
      {!paymentResult && (
        <section className="hero-section">
          <div className="container hero-container">
            <div className="hero-content">
              <span className="hero-badge">
                <span className="live-dot" /> Premium Collection
              </span>
              <h1 className="hero-title">Experience Flagship Innovation</h1>
              <p className="hero-subtitle">
                Engineered for seamless performance. Explore authentic devices with express delivery, encrypted checkout, and official brand warranty.
              </p>
              <div className="hero-cta-group">
                <button
                  type="button"
                  className="btn btn-primary hero-cta-btn"
                  onClick={handleScrollToCatalog}
                >
                  Explore Collection &rarr;
                </button>
              </div>
            </div>
            <div className="hero-image-wrap">
              <img
                src={products[0]?.featuredImage || "https://lyra.zohoecommerce.com/60096917552/product-images/4162352000000034377-igor-omilaev-lDWTfYhZ85w-unsplash.jpg"}
                alt={products[0]?.title || "Flagship Device"}
                className="hero-featured-image"
                onError={(e) => {
                  if (!e.target.src.includes('/api/zoho-image')) {
                    e.target.src = '/api/zoho-image?url=https://lyra.zohoecommerce.com/60096917552/product-images/4162352000000034377-igor-omilaev-lDWTfYhZ85w-unsplash.jpg';
                  }
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Main Catalog Section */}
      <section id="catalog-section" className="catalog-section container">
        {/* Category Pills & Toolbar */}
        <div className="catalog-toolbar-wrap">
          <div className="category-filter-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="catalog-toolbar-actions">
            {/* Search Input */}
            <div className="search-bar-wrap">
              <input
                type="search"
                className="search-input"
                placeholder="Search iPhone, Galaxy, laptops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search catalog"
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

            {/* Sorting Dropdown */}
            <div className="search-bar-wrap">
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-az">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Toolbar Header Count */}
        <div className="catalog-count-row">
          <span className="catalog-count-text">
            Showing <strong>{filteredProducts.length}</strong> of {products.length} products
            {selectedCategory !== 'All' && ` in "${selectedCategory}"`}
          </span>
          {(selectedCategory !== 'All' || searchQuery) && (
            <button type="button" className="clear-filters-link" onClick={resetAllFilters}>
              Reset Filters
            </button>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="product-grid">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="product-card skeleton-card">
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

        {/* Error State */}
        {error && !loading && (
          <div className="catalog-error-box">
            <div className="error-icon">⚠️</div>
            <p className="error-title">Unable to Load Products</p>
            <p className="error-message">We are experiencing a temporary connection issue. Please try again.</p>
            {onRetry && (
              <button type="button" className="btn btn-primary retry-btn" onClick={onRetry}>
                ↻ Try Again
              </button>
            )}
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && (
          <ProductGrid
            products={filteredProducts}
            onSelectProduct={onSelectProduct}
            onAddToCart={onAddToCart}
            onResetFilter={resetAllFilters}
          />
        )}
      </section>

      {/* Promotional Value Banner */}
      <section className="promo-banner container">
        <div className="promo-banner-card">
          <div className="promo-feature">
            <span className="promo-icon">🚚</span>
            <h4>Free Express Shipping</h4>
            <p>Complimentary next-day dispatch on all flagship device orders nationwide.</p>
          </div>
          <div className="promo-feature">
            <span className="promo-icon">🛡️</span>
            <h4>100% Genuine Guarantee</h4>
            <p>Authentic certified hardware backed by official manufacturer warranties.</p>
          </div>
          <div className="promo-feature">
            <span className="promo-icon">🔒</span>
            <h4>Secure &amp; Encrypted Checkout</h4>
            <p>256-bit bank-grade encryption with comprehensive buyer protection.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
