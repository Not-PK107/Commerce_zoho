import { useState } from 'react';

/**
 * Format currency amount cleanly
 */
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
 * ProductCard Component
 * Displays individual product card with high-quality image, category, brand,
 * formatted price, stock badge, and Quick Add to Cart button.
 */
export default function ProductCard({ product, onSelectProduct, onAddToCart }) {
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [hasFallbackImage, setHasFallbackImage] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (!product) return null;

  const {
    id,
    variantId,
    title,
    name,
    brand,
    category,
    price,
    currency = 'INR',
    featuredImage,
  } = product;

  // Consistent stock availability logic: product.in_stock === true && Number(product.stock_on_hand) > 0
  const inStock = product.in_stock !== undefined && product.stock_on_hand !== undefined
    ? (product.in_stock === true && Number(product.stock_on_hand) > 0)
    : Boolean(product.inStock);

  const displayName = title || name || 'Product';
  const displayPrice = formatPrice(price, currency);

  const displayImage = imageFailed
    ? null
    : (hasFallbackImage
        ? `/api/zoho-image?url=${encodeURIComponent(featuredImage || '')}`
        : (featuredImage || null));

  const handleImageError = () => {
    if (featuredImage && !hasFallbackImage) {
      setHasFallbackImage(true);
    } else {
      setImageFailed(true);
    }
  };

  const handleQuickAdd = async (e) => {
    e.stopPropagation();
    if (!inStock || isAdding) return;

    setIsAdding(true);
    try {
      if (onAddToCart) {
        await onAddToCart(product, 1, variantId);
        setAddedSuccess(true);
        setTimeout(() => setAddedSuccess(false), 1800);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="product-card group" data-product-id={id} data-variant-id={variantId}>
      <div
        className="product-card-image-wrap"
        onClick={() => onSelectProduct?.(product.handle || id)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${displayName}`}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={displayName}
            className="product-card-image"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="product-card-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
            </svg>
            <span>{displayName}</span>
          </div>
        )}

        {category && (
          <span className="product-card-category-pill">{category}</span>
        )}

        {!inStock && (
          <span className="product-badge out-of-stock">Sold Out</span>
        )}

        <div className="product-card-quick-actions">
          <button
            type="button"
            className="quick-view-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectProduct?.(product.handle || id);
            }}
          >
            Quick View
          </button>
        </div>
      </div>

      <div className="product-card-info">
        {brand && <span className="product-card-brand">{brand}</span>}
        <h3
          className="product-card-title"
          onClick={() => onSelectProduct?.(product.handle || id)}
        >
          {displayName}
        </h3>
        <p className="product-card-price">{displayPrice || 'Price on request'}</p>

        <button
          type="button"
          className={`btn btn-primary product-card-btn ${addedSuccess ? 'btn-success' : ''}`}
          disabled={!inStock || isAdding}
          onClick={handleQuickAdd}
          aria-label={`Add ${displayName} to cart`}
        >
          {addedSuccess ? '✓ Added to Cart' : isAdding ? 'Adding...' : inStock ? 'Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </article>
  );
}
