import { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { useCart } from './hooks/useCart';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { cart, totalItems } = useCart();

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page !== 'product') {
      setSelectedProduct(null);
    }
  };

  const handleSelectProduct = (handle) => {
    // In Phase 1 scaffold: placeholder handler
    console.log('Selected product:', handle);
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
            products={[]}
            loading={false}
            error={null}
            onSelectProduct={handleSelectProduct}
          />
        )}
        {currentPage === 'product' && (
          <ProductDetails
            product={selectedProduct}
            onBack={() => handleNavigate('home')}
          />
        )}
        {currentPage === 'cart' && (
          <Cart
            items={cart.lines || []}
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
