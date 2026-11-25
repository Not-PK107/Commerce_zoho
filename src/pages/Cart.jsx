import CartItem from '../components/CartItem';

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
 * Cart Page
 * Displays line items in the cart, subtotal calculation, order summary,
 * and direct trigger for Zoho Commerce native checkout.
 */
export default function Cart({
  items = [],
  subtotal = 0,
  currency = 'INR',
  isLoading = false,
  onUpdateQuantity,
  onRemove,
  onClearCart,
  onProceedToCheckout,
  onContinueShopping,
}) {
  return (
    <div className="container page cart-page">
      <div className="cart-header-row">
        <div>
          <h1>Shopping Cart</h1>
          <p className="cart-subhead">
            All cart items are synchronized with your active Zoho Commerce session.
          </p>
        </div>
        {items.length > 0 && onClearCart && (
          <button
            type="button"
            className="clear-cart-btn"
            onClick={onClearCart}
            disabled={isLoading}
          >
            Clear Entire Cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is currently empty</h2>
          <p>Discover flagship devices and add them to your Zoho Commerce session.</p>
          <button type="button" className="btn btn-primary" onClick={onContinueShopping}>
            Browse Flagship Catalog
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-list">
            {items.map((item) => (
              <CartItem
                key={item.id || item.lineItemId}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemove={onRemove}
              />
            ))}
          </div>

          <aside className="cart-summary">
            <h3>Order Summary</h3>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="cart-summary-row small">
              <span>Estimated Tax</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="cart-summary-row small">
              <span>Shipping</span>
              <span>Free Express Delivery</span>
            </div>

            <div className="cart-summary-divider" />

            <div className="cart-summary-row total">
              <span>Total</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>

            <p className="cart-summary-note">
              Taxes and shipping calculated securely at checkout.
            </p>

            <button
              type="button"
              className="btn btn-primary checkout-btn"
              onClick={onProceedToCheckout}
            >
              Proceed to Checkout &rarr;
            </button>

            <button
              type="button"
              className="btn btn-secondary continue-shopping-btn"
              onClick={onContinueShopping}
            >
              &larr; Continue Shopping
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
