import CartItem from '../components/CartItem';

/**
 * Cart Page
 * Displays line items in the cart, subtotal calculation, and checkout button.
 */
export default function Cart({ items = [], onUpdateQuantity, onRemove, onProceedToCheckout, onContinueShopping }) {
  const currency = items[0]?.currency || 'CAD';
  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price || 0) * item.quantity,
    0
  );

  return (
    <div className="container page cart-page">
      <h1>Your Cart</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <p>Your shopping cart is empty.</p>
          <button type="button" className="btn btn-primary" onClick={onContinueShopping}>
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-list">
            {items.map((item) => (
              <CartItem
                key={item.id}
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
              <span>{currency} {subtotal.toFixed(2)}</span>
            </div>
            <p className="cart-summary-note">Taxes and shipping calculated at checkout.</p>
            <button
              type="button"
              className="btn btn-primary checkout-btn"
              onClick={onProceedToCheckout}
            >
              Proceed to Checkout
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
