/**
 * Footer Component
 * Application footer with branding, links, and Zoho Commerce status.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-left">
          <p className="footer-brand">&copy; {new Date().getFullYear()} PK Storefront. All rights reserved.</p>
          <p className="footer-sub">Premium electronics, flagship smartphones, and authentic accessories.</p>
        </div>
        <div className="footer-right">
          <span className="footer-pill">🔒 256-Bit SSL Encrypted &amp; Secure Checkout</span>
        </div>
      </div>
    </footer>
  );
}
