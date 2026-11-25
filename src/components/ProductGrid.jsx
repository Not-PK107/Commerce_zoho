import ProductCard from './ProductCard';

/**
 * ProductGrid Component
 * Renders a responsive grid of ProductCard components.
 */
export default function ProductGrid({ products = [], onSelectProduct, onAddToCart, onResetFilter }) {
  if (!products || products.length === 0) {
    return (
      <div className="product-grid-empty">
        <div className="empty-icon">🔍</div>
        <h3>No matching products found</h3>
        <p>Try adjusting your search query, clearing filters, or browsing other categories.</p>
        {onResetFilter && (
          <button type="button" className="btn btn-secondary" onClick={onResetFilter}>
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelectProduct={onSelectProduct}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}
