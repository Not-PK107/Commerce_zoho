import { useState, useMemo } from 'react';
import ProductCard from '../components/ProductCard';

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
 * ProductDetails Page
 * Displays comprehensive product specifications, variant picker, image gallery,
 * stock status, and related products carousel/grid.
 */
export default function ProductDetails({
  product,
  allProducts = [],
  onAddToCart,
  onSelectProduct,
  onBack,
}) {
  const [prevProductId, setPrevProductId] = useState(product?.id);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(
    product?.variantId || product?.variants?.[0]?.id || null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Synchronize variant, gallery, and quantity if product selection changes
  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setSelectedVariantId(product.variantId || product.variants?.[0]?.id || null);
    setSelectedImageIndex(0);
    setQuantity(1);
  }

  // Synchronize variant if product changes
  const activeVariant = useMemo(() => {
    if (!product || !product.variants) return null;
    return product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  }, [product, selectedVariantId]);

  // Related products from same category or other items
  const relatedProducts = useMemo(() => {
    if (!product || !allProducts) return [];
    return allProducts
      .filter((p) => p.id !== product.id)
      .slice(0, 3);
  }, [product, allProducts]);

  if (!product) {
    return (
      <div className="container page product-details-page">
        <div className="empty-state-card">
          <p>Product not found or selection expired.</p>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            &larr; Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const {
    title,
    name,
    description,
    brand,
    category,
    currency = 'INR',
    images = [],
    featuredImage,
    inStock = true,
  } = product;

  const displayName = title || name || 'Product';
  const displayImages = images.length > 0 ? images : (featuredImage ? [featuredImage] : []);
  const activeImage = displayImages[selectedImageIndex] || displayImages[0] || null;
  const currentPrice = activeVariant?.price || product.price;

  const handleAddToCart = async () => {
    if (!inStock || isAdding) return;
    setIsAdding(true);

    try {
      if (onAddToCart) {
        const variantToAdd = selectedVariantId || product.variantId;
        await onAddToCart(product, quantity, variantToAdd);
        setAddSuccess(true);
        setTimeout(() => setAddSuccess(false), 2000);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="container page product-details-page">
      <nav className="pdp-breadcrumbs" aria-label="Breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={onBack}>
          Store Catalog
        </button>
        <span className="breadcrumb-separator">/</span>
        {category && (
          <>
            <span className="breadcrumb-item">{category}</span>
            <span className="breadcrumb-separator">/</span>
          </>
        )}
        <span className="breadcrumb-current">{displayName}</span>
      </nav>

      <div className="product-details-grid">
        {/* Left: Product Media Gallery */}
        <div className="product-details-gallery-wrap">
          <div className="product-details-main-image">
            {activeImage ? (
              <img
                src={activeImage}
                alt={displayName}
                onError={(e) => {
                  if (activeImage && !e.target.src.includes('/api/zoho-image')) {
                    e.target.src = `/api/zoho-image?url=${encodeURIComponent(activeImage)}`;
                  }
                }}
              />
            ) : (
              <div className="product-card-placeholder">No Image Available</div>
            )}
            {!inStock && (
              <span className="product-badge out-of-stock">Out of Stock</span>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="product-details-thumbnails">
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pdp-thumb-btn ${idx === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img src={img} alt={`${displayName} angle ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info & Commerce Actions */}
        <div className="product-details-info">
          <div className="pdp-header">
            {brand && <span className="pdp-brand-tag">{brand}</span>}
            <h1 className="pdp-title">{displayName}</h1>
          </div>

          <div className="pdp-meta-row">
            <span className="pdp-price">{formatPrice(currentPrice, currency)}</span>
            <span className={`pdp-stock-pill ${inStock ? 'in-stock' : 'out-of-stock'}`}>
              {inStock ? '● In Stock ' : '○ Sold Out'}
            </span>
          </div>

          <div className="pdp-description">
            <h3>Description</h3>
            <p>{description}</p>
          </div>

          {/* Variant Selection (if multiple variants exist) */}
          {product.variants && product.variants.length > 1 && (
            <div className="pdp-variants-section">
              <label className="pdp-section-label">Select Option:</label>
              <div className="pdp-variant-chips">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`variant-chip ${selectedVariantId === v.id ? 'active' : ''}`}
                    onClick={() => setSelectedVariantId(v.id)}
                  >
                    <span>{v.name}</span>
                    <small>{formatPrice(v.price, currency)}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="pdp-quantity-section">
            <label htmlFor="pdp-qty-input" className="pdp-section-label">Quantity:</label>
            <div className="pdp-qty-control">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || !inStock}
              >
                -
              </button>
              <input
                id="pdp-qty-input"
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 1) {
                    setQuantity(1);
                  } else {
                    setQuantity(Math.min(99, val));
                  }
                }}
                disabled={!inStock}
                className="qty-input"
              />
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={!inStock}
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pdp-actions">
            <button
              type="button"
              className={`btn btn-primary pdp-add-btn ${addSuccess ? 'btn-success' : ''}`}
              disabled={!inStock || isAdding}
              onClick={handleAddToCart}
            >
              {addSuccess
                ? '✓ Item Added to Zoho Cart!'
                : isAdding
                ? 'Adding to Zoho Cart...'
                : inStock
                ? 'Add to Cart'
                : 'Currently Unavailable'}
            </button>
            <button
              type="button"
              className="btn btn-secondary pdp-back-btn"
              onClick={onBack}
            >
              &larr; Back to Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="pdp-related-section">
          <div className="section-header">
            <h2>You May Also Like</h2>
            <p className="section-subtitle">Flagship devices from the store.</p>
          </div>
          <div className="product-grid">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelectProduct={onSelectProduct}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
