import { useState } from 'react';

/**
 * ProductDetails Page
 * Displays detailed information about a selected product, variant picker, and quantity selector.
 */
export default function ProductDetails({ product, onAddToCart, onBack }) {
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <div className="container page">
        <p>No product selected.</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          &larr; Back to Catalog
        </button>
      </div>
    );
  }

  const { title, description, featuredImage, priceRange, availableForSale } = product;
  const price = priceRange?.minVariantPrice?.amount;
  const currency = priceRange?.minVariantPrice?.currencyCode || 'USD';

  return (
    <div className="container page product-details-page">
      <button type="button" className="btn btn-secondary back-btn" onClick={onBack}>
        &larr; Back to Products
      </button>

      <div className="product-details-grid">
        <div className="product-details-gallery">
          {featuredImage ? (
            <img src={featuredImage.url} alt={featuredImage.altText || title} />
          ) : (
            <div className="product-card-placeholder">No Image Available</div>
          )}
        </div>

        <div className="product-details-info">
          <h1>{title}</h1>
          <p className="product-details-price">{currency} {price ? parseFloat(price).toFixed(2) : ''}</p>
          <div className="product-details-description">
            <p>{description}</p>
          </div>

          <div className="product-details-quantity">
            <label htmlFor="pdp-qty">Quantity:</label>
            <input
              id="pdp-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!availableForSale}
            onClick={() => onAddToCart?.(product, quantity)}
          >
            {availableForSale ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
