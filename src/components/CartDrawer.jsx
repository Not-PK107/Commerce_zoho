import { useEffect } from 'react';

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
 * CartDrawer Component
 * Modern slide-out drawer providing instant feedback, line item quantity controls,
 * subtotal calculations, and native Zoho Commerce checkout trigger.
 */
export default function CartDrawer({
  isOpen,
  onClose,
  items = [],
  subtotal = 0,
  currency = 'INR',
  isLoading = false,
  error = null,
  onClearError,
  onUpdateQuantity,
  onRemove,
  onViewCartPage,
  onProceedToCheckout,
}) {
  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="cart-drawer-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="cart-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <div className="cart-drawer-title-wrap">
            <h3>Shopping Bag</h3>
            <span className="cart-drawer-count">({totalCount} {totalCount === 1 ? 'item' : 'items'})</span>
          </div>
          <button
            type="button"
            className="cart-drawer-close"
            onClick={onClose}
            aria-label="Close cart drawer"
          >
            &times;
          </button>
        </div>

        {/* Drawer Content */}
        <div className="cart-drawer-body">
          {error && (
            <div className="cart-drawer-error" role="alert">
              <span className="cart-drawer-error-icon">⚠️</span>
              <span className="cart-drawer-error-text">{error}</span>
              {onClearError && (
                <button
                  type="button"
                  className="cart-drawer-error-dismiss"
                  onClick={onClearError}
                  aria-label="Dismiss error"
                >
                  &times;
                </button>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className="cart-drawer-empty">
              <div className="empty-cart-icon">🛍️</div>
              <h4>Your bag is currently empty</h4>
              <p>Explore our flagship collection powered by Zoho Commerce.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="cart-drawer-items">
              {items.map((item) => {
                const lineId = item.lineItemId || item.id;
                const linePrice = parseFloat(item.price || 0);

                return (
                  <div key={lineId} className="cart-drawer-item">
                    <div className="cart-drawer-item-thumb">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          onError={(e) => {
                            if (item.image && !e.target.src.includes('/api/zoho-image')) {
                              e.target.src = `/api/zoho-image?url=${encodeURIComponent(item.image)}`;
                            }
                          }}
                        />
                      ) : (
                        <div className="cart-item-placeholder">No Image</div>
                      )}
                    </div>

                    <div className="cart-drawer-item-details">
                      <div className="cart-drawer-item-top">
                        <h4 className="cart-drawer-item-title">{item.title}</h4>
                        <button
                          type="button"
                          className="cart-drawer-item-remove"
                          onClick={() => onRemove?.(item.variantId || lineId)}
                          disabled={isLoading}
                          aria-label="Remove item"
                        >
                          &times;
                        </button>
                      </div>

                      {item.variantId && (
                        <span className="cart-drawer-variant-tag">
                          Variant: <code>{item.variantId}</code>
                        </span>
                      )}

                      <div className="cart-drawer-item-bottom">
                        <div className="cart-drawer-qty-control">
                          <button
                            type="button"
                            className="drawer-qty-btn"
                            onClick={() => onUpdateQuantity?.(item.variantId || lineId, item.quantity - 1)}
                            disabled={isLoading}
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="drawer-qty-value">{item.quantity}</span>
                          <button
                            type="button"
                            className="drawer-qty-btn"
                            onClick={() => onUpdateQuantity?.(item.variantId || lineId, item.quantity + 1)}
                            disabled={isLoading}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <span className="cart-drawer-item-price">
                          {formatPrice(linePrice * item.quantity, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-drawer-subtotal-row">
              <span>Estimated Subtotal</span>
              <span className="cart-drawer-subtotal">{formatPrice(subtotal, currency)}</span>
            </div>
            <p className="cart-drawer-note">
              Taxes and shipping calculated securely at checkout.
            </p>

            <button
              type="button"
              className="btn btn-primary cart-drawer-checkout-btn"
              onClick={onProceedToCheckout}
            >
              Proceed to Checkout &rarr;
            </button>

            <button
              type="button"
              className="btn btn-secondary cart-drawer-view-btn"
              onClick={() => {
                onClose?.();
                onViewCartPage?.();
              }}
            >
              View Full Cart Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
