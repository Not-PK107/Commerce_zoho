import { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { useProducts } from './hooks/useProducts';
import { useCart } from './hooks/useCart';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Dynamic products fetched from mock.shop / Shopify GraphQL API
  const { products, loading, error, refetch } = useProducts();

  // Cart state management
  const {
    cart,
    lines,
    totalItems,
    subtotal,
    addToCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page !== 'product') {
      setSelectedProduct(null);
    }
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (handle) => {
    const product = products.find((p) => p.handle === handle);
    if (product) {
      setSelectedProduct(product);
      setCurrentPage('product');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product, quantity = 1, selectedVariant = null) => {
    addToCart(product, quantity, selectedVariant);
  };

  return (
    <div className="app-layout">
      <Navbar
        cartCount={totalItems}
        activePage={currentPage}
        onNavigate={handleNavigate}
      />

      <main className="main-content">
        {currentPage === 'home' && (
          <Home
            products={products}
            loading={loading}
            error={error}
            onRetry={refetch}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentPage === 'product' && (
          <ProductDetails
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            onBack={() => handleNavigate('home')}
          />
        )}

        {currentPage === 'cart' && (
          <Cart
            items={lines}
            subtotal={subtotal}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onContinueShopping={() => handleNavigate('home')}
            onProceedToCheckout={() => handleNavigate('checkout')}
          />
        )}

        {currentPage === 'checkout' && (
          <Checkout
            checkoutUrl={cart.checkoutUrl}
            onBackToCart={() => handleNavigate('cart')}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
