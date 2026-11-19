/**
 * CartItem Component
 * Renders an individual item line in the cart with quantity controls and remove button.
 */
export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  if (!item) return null;

  const { id, title, quantity, price, currency = 'USD', image, variantTitle } = item;
  const lineTotal = (parseFloat(price || 0) * quantity).toFixed(2);

  return (
    <div className="cart-item">
      <div className="cart-item-image">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <div className="cart-item-placeholder">No Image</div>
        )}
      </div>

      <div className="cart-item-details">
        <h4 className="cart-item-title">{title}</h4>
        {variantTitle && variantTitle !== 'Default Title' && (
          <span className="cart-item-variant">{variantTitle}</span>
        )}
        <p className="cart-item-unit-price">{currency} {parseFloat(price || 0).toFixed(2)}</p>
      </div>

      <div className="cart-item-quantity">
        <button
          type="button"
          className="qty-btn"
          onClick={() => onUpdateQuantity?.(id, quantity - 1)}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
        >
          -
        </button>
        <span className="qty-value">{quantity}</span>
        <button
          type="button"
          className="qty-btn"
          onClick={() => onUpdateQuantity?.(id, quantity + 1)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className="cart-item-total">
        <span>{currency} {lineTotal}</span>
      </div>

      <button
        type="button"
        className="cart-item-remove"
        onClick={() => onRemove?.(id)}
        aria-label="Remove item"
      >
        &times;
      </button>
    </div>
  );
}
