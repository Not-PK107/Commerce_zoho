import ProductCard from './ProductCard';

/**
 * ProductGrid Component
 * Renders a responsive grid of ProductCard components.
 */
export default function ProductGrid({ products = [], onSelectProduct, onAddToCart }) {
  if (!products || products.length === 0) {
    return (
      <div className="product-grid-empty">
        <p>No products found.</p>
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
