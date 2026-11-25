import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import { useProducts } from './hooks/useProducts';
import { useCart } from './hooks/useCart';

function getInitialPaymentResult() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status') || params.get('payment') || params.get('payment_status');
    if (statusParam) {
      const isSuccess = ['success', 'completed', 'paid', 'true'].includes(statusParam.toLowerCase());
      const isFailure = ['failure', 'failed', 'error', 'declined', 'cancel', 'cancelled', 'false'].includes(statusParam.toLowerCase());
      if (isSuccess) {
        return {
          status: 'success',
          order: {
            orderReference: params.get('order_id') || params.get('checkout_id') || 'ZOHO-ORD-GATEWAY',
            total: parseFloat(params.get('total') || '0') || null,
            currency: params.get('currency') || 'INR',
            paymentMethod: params.get('method') || 'Zoho Payments Gateway',
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          },
        };
      } else if (isFailure) {
        return {
          status: 'failure',
          error: params.get('message') || params.get('error') || 'The transaction was declined or cancelled at the gateway.',
          order: {
            orderReference: params.get('order_id') || params.get('checkout_id') || '',
            paymentMethod: params.get('method') || 'Zoho Payments Gateway',
          },
        };
      }
    }
  } catch {
    // ignore URL parsing errors
  }
  return null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentResult, setPaymentResult] = useState(getInitialPaymentResult);

  // Dynamic products fetched from Zoho Commerce
  const { products, loading, error, apiInfo, refetch } = useProducts();

  // Cart state management integrated with Zoho Commerce Storefront Cart API
  const {
    cart,
    lines,
    totalItems,
    subtotal,
    currency,
    checkoutUrl,
    storeCartUrl,
    isDrawerOpen,
    isCartLoading,
    cartError,
    clearCartError,
    openDrawer,
    closeDrawer,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  // Clear cart if initial URL returned a successful payment
  useEffect(() => {
    if (paymentResult?.status === 'success') {
      clearCart();
    }
  }, [paymentResult, clearCart]);

  const handleNavigate = (page) => {
    if (page === 'login' || page === 'signup') {
      return;
    }
    setCurrentPage(page);
    if (page !== 'product') {
      setSelectedProduct(null);
    }
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (handleOrId) => {
    const product = products.find(
      (p) => p.handle === handleOrId || p.id === handleOrId
    );
    if (product) {
      setSelectedProduct(product);
      setCurrentPage('product');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * Native Zoho Commerce Checkout Flow
   * Navigates to the live checkout page which renders the Zoho Commerce checkout session.
   */
  const handleProceedToCheckout = () => {
    closeDrawer();
    handleNavigate('checkout');
  };

  /**
   * Handles checkout completion (both success and failure) and returns back to the home page
   */
  const handlePaymentComplete = ({ status, order, error }) => {
    if (status === 'success') {
      clearCart();
    }
    setPaymentResult({
      status,
      order: order || null,
      error: error || null,
      timestamp: new Date().toISOString(),
    });
    handleNavigate('home');
  };

  const handleClearPaymentResult = () => {
    setPaymentResult(null);
  };

  const handleRetryCheckout = () => {
    setPaymentResult(null);
    handleNavigate('checkout');
  };

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <Navbar
        cartCount={totalItems}
        activePage={currentPage}
        onNavigate={handleNavigate}
        onOpenCartDrawer={openDrawer}
        cartId={cart?.id}
      />

      {/* Main Page Content */}
      <main className="main-content">
        {currentPage === 'home' && (
          <Home
            cart={cart}
            products={products}
            loading={loading}
            error={error}
            apiInfo={apiInfo}
            paymentResult={paymentResult}
            onClearPaymentResult={handleClearPaymentResult}
            onRetryCheckout={handleRetryCheckout}
            onRetry={refetch}
            onSelectProduct={handleSelectProduct}
            onAddToCart={addToCart}
          />
        )}

        {currentPage === 'product' && (
          <ProductDetails
            product={selectedProduct}
            allProducts={products}
            onAddToCart={addToCart}
            onSelectProduct={handleSelectProduct}
            onBack={() => handleNavigate('home')}
          />
        )}

        {currentPage === 'cart' && (
          <Cart
            items={lines}
            subtotal={subtotal}
            currency={currency}
            cartId={cart?.id}
            storeCartUrl={storeCartUrl}
            isLoading={isCartLoading}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onClearCart={clearCart}
            onContinueShopping={() => handleNavigate('home')}
            onProceedToCheckout={handleProceedToCheckout}
          />
        )}

        {currentPage === 'checkout' && (
          <Checkout
            cart={cart}
            checkoutUrl={checkoutUrl}
            onBackToCart={() => handleNavigate('cart')}
            onReturnHome={() => handleNavigate('home')}
            onPaymentComplete={handlePaymentComplete}
            onOrderSuccess={() => clearCart()}
          />
        )}

        {currentPage === 'account' && (
          <Account
            cart={cart}
            onNavigate={handleNavigate}
            onProceedToCheckout={handleProceedToCheckout}
            onLogoutSuccess={() => handleNavigate('home')}
          />
        )}
      </main>

      {/* Slide-Out Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        items={lines}
        subtotal={subtotal}
        currency={currency}
        cartId={cart?.id}
        checkoutUrl={checkoutUrl}
        storeCartUrl={storeCartUrl}
        isLoading={isCartLoading}
        error={cartError}
        onClearError={clearCartError}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onViewCartPage={() => handleNavigate('cart')}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
