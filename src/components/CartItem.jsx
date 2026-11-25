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
 * CartItem Component
 * Renders an individual item line in the cart with quantity controls and remove button.
 */
export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  if (!item) return null;

  const {
    id,
    lineItemId,
    title,
    quantity,
    price,
    currency = 'INR',
    image,
    variantTitle,
  } = item;

  const lineId = lineItemId || id;
  const unitPrice = parseFloat(price || 0);
  const totalAmount = unitPrice * quantity;

  return (
    <div className="cart-item" data-line-id={lineId}>
      <div className="cart-item-image">
        {image ? (
          <img
            src={image}
            alt={title}
            onError={(e) => {
              if (image && !e.target.src.includes('/api/zoho-image')) {
                e.target.src = `/api/zoho-image?url=${encodeURIComponent(image)}`;
              }
            }}
          />
        ) : (
          <div className="cart-item-placeholder">No Image</div>
        )}
      </div>

      <div className="cart-item-details">
        <h4 className="cart-item-title">{title}</h4>
        {variantTitle && variantTitle !== 'Default Title' && (
          <span className="cart-item-variant">{variantTitle}</span>
        )}
        <p className="cart-item-unit-price">{formatPrice(unitPrice, currency)} each</p>
      </div>

      <div className="cart-item-quantity">
        <button
          type="button"
          className="qty-btn"
          onClick={() => onUpdateQuantity?.(item.variantId || lineId, quantity - 1)}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
        >
          -
        </button>
        <span className="qty-value">{quantity}</span>
        <button
          type="button"
          className="qty-btn"
          onClick={() => onUpdateQuantity?.(item.variantId || lineId, quantity + 1)}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className="cart-item-total">
        <span>{formatPrice(totalAmount, currency)}</span>
      </div>

      <button
        type="button"
        className="cart-item-remove"
        onClick={() => onRemove?.(item.variantId || lineId)}
        aria-label="Remove item"
      >
        &times;
      </button>
    </div>
  );
}
