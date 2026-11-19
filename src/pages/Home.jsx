import ProductGrid from '../components/ProductGrid';

/**
 * Home Page
 * Displays Hero section, search filter, and the product catalog grid.
 */
export default function Home({ products = [], loading = false, error = null, onSelectProduct, onAddToCart }) {
  return (
    <div className="page home-page">
      <section className="hero-section">
        <div className="container">
          <h1 className="hero-title">Modern Essentials</h1>
          <p className="hero-subtitle">High quality essentials powered by Shopify Storefront GraphQL API.</p>
        </div>
      </section>

      <section className="catalog-section container">
        <div className="section-header">
          <h2>Featured Products</h2>
        </div>

        {loading && <p className="loading-indicator">Loading catalog...</p>}
        {error && <p className="error-indicator">Error loading products: {error}</p>}
        {!loading && !error && (
          <ProductGrid 
            products={products} 
            onSelectProduct={onSelectProduct} 
            onAddToCart={onAddToCart} 
          />
        )}
      </section>
    </div>
  );
}
