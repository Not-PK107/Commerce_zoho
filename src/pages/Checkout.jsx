/**
 * Checkout Page
 * Handles redirection or presentation of the Shopify Storefront web checkout.
 */
export default function Checkout({ checkoutUrl, onBackToCart }) {
  return (
    <div className="container page checkout-page">
      <h1>Checkout</h1>
      <p>You are being prepared for secure Shopify Checkout.</p>
      {checkoutUrl ? (
        <div className="checkout-redirect-box">
          <p>Click below to complete your order on Shopify's secure checkout page:</p>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Continue to Shopify Checkout &rarr;
          </a>
        </div>
      ) : (
        <p>No active checkout session found.</p>
      )}
      <button type="button" className="btn btn-secondary" onClick={onBackToCart} style={{ marginTop: '1.5rem' }}>
        &larr; Return to Cart
      </button>
    </div>
  );
}
