/**
 * ProductCard Component
 * Displays individual product card with image, title, price, and add-to-cart action.
 */
export default function ProductCard({ product, onSelectProduct, onAddToCart }) {
  if (!product) return null;

  const { title, handle, featuredImage, priceRange, availableForSale } = product;
  const price = priceRange?.minVariantPrice?.amount;
  const currency = priceRange?.minVariantPrice?.currencyCode || 'USD';

  return (
    <article className="product-card">
      <div 
        className="product-card-image-wrap"
        onClick={() => onSelectProduct?.(handle)}
        role="button"
        tabIndex={0}
      >
        {featuredImage ? (
          <img 
            src={featuredImage.url} 
            alt={featuredImage.altText || title} 
            className="product-card-image"
            loading="lazy" 
          />
        ) : (
          <div className="product-card-placeholder">No Image Available</div>
        )}
        {!availableForSale && (
          <span className="product-badge out-of-stock">Sold Out</span>
        )}
      </div>

      <div className="product-card-info">
        <h3 
          className="product-card-title"
          onClick={() => onSelectProduct?.(handle)}
        >
          {title}
        </h3>
        <p className="product-card-price">
          {price ? `${currency} ${parseFloat(price).toFixed(2)}` : 'Price unavailable'}
        </p>

        <button
          type="button"
          className="btn btn-primary product-card-btn"
          disabled={!availableForSale}
          onClick={() => onAddToCart?.(product)}
        >
          {availableForSale ? 'Add to Cart' : 'Unavailable'}
        </button>
      </div>
    </article>
  );
}
